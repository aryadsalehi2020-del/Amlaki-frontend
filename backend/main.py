"""
AmlakI Backend
KI-gestuetzter Immobilienanalyse-Service mit User-Management
"""
import sys
import os
import io
import logging
import math

# Force UTF-8 everywhere - MUST be before any other imports
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['LC_ALL'] = 'C.UTF-8'
os.environ['LANG'] = 'C.UTF-8'

# Suppress Anthropic SDK rich/unicode logging
os.environ['ANTHROPIC_LOG'] = 'off'
os.environ['TERM'] = 'dumb'
os.environ['NO_COLOR'] = '1'
os.environ['COLUMNS'] = '80'
logging.getLogger('anthropic').setLevel(logging.WARNING)
logging.getLogger('httpx').setLevel(logging.WARNING)

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass

# Monkey-patch print to handle unicode errors
_original_print = print
def safe_print(*args, **kwargs):
    try:
        _original_print(*args, **kwargs)
    except UnicodeEncodeError:
        safe_args = [str(a).encode('ascii', 'replace').decode('ascii') for a in args]
        _original_print(*safe_args, **kwargs)
import builtins
builtins.print = safe_print

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Body, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import anthropic
import json
import os
from dotenv import load_dotenv
load_dotenv()
import httpx
import re
from urllib.parse import urlparse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Eigene Module
from knowledge_base import (
    get_ai_system_prompt,
    berechne_fairen_preis,
    empfehle_foerderungen,
    generiere_verbesserungsvorschlaege,
    berechne_afa,
    berechne_heizungsfoerderung,
    pruefe_15_prozent_regel,
    berechne_leverage_effekt,
    quick_check,
    KFW_PROGRAMME,
    LANDESFOERDERUNGEN,
    AFA_REGELN,
    MARKTDATEN,
    DEALBREAKER
)
from database import get_db, init_db, Base
from models import User, Analysis, UsageLog, Conversation, ChatMessage, TrackingEvent, Review, RedemptionToken, PerfLog, EmailVerificationToken, AnalysisFeedback
import secrets
from brain.topic_classifier import classify_topics, load_topic, build_knowledge_prompt
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    Token,
    LoginRequest,
    AnalysisCreate,
    AnalysisUpdate,
    AnalysisResponse,
    AnalysisListItem
)

# Emoji-Filter: entfernt alle Emojis und Unicode-Symbole aus KI-Antworten
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # Emoticons
    "\U0001F300-\U0001F5FF"  # Symbole & Piktogramme
    "\U0001F680-\U0001F6FF"  # Transport & Karten
    "\U0001F1E0-\U0001F1FF"  # Flaggen
    "\U0001F900-\U0001F9FF"  # Ergaenzende Symbole
    "\U0001FA00-\U0001FA6F"  # Schach-Symbole
    "\U0001FA70-\U0001FAFF"  # Erweiterte Symbole
    "\U00002702-\U000027B0"  # Dingbats
    "\U0000FE00-\U0000FE0F"  # Variation Selectors
    "\U0000200D"             # Zero Width Joiner
    "\U000020E3"             # Combining Enclosing Keycap
    "\U00002600-\U000026FF"  # Misc Symbole
    "\U00002700-\U000027BF"  # Dingbats
    "\U00002B50"             # Stern
    "\U00002B05-\U00002B07"  # Pfeile
    "\U00002934-\U00002935"  # Pfeile
    "\U000025AA-\U000025AB"  # Quadrate
    "\U000025FB-\U000025FE"  # Quadrate
    "\U00002328"             # Tastatur
    "\U000023CF"             # Eject
    "\U000023E9-\U000023F3"  # Media Controls
    "\U000023F8-\U000023FA"  # Media Controls
    "]+",
    flags=re.UNICODE
)

def strip_emojis(text: str) -> str:
    """Entfernt alle Emojis aus dem Text"""
    return EMOJI_PATTERN.sub("", text)

# Rate Limiter -- globales Default-Limit + spezifische Limits pro Endpoint
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])
app = FastAPI(title="AmlakI API", version="3.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Initialisiere Datenbank beim Start
@app.on_event("startup")
def startup_event():
    init_db()
    # Schema-Migration: neue Spalten zu bestehenden Tabellen hinzufuegen
    # (Base.metadata.create_all erstellt nur fehlende Tabellen, nicht fehlende Spalten).
    try:
        from database import SessionLocal
        from sqlalchemy import text
        s = SessionLocal()
        try:
            s.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE"))
            s.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP"))
            s.commit()
            # Migration: bereits registrierte User als verified markieren
            s.execute(text(
                "UPDATE users SET email_verified=TRUE, email_verified_at=NOW() "
                "WHERE (email_verified IS NULL OR email_verified=FALSE) "
                "AND created_at < '2026-05-06 23:00:00'"
            ))
            s.commit()
            print("[OK] Email-verification Schema-Migration abgeschlossen")
        finally:
            s.close()
    except Exception as e:
        print(f"[ERROR] Schema-Migration fehlgeschlagen: {e}")
    # Self-ping to prevent Render cold starts (every 10 min)
    import asyncio
    async def keep_alive():
        render_url = os.getenv("RENDER_EXTERNAL_URL")
        if not render_url:
            return  # Only run on Render, not locally
        while True:
            await asyncio.sleep(600)  # 10 minutes
            try:
                async with httpx.AsyncClient() as client:
                    await client.get(f"{render_url}/health", timeout=10)
            except Exception:
                pass
    asyncio.get_event_loop().create_task(keep_alive())

# CORS - Erlaubte Origins + Vercel Preview URLs
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://amlaki.de,https://www.amlaki.de,http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://amlaki(-[a-z0-9]+)?-aryas-projects-8e34a974\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ========================================
# PERFORMANCE TRACKING (Conversion-relevante Endpoints)
# ========================================

# Whitelist: Nur diese Pfade werden gemessen. Tausende Health-Checks etc.
# wuerden die Tabelle sonst aufblaehen.
PERF_TRACK_PATHS = {
    "/auth/register",
    "/auth/login",
    "/auth/google",
    "/extract-pdf",
    "/extract-url",
    "/analyze",
    "/search-market-data",
}


@app.middleware("http")
async def track_performance(request: Request, call_next):
    import time as _time
    path = request.url.path
    if path not in PERF_TRACK_PATHS:
        return await call_next(request)

    start = _time.perf_counter()
    response = await call_next(request)
    duration_ms = int((_time.perf_counter() - start) * 1000)

    # Best-effort: Logging darf den Request nicht stoppen
    try:
        from database import SessionLocal
        s = SessionLocal()
        try:
            s.add(PerfLog(
                endpoint=f"{request.method} {path}",
                duration_ms=duration_ms,
                status_code=response.status_code,
            ))
            s.commit()
        finally:
            s.close()
    except Exception as e:
        print(f"[WARN] perf-log fehlgeschlagen: {e}")

    return response


# ========================================
# USAGE TRACKING & LIMITS
# ========================================

# Claude Model (konfigurierbar via ENV)
CLAUDE_SONNET_MODEL = os.getenv("CLAUDE_SONNET_MODEL", "claude-sonnet-4-6")
CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001"

# Claude Preise (pro 1M Tokens)
PRICING = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-sonnet-4-6-20250514": {"input": 3.0, "output": 15.0},  # Falls ENV diesen Alias setzt
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},  # Legacy fuer alte Usage-Logs
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
}

def calculate_cost(input_tokens: int, output_tokens: int, model: str = None) -> float:
    """Berechnet Kosten in USD basierend auf Modell"""
    if model is None:
        model = CLAUDE_SONNET_MODEL
    prices = PRICING.get(model, PRICING[CLAUDE_SONNET_MODEL])
    input_cost = (input_tokens / 1_000_000) * prices["input"]
    output_cost = (output_tokens / 1_000_000) * prices["output"]
    return input_cost + output_cost

def get_user_total_usage(db: Session, user_id: int) -> dict:
    """Holt Gesamtverbrauch eines Users"""
    logs = db.query(UsageLog).filter(UsageLog.user_id == user_id).all()
    total_input = sum(log.input_tokens for log in logs)
    total_output = sum(log.output_tokens for log in logs)
    total_cost = sum(log.cost_usd for log in logs)
    return {
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cost_usd": total_cost,
        "total_requests": len(logs)
    }

def check_usage_limit(db: Session, user: User) -> bool:
    """Prüft ob User sein Limit überschritten hat. Returns True wenn OK."""
    if user.is_superuser:
        return True  # Admins haben kein Limit

    usage = get_user_total_usage(db, user.id)
    limit = user.usage_limit_usd if user.usage_limit_usd else 5.0
    return usage["total_cost_usd"] < limit

def log_usage(db: Session, user_id: int, action_type: str, input_tokens: int, output_tokens: int, model: str = None):
    """Speichert einen Usage-Log"""
    if model is None:
        model = CLAUDE_SONNET_MODEL
    cost = calculate_cost(input_tokens, output_tokens, model)
    log = UsageLog(
        user_id=user_id,
        action_type=action_type,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost
    )
    db.add(log)
    db.commit()
    return log


# ========================================
# AUTH ENDPOINTS
# ========================================

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register_user(request: Request, user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Registriert einen neuen User"""
    # Prüfe ob E-Mail bereits existiert (case-insensitive)
    if db.query(User).filter(User.email == user.email.lower()).first():
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")

    # Prüfe ob Username bereits existiert
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username bereits vergeben")

    # Erster User wird automatisch Admin
    is_first_user = db.query(User).count() == 0

    # Erstelle neuen User
    db_user = User(
        email=user.email.lower(),
        username=user.username,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        is_superuser=is_first_user  # Erster User ist Admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Log neue Registrierung
    print(f"NEUER USER REGISTRIERT: {db_user.username} ({db_user.email})")

    # Verifizierungs-Token erstellen
    verify_token_raw = secrets.token_urlsafe(32)
    verify_record = EmailVerificationToken(
        user_id=db_user.id,
        token=verify_token_raw,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(verify_record)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "https://amlaki.de")
    verify_url = f"{frontend_url}/verify-email/{verify_token_raw}"
    first_name = (db_user.full_name or "").split()[0] if db_user.full_name else ""

    # Mails als Background-Task: Verify-Mail an User, Notification an Admin
    background_tasks.add_task(_safe_send_verification, db_user.email, first_name, verify_url)
    background_tasks.add_task(_safe_send_admin_notification, db_user.username, db_user.email)

    return db_user


def _safe_send_verification(email: str, first_name: str, verify_url: str):
    try:
        send_verification_email(email, first_name, verify_url)
    except Exception as e:
        print(f"[WARN] Verification-Mail fehlgeschlagen: {e}")


def _safe_send_welcome(email: str, first_name: str):
    try:
        send_welcome_email(email, first_name)
    except Exception as e:
        print(f"[WARN] Welcome-Mail fehlgeschlagen: {e}")


def _safe_send_admin_notification(username: str, email: str):
    try:
        send_new_user_notification(username, email)
    except Exception as e:
        print(f"[WARN] Admin-Notification fehlgeschlagen: {e}")


# Simple in-memory rate limiter for login
_login_attempts = {}  # {email: [(timestamp, ...], ...}

def check_login_rate_limit(email: str, max_attempts: int = 5, window_seconds: int = 300):
    """Max 5 Login-Versuche pro 5 Minuten pro Email"""
    import time
    now = time.time()
    key = email.lower()
    if key not in _login_attempts:
        _login_attempts[key] = []
    # Alte Eintraege entfernen
    _login_attempts[key] = [t for t in _login_attempts[key] if now - t < window_seconds]
    if len(_login_attempts[key]) >= max_attempts:
        return False
    _login_attempts[key].append(now)
    return True


@app.post("/auth/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login mit E-Mail und Passwort"""
    if not check_login_rate_limit(login_data.email):
        raise HTTPException(
            status_code=429,
            detail="Zu viele Login-Versuche. Bitte warte 5 Minuten."
        )

    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-Mail oder Passwort falsch",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.email_verified:
        # Spezifischer Fehlercode damit Frontend "Resend Verifizierungs-Mail" anbieten kann
        raise HTTPException(
            status_code=403,
            detail="EMAIL_NOT_VERIFIED",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


# ========================================
# GOOGLE LOGIN
# ========================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

@app.post("/auth/google", response_model=Token)
def google_login(data: dict = Body(...), db: Session = Depends(get_db)):
    """Login/Register mit Google ID Token"""
    id_token_str = data.get("credential", "")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="Google credential fehlt")

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Login nicht konfiguriert")

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        idinfo = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        print(f"[ERROR] Google Token Verifizierung fehlgeschlagen: {e}")
        raise HTTPException(status_code=401, detail="Google Token ungueltig")

    email = idinfo.get("email", "").lower()
    name = idinfo.get("name", "")
    if not email:
        raise HTTPException(status_code=400, detail="Keine E-Mail im Google Token")

    # User existiert? -> Login
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Neuer User -> Register
        # Username aus Email generieren
        base_username = email.split("@")[0].replace(".", "_").replace("+", "_")[:25]
        import re
        base_username = re.sub(r'[^a-zA-Z0-9_.-]', '_', base_username)
        if len(base_username) < 3:
            base_username = base_username + "_user"

        # Eindeutigen Username sicherstellen
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        # Zufaelliges Passwort (User loggt sich nur via Google ein)
        import secrets as _s
        random_pw = _s.token_urlsafe(32)

        is_first_user = db.query(User).count() == 0

        # Google hat E-Mail bereits verifiziert -> User direkt aktiv
        user = User(
            email=email,
            username=username,
            full_name=name,
            hashed_password=get_password_hash(random_pw),
            is_superuser=is_first_user,
            email_verified=True,
            email_verified_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"NEUER GOOGLE USER: {user.username} ({user.email})")

    # JWT erstellen
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"}


# ========================================
# EMAIL VERIFICATION
# ========================================

@app.post("/auth/verify-email/{token}")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Markiert User als verifiziert wenn Token gueltig + nicht abgelaufen."""
    rec = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Link ungueltig")
    if rec.used:
        return {"already_verified": True, "message": "Bereits bestaetigt"}
    if datetime.utcnow() > rec.expires_at:
        raise HTTPException(status_code=410, detail="Link abgelaufen")

    user = db.query(User).filter(User.id == rec.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    rec.used = True
    db.commit()

    # Welcome-Mail erst NACH Verifikation
    try:
        first_name = (user.full_name or "").split()[0] if user.full_name else ""
        send_welcome_email(user.email, first_name)
    except Exception as e:
        print(f"[WARN] Welcome-Mail nach Verify fehlgeschlagen: {e}")

    return {"verified": True, "message": "E-Mail bestaetigt"}


@app.post("/auth/resend-verification")
@limiter.limit("3/hour")
def resend_verification(request: Request, data: dict = Body(...), db: Session = Depends(get_db)):
    """Neue Verifizierungs-Mail anfordern."""
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="E-Mail erforderlich")

    user = db.query(User).filter(User.email == email).first()
    # Anti-Enumeration: immer success-response
    if not user or user.email_verified:
        return {"sent": True}

    # Alte unbenutzte Tokens dieses Users invalidieren
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.used == False
    ).update({"used": True})

    new_token = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token=new_token,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    ))
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "https://amlaki.de")
    verify_url = f"{frontend_url}/verify-email/{new_token}"
    first_name = (user.full_name or "").split()[0] if user.full_name else ""
    try:
        send_verification_email(user.email, first_name, verify_url)
    except Exception as e:
        print(f"[WARN] Resend-Verification fehlgeschlagen: {e}")

    return {"sent": True}


# ========================================
# PASSWORT RESET
# ========================================
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets as _secrets

import hashlib
from models import PasswordResetToken

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")


def send_email_via_resend(to_email: str, subject: str, body: str, from_email: str = "Amlaki <support@amlaki.de>"):
    """Sendet E-Mail via Resend API (kein SMTP noetig)"""
    print(f"[RESEND] Versuche E-Mail an {to_email} zu senden...")
    print(f"[RESEND] API Key vorhanden: {bool(RESEND_API_KEY)}, Key Anfang: {RESEND_API_KEY[:10] if RESEND_API_KEY else 'LEER'}")
    if not RESEND_API_KEY:
        print("[WARN] RESEND_API_KEY nicht gesetzt")
        return False
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "text": body,
                "reply_to": "arya@amlaki.de"
            },
            timeout=15
        )
        print(f"[RESEND] Response: {response.status_code} {response.text}")
        if response.status_code == 200:
            print(f"[OK] Resend E-Mail an {to_email} gesendet")
            return True
        else:
            print(f"[ERROR] Resend fehlgeschlagen: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Resend Exception: {type(e).__name__}: {e}")
        return False


_AMLAKI_FONT = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif"


_EMAIL_ASSET_BASE = (os.getenv("FRONTEND_URL", "https://amlaki.de").rstrip("/")) + "/email"


def _email_hero(gif_name: str, width: int, height: int, alt: str) -> str:
    """Zentriertes animiertes GIF (Mail-Clients erlauben keine CSS-Animation, GIF geht ueberall ausser Outlook-Desktop, dort steht das erste Bild)."""
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td align="center">'
            f'<img src="{_EMAIL_ASSET_BASE}/{gif_name}" width="{width}" height="{height}" alt="{alt}" style="display:block;width:{width}px;height:{height}px;border:0;outline:none;font-family:{_AMLAKI_FONT};font-size:13px;font-weight:600;color:#7C8B6F;text-align:center;">'
            f'</td></tr></table>')


def _email_score_hero(score: int) -> str:
    bucket = max(0, min(100, int(score)))  # ein GIF je Wert 0-100
    return _email_hero(f"ring-{bucket}.gif", 120, 120, f"Score {score} von 100")


def _amlaki_email_shell(headline: str, eyebrow: str, content_html: str, hero_html: str = "") -> str:
    """Gemeinsames HTML-Layout fuer alle Amlaki-Mails.

    Wenn headline/eyebrow leer ('') uebergeben werden, werden sie nicht
    gerendert. Damit kann ein Endpoint die komplette Typografie selbst
    bauen (z.B. die Follow-Up Mail mit dem grossen 60% Rabatt-Hook).
    """
    header_html = ""
    if eyebrow:
        header_html += f'<p style="margin:0 0 4px 0;font-family:{_AMLAKI_FONT};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#7C8B6F;font-weight:600;">{eyebrow}</p>'
    if headline:
        header_html += f'<p style="margin:0 0 16px 0;font-family:{_AMLAKI_FONT};color:#2C2418;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;">{headline}</p>'
    return f"""<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#EFE8DA;font-family:{_AMLAKI_FONT};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EFE8DA;padding:20px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 6px 14px 6px;">
          <a href="https://amlaki.de" style="text-decoration:none;"><img src="{_EMAIL_ASSET_BASE}/logo.png" width="139" height="40" alt="AmlakI" style="display:block;width:139px;height:40px;border:0;outline:none;font-family:{_AMLAKI_FONT};font-size:22px;font-weight:800;color:#7C8B6F;letter-spacing:-0.02em;"></a>
        </td></tr>
        <tr><td style="background:#FFFFFF;border:1px solid #E8E0D4;border-radius:16px;padding:30px 32px;box-shadow:0 1px 0 rgba(44,36,24,0.04);">
          {hero_html}
          {header_html}
          {content_html}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #ECE5D6;padding-top:14px;margin-top:20px;">
            <tr>
              <td style="vertical-align:middle;padding-right:12px;width:40px;"><div style="width:38px;height:38px;border-radius:50%;background:#7C8B6F;color:#FFFFFF;font-family:{_AMLAKI_FONT};font-size:14px;font-weight:700;line-height:38px;text-align:center;letter-spacing:0.02em;">AS</div></td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-family:{_AMLAKI_FONT};color:#2C2418;font-size:14px;font-weight:700;">Arya Salehi</p>
                <p style="margin:2px 0 0 0;font-family:{_AMLAKI_FONT};color:#8C7E6A;font-size:12px;font-weight:500;">Gr&uuml;nder &middot; Amlaki</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:14px 6px 0 6px;">
          <p style="margin:0;font-family:{_AMLAKI_FONT};color:#B5A68C;font-size:11px;line-height:1.5;font-weight:500;letter-spacing:0.04em;">
            <a href="https://amlaki.de" style="color:#8C7E6A;text-decoration:none;">amlaki.de</a> &nbsp;&middot;&nbsp; Hamburg &nbsp;&middot;&nbsp; <a href="mailto:arya@amlaki.de" style="color:#8C7E6A;text-decoration:none;">arya@amlaki.de</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def send_email_dual(to_email: str, subject: str, text_body: str, html_body: str, marketing: bool = False):
    """Sendet HTML + Text via Resend mit Amlaki-Sender.

    marketing=True setzt List-Unsubscribe-Header (Mail-Clients zeigen dann
    "Abo beenden"). Transaktionsmails (Verifizierung, Willkommen, Reset)
    bekommen den Header NICHT, sonst wirkt es wie ein Newsletter."""
    if not RESEND_API_KEY:
        print(f"[WARN] RESEND_API_KEY nicht gesetzt — Mail an {to_email} nicht gesendet")
        return False
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": "Arya von Amlaki <support@amlaki.de>",
                "to": [to_email],
                "subject": subject,
                "text": text_body,
                "html": html_body,
                "reply_to": "arya@amlaki.de",
                **({"headers": {
                    "List-Unsubscribe": "<mailto:arya@amlaki.de?subject=unsubscribe>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                }} if marketing else {}),
            },
            timeout=15,
        )
        if response.status_code == 200:
            return True
        print(f"[ERROR] Mail an {to_email} fehlgeschlagen: {response.status_code} {response.text}")
        return False
    except Exception as e:
        print(f"[ERROR] Mail-Exception {to_email}: {e}")
        return False


def send_verification_email(to_email: str, first_name: str, verify_url: str):
    """Verifizierungs-Mail nach Registrierung — Bestaetigungs-Link."""
    salutation = f"Moin {first_name}" if first_name else "Moin"
    subject = "Bestätige deine E-Mail-Adresse"

    text_body = f"""{salutation},

danke für die Registrierung bei Amlaki.

Bestätige bitte einmal kurz deine E-Mail-Adresse, damit dein Account aktiv wird:

{verify_url}

Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese Mail einfach.

Danke,
Arya
Gründer, Amlaki
"""

    content = f"""<p style="margin:0 0 24px 0;font-family:{_AMLAKI_FONT};color:#3D3526;font-size:17px;line-height:1.6;font-weight:400;">danke f&uuml;r die Registrierung bei Amlaki. Best&auml;tige bitte einmal kurz deine E-Mail-Adresse, damit dein Account aktiv wird.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tr>
  <td style="border-radius:10px;background:#2C2418;">
    <a href="{verify_url}" style="display:inline-block;padding:14px 30px;font-family:{_AMLAKI_FONT};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">E-Mail best&auml;tigen &nbsp;&rarr;</a>
  </td>
</tr></table>

<p style="margin:0 0 24px 0;font-family:{_AMLAKI_FONT};color:#B5A68C;font-size:12px;line-height:1.5;">
  Link funktioniert nicht? Kopiere ihn in den Browser:<br>
  <a href="{verify_url}" style="color:#8C7E6A;text-decoration:none;word-break:break-all;">{verify_url}</a>
</p>

<p style="margin:0;font-family:{_AMLAKI_FONT};color:#8C7E6A;font-size:13px;line-height:1.5;">Der Link ist 24 Stunden g&uuml;ltig. Falls du dich nicht registriert hast, ignoriere diese Mail.</p>"""

    html_body = _amlaki_email_shell(
        headline=f"{salutation},",
        eyebrow="E-Mail bestätigen",
        content_html=content,
        hero_html=_email_hero("dots.gif", 120, 40, ""),
    )

    return send_email_dual(to_email, subject, text_body, html_body)


def send_welcome_email(to_email: str, first_name: str):
    """Welcome-Mail NACH erfolgreicher E-Mail-Bestaetigung."""
    salutation = f"Moin {first_name}" if first_name else "Moin"
    frontend_url = os.getenv("FRONTEND_URL", "https://amlaki.de")
    subject = "Willkommen bei Amlaki, deine erste Analyse wartet"

    text_body = f"""{salutation},

dein Account ist aktiv. Du hast 1 Gratis-Analyse zur Verfügung.

So geht's:
1. Auf {frontend_url}/analyze gehen
2. Kleinanzeigen-Link einfügen oder Exposé-PDF hochladen (bei ImmoScout24/Immowelt: Exposé-Text kopieren und einfügen)
3. In ~60 Sekunden Score, Cashflow, fairer Preis und KfW-Check

Bei Fragen antworte einfach auf diese Mail.

Danke,
Arya
Gründer, Amlaki
"""

    steps = [
        ("01", "Auf <a href=\"https://amlaki.de/analyze\" style=\"color:#7C8B6F;font-weight:700;text-decoration:none;\">amlaki.de/analyze</a> gehen"),
        ("02", "Kleinanzeigen-Link einf&uuml;gen oder Expos&eacute;-PDF hochladen <span style='color:#8C7E6A;font-weight:400;'>(bei ImmoScout24/Immowelt einfach den Expos&eacute;-Text kopieren und einf&uuml;gen)</span>"),
        ("03", "In ~60 Sekunden Score, Cashflow, fairer Preis und KfW-Check"),
    ]
    steps_html = "".join(
        f"""<tr><td style="padding:14px 0;border-top:1px solid #ECE5D6;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="width:46px;vertical-align:top;"><span style="display:inline-block;font-family:{_AMLAKI_FONT};font-size:11px;letter-spacing:0.18em;color:#7C8B6F;font-weight:700;">{n}</span></td>
              <td style="vertical-align:top;"><p style="margin:0;font-family:{_AMLAKI_FONT};color:#2C2418;font-size:15px;line-height:1.5;font-weight:500;">{t}</p></td>
            </tr></table>
        </td></tr>"""
        for n, t in steps
    )

    content = f"""<p style="margin:0 0 24px 0;font-family:{_AMLAKI_FONT};color:#3D3526;font-size:17px;line-height:1.6;font-weight:400;">dein Account ist aktiv. Du hast <strong style="color:#2C2418;">1 Gratis-Analyse</strong> zur Verf&uuml;gung: faire Bewertung von Cashflow, Marktpreis und Förderungen f&uuml;r dein Zielobjekt.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 28px 0;">
  {steps_html}
  <tr><td style="border-top:1px solid #ECE5D6;"></td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;"><tr>
  <td style="border-radius:10px;background:#2C2418;">
    <a href="{frontend_url}/analyze" style="display:inline-block;padding:14px 30px;font-family:{_AMLAKI_FONT};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">Erste Analyse starten &nbsp;&rarr;</a>
  </td>
</tr></table>

<p style="margin:0;font-family:{_AMLAKI_FONT};color:#8C7E6A;font-size:13px;line-height:1.5;">Bei Fragen antworte einfach auf diese Mail.</p>"""

    html_body = _amlaki_email_shell(
        headline=f"{salutation},",
        eyebrow="Account aktiv",
        content_html=content,
        hero_html=_email_hero("check.gif", 96, 96, "Account aktiv"),
    )

    return send_email_dual(to_email, subject, text_body, html_body)


def send_analysis_followup_email(to_email: str, username: str, stadt: str, score: int, is_premium: bool, user_id: int = None):
    """Branded Follow-Up Mail nach erster Analyse.

    Statt den Rabattcode direkt mitzuschicken (frueher: ERSTE20 inline) wird der
    User auf eine Feedback-Seite geleitet. Erst nach 60s Feedback bekommt er
    den Code. Das ist der eigentliche Hebel um early Free->Paid Conversion zu
    verstehen UND ehrliches User-Feedback zu sammeln.
    """
    if is_premium:
        return  # Premium-User brauchen kein Upsell

    frontend_url = os.getenv("FRONTEND_URL", "https://amlaki.de")
    first_name = (username or "").split()[0] if username else ""
    salutation = f"Moin {first_name}" if first_name else "Moin"

    # Score-adaptiver Hook: bei gutem Score ist die Mail eine Glueckwunsch-Mail
    # mit Upsell, bei schlechtem Score ist sie eine "lass uns die Risiken
    # zusammen anschauen"-Mail. Beide enden mit demselben CTA.
    try:
        score_int = int(score) if score is not None else 0
    except (TypeError, ValueError):
        score_int = 0

    # Founder-Voice. Keine Marketing-Sprache. Ehrlich: wir sind neu, dein
    # Feedback ist gerade wertvoller als dein Umsatz.
    if score_int >= 65:
        score_summary = "Solides Ergebnis."
        text_score_summary = "Solides Ergebnis."
    elif score_int >= 40:
        score_summary = "Gemischtes Bild."
        text_score_summary = "Gemischtes Bild."
    else:
        score_summary = "Eher kritisch."
        text_score_summary = "Eher kritisch."

    # KEINE eyebrow/headline ueber den Shell -- wir bauen die komplette
    # Hierarchie selbst damit der 60% Rabatt-Hook visuell dominiert.
    eyebrow = ""
    headline = ""
    # Plain-Text Variante für Mail-Clients die kein HTML rendern:
    text_intro = (
        f"deine {stadt}-Analyse ist durch. Score {score_int}/100. {text_score_summary}\n\n"
        f"Wir sind frisch am Markt. Dein Feedback ist mir gerade wichtiger als Umsatz."
    )

    # Feedback-Link mit signiertem Token
    if user_id is not None:
        try:
            tok = make_feedback_token(user_id)
            feedback_url = f"{frontend_url}/feedback?token={tok}"
        except Exception as token_err:
            print(f"[WARN] Feedback-Token fehlgeschlagen: {token_err}")
            feedback_url = f"{frontend_url}/feedback"
    else:
        feedback_url = f"{frontend_url}/feedback"

    subject = f"Dein Feedback ist mir wichtiger als Umsatz (und ich meine das ernst)"

    # Feature-Namen reichen -- User kennt die geblurrten Tabs aus seiner Analyse.
    # Inline-Pills statt Tabelle damit es kompakt und scannbar bleibt.
    feature_names = ["Fairer Preis", "Was-wäre-wenn Szenarien", "KfW-Förderungen", "Verhandlungsmail"]
    features_inline = " &middot; ".join(feature_names)

    content = f"""<p style="margin:0 0 14px 0;font-family:{_AMLAKI_FONT};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#7C8B6F;font-weight:700;">{stadt} &middot; Score {score_int}/100 &middot; {score_summary.rstrip('.')}</p>

<p style="margin:0 0 14px 0;font-family:{_AMLAKI_FONT};color:#2C2418;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.015em;">Dein Feedback ist mir wichtiger als Umsatz.</p>

<p style="margin:0 0 22px 0;font-family:{_AMLAKI_FONT};color:#3D3526;font-size:17px;line-height:1.5;font-weight:500;">Wir sind frisch am Markt, und ich will wissen, was dir an der Analyse gefehlt hat. Mein Dankeschön: <strong style="color:#7C8B6F;">60% Rabatt</strong> auf deine nächste Analyse. <strong style="color:#2C2418;">3&nbsp;&euro; statt 9&nbsp;&euro;</strong>. 60 Sekunden Feedback genügen.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr>
  <td style="border-radius:10px;background:#2C2418;padding:14px 28px;">
    <a href="{feedback_url}" style="font-family:{_AMLAKI_FONT};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">Feedback geben und Rabatt holen &nbsp;&rarr;</a>
  </td>
</tr></table>

<p style="margin:0 0 4px 0;font-family:{_AMLAKI_FONT};color:#8C7E6A;font-size:11px;line-height:1.4;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;">Premium-Umfang nächste Analyse</p>
<p style="margin:0;font-family:{_AMLAKI_FONT};color:#3D3526;font-size:13px;line-height:1.5;font-weight:500;">{features_inline}</p>"""

    text_body = f"""{salutation},

deine {stadt}-Analyse ist durch. Score {score_int}/100. {text_score_summary}

WIR SIND FRISCH AM MARKT. DEIN FEEDBACK IST MIR GERADE WICHTIGER ALS JEDER UMSATZ.

Mein Dankeschön: 60% Rabatt auf deine nächste Analyse. 3 EUR statt 9 EUR. 60 Sekunden Feedback genügen.

Premium-Umfang nächste Analyse:
Fairer Preis, Was-wäre-wenn Szenarien, KfW-Förderungen, Verhandlungsmail.

Hier geht's los: {feedback_url}

3 Fragen, einmalig pro Account.

Beste Grüße
Arya
Gründer, Amlaki
"""

    html_body = _amlaki_email_shell(
        headline=headline,
        eyebrow=eyebrow,
        content_html=content,
        hero_html=_email_score_hero(score_int),
    )

    try:
        send_email_dual(to_email, subject, text_body, html_body, marketing=True)
    except Exception as e:
        print(f"[WARN] Follow-Up Mail fehlgeschlagen: {e}")


def send_reset_email(to_email: str, reset_token: str, first_name: str = ""):
    """Sendet Passwort-Reset Email via Resend (Fallback: SMTP)"""
    frontend_url = os.getenv("FRONTEND_URL", "https://amlaki.de")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    body = f"""Hallo,

du hast angefordert, dein Passwort bei AmlakiAI zurückzusetzen.

Klicke auf folgenden Link um ein neues Passwort zu setzen:
{reset_link}

Der Link ist 1 Stunde gültig.

Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.

Viele Grüße,
Dein AmlakiAI Team
"""

    # Resend bevorzugen: gebrandete HTML-Mail (Text-Fallback bleibt)
    if RESEND_API_KEY:
        content = f"""<p style="margin:0 0 24px 0;font-family:{_AMLAKI_FONT};color:#3D3526;font-size:17px;line-height:1.6;font-weight:400;">du hast angefordert, dein Passwort bei Amlaki zur&uuml;ckzusetzen. Mit einem Klick setzt du ein neues:</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tr>
  <td style="border-radius:10px;background:#2C2418;">
    <a href="{reset_link}" style="display:inline-block;padding:14px 30px;font-family:{_AMLAKI_FONT};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">Neues Passwort setzen &nbsp;&rarr;</a>
  </td>
</tr></table>

<p style="margin:0 0 24px 0;font-family:{_AMLAKI_FONT};color:#B5A68C;font-size:12px;line-height:1.5;">
  Link funktioniert nicht? Kopiere ihn in den Browser:<br>
  <a href="{reset_link}" style="color:#8C7E6A;text-decoration:none;word-break:break-all;">{reset_link}</a>
</p>

<p style="margin:0;font-family:{_AMLAKI_FONT};color:#8C7E6A;font-size:13px;line-height:1.5;">Der Link ist 1 Stunde g&uuml;ltig. Falls du das nicht warst, ignoriere diese Mail, dein Passwort bleibt wie es ist.</p>"""
        html_body = _amlaki_email_shell(
            headline=f"Moin {first_name}," if first_name else "Moin,",
            eyebrow="Passwort zurücksetzen",
            content_html=content,
            hero_html=_email_hero("dots.gif", 120, 40, ""),
        )
        return send_email_dual(to_email, "Neues Passwort für Amlaki", body, html_body)

    if not SMTP_PASS:
        print("WARNUNG: Weder RESEND_API_KEY noch SMTP_PASS gesetzt")
        return False

    msg = MIMEMultipart()
    msg["From"] = f"AmlakiAI <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = "Passwort zurücksetzen - AmlakiAI"

    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Versuch SSL 465, dann STARTTLS 587
    try:
        with smtplib.SMTP_SSL(SMTP_HOST, 465, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e1:
        print(f"Reset-Mail SSL 465 fehlgeschlagen: {e1}")
    try:
        with smtplib.SMTP(SMTP_HOST, 587, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e2:
        print(f"Reset-Mail STARTTLS 587 fehlgeschlagen: {e2}")
        return False


def send_new_user_notification(email: str, username: str):
    """Benachrichtigt Arya per E-Mail bei neuer Registrierung - versucht SSL (465) dann STARTTLS (587)"""
    if not SMTP_PASS:
        print("SMTP_PASS nicht gesetzt, ueberspringe Notification")
        return
    msg = MIMEMultipart()
    msg["From"] = f"AmlakiAI <{SMTP_USER}>"
    msg["To"] = "arya@amlaki.de"
    msg["Subject"] = f"Neuer User: {username}"
    body = f"Neuer User hat sich registriert:\n\nUsername: {username}\nE-Mail: {email}\n\namlaki.de/admin"
    msg.attach(MIMEText(body, "plain", "utf-8"))
    # Versuch 1: SSL auf Port 465
    try:
        with smtplib.SMTP_SSL(SMTP_HOST, 465, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        print(f"User-Notification gesendet (SSL 465): {username}")
        return
    except Exception as e:
        print(f"SSL 465 fehlgeschlagen: {e}")
    # Versuch 2: STARTTLS auf Port 587
    try:
        with smtplib.SMTP(SMTP_HOST, 587, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        print(f"User-Notification gesendet (STARTTLS 587): {username}")
    except Exception as e:
        print(f"STARTTLS 587 fehlgeschlagen: {e}")



@app.post("/auth/forgot-password")
@limiter.limit("3/hour")
def forgot_password(request: Request, data: dict = Body(...), db: Session = Depends(get_db)):
    """Sendet Passwort-Reset Link per Email"""
    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="E-Mail erforderlich")

    # Immer 200 zurueckgeben (verhindert Email-Enumeration)
    user = db.query(User).filter(User.email == email).first()
    if user:
        token = _secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        # Alte Tokens fuer diese Email loeschen
        db.query(PasswordResetToken).filter(PasswordResetToken.email == email).delete()
        db.add(PasswordResetToken(token_hash=token_hash, email=email, expires_at=datetime.utcnow() + timedelta(hours=1)))
        db.commit()
        send_reset_email(email, token, (user.username or "").split()[0] if user.username else "")

    return {"status": "ok", "message": "Falls ein Account mit dieser E-Mail existiert, wurde ein Reset-Link gesendet."}


@app.post("/auth/reset-password")
def reset_password(data: dict = Body(...), db: Session = Depends(get_db)):
    """Setzt Passwort mit Reset-Token zurueck"""
    token = data.get("token", "")
    new_password = data.get("password", "")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token und neues Passwort erforderlich")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen lang sein")

    if not re.search(r'[A-Z]', new_password):
        raise HTTPException(status_code=400, detail="Passwort muss mindestens einen Großbuchstaben enthalten")

    if not re.search(r'[0-9]', new_password):
        raise HTTPException(status_code=400, detail="Passwort muss mindestens eine Zahl enthalten")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False
    ).first()

    if not reset_entry:
        raise HTTPException(status_code=400, detail="Ungueltiger oder abgelaufener Reset-Link")

    if datetime.utcnow() > reset_entry.expires_at:
        db.delete(reset_entry)
        db.commit()
        raise HTTPException(status_code=400, detail="Reset-Link ist abgelaufen")

    user = db.query(User).filter(User.email == reset_entry.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User nicht gefunden")

    user.hashed_password = get_password_hash(new_password)
    reset_entry.used = True
    db.commit()

    # Aufraumen: alle abgelaufenen Tokens loeschen
    db.query(PasswordResetToken).filter(PasswordResetToken.expires_at < datetime.utcnow()).delete()
    db.commit()

    return {"status": "ok", "message": "Passwort wurde erfolgreich zurueckgesetzt"}


@app.delete("/auth/delete-account")
def delete_own_account(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """DSGVO: User kann seinen eigenen Account loeschen"""
    if current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Admin-Account kann nicht selbst geloescht werden")

    user_id = current_user.id
    user_email = current_user.email

    # Loesche alle Conversations und Messages
    conversations = db.query(Conversation).filter(Conversation.user_id == user_id).all()
    for conv in conversations:
        db.query(ChatMessage).filter(ChatMessage.conversation_id == conv.id).delete()
        db.delete(conv)

    # Manuell FK-abhaengige Records loeschen
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_id).delete()
    db.query(RedemptionToken).filter(RedemptionToken.user_id == user_id).delete()
    db.query(Review).filter(Review.user_id == user_id).delete()
    db.query(TrackingEvent).filter(TrackingEvent.user_id == user_id).delete()
    db.query(PerfLog).filter(PerfLog.user_id == user_id).delete()
    db.query(PasswordResetToken).filter(PasswordResetToken.email == user_email).delete()

    # Loesche User (Analysen, UsageLogs, Purchases via cascade)
    db.delete(current_user)
    db.commit()

    return {"status": "ok", "message": "Account und alle Daten wurden geloescht"}


@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Gibt Infos zum aktuell eingeloggten User zurück"""
    return current_user


@app.put("/auth/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert User-Profil"""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.default_verwendungszweck is not None:
        current_user.default_verwendungszweck = user_update.default_verwendungszweck
    if user_update.default_zinssatz is not None:
        current_user.default_zinssatz = user_update.default_zinssatz
    if user_update.default_tilgung is not None:
        current_user.default_tilgung = user_update.default_tilgung

    db.commit()
    db.refresh(current_user)
    return current_user

# Gewichtungen für Kapitalanlage
WEIGHTS_INVESTMENT = {
    "cashflow_rendite": 30,
    "lage": 15,
    "kaufpreis_qm": 20,
    "zukunftspotenzial": 8,
    "zustand_baujahr": 10,
    "energieeffizienz": 7,
    "nebenkosten": 5,
    "grundriss": 3,
    "verkäufertyp": 2,
}

# Gewichtungen für Eigennutzung
WEIGHTS_SELF_USE = {
    "lage": 25,
    "grundriss": 20,
    "zustand_baujahr": 15,
    "zukunftspotenzial": 15,
    "kaufpreis_qm": 10,
    "energieeffizienz": 8,
    "nebenkosten": 5,
    "verkäufertyp": 2,
    "cashflow_rendite": 0,  # Irrelevant für Eigennutzung
}


# No-Go-Kriterien für Immobilien
def check_no_gos(data: 'PropertyData') -> Dict[str, Any]:
    """
    Prüft auf K.O.-Kriterien, die eine Immobilie disqualifizieren

    No-Gos:
    1. Erbpacht / Erbbaurecht
    2. Fertighäuser Baujahr 1960-1990
    3. Energieklasse G oder H - NUR wenn KfW-Sanierung sich nicht lohnt!

    Returns:
        Dict mit no_go (bool), gründe (List), warnung (str), energie_analyse (dict)
    """
    no_gos = []
    warnings = []
    energie_analyse = None

    # 1. Erbpacht / Erbbaurecht — strukturiert UND aus Beschreibung
    # Echtes No-Go nur bei Restlaufzeit <20J (unfinanzierbar). Sonst: starkes
    # Warnsignal + Score-Abzug, aber kein Dealbreaker — fuer manche Profile
    # (Eigennutzer 50+, Yield-Investor mit 8-15J Hold) ist Erbbau okay.
    erbbau_explicit = bool(data.erbbaurecht)
    erbbau_in_text = bool(
        data.beschreibung and (
            'erbpacht' in data.beschreibung.lower()
            or 'erbbaurecht' in data.beschreibung.lower()
            or 'erbbauzins' in data.beschreibung.lower()
        )
    )
    if erbbau_explicit or erbbau_in_text:
        rl = data.erbbau_restlaufzeit_jahre
        zins = data.erbbauzins_jahr
        zins_text = f", Erbbauzins {int(zins)} EUR/Jahr" if zins else ""
        if rl is not None and rl < 20:
            # Echtes No-Go: Banken finanzieren faktisch nicht mehr
            no_gos.append(
                f"Erbbaurecht mit nur {rl} Jahren Restlaufzeit — Finanzierung ueber Standardbanken praktisch unmoeglich{zins_text}"
            )
        # Hoehere Restlaufzeiten: kein No-Go, sondern starkes Warnsignal mit Score-Penalty
        # (wird in der Score-Berechnung weiter unten beruecksichtigt).

    # 2. Fertighäuser 1960-1990 (nur wenn explizit als Fertighaus erkannt)
    if data.baujahr and 1960 <= data.baujahr <= 1990:
        ist_fertighaus = False
        if data.objekttyp and 'fertighaus' in data.objekttyp.lower():
            ist_fertighaus = True
        elif data.beschreibung and 'fertighaus' in data.beschreibung.lower():
            ist_fertighaus = True
        if ist_fertighaus:
            no_gos.append(f"Fertighaus aus Problemzeit (Baujahr {data.baujahr})")

    # 3. Energieklasse G oder H - MIT KfW-ANALYSE!
    if data.energieklasse and data.energieklasse.upper() in ['G', 'H']:
        wohnflaeche = data.wohnflaeche or 80  # Fallback

        # Geschätzte Sanierungskosten pro m² (je nach Energieklasse)
        # G: 300-500€/m², H: 400-700€/m² für Komplettsanierung
        sanierung_kosten_pro_qm = 400 if data.energieklasse.upper() == 'G' else 550
        geschaetzte_sanierungskosten = wohnflaeche * sanierung_kosten_pro_qm

        # KfW 261 Förderung: Max. 150.000€ Kredit mit bis zu 45% Tilgungszuschuss
        # Bei Sanierung auf EH 55: bis zu 25% Zuschuss + 20% bei WPB
        kfw_kredit_max = min(150000, geschaetzte_sanierungskosten)
        kfw_zuschuss_prozent = 25  # Konservativ: EH 55 ohne WPB
        kfw_zuschuss = kfw_kredit_max * (kfw_zuschuss_prozent / 100)

        # Effektive Sanierungskosten nach Förderung
        effektive_kosten = geschaetzte_sanierungskosten - kfw_zuschuss

        # Energiekostenersparnis pro Jahr (ca. 10-15€/m² bei G/H -> A/B)
        jaehrliche_ersparnis = wohnflaeche * 12  # ~12€/m² Ersparnis

        # Amortisationszeit in Jahren
        amortisation_jahre = effektive_kosten / jaehrliche_ersparnis if jaehrliche_ersparnis > 0 else 999

        # Wertsteigerung durch Sanierung (ca. 10-20% des Kaufpreises)
        wertsteigerung_geschaetzt = (data.kaufpreis or 0) * 0.15 if data.kaufpreis else 0

        # ENTSCHEIDUNG: Lohnt sich KfW?
        # Wenn Amortisation < 15 Jahre ODER Wertsteigerung > Kosten -> KEIN No-Go!
        lohnt_sich_kfw = amortisation_jahre < 15 or wertsteigerung_geschaetzt > effektive_kosten

        energie_analyse = {
            "energieklasse": data.energieklasse.upper(),
            "wohnflaeche": wohnflaeche,
            "geschaetzte_sanierungskosten": round(geschaetzte_sanierungskosten, 0),
            "sanierung_kosten_pro_qm": sanierung_kosten_pro_qm,
            "kfw_programm": "KfW 261 (Wohngebäude)",
            "kfw_kredit_max": round(kfw_kredit_max, 0),
            "kfw_zuschuss_prozent": kfw_zuschuss_prozent,
            "kfw_zuschuss_betrag": round(kfw_zuschuss, 0),
            "effektive_kosten_nach_foerderung": round(effektive_kosten, 0),
            "jaehrliche_energieersparnis": round(jaehrliche_ersparnis, 0),
            "amortisation_jahre": round(amortisation_jahre, 1),
            "geschaetzte_wertsteigerung": round(wertsteigerung_geschaetzt, 0),
            "lohnt_sich_sanierung": lohnt_sich_kfw,
            "fazit": f"Sanierung {'LOHNENSWERT' if lohnt_sich_kfw else 'KRITISCH'}: "
                     f"Effektive Kosten {round(effektive_kosten, 0):,}€ nach KfW-Förderung, "
                     f"Amortisation in {round(amortisation_jahre, 1)} Jahren"
        }

        if lohnt_sich_kfw:
            # Nur Warnung, kein No-Go!
            warnings.append(
                f"Energieklasse {data.energieklasse}: Sanierung empfohlen! "
                f"KfW-Zuschuss: {round(kfw_zuschuss, 0):,}€ | "
                f"Effektive Kosten: {round(effektive_kosten, 0):,}€ | "
                f"Amortisation: {round(amortisation_jahre, 1)} Jahre"
            )
        else:
            # Echtes No-Go: Sanierung lohnt sich nicht
            no_gos.append(
                f"Energieklasse {data.energieklasse}: Sanierung unwirtschaftlich! "
                f"Kosten {round(effektive_kosten, 0):,}€ nach Förderung, "
                f"Amortisation erst nach {round(amortisation_jahre, 1)} Jahren"
            )

    return {
        "no_go": len(no_gos) > 0,
        "gründe": no_gos,
        "warnungen": warnings,
        "ist_investierbar": len(no_gos) == 0,
        "energie_analyse": energie_analyse
    }


def calculate_investment_metrics(
    kaufpreis: float,
    jahreskaltmiete: float,
    wohnflaeche: float = None
) -> Dict[str, Any]:
    """
    Berechnet Kaufpreisfaktor und Bruttorendite

    Kaufpreisfaktor = Kaufpreis / Jahreskaltmiete
    - Gut: < 20
    - Mittel: 20-25
    - Schlecht: > 25

    Bruttorendite = (Jahreskaltmiete / Kaufpreis) * 100
    - Sehr gut: > 5%
    - Gut: 4-5%
    - Mittel: 3-4%
    - Schlecht: < 3%
    """
    if not kaufpreis or kaufpreis <= 0:
        return {"fehler": "Kaufpreis ungültig"}

    if not jahreskaltmiete or jahreskaltmiete <= 0:
        return {"fehler": "Jahreskaltmiete ungültig"}

    kaufpreisfaktor = kaufpreis / jahreskaltmiete
    bruttorendite = (jahreskaltmiete / kaufpreis) * 100

    # Bewertung Kaufpreisfaktor (positivere Schwellen)
    if kaufpreisfaktor < 22:
        kpf_bewertung = "Sehr gut"
        kpf_score = 90
    elif kaufpreisfaktor < 27:
        kpf_bewertung = "Gut"
        kpf_score = 75
    elif kaufpreisfaktor < 32:
        kpf_bewertung = "Akzeptabel"
        kpf_score = 55
    else:
        kpf_bewertung = "Hoch"
        kpf_score = 35

    # Bewertung Bruttorendite (positivere Schwellen)
    if bruttorendite >= 4.5:
        br_bewertung = "Sehr gut"
        br_score = 90
    elif bruttorendite >= 3.5:
        br_bewertung = "Gut"
        br_score = 75
    elif bruttorendite >= 2.5:
        br_bewertung = "Akzeptabel"
        br_score = 55
    else:
        br_bewertung = "Niedrig"
        br_score = 35

    result = {
        "kaufpreisfaktor": round(kaufpreisfaktor, 2),
        "kaufpreisfaktor_bewertung": kpf_bewertung,
        "kaufpreisfaktor_score": kpf_score,
        "bruttorendite_prozent": round(bruttorendite, 2),
        "bruttorendite_bewertung": br_bewertung,
        "bruttorendite_score": br_score,
    }

    # Optional: Preis pro qm wenn verfügbar
    if wohnflaeche and wohnflaeche > 0:
        result["kaufpreis_pro_qm"] = round(kaufpreis / wohnflaeche, 2)

    return result


def detect_warning_signals(data: 'PropertyData') -> Dict[str, Any]:
    """
    Erkennt Warnsignale im Exposé

    Warnsignale:
    - "Renovierungsbedürftig", "Sanierungsstau", "Handwerkerobjekt"
    - "Verkauf aus Altersgründen" (oft versteckte Mängel)
    - "Nur an Selbstnutzer" (Probleme mit Vermietung)
    - "Keine Besichtigung möglich" (Red Flag)
    - "Sofort frei" bei vermieteten Objekten (Mieterprobleme?)
    - Sehr niedrige Miete bei Altmietern (Mieterhöhungspotenzial eingeschränkt)
    - "Denkmalschutz" (hohe Auflagen)
    - "Milieuschutz" (Einschränkungen)
    """
    warnsignale = []
    schweregrad = 0  # 0-10 Skala

    if not data.beschreibung:
        return {
            "warnsignale": [],
            "anzahl": 0,
            "schweregrad": 0,
            "kritisch": False
        }

    text = data.beschreibung.lower()

    # Sanierungsbedarf
    sanierungsmuster = [
        'renovierungsbedürftig', 'sanierungsbedürftig', 'sanierungsstau',
        'handwerkerobjekt', 'ausbau', 'rohbau', 'kernsaniert werden'
    ]
    for muster in sanierungsmuster:
        if muster in text:
            warnsignale.append(f"Sanierungsbedarf erkannt: '{muster}'")
            schweregrad += 2

    # Verkaufsgründe (verdächtig)
    if 'aus altersgründen' in text or 'altersbedingt' in text:
        warnsignale.append("Verkauf aus Altersgründen (versteckte Mängel möglich)")
        schweregrad += 1

    # Einschränkungen
    if 'nur an selbstnutzer' in text or 'nur eigennutzung' in text:
        warnsignale.append("Nur an Selbstnutzer (Vermietung eingeschränkt)")
        schweregrad += 3

    if 'keine besichtigung' in text:
        warnsignale.append("Keine Besichtigung möglich (Red Flag!)")
        schweregrad += 5

    # Rechtliche Einschränkungen
    if 'denkmalschutz' in text or 'denkmalgeschützt' in text:
        warnsignale.append("Denkmalschutz (hohe Auflagen, Sanierungskosten)")
        schweregrad += 2

    if 'milieuschutz' in text or 'erhaltungssatzung' in text:
        warnsignale.append("Milieuschutz (Modernisierungseinschränkungen)")
        schweregrad += 2

    # Mietrechtliche Probleme
    if 'altmieter' in text and data.aktuelle_miete:
        # Prüfe ob Miete ungewöhnlich niedrig
        if data.wohnflaeche and (data.aktuelle_miete / data.wohnflaeche) < 6:
            warnsignale.append("Sehr niedrige Bestandsmiete bei Altmieter (Mieterhöhungspotenzial eingeschränkt)")
            schweregrad += 2

    # Erbpacht / Erbbaurecht — Severity nach Restlaufzeit gestaffelt
    if data.erbbaurecht or 'erbpacht' in text or 'erbbaurecht' in text or 'erbbauzins' in text:
        rl = data.erbbau_restlaufzeit_jahre
        zins = data.erbbauzins_jahr
        zins_part = f", Erbbauzins {int(zins)} EUR/Jahr" if zins else ""
        if rl is not None and rl < 20:
            warnsignale.append(f"KRITISCH: Erbbaurecht mit nur {rl} Jahren Restlaufzeit — Finanzierung praktisch unmoeglich{zins_part}")
            schweregrad += 7
        elif rl is not None and rl < 50:
            warnsignale.append(f"Erbbaurecht: {rl} Jahre Restlaufzeit — Werthaltigkeit + Wiederverkauf eingeschraenkt, Verlaengerung mit Eigentuemer pruefen{zins_part}")
            schweregrad += 4
        elif rl is not None and rl < 70:
            warnsignale.append(f"Erbbaurecht: {rl} Jahre Restlaufzeit — fuer langen Hold akzeptabel, Verlaengerung pruefen{zins_part}")
            schweregrad += 2
        elif rl is not None:
            warnsignale.append(f"Erbbaurecht erkannt ({rl} Jahre Restlaufzeit){zins_part}")
            schweregrad += 1
        else:
            warnsignale.append(f"Erbbaurecht erkannt — Restlaufzeit vor Kauf zwingend klaeren{zins_part}")
            schweregrad += 3

    return {
        "warnsignale": warnsignale,
        "anzahl": len(warnsignale),
        "schweregrad": min(schweregrad, 10),  # Max 10
        "kritisch": schweregrad >= 5
    }


class PropertyData(BaseModel):
    """Extrahierte Immobiliendaten"""
    kaufpreis: Optional[float] = None
    wohnflaeche: Optional[float] = None
    zimmer: Optional[float] = None
    baujahr: Optional[int] = None
    etage: Optional[str] = None
    nebenkosten: Optional[float] = None
    hausgeld: Optional[float] = None
    hausgeld_nicht_umlagefaehig: Optional[float] = None  # Nicht umlagefähiger Anteil des Hausgelds
    energieausweis: Optional[str] = None
    energieklasse: Optional[str] = None
    heizungsart: Optional[str] = None
    adresse: Optional[str] = None
    plz: Optional[str] = None
    stadt: Optional[str] = None
    stadtteil: Optional[str] = None
    objekttyp: Optional[str] = None
    zustand: Optional[str] = None
    ausstattung: Optional[str] = None
    balkon_terrasse: Optional[bool] = None
    keller: Optional[bool] = None
    stellplatz: Optional[str] = None
    vermietet: Optional[bool] = None
    aktuelle_miete: Optional[float] = None
    warmmiete_aus_expose: Optional[float] = None  # Nur wenn im Exposé ausschließlich Warmmiete stand
    miete_typ_im_expose: Optional[str] = None  # 'kaltmiete', 'warmmiete', 'nicht_angegeben'
    verkäufertyp: Optional[str] = None
    provision: Optional[str] = None
    beschreibung: Optional[str] = None
    # Erbbaurecht (kritischer Dealbreaker bei Restlaufzeit < 50 Jahre)
    erbbaurecht: Optional[bool] = None
    erbbauzins_jahr: Optional[float] = None  # Jahreszins fuer Erbbau in Euro
    erbbau_restlaufzeit_jahre: Optional[int] = None  # Restjahre bis Vertragsende
    erbbau_vertragsende: Optional[str] = None  # Datum/Jahr Vertragsende
    # Sondernutzungsrechte / Lasten in Abteilung II Grundbuch
    abteilung_ii_lasten: Optional[str] = None  # Wegerechte, Wohnrecht, Niessbrauch etc. als Freitext


class AnalysisRequest(BaseModel):
    """Anfrage für Immobilienanalyse"""
    property_data: PropertyData
    verwendungszweck: str  # "kapitalanlage" oder "eigennutzung"
    eigenkapital: Optional[float] = 0
    zinssatz: Optional[float] = 4.3  # Aktualisiert Oktober 2026 (Interhyp/Dr. Klein: 10 J ca. 4,2-4,5 %)
    tilgung: Optional[float] = 1.25
    marktpreis_qm: Optional[float] = None  # Falls manuell eingegeben
    besichtigt: Optional[bool] = None  # Ob User schon bei Besichtigung war
    besichtigungs_notizen: Optional[str] = None  # Notizen von der Besichtigung
    analysis_id: Optional[int] = None  # Wenn gesetzt: bestehende Analyse updaten statt neue erstellen


class CriterionScore(BaseModel):
    """Bewertung eines einzelnen Kriteriums"""
    name: str
    score: float  # 0-100
    gewichtung: float
    gewichteter_score: float
    begründung: str
    details: Optional[dict] = None


class AnalysisResult(BaseModel):
    """Ergebnis der Immobilienanalyse"""
    gesamtscore: float
    verwendungszweck: str
    kriterien: List[CriterionScore]
    cashflow_analyse: Optional[dict] = None
    investment_metriken: Optional[dict] = None  # Kaufpreisfaktor, Bruttorendite
    no_go_check: Optional[dict] = None  # No-Go Prüfung
    warnsignale: Optional[dict] = None  # Warnsignal-Erkennung
    zusammenfassung: str
    stärken: List[str]
    schwächen: List[str]
    empfehlung: str  # "Investieren", "Prüfen", "Ablehnen"
    marktdaten: Optional[dict] = None
    # Neue erweiterte Analysen
    tilgungsplan: Optional[dict] = None
    breakeven_eigenkapital: Optional[dict] = None
    szenarien: Optional[List[dict]] = None
    sensitivity_analyse: Optional[dict] = None
    # Zusätzliche Analyse-Features
    investment_vergleich: Optional[dict] = None
    meilensteine: Optional[dict] = None
    miet_variationen: Optional[List[dict]] = None
    finanzierungsoptionen: Optional[List[dict]] = None
    # NEU: Knowledge Base Integration
    verbesserungsvorschlaege: Optional[List[dict]] = None  # Konstruktive Tipps
    foerderungen: Optional[List[dict]] = None  # Passende Förderungen
    fairer_preis: Optional[dict] = None  # Fairer Preis Berechnung
    afa_berechnung: Optional[dict] = None  # AfA nach verschiedenen Methoden
    leverage_effekt: Optional[dict] = None  # Hebeleffekt Berechnung
    quick_check_result: Optional[dict] = None  # Schnell-Check
    # V3.0: Live-Marktdaten Vergleich
    kennzahlen: Optional[dict] = None  # Preis/m², Markt-Vergleich, etc.
    # NEU: Mietschätzung bei freien Immobilien
    mietschaetzung: Optional[dict] = None  # Info wenn Miete geschätzt wurde
    # NEU: Kaufnebenkosten
    kaufnebenkosten: Optional[dict] = None  # Aufschlüsselung der Kaufnebenkosten
    # NEU: Analysis-ID nach Speicherung
    analysis_id: Optional[int] = None  # ID der gespeicherten Analyse
    # Verhandlungsnachricht
    verhandlungsmail: Optional[str] = None  # Fertige Nachricht an Verkaeufer/Makler
    # Neuvermietungs-Potenzial
    neuvermietung_potenzial: Optional[dict] = None  # Mietoptimierung: Neuvermietung, WG, moebliert
    # Besichtigungs-Roadmap
    besichtigungs_roadmap: Optional[dict] = None  # Checkliste und Tipps fuer die Besichtigung
    besichtigt: Optional[bool] = None  # Ob User schon besichtigt hat
    # Potenzial-Szenarien
    potenzial_szenarien: Optional[dict] = None  # Was-waere-wenn Szenarien mit Score-Veraenderung
    # Premium Status
    is_premium: bool = False  # True = alle Features sichtbar


def get_anthropic_client():
    """Erstellt Anthropic Client mit deaktiviertem Logging"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nicht konfiguriert")
    # Kein eigener httpx-Client mehr: neuere SDK-Versionen nutzen httpx2 und
    # lehnen httpx.Client ab (TypeError auf Render). timeout reicht.
    return anthropic.Anthropic(api_key=api_key, timeout=120.0, max_retries=2)


def call_claude_direct(system_prompt: str, messages: list, max_tokens: int = 4096, model: str = None, db: Session = None, user_id: int = None, action_type: str = None):
    """Call Claude API directly via httpx. Optionally logs usage if db+user_id provided."""
    if model is None:
        model = CLAUDE_SONNET_MODEL
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nicht konfiguriert")

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": max_tokens,
            "system": [{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
            "messages": messages,
        },
        timeout=120.0,
    )

    if response.status_code != 200:
        print(f"[ERROR] Claude API Fehler: {response.status_code} - {response.text[:200]}")
        raise HTTPException(status_code=500, detail="KI-Service voruebergehend nicht erreichbar. Bitte versuche es erneut.")

    data = response.json()

    # Log usage if db session provided (inkl. cache tokens)
    if db and user_id and data.get("usage"):
        try:
            usage = data["usage"]
            total_input = usage.get("input_tokens", 0)
            cache_creation = usage.get("cache_creation_input_tokens", 0) or 0
            cache_read = usage.get("cache_read_input_tokens", 0) or 0
            effective_input = total_input + cache_creation + int(cache_read * 0.1)
            log_usage(
                db=db, user_id=user_id,
                action_type=action_type or "api_call",
                input_tokens=effective_input,
                output_tokens=usage.get("output_tokens", 0),
                model=model
            )
        except Exception as e:
            print(f"[WARN] Usage-Log fehlgeschlagen: {e}")

    return data


@app.get("/")
async def root():
    return {"message": "AmlakI API läuft", "version": "2.0.0"}


# Debug endpoints removed for security


# ========================================
# LIBRARY ENDPOINTS (gespeicherte Analysen)
# ========================================

@app.get("/library", response_model=List[AnalysisListItem])
def get_user_analyses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Holt alle Analysen des Users"""
    analyses = db.query(Analysis)\
        .filter(Analysis.user_id == current_user.id)\
        .order_by(Analysis.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    return analyses


@app.get("/library/favorites", response_model=List[AnalysisListItem])
def get_favorite_analyses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Holt alle Favoriten-Analysen"""
    analyses = db.query(Analysis)\
        .filter(Analysis.user_id == current_user.id, Analysis.is_favorite == True)\
        .order_by(Analysis.created_at.desc())\
        .all()

    return analyses


@app.get("/library/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Holt eine spezifische Analyse"""
    analysis = db.query(Analysis)\
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)\
        .first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis


@app.put("/library/{analysis_id}", response_model=AnalysisResponse)
def update_analysis(
    analysis_id: int,
    analysis_update: AnalysisUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert eine Analyse (Titel, Notizen, Favorit, Tags)"""
    analysis = db.query(Analysis)\
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)\
        .first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis_update.title is not None:
        analysis.title = analysis_update.title
    if analysis_update.notes is not None:
        analysis.notes = analysis_update.notes
    if analysis_update.is_favorite is not None:
        analysis.is_favorite = analysis_update.is_favorite
    if analysis_update.tags is not None:
        analysis.tags = analysis_update.tags

    db.commit()
    db.refresh(analysis)
    return analysis


@app.delete("/library/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Löscht eine Analyse und entkoppelt verknüpfte Conversations"""
    analysis = db.query(Analysis)\
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)\
        .first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Conversations entkoppeln (ForeignKey auf NULL setzen)
    db.query(Conversation)\
        .filter(Conversation.analysis_id == analysis_id)\
        .update({Conversation.analysis_id: None})

    db.delete(analysis)
    db.commit()
    return None


@app.post("/extract-pdf")
@limiter.limit("10/hour")
async def extract_pdf_data(request: Request, file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)):
    """
    Extrahiert Immobiliendaten aus einem PDF-Exposé mittels Claude
    """
    # Credits-Gate VOR teurem LLM-Call (PDF-Extract kostet ~0.10-0.20 USD)
    if not current_user.is_superuser:
        credits_now = current_user.analysis_credits if current_user.analysis_credits is not None else 0
        if credits_now < 1:
            raise HTTPException(status_code=402, detail="Keine Credits verfuegbar")

    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Nur PDF-Dateien werden akzeptiert")

    content = await file.read()

    # Backend PDF size limit
    if len(content) > 30 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF zu gross (max. 30 MB)")

    # Base64 encoding für Claude
    import base64
    pdf_base64 = base64.b64encode(content).decode('utf-8')
    
    client = get_anthropic_client()
    
    extraction_prompt = """Analysiere dieses Immobilien-Exposé und extrahiere alle relevanten Daten.

Gib die Daten als JSON zurück mit genau diesen Feldern (null wenn nicht gefunden):

{
    "kaufpreis": <Zahl in Euro>,
    "wohnflaeche": <Zahl in qm>,
    "zimmer": <Anzahl>,
    "baujahr": <Jahr>,
    "etage": "<z.B. 2. OG>",
    "nebenkosten": <monatlich in Euro>,
    "hausgeld": <monatlich in Euro>,
    "hausgeld_nicht_umlagefaehig": <nicht umlagefähiger Anteil des Hausgelds in Euro, oft als "nicht umlagefähig", "Verwaltung + Instandhaltungsrücklage" oder "davon nicht umlagefähig" angegeben, null wenn nicht gefunden>,
    "energieausweis": "<Verbrauch oder Bedarf>",
    "energieklasse": "<A+ bis H>",
    "heizungsart": "<z.B. Gas-Zentralheizung>",
    "adresse": "<Straße und Hausnummer>",
    "plz": "<Postleitzahl, z.B. 22297>",
    "stadt": "<Stadt>",
    "stadtteil": "<Stadtteil/Bezirk>",
    "objekttyp": "<z.B. Eigentumswohnung, Einfamilienhaus>",
    "zustand": "<z.B. gepflegt, renovierungsbedürftig, Neubau>",
    "ausstattung": "<z.B. gehoben, normal, einfach>",
    "balkon_terrasse": <true/false>,
    "keller": <true/false>,
    "stellplatz": "<z.B. Tiefgarage, Außenstellplatz, keiner>",
    "vermietet": <true/false>,
    "aktuelle_miete": <monatliche KALTMIETE (Nettokaltmiete) in Euro falls vermietet — WICHTIG: Wenn im Exposé nur eine Warmmiete oder Gesamtmiete angegeben ist, versuche die Kaltmiete zu ermitteln, indem du die Nebenkosten/Betriebskosten abziehst. Wenn keine separate Kaltmiete ermittelbar ist, setze dieses Feld auf null und trage die Warmmiete stattdessen in "warmmiete_aus_expose" ein>,
    "warmmiete_aus_expose": <monatliche Warmmiete in Euro, NUR ausfüllen wenn im Exposé ausschließlich eine Warmmiete/Gesamtmiete ohne separate Kaltmiete angegeben ist, sonst null>,
    "miete_typ_im_expose": "<welcher Miettyp stand im Exposé: 'kaltmiete', 'warmmiete', 'nicht_angegeben'>",
    "verkäufertyp": "<privat oder Makler>",
    "provision": "<z.B. 3,57% oder provisionsfrei>",
    "beschreibung": "<Kurze Zusammenfassung des Objekts in 2-3 Sätzen>",
    "erbbaurecht": <true wenn Erbbaurecht/Erbpacht vorhanden ist, false wenn explizit Volleigentum/Volleigentum am Grundstück, null wenn nicht erwähnt. Suche nach: 'Erbbaurecht', 'Erbpacht', 'Erbbauberechtigt', 'Erbbauzins', Eintragungen in Abteilung II des Grundbuchs>,
    "erbbauzins_jahr": <jährlicher Erbbauzins in Euro, NUR ausfuellen wenn erbbaurecht=true. Suche nach 'Erbbauzins p.a.', 'Erbbauzins jährlich'. Falls monatlich angegeben, mit 12 multiplizieren>,
    "erbbau_restlaufzeit_jahre": <Restlaufzeit des Erbbaurechts in Jahren ab heute (2026). Berechne aus 'Vertragslaufzeit bis JJJJ' oder 'Erbbauvertrag bis JJJJ' minus 2026. NUR wenn erbbaurecht=true>,
    "erbbau_vertragsende": "<Jahr oder Datum des Vertragsendes, z.B. '2072' oder '05.12.2072'. NUR wenn erbbaurecht=true>",
    "abteilung_ii_lasten": "<Freitext mit Lasten aus Grundbuch Abteilung II falls erwähnt: Wegerechte, Wohnrecht, Niessbrauch, Vorkaufsrechte, etc. null wenn nicht erwähnt>"
}

WICHTIG zu Erbbaurecht: Das ist ein KRITISCHER Faktor fuer Kapitalanleger. Lies das gesamte Exposé sorgfältig - Erbbaurecht steht oft erst auf späteren Seiten unter 'Rechtliche Gegebenheiten', 'Eintragungen in Abteilung II', 'Objektspezifische Informationen' oder versteckt in der Bullet-Liste der Objektbeschreibung als 'Erbbauzins im Hausgeld enthalten'. Wenn Erbbaurecht erwähnt ist, MUSST du erbbaurecht=true setzen.

Antworte NUR mit dem JSON, kein anderer Text."""

    try:
        response = client.messages.create(
            model=CLAUDE_SONNET_MODEL,
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": pdf_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": extraction_prompt
                        }
                    ]
                }
            ]
        )
        
        # Log PDF extraction usage (inkl. cache tokens die extra kosten)
        try:
            pdf_db = next(get_db())
            total_input = response.usage.input_tokens
            # Cache-Tokens kosten auch Geld (cache_creation = voller Preis, cache_read = 10% Preis)
            cache_creation = getattr(response.usage, 'cache_creation_input_tokens', 0) or 0
            cache_read = getattr(response.usage, 'cache_read_input_tokens', 0) or 0
            # Gesamte Input-Tokens fuer Kostenberechnung
            effective_input = total_input + cache_creation + int(cache_read * 0.1)
            print(f"[USAGE] PDF: input={total_input}, cache_create={cache_creation}, cache_read={cache_read}, effective={effective_input}, output={response.usage.output_tokens}")
            log_usage(db=pdf_db, user_id=current_user.id, action_type="pdf_extraction",
                      input_tokens=effective_input, output_tokens=response.usage.output_tokens,
                      model=CLAUDE_SONNET_MODEL)
            pdf_db.close()
        except Exception as log_err:
            print(f"[WARN] PDF Usage-Log fehlgeschlagen: {log_err}")

        # Parse JSON response
        json_text = response.content[0].text.strip()
        # Entferne mögliche Markdown-Codeblöcke
        if json_text.startswith("```"):
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
        json_text = json_text.strip()

        property_data = json.loads(json_text)

        # Warmmiete-Korrektur: Wenn nur Warmmiete im Exposé stand, Kaltmiete ableiten
        miete_typ = property_data.get("miete_typ_im_expose", "kaltmiete")
        warmmiete = property_data.get("warmmiete_aus_expose")
        aktuelle_miete = property_data.get("aktuelle_miete")
        nebenkosten = property_data.get("nebenkosten") or property_data.get("hausgeld") or 0

        if miete_typ == "warmmiete" or (warmmiete and warmmiete > 0 and not aktuelle_miete):
            # Nur Warmmiete vorhanden — Kaltmiete ableiten
            warm = warmmiete or aktuelle_miete or 0
            if warm > 0:
                if nebenkosten and nebenkosten > 0:
                    # Kaltmiete = Warmmiete - Nebenkosten/Hausgeld
                    geschaetzte_kaltmiete = warm - nebenkosten
                else:
                    # Keine NK bekannt: konservativ 25-30% der Warmmiete als NK schätzen
                    geschaetzte_kaltmiete = warm * 0.72  # 28% Abzug als konservative Schätzung

                geschaetzte_kaltmiete = max(0, geschaetzte_kaltmiete)
                property_data["aktuelle_miete"] = round(geschaetzte_kaltmiete, 2)
                property_data["warmmiete_aus_expose"] = round(warm, 2)
                property_data["miete_typ_im_expose"] = "warmmiete"
                print(f"[WARN] Exposé enthielt nur Warmmiete ({warm}€). Kaltmiete geschätzt: {round(geschaetzte_kaltmiete, 2)}€ (NK: {nebenkosten}€)")

        # Plausibilitätscheck: Wenn aktuelle_miete > Warmmiete wäre, stimmt etwas nicht
        if aktuelle_miete and warmmiete and aktuelle_miete > warmmiete:
            print(f"[WARN] Kaltmiete ({aktuelle_miete}€) > Warmmiete ({warmmiete}€) — Werte vermutlich vertauscht, korrigiere")
            property_data["aktuelle_miete"] = warmmiete - (nebenkosten or warmmiete * 0.28)
            property_data["warmmiete_aus_expose"] = warmmiete
            property_data["miete_typ_im_expose"] = "warmmiete"

        return PropertyData(**property_data)

    except json.JSONDecodeError as e:
        import traceback
        print(f"[ERROR] Fehler beim Parsen der KI-Antwort: {str(e)}")
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        detail = "Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut."
        if getattr(current_user, "is_superuser", False):
            detail = f"[DEBUG JSONDecodeError] {str(e)}"
        raise HTTPException(status_code=500, detail=detail)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[ERROR] Fehler bei der PDF-Extraktion: {type(e).__name__}: {str(e)}")
        print(f"[ERROR] Traceback:\n{tb}")
        detail = "Fehler bei der PDF-Extraktion. Bitte versuche es erneut."
        if getattr(current_user, "is_superuser", False):
            detail = f"[DEBUG {type(e).__name__}] {str(e)[:500]}"
        raise HTTPException(status_code=500, detail=detail)


# Schnelle Marktdaten-Lookup aus Knowledge Base
# Miete = aktuelle NEUVERMIETUNGSPREISE (Angebotsmieten), NICHT Bestandsdurchschnitt
KNOWN_CITIES = {
    # Stadt-Ebene: Angebotspreise Bestand Q3 2026 (immowelt Preiskompass 30.09.2026, ImmoScout24 WohnBarometer 02.10.2026, JLL H1 2026), Miete = Angebotsmiete Bestand (immowelt Mietkompass 01.10.2026)
    "muenchen": {"kauf_von": 8000, "kauf_bis": 8900, "miete": 21.5, "trend": "+1,3%", "faktor": "32-38"},
    "münchen": {"kauf_von": 8000, "kauf_bis": 8900, "miete": 21.5, "trend": "+1,3%", "faktor": "32-38"},
    "berlin": {"kauf_von": 4900, "kauf_bis": 5800, "miete": 14.5, "trend": "+2,2%", "faktor": "28-33"},
    "hamburg": {"kauf_von": 5300, "kauf_bis": 6300, "miete": 14.0, "trend": "+2,3%", "faktor": "28-35"},
    # Hamburg Stadtteile (Neuvermietungspreise 2026)
    "hamburg-uhlenhorst": {"kauf_von": 7000, "kauf_bis": 8500, "miete": 19.0, "trend": "+2,5%", "faktor": "28-35"},
    "hamburg-winterhude": {"kauf_von": 6500, "kauf_bis": 8000, "miete": 18.5, "trend": "+2,5%", "faktor": "27-34"},
    "hamburg-eppendorf": {"kauf_von": 6500, "kauf_bis": 8000, "miete": 18.0, "trend": "+2,0%", "faktor": "27-33"},
    "hamburg-eimsbüttel": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,5%", "faktor": "25-30"},
    "hamburg-eimsbuettel": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,5%", "faktor": "25-30"},
    "hamburg-altona": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.5, "trend": "+2,5%", "faktor": "25-31"},
    "hamburg-ottensen": {"kauf_von": 5800, "kauf_bis": 7200, "miete": 17.5, "trend": "+2,0%", "faktor": "25-31"},
    "hamburg-barmbek": {"kauf_von": 4500, "kauf_bis": 5500, "miete": 15.0, "trend": "+3,0%", "faktor": "23-28"},
    "hamburg-wandsbek": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 13.5, "trend": "+2,5%", "faktor": "20-25"},
    "hamburg-harburg": {"kauf_von": 3000, "kauf_bis": 4000, "miete": 12.0, "trend": "+3,0%", "faktor": "18-24"},
    "hamburg-bergedorf": {"kauf_von": 2800, "kauf_bis": 3800, "miete": 11.5, "trend": "+3,0%", "faktor": "17-23"},
    "hamburg-horn": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.5, "trend": "+3,0%", "faktor": "19-25"},
    "hamburg-billstedt": {"kauf_von": 2800, "kauf_bis": 3800, "miete": 11.5, "trend": "+3,5%", "faktor": "17-23"},
    "hamburg-st. georg": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,0%", "faktor": "25-30"},
    "hamburg-st.georg": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,0%", "faktor": "25-30"},
    "hamburg-hafencity": {"kauf_von": 7000, "kauf_bis": 9000, "miete": 20.0, "trend": "+2,0%", "faktor": "28-35"},
    "hamburg-blankenese": {"kauf_von": 6500, "kauf_bis": 9000, "miete": 18.0, "trend": "+1,5%", "faktor": "28-35"},
    "hamburg-stellingen": {"kauf_von": 4000, "kauf_bis": 5000, "miete": 14.0, "trend": "+2,5%", "faktor": "22-27"},
    "hamburg-rahlstedt": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 12.5, "trend": "+2,5%", "faktor": "20-25"},
    "hamburg-meiendorf": {"kauf_von": 3500, "kauf_bis": 4300, "miete": 13.0, "trend": "+2,5%", "faktor": "20-25"},
    "hamburg-volksdorf": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.0, "trend": "+2,0%", "faktor": "23-29"},
    "hamburg-bramfeld": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 13.0, "trend": "+2,5%", "faktor": "20-25"},
    "hamburg-sasel": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.0, "trend": "+2,0%", "faktor": "23-29"},
    "hamburg-poppenbüttel": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.0, "trend": "+2,0%", "faktor": "23-29"},
    "hamburg-poppenbuettel": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.0, "trend": "+2,0%", "faktor": "23-29"},
    "hamburg-farmsen": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 12.5, "trend": "+2,5%", "faktor": "20-25"},
    "hamburg-niendorf": {"kauf_von": 4200, "kauf_bis": 5200, "miete": 14.0, "trend": "+2,0%", "faktor": "22-28"},
    "hamburg-eidelstedt": {"kauf_von": 3800, "kauf_bis": 4800, "miete": 13.0, "trend": "+2,5%", "faktor": "21-27"},
    "hamburg-lokstedt": {"kauf_von": 4500, "kauf_bis": 5500, "miete": 14.5, "trend": "+2,0%", "faktor": "23-28"},
    "hamburg-othmarschen": {"kauf_von": 6000, "kauf_bis": 8000, "miete": 17.0, "trend": "+1,5%", "faktor": "27-33"},
    "hamburg-nienstedten": {"kauf_von": 6000, "kauf_bis": 8000, "miete": 17.0, "trend": "+1,5%", "faktor": "27-33"},
    "hamburg-gross flottbek": {"kauf_von": 5800, "kauf_bis": 7500, "miete": 16.5, "trend": "+1,5%", "faktor": "26-32"},
    "hamburg-wilhelmsburg": {"kauf_von": 3000, "kauf_bis": 4000, "miete": 11.5, "trend": "+3,5%", "faktor": "18-24"},
    "hamburg-fuhlsbüttel": {"kauf_von": 4500, "kauf_bis": 5500, "miete": 14.5, "trend": "+2,0%", "faktor": "23-28"},
    "hamburg-fuhlsbuettel": {"kauf_von": 4500, "kauf_bis": 5500, "miete": 14.5, "trend": "+2,0%", "faktor": "23-28"},
    "hamburg-ohlsdorf": {"kauf_von": 4200, "kauf_bis": 5200, "miete": 14.0, "trend": "+2,0%", "faktor": "22-28"},
    "hamburg-wellingsbüttel": {"kauf_von": 4800, "kauf_bis": 6000, "miete": 14.5, "trend": "+2,0%", "faktor": "24-30"},
    "hamburg-wellingsbuettel": {"kauf_von": 4800, "kauf_bis": 6000, "miete": 14.5, "trend": "+2,0%", "faktor": "24-30"},
    "hamburg-bergstedt": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.0, "trend": "+2,0%", "faktor": "23-29"},
    "hamburg-duvenstedt": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.0, "trend": "+2,0%", "faktor": "23-29"},
    "hamburg-schnelsen": {"kauf_von": 3800, "kauf_bis": 4800, "miete": 13.0, "trend": "+2,5%", "faktor": "21-27"},
    "hamburg-lurup": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.5, "trend": "+3,0%", "faktor": "19-25"},
    "hamburg-osdorf": {"kauf_von": 4000, "kauf_bis": 5000, "miete": 13.5, "trend": "+2,5%", "faktor": "22-27"},
    "hamburg-iserbrook": {"kauf_von": 4500, "kauf_bis": 5500, "miete": 14.0, "trend": "+2,0%", "faktor": "23-28"},
    "hamburg-bahrenfeld": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.0, "trend": "+2,5%", "faktor": "23-29"},
    "hamburg-eilbek": {"kauf_von": 4800, "kauf_bis": 6000, "miete": 15.0, "trend": "+2,5%", "faktor": "23-29"},
    "hamburg-dulsberg": {"kauf_von": 3800, "kauf_bis": 4800, "miete": 13.5, "trend": "+3,0%", "faktor": "21-27"},
    "hamburg-hamm": {"kauf_von": 3800, "kauf_bis": 4800, "miete": 13.5, "trend": "+3,0%", "faktor": "21-27"},
    "hamburg-hammerbrook": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+2,5%", "faktor": "22-28"},
    "hamburg-mitte": {"kauf_von": 5500, "kauf_bis": 7500, "miete": 17.0, "trend": "+2,0%", "faktor": "25-31"},
    "hamburg-neustadt": {"kauf_von": 5800, "kauf_bis": 7500, "miete": 17.0, "trend": "+2,0%", "faktor": "26-32"},
    "hamburg-rotherbaum": {"kauf_von": 6500, "kauf_bis": 8500, "miete": 18.5, "trend": "+2,0%", "faktor": "27-33"},
    "hamburg-harvestehude": {"kauf_von": 7000, "kauf_bis": 9000, "miete": 19.0, "trend": "+2,0%", "faktor": "28-35"},
    "hamburg-hoheluft": {"kauf_von": 6500, "kauf_bis": 8000, "miete": 18.0, "trend": "+2,0%", "faktor": "27-33"},
    "hamburg-st. pauli": {"kauf_von": 5200, "kauf_bis": 6800, "miete": 16.0, "trend": "+2,5%", "faktor": "24-30"},
    "hamburg-karolinenviertel": {"kauf_von": 5200, "kauf_bis": 6800, "miete": 16.0, "trend": "+2,5%", "faktor": "24-30"},
    "hamburg-veddel": {"kauf_von": 2800, "kauf_bis": 3800, "miete": 11.0, "trend": "+3,0%", "faktor": "18-23"},
    "hamburg-wandsbek": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 13.5, "trend": "+2,5%", "faktor": "20-25"},
    "hamburg-kirchwerder": {"kauf_von": 2800, "kauf_bis": 3800, "miete": 11.0, "trend": "+2,5%", "faktor": "18-24"},
    # Berlin Stadtteile (Neuvermietungspreise 2026)
    "berlin-mitte": {"kauf_von": 6500, "kauf_bis": 8500, "miete": 18.5, "trend": "+3,5%", "faktor": "28-35"},
    "berlin-prenzlauer berg": {"kauf_von": 6000, "kauf_bis": 7500, "miete": 17.5, "trend": "+3,0%", "faktor": "27-33"},
    "berlin-friedrichshain": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+3,5%", "faktor": "25-31"},
    "berlin-kreuzberg": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+3,0%", "faktor": "25-31"},
    "berlin-charlottenburg": {"kauf_von": 6000, "kauf_bis": 7500, "miete": 17.0, "trend": "+2,5%", "faktor": "27-33"},
    "berlin-wilmersdorf": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 16.5, "trend": "+2,5%", "faktor": "26-32"},
    "berlin-schöneberg": {"kauf_von": 5200, "kauf_bis": 6500, "miete": 16.0, "trend": "+3,0%", "faktor": "25-30"},
    "berlin-schoeneberg": {"kauf_von": 5200, "kauf_bis": 6500, "miete": 16.0, "trend": "+3,0%", "faktor": "25-30"},
    "berlin-steglitz": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.5, "trend": "+2,5%", "faktor": "23-29"},
    "berlin-zehlendorf": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.0, "trend": "+2,0%", "faktor": "25-32"},
    "berlin-tempelhof": {"kauf_von": 4200, "kauf_bis": 5500, "miete": 14.0, "trend": "+3,0%", "faktor": "22-28"},
    "berlin-neukölln": {"kauf_von": 4000, "kauf_bis": 5200, "miete": 14.5, "trend": "+4,0%", "faktor": "21-27"},
    "berlin-neukoelln": {"kauf_von": 4000, "kauf_bis": 5200, "miete": 14.5, "trend": "+4,0%", "faktor": "21-27"},
    "berlin-wedding": {"kauf_von": 3800, "kauf_bis": 5000, "miete": 13.5, "trend": "+4,0%", "faktor": "20-26"},
    "berlin-moabit": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+3,5%", "faktor": "23-28"},
    "berlin-pankow": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.5, "trend": "+3,0%", "faktor": "23-29"},
    "berlin-lichtenberg": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 12.5, "trend": "+4,0%", "faktor": "20-26"},
    "berlin-treptow": {"kauf_von": 4000, "kauf_bis": 5200, "miete": 14.0, "trend": "+3,5%", "faktor": "21-27"},
    "berlin-köpenick": {"kauf_von": 3800, "kauf_bis": 5000, "miete": 13.0, "trend": "+3,0%", "faktor": "21-27"},
    "berlin-koepenick": {"kauf_von": 3800, "kauf_bis": 5000, "miete": 13.0, "trend": "+3,0%", "faktor": "21-27"},
    "berlin-spandau": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.0, "trend": "+3,0%", "faktor": "19-25"},
    "berlin-reinickendorf": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.0, "trend": "+2,5%", "faktor": "19-25"},
    "berlin-marzahn": {"kauf_von": 2800, "kauf_bis": 3600, "miete": 11.0, "trend": "+4,0%", "faktor": "17-23"},
    "berlin-hellersdorf": {"kauf_von": 2600, "kauf_bis": 3400, "miete": 10.5, "trend": "+4,5%", "faktor": "17-23"},
    "berlin-grunewald": {"kauf_von": 7000, "kauf_bis": 10000, "miete": 18.0, "trend": "+2,0%", "faktor": "30-40"},
    "berlin-dahlem": {"kauf_von": 6500, "kauf_bis": 9000, "miete": 17.0, "trend": "+2,0%", "faktor": "29-38"},
    # München Stadtteile (Neuvermietungspreise 2026)
    "muenchen-schwabing": {"kauf_von": 10000, "kauf_bis": 13000, "miete": 23.0, "trend": "+2,5%", "faktor": "34-42"},
    "münchen-schwabing": {"kauf_von": 10000, "kauf_bis": 13000, "miete": 23.0, "trend": "+2,5%", "faktor": "34-42"},
    "muenchen-maxvorstadt": {"kauf_von": 10000, "kauf_bis": 13000, "miete": 23.0, "trend": "+2,5%", "faktor": "34-42"},
    "münchen-maxvorstadt": {"kauf_von": 10000, "kauf_bis": 13000, "miete": 23.0, "trend": "+2,5%", "faktor": "34-42"},
    "muenchen-bogenhausen": {"kauf_von": 9500, "kauf_bis": 13000, "miete": 22.0, "trend": "+2,0%", "faktor": "33-42"},
    "münchen-bogenhausen": {"kauf_von": 9500, "kauf_bis": 13000, "miete": 22.0, "trend": "+2,0%", "faktor": "33-42"},
    "muenchen-haidhausen": {"kauf_von": 9000, "kauf_bis": 11500, "miete": 21.5, "trend": "+2,5%", "faktor": "32-40"},
    "münchen-haidhausen": {"kauf_von": 9000, "kauf_bis": 11500, "miete": 21.5, "trend": "+2,5%", "faktor": "32-40"},
    "muenchen-sendling": {"kauf_von": 8000, "kauf_bis": 10000, "miete": 20.0, "trend": "+2,5%", "faktor": "30-38"},
    "münchen-sendling": {"kauf_von": 8000, "kauf_bis": 10000, "miete": 20.0, "trend": "+2,5%", "faktor": "30-38"},
    "muenchen-giesing": {"kauf_von": 7500, "kauf_bis": 9500, "miete": 19.0, "trend": "+3,0%", "faktor": "29-37"},
    "münchen-giesing": {"kauf_von": 7500, "kauf_bis": 9500, "miete": 19.0, "trend": "+3,0%", "faktor": "29-37"},
    "muenchen-laim": {"kauf_von": 8000, "kauf_bis": 10000, "miete": 19.5, "trend": "+2,5%", "faktor": "30-38"},
    "münchen-laim": {"kauf_von": 8000, "kauf_bis": 10000, "miete": 19.5, "trend": "+2,5%", "faktor": "30-38"},
    "muenchen-neuhausen": {"kauf_von": 8500, "kauf_bis": 11000, "miete": 20.5, "trend": "+2,5%", "faktor": "31-40"},
    "münchen-neuhausen": {"kauf_von": 8500, "kauf_bis": 11000, "miete": 20.5, "trend": "+2,5%", "faktor": "31-40"},
    "muenchen-nymphenburg": {"kauf_von": 9000, "kauf_bis": 12000, "miete": 21.0, "trend": "+2,0%", "faktor": "32-42"},
    "münchen-nymphenburg": {"kauf_von": 9000, "kauf_bis": 12000, "miete": 21.0, "trend": "+2,0%", "faktor": "32-42"},
    "muenchen-pasing": {"kauf_von": 7500, "kauf_bis": 9500, "miete": 18.5, "trend": "+2,5%", "faktor": "29-37"},
    "münchen-pasing": {"kauf_von": 7500, "kauf_bis": 9500, "miete": 18.5, "trend": "+2,5%", "faktor": "29-37"},
    "muenchen-trudering": {"kauf_von": 7000, "kauf_bis": 9000, "miete": 18.0, "trend": "+3,0%", "faktor": "28-36"},
    "münchen-trudering": {"kauf_von": 7000, "kauf_bis": 9000, "miete": 18.0, "trend": "+3,0%", "faktor": "28-36"},
    "muenchen-milbertshofen": {"kauf_von": 7000, "kauf_bis": 8500, "miete": 18.0, "trend": "+3,0%", "faktor": "28-35"},
    "münchen-milbertshofen": {"kauf_von": 7000, "kauf_bis": 8500, "miete": 18.0, "trend": "+3,0%", "faktor": "28-35"},
    "muenchen-riem": {"kauf_von": 7000, "kauf_bis": 8500, "miete": 18.0, "trend": "+3,0%", "faktor": "28-35"},
    "münchen-riem": {"kauf_von": 7000, "kauf_bis": 8500, "miete": 18.0, "trend": "+3,0%", "faktor": "28-35"},
    # Frankfurt Stadtteile (Neuvermietungspreise 2026)
    "frankfurt-westend": {"kauf_von": 7000, "kauf_bis": 9000, "miete": 20.0, "trend": "+2,0%", "faktor": "28-35"},
    "frankfurt-nordend": {"kauf_von": 6000, "kauf_bis": 7500, "miete": 18.5, "trend": "+2,0%", "faktor": "25-31"},
    "frankfurt-sachsenhausen": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 18.0, "trend": "+2,0%", "faktor": "24-30"},
    "frankfurt-bornheim": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 17.0, "trend": "+2,5%", "faktor": "23-28"},
    "frankfurt-bockenheim": {"kauf_von": 4800, "kauf_bis": 6200, "miete": 16.5, "trend": "+2,5%", "faktor": "22-28"},
    "frankfurt-ostend": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 18.0, "trend": "+3,0%", "faktor": "24-30"},
    "frankfurt-gallus": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 16.0, "trend": "+3,5%", "faktor": "21-27"},
    "frankfurt-höchst": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 13.5, "trend": "+3,0%", "faktor": "19-24"},
    "frankfurt-hoechst": {"kauf_von": 3500, "kauf_bis": 4500, "miete": 13.5, "trend": "+3,0%", "faktor": "19-24"},
    "frankfurt-niederrad": {"kauf_von": 4000, "kauf_bis": 5200, "miete": 15.0, "trend": "+2,5%", "faktor": "20-25"},
    "frankfurt-fechenheim": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 13.0, "trend": "+3,5%", "faktor": "18-23"},
    "frankfurt-bergen-enkheim": {"kauf_von": 4000, "kauf_bis": 5000, "miete": 14.5, "trend": "+2,5%", "faktor": "20-25"},
    "frankfurt-riedberg": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,0%", "faktor": "24-30"},
    "frankfurt-europaviertel": {"kauf_von": 6500, "kauf_bis": 8500, "miete": 19.5, "trend": "+2,0%", "faktor": "26-33"},
    # Köln Stadtteile (Neuvermietungspreise 2026)
    "köln-lindenthal": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,5%", "faktor": "25-31"},
    "koeln-lindenthal": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,5%", "faktor": "25-31"},
    "köln-ehrenfeld": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+3,0%", "faktor": "22-28"},
    "koeln-ehrenfeld": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+3,0%", "faktor": "22-28"},
    "köln-nippes": {"kauf_von": 4200, "kauf_bis": 5500, "miete": 15.0, "trend": "+3,0%", "faktor": "21-27"},
    "koeln-nippes": {"kauf_von": 4200, "kauf_bis": 5500, "miete": 15.0, "trend": "+3,0%", "faktor": "21-27"},
    "köln-sülz": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 16.0, "trend": "+2,5%", "faktor": "24-30"},
    "koeln-suelz": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 16.0, "trend": "+2,5%", "faktor": "24-30"},
    "köln-deutz": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+3,0%", "faktor": "22-28"},
    "koeln-deutz": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+3,0%", "faktor": "22-28"},
    "köln-mülheim": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.5, "trend": "+3,5%", "faktor": "19-24"},
    "koeln-muelheim": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.5, "trend": "+3,5%", "faktor": "19-24"},
    "köln-kalk": {"kauf_von": 2800, "kauf_bis": 3800, "miete": 12.0, "trend": "+4,0%", "faktor": "17-23"},
    "koeln-kalk": {"kauf_von": 2800, "kauf_bis": 3800, "miete": 12.0, "trend": "+4,0%", "faktor": "17-23"},
    "köln-porz": {"kauf_von": 2800, "kauf_bis": 3600, "miete": 11.5, "trend": "+3,0%", "faktor": "17-22"},
    "koeln-porz": {"kauf_von": 2800, "kauf_bis": 3600, "miete": 11.5, "trend": "+3,0%", "faktor": "17-22"},
    "köln-rodenkirchen": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 16.0, "trend": "+2,0%", "faktor": "24-30"},
    "koeln-rodenkirchen": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 16.0, "trend": "+2,0%", "faktor": "24-30"},
    # Stuttgart Stadtteile (Neuvermietungspreise 2026)
    "stuttgart-mitte": {"kauf_von": 6000, "kauf_bis": 7500, "miete": 18.5, "trend": "+2,0%", "faktor": "25-31"},
    "stuttgart-west": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.5, "trend": "+2,0%", "faktor": "24-30"},
    "stuttgart-süd": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 17.0, "trend": "+2,5%", "faktor": "23-29"},
    "stuttgart-sued": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 17.0, "trend": "+2,5%", "faktor": "23-29"},
    "stuttgart-nord": {"kauf_von": 5200, "kauf_bis": 6500, "miete": 17.0, "trend": "+2,0%", "faktor": "23-29"},
    "stuttgart-ost": {"kauf_von": 4800, "kauf_bis": 6200, "miete": 16.5, "trend": "+2,5%", "faktor": "22-28"},
    "stuttgart-degerloch": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 17.0, "trend": "+2,0%", "faktor": "25-30"},
    "stuttgart-vaihingen": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.5, "trend": "+2,5%", "faktor": "22-28"},
    "stuttgart-bad cannstatt": {"kauf_von": 4200, "kauf_bis": 5500, "miete": 15.0, "trend": "+3,0%", "faktor": "21-27"},
    "stuttgart-feuerbach": {"kauf_von": 4200, "kauf_bis": 5500, "miete": 15.0, "trend": "+2,5%", "faktor": "21-27"},
    "stuttgart-zuffenhausen": {"kauf_von": 3800, "kauf_bis": 5000, "miete": 14.0, "trend": "+3,0%", "faktor": "20-26"},
    # Düsseldorf Stadtteile (Neuvermietungspreise 2026)
    "düsseldorf-oberkassel": {"kauf_von": 6000, "kauf_bis": 8000, "miete": 17.0, "trend": "+2,0%", "faktor": "27-35"},
    "duesseldorf-oberkassel": {"kauf_von": 6000, "kauf_bis": 8000, "miete": 17.0, "trend": "+2,0%", "faktor": "27-35"},
    "düsseldorf-pempelfort": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.5, "trend": "+2,5%", "faktor": "24-31"},
    "duesseldorf-pempelfort": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.5, "trend": "+2,5%", "faktor": "24-31"},
    "düsseldorf-bilk": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.5, "trend": "+3,0%", "faktor": "23-29"},
    "duesseldorf-bilk": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.5, "trend": "+3,0%", "faktor": "23-29"},
    "düsseldorf-unterbilk": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.5, "trend": "+2,5%", "faktor": "24-31"},
    "duesseldorf-unterbilk": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.5, "trend": "+2,5%", "faktor": "24-31"},
    "düsseldorf-flingern": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.0, "trend": "+3,0%", "faktor": "23-29"},
    "duesseldorf-flingern": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 15.0, "trend": "+3,0%", "faktor": "23-29"},
    "düsseldorf-derendorf": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.5, "trend": "+2,5%", "faktor": "23-29"},
    "duesseldorf-derendorf": {"kauf_von": 4500, "kauf_bis": 5800, "miete": 14.5, "trend": "+2,5%", "faktor": "23-29"},
    "düsseldorf-golzheim": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 16.0, "trend": "+2,0%", "faktor": "26-33"},
    "duesseldorf-golzheim": {"kauf_von": 5500, "kauf_bis": 7000, "miete": 16.0, "trend": "+2,0%", "faktor": "26-33"},
    "düsseldorf-kaiserswerth": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.0, "trend": "+2,0%", "faktor": "25-32"},
    "duesseldorf-kaiserswerth": {"kauf_von": 5000, "kauf_bis": 6500, "miete": 15.0, "trend": "+2,0%", "faktor": "25-32"},
    "düsseldorf-eller": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.0, "trend": "+3,0%", "faktor": "19-25"},
    "duesseldorf-eller": {"kauf_von": 3200, "kauf_bis": 4200, "miete": 12.0, "trend": "+3,0%", "faktor": "19-25"},
    "düsseldorf-garath": {"kauf_von": 2500, "kauf_bis": 3500, "miete": 10.5, "trend": "+3,5%", "faktor": "17-23"},
    "duesseldorf-garath": {"kauf_von": 2500, "kauf_bis": 3500, "miete": 10.5, "trend": "+3,5%", "faktor": "17-23"},
    "frankfurt": {"kauf_von": 5400, "kauf_bis": 6300, "miete": 17.0, "trend": "+1,8%", "faktor": "27-32"},
    "koeln": {"kauf_von": 4500, "kauf_bis": 5250, "miete": 13.9, "trend": "+4,5%", "faktor": "27-31"},
    "köln": {"kauf_von": 4500, "kauf_bis": 5250, "miete": 13.9, "trend": "+4,5%", "faktor": "27-31"},
    "stuttgart": {"kauf_von": 4300, "kauf_bis": 4750, "miete": 15.2, "trend": "+0,7%", "faktor": "24-28"},
    "duesseldorf": {"kauf_von": 4500, "kauf_bis": 5200, "miete": 14.2, "trend": "+2,7%", "faktor": "27-31"},
    "düsseldorf": {"kauf_von": 4500, "kauf_bis": 5200, "miete": 14.2, "trend": "+2,7%", "faktor": "27-31"},
    "leipzig": {"kauf_von": 2600, "kauf_bis": 3150, "miete": 9.7, "trend": "+5,0%", "faktor": "21-26"},
    "dresden": {"kauf_von": 2800, "kauf_bis": 3100, "miete": 9.6, "trend": "+3,4%", "faktor": "22-26"},
    "hannover": {"kauf_von": 3300, "kauf_bis": 3700, "miete": 11.3, "trend": "+2,5%", "faktor": "24-28"},
    "nuernberg": {"kauf_von": 3500, "kauf_bis": 3800, "miete": 12.2, "trend": "+3,0%", "faktor": "23-27"},
    "nürnberg": {"kauf_von": 3500, "kauf_bis": 3800, "miete": 12.2, "trend": "+3,0%", "faktor": "23-27"},
    "bremen": {"kauf_von": 2800, "kauf_bis": 3100, "miete": 10.5, "trend": "+3,4%", "faktor": "21-24"},
    "essen": {"kauf_von": 2600, "kauf_bis": 2900, "miete": 9.1, "trend": "+2,7%", "faktor": "22-26"},
    "dortmund": {"kauf_von": 2400, "kauf_bis": 2700, "miete": 8.3, "trend": "+2,1%", "faktor": "22-26"},
    "chemnitz": {"kauf_von": 1200, "kauf_bis": 2200, "miete": 6.8, "trend": "+1,6%", "faktor": "14-18"},
}

# PLZ-zu-Stadtteil Mapping fuer automatische Aufloesung
PLZ_STADTTEIL_MAP = {
    # Hamburg
    "20095": ("hamburg", "mitte"), "20097": ("hamburg", "hammerbrook"), "20099": ("hamburg", "st. georg"),
    "20144": ("hamburg", "eimsbüttel"), "20146": ("hamburg", "eimsbüttel"), "20148": ("hamburg", "rotherbaum"),
    "20149": ("hamburg", "harvestehude"), "20249": ("hamburg", "eppendorf"), "20251": ("hamburg", "eppendorf"),
    "20253": ("hamburg", "hoheluft"), "20255": ("hamburg", "eimsbüttel"), "20257": ("hamburg", "eimsbüttel"),
    "20259": ("hamburg", "eimsbüttel"), "20357": ("hamburg", "karolinenviertel"), "20359": ("hamburg", "st. pauli"),
    "20457": ("hamburg", "hafencity"), "20459": ("hamburg", "neustadt"), "20535": ("hamburg", "hamm"),
    "20537": ("hamburg", "hamm"), "20539": ("hamburg", "veddel"), "22041": ("hamburg", "wandsbek"),
    "22043": ("hamburg", "wandsbek"), "22049": ("hamburg", "dulsberg"), "22081": ("hamburg", "barmbek"),
    "22083": ("hamburg", "barmbek"), "22085": ("hamburg", "uhlenhorst"), "22087": ("hamburg", "uhlenhorst"),
    "22089": ("hamburg", "eilbek"), "22111": ("hamburg", "horn"), "22113": ("hamburg", "billstedt"),
    "22115": ("hamburg", "billstedt"), "22117": ("hamburg", "billstedt"), "22119": ("hamburg", "horn"),
    "22143": ("hamburg", "rahlstedt"), "22145": ("hamburg", "rahlstedt"), "22147": ("hamburg", "rahlstedt"),
    "22149": ("hamburg", "meiendorf"),
    "22359": ("hamburg", "volksdorf"), "22395": ("hamburg", "bergstedt"),
    "22159": ("hamburg", "farmsen"), "22175": ("hamburg", "bramfeld"), "22177": ("hamburg", "bramfeld"),
    "22297": ("hamburg", "winterhude"), "22299": ("hamburg", "winterhude"), "22301": ("hamburg", "winterhude"),
    "22303": ("hamburg", "winterhude"), "22305": ("hamburg", "barmbek"), "22307": ("hamburg", "barmbek"),
    "22335": ("hamburg", "fuhlsbüttel"), "22337": ("hamburg", "ohlsdorf"),
    "22391": ("hamburg", "wellingsbüttel"), "22393": ("hamburg", "sasel"),
    "22395": ("hamburg", "bergstedt"), "22397": ("hamburg", "duvenstedt"),
    "22399": ("hamburg", "poppenbüttel"), "22453": ("hamburg", "niendorf"),
    "22455": ("hamburg", "niendorf"), "22457": ("hamburg", "schnelsen"),
    "22459": ("hamburg", "niendorf"), "22523": ("hamburg", "eidelstedt"),
    "22525": ("hamburg", "stellingen"), "22527": ("hamburg", "stellingen"),
    "22529": ("hamburg", "lokstedt"), "22547": ("hamburg", "lurup"),
    "22549": ("hamburg", "osdorf"), "22559": ("hamburg", "blankenese"),
    "22587": ("hamburg", "blankenese"), "22589": ("hamburg", "iserbrook"),
    "22605": ("hamburg", "othmarschen"), "22607": ("hamburg", "gross flottbek"),
    "22609": ("hamburg", "nienstedten"), "22761": ("hamburg", "bahrenfeld"),
    "22763": ("hamburg", "ottensen"), "22765": ("hamburg", "ottensen"),
    "22767": ("hamburg", "altona"), "22769": ("hamburg", "altona"),
    "21029": ("hamburg", "bergedorf"), "21031": ("hamburg", "bergedorf"),
    "21033": ("hamburg", "bergedorf"), "21035": ("hamburg", "bergedorf"),
    "21037": ("hamburg", "kirchwerder"), "21039": ("hamburg", "bergedorf"),
    "21073": ("hamburg", "harburg"), "21075": ("hamburg", "harburg"),
    "21077": ("hamburg", "harburg"), "21079": ("hamburg", "harburg"),
    "21107": ("hamburg", "wilhelmsburg"), "21109": ("hamburg", "wilhelmsburg"),
    # Berlin
    "10115": ("berlin", "mitte"), "10117": ("berlin", "mitte"), "10119": ("berlin", "mitte"),
    "10178": ("berlin", "mitte"), "10179": ("berlin", "mitte"),
    "10243": ("berlin", "friedrichshain"), "10245": ("berlin", "friedrichshain"),
    "10247": ("berlin", "friedrichshain"), "10249": ("berlin", "friedrichshain"),
    "10317": ("berlin", "lichtenberg"), "10318": ("berlin", "lichtenberg"),
    "10319": ("berlin", "lichtenberg"),
    "10367": ("berlin", "lichtenberg"), "10369": ("berlin", "lichtenberg"),
    "10405": ("berlin", "prenzlauer berg"), "10407": ("berlin", "prenzlauer berg"),
    "10409": ("berlin", "prenzlauer berg"), "10435": ("berlin", "prenzlauer berg"),
    "10437": ("berlin", "prenzlauer berg"), "10439": ("berlin", "prenzlauer berg"),
    "10551": ("berlin", "moabit"), "10553": ("berlin", "moabit"),
    "10555": ("berlin", "moabit"), "10557": ("berlin", "moabit"),
    "10559": ("berlin", "moabit"),
    "10585": ("berlin", "charlottenburg"), "10587": ("berlin", "charlottenburg"),
    "10589": ("berlin", "charlottenburg"), "10623": ("berlin", "charlottenburg"),
    "10625": ("berlin", "charlottenburg"), "10627": ("berlin", "charlottenburg"),
    "10629": ("berlin", "charlottenburg"),
    "10707": ("berlin", "wilmersdorf"), "10709": ("berlin", "wilmersdorf"),
    "10711": ("berlin", "wilmersdorf"), "10713": ("berlin", "wilmersdorf"),
    "10715": ("berlin", "wilmersdorf"), "10717": ("berlin", "wilmersdorf"),
    "10719": ("berlin", "charlottenburg"),
    "10777": ("berlin", "schöneberg"), "10779": ("berlin", "schöneberg"),
    "10781": ("berlin", "schöneberg"), "10783": ("berlin", "schöneberg"),
    "10785": ("berlin", "kreuzberg"), "10787": ("berlin", "schöneberg"),
    "10789": ("berlin", "schöneberg"),
    "10961": ("berlin", "kreuzberg"), "10963": ("berlin", "kreuzberg"),
    "10965": ("berlin", "kreuzberg"), "10967": ("berlin", "kreuzberg"),
    "10969": ("berlin", "kreuzberg"), "10997": ("berlin", "kreuzberg"),
    "10999": ("berlin", "kreuzberg"),
    "12043": ("berlin", "neukölln"), "12045": ("berlin", "neukölln"),
    "12047": ("berlin", "neukölln"), "12049": ("berlin", "neukölln"),
    "12051": ("berlin", "neukölln"), "12053": ("berlin", "neukölln"),
    "12055": ("berlin", "neukölln"), "12057": ("berlin", "neukölln"),
    "12059": ("berlin", "neukölln"),
    "12099": ("berlin", "tempelhof"), "12101": ("berlin", "tempelhof"),
    "12103": ("berlin", "tempelhof"), "12105": ("berlin", "tempelhof"),
    "12107": ("berlin", "tempelhof"), "12109": ("berlin", "tempelhof"),
    "12157": ("berlin", "steglitz"), "12159": ("berlin", "steglitz"),
    "12161": ("berlin", "steglitz"), "12163": ("berlin", "steglitz"),
    "12165": ("berlin", "steglitz"), "12167": ("berlin", "steglitz"),
    "12169": ("berlin", "steglitz"),
    "12203": ("berlin", "steglitz"), "12205": ("berlin", "zehlendorf"),
    "12207": ("berlin", "zehlendorf"), "12209": ("berlin", "zehlendorf"),
    "12247": ("berlin", "steglitz"),
    "12277": ("berlin", "tempelhof"),
    "12347": ("berlin", "neukölln"), "12349": ("berlin", "neukölln"),
    "12351": ("berlin", "neukölln"), "12353": ("berlin", "neukölln"),
    "12435": ("berlin", "treptow"), "12437": ("berlin", "treptow"),
    "12439": ("berlin", "treptow"),
    "12459": ("berlin", "treptow"),
    "12487": ("berlin", "treptow"),
    "12489": ("berlin", "treptow"),
    "12524": ("berlin", "treptow"),
    "12527": ("berlin", "köpenick"), "12555": ("berlin", "köpenick"),
    "12557": ("berlin", "köpenick"), "12559": ("berlin", "köpenick"),
    "12587": ("berlin", "köpenick"), "12589": ("berlin", "köpenick"),
    "12619": ("berlin", "hellersdorf"), "12621": ("berlin", "hellersdorf"),
    "12623": ("berlin", "hellersdorf"), "12627": ("berlin", "hellersdorf"),
    "12629": ("berlin", "hellersdorf"),
    "12679": ("berlin", "marzahn"), "12681": ("berlin", "marzahn"),
    "12683": ("berlin", "marzahn"), "12685": ("berlin", "marzahn"),
    "12687": ("berlin", "marzahn"), "12689": ("berlin", "marzahn"),
    "13051": ("berlin", "pankow"), "13053": ("berlin", "pankow"),
    "13055": ("berlin", "pankow"), "13057": ("berlin", "pankow"),
    "13059": ("berlin", "pankow"),
    "13086": ("berlin", "pankow"), "13088": ("berlin", "pankow"),
    "13089": ("berlin", "pankow"),
    "13347": ("berlin", "wedding"), "13349": ("berlin", "wedding"),
    "13351": ("berlin", "wedding"), "13353": ("berlin", "wedding"),
    "13355": ("berlin", "wedding"), "13357": ("berlin", "wedding"),
    "13359": ("berlin", "wedding"),
    "13403": ("berlin", "reinickendorf"), "13405": ("berlin", "reinickendorf"),
    "13407": ("berlin", "reinickendorf"), "13409": ("berlin", "reinickendorf"),
    "13435": ("berlin", "reinickendorf"),
    "13503": ("berlin", "reinickendorf"), "13505": ("berlin", "reinickendorf"),
    "13507": ("berlin", "reinickendorf"), "13509": ("berlin", "reinickendorf"),
    "13581": ("berlin", "spandau"), "13583": ("berlin", "spandau"),
    "13585": ("berlin", "spandau"), "13587": ("berlin", "spandau"),
    "13589": ("berlin", "spandau"),
    "14050": ("berlin", "charlottenburg"), "14052": ("berlin", "charlottenburg"),
    "14053": ("berlin", "charlottenburg"), "14055": ("berlin", "charlottenburg"),
    "14057": ("berlin", "charlottenburg"),
    "14163": ("berlin", "zehlendorf"), "14165": ("berlin", "zehlendorf"),
    "14167": ("berlin", "zehlendorf"), "14169": ("berlin", "zehlendorf"),
    "14193": ("berlin", "grunewald"), "14195": ("berlin", "dahlem"),
    "14197": ("berlin", "wilmersdorf"), "14199": ("berlin", "wilmersdorf"),
    # München
    "80331": ("muenchen", "altstadt"), "80333": ("muenchen", "maxvorstadt"),
    "80335": ("muenchen", "maxvorstadt"), "80336": ("muenchen", "sendling"),
    "80337": ("muenchen", "sendling"), "80339": ("muenchen", "laim"),
    "80469": ("muenchen", "giesing"), "80538": ("muenchen", "bogenhausen"),
    "80539": ("muenchen", "maxvorstadt"), "80634": ("muenchen", "neuhausen"),
    "80636": ("muenchen", "neuhausen"), "80637": ("muenchen", "nymphenburg"),
    "80638": ("muenchen", "nymphenburg"), "80639": ("muenchen", "nymphenburg"),
    "80686": ("muenchen", "laim"), "80687": ("muenchen", "laim"),
    "80689": ("muenchen", "pasing"), "80796": ("muenchen", "schwabing"),
    "80797": ("muenchen", "schwabing"), "80798": ("muenchen", "maxvorstadt"),
    "80799": ("muenchen", "maxvorstadt"), "80801": ("muenchen", "schwabing"),
    "80802": ("muenchen", "schwabing"), "80803": ("muenchen", "schwabing"),
    "80804": ("muenchen", "milbertshofen"), "80805": ("muenchen", "milbertshofen"),
    "80807": ("muenchen", "milbertshofen"), "80809": ("muenchen", "milbertshofen"),
    "80933": ("muenchen", "feldmoching"), "80935": ("muenchen", "hasenbergl"),
    "80937": ("muenchen", "hasenbergl"), "80939": ("muenchen", "freimann"),
    "80992": ("muenchen", "moosach"), "80993": ("muenchen", "moosach"),
    "80995": ("muenchen", "feldmoching"), "80997": ("muenchen", "allach"),
    "80999": ("muenchen", "allach"),
    "81241": ("muenchen", "pasing"), "81243": ("muenchen", "pasing"),
    "81245": ("muenchen", "pasing"), "81247": ("muenchen", "obermenzing"),
    "81249": ("muenchen", "aubing"),
    "81369": ("muenchen", "sendling"), "81371": ("muenchen", "sendling"),
    "81373": ("muenchen", "sendling"), "81375": ("muenchen", "hadern"),
    "81377": ("muenchen", "hadern"),
    "81475": ("muenchen", "solln"), "81477": ("muenchen", "solln"),
    "81479": ("muenchen", "solln"),
    "81539": ("muenchen", "giesing"), "81541": ("muenchen", "giesing"),
    "81543": ("muenchen", "giesing"), "81545": ("muenchen", "harlaching"),
    "81547": ("muenchen", "harlaching"),
    "81667": ("muenchen", "haidhausen"), "81669": ("muenchen", "haidhausen"),
    "81671": ("muenchen", "riem"), "81673": ("muenchen", "riem"),
    "81675": ("muenchen", "bogenhausen"), "81677": ("muenchen", "bogenhausen"),
    "81679": ("muenchen", "bogenhausen"),
    "81735": ("muenchen", "ramersdorf"), "81737": ("muenchen", "ramersdorf"),
    "81739": ("muenchen", "neuperlach"), "81925": ("muenchen", "bogenhausen"),
    "81927": ("muenchen", "bogenhausen"), "81929": ("muenchen", "trudering"),
    "81671": ("muenchen", "trudering"),
    # Frankfurt
    "60311": ("frankfurt", "innenstadt"), "60313": ("frankfurt", "innenstadt"),
    "60314": ("frankfurt", "ostend"), "60316": ("frankfurt", "nordend"),
    "60318": ("frankfurt", "nordend"), "60320": ("frankfurt", "nordend"),
    "60322": ("frankfurt", "westend"), "60323": ("frankfurt", "westend"),
    "60325": ("frankfurt", "westend"), "60327": ("frankfurt", "gallus"),
    "60329": ("frankfurt", "bahnhofsviertel"),
    "60385": ("frankfurt", "bornheim"), "60386": ("frankfurt", "fechenheim"),
    "60388": ("frankfurt", "bergen-enkheim"), "60389": ("frankfurt", "bornheim"),
    "60431": ("frankfurt", "dornbusch"), "60433": ("frankfurt", "eschersheim"),
    "60435": ("frankfurt", "eckenheim"), "60437": ("frankfurt", "nieder-eschbach"),
    "60438": ("frankfurt", "riedberg"), "60439": ("frankfurt", "heddernheim"),
    "60486": ("frankfurt", "bockenheim"), "60487": ("frankfurt", "bockenheim"),
    "60488": ("frankfurt", "rödelheim"), "60489": ("frankfurt", "rödelheim"),
    "60528": ("frankfurt", "niederrad"), "60529": ("frankfurt", "goldstein"),
    "60594": ("frankfurt", "sachsenhausen"), "60596": ("frankfurt", "sachsenhausen"),
    "60598": ("frankfurt", "sachsenhausen"), "60599": ("frankfurt", "oberrad"),
    "65929": ("frankfurt", "höchst"), "65931": ("frankfurt", "sindlingen"),
    "65933": ("frankfurt", "griesheim"), "65934": ("frankfurt", "nied"),
    "65936": ("frankfurt", "sossenheim"),
    # Köln
    "50667": ("koeln", "altstadt"), "50668": ("koeln", "neustadt-nord"),
    "50670": ("koeln", "neustadt-nord"), "50672": ("koeln", "neustadt-nord"),
    "50674": ("koeln", "neustadt-süd"), "50676": ("koeln", "neustadt-süd"),
    "50677": ("koeln", "neustadt-süd"), "50678": ("koeln", "neustadt-süd"),
    "50679": ("koeln", "deutz"), "50733": ("koeln", "nippes"),
    "50735": ("koeln", "nippes"), "50737": ("koeln", "longerich"),
    "50739": ("koeln", "bilderstöckchen"),
    "50823": ("koeln", "ehrenfeld"), "50825": ("koeln", "ehrenfeld"),
    "50827": ("koeln", "ehrenfeld"), "50829": ("koeln", "bickendorf"),
    "50858": ("koeln", "junkersdorf"), "50859": ("koeln", "lövenich"),
    "50931": ("koeln", "lindenthal"), "50933": ("koeln", "lindenthal"),
    "50935": ("koeln", "sülz"), "50937": ("koeln", "sülz"),
    "50939": ("koeln", "klettenberg"),
    "50968": ("koeln", "rodenkirchen"), "50969": ("koeln", "zollstock"),
    "50996": ("koeln", "rodenkirchen"), "50997": ("koeln", "rodenkirchen"),
    "50999": ("koeln", "sürth"),
    "51063": ("koeln", "mülheim"), "51065": ("koeln", "mülheim"),
    "51067": ("koeln", "holweide"), "51069": ("koeln", "dünnwald"),
    "51103": ("koeln", "kalk"), "51105": ("koeln", "kalk"),
    "51107": ("koeln", "rath"), "51109": ("koeln", "brück"),
    "51143": ("koeln", "porz"), "51145": ("koeln", "porz"),
    "51147": ("koeln", "porz"), "51149": ("koeln", "porz"),
    # Stuttgart
    "70173": ("stuttgart", "mitte"), "70174": ("stuttgart", "mitte"),
    "70176": ("stuttgart", "west"), "70178": ("stuttgart", "süd"),
    "70180": ("stuttgart", "süd"), "70182": ("stuttgart", "mitte"),
    "70184": ("stuttgart", "ost"), "70186": ("stuttgart", "ost"),
    "70188": ("stuttgart", "ost"), "70190": ("stuttgart", "ost"),
    "70191": ("stuttgart", "nord"), "70192": ("stuttgart", "nord"),
    "70193": ("stuttgart", "west"), "70195": ("stuttgart", "botnang"),
    "70197": ("stuttgart", "west"),
    "70327": ("stuttgart", "bad cannstatt"), "70329": ("stuttgart", "bad cannstatt"),
    "70372": ("stuttgart", "bad cannstatt"), "70374": ("stuttgart", "bad cannstatt"),
    "70376": ("stuttgart", "bad cannstatt"),
    "70435": ("stuttgart", "zuffenhausen"), "70437": ("stuttgart", "zuffenhausen"),
    "70439": ("stuttgart", "stammheim"),
    "70469": ("stuttgart", "feuerbach"), "70499": ("stuttgart", "weilimdorf"),
    "70563": ("stuttgart", "vaihingen"), "70565": ("stuttgart", "vaihingen"),
    "70567": ("stuttgart", "möhringen"), "70569": ("stuttgart", "vaihingen"),
    "70597": ("stuttgart", "degerloch"), "70599": ("stuttgart", "plieningen"),
    # Düsseldorf
    "40210": ("duesseldorf", "stadtmitte"), "40211": ("duesseldorf", "stadtmitte"),
    "40212": ("duesseldorf", "stadtmitte"), "40213": ("duesseldorf", "altstadt"),
    "40215": ("duesseldorf", "friedrichstadt"), "40217": ("duesseldorf", "unterbilk"),
    "40219": ("duesseldorf", "bilk"), "40221": ("duesseldorf", "bilk"),
    "40223": ("duesseldorf", "bilk"), "40225": ("duesseldorf", "bilk"),
    "40227": ("duesseldorf", "oberbilk"), "40229": ("duesseldorf", "eller"),
    "40231": ("duesseldorf", "eller"), "40233": ("duesseldorf", "flingern"),
    "40235": ("duesseldorf", "flingern"), "40237": ("duesseldorf", "düsseltal"),
    "40239": ("duesseldorf", "düsseltal"),
    "40468": ("duesseldorf", "derendorf"), "40470": ("duesseldorf", "mörsenbroich"),
    "40472": ("duesseldorf", "rath"), "40474": ("duesseldorf", "golzheim"),
    "40476": ("duesseldorf", "derendorf"), "40477": ("duesseldorf", "pempelfort"),
    "40479": ("duesseldorf", "pempelfort"),
    "40545": ("duesseldorf", "oberkassel"), "40547": ("duesseldorf", "oberkassel"),
    "40549": ("duesseldorf", "heerdt"),
    "40589": ("duesseldorf", "wersten"), "40591": ("duesseldorf", "wersten"),
    "40593": ("duesseldorf", "benrath"), "40595": ("duesseldorf", "garath"),
    "40597": ("duesseldorf", "benrath"), "40599": ("duesseldorf", "hassels"),
    "40625": ("duesseldorf", "gerresheim"), "40627": ("duesseldorf", "gerresheim"),
    "40629": ("duesseldorf", "gerresheim"),
    "40667": ("duesseldorf", "kaiserswerth"), "40668": ("duesseldorf", "kaiserswerth"),
}

def resolve_plz_to_stadtteil(plz: str) -> Optional[tuple]:
    """Resolved eine PLZ zu (stadt, stadtteil). Gibt None zurueck wenn unbekannt."""
    if not plz:
        return None
    clean_plz = plz.strip().replace(" ", "")
    if clean_plz in PLZ_STADTTEIL_MAP:
        return PLZ_STADTTEIL_MAP[clean_plz]
    return None


def quick_market_lookup(stadt: str, stadtteil: str = None, plz: str = None) -> Optional[dict]:
    """Schneller Lookup aus Knowledge Base - kein API Call noetig. Prueft PLZ → Stadtteil → Stadt."""
    key = stadt.lower().strip()

    # PLZ-Aufloesung: wenn PLZ vorhanden aber kein Stadtteil, versuche PLZ zu resolven
    if plz and not stadtteil:
        plz_result = resolve_plz_to_stadtteil(plz)
        if plz_result:
            resolved_stadt, resolved_stadtteil = plz_result
            # PLZ-aufgeloesten Stadtteil verwenden
            stadtteil = resolved_stadtteil
            # Stadt aus PLZ nehmen falls nicht angegeben
            if not stadt:
                key = resolved_stadt

    # Stadtteil-spezifisch zuerst pruefen (z.B. "hamburg-uhlenhorst")
    ist_stadtteil_spezifisch = False
    if stadtteil:
        stadtteil_key = f"{key}-{stadtteil.lower().strip()}"
        if stadtteil_key in KNOWN_CITIES:
            key = stadtteil_key
            ist_stadtteil_spezifisch = True
        else:
            # Stadtteil bekannt aber nicht im KB → Stadt-Durchschnitt waere irrefuehrend.
            # Auf Live-Recherche umleiten (None zurueckgeben).
            return None

    if key in KNOWN_CITIES:
        d = KNOWN_CITIES[key]
        vergleichs_label = f"Stadtteil-Durchschnitt ({stadtteil}, {stadt})" if ist_stadtteil_spezifisch else f"Stadt-Durchschnitt ({stadt})"
        return {
            "standort": f"{stadtteil}, {stadt}" if ist_stadtteil_spezifisch else stadt,
            "stadtteil": stadtteil if ist_stadtteil_spezifisch else None,
            "ist_stadtteil_spezifisch": ist_stadtteil_spezifisch,
            "vergleichs_label": vergleichs_label,
            "kaufpreis_qm_von": d["kauf_von"],
            "kaufpreis_qm_bis": d["kauf_bis"],
            "kaufpreis_qm_durchschnitt": (d["kauf_von"] + d["kauf_bis"]) // 2,
            "miete_qm_durchschnitt": d["miete"],
            "miete_qm_von": d["miete"] * 0.8,
            "miete_qm_bis": d["miete"] * 1.2,
            "tendenz": "steigend",
            "preisentwicklung_5_jahre": d["trend"],
            "kaufpreisfaktor_bereich": d["faktor"],
            "recherche_methode": "knowledge_base_fast",
            "datenqualität": f"Knowledge Base Daten fuer {vergleichs_label} (Stand: Maerz 2026)"
        }
    return None


@app.post("/extract-url")
@limiter.limit("20/hour")
async def extract_url_data(request: Request, data: dict = Body(...), current_user: User = Depends(get_current_active_user)):
    """
    Extrahiert Immobiliendaten aus einer ImmoScout24/Immowelt URL
    """
    # Credits-Gate VOR teurem LLM-Call (URL-Extract kostet pro Aufruf)
    if not current_user.is_superuser:
        credits_now = current_user.analysis_credits if current_user.analysis_credits is not None else 0
        if credits_now < 1:
            raise HTTPException(status_code=402, detail="Keine Credits verfuegbar")

    url = data.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL oder Text ist erforderlich")

    # Prüfe ob es eine URL ist oder reiner Text
    is_url = url.startswith("http://") or url.startswith("https://")

    if is_url:
        # Validiere URL
        allowed_domains = ["immobilienscout24.de", "immowelt.de", "immonet.de", "kleinanzeigen.de"]
        parsed = urlparse(url.lower())
        hostname = parsed.hostname or ""
        is_valid = any(hostname == domain or hostname.endswith("." + domain) for domain in allowed_domains)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Nur ImmoScout24, Immowelt, Immonet und Kleinanzeigen URLs werden unterstuetzt")
    else:
        # Reiner Text - direkt an Claude senden zur Extraktion
        if len(url) < 50:
            raise HTTPException(status_code=400, detail="Bitte fuege mehr Text aus dem Expose ein (mindestens 50 Zeichen)")

        try:
            text_db = next(get_db())
            result = call_claude_direct(
                "Du extrahierst Immobiliendaten aus Expose-Text. Antworte NUR als JSON.",
                [{"role": "user", "content": f"""Extrahiere alle Immobiliendaten aus folgendem Expose-Text.

Gib die Daten als JSON zurueck:
{{"kaufpreis": null, "wohnflaeche": null, "zimmer": null, "baujahr": null, "plz": null, "stadt": null, "stadtteil": null, "objekttyp": null, "aktuelle_miete": null, "hausgeld": null, "hausgeld_nicht_umlagefaehig": null, "energieklasse": null, "heizungsart": null, "zustand": null, "balkon_terrasse": null, "keller": null, "stellplatz": null, "vermietet": null, "provision": null, "beschreibung": null}}

Expose-Text:
{url[:5000]}"""}],
                max_tokens=1500,
                model="claude-haiku-4-5-20251001",
                db=text_db, user_id=current_user.id, action_type="text_extraction"
            )
            text_db.close()
            json_text = result["content"][0]["text"].strip()
            if json_text.startswith("```"):
                json_text = json_text.split("```")[1]
                if json_text.startswith("json"):
                    json_text = json_text[4:]
            return json.loads(json_text.strip())
        except Exception as e:
            print(f"[ERROR] Fehler bei der Text-Extraktion: {str(e)}")
            raise HTTPException(status_code=500, detail="Fehler bei der Extraktion. Bitte versuche es erneut.")
        return  # Beende hier fuer Text-Input

    # Scrape die Seite (mit verschiedenen Header-Kombinationen)
    html_content = None
    headers_options = [
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
            "Referer": "https://www.google.de/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "cross-site",
        },
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html",
            "Accept-Language": "de",
        },
    ]

    # URL bereinigen (Query-Parameter entfernen)
    clean_url = url.split("?")[0].split("#")[0]

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as http_client:
            for headers in headers_options:
                try:
                    response = await http_client.get(clean_url, headers=headers)
                    if response.status_code == 200 and len(response.text) > 500:
                        html_content = response.text
                        break
                except Exception:
                    continue

        if not html_content:
            raise HTTPException(
                status_code=400,
                detail="Diese Seite blockiert automatisches Laden. Bitte kopiere die Objektdaten und nutze die manuelle Eingabe."
            )
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=400, detail="Timeout beim Laden der Seite. Bitte nutze die manuelle Eingabe.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fehler beim Laden. Bitte nutze die manuelle Eingabe.")

    if len(html_content) < 500:
        raise HTTPException(status_code=400, detail="Seite konnte nicht geladen werden (zu wenig Inhalt)")

    # Claude extrahiert die Daten aus dem HTML (Haiku fuer Speed)
    extraction_prompt = f"""Extrahiere alle Immobiliendaten aus diesem HTML einer Immobilienanzeige.

URL: {url}

Gib die Daten als JSON zurueck mit genau diesen Feldern (null wenn nicht gefunden):
{{
    "kaufpreis": <Zahl in Euro>,
    "wohnflaeche": <Zahl in qm>,
    "zimmer": <Anzahl>,
    "baujahr": <Jahr>,
    "etage": "<z.B. 2. OG>",
    "nebenkosten": <monatlich in Euro>,
    "hausgeld": <monatlich in Euro>,
    "hausgeld_nicht_umlagefaehig": <nicht umlagefähiger Anteil in Euro, null wenn nicht angegeben>,
    "energieausweis": "<Verbrauch oder Bedarf>",
    "energieklasse": "<A+ bis H>",
    "heizungsart": "<z.B. Gas-Zentralheizung>",
    "adresse": "<Strasse und Hausnummer>",
    "stadt": "<Stadt>",
    "stadtteil": "<Stadtteil/Bezirk>",
    "objekttyp": "<z.B. Eigentumswohnung, Einfamilienhaus>",
    "zustand": "<z.B. gepflegt, renovierungsbeduerftig, Neubau>",
    "ausstattung": "<z.B. gehoben, normal, einfach>",
    "balkon_terrasse": <true/false>,
    "keller": <true/false>,
    "stellplatz": "<z.B. Tiefgarage, Aussenstellplatz, keiner>",
    "vermietet": <true/false>,
    "aktuelle_miete": <monatliche Kaltmiete in Euro falls vermietet>,
    "verkaeufertyp": "<privat oder Makler>",
    "provision": "<z.B. 3,57% oder provisionsfrei>",
    "beschreibung": "<Kurze Zusammenfassung des Objekts in 2-3 Saetzen>"
}}

Antworte NUR mit dem JSON, kein anderer Text.

HTML (gekuerzt):
{html_content[:12000]}"""

    try:
        url_db = next(get_db())
        result = call_claude_direct(
            "Du extrahierst Immobiliendaten aus HTML. Antworte NUR als JSON.",
            [{"role": "user", "content": extraction_prompt}],
            max_tokens=2000,
            model="claude-haiku-4-5-20251001",
            db=url_db, user_id=current_user.id, action_type="url_extraction"
        )
        url_db.close()

        json_text = result["content"][0]["text"].strip()
        if json_text.startswith("```"):
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
        json_text = json_text.strip()

        property_data = json.loads(json_text)
        return property_data

    except json.JSONDecodeError as e:
        print(f"[ERROR] Fehler beim Parsen der URL-Extraktion: {str(e)}")
        raise HTTPException(status_code=500, detail="Die Daten konnten nicht verarbeitet werden. Bitte versuche es erneut.")
    except Exception as e:
        print(f"[ERROR] Fehler bei der URL-Extraktion: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Extraktion. Bitte versuche es erneut.")


CACHE_TTL_DAYS = 90


def _cache_lookup_stadtteil(db, stadt: str, stadtteil: str) -> Optional[dict]:
    """Sucht gueltigen Cache-Eintrag fuer Stadt+Stadtteil. None wenn abgelaufen oder nicht vorhanden."""
    if not db or not stadt or not stadtteil:
        return None
    try:
        from models import StadtteilMarktdaten
        from datetime import timedelta
        entry = (
            db.query(StadtteilMarktdaten)
            .filter(
                StadtteilMarktdaten.stadt == stadt.lower().strip(),
                StadtteilMarktdaten.stadtteil == stadtteil.lower().strip(),
            )
            .order_by(StadtteilMarktdaten.updated_at.desc())
            .first()
        )
        if not entry:
            return None
        age = datetime.utcnow() - (entry.updated_at or entry.created_at)
        if age > timedelta(days=CACHE_TTL_DAYS):
            return None
        return {
            "standort": f"{stadtteil}, {stadt}",
            "stadtteil": stadtteil,
            "ist_stadtteil_spezifisch": True,
            "vergleichs_label": f"Stadtteil-Durchschnitt ({stadtteil}, {stadt})",
            "kaufpreis_qm_von": entry.kaufpreis_qm_von,
            "kaufpreis_qm_bis": entry.kaufpreis_qm_bis,
            "kaufpreis_qm_durchschnitt": entry.kaufpreis_qm_durchschnitt,
            "miete_qm_von": entry.miete_qm_von,
            "miete_qm_bis": entry.miete_qm_bis,
            "miete_qm_durchschnitt": entry.miete_qm_durchschnitt,
            "kaufpreisfaktor_bereich": entry.kaufpreisfaktor_bereich,
            "tendenz": entry.tendenz,
            "preisentwicklung_5_jahre": entry.preisentwicklung_5_jahre,
            "standort_faktoren": entry.standort_faktoren,
            "recherche_methode": "db_cache",
            "datenqualität": f"Cache-Daten (Quelle: {entry.source}, Stand: {entry.updated_at.strftime('%Y-%m-%d') if entry.updated_at else 'unbekannt'})",
            "confidence": entry.confidence,
        }
    except Exception as e:
        print(f"[CACHE] Lookup fehlgeschlagen: {e}")
        return None


def _cache_store_stadtteil(db, stadt: str, stadtteil: str, market_data: dict, source: str = "live_web_search"):
    """Speichert/aktualisiert Cache-Eintrag fuer Stadt+Stadtteil."""
    if not db or not stadt or not stadtteil:
        return
    try:
        from models import StadtteilMarktdaten
        stadt_norm = stadt.lower().strip()
        stadtteil_norm = stadtteil.lower().strip()
        entry = (
            db.query(StadtteilMarktdaten)
            .filter(
                StadtteilMarktdaten.stadt == stadt_norm,
                StadtteilMarktdaten.stadtteil == stadtteil_norm,
            )
            .first()
        )
        if not entry:
            entry = StadtteilMarktdaten(stadt=stadt_norm, stadtteil=stadtteil_norm)
            db.add(entry)
        entry.kaufpreis_qm_von = market_data.get("kaufpreis_qm_von")
        entry.kaufpreis_qm_bis = market_data.get("kaufpreis_qm_bis")
        entry.kaufpreis_qm_durchschnitt = market_data.get("kaufpreis_qm_durchschnitt")
        entry.miete_qm_von = market_data.get("miete_qm_von")
        entry.miete_qm_bis = market_data.get("miete_qm_bis")
        entry.miete_qm_durchschnitt = market_data.get("miete_qm_durchschnitt")
        entry.kaufpreisfaktor_bereich = market_data.get("kaufpreisfaktor_bereich")
        entry.tendenz = market_data.get("tendenz")
        entry.preisentwicklung_5_jahre = market_data.get("preisentwicklung_5_jahre")
        entry.standort_faktoren = market_data.get("standort_faktoren")
        entry.source = source
        entry.confidence = market_data.get("vertrauenswuerdigkeit") or market_data.get("confidence") or "mittel"
        entry.raw_data = market_data
        entry.updated_at = datetime.utcnow()
        db.commit()
        print(f"[CACHE] Stadtteil-Daten gespeichert: {stadt_norm}/{stadtteil_norm}")
    except Exception as e:
        print(f"[CACHE] Speichern fehlgeschlagen: {e}")
        try:
            db.rollback()
        except Exception:
            pass


async def fetch_live_market_data(stadt: str, stadtteil: Optional[str], objekttyp: str = "Eigentumswohnung", plz: str = None, db=None) -> dict:
    """
    V3.2 - MARKTDATEN mit 3-stufigem Lookup
    1. Statisches KNOWN_CITIES (instant, mit PLZ-Aufloesung)
    2. DB-Cache (instant, 90 Tage gueltig, user-uebergreifend)
    3. Live-Web-Recherche mit Sonnet (Stadtteil-spezifisch, ~5-10s) + Cache-Write
    """
    # Stufe 1: Knowledge Base Lookup (PLZ wird zu Stadtteil aufgeloest)
    fast_result = quick_market_lookup(stadt, stadtteil, plz=plz)
    if fast_result:
        return fast_result

    # PLZ → Stadtteil aufloesen falls noetig (auch fuer Cache-Hit)
    if plz and not stadtteil:
        plz_result = resolve_plz_to_stadtteil(plz)
        if plz_result:
            _, resolved_stadtteil = plz_result
            stadtteil = resolved_stadtteil

    # Stufe 2: DB-Cache pruefen (nur wenn Stadtteil bekannt)
    if db and stadt and stadtteil:
        cached = _cache_lookup_stadtteil(db, stadt, stadtteil)
        if cached:
            print(f"[CACHE-HIT] Stadtteil-Daten aus Cache: {stadt}/{stadtteil}")
            return cached

    # Stufe 3: Live-Web-Recherche (Stadtteil-spezifisch)
    location = f"{stadtteil}, {stadt}" if stadtteil else stadt

    # Mehrere gezielte Queries fuer Stadtteil-Granularitaet
    search_queries = [
        f"Kaufpreis Eigentumswohnung {location} EUR pro m2 2025 2026",
        f"Mietspiegel {location} Kaltmiete pro qm aktuell",
        f"Immobilienpreise {location} Trend Entwicklung",
    ]

    search_results = []
    async with httpx.AsyncClient(timeout=12.0) as http_client:
        for query in search_queries:
            try:
                encoded_query = query.replace(' ', '+')
                url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                }
                response = await http_client.get(url, headers=headers)
                if response.status_code == 200:
                    text = response.text
                    price_patterns = re.findall(r'(\d{1,2}[.,]?\d{0,3})\s*(?:€|Euro)?\s*/?\s*(?:m²|qm|Quadratmeter)', text, re.IGNORECASE)
                    search_results.append({
                        "query": query,
                        "found_prices": price_patterns[:8] if price_patterns else [],
                        "raw_snippet": text[:3000] if len(text) > 100 else ""
                    })
            except Exception as e:
                print(f"[ERROR] Suchanfrage fehlgeschlagen ({query}): {str(e)}")
                search_results.append({"query": query, "error": "Suchanfrage fehlgeschlagen"})

    # Sonnet (statt Haiku) fuer hoehere Genauigkeit bei Stadtteil-Recherche
    is_stadtteil_research = bool(stadtteil)
    research_prompt = f"""Recherchiere AKTUELLE Immobilien-Marktdaten fuer einen konkreten Standort.

=== STANDORT ===
Stadt: {stadt}
Stadtteil/Bezirk: {stadtteil or "Nicht angegeben (nur Stadt-Ebene)"}
Objekttyp: {objekttyp}

=== GEFUNDENE WEB-SUCHERGEBNISSE ===
{json.dumps(search_results, indent=2, ensure_ascii=False)[:6000]}

=== DEINE AUFGABE ===
1. Extrahiere konkrete Preisangaben aus den Suchergebnissen wenn vorhanden
2. Nutze dein Wissen ueber den DACH-Immobilienmarkt 2025/2026
3. Beruecksichtige Stadtteil-spezifische Faktoren (Lage, Infrastruktur, OEPNV, soziale Struktur)
4. Bei Stadtteilen: Preise koennen STARK von Stadt-Durchschnitt abweichen (gute Lagen +30-100%, Randlagen -20-40%)
5. Gib REALISTISCHE Werte an - keine generischen Schaetzungen

REGELN:
- A-Staedte (Muenchen, Frankfurt, Hamburg, Berlin): Stadt-Durchschnitt 4.500-9.500 EUR/m2; Premium-Stadtteile bis 13.000
- B-Staedte (Stuttgart, Duesseldorf, Koeln): 4.000-6.500 EUR/m2
- C-Staedte (Leipzig, Dresden, Hannover, Nuernberg): 2.500-4.500 EUR/m2
- Mittel-/Kleinstaedte: 1.500-3.500 EUR/m2
- Mieten: 8-23 EUR/m2 je nach Lage und Stadt
- Bei unbekanntem Stadtteil in bekannter Stadt: realistisch von Stadt-Durchschnitt abweichen

Antworte AUSSCHLIESSLICH als JSON (kein anderer Text):
{{
    "standort": "{location}",
    "objekttyp": "{objekttyp}",
    "kaufpreis_qm_von": <untere Grenze in EUR>,
    "kaufpreis_qm_bis": <obere Grenze in EUR>,
    "kaufpreis_qm_durchschnitt": <Mittelwert>,
    "miete_qm_von": <untere Grenze>,
    "miete_qm_bis": <obere Grenze>,
    "miete_qm_durchschnitt": <Mittelwert>,
    "kaufpreisfaktor_bereich": "<z.B. 22-28>",
    "preisentwicklung_5_jahre": "<z.B. +25% oder -5%>",
    "tendenz": "<steigend/stabil/fallend>",
    "prognose_2026": "<kurze Einschaetzung>",
    "standort_bewertung": <1-10>,
    "standort_faktoren": ["<Faktor1>", "<Faktor2>"],
    "datenquellen": ["<Quelle1>", "<Quelle2>"],
    "aktualitaet": "Live-Recherche {stadt} Stand 2026",
    "vertrauenswuerdigkeit": "<hoch/mittel/niedrig>"
}}"""

    try:
        # Sonnet fuer Stadtteil-Recherche (hoehere Genauigkeit), Haiku fuer Stadt-Ebene (schneller)
        model_to_use = os.getenv("CLAUDE_SONNET_MODEL", "claude-sonnet-4-6") if is_stadtteil_research else "claude-haiku-4-5-20251001"
        data_result = call_claude_direct(
            "Du extrahierst Immobilien-Marktdaten und recherchierst Stadtteil-spezifische Preise. Antworte NUR als JSON.",
            [{"role": "user", "content": research_prompt}],
            max_tokens=1500,
            model=model_to_use
        )

        json_text = data_result["content"][0]["text"].strip()
        if json_text.startswith("```"):
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
        json_text = json_text.strip()

        market_data = json.loads(json_text)
        market_data["recherche_methode"] = "live_web_search_v3"
        market_data["ist_stadtteil_spezifisch"] = bool(stadtteil)
        market_data["stadtteil"] = stadtteil if stadtteil else None
        market_data["vergleichs_label"] = (
            f"Stadtteil-Durchschnitt ({stadtteil}, {stadt})" if stadtteil else f"Markt in {stadt}"
        )

        # Cache fuer naechsten User schreiben (nur wenn Stadtteil-spezifisch)
        if db and stadt and stadtteil:
            _cache_store_stadtteil(db, stadt, stadtteil, market_data, source="live_web_search")

        return market_data

    except Exception as e:
        print(f"[ERROR] Live-Recherche fehlgeschlagen: {e}")
        return {
            "standort": location,
            "stadtteil": stadtteil if stadtteil else None,
            "ist_stadtteil_spezifisch": bool(stadtteil),
            "vergleichs_label": (
                f"Stadtteil-Durchschnitt ({stadtteil}, {stadt})" if stadtteil else f"Markt in {stadt}"
            ),
            "fehler": "Live-Recherche fehlgeschlagen",
            "kaufpreis_qm_durchschnitt": 3500,
            "miete_qm_durchschnitt": 10,
            "datenqualität": "ACHTUNG: Fallback-Werte - Live-Recherche empfohlen!",
            "recherche_methode": "fallback"
        }


@app.post("/search-market-data")
async def search_market_data(stadt: str, stadtteil: Optional[str] = None, objekttyp: Optional[str] = "Eigentumswohnung", current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """
    V3.0 - LIVE Marktdaten-Recherche
    Sucht AKTUELLE Preise für Stadt/Stadtteil/Objekttyp
    """
    return await fetch_live_market_data(stadt, stadtteil, objekttyp or "Eigentumswohnung", db=db)


def calculate_kaufnebenkosten(kaufpreis: float, bundesland: str = None, mit_makler: bool = True) -> dict:
    """
    Berechnet die Kaufnebenkosten einer Immobilie.

    Kaufnebenkosten bestehen aus:
    - Grunderwerbsteuer: 3.5% - 6.5% je nach Bundesland
    - Notar & Grundbuch: ~1.5-2%
    - Makler: 0% - 7.14% (wenn Makler involviert)
    """
    # Grunderwerbsteuer nach Bundesland (Stand 2024)
    grunderwerbsteuer_saetze = {
        "baden-württemberg": 5.0, "bayern": 3.5, "berlin": 6.0, "brandenburg": 6.5,
        "bremen": 5.5, "hamburg": 5.5, "hessen": 6.0, "mecklenburg-vorpommern": 6.0,
        "niedersachsen": 5.0, "nordrhein-westfalen": 6.5, "rheinland-pfalz": 5.0,
        "saarland": 6.5, "sachsen": 5.5, "sachsen-anhalt": 5.0, "schleswig-holstein": 6.5,
        "thüringen": 5.0
    }

    # Standard: 5.5% wenn Bundesland nicht bekannt
    grunderwerbsteuer_prozent = 5.5
    if bundesland:
        bundesland_lower = bundesland.lower().strip()
        grunderwerbsteuer_prozent = grunderwerbsteuer_saetze.get(bundesland_lower, 5.5)

    # Notar & Grundbuch: ~2%
    notar_grundbuch_prozent = 2.0

    # Makler: ~3.57% (hälfte der üblichen 7.14%)
    makler_prozent = 3.57 if mit_makler else 0.0

    # Berechnungen
    grunderwerbsteuer = kaufpreis * (grunderwerbsteuer_prozent / 100)
    notar_grundbuch = kaufpreis * (notar_grundbuch_prozent / 100)
    makler = kaufpreis * (makler_prozent / 100)

    gesamt = grunderwerbsteuer + notar_grundbuch + makler
    gesamt_prozent = grunderwerbsteuer_prozent + notar_grundbuch_prozent + makler_prozent

    return {
        "kaufpreis": round(kaufpreis, 2),
        "grunderwerbsteuer": round(grunderwerbsteuer, 2),
        "grunderwerbsteuer_prozent": grunderwerbsteuer_prozent,
        "notar_grundbuch": round(notar_grundbuch, 2),
        "notar_grundbuch_prozent": notar_grundbuch_prozent,
        "makler": round(makler, 2),
        "makler_prozent": makler_prozent,
        "gesamt": round(gesamt, 2),
        "gesamt_prozent": round(gesamt_prozent, 2),
        "gesamtkosten": round(kaufpreis + gesamt, 2),
        "bundesland": bundesland or "Durchschnitt"
    }


def calculate_cashflow(
    kaufpreis: float,
    monatliche_miete: float,
    nebenkosten: float,
    eigenkapital: float = 0,
    zinssatz: float = 4.3,
    tilgung: float = 1.25
) -> dict:
    """
    Berechnet Cashflow mit 100% Finanzierung

    Standard-Finanzierung:
    - Zinssatz: 4.0%
    - Tilgung: 1.25%
    - Gesamt: 5.0% p.a.

    Args:
        kaufpreis: Kaufpreis der Immobilie
        monatliche_miete: Monatliche Kaltmiete
        nebenkosten: Monatliche Nebenkosten (Hausgeld etc.)
        eigenkapital: Eigenkapitalanteil (default: 0 = 100% Finanzierung)
        zinssatz: Zinssatz in % (default: 4.3%, Stand Oktober 2026)
        tilgung: Tilgung in % (default: 1.25%)
    """

    finanzierungssumme = kaufpreis - eigenkapital

    # Jährliche Rate (Annuität)
    jaehrliche_rate_prozent = zinssatz + tilgung
    jaehrliche_rate = finanzierungssumme * (jaehrliche_rate_prozent / 100)
    monatliche_rate = jaehrliche_rate / 12

    # Cashflow
    monatlicher_cashflow = monatliche_miete - monatliche_rate - nebenkosten
    jaehrlicher_cashflow = monatlicher_cashflow * 12

    # Renditen
    bruttorendite = (monatliche_miete * 12 / kaufpreis) * 100 if kaufpreis > 0 else 0

    # Nettorendite (nach Nebenkosten, bezogen auf Gesamtinvestition inkl. Kaufnebenkosten)
    kaufnebenkosten_geschaetzt = kaufpreis * 0.11  # ca. 11% Kaufnebenkosten
    nettorendite = ((monatliche_miete - nebenkosten) * 12 / (kaufpreis + kaufnebenkosten_geschaetzt)) * 100 if kaufpreis > 0 else 0

    # Eigenkapitalrendite (bei Finanzierung)
    # Bei 0 EK: Kaufnebenkosten (~12%) sind das tatsaechliche Eigenkapital
    tatsaechliches_ek = eigenkapital if eigenkapital > 0 else kaufpreis * 0.12
    eigenkapitalrendite = (jaehrlicher_cashflow / tatsaechliches_ek) * 100 if tatsaechliches_ek > 0 else None

    # Bewertung relativ zum Kaufpreis (monatliche Prozentsätze)
    cashflow_ratio = (monatlicher_cashflow / kaufpreis) * 100 if kaufpreis > 0 else 0
    if cashflow_ratio > 0.05:
        cashflow_bewertung = "Exzellent"
        cashflow_score = 95
    elif cashflow_ratio > 0.02:
        cashflow_bewertung = "Sehr gut"
        cashflow_score = 85
    elif cashflow_ratio >= 0:
        cashflow_bewertung = "Gut (cashflow-positiv)"
        cashflow_score = 75
    elif cashflow_ratio >= -0.05:
        cashflow_bewertung = "Akzeptabel (fast selbsttragend)"
        cashflow_score = 60
    elif cashflow_ratio >= -0.15:
        cashflow_bewertung = "Mäßig (überschaubare Zuzahlung)"
        cashflow_score = 45
    else:
        cashflow_bewertung = "Niedrig (hohe Zuzahlung nötig)"
        cashflow_score = 30

    return {
        "finanzierungssumme": round(finanzierungssumme, 2),
        "eigenkapital": round(eigenkapital, 2),
        "finanzierungsquote_prozent": round((finanzierungssumme / kaufpreis * 100), 2) if kaufpreis > 0 else 0,
        "zinssatz_prozent": zinssatz,
        "tilgung_prozent": tilgung,
        "gesamtrate_prozent": jaehrliche_rate_prozent,
        "monatliche_rate": round(monatliche_rate, 2),
        "monatliche_miete": round(monatliche_miete, 2),
        "monatliche_nebenkosten": round(nebenkosten, 2),
        "monatlicher_cashflow": round(monatlicher_cashflow, 2),
        "jaehrlicher_cashflow": round(jaehrlicher_cashflow, 2),
        "bruttorendite_prozent": round(bruttorendite, 2),
        "nettorendite_prozent": round(nettorendite, 2),
        "eigenkapitalrendite_prozent": round(eigenkapitalrendite, 2) if eigenkapitalrendite else None,
        "selbsttragend": monatlicher_cashflow >= 0,
        "cashflow_positiv": monatlicher_cashflow > 0,
        "cashflow_bewertung": cashflow_bewertung,
        "cashflow_score": cashflow_score,
    }


def calculate_tilgungsplan(
    kaufpreis: float,
    eigenkapital: float,
    zinssatz: float,
    tilgung: float,
    monatliche_miete: float,
    nebenkosten: float,
    jahre: int = 30,
    mietsteigerung: float = 2.5,
    wertsteigerung: float = 2.5
) -> dict:
    """
    Berechnet einen detaillierten Tilgungsplan über die angegebene Laufzeit.

    Args:
        kaufpreis: Kaufpreis der Immobilie
        eigenkapital: Eingesetztes Eigenkapital
        zinssatz: Jährlicher Zinssatz in %
        tilgung: Jährliche Tilgung in %
        monatliche_miete: Monatliche Kaltmiete
        nebenkosten: Monatliche Nebenkosten
        jahre: Laufzeit in Jahren (default: 30)
        mietsteigerung: Jährliche Mietsteigerung in % (default: 1.5%)
        wertsteigerung: Jährliche Wertsteigerung in % (default: 1.5%)

    Returns:
        Dict mit jahresweisen Projektionen und Zusammenfassung
    """
    finanzierungssumme = kaufpreis - eigenkapital
    restschuld = finanzierungssumme

    # Jährliche Rate (Annuität)
    jaehrliche_rate_prozent = zinssatz + tilgung
    jaehrliche_rate = finanzierungssumme * (jaehrliche_rate_prozent / 100)

    aktuelle_miete = monatliche_miete
    immobilienwert = kaufpreis

    jahres_projektionen = []
    gesamte_zinsen = 0
    gesamte_tilgung = 0

    for jahr in range(1, jahre + 1):
        # Zinsen und Tilgung für dieses Jahr
        zinsen_jahr = restschuld * (zinssatz / 100)
        tilgung_jahr = jaehrliche_rate - zinsen_jahr

        # Sicherstellen, dass wir nicht mehr tilgen als Restschuld
        if tilgung_jahr > restschuld:
            tilgung_jahr = restschuld
            # Zinsen bleiben korrekt - bereits auf Basis der Restschuld zu Jahresbeginn berechnet

        restschuld = max(0, restschuld - tilgung_jahr)
        gesamte_zinsen += zinsen_jahr
        gesamte_tilgung += tilgung_jahr

        # Cashflow berechnen (mit aktueller Miete)
        # Wenn Kredit abbezahlt: keine Rate mehr
        aktuelle_rate = jaehrliche_rate if restschuld > 0 else 0
        jaehrlicher_cashflow = (aktuelle_miete * 12) - aktuelle_rate - (nebenkosten * 12)

        # Eigenkapital = Getilgter Betrag + ursprüngliches EK
        eigenkapital_aufbau = eigenkapital + gesamte_tilgung

        # Gesamtvermögen = Immobilienwert - Restschuld
        gesamtvermoegen = immobilienwert - restschuld

        jahres_projektionen.append({
            "jahr": jahr,
            "restschuld": round(restschuld, 2),
            "getilgt": round(gesamte_tilgung, 2),
            "zinsen_jahr": round(zinsen_jahr, 2),
            "tilgung_jahr": round(tilgung_jahr, 2),
            "jaehrlicher_cashflow": round(jaehrlicher_cashflow, 2),
            "monatlicher_cashflow": round(jaehrlicher_cashflow / 12, 2),
            "immobilienwert": round(immobilienwert, 2),
            "eigenkapital_aufbau": round(eigenkapital_aufbau, 2),
            "gesamtvermoegen": round(gesamtvermoegen, 2),
            "aktuelle_miete": round(aktuelle_miete, 2)
        })

        # Werte für nächstes Jahr anpassen
        aktuelle_miete *= (1 + mietsteigerung / 100)
        immobilienwert *= (1 + wertsteigerung / 100)

        # Wenn Kredit abbezahlt, setze Werte auf 0 aber berechne weiter für vollständige Projektion
        if restschuld <= 0:
            restschuld = 0
            # Weitere Jahre haben keine Kreditkosten mehr

    # Zusammenfassung
    letztes_jahr = jahres_projektionen[-1] if jahres_projektionen else None
    erstes_jahr = jahres_projektionen[0] if jahres_projektionen else None

    zusammenfassung = {
        "finanzierungssumme": round(finanzierungssumme, 2),
        "eigenkapital_start": round(eigenkapital, 2),
        "jaehrliche_rate": round(jaehrliche_rate, 2),
        "monatliche_rate": round(jaehrliche_rate / 12, 2),
        "gesamte_zinsen": round(gesamte_zinsen, 2),
        "gesamte_tilgung": round(gesamte_tilgung, 2),
        "gesamtkosten": round(gesamte_zinsen + finanzierungssumme, 2),
        "restschuld_nach_laufzeit": round(restschuld, 2),
        "immobilienwert_nach_laufzeit": round(letztes_jahr["immobilienwert"], 2) if letztes_jahr else kaufpreis,
        "gesamtvermoegen_nach_laufzeit": round(letztes_jahr["gesamtvermoegen"], 2) if letztes_jahr else eigenkapital,
        "cashflow_jahr_1": round(erstes_jahr["jaehrlicher_cashflow"], 2) if erstes_jahr else 0,
        "cashflow_jahr_final": round(letztes_jahr["jaehrlicher_cashflow"], 2) if letztes_jahr else 0,
        "kredit_abbezahlt_in_jahren": next((j["jahr"] for j in jahres_projektionen if j["restschuld"] <= 0), None)
    }

    return {
        "jahre": jahres_projektionen,
        "zusammenfassung": zusammenfassung
    }


def calculate_breakeven_eigenkapital(
    kaufpreis: float,
    monatliche_miete: float,
    nebenkosten: float,
    zinssatz: float,
    tilgung: float
) -> dict:
    """
    Berechnet das benötigte Eigenkapital für einen neutralen Cashflow (Break-Even).

    Formel: EK = Kaufpreis - (Miete - Nebenkosten) * 12 * 100 / (Zinssatz + Tilgung)

    Args:
        kaufpreis: Kaufpreis der Immobilie
        monatliche_miete: Monatliche Kaltmiete
        nebenkosten: Monatliche Nebenkosten (Hausgeld etc.)
        zinssatz: Jährlicher Zinssatz in %
        tilgung: Jährliche Tilgung in %

    Returns:
        Dict mit Break-Even Eigenkapital und Kennzahlen
    """
    # Verfügbarer Betrag für Kreditrate pro Jahr
    verfuegbar_fuer_kredit = (monatliche_miete - nebenkosten) * 12

    # Gesamtrate in %
    gesamtrate_prozent = zinssatz + tilgung

    # Maximale Finanzierungssumme bei neutralem Cashflow
    if gesamtrate_prozent > 0:
        max_finanzierung = verfuegbar_fuer_kredit * 100 / gesamtrate_prozent
    else:
        max_finanzierung = 0

    # Benötigtes Eigenkapital
    benoetigtes_ek = kaufpreis - max_finanzierung

    # Eigenkapitalquote
    ek_quote = (benoetigtes_ek / kaufpreis * 100) if kaufpreis > 0 else 0

    # Ist das realistisch? (EK zwischen 0% und 100%)
    ist_realistisch = 0 <= benoetigtes_ek <= kaufpreis

    # Monatlicher Cashflow bei Break-Even EK
    monatlicher_cashflow = 0  # Per Definition

    return {
        "benoetigtes_eigenkapital": round(max(0, benoetigtes_ek), 2),
        "eigenkapital_quote_prozent": round(max(0, min(100, ek_quote)), 2),
        "max_finanzierungssumme": round(max(0, max_finanzierung), 2),
        "monatlicher_cashflow": round(monatlicher_cashflow, 2),
        "ist_realistisch": ist_realistisch,
        "verfuegbar_fuer_kredit_jaehrlich": round(verfuegbar_fuer_kredit, 2),
        "hinweis": "Positiver Cashflow" if benoetigtes_ek <= 0 else (
            "Break-Even erreichbar" if ist_realistisch else "100% EK erforderlich für Break-Even"
        )
    }


def generate_scenarios(
    kaufpreis: float,
    monatliche_miete: float,
    nebenkosten: float,
    eigenkapital: float,
    zinssatz: float,
    tilgung: float
) -> list:
    """
    Generiert drei Szenarien: Konservativ, Realistisch, Optimistisch

    Konservativ: Zins +1%, Mietsteigerung 0.5%, 5% Leerstand
    Realistisch: Aktuelle Parameter, 1.5% Mietsteigerung, 2% Leerstand
    Optimistisch: Zins -0.5%, 2.5% Mietsteigerung, 2% Wertsteigerung

    Args:
        kaufpreis: Kaufpreis der Immobilie
        monatliche_miete: Monatliche Kaltmiete
        nebenkosten: Monatliche Nebenkosten
        eigenkapital: Eingesetztes Eigenkapital
        zinssatz: Aktueller Zinssatz in %
        tilgung: Aktuelle Tilgung in %

    Returns:
        Liste mit 3 Szenario-Dicts
    """
    szenarien = []

    # Konservatives Szenario
    konservativ_zins = zinssatz + 1.0
    konservativ_miete = monatliche_miete * 0.95  # 5% Leerstand
    konservativ_tilgungsplan = calculate_tilgungsplan(
        kaufpreis=kaufpreis,
        eigenkapital=eigenkapital,
        zinssatz=konservativ_zins,
        tilgung=tilgung,
        monatliche_miete=konservativ_miete,
        nebenkosten=nebenkosten,
        jahre=30,
        mietsteigerung=0.5,
        wertsteigerung=0.5
    )
    konservativ_cashflow = calculate_cashflow(
        kaufpreis=kaufpreis,
        monatliche_miete=konservativ_miete,
        nebenkosten=nebenkosten,
        eigenkapital=eigenkapital,
        zinssatz=konservativ_zins,
        tilgung=tilgung
    )
    szenarien.append({
        "name": "Konservativ",
        "beschreibung": "Worst-Case mit höheren Zinsen und Leerstand",
        "annahmen": {
            "zinssatz": konservativ_zins,
            "tilgung": tilgung,
            "mietsteigerung_prozent": 0.5,
            "wertsteigerung_prozent": 0.5,
            "leerstand_prozent": 5,
            "effektive_miete": round(konservativ_miete, 2)
        },
        "cashflow_analyse": konservativ_cashflow,
        "tilgungsplan": konservativ_tilgungsplan
    })

    # Realistisches Szenario
    realistisch_miete = monatliche_miete * 0.98  # 2% Leerstand
    realistisch_tilgungsplan = calculate_tilgungsplan(
        kaufpreis=kaufpreis,
        eigenkapital=eigenkapital,
        zinssatz=zinssatz,
        tilgung=tilgung,
        monatliche_miete=realistisch_miete,
        nebenkosten=nebenkosten,
        jahre=30,
        mietsteigerung=1.5,
        wertsteigerung=1.5
    )
    realistisch_cashflow = calculate_cashflow(
        kaufpreis=kaufpreis,
        monatliche_miete=realistisch_miete,
        nebenkosten=nebenkosten,
        eigenkapital=eigenkapital,
        zinssatz=zinssatz,
        tilgung=tilgung
    )
    szenarien.append({
        "name": "Realistisch",
        "beschreibung": "Erwartetes Szenario mit aktuellen Parametern",
        "annahmen": {
            "zinssatz": zinssatz,
            "tilgung": tilgung,
            "mietsteigerung_prozent": 1.5,
            "wertsteigerung_prozent": 1.5,
            "leerstand_prozent": 2,
            "effektive_miete": round(realistisch_miete, 2)
        },
        "cashflow_analyse": realistisch_cashflow,
        "tilgungsplan": realistisch_tilgungsplan
    })

    # Optimistisches Szenario
    optimistisch_zins = max(0.5, zinssatz - 0.5)  # Mindestens 0.5%
    optimistisch_miete = monatliche_miete * 0.98  # 2% Leerstand
    optimistisch_tilgungsplan = calculate_tilgungsplan(
        kaufpreis=kaufpreis,
        eigenkapital=eigenkapital,
        zinssatz=optimistisch_zins,
        tilgung=tilgung,
        monatliche_miete=optimistisch_miete,
        nebenkosten=nebenkosten,
        jahre=30,
        mietsteigerung=2.5,
        wertsteigerung=2.0
    )
    optimistisch_cashflow = calculate_cashflow(
        kaufpreis=kaufpreis,
        monatliche_miete=optimistisch_miete,
        nebenkosten=nebenkosten,
        eigenkapital=eigenkapital,
        zinssatz=optimistisch_zins,
        tilgung=tilgung
    )
    szenarien.append({
        "name": "Optimistisch",
        "beschreibung": "Best-Case mit niedrigeren Zinsen und starker Wertsteigerung",
        "annahmen": {
            "zinssatz": optimistisch_zins,
            "tilgung": tilgung,
            "mietsteigerung_prozent": 2.5,
            "wertsteigerung_prozent": 2.0,
            "leerstand_prozent": 2,
            "effektive_miete": round(optimistisch_miete, 2)
        },
        "cashflow_analyse": optimistisch_cashflow,
        "tilgungsplan": optimistisch_tilgungsplan
    })

    return szenarien


def calculate_sensitivity_analysis(
    kaufpreis: float,
    monatliche_miete: float,
    nebenkosten: float,
    eigenkapital: float,
    zinssatz: float,
    tilgung: float
) -> dict:
    """
    Erstellt eine Sensitivitätsanalyse als Matrix:
    Zeilen: Verschiedene Zinssätze
    Spalten: Verschiedene Eigenkapital-Höhen

    Args:
        kaufpreis: Kaufpreis der Immobilie
        monatliche_miete: Monatliche Kaltmiete
        nebenkosten: Monatliche Nebenkosten
        eigenkapital: Aktuelles Eigenkapital (Referenz)
        zinssatz: Aktueller Zinssatz (Referenz)
        tilgung: Aktuelle Tilgung

    Returns:
        Dict mit Matrix und Achsenbeschriftungen
    """
    # Zinssatz-Variationen: -1%, -0.5%, aktuell, +0.5%, +1%
    zins_variationen = [
        max(0.5, zinssatz - 1.0),
        max(0.5, zinssatz - 0.5),
        zinssatz,
        zinssatz + 0.5,
        zinssatz + 1.0
    ]

    # EK-Variationen: 0%, 10%, 20%, 30%, 40% vom Kaufpreis
    ek_prozente = [0, 10, 20, 30, 40]
    ek_variationen = [kaufpreis * (p / 100) for p in ek_prozente]

    matrix = []

    for zins in zins_variationen:
        zeile = []
        for ek in ek_variationen:
            cashflow = calculate_cashflow(
                kaufpreis=kaufpreis,
                monatliche_miete=monatliche_miete,
                nebenkosten=nebenkosten,
                eigenkapital=ek,
                zinssatz=zins,
                tilgung=tilgung
            )
            zeile.append({
                "monatlicher_cashflow": cashflow["monatlicher_cashflow"],
                "jaehrlicher_cashflow": cashflow["jaehrlicher_cashflow"],
                "selbsttragend": cashflow["selbsttragend"]
            })
        matrix.append(zeile)

    # Finde aktuellen Referenzpunkt
    aktueller_zins_index = zins_variationen.index(zinssatz) if zinssatz in zins_variationen else 2

    # Finde nächsten EK-Index
    aktueller_ek_index = 0
    for i, ek in enumerate(ek_variationen):
        if eigenkapital >= ek:
            aktueller_ek_index = i

    return {
        "matrix": matrix,
        "zinssaetze": [round(z, 2) for z in zins_variationen],
        "eigenkapital_werte": [round(ek, 2) for ek in ek_variationen],
        "eigenkapital_prozente": ek_prozente,
        "aktueller_zins_index": aktueller_zins_index,
        "aktueller_ek_index": aktueller_ek_index,
        "tilgung": tilgung,
        "referenz": {
            "zinssatz": zinssatz,
            "eigenkapital": eigenkapital
        }
    }


def calculate_investment_comparison(
    kaufpreis: float,
    eigenkapital: float,
    monatliche_miete: float,
    nebenkosten: float,
    zinssatz: float,
    tilgung: float,
    jahre: int = 30,
    mietsteigerung: float = 2.5,
    wertsteigerung: float = 2.5,
    nk_steigerung: float = 2.0,
    grenzsteuersatz: float = 0.42,
    afa_satz: float = 0.02,
    etf_rendite: float = 7.0,
    etf_steuer_auf_gewinn: float = 0.1846,
) -> dict:
    """
    Fairer Investment-Vergleich Immobilie vs ETF über volle Laufzeit.

    Methodik:
    - Beide Szenarien committen identisch viel Cash:
        Initial = Eigenkapital + Kaufnebenkosten (~12%)
        Plus jährliche Zuzahlung wenn Cashflow negativ
    - Mieten wachsen jährlich (Default 2,5%) → Zuzahlung sinkt, kippt typisch ins Plus
    - Steuereffekt Immobilie realistisch: Mieteinnahmen versteuert, Zinsen + AfA + nicht-umlagef. NK abzugsfähig
    - Positive Cashflows in Immobilien-Szenario fließen in Side-ETF (gleiche 7% Rendite, faire Vergleichbarkeit)
    - ETF-Endwert nach Steuer: 25% KESt × 1,055 Soli × 70% nach 30% Teilfreistellung Aktienfonds = 18,46% effektiv auf Gewinn
    - Immobilie nach 10 Jahren steuerfrei verkaufbar (§23 EStG Spekufrist) → kein Abzug auf Verkaufsgewinn
    - Kreditrate sinkt auf 0 sobald Restschuld getilgt, Cashflow kann dann stark steigen
    """
    finanzierungssumme = max(0, kaufpreis - eigenkapital)
    kaufnebenkosten = kaufpreis * 0.12
    initial_capital = eigenkapital + kaufnebenkosten if (eigenkapital or 0) > 0 else kaufnebenkosten

    jaehrliche_rate_brutto = finanzierungssumme * (zinssatz + tilgung) / 100
    gebaeudewert = kaufpreis * 0.80  # AfA-Basis (Boden 20%)
    afa_jahr = gebaeudewert * afa_satz

    restschuld = finanzierungssumme
    aktuelle_miete = monatliche_miete
    aktuelle_nk = nebenkosten or 0
    immobilienwert = kaufpreis

    immo_zuzahlungen_total = 0.0
    immo_seite_etf = 0.0
    immo_seite_etf_einzahlungen = 0.0

    etf_alt_value = initial_capital
    etf_alt_einzahlungen = initial_capital

    cashflow_jahr_1_netto = 0.0
    cashflow_jahr_letztes_netto = 0.0
    cashflow_pro_jahr = []

    for jahr in range(1, jahre + 1):
        if restschuld > 0:
            zinsen_jahr = restschuld * (zinssatz / 100)
            tilgung_jahr = min(max(0.0, jaehrliche_rate_brutto - zinsen_jahr), restschuld)
            rate_jahr = zinsen_jahr + tilgung_jahr
        else:
            zinsen_jahr = 0.0
            tilgung_jahr = 0.0
            rate_jahr = 0.0
        restschuld = max(0.0, restschuld - tilgung_jahr)

        jahresmiete = aktuelle_miete * 12
        jahresnk = aktuelle_nk * 12
        cashflow_brutto = jahresmiete - rate_jahr - jahresnk

        # Steuerlich: Mieteinnahmen - (Zinsen + AfA + nicht-umlagef. NK) = stbarer V&V-Gewinn/Verlust
        steuerbarer_gewinn = jahresmiete - zinsen_jahr - jahresnk - afa_jahr
        steuer_oder_ersparnis = steuerbarer_gewinn * grenzsteuersatz
        cashflow_netto = cashflow_brutto - steuer_oder_ersparnis

        if jahr == 1:
            cashflow_jahr_1_netto = cashflow_netto
        if jahr == jahre:
            cashflow_jahr_letztes_netto = cashflow_netto

        # Property scenario: side-ETF wächst, positive Cashflows fließen rein
        immo_seite_etf *= (1 + etf_rendite / 100)
        if cashflow_netto < 0:
            immo_zuzahlungen_total += -cashflow_netto
        else:
            immo_seite_etf += cashflow_netto
            immo_seite_etf_einzahlungen += cashflow_netto

        # ETF-only scenario: gleicher Out-of-Pocket-Stream
        etf_alt_value *= (1 + etf_rendite / 100)
        if cashflow_netto < 0:
            zusatz = -cashflow_netto
            etf_alt_value += zusatz
            etf_alt_einzahlungen += zusatz

        cashflow_pro_jahr.append({
            "jahr": jahr,
            "monatlicher_cashflow_netto": round(cashflow_netto / 12, 2),
            "restschuld": round(restschuld, 2),
            "immobilienwert": round(immobilienwert * (1 + wertsteigerung / 100), 2),
        })

        aktuelle_miete *= (1 + mietsteigerung / 100)
        aktuelle_nk *= (1 + nk_steigerung / 100)
        immobilienwert *= (1 + wertsteigerung / 100)

    immobilien_equity = immobilienwert - restschuld

    # Side-ETF nach Steuer
    immo_seite_etf_gewinn = max(0.0, immo_seite_etf - immo_seite_etf_einzahlungen)
    immo_seite_etf_steuer = immo_seite_etf_gewinn * etf_steuer_auf_gewinn
    immo_seite_etf_netto = immo_seite_etf - immo_seite_etf_steuer

    immobilien_endvermoegen = immobilien_equity + immo_seite_etf_netto

    # ETF-only nach Steuer
    etf_alt_gewinn = max(0.0, etf_alt_value - etf_alt_einzahlungen)
    etf_alt_steuer = etf_alt_gewinn * etf_steuer_auf_gewinn
    etf_alt_netto = etf_alt_value - etf_alt_steuer

    # ETF nur EK (legacy view: nur Initialbetrag, keine monatliche Sparrate)
    etf_nur_ek_brutto = initial_capital * ((1 + etf_rendite / 100) ** jahre)
    etf_nur_ek_steuer = max(0.0, etf_nur_ek_brutto - initial_capital) * etf_steuer_auf_gewinn
    etf_nur_ek_netto = etf_nur_ek_brutto - etf_nur_ek_steuer

    monatliche_zuzahlung_jahr_1 = max(0.0, -cashflow_jahr_1_netto) / 12

    return {
        "immobilie": {
            "endvermoegen": round(immobilien_endvermoegen, 2),
            "immobilien_equity": round(immobilien_equity, 2),
            "side_etf_netto": round(immo_seite_etf_netto, 2),
            "eingesetztes_kapital": round(initial_capital, 2),
            "summe_zuzahlungen": round(immo_zuzahlungen_total, 2),
            "monatliche_zuzahlung": round(monatliche_zuzahlung_jahr_1, 2),
            "monatliche_zuzahlung_jahr_1": round(monatliche_zuzahlung_jahr_1, 2),
            "cashflow_jahr_1_monat": round(cashflow_jahr_1_netto / 12, 2),
            "cashflow_jahr_letztes_monat": round(cashflow_jahr_letztes_netto / 12, 2),
            "rendite_faktor": round(immobilien_endvermoegen / initial_capital, 2) if initial_capital > 0 else 0,
            "immobilienwert_endjahr": round(immobilienwert, 2),
            "restschuld_endjahr": round(restschuld, 2),
            "gesamtinvestition": round(initial_capital + immo_zuzahlungen_total, 2),
        },
        "etf_nur_eigenkapital": {
            "endvermoegen": round(etf_nur_ek_netto, 2),
            "endvermoegen_brutto": round(etf_nur_ek_brutto, 2),
            "steuer_abgezogen": round(etf_nur_ek_steuer, 2),
            "angenommene_rendite": etf_rendite,
            "eingesetztes_kapital": round(initial_capital, 2),
        },
        "etf_mit_sparrate": {
            "endvermoegen": round(etf_alt_netto, 2),
            "endvermoegen_brutto": round(etf_alt_value, 2),
            "steuer_abgezogen": round(etf_alt_steuer, 2),
            "monatliche_sparrate": round(monatliche_zuzahlung_jahr_1, 2),
            "monatliche_sparrate_jahr_1": round(monatliche_zuzahlung_jahr_1, 2),
            "gesamtinvestition": round(etf_alt_einzahlungen, 2),
        },
        "annahmen": {
            "wertsteigerung_pa": wertsteigerung,
            "mietsteigerung_pa": mietsteigerung,
            "nk_steigerung_pa": nk_steigerung,
            "etf_rendite_pa": etf_rendite,
            "grenzsteuersatz": grenzsteuersatz,
            "afa_satz": afa_satz,
            "etf_steuer_auf_gewinn": etf_steuer_auf_gewinn,
            "spekufrist_immobilie_steuerfrei_nach_jahren": 10,
        },
        "cashflow_pro_jahr": cashflow_pro_jahr,
        "vergleich": {
            "immobilie_vs_etf_nur_ek": round(immobilien_endvermoegen - etf_nur_ek_netto, 2),
            "immobilie_vs_etf_sparrate": round(immobilien_endvermoegen - etf_alt_netto, 2),
            "immobilie_besser_als_etf": immobilien_endvermoegen > etf_alt_netto,
        },
    }


def calculate_key_milestones(
    kaufpreis: float,
    eigenkapital: float,
    zinssatz: float,
    tilgung: float,
    monatliche_miete: float,
    nebenkosten: float
) -> dict:
    """
    Berechnet wichtige Meilensteine der Investition.
    """
    tilgungsplan = calculate_tilgungsplan(
        kaufpreis=kaufpreis,
        eigenkapital=eigenkapital,
        zinssatz=zinssatz,
        tilgung=tilgung,
        monatliche_miete=monatliche_miete,
        nebenkosten=nebenkosten,
        jahre=40  # Längerer Zeitraum für Meilensteine
    )

    jahre = tilgungsplan["jahre"]
    finanzierungssumme = kaufpreis - eigenkapital

    # Meilensteine finden
    meilensteine = {
        "kredit_25_prozent_getilgt": None,
        "kredit_50_prozent_getilgt": None,
        "kredit_75_prozent_getilgt": None,
        "kredit_komplett_getilgt": None,
        "erster_positiver_cashflow": None,
        "eigenkapital_verdoppelt": None,
        "vermögen_100k_erreicht": None,
        "vermögen_250k_erreicht": None,
        "vermögen_500k_erreicht": None
    }

    for jahr_daten in jahre:
        jahr = jahr_daten["jahr"]
        getilgt_prozent = (jahr_daten["getilgt"] / finanzierungssumme * 100) if finanzierungssumme > 0 else 0

        if meilensteine["kredit_25_prozent_getilgt"] is None and getilgt_prozent >= 25:
            meilensteine["kredit_25_prozent_getilgt"] = jahr
        if meilensteine["kredit_50_prozent_getilgt"] is None and getilgt_prozent >= 50:
            meilensteine["kredit_50_prozent_getilgt"] = jahr
        if meilensteine["kredit_75_prozent_getilgt"] is None and getilgt_prozent >= 75:
            meilensteine["kredit_75_prozent_getilgt"] = jahr
        if meilensteine["kredit_komplett_getilgt"] is None and jahr_daten["restschuld"] <= 0:
            meilensteine["kredit_komplett_getilgt"] = jahr

        if meilensteine["erster_positiver_cashflow"] is None and jahr_daten["monatlicher_cashflow"] > 0:
            meilensteine["erster_positiver_cashflow"] = jahr

        # Eigenkapital = tatsaechlich eingesetztes Geld (EK + Kaufnebenkosten)
        tatsaechliches_ek = eigenkapital + (kaufpreis * 0.12) if eigenkapital > 0 else kaufpreis * 0.12
        if meilensteine["eigenkapital_verdoppelt"] is None and tatsaechliches_ek > 0 and jahr_daten["eigenkapital_aufbau"] >= tatsaechliches_ek * 2:
            meilensteine["eigenkapital_verdoppelt"] = jahr

        if meilensteine["vermögen_100k_erreicht"] is None and jahr_daten["gesamtvermoegen"] >= 100000:
            meilensteine["vermögen_100k_erreicht"] = jahr
        if meilensteine["vermögen_250k_erreicht"] is None and jahr_daten["gesamtvermoegen"] >= 250000:
            meilensteine["vermögen_250k_erreicht"] = jahr
        if meilensteine["vermögen_500k_erreicht"] is None and jahr_daten["gesamtvermoegen"] >= 500000:
            meilensteine["vermögen_500k_erreicht"] = jahr

    return meilensteine


def calculate_rental_variations(
    kaufpreis: float,
    eigenkapital: float,
    zinssatz: float,
    tilgung: float,
    aktuelle_miete: float,
    nebenkosten: float
) -> list:
    """
    Berechnet verschiedene Miet-Szenarien.
    """
    variationen = []

    # Verschiedene Miethöhen testen: -20%, -10%, aktuell, +10%, +20%
    prozente = [-20, -10, 0, 10, 20]

    for prozent in prozente:
        miete = aktuelle_miete * (1 + prozent/100)
        cashflow = calculate_cashflow(
            kaufpreis=kaufpreis,
            monatliche_miete=miete,
            nebenkosten=nebenkosten,
            eigenkapital=eigenkapital,
            zinssatz=zinssatz,
            tilgung=tilgung
        )

        variationen.append({
            "miete_aenderung_prozent": prozent,
            "monatliche_miete": round(miete, 2),
            "monatlicher_cashflow": cashflow["monatlicher_cashflow"],
            "jaehrlicher_cashflow": cashflow["jaehrlicher_cashflow"],
            "selbsttragend": cashflow["selbsttragend"],
            "bruttorendite": cashflow["bruttorendite_prozent"]
        })

    return variationen


def calculate_financing_options(
    kaufpreis: float,
    monatliche_miete: float,
    nebenkosten: float,
    eigenkapital: float
) -> list:
    """
    Vergleicht verschiedene Finanzierungsoptionen.
    """
    optionen = []

    # Verschiedene Zins/Tilgung Kombinationen
    kombinationen = [
        {"name": "Niedrige Rate", "zins": 4.1, "tilgung": 1.0},
        {"name": "Standard", "zins": 4.3, "tilgung": 1.5},
        {"name": "Schnelle Tilgung", "zins": 4.3, "tilgung": 2.0},
        {"name": "Aggressive Tilgung", "zins": 4.3, "tilgung": 3.0},
        {"name": "Hoher Zins Szenario", "zins": 5.0, "tilgung": 1.5},
    ]

    for kombi in kombinationen:
        cashflow = calculate_cashflow(
            kaufpreis=kaufpreis,
            monatliche_miete=monatliche_miete,
            nebenkosten=nebenkosten,
            eigenkapital=eigenkapital,
            zinssatz=kombi["zins"],
            tilgung=kombi["tilgung"]
        )

        # Berechne wie lange bis abbezahlt (logarithmische Annuitaetenformel)
        tilgung_prozent = kombi["tilgung"]
        zinssatz_prozent = kombi["zins"]
        kredit = kaufpreis - eigenkapital
        if zinssatz_prozent > 0 and tilgung_prozent > 0:
            r = zinssatz_prozent / 100 / 12  # monthly interest rate
            payment = kredit * (zinssatz_prozent + tilgung_prozent) / 100 / 12
            if payment > kredit * r:
                jahre_bis_abbezahlt = round(-math.log(1 - (kredit * r / payment)) / math.log(1 + r) / 12)
            else:
                jahre_bis_abbezahlt = 99
        else:
            jahre_bis_abbezahlt = round(100 / max(tilgung_prozent, 0.1))

        optionen.append({
            "name": kombi["name"],
            "zinssatz": kombi["zins"],
            "tilgung": kombi["tilgung"],
            "monatliche_rate": cashflow["monatliche_rate"],
            "monatlicher_cashflow": cashflow["monatlicher_cashflow"],
            "selbsttragend": cashflow["selbsttragend"],
            "jahre_bis_abbezahlt": jahre_bis_abbezahlt,
            "gesamtkosten_geschaetzt": round(cashflow["monatliche_rate"] * 12 * jahre_bis_abbezahlt, 2)
        })

    return optionen


def _extract_kriterien_from_ai(ai_analysis: dict) -> list:
    """Normalisiert die KI-Antwort zur kanonischen Form [{name, score, begruendung}, ...].

    Unterstuetzt zwei Formate:
    - Alt (vor Progressive-Sections): ai_analysis["kriterien"] = [{name, score, begründung}]
      (so persistiert in alten DB-Eintraegen)
    - Neu: ai_analysis["kriterien_scores"] + ai_analysis["kriterien_begründungen"]
      (split fuer Progressive-Loading: Scores kommen frueh im Stream, Begruendungen spaet)
    """
    if "kriterien" in ai_analysis and isinstance(ai_analysis["kriterien"], list):
        return ai_analysis["kriterien"]

    scores = ai_analysis.get("kriterien_scores", []) or []
    begs_list = ai_analysis.get("kriterien_begründungen", []) or []
    begs_by_name = {c.get("name"): c.get("begründung", "") for c in begs_list if c.get("name")}

    merged = []
    for sc in scores:
        name = sc.get("name")
        if not name:
            continue
        merged.append({
            "name": name,
            "score": sc.get("score", 0),
            "begründung": begs_by_name.get(name, ""),
        })
    return merged


def build_main_analysis_prompt(
    data,
    request,
    marktdaten,
    no_go_check,
    warnsignale,
    investment_metriken,
    fairer_preis_result,
    foerderungen_empfehlung,
    cashflow_analyse,
    weights,
    zweck,
):
    """Baut den Sonnet-Prompt fuer die Haupt-KI-Bewertung.

    Single source of truth: wird sowohl von /analyze als auch /analyze/stream
    aufgerufen, damit beide Endpoints exakt denselben Prompt nutzen und kein
    Scoring-Drift zwischen den beiden entsteht.
    """
    marktdaten_hinweis = ""
    if marktdaten:
        if marktdaten.get("recherche_methode") == "live_web_search_v3":
            marktdaten_hinweis = "[OK] LIVE-MARKTDATEN ERFOLGREICH RECHERCHIERT"
        else:
            marktdaten_hinweis = "[WARN] FALLBACK-DATEN - Bewertung mit Vorsicht!"

    vergleichs_label = (marktdaten.get("vergleichs_label") if marktdaten else None) or (
        f"Stadtteil-Durchschnitt ({data.stadtteil}, {data.stadt})" if marktdaten and marktdaten.get("ist_stadtteil_spezifisch") and data.stadtteil and data.stadt
        else (f"Markt in {data.stadt}" if data.stadt else "Markt-Durchschnitt")
    )
    ist_stadtteil_spezifisch = bool(marktdaten and marktdaten.get("ist_stadtteil_spezifisch"))

    return f"""Analysiere diese Immobilie professionell und bewerte jedes Kriterium mit einem Score von 0-100.

[WICHTIG] V3.0 WICHTIG: Du MUSST die LIVE-RECHERCHIERTEN MARKTDATEN unten verwenden!
Vergleiche den Kaufpreis IMMER mit den aktuellen €/m²-Preisen für diesen KONKRETEN Standort!

=== IMMOBILIENDATEN ===
{json.dumps(data.dict(), indent=2, ensure_ascii=False)}

=== VERWENDUNGSZWECK ===
{zweck}

=== BESICHTIGUNG ===
{"Der Käufer war BEREITS bei der Besichtigung." if request.besichtigt else "Der Käufer war NOCH NICHT bei der Besichtigung."}
{f"Notizen des Käufers von der Besichtigung: {request.besichtigungs_notizen}" if request.besichtigungs_notizen else ""}

=== [WICHTIG] LIVE-MARKTDATEN FÜR DIESEN STANDORT ({marktdaten_hinweis}) ===
{json.dumps(marktdaten, indent=2, ensure_ascii=False) if marktdaten else "FEHLER: Keine Marktdaten!"}

PFLICHT-VERGLEICH:
- Objektpreis/m²: {round(data.kaufpreis / data.wohnflaeche, 2) if data.kaufpreis and data.wohnflaeche else "Unbekannt"} €/m²
- {vergleichs_label}: {marktdaten.get('kaufpreis_qm_durchschnitt', 'Unbekannt') if marktdaten else 'Unbekannt'} €/m²
- Bewertung: {"UNTER Markt [OK]" if marktdaten and data.kaufpreis and data.wohnflaeche and (data.kaufpreis/data.wohnflaeche) < marktdaten.get('kaufpreis_qm_durchschnitt', 999999) else "ÜBER Markt [WARN]" if marktdaten else "Keine Daten"}

[KRITISCH] STANDORT-VERGLEICH (NICHT IGNORIEREN!):
{"Die Marktdaten sind STADTTEIL-SPEZIFISCH fuer " + str(data.stadtteil) + ", " + str(data.stadt) + ". Du MUSST den Vergleich IMMER mit dem Stadtteil-Preis machen, NICHT mit dem Stadt-Durchschnitt." if ist_stadtteil_spezifisch else "Die Marktdaten beziehen sich auf " + (str(data.stadt) if data.stadt else "den Standort") + " (kein Stadtteil-spezifischer Wert verfuegbar)."}
- Verwende in der Zusammenfassung und in allen Begruendungen den Begriff "{vergleichs_label}", NICHT "Hamburger/Berliner/Muenchner Marktdurchschnitt".
- Beispiel KORREKT: "3.679 EUR/m2 liegen rund 8% unter dem {vergleichs_label} (4.000 EUR/m2)".
- Beispiel FALSCH: "3.679 EUR/m2 liegen rund 34% unter dem Hamburger Marktdurchschnitt (5.550 EUR/m2)".
- Stadt-Durchschnittswerte sind irrefuehrend, weil Stadtteile stark variieren. Vergleiche IMMER auf Stadtteil-Ebene.

=== NO-GO-PRÜFUNG ===
{json.dumps(no_go_check, indent=2, ensure_ascii=False)}
[WARN] WICHTIG: Bei No-Gos Alternativen und Verbesserungsvorschläge geben!

=== WARNSIGNALE ===
{json.dumps(warnsignale, indent=2, ensure_ascii=False)}

=== INVESTMENT-METRIKEN (Kapitalanlage) ===
{json.dumps(investment_metriken, indent=2, ensure_ascii=False) if investment_metriken else "Nicht berechnet"}

=== FAIRER PREIS BERECHNUNG ===
{json.dumps(fairer_preis_result, indent=2, ensure_ascii=False) if fairer_preis_result else "Nicht berechnet"}

=== FÖRDERUNGEN ===
{json.dumps(foerderungen_empfehlung, indent=2, ensure_ascii=False) if foerderungen_empfehlung else "Keine passenden Förderungen"}

=== CASHFLOW-ANALYSE ===
{json.dumps(cashflow_analyse, indent=2, ensure_ascii=False) if cashflow_analyse else "Nicht berechnet"}

{"=== ACHTUNG: WARMMIETE-KORREKTUR ===" + chr(10) + f"Im Exposé war NUR eine Warmmiete von {data.warmmiete_aus_expose}€ angegeben (KEINE Kaltmiete)." + chr(10) + f"Die Kaltmiete wurde auf {data.aktuelle_miete}€ geschätzt. ALLE Berechnungen basieren auf dieser geschätzten Kaltmiete." + chr(10) + "DU MUSST den Nutzer in deiner Analyse DEUTLICH darauf hinweisen, dass die Miete aus der Warmmiete abgeleitet wurde und er den tatsächlichen Mietvertrag prüfen soll!" + chr(10) if data.miete_typ_im_expose == "warmmiete" and data.warmmiete_aus_expose else ""}
Standard-Finanzierung: 4.0% Zins + 1.25% Tilgung = 5.25% Gesamtrate

=== BEWERTUNGSKRITERIEN für {zweck.upper()} ===
{json.dumps(weights, indent=2, ensure_ascii=False)}

[WICHTIG] V3.0 - BEWERTUNGSREGELN MIT LIVE-DATEN:

{"" if zweck == "eigennutzung" else """1. **cashflow_rendite** (Gewichtung: """ + str(weights['cashflow_rendite']) + """%)
   - Kaufpreisfaktor: <20 sehr gut, 20-25 akzeptabel, 25-30 kritisch, >30 schlecht
   - Bruttorendite: >5% sehr gut, 4-5% gut, 3.5-4% knapp, <3.5% schlecht (bei aktuellen Zinsen von 4,3% (Oktober 2026) ist <4,3% Bruttorendite = negativer Leverage!)
   - Cashflow-Bewertung REALISTISCH:
     * Cashflow VOR Steuer ist die primaere Kennzahl
     * Positiver Cashflow = Score 70-100
     * Leicht negativer Cashflow (bis -100 EUR/Monat) = Score 45-65
     * Negativer Cashflow (-100 bis -300 EUR/Monat) = Score 25-45
     * Stark negativer Cashflow (unter -300 EUR/Monat) = Score 10-25
     * Steuereffekte koennen den Score um maximal +10 Punkte verbessern, NICHT mehr
     * WICHTIG: Steuervorteile sind Stundung, KEIN Geschenk. Ein Investment das nur wegen Steuern funktioniert ist KEIN gutes Investment.
   - Neuvermietungspotenzial:
     * Kann den Score um maximal +5-10 Punkte verbessern
     * Aber NUR wenn die aktuelle Miete nachweislich deutlich unter Markt liegt (>20% unter Markt)
     * Leerstehende Wohnungen (geschaetzte Miete) bekommen einen Abzug von -5 Punkten (Vermietungsrisiko)
   - STAFFELMIETE BONUS:
     * Wenn ein Staffelmietvertrag vorliegt (vertraglich gesicherte Mieterhoehungen), ist das ein STARKER Pluspunkt
     * Staffelmiete = planbare, gesicherte Einkommenssteigerung ohne Verhandlung oder Mietspiegel-Abhaengigkeit
     * Score-Bonus: +8-12 Punkte auf cashflow_rendite wenn Staffelmiete vorhanden
     * Erwaehne die Staffelmiete explizit in der Zusammenfassung und den Staerken
"""}{"1. **cashflow_rendite** (Gewichtung: 0% - NICHT RELEVANT fuer Eigennutzung)" + chr(10) + "   - Bewerte trotzdem mit einem Score, aber dieser fliesst NICHT in den Gesamtscore ein." + chr(10) + "   - Gib einen fairen Score basierend auf monatlicher Belastung vs. vergleichbare Miete." + chr(10) if zweck == "eigennutzung" else ""}
2. **lage** (Gewichtung: {weights['lage']}%)
   - Stadtteil-Bewertung aus LIVE-Marktdaten
   - Standort-Faktoren beruecksichtigen (Uni, Wirtschaft, OEPNV)
{"   - EIGENNUTZUNG: Besonders wichtig! Infrastruktur, Einkaufsmoeglichkeiten, Schulen, Aerzte, Gruenflaechen, Laermbelastung" if zweck == "eigennutzung" else ""}

3. **kaufpreis_qm** (Gewichtung: {weights['kaufpreis_qm']}%) [WICHTIG] LIVE-DATEN PFLICHT!
   - MUSS gegen LIVE-Marktdurchschnitt verglichen werden!
   - Unter Markt = hoher Score, ueber Markt = niedriger Score
   - Scoring-Tabelle:
     * >20% unter Markt = Score 95-100 (aussergewoehnlicher Einkauf!)
     * 10-20% unter Markt = Score 80-95
     * 0-10% unter Markt = Score 65-80
     * 0-10% ueber Markt = Score 50-65
     * 10-20% ueber Markt = Score 30-50
     * >20% ueber Markt = Score 10-30

4. **zukunftspotenzial** (Gewichtung: {weights['zukunftspotenzial']}%)
   - Tendenz aus LIVE-Marktdaten (steigend/stabil/fallend)
   - Prognose beruecksichtigen
   - INFRASTRUKTURPROJEKTE erkennen und stark gewichten:
     * Geplante U-Bahn/S-Bahn-Anbindung (z.B. U4, U5) = Score +15-25 Punkte (Game-Changer fuer Wertsteigerung!)
     * Neue Einkaufszentren, Universitaeten, Gewerbegebiete in der Naehe = Score +5-10
     * Stadtentwicklungsgebiete (z.B. HafenCity-Erweiterung, Oberbillwerder) = Score +10-15
     * Erwaehne konkrete Projekte in der Begruendung wenn bekannt
{"   - EIGENNUTZUNG: Wertsteigerung ist relevant fuer langfristigen Vermoegensaufbau auch bei Selbstnutzung" if zweck == "eigennutzung" else ""}

5. **zustand_baujahr** (Gewichtung: {weights['zustand_baujahr']}%)
   - Zustand, Baujahr, Sanierungsbedarf
   - Fertighaeuser 1960-1990 kritisch pruefen
   - DENKMALSCHUTZ-BONUS: Wenn das Objekt unter Denkmalschutz steht:
     * Denkmal-AfA = 100% der Sanierungskosten absetzbar in 12 Jahren (8x9% + 4x7%) bei Vermietung
     * Das ist der staerkste Steuervorteil bei Immobilien ueberhaupt
     * Score-Bonus: +10-15 Punkte auf zustand_baujahr
     * Erwaehne in Staerken: "Denkmalschutz mit Denkmal-AfA (§7i EStG) -- 100% Sanierungskosten absetzbar"
     * ABER: Denkmalschutz bedeutet auch Auflagen (Abstimmung mit Behoerde VOR jeder Sanierung) -- erwaehne in Schwaechen
{"   - EIGENNUTZUNG: Bewerte grosszuegiger! Ein renovierungsbeduerfiger Altbau ist fuer Eigennutzer oft OK (man kann selbst renovieren). Bewerte den CHARME und das POTENZIAL, nicht nur den aktuellen Zustand. Score mindestens 50 wenn keine gravierenden Maengel." if zweck == "eigennutzung" else ""}

6. **energieeffizienz** (Gewichtung: {weights['energieeffizienz']}%)
   - Energieklasse (G/H = Sanierung empfohlen, KfW 261 pruefen!)

7. **nebenkosten** (Gewichtung: {weights['nebenkosten']}%)
   - Hausgeld/Nebenkosten im Verhaeltnis

8. **grundriss** (Gewichtung: {weights['grundriss']}%)
{"   - EIGENNUTZUNG: SEHR WICHTIG (20% Gewichtung)! Bewerte ausfuehrlich:" + chr(10) + "     * Zimmeranzahl fuer Haushaltsgroesse (2 Zimmer = Paar/Single OK, 3+ = Familie)" + chr(10) + "     * Raumaufteilung und Schnitt (offene Kueche, Durchgangszimmer, Bad mit Fenster)" + chr(10) + "     * Balkon/Terrasse/Garten vorhanden?" + chr(10) + "     * Abstellraum/Keller?" + chr(10) + "     * Ausrichtung (Sueden = besser)" + chr(10) + "     * Stockwerk (Erdgeschoss vs. Dachgeschoss)" + chr(10) + "     * WENN WENIG INFOS: Bewerte neutral mit Score 60-65, NICHT niedrig! Fehlende Grundriss-Infos duerfen den Score nicht ruinieren." if zweck == "eigennutzung" else "   - Zimmerzahl, Schnitt, Ausstattung"}

9. **verkäufertyp** (Gewichtung: {weights['verkäufertyp']}%)
   - Privat vs. Makler, Provision

WICHTIG - V6.0 PHILOSOPHIE (PROFESSIONELL, REALISTISCH, GESAMTBILD):
- IMMER Live-Marktdaten in der Begruendung zitieren!
- Du bist ein professioneller Immobilienberater. Sprich wie ein serioeser Berater.
- NIEMALS absolute Kaufempfehlungen oder Kaufwarnungen. Du gibst EINSCHAETZUNGEN.
- Formuliere als Einschaetzung: "aus unserer Sicht", "nach unserer Analyse"
- KEINE widersprüchlichen Aussagen! Score und Text MUESSEN zusammenpassen:
  * Score <40 = NICHT "gemischtes Bild" sagen! Das ist klar negativ.
  * Score 40-55 = "gemischt" oder "pruefenswert" ist OK
  * Score >55 = positiv formulieren
{"" if zweck == "eigennutzung" else '''
PREIS-BEWERTUNG (WICHTIG - REALISTISCHE EINORDNUNG):
- Bis 10% über Markt = "leicht über Marktdurchschnitt" (NICHT "deutlich überteuert"!)
- 10-20% über Markt = "über Marktdurchschnitt"
- 20-30% über Markt = "deutlich über Markt"
- Über 30% über Markt = "stark überteuert"
- Unter Markt = IMMER positiv hervorheben!'''}

FAIRER PREIS (WICHTIG - REALISTISCH BLEIBEN):
- Der faire Preis darf MAXIMAL 25% unter dem Kaufpreis liegen! Mehr als 25% Rabatt ist unrealistisch.
- Wenn die Berechnung einen fairen Preis ergibt der >25% unter Kaufpreis liegt, setze ihn auf Kaufpreis minus 25%.
- Begruende den fairen Preis mit Marktdaten und konkreten Maengeln.

{"EIGENNUTZUNG - BEWERTUNGSPHILOSOPHIE (KRITISCH WICHTIG):" + chr(10) + "- Bei Eigennutzung geht es um WOHNQUALITAET und PREIS-LEISTUNG, NICHT um Rendite!" + chr(10) + "- Monatliche Belastung (Kreditrate + Hausgeld) vs. vergleichbare Miete ist der wichtigste Vergleich" + chr(10) + "- Wenn Kaufen guenstiger oder gleich teuer wie Mieten ist = POSITIV (man baut Vermoegen auf!)" + chr(10) + "- Unter Marktpreis kaufen = EXZELLENT fuer Eigennutzer (sofortiger Vermoegensgewinn)" + chr(10) + "- Lage und Grundriss sind die wichtigsten Kriterien - hier lebt man!" + chr(10) + "- FEHLENDE INFOS zu Grundriss/Zustand: NEUTRAL bewerten (Score 60-65), NICHT bestrafen!" + chr(10) + "- Ein Objekt 18% unter Markt in guter Lage ist fuer Eigennutzer EMPFEHLENSWERT (Score 65-80)!" + chr(10) + "- Energieklasse ist weniger kritisch - man kann schrittweise sanieren mit KfW-Foerderung" + chr(10) + "- STEUERFREIER VERKAUF: Nach nur 3 Jahren Selbstnutzung (im Kaufjahr + 2 Folgejahre) ist der Verkauf komplett steuerfrei (§23 EStG)! Das ist ein RIESIGER Vorteil gegenueber Kapitalanlage (10 Jahre Spekulationsfrist). Erwaehne dies in der Zusammenfassung als Pluspunkt!" if zweck == "eigennutzung" else '''GESAMTBILD BEWERTEN (KRITISCH WICHTIG - EHRLICH UND AUSGEWOGEN!):
- Du bewertest das GESAMTBILD: Cashflow, Potenzial, Steuereffekt, Wertsteigerung, Lage.
- Aber bleibe REALISTISCH -- kein Schoenreden von schlechten Zahlen!

CASHFLOW-BEWERTUNG:
- Cashflow VOR Steuer ist die primaere Kennzahl.
- Negativer Cashflow ist ein Minuspunkt, aber NICHT automatisch ein K.O.-Kriterium.
- JEDOCH: Bei negativem Cashflow MUSS der Steuereffekt und das Neuvermietungspotenzial den Verlust realistisch kompensieren koennen.
- Cashflow-Toleranz: bis -0.08% des Kaufpreises/Monat VOR Steuer ist akzeptabel (z.B. bei 300.000 EUR = max -240 EUR/Monat).
- Darueber hinaus = klarer Score-Abzug im cashflow_rendite Kriterium.

STEUEREFFEKT:
- Steuervorteile (AfA + Zinsabzug) duerfen den cashflow_rendite Score um bis zu +15 Punkte verbessern.
- ABER: AfA ist Steuerstundung, kein Geschenk. Erwaehne das in der Begruendung.
- Ein Investment das NUR wegen Steuern funktioniert sollte maximal Score 55 bekommen.

NEUVERMIETUNGSPOTENZIAL:
- Wenn die aktuelle Miete nachweislich unter Markt liegt, ist das ein echter Pluspunkt.
- Darf den cashflow_rendite Score um bis zu +10-15 Punkte verbessern.
- ABER: Bei alten Mietern (ueber 70) ist Neuvermietung unrealistisch auf absehbare Zeit -> nur +5 Punkte maximal.
- Bei leerstehenden Wohnungen: geschaetzte Miete ist unsicher, leichter Abzug (-3 Punkte).

WERTSTEIGERUNG:
- Fliesse in zukunftspotenzial ein, NICHT in cashflow_rendite.
- Unter Markt kaufen = guter Einkauf, aber rettet keinen negativen Cashflow.

SANIERUNGSRISIKEN:
- Oel-Heizung = GEG-Sanierungspflicht absehbar, Kosten 20.000-35.000 EUR -> zustand_baujahr Score maximal 45
- Gas-Heizung bei Baujahr vor 1990 = mittelfristiger Handlungsbedarf -> zustand_baujahr Score maximal 60
- Energieklasse F/G/H = energieeffizienz Score maximal 35
- Energieklasse E = energieeffizienz Score maximal 55

KAUFPREISFAKTOR:
- Bei aktuellen Zinsen von 4,3% (Oktober 2026): Kaufpreisfaktor ueber 23 bedeutet fast immer negativen Cashflow.
- Kaufpreisfaktor 25-30 mit negativem Cashflow = cashflow_rendite Score maximal 50
- Kaufpreisfaktor ueber 30 = cashflow_rendite Score maximal 35

MIETER-SITUATION (WICHTIG fuer Verbesserungsvorschlaege und Schwaechen!):
- Wenn die Wohnung VERMIETET ist und die Miete deutlich unter Markt liegt, MUSS die Analyse folgendes ansprechen:
  1) Wie lange der Mieter schon drin wohnt (aus Einzugsdatum berechnen)
  2) Kuendigungsschutz: Je laenger der Mieter wohnt, desto schwieriger die Kuendigung
     * Ueber 8 Jahre = 9 Monate Kuendigungsfrist
     * Aeltere Mieter (ueber 65) = Haertefall-Schutz, Eigenbedarfskuendigung extrem schwierig
     * Mieter ueber 20 Jahre = praktisch unkuendbar ausser bei schweren Vertragsverstoessen
  3) Realistische Optionen fuer den Kaeufer:
     * Aufhebungsvertrag anbieten (Abfindung typisch 3-12 Monatsmieten, manchmal mehr bei alten Mietern)
     * Mieterhoehung nach §558 BGB bis zur ortsueblichen Vergleichsmiete (Kappungsgrenze 15% in Hamburg alle 3 Jahre)
     * Modernisierungsumlage §559 BGB (8% der Kosten/Jahr, Kappung 2-3 EUR/m2 in 6 Jahren)
     * Abwarten und Neuvermietung bei natuerlichem Auszug
     * Eigenbedarfskuendigung NUR bei tatsaechlichem Eigenbedarf und NICHT bei Kapitalanlage
  4) In den Verbesserungsvorschlaegen konkrete Strategien zur Mietsteigerung nennen mit realistischen Zeitrahmen
  5) In den Schwaechen ehrlich erwaehnen wenn Neuvermietung auf absehbare Zeit unrealistisch ist'''}

[KRITISCH] AUSGABE-REIHENFOLGE: Du MUSST die JSON-Keys in EXAKT dieser Reihenfolge ausgeben:
1. kriterien_scores
2. zusammenfassung
3. stärken
4. schwächen
5. fairer_preis
6. kriterien_begründungen

Die Reihenfolge ist load-bearing fuer Progressive-Loading im Frontend. Halte dich strikt daran.

Antworte als JSON in GENAU dieser Struktur und Key-Reihenfolge:
{{
    "kriterien_scores": [
        {{"name": "cashflow_rendite", "score": <0-100>}},
        {{"name": "lage", "score": <0-100>}},
        {{"name": "kaufpreis_qm", "score": <0-100>}},
        {{"name": "zukunftspotenzial", "score": <0-100>}},
        {{"name": "zustand_baujahr", "score": <0-100>}},
        {{"name": "energieeffizienz", "score": <0-100>}},
        {{"name": "nebenkosten", "score": <0-100>}},
        {{"name": "grundriss", "score": <0-100>}},
        {{"name": "verkäufertyp", "score": <0-100>}}
    ],
    "zusammenfassung": "<3-4 Saetze. REGELN: 1) Beginne POSITIV wenn Objekt unter Markt liegt. 2) Preisvergleich NUR in PROZENT (z.B. '36% unter Markt'). NIEMALS absolute Euro-Betraege fuer Rabatt/Wertzuwachs nennen! 3) Steuervorteile nur kurz erwaehnen ('steuerliche Vorteile durch AfA und Zinsabzug'), KEINE konkreten Nach-Steuer-Cashflow-Zahlen nennen (weil Mieteinnahmen ebenfalls versteuert werden muessen). 4) Bei Neuvermietungspotenzial NUR den Endwert nennen (z.B. 'Bei Neuvermietung steigt der Cashflow auf ca. +550€/Monat'), NICHT die Differenz. 5) Zusammenfassung MUSS zum Score passen: Score >70 = klar positiv formulieren.>",
    "stärken": ["<konkrete Stärke mit Zahlen>", "<...>"],
    "schwächen": ["<konkrete Schwäche mit Zahlen>", "<...>"],
    "fairer_preis": {{
        "fairer_preis": <deine Einschaetzung des fairen Preises in Euro als Zahl>,
        "bewertung": "<Unter Marktwert / Marktgerecht / Leicht ueber Marktwert / Ueberteuert / Stark ueberteuert>",
        "begruendung": "<1 Satz warum du diesen fairen Preis ansetzt, z.B. basierend auf Marktvergleich, Zustand, Lage>"
    }},
    "kriterien_begründungen": [
        {{"name": "cashflow_rendite", "begründung": "<präzise Begründung mit konkreten Zahlen, 1-3 Sätze>"}},
        {{"name": "lage", "begründung": "<...>"}},
        {{"name": "kaufpreis_qm", "begründung": "<...>"}},
        {{"name": "zukunftspotenzial", "begründung": "<...>"}},
        {{"name": "zustand_baujahr", "begründung": "<...>"}},
        {{"name": "energieeffizienz", "begründung": "<...>"}},
        {{"name": "nebenkosten", "begründung": "<...>"}},
        {{"name": "grundriss", "begründung": "<...>"}},
        {{"name": "verkäufertyp", "begründung": "<...>"}}
    ]
}}

REGELN FUER FAIRER PREIS:
- Beruecksichtige ALLE Faktoren: Marktpreis/m2, Zustand, Baujahr, Energieklasse, Lage, Mietpotenzial
- Wenn das Objekt UNTER dem Marktdurchschnitt liegt, ist der faire Preis MINDESTENS der Kaufpreis (es ist ja schon guenstig!)
- Ein Objekt das 30%+ unter Markt liegt = Bewertung "Unter Marktwert", NICHT "Ueberteuert"
- Der faire Preis muss zum Score und zur Zusammenfassung passen! Kein Widerspruch!

Antworte NUR mit dem JSON."""


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_property(
    request: AnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Führt die vollständige Immobilienanalyse durch mit:
    - No-Go-Prüfung (K.O.-Kriterien)
    - Kaufpreisfaktor & Bruttorendite
    - Cashflow-Berechnung (4.0% Zins, 1.25% Tilgung)
    - Warnsignal-Erkennung
    - Gewichtete Score-Berechnung
    """
    # Prüfe Credits
    credits = current_user.analysis_credits if current_user.analysis_credits is not None else 1
    is_premium = credits > 0 or current_user.is_superuser

    if not is_premium:
        # Kein Credit - prüfe ob User schon eine Gratis-Analyse hatte
        existing_analyses = db.query(Analysis).filter(Analysis.user_id == current_user.id).count()
        if existing_analyses > 0:
            raise HTTPException(
                status_code=402,
                detail="Keine Analyse-Credits mehr. Kaufe Credits um weitere Analysen durchzufuehren."
            )
        # Erste Analyse gratis (aber eingeschränkt)
        is_premium = False

    data = request.property_data
    zweck = request.verwendungszweck

    # Input validation: Reject unrealistically low kaufpreis
    if data.kaufpreis and data.kaufpreis < 1000:
        raise HTTPException(
            status_code=422,
            detail="Kaufpreis muss mindestens 1.000 EUR betragen."
        )

    weights = WEIGHTS_INVESTMENT if zweck == "kapitalanlage" else WEIGHTS_SELF_USE

    client = get_anthropic_client()

    # 1. NO-GO-PRÜFUNG - Sofortiges Ausschlusskriterium
    no_go_check = check_no_gos(data)

    # 2. WARNSIGNAL-ERKENNUNG
    warnsignale = detect_warning_signals(data)

    # 3. V3.0 - LIVE MARKTDATEN RECHERCHE (PFLICHT!)
    # Die KI MUSS zuerst aktuelle Preise recherchieren
    marktdaten = None
    if data.stadt:
        try:
            objekttyp = data.objekttyp or "Eigentumswohnung"
            marktdaten = await fetch_live_market_data(
                stadt=data.stadt,
                stadtteil=data.stadtteil,
                objekttyp=objekttyp,
                plz=data.plz,
                db=db,
            )
            # Prüfe ob Live-Daten erfolgreich
            if marktdaten and marktdaten.get("recherche_methode") == "live_web_search_v3":
                print(f"[OK] Live-Marktdaten fuer {data.stadt} erfolgreich recherchiert")
            else:
                print(f"[WARN] Fallback-Marktdaten fuer {data.stadt} verwendet")
        except Exception as e:
            print(f"[ERROR] Marktdaten-Recherche fehlgeschlagen: {str(e)}")
            # Fallback-Daten mit Warnung
            marktdaten = {
                "standort": f"{data.stadtteil}, {data.stadt}" if data.stadtteil else data.stadt,
                "kaufpreis_qm_durchschnitt": 3500,
                "miete_qm_durchschnitt": 10,
                "datenqualität": "ACHTUNG: Konnte keine Live-Daten abrufen!",
                "recherche_methode": "error_fallback"
            }

    # 4. Investment-Metriken berechnen (nur bei Kapitalanlage)
    investment_metriken = None
    cashflow_analyse = None
    mietschaetzung_info = None  # NEU: Tracking ob Miete geschätzt wurde

    # Nicht-umlagefähige Nebenkosten korrekt berechnen (einmal, für alle Sektionen)
    hausgeld_gesamt_global = data.hausgeld or data.nebenkosten or 0
    hausgeld_ist_geschaetzt = False

    # Hausgeld schätzen wenn nicht im Exposé angegeben
    if hausgeld_gesamt_global == 0 and data.wohnflaeche and data.wohnflaeche > 0:
        # Richtwert: 3,50-4,50€/m² Hausgeld gesamt, konservativ 4€/m²
        hausgeld_gesamt_global = round(data.wohnflaeche * 4.0, 2)
        hausgeld_ist_geschaetzt = True
        print(f"[INFO] Hausgeld nicht im Exposé — geschätzt: {hausgeld_gesamt_global}€/Monat ({data.wohnflaeche}m² × 4,00€/m²)")

    if data.hausgeld_nicht_umlagefaehig and data.hausgeld_nicht_umlagefaehig > 0:
        hausgeld_nicht_umlagefaehig = data.hausgeld_nicht_umlagefaehig
    else:
        hausgeld_nicht_umlagefaehig = hausgeld_gesamt_global * 0.35

    if zweck == "kapitalanlage" and data.kaufpreis:
        miete = data.aktuelle_miete or 0
        ist_geschaetzte_miete = False

        # Warmmiete-Warnung tracken
        if data.miete_typ_im_expose == "warmmiete" and data.warmmiete_aus_expose:
            if not mietschaetzung_info:
                mietschaetzung_info = {}
            mietschaetzung_info["warmmiete_warnung"] = True
            mietschaetzung_info["warmmiete_original"] = data.warmmiete_aus_expose
            mietschaetzung_info["kaltmiete_abgeleitet"] = miete
            mietschaetzung_info["hinweis_warmmiete"] = (
                f"ACHTUNG: Im Exposé war nur eine Warmmiete von {data.warmmiete_aus_expose}€ angegeben. "
                f"Die Kaltmiete wurde auf {miete}€ geschätzt (Warmmiete minus Nebenkosten). "
                f"Alle Rendite- und Cashflow-Berechnungen basieren auf der geschätzten Kaltmiete. "
                f"Bitte den tatsächlichen Mietvertrag prüfen."
            )
            print(f"[WARN] Warmmiete-Korrektur aktiv: {data.warmmiete_aus_expose}€ Warm → {miete}€ Kalt geschätzt")

        # Schätze Miete falls nicht vorhanden (frei/leerstehend)
        if miete == 0 and data.wohnflaeche and marktdaten:
            geschaetzte_miete_qm = marktdaten.get("miete_qm_durchschnitt", 10)
            miete = data.wohnflaeche * geschaetzte_miete_qm
            ist_geschaetzte_miete = True

            # Erstelle Info-Objekt für geschätzte Miete (Neuvermietung)
            mietschaetzung_info = {
                "ist_geschaetzt": True,
                "geschaetzte_miete_monat": round(miete, 2),
                "geschaetzte_miete_qm": round(geschaetzte_miete_qm, 2),
                "wohnflaeche": data.wohnflaeche,
                "marktdaten_quelle": marktdaten.get("recherche_methode", "unbekannt"),
                "standort": marktdaten.get("standort", data.stadt),
                "hinweis": f"Geschätzt auf Basis aktueller Neuvermietungspreise für {data.stadt}: {round(geschaetzte_miete_qm, 2)} €/m² × {data.wohnflaeche} m² = {round(miete, 2)} €/Monat",
                "empfehlung": "Basiert auf aktuellen Angebotsmieten, nicht auf Bestandsmietverträgen."
            }
            print(f"[INFO] Miete geschaetzt fuer freie Immobilie: {round(miete, 2)} EUR/Monat ({round(geschaetzte_miete_qm, 2)} EUR/m2)")

        # Kaufpreisfaktor & Bruttorendite
        if miete > 0:
            jahreskaltmiete = miete * 12
            investment_metriken = calculate_investment_metrics(
                kaufpreis=data.kaufpreis,
                jahreskaltmiete=jahreskaltmiete,
                wohnflaeche=data.wohnflaeche
            )

        # Cashflow-Berechnung: nur nicht-umlagefähige NK abziehen
        nebenkosten = hausgeld_nicht_umlagefaehig
        ek = max(0, request.eigenkapital or 0)  # Prevent negative EK
        zins = request.zinssatz or 4.3
        tilg = request.tilgung or 1.25

        cashflow_analyse = calculate_cashflow(
            kaufpreis=data.kaufpreis,
            monatliche_miete=miete,
            nebenkosten=nebenkosten,
            eigenkapital=ek,
            zinssatz=zins,
            tilgung=tilg
        )

        # Geschätzte Werte markieren für Frontend ("~" Anzeige)
        geschaetzte_felder = []
        if ist_geschaetzte_miete:
            geschaetzte_felder.append("miete")
        if hausgeld_ist_geschaetzt:
            geschaetzte_felder.append("nebenkosten")
        if data.miete_typ_im_expose == "warmmiete":
            geschaetzte_felder.append("miete")

        if geschaetzte_felder:
            cashflow_analyse["geschaetzte_felder"] = list(set(geschaetzte_felder))

        if hausgeld_ist_geschaetzt:
            cashflow_analyse["hausgeld_geschaetzt"] = True
            cashflow_analyse["hausgeld_geschaetzt_hinweis"] = (
                f"Hausgeld nicht im Exposé angegeben. Geschätzt: ~{round(hausgeld_gesamt_global, 0):.0f}€/Monat "
                f"(~4€/m² × {data.wohnflaeche}m²). Nicht umlagefähiger Anteil: ~{round(hausgeld_nicht_umlagefaehig, 0):.0f}€/Monat."
            )
            if not mietschaetzung_info:
                mietschaetzung_info = {}
            mietschaetzung_info["hausgeld_geschaetzt"] = True
            mietschaetzung_info["hausgeld_geschaetzt_wert"] = round(hausgeld_gesamt_global, 2)
            mietschaetzung_info["hausgeld_nicht_umlagefaehig_geschaetzt"] = round(hausgeld_nicht_umlagefaehig, 2)

    # 4a-2. Steuereffekt berechnen (korrekt: Mieteinnahmen werden auch versteuert!)
    if cashflow_analyse and data.kaufpreis and zweck == "kapitalanlage":
        # Gebäudewert ca. 80% (20% Grundstück)
        gebaeudewert = data.kaufpreis * 0.80
        # AfA nach Baujahr
        if data.baujahr and data.baujahr >= 2023:
            afa_satz = 0.03
        elif data.baujahr and data.baujahr < 1925:
            afa_satz = 0.025
        else:
            afa_satz = 0.02
        jaehrliche_afa = gebaeudewert * afa_satz

        # Jährliche Zinsen (Finanzierungssumme * Zinssatz)
        finanzierungssumme = data.kaufpreis - (ek or 0)
        jaehrliche_zinsen = finanzierungssumme * ((zins or 4.0) / 100)

        # Absetzbare Kosten = AfA + Zinsen + nicht-umlagefähige NK
        absetzbar_jahr = jaehrliche_afa + jaehrliche_zinsen + (nebenkosten * 12)

        # KORREKTE Steuerberechnung: Mieteinnahmen - Absetzbare Kosten = steuerlicher Gewinn/Verlust
        mieteinnahmen_jahr = miete * 12
        steuerlicher_gewinn = mieteinnahmen_jahr - absetzbar_jahr
        # Wenn negativ: Verlust = Steuererstattung (reduziert anderes Einkommen)
        # Wenn positiv: Gewinn = Steuerzahlung auf Mieteinnahmen
        steuereffekt_42 = round(-steuerlicher_gewinn * 0.42 / 12, 2)  # Negativ = Zahlung, Positiv = Erstattung
        steuereffekt_35 = round(-steuerlicher_gewinn * 0.35 / 12, 2)

        cashflow_analyse["steuereffekt"] = {
            "jaehrliche_afa": round(jaehrliche_afa, 2),
            "jaehrliche_zinsen": round(jaehrliche_zinsen, 2),
            "absetzbar_gesamt_jahr": round(absetzbar_jahr, 2),
            "mieteinnahmen_jahr": round(mieteinnahmen_jahr, 2),
            "steuerlicher_gewinn_jahr": round(steuerlicher_gewinn, 2),
            "steuereffekt_monat_42": steuereffekt_42,
            "steuereffekt_monat_35": steuereffekt_35,
            # Alt-Keys fuer Frontend-Kompatibilitaet
            "steuerersparnis_monat_42": steuereffekt_42,
            "steuerersparnis_monat_35": steuereffekt_35,
            "cashflow_nach_steuer_42": round(cashflow_analyse["monatlicher_cashflow"] + steuereffekt_42, 2),
            "cashflow_nach_steuer_35": round(cashflow_analyse["monatlicher_cashflow"] + steuereffekt_35, 2),
        }

    # 4b. NEUVERMIETUNGS-POTENZIAL (bei vermieteten Immobilien)
    neuvermietung_potenzial = None
    if zweck == "kapitalanlage" and data.kaufpreis and data.wohnflaeche and marktdaten:
        neuvermietung_miete_qm = marktdaten.get("miete_qm_durchschnitt", 0)
        neuvermietung_miete_monat = data.wohnflaeche * neuvermietung_miete_qm

        # WG-Vermietung: typisch 20-40% mehr
        wg_aufschlag = 0.25  # 25% konservativ
        wg_miete_monat = neuvermietung_miete_monat * (1 + wg_aufschlag)

        # Moebliert: typisch 15-30% mehr
        moebliert_aufschlag = 0.20
        moebliert_miete_monat = neuvermietung_miete_monat * (1 + moebliert_aufschlag)

        # Nur anzeigen wenn es einen echten Uplift gibt
        aktuelle_miete = data.aktuelle_miete or 0
        if aktuelle_miete > 0 and neuvermietung_miete_monat > aktuelle_miete * 1.05:
            # Vermietet, aber unter Markt
            uplift_prozent = round(((neuvermietung_miete_monat - aktuelle_miete) / aktuelle_miete) * 100, 1)
            neuvermietung_potenzial = {
                "aktuell": round(aktuelle_miete, 2),
                "neuvermietung": round(neuvermietung_miete_monat, 2),
                "neuvermietung_qm": round(neuvermietung_miete_qm, 2),
                "uplift_prozent": uplift_prozent,
                "uplift_monat": round(neuvermietung_miete_monat - aktuelle_miete, 2),
                "uplift_jahr": round((neuvermietung_miete_monat - aktuelle_miete) * 12, 2),
                "wg_miete": round(wg_miete_monat, 2),
                "wg_uplift_prozent": round(((wg_miete_monat - aktuelle_miete) / aktuelle_miete) * 100, 1),
                "moebliert_miete": round(moebliert_miete_monat, 2),
                "moebliert_uplift_prozent": round(((moebliert_miete_monat - aktuelle_miete) / aktuelle_miete) * 100, 1),
                "hinweis": "Bei Neuvermietung gilt die Mietpreisbremse: max. 10% über ortsüblicher Vergleichsmiete. WG und möblierte Vermietung unterliegen teilweise anderen Regeln."
            }
        elif aktuelle_miete == 0:
            # Frei/nicht vermietet - zeige alternative Strategien
            neuvermietung_potenzial = {
                "aktuell": 0,
                "neuvermietung": round(neuvermietung_miete_monat, 2),
                "neuvermietung_qm": round(neuvermietung_miete_qm, 2),
                "uplift_prozent": 0,
                "wg_miete": round(wg_miete_monat, 2),
                "wg_uplift_prozent": round(wg_aufschlag * 100, 1),
                "moebliert_miete": round(moebliert_miete_monat, 2),
                "moebliert_uplift_prozent": round(moebliert_aufschlag * 100, 1),
                "hinweis": "Bei WG-Vermietung und möblierter Vermietung gelten teilweise andere Regeln als bei normaler Vermietung. Kurzfristige Vermietung (Airbnb) ist in vielen Städten stark reguliert."
            }

    # 5. ERWEITERTE BERECHNUNGEN
    tilgungsplan = None
    breakeven_eigenkapital = None
    szenarien = None
    sensitivity_analyse = None

    if data.kaufpreis and data.kaufpreis > 0:
        miete = data.aktuelle_miete or 0
        if miete == 0 and data.wohnflaeche and marktdaten:
            miete = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)

        nebenkosten = hausgeld_nicht_umlagefaehig
        ek = request.eigenkapital or 0
        zins = request.zinssatz or 4.3
        tilg = request.tilgung or 1.25

        # Tilgungsplan: relevant für beide Zwecke (Kapitalanlage & Eigennutzung)
        tilgungsplan = calculate_tilgungsplan(
            kaufpreis=data.kaufpreis,
            eigenkapital=ek,
            zinssatz=zins,
            tilgung=tilg,
            monatliche_miete=miete if miete > 0 else 0,
            nebenkosten=nebenkosten,
            jahre=30,
            mietsteigerung=1.5,
            wertsteigerung=1.5
        )

        # Kapitalanlage-spezifische Berechnungen
        if zweck == "kapitalanlage" and miete > 0:
            # Break-Even Eigenkapital berechnen
            breakeven_eigenkapital = calculate_breakeven_eigenkapital(
                kaufpreis=data.kaufpreis,
                monatliche_miete=miete,
                nebenkosten=nebenkosten,
                zinssatz=zins,
                tilgung=tilg
            )

            # Szenarien generieren
            szenarien = generate_scenarios(
                kaufpreis=data.kaufpreis,
                monatliche_miete=miete,
                nebenkosten=nebenkosten,
                eigenkapital=ek,
                zinssatz=zins,
                tilgung=tilg
            )

            # Sensitivitätsanalyse berechnen
            sensitivity_analyse = calculate_sensitivity_analysis(
                kaufpreis=data.kaufpreis,
                monatliche_miete=miete,
                nebenkosten=nebenkosten,
                eigenkapital=ek,
                zinssatz=zins,
                tilgung=tilg
            )

    # 6. ZUSÄTZLICHE ANALYSEN
    investment_vergleich = None
    meilensteine = None
    miet_variationen = None
    finanzierungsoptionen = None

    if data.kaufpreis and data.kaufpreis > 0:
        miete = data.aktuelle_miete or 0
        if miete == 0 and data.wohnflaeche and marktdaten:
            miete = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)

        nebenkosten = hausgeld_nicht_umlagefaehig
        ek = request.eigenkapital or 0
        zins = request.zinssatz or 4.3
        tilg = request.tilgung or 1.25

        # Finanzierungsoptionen: relevant für beide Zwecke
        finanzierungsoptionen = calculate_financing_options(
            kaufpreis=data.kaufpreis,
            monatliche_miete=miete if miete > 0 else 0,
            nebenkosten=nebenkosten,
            eigenkapital=ek
        )

        # Kapitalanlage-spezifische Analysen
        if zweck == "kapitalanlage" and miete > 0:
            # Investment-Vergleich (Immobilie vs. ETF)
            investment_vergleich = calculate_investment_comparison(
                kaufpreis=data.kaufpreis,
                eigenkapital=ek,
                monatliche_miete=miete,
                nebenkosten=nebenkosten,
                zinssatz=zins,
                tilgung=tilg
            )

            # Meilensteine berechnen
            meilensteine = calculate_key_milestones(
                kaufpreis=data.kaufpreis,
                eigenkapital=ek,
                zinssatz=zins,
                tilgung=tilg,
                monatliche_miete=miete,
                nebenkosten=nebenkosten
            )

            # Miet-Variationen
            miet_variationen = calculate_rental_variations(
                kaufpreis=data.kaufpreis,
                eigenkapital=ek,
                zinssatz=zins,
                tilgung=tilg,
                aktuelle_miete=miete,
                nebenkosten=nebenkosten
            )

    # 7. KNOWLEDGE BASE BERECHNUNGEN
    verbesserungsvorschlaege = None
    foerderungen_empfehlung = None
    fairer_preis_result = None
    afa_result = None
    leverage_result = None
    quick_check_result = None

    if data.kaufpreis and data.kaufpreis > 0:
        miete = data.aktuelle_miete or 0
        if miete == 0 and data.wohnflaeche and marktdaten:
            miete = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)

        nebenkosten = hausgeld_nicht_umlagefaehig
        ek = request.eigenkapital or 0
        zins = request.zinssatz or 4.3
        tilg = request.tilgung or 1.25
        jahresmiete = miete * 12

        if jahresmiete > 0:
            kaufpreisfaktor = data.kaufpreis / jahresmiete
            bruttorendite = (jahresmiete / data.kaufpreis) * 100
            cashflow_monat = cashflow_analyse.get("monatlicher_cashflow", 0) if cashflow_analyse else 0

            # Fairer Preis berechnen
            markt_qm = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None
            fairer_preis_result = berechne_fairen_preis(
                kaufpreis=data.kaufpreis,
                jahresmiete=jahresmiete,
                wohnflaeche=data.wohnflaeche,
                markt_qm_preis=markt_qm
            )

            # Verbesserungsvorschläge generieren (NIEMALS nur Nein sagen!)
            verbesserungsvorschlaege = generiere_verbesserungsvorschlaege(
                kaufpreis=data.kaufpreis,
                jahresmiete=jahresmiete,
                kaufpreisfaktor=kaufpreisfaktor,
                bruttorendite=bruttorendite,
                cashflow=cashflow_monat,
                energieklasse=data.energieklasse,
                ist_miete=miete,
                markt_miete=marktdaten.get("miete_qm_durchschnitt", 0) * (data.wohnflaeche or 0) if marktdaten else None,
                score=0,  # Wird später aktualisiert
                bundesland=None  # Könnte aus Adresse extrahiert werden
            )

            # Förderungen empfehlen
            foerderungen_empfehlung = empfehle_foerderungen(
                selbstnutzung=(zweck == "eigennutzung"),
                kinder_anzahl=0,
                energieklasse=data.energieklasse,
                baujahr=data.baujahr,
                heizung_alt=(data.baujahr and data.baujahr < 2000),
                bundesland=None,
                einkommen=None
            )

            # AfA berechnen
            if data.baujahr and data.wohnflaeche:
                # Gebäudewert ca. 80% des Kaufpreises (20% Grundstück)
                gebaeudewert = data.kaufpreis * 0.8
                afa_result = berechne_afa(
                    gebaeudewert=gebaeudewert,
                    baujahr=data.baujahr,
                    ist_neubau_ab_2023=(data.baujahr >= 2023),
                    ist_denkmal=False,
                    ist_vermietung=(zweck == "kapitalanlage")
                )

            # Leverage-Effekt berechnen
            # Bei 100% Finanzierung (ek=0): Kaufnebenkosten als Proxy-EK verwenden
            ek_for_leverage = ek if ek > 0 else data.kaufpreis * 0.12
            if data.kaufpreis > 0:
                finanzierungssumme = data.kaufpreis - ek
                objektrendite = bruttorendite
                leverage_result = berechne_leverage_effekt(
                    objektrendite=objektrendite,
                    fremdkapitalzins=zins,
                    eigenkapital=ek_for_leverage,
                    fremdkapital=finanzierungssumme
                )

            # Quick Check
            quick_check_result = quick_check({
                "bruttorendite": bruttorendite,
                "kaufpreisfaktor": kaufpreisfaktor,
                "cashflow": cashflow_monat,
                "energieklasse": data.energieklasse or "",
                "erbpacht": False,  # Aus Beschreibung extrahiert in check_no_gos
                "sozialbindung": False
            })

    # 8. KI-BEWERTUNG mit allen Informationen + Knowledge Base System Prompt
    system_prompt = get_ai_system_prompt()

    analyse_prompt = build_main_analysis_prompt(
        data=data,
        request=request,
        marktdaten=marktdaten,
        no_go_check=no_go_check,
        warnsignale=warnsignale,
        investment_metriken=investment_metriken,
        fairer_preis_result=fairer_preis_result,
        foerderungen_empfehlung=foerderungen_empfehlung,
        cashflow_analyse=cashflow_analyse,
        weights=weights,
        zweck=zweck,
    )

    try:
        response = client.messages.create(
            model=CLAUDE_SONNET_MODEL,
            # 8000: Output kann bei detaillierten Begruendungen ~3500-4500 Tokens
            # erreichen. 4000 hat in Production zu "Unterminated string" JSON-Decode
            # Errors gefuehrt (Output mitten im String abgeschnitten). 8000 ist die
            # urspruengliche, sichere Obergrenze.
            max_tokens=8000,
            system=[{
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"}
            }],
            messages=[{"role": "user", "content": analyse_prompt}]
        )

        # Log Usage
        log_usage(
            db=db,
            user_id=current_user.id,
            action_type="analyze",
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens
        )

        json_text = response.content[0].text.strip()
        if json_text.startswith("```"):
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
        json_text = json_text.strip()
        
        ai_analysis = json.loads(json_text)

        # Berechne gewichteten Gesamtscore
        kriterien_scores = []
        total_weighted = 0

        for criterion in _extract_kriterien_from_ai(ai_analysis):
            name = criterion["name"]
            score = max(0, min(100, int(criterion["score"])))  # Validierung: 0-100
            gewichtung = weights.get(name, 0)
            gewichteter_score = (score * gewichtung) / 100
            total_weighted += gewichteter_score

            kriterien_scores.append(CriterionScore(
                name=name,
                score=score,
                gewichtung=gewichtung,
                gewichteter_score=round(gewichteter_score, 2),
                begründung=criterion.get("begründung", "")
            ))

        # Gesamtscore (auf 100 normalisiert) - kein künstlicher Bonus
        gesamtscore = min(100, round(total_weighted, 1))

        # Erbbaurecht: Score-Penalty statt Hard-Cap.
        # Erbbau ist nicht objektiv schlecht — fuer manche Profile sogar attraktiv
        # (Yield-Investoren, Eigennutzer ohne Verkaufsabsicht). Aber es ist ein
        # echter Risikofaktor, der proportional zur Restlaufzeit Wirkung haben muss.
        if data.erbbaurecht or (data.beschreibung and ('erbpacht' in data.beschreibung.lower() or 'erbbaurecht' in data.beschreibung.lower())):
            rl = data.erbbau_restlaufzeit_jahre
            if rl is None:
                # Restlaufzeit unbekannt -> mittlere Strafe, User muss klaeren
                erbbau_penalty = 15
            elif rl < 20:
                erbbau_penalty = 30  # Faktisch unfinanzierbar
            elif rl < 30:
                erbbau_penalty = 25
            elif rl < 50:
                erbbau_penalty = 18  # Bochum-Case (46J) -> -18 Punkte
            elif rl < 70:
                erbbau_penalty = 10
            else:
                erbbau_penalty = 5
            gesamtscore = max(0, round(gesamtscore - erbbau_penalty, 1))

        # EMPFEHLUNG basierend auf No-Gos, Score und Warnsignalen (professionell formuliert)
        if no_go_check["no_go"]:
            empfehlung = "NICHT EMPFEHLENSWERT"
            empfehlung_text = f"Aus unserer Sicht nicht empfehlenswert - Ausschlusskriterien: {', '.join(no_go_check['gründe'])}"
        elif gesamtscore >= 70:
            if warnsignale["kritisch"]:
                empfehlung = "PRÜFENSWERT"
            else:
                empfehlung = "EMPFEHLENSWERT"
        elif gesamtscore >= 55:
            empfehlung = "PRÜFENSWERT"
        elif gesamtscore >= 40:
            empfehlung = "EHER NICHT EMPFEHLENSWERT"
        else:
            empfehlung = "NICHT EMPFEHLENSWERT"

        # Zusammenfassung: Score-Referenz im Text an berechneten Score anpassen
        zusammenfassung_erweitert = ai_analysis['zusammenfassung']
        # Fix Score-Mismatch: Claude kennt den gewichteten Score nicht, also korrigieren
        import re
        score_int = int(round(gesamtscore))
        # Ersetze "Score XX/100" Pattern mit dem echten Score
        zusammenfassung_erweitert = re.sub(
            r'Score\s+\d+/100',
            f'Score {score_int}/100',
            zusammenfassung_erweitert
        )
        # Score-Label anpassen
        if score_int >= 80:
            score_label = "SEHR EMPFEHLENSWERT"
        elif score_int >= 70:
            score_label = "EMPFEHLENSWERT"
        elif score_int >= 55:
            score_label = "SOLIDE"
        elif score_int >= 40:
            score_label = "UNTERDURCHSCHNITTLICH"
        else:
            score_label = "NICHT EMPFEHLENSWERT"
        # Ersetze Score-Labels im Text
        for old_label in ["SEHR EMPFEHLENSWERT", "EMPFEHLENSWERT", "SOLIDE", "UNTERDURCHSCHNITTLICH", "NICHT EMPFEHLENSWERT", "PRÜFENSWERT"]:
            if old_label in zusammenfassung_erweitert and old_label != score_label:
                zusammenfassung_erweitert = zusammenfassung_erweitert.replace(old_label, score_label)
                break

        # Fairer Preis von der KI (überschreibt Formel-Berechnung wenn vorhanden)
        ai_fairer_preis = ai_analysis.get('fairer_preis')
        if ai_fairer_preis and ai_fairer_preis.get('fairer_preis'):
            ai_fp = ai_fairer_preis['fairer_preis']
            if isinstance(ai_fp, (int, float)) and ai_fp > 0:
                differenz_pct = round((data.kaufpreis / ai_fp - 1) * 100, 1)
                fairer_preis_result = {
                    "fairer_preis": round(ai_fp),
                    "aktueller_preis": data.kaufpreis,
                    "differenz_prozent": differenz_pct,
                    "bewertung": ai_fairer_preis.get('bewertung', 'Marktgerecht'),
                    "begruendung": ai_fairer_preis.get('begruendung', ''),
                    "nach_rendite": fairer_preis_result.get("nach_rendite") if fairer_preis_result else None,
                    "nach_faktor": fairer_preis_result.get("nach_faktor") if fairer_preis_result else None,
                    "nach_cashflow": fairer_preis_result.get("nach_cashflow") if fairer_preis_result else None,
                }

        # Kaufnebenkosten berechnen
        kaufnebenkosten_result = None
        if data.kaufpreis:
            # Prüfe ob Makler involviert (aus Provision oder Verkäufertyp)
            mit_makler = bool(data.provision) or (data.verkäufertyp and data.verkäufertyp.lower() == "makler")
            kaufnebenkosten_result = calculate_kaufnebenkosten(
                kaufpreis=data.kaufpreis,
                bundesland=None,  # TODO: aus Stadt ableiten
                mit_makler=mit_makler
            )

        # V3.0: Kennzahlen mit Live-Marktdaten-Vergleich
        kennzahlen = None
        if data.kaufpreis and data.wohnflaeche:
            preis_pro_qm = round(data.kaufpreis / data.wohnflaeche, 2)
            markt_durchschnitt = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None

            kennzahlen = {
                "preis_pro_qm": preis_pro_qm,
                "markt_durchschnitt_qm": markt_durchschnitt,
                "abweichung_prozent": round(((preis_pro_qm / markt_durchschnitt) - 1) * 100, 1) if markt_durchschnitt else None,
                "unter_markt": preis_pro_qm < markt_durchschnitt if markt_durchschnitt else None,
                "marktdaten_quelle": marktdaten.get("recherche_methode", "unbekannt") if marktdaten else "keine",
                "marktdaten_standort": marktdaten.get("standort") if marktdaten else None,
                "marktdaten_vertrauen": marktdaten.get("vertrauenswuerdigkeit", "unbekannt") if marktdaten else "keine",
                "kaufpreisfaktor": round(data.kaufpreis / (data.aktuelle_miete * 12), 1) if data.aktuelle_miete else None,
                "bruttorendite": round((data.aktuelle_miete * 12 / data.kaufpreis) * 100, 2) if data.aktuelle_miete else None
            }

        # ========================================
        # POTENZIAL-SZENARIEN (Was-waere-wenn)
        # ========================================
        potenzial_szenarien = None
        if zweck == "kapitalanlage" and data.kaufpreis and cashflow_analyse:
            szenarien_list = []
            aktueller_cf = cashflow_analyse.get("monatlicher_cashflow", 0)
            aktuelle_rate = cashflow_analyse.get("monatliche_rate", 0)
            aktuelle_nk = cashflow_analyse.get("monatliche_nebenkosten", 0)
            aktuelle_miete = cashflow_analyse.get("monatliche_miete", 0)

            # Basis-Score-Berechnung: cashflow_rendite Score schaetzen
            def schaetze_cf_score(cf_monat, kaufpreis, bruttorendite_pct):
                """Schaetzt den cashflow_rendite Score basierend auf Cashflow"""
                base = 50
                # Cashflow-Komponente
                if cf_monat >= 0: base = 75
                elif cf_monat >= -100: base = 55
                elif cf_monat >= -200: base = 40
                elif cf_monat >= -300: base = 30
                else: base = 20
                # Bruttorendite-Bonus
                if bruttorendite_pct >= 5: base += 15
                elif bruttorendite_pct >= 4: base += 8
                elif bruttorendite_pct >= 3.5: base += 3
                return min(100, max(0, base))

            # Nicht-CF Anteil des Scores (bleibt in allen Szenarien gleich)
            cf_gewichtung = 0.30
            nicht_cf_score = gesamtscore - (schaetze_cf_score(aktueller_cf, data.kaufpreis,
                cashflow_analyse.get("bruttorendite_prozent", 0)) * cf_gewichtung)

            def berechne_szenario_score(neuer_cf, neuer_kp, neue_miete):
                """Berechnet geschaetzten Gesamtscore fuer ein Szenario"""
                neue_br = (neue_miete * 12 / neuer_kp * 100) if neuer_kp > 0 else 0
                neuer_cf_score = schaetze_cf_score(neuer_cf, neuer_kp, neue_br)
                # Kaufpreis-Anpassung wenn Preis sich aendert
                kp_bonus = 0
                if neuer_kp < data.kaufpreis:
                    einsparung_pct = (data.kaufpreis - neuer_kp) / data.kaufpreis * 100
                    kp_bonus = min(5, einsparung_pct * 0.5)  # Max +5 Punkte
                return min(100, round(nicht_cf_score + neuer_cf_score * cf_gewichtung + kp_bonus, 0))

            # Szenario 1: Neuvermietung
            if neuvermietung_potenzial and neuvermietung_potenzial.get("neuvermietung", 0) > aktuelle_miete:
                neue_miete_nv = neuvermietung_potenzial["neuvermietung"]
                neuer_cf_nv = neue_miete_nv - aktuelle_rate - aktuelle_nk
                neuer_score_nv = berechne_szenario_score(neuer_cf_nv, data.kaufpreis, neue_miete_nv)
                szenarien_list.append({
                    "name": "Bei Neuvermietung",
                    "beschreibung": f"Miete steigt auf {round(neue_miete_nv)} EUR/Monat ({neuvermietung_potenzial.get('neuvermietung_qm', 0):.1f} EUR/m2)",
                    "cashflow": round(neuer_cf_nv),
                    "score": int(neuer_score_nv),
                    "aenderung": int(neuer_score_nv - gesamtscore),
                })

            # Szenario 2: Preisverhandlung (fairer Preis oder -10%)
            verhandlungs_preis = None
            if fairer_preis_result and fairer_preis_result.get("fairer_preis"):
                fp = fairer_preis_result["fairer_preis"]
                if fp < data.kaufpreis:
                    verhandlungs_preis = fp
            if not verhandlungs_preis:
                verhandlungs_preis = round(data.kaufpreis * 0.9)  # -10% als Default

            if verhandlungs_preis < data.kaufpreis:
                finanzierungssumme_vh = max(0, verhandlungs_preis - ek)
                neue_rate_vh = finanzierungssumme_vh * (zins + tilg) / 100 / 12
                neuer_cf_vh = aktuelle_miete - neue_rate_vh - aktuelle_nk
                neuer_score_vh = berechne_szenario_score(neuer_cf_vh, verhandlungs_preis, aktuelle_miete)
                einsparung = data.kaufpreis - verhandlungs_preis
                szenarien_list.append({
                    "name": "Bei Preisverhandlung",
                    "beschreibung": f"Kaufpreis auf {round(verhandlungs_preis):,} EUR (-{round(einsparung):,} EUR)",
                    "cashflow": round(neuer_cf_vh),
                    "score": int(neuer_score_vh),
                    "aenderung": int(neuer_score_vh - gesamtscore),
                })

            # Szenario 3: Kombiniert (Neuvermietung + Preisverhandlung)
            if neuvermietung_potenzial and neuvermietung_potenzial.get("neuvermietung", 0) > aktuelle_miete and verhandlungs_preis < data.kaufpreis:
                neue_miete_kombi = neuvermietung_potenzial["neuvermietung"]
                finanzierungssumme_kombi = max(0, verhandlungs_preis - ek)
                neue_rate_kombi = finanzierungssumme_kombi * (zins + tilg) / 100 / 12
                neuer_cf_kombi = neue_miete_kombi - neue_rate_kombi - aktuelle_nk
                neuer_score_kombi = berechne_szenario_score(neuer_cf_kombi, verhandlungs_preis, neue_miete_kombi)
                szenarien_list.append({
                    "name": "Neuvermietung + Verhandlung",
                    "beschreibung": "Alle Optimierungen kombiniert",
                    "cashflow": round(neuer_cf_kombi),
                    "score": int(neuer_score_kombi),
                    "aenderung": int(neuer_score_kombi - gesamtscore),
                })

            if szenarien_list:
                bester = max(szenarien_list, key=lambda s: s["score"])
                potenzial_szenarien = {
                    "aktuell": {
                        "score": int(round(gesamtscore)),
                        "cashflow": round(aktueller_cf),
                    },
                    "szenarien": szenarien_list,
                    "bestes_szenario": bester,
                    "max_score": bester["score"],
                }

        result = AnalysisResult(
            gesamtscore=gesamtscore,
            verwendungszweck=zweck,
            kriterien=kriterien_scores,
            cashflow_analyse=cashflow_analyse,
            investment_metriken=investment_metriken,
            no_go_check=no_go_check,
            warnsignale=warnsignale,
            zusammenfassung=zusammenfassung_erweitert,
            stärken=ai_analysis["stärken"],
            schwächen=ai_analysis["schwächen"],
            empfehlung=empfehlung,
            marktdaten=marktdaten,
            tilgungsplan=tilgungsplan,
            breakeven_eigenkapital=breakeven_eigenkapital,
            szenarien=szenarien,
            sensitivity_analyse=sensitivity_analyse,
            investment_vergleich=investment_vergleich,
            meilensteine=meilensteine,
            miet_variationen=miet_variationen,
            finanzierungsoptionen=finanzierungsoptionen,
            # NEU: Knowledge Base Integration
            verbesserungsvorschlaege=verbesserungsvorschlaege,
            foerderungen=foerderungen_empfehlung,
            fairer_preis=fairer_preis_result,
            afa_berechnung=afa_result,
            leverage_effekt=leverage_result,
            quick_check_result=quick_check_result,
            # V3.0: Live-Marktdaten Kennzahlen
            kennzahlen=kennzahlen,
            # NEU: Mietschätzung-Info bei freien Immobilien
            mietschaetzung=mietschaetzung_info,
            # NEU: Kaufnebenkosten
            kaufnebenkosten=kaufnebenkosten_result,
            neuvermietung_potenzial=neuvermietung_potenzial,
            potenzial_szenarien=potenzial_szenarien,
        )

        # Verhandlungsmail + Besichtigungs-Roadmap parallel (asyncio.gather).
        # Beide Calls sind unabhaengige Haiku-Calls und sparen ~5-8s wenn sie parallel laufen.
        # Wichtig: pro Thread eigene SessionLocal() fuer Usage-Logging (SQLAlchemy Session ist nicht thread-safe).
        result.besichtigt = request.besichtigt
        result.verhandlungsmail = None
        result.besichtigungs_roadmap = None

        def _build_verhandlungs_prompt():
            preis_qm = round(data.kaufpreis / data.wohnflaeche, 2) if data.wohnflaeche else None
            markt_qm = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None
            fairer_p = fairer_preis_result.get("fairer_preis") if fairer_preis_result else None
            vm_label = (marktdaten.get("vergleichs_label") if marktdaten else None) or "Markt-Durchschnitt"
            return f"""Erstelle eine professionelle, hoefliche Verhandlungsnachricht die ein Immobilienkaeufer an den Verkaeufer/Makler senden kann.

OBJEKTDATEN:
- Kaufpreis: {data.kaufpreis:,.0f} EUR
- Wohnflaeche: {data.wohnflaeche or '?'} m2
- Preis/m2: {preis_qm or '?'} EUR
- {vm_label}/m2: {markt_qm or '?'} EUR
- Stadt: {data.stadt or '?'}, {data.stadtteil or ''}
- Baujahr: {data.baujahr or '?'}
- Energieklasse: {data.energieklasse or '?'}
- Zustand: {data.zustand or '?'}
- Fairer Preis laut Analyse: {f'{fairer_p:,.0f} EUR' if fairer_p else 'nicht berechnet'}

ANALYSE-ERGEBNIS:
- Score: {gesamtscore}/100
- Schwaechen: {', '.join(ai_analysis.get('schwächen', [])[:3])}
- Cashflow/Monat: {cashflow_analyse.get('monatlicher_cashflow', '?') if cashflow_analyse else '?'} EUR

REGELN:
1. Hoeflich und professionell, nicht aggressiv
2. Konkretes Preisangebot machen (zwischen fairem Preis und Kaufpreis)
3. Argumente mit Zahlen belegen (Energiekosten, Sanierungsbedarf, Zustand, Baujahr)
4. WICHTIG: Wenn der Preis/m2 UNTER dem Marktdurchschnitt liegt, erwaehne den Marktdurchschnitt NIEMALS -- das wuerde das Verhandlungsargument des Kaeufers zerstoeren. Nutze stattdessen nur objektbezogene Argumente (Zustand, Energie, Sanierungsbedarf)
5. Interesse am Objekt zeigen, aber sachlich bleiben
6. Auf Deutsch, duzen vermeiden, Sie-Form
7. Keine Emojis
8. Format: Betreff + Nachricht
9. Max 200 Woerter

Antworte NUR mit der fertigen Nachricht, kein anderer Text."""

        def _build_roadmap_prompt():
            return f"""Erstelle eine Besichtigungs-Checkliste fuer diese spezifische Immobilie. Der Kaeufer war noch NICHT bei der Besichtigung.

OBJEKTDATEN:
- Kaufpreis: {data.kaufpreis:,.0f} EUR
- Wohnflaeche: {data.wohnflaeche or '?'} m2
- Stadt: {data.stadt or '?'}, {data.stadtteil or ''}
- Baujahr: {data.baujahr or '?'}
- Objekttyp: {data.objekttyp or '?'}
- Energieklasse: {data.energieklasse or '?'}
- Zustand: {data.zustand or '?'}
- Heizungsart: {data.heizungsart or '?'}

ANALYSE-ERGEBNIS:
- Score: {gesamtscore}/100
- Schwaechen: {', '.join(ai_analysis.get('schwächen', [])[:4])}
- Warnsignale: {json.dumps(warnsignale.get('signale', [])[:3], ensure_ascii=False) if warnsignale else 'keine'}

Antworte als JSON mit dieser Struktur:
{{
    "checkliste": [
        {{
            "kategorie": "z.B. Bausubstanz",
            "punkte": [
                {{
                    "was_pruefen": "Konkreter Punkt",
                    "warum": "Kurze Begruendung bezogen auf dieses Objekt",
                    "spezifisch": true
                }}
            ]
        }}
    ],
    "fragen_an_verkaeufer": [
        "Konkrete Frage die der Kaeufer stellen sollte"
    ],
    "verhalten_tipps": {{
        "do": ["Was man tun/sagen sollte"],
        "dont": ["Was man NICHT tun/sagen sollte"]
    }},
    "naechste_schritte": [
        "Schritt nach der Besichtigung"
    ]
}}

REGELN:
1. Checkliste muss SPEZIFISCH fuer dieses Objekt sein (Baujahr, Energieklasse, Schwaechen beruecksichtigen)
2. Allgemeine Punkte auch aufnehmen aber als spezifisch=false markieren
3. Fragen an Verkaeufer muessen professionell und strategisch sein
4. Verhalten-Tipps: wie man sich als Kaeufer gut positioniert ohne zu viel preiszugeben
5. Max 6 Kategorien in der Checkliste, max 4 Punkte pro Kategorie
6. Max 8 Fragen an Verkaeufer
7. Max 5 Do's und 5 Don'ts
8. Auf Deutsch, professionell
9. Keine Emojis

Antworte NUR mit dem JSON."""

        def _run_verhandlungsmail_sync():
            from database import SessionLocal
            thread_db = SessionLocal()
            try:
                mail_result = call_claude_direct(
                    "Du schreibst professionelle Verhandlungsnachrichten fuer Immobilienkaeufer.",
                    [{"role": "user", "content": _build_verhandlungs_prompt()}],
                    max_tokens=800,
                    model="claude-haiku-4-5-20251001",
                    db=thread_db, user_id=current_user.id, action_type="verhandlungsmail"
                )
                return strip_emojis(mail_result["content"][0]["text"].strip())
            finally:
                thread_db.close()

        def _run_roadmap_sync():
            from database import SessionLocal
            thread_db = SessionLocal()
            try:
                roadmap_result = call_claude_direct(
                    "Du bist ein erfahrener Immobilienberater der Kaeufer auf Besichtigungen vorbereitet.",
                    [{"role": "user", "content": _build_roadmap_prompt()}],
                    max_tokens=2000,
                    model="claude-haiku-4-5-20251001",
                    db=thread_db, user_id=current_user.id, action_type="besichtigung"
                )
                roadmap_text = roadmap_result["content"][0]["text"].strip()
                if roadmap_text.startswith("```"):
                    roadmap_text = roadmap_text.split("```")[1]
                    if roadmap_text.startswith("json"):
                        roadmap_text = roadmap_text[4:]
                return json.loads(roadmap_text.strip())
            finally:
                thread_db.close()

        import asyncio
        extras_tasks = []
        do_verhandlung = is_premium and bool(data.kaufpreis)
        do_roadmap = request.besichtigt is False
        if do_verhandlung:
            extras_tasks.append(asyncio.to_thread(_run_verhandlungsmail_sync))
        if do_roadmap:
            extras_tasks.append(asyncio.to_thread(_run_roadmap_sync))

        if extras_tasks:
            extras_results = await asyncio.gather(*extras_tasks, return_exceptions=True)
            idx = 0
            if do_verhandlung:
                vm = extras_results[idx]; idx += 1
                if isinstance(vm, Exception):
                    print(f"Verhandlungsmail-Generierung fehlgeschlagen: {vm}")
                else:
                    result.verhandlungsmail = vm
            if do_roadmap:
                rm = extras_results[idx]; idx += 1
                if isinstance(rm, Exception):
                    print(f"Besichtigungs-Roadmap-Generierung fehlgeschlagen: {rm}")
                else:
                    result.besichtigungs_roadmap = rm

        # Credit abziehen (nur wenn Premium und nicht Superuser)
        if is_premium and not current_user.is_superuser and credits > 0:
            current_user.analysis_credits = credits - 1
            db.commit()

        # Bei Gratis-Analyse: Premium-Features ausblenden
        if not is_premium:
            result.szenarien = None
            result.sensitivity_analyse = None
            result.fairer_preis = None
            result.foerderungen = None
            result.verbesserungsvorschlaege = None
            result.leverage_effekt = None
            result.finanzierungsoptionen = None
            result.breakeven_eigenkapital = None
            result.investment_vergleich = None
            result.afa_berechnung = None
            result.verhandlungsmail = None

        result.is_premium = is_premium

        # Speichere oder update Analyse in Datenbank
        db_analysis = None
        if request.analysis_id:
            # Update bestehende Analyse
            db_analysis = db.query(Analysis).filter(
                Analysis.id == request.analysis_id,
                Analysis.user_id == current_user.id
            ).first()

        if db_analysis:
            # Bestehende updaten
            db_analysis.property_data = data.dict()
            db_analysis.analysis_result = result.dict()
            db_analysis.verwendungszweck = zweck
            db_analysis.eigenkapital = request.eigenkapital or 0
            db_analysis.zinssatz = request.zinssatz or 4.3
            db_analysis.tilgung = request.tilgung or 1.25
            db_analysis.kaufpreis = data.kaufpreis
            db_analysis.wohnflaeche = data.wohnflaeche
            db_analysis.stadt = data.stadt
            db_analysis.stadtteil = data.stadtteil
            db_analysis.gesamtscore = gesamtscore
            db_analysis.is_premium = is_premium
            db_analysis.title = f"{data.stadt or 'Unbekannt'} - {data.objekttyp or 'Immobilie'}"
            db.commit()
            db.refresh(db_analysis)
        else:
            # Neue Analyse erstellen
            db_analysis = Analysis(
                user_id=current_user.id,
                property_data=data.dict(),
                analysis_result=result.dict(),
                verwendungszweck=zweck,
                eigenkapital=request.eigenkapital or 0,
                zinssatz=request.zinssatz or 4.3,
                tilgung=request.tilgung or 1.25,
                kaufpreis=data.kaufpreis,
                wohnflaeche=data.wohnflaeche,
                stadt=data.stadt,
                stadtteil=data.stadtteil,
                gesamtscore=gesamtscore,
                is_premium=is_premium,
                title=f"{data.stadt or 'Unbekannt'} - {data.objekttyp or 'Immobilie'}"
            )
            db.add(db_analysis)
            db.commit()
            db.refresh(db_analysis)

        # Include the analysis ID in the result
        result.analysis_id = db_analysis.id

        # Send follow-up email after the FIRST analysis if the user has never paid.
        # Trigger nur einmal pro User (bei erster Analyse), egal ob Gratis-Credit oder Paid.
        try:
            n_analyses_total = db.query(Analysis).filter(Analysis.user_id == current_user.id).count()
            n_purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).count()
            if n_analyses_total == 1 and n_purchases == 0:
                send_analysis_followup_email(
                    to_email=current_user.email,
                    username=current_user.username or "dort",
                    stadt=data.stadt or "deiner Stadt",
                    score=gesamtscore or 0,
                    is_premium=False,  # behandle als nicht-bezahlt (User hat noch nicht gekauft)
                    user_id=current_user.id,
                )
        except Exception as e:
            print(f"[WARN] Follow-up email failed: {e}")

        return result
        
    except json.JSONDecodeError as e:
        import traceback, sys
        print(f"[ERROR] Fehler beim Parsen der KI-Analyse: {str(e)}", flush=True)
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}", flush=True)
        sys.stderr.flush()
        detail = "Die KI-Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut."
        if getattr(current_user, "is_superuser", False):
            detail = f"[DEBUG JSONDecodeError /analyze] {str(e)[:500]}"
        raise HTTPException(status_code=500, detail=detail)
    except Exception as e:
        import traceback, sys
        tb = traceback.format_exc()
        print(f"[ERROR] Fehler bei der Analyse: {type(e).__name__}: {str(e)}", flush=True)
        print(f"[ERROR] Traceback:\n{tb}", flush=True)
        sys.stderr.flush()
        detail = "Fehler bei der Analyse. Bitte versuche es erneut."
        if getattr(current_user, "is_superuser", False):
            detail = f"[DEBUG {type(e).__name__} /analyze] {str(e)[:500]}"
        raise HTTPException(status_code=500, detail=detail)


# ========================================
# CHAT ENDPOINT (V3.0 mit Live-Marktdaten)
# ========================================

class ChatRequest(BaseModel):
    """Chat-Anfrage"""
    message: str
    context: Optional[dict] = None  # Optionaler Analyse-Kontext
    stadt: Optional[str] = None  # Für Live-Marktdaten-Recherche
    conversation_id: Optional[int] = None  # Optionale Konversations-ID


class ChatResponse(BaseModel):
    """Chat-Antwort"""
    response: str
    marktdaten_verwendet: bool = False
    recherche_standort: Optional[str] = None
    conversation_id: Optional[int] = None


@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    V4.0 Chat-Endpoint mit Live-Marktdaten-Recherche + Konversationshistorie + Topic Classifier

    Die KI kann:
    - Fragen zu Immobilien beantworten
    - Live-Marktdaten für spezifische Standorte recherchieren
    - Auf Basis von Analyse-Kontext antworten
    - Konversationshistorie beibehalten
    """
    # Prüfe Usage-Limit
    if not check_usage_limit(db, current_user):
        usage = get_user_total_usage(db, current_user.id)
        raise HTTPException(
            status_code=429,
            detail=f"Nutzungslimit erreicht! Du hast ${usage['total_cost_usd']:.2f} von ${current_user.usage_limit_usd:.2f} verbraucht. Kontaktiere den Admin für mehr."
        )

    client = get_anthropic_client()

    # Handle conversation: get or create
    conversation = None
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create new conversation with auto-title from first message
        title = request.message[:50].strip()
        if len(request.message) > 50:
            title += "..."
        conversation = Conversation(
            user_id=current_user.id,
            title=title
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Load analysis context if conversation is linked to an analysis
    analysis_context = ""
    if conversation.analysis_id:
        analysis = db.query(Analysis).filter(Analysis.id == conversation.analysis_id, Analysis.user_id == current_user.id).first()
        if analysis and analysis.analysis_result:
            try:
                result_data = json.loads(analysis.analysis_result) if isinstance(analysis.analysis_result, str) else analysis.analysis_result
                # Extract key fields
                props = result_data.get("eingabedaten", result_data.get("input", {}))
                score = result_data.get("score", result_data.get("gesamtscore", "N/A"))
                cashflow = result_data.get("cashflow", {})
                empfehlung = result_data.get("empfehlung", result_data.get("recommendation", ""))

                analysis_context = f"""
OBJEKT-DATEN (aus der gespeicherten Analyse):
{json.dumps(result_data, indent=2, ensure_ascii=False)[:8000]}

Du beraetest den Nutzer zu DIESEM konkreten Objekt. Beziehe dich in deinen Antworten immer auf die obigen Daten.
Wenn der Nutzer nach Finanzierung, Foerderungen oder Verhandlung fragt, nutze die konkreten Zahlen aus der Analyse.
"""
            except:
                analysis_context = ""

    # Save user message to DB
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_msg)
    db.commit()

    # Build messages list with conversation history
    messages_for_claude = []
    if request.conversation_id and conversation.messages:
        # Load previous messages (exclude the one we just added, it's already in the list)
        for msg in conversation.messages:
            if msg.id != user_msg.id:
                messages_for_claude.append({"role": msg.role, "content": msg.content})
    # Add current user message
    messages_for_claude.append({"role": "user", "content": request.message})

    # Prüfe ob eine Stadt/Standort in der Nachricht erwähnt wird
    # oder im Kontext vorhanden ist
    standort = request.stadt
    if not standort and request.context:
        standort = request.context.get('stadt')

    # Extrahiere mögliche Standorte aus der Nachricht
    message_lower = request.message.lower()
    stadt_keywords = ['in ', 'für ', 'preise ', 'markt ', 'immobilien ']

    # Live-Marktdaten holen wenn Standort verfügbar
    live_marktdaten = None
    if standort:
        try:
            live_marktdaten = await fetch_live_market_data(
                stadt=standort,
                stadtteil=request.context.get('stadtteil') if request.context else None,
                objekttyp="Eigentumswohnung",
                db=db,
            )
        except:
            pass

    # Build dynamic knowledge prompt using topic classifier
    knowledge_section = build_knowledge_prompt(request.message, max_topics=3)

    # System Prompt für Chat
    chat_system = f"""STRIKTE FORMATIERUNGSREGELN (IMMER EINHALTEN):
1. ABSOLUT KEINE Emojis. Kein einziges Emoji-Zeichen in deiner gesamten Antwort. Keine Ausnahmen. Auch keine Unicode-Symbole wie Pfeile, Haekchen oder Sterne.
2. Verwende ## und ### fuer Ueberschriften nur bei laengeren Antworten. Bei kurzen Fragen KEINE Ueberschriften.
3. Verwende Aufzaehlungszeichen (-) fuer Listen.
4. Halte den Ton professionell, sachlich und kompetent.

WICHTIGSTE REGEL - ANTWORTLAENGE:
- Beantworte die Frage so KURZ und DIREKT wie moeglich.
- Einfache Fragen = 1-3 Saetze. Nicht mehr.
- Nur bei komplexen Fragen (Steuer, Recht, Finanzierung) ausfuehrlicher antworten.
- KEIN Dozieren, KEIN Ausholen, KEIN Wiederholen der Frage.
- Zuerst die Antwort, dann optional kurze Einordnung.
- Beispiel: "Wie gross ist die Wohnung?" -> "Die Wohnung hat 48 m² mit 1 Zimmer." FERTIG.

Du bist AmlakI, ein professioneller Immobilienberater fuer den DACH-Markt.
Antworte in einfacher, verstaendlicher Sprache. Kurz und praegnant.

WICHTIG V4.0:
- Bei Fragen zu konkreten Preisen/Maerkten IMMER die Live-Daten unten verwenden
- Keine generischen Antworten wie "zwischen 2.000 und 10.000 EUR/m2"
- Konkrete Zahlen fuer den gefragten Standort nennen

{analysis_context}

{knowledge_section}

{f'''
LIVE-MARKTDATEN FUER {standort.upper()}:
{json.dumps(live_marktdaten, indent=2, ensure_ascii=False)}
''' if live_marktdaten else ''}

{f'''
ANALYSE-KONTEXT DES NUTZERS:
{json.dumps(request.context, indent=2, ensure_ascii=False)}
''' if request.context else ''}

Antworte auf Deutsch, praezise und hilfreich.
Nutze Markdown fuer Formatierung (fett, Listen, etc.).
Bei Preisfragen: IMMER konkrete Zahlen aus den Live-Daten!"""

    try:
        # Use direct HTTP call to avoid Anthropic SDK unicode issues
        data = call_claude_direct(chat_system, messages_for_claude, max_tokens=4096, db=db, user_id=current_user.id, action_type="chat")

        assistant_text = strip_emojis(data["content"][0]["text"])
        input_tokens = data.get("usage", {}).get("input_tokens", 0)
        output_tokens = data.get("usage", {}).get("output_tokens", 0)

        # Save assistant message to DB
        assistant_msg = ChatMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_text,
            tokens_used=input_tokens + output_tokens
        )
        db.add(assistant_msg)

        # Update conversation timestamp
        conversation.updated_at = datetime.utcnow()
        db.commit()

        return ChatResponse(
            response=assistant_text,
            marktdaten_verwendet=live_marktdaten is not None,
            recherche_standort=standort,
            conversation_id=conversation.id
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Chat-Fehler: {str(e)}")
        raise HTTPException(status_code=500, detail="Chat-Fehler. Bitte versuche es erneut.")


# ============ CONVERSATION ENDPOINTS ============

@app.get("/conversations")
async def list_conversations(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """List all conversations for the current user, newest first."""
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()

    return [{
        "id": c.id,
        "title": c.title,
        "analysis_id": c.analysis_id,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
        "message_count": len(c.messages),
        "last_message": c.messages[-1].content[:100] if c.messages else None
    } for c in conversations]


@app.post("/conversations")
async def create_conversation(data: dict = Body(default={}), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create a new conversation. If analysis_id is given and a conversation already exists for it, return the existing one."""
    analysis_id = data.get("analysis_id")

    # Wenn analysis_id gegeben: pruefen ob schon eine Conversation existiert
    if analysis_id:
        existing = db.query(Conversation).filter(
            Conversation.user_id == current_user.id,
            Conversation.analysis_id == analysis_id
        ).order_by(Conversation.created_at.desc()).first()
        if existing:
            return {"id": existing.id, "title": existing.title, "created_at": existing.created_at.isoformat(), "existing": True}

    conv = Conversation(
        user_id=current_user.id,
        title=data.get("title", "Neue Unterhaltung"),
        analysis_id=analysis_id
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {"id": conv.id, "title": conv.title, "created_at": conv.created_at.isoformat(), "existing": False}


@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get a conversation with all its messages."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conv.id,
        "title": conv.title,
        "analysis_id": conv.analysis_id,
        "created_at": conv.created_at.isoformat(),
        "messages": [{
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        } for m in conv.messages]
    }


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Delete a conversation."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"status": "deleted"}


@app.post("/chat/stream")
async def chat_stream(data: dict = Body(...), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Streaming chat endpoint using Server-Sent Events."""
    message = data.get("message", "")
    conversation_id = data.get("conversation_id")
    context = data.get("context")
    stadt = data.get("stadt")

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Prüfe Usage-Limit
    if not check_usage_limit(db, current_user):
        usage = get_user_total_usage(db, current_user.id)
        raise HTTPException(
            status_code=429,
            detail=f"Nutzungslimit erreicht! Du hast ${usage['total_cost_usd']:.2f} von ${current_user.usage_limit_usd:.2f} verbraucht."
        )

    # Handle conversation: get or create
    conversation = None
    if conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = message[:50].strip()
        if len(message) > 50:
            title += "..."
        conversation = Conversation(
            user_id=current_user.id,
            title=title
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.id

    # Load analysis context if conversation is linked to an analysis
    analysis_context = ""
    if conversation.analysis_id:
        analysis = db.query(Analysis).filter(Analysis.id == conversation.analysis_id, Analysis.user_id == current_user.id).first()
        if analysis and analysis.analysis_result:
            try:
                result_data = json.loads(analysis.analysis_result) if isinstance(analysis.analysis_result, str) else analysis.analysis_result
                # Extract key fields
                props = result_data.get("eingabedaten", result_data.get("input", {}))
                score = result_data.get("score", result_data.get("gesamtscore", "N/A"))
                cashflow = result_data.get("cashflow", {})
                empfehlung = result_data.get("empfehlung", result_data.get("recommendation", ""))

                analysis_context = f"""
OBJEKT-DATEN (aus der gespeicherten Analyse):
{json.dumps(result_data, indent=2, ensure_ascii=False)[:8000]}

Du beraetest den Nutzer zu DIESEM konkreten Objekt. Beziehe dich in deinen Antworten immer auf die obigen Daten.
Wenn der Nutzer nach Finanzierung, Foerderungen oder Verhandlung fragt, nutze die konkreten Zahlen aus der Analyse.
"""
            except:
                analysis_context = ""
    else:
        # No specific analysis linked -- load ALL user analyses as library context
        try:
            user_analyses = db.query(Analysis).filter(
                Analysis.user_id == current_user.id
            ).order_by(Analysis.created_at.desc()).limit(10).all()

            if user_analyses:
                summaries = []
                for a in user_analyses:
                    try:
                        r = json.loads(a.analysis_result) if isinstance(a.analysis_result, str) else a.analysis_result
                        cf = r.get("cashflow_analyse", {})
                        summaries.append(
                            f"- {a.title or 'Unbekannt'}: Score {a.gesamtscore or 'N/A'}/100, "
                            f"Kaufpreis {a.kaufpreis or 'N/A'} EUR, "
                            f"{a.wohnflaeche or 'N/A'} m2, "
                            f"Cashflow {cf.get('monatlicher_cashflow', 'N/A')} EUR/Monat, "
                            f"Verwendung: {a.verwendungszweck or 'N/A'}"
                        )
                    except:
                        summaries.append(f"- {a.title or 'Unbekannt'}: Score {a.gesamtscore or 'N/A'}/100")

                analysis_context = f"""
BIBLIOTHEK DES NUTZERS (gespeicherte Analysen):
{chr(10).join(summaries)}

Du hast Zugriff auf die Bibliothek des Nutzers. Wenn er nach seinen Immobilien fragt, vergleiche sie anhand der obigen Daten.
"""
        except:
            pass

    # Save user message to DB
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=message
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Build messages list with conversation history
    messages_for_claude = []
    if conversation.messages:
        for msg in conversation.messages:
            if msg.id != user_msg.id:
                messages_for_claude.append({"role": msg.role, "content": msg.content})
    messages_for_claude.append({"role": "user", "content": message})

    # Standort detection
    standort = stadt
    if not standort and context:
        standort = context.get('stadt')

    # Live market data
    live_marktdaten = None
    if standort:
        try:
            live_marktdaten = await fetch_live_market_data(
                stadt=standort,
                stadtteil=context.get('stadtteil') if context else None,
                objekttyp="Eigentumswohnung",
                db=db,
            )
        except:
            pass

    # Build dynamic knowledge prompt using topic classifier
    knowledge_section = build_knowledge_prompt(message, max_topics=3)

    # System Prompt
    system_prompt = f"""WICHTIGSTE REGEL: Antworte so KURZ wie moeglich. Wenn eine Zahl reicht, antworte nur mit der Zahl. Wenn ein Satz reicht, schreibe nur einen Satz. Keine Ueberschriften, keine Listen, keine Erklaerungen -- es sei denn der Nutzer fragt explizit nach Details oder einer ausfuehrlichen Erklaerung. Orientiere dich an der Laenge der Frage: kurze Frage = kurze Antwort.

FORMATIERUNGSREGELN:
1. ABSOLUT KEINE Emojis oder Unicode-Symbole.
2. Nutze **Fettschrift** nur fuer einzelne wichtige Begriffe.
3. Ueberschriften und Listen NUR bei komplexen Fragen die eine strukturierte Antwort erfordern.
4. Duze den Nutzer. Professionell aber knapp.

Du bist AmlakI, ein Immobilienberater fuer den DACH-Markt.
Expertenwissen: Bewertung, Finanzierung, Steuer, Foerderungen, Mietrecht, WEG, Due Diligence.

- Bei Preisfragen: konkrete Zahlen aus den Live-Daten nennen, keine Spannen
- Einfache Sprache, kein Fachjargon

{analysis_context}

{knowledge_section}

{f'''
LIVE-MARKTDATEN FUER {standort.upper()}:
{json.dumps(live_marktdaten, indent=2, ensure_ascii=False)}
''' if live_marktdaten else ''}

{f'''
ANALYSE-KONTEXT DES NUTZERS:
{json.dumps(context, indent=2, ensure_ascii=False)}
''' if context else ''}

Antworte auf Deutsch, praezise und hilfreich.
Nutze Markdown fuer Formatierung (fett, Listen, etc.).
Bei Preisfragen: IMMER konkrete Zahlen aus den Live-Daten!"""

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nicht konfiguriert")

    async def generate():
        full_response = ""
        try:
            max_retries = 3
            for attempt in range(max_retries):
                async with httpx.AsyncClient(timeout=120.0) as http_client:
                    async with http_client.stream(
                        "POST",
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": CLAUDE_SONNET_MODEL,
                            "max_tokens": 4096,
                            "stream": True,
                            "system": system_prompt,
                            "messages": messages_for_claude,
                        },
                    ) as response:
                        # Check HTTP status before reading stream
                        if response.status_code == 529 or response.status_code == 503 or response.status_code == 500:
                            # Overloaded/unavailable - retry
                            if attempt < max_retries - 1:
                                print(f"[WARN] Claude API {response.status_code}, Retry {attempt + 1}/{max_retries}...")
                                import asyncio
                                await asyncio.sleep(2 * (attempt + 1))
                                continue
                        if response.status_code != 200:
                            error_body = ""
                            async for chunk in response.aiter_bytes():
                                error_body += chunk.decode("utf-8", errors="replace")
                            print(f"[ERROR] Claude API returned {response.status_code}: {error_body[:500]}")
                            yield f"data: {json.dumps({'error': f'API-Fehler ({response.status_code}). Bitte versuche es spaeter erneut.'})}\n\n"
                            return

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                try:
                                    chunk = json.loads(line[6:])
                                    if chunk.get("type") == "content_block_delta":
                                        text = chunk.get("delta", {}).get("text", "")
                                        if text:
                                            text = strip_emojis(text)
                                            if text:
                                                full_response += text
                                                yield f"data: {json.dumps({'text': text})}\n\n"
                                    elif chunk.get("type") == "error":
                                        error_msg = chunk.get("error", {}).get("message", "Unbekannter Fehler")
                                        print(f"[ERROR] Claude stream error: {error_msg}")
                                        yield f"data: {json.dumps({'error': error_msg})}\n\n"
                                    elif chunk.get("type") == "message_stop":
                                        pass
                                except json.JSONDecodeError:
                                    pass
                        break  # Success - exit retry loop
        except httpx.ReadTimeout:
            print("[ERROR] Claude API timeout nach 120s")
            yield f"data: {json.dumps({'error': 'Die Antwort hat zu lange gedauert. Bitte versuche es erneut.'})}\n\n"
        except Exception as e:
            print(f"[ERROR] Streaming-Fehler: {type(e).__name__}: {str(e)}")
            yield f"data: {json.dumps({'error': 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'})}\n\n"

        # Save to DB after streaming complete
        # TODO: Usage tracking is not implemented for streaming chat.
        # tokens_used is hardcoded to 0. Needs to be fixed to track actual
        # token consumption from the streaming response for accurate billing.
        if full_response:
            assistant_msg = ChatMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=full_response,
                tokens_used=0
            )
            db.add(assistant_msg)
            conversation.updated_at = datetime.utcnow()
            db.commit()

        yield f"data: {json.dumps({'done': True, 'conversation_id': conversation_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ========================================
# /analyze/stream  -- SSE Streaming Version of /analyze
# ========================================
#
# Mirrors /analyze (lines 3683-4990) but yields phase-by-phase SSE events so the
# frontend can render partial UI within ~3-5s of the click instead of waiting
# 25-35s for the full payload. Business logic is REUSED -- this endpoint calls
# the exact same helpers (fetch_live_market_data, calculate_*, berechne_*,
# quick_check, etc.) with the same arguments. Do not refactor /analyze in
# response to changes here; keep the two implementations behaviorally aligned
# but independent.
#
# Premium gating note: we stream all phase data freely (free-tier blur is the
# frontend's responsibility) and only apply the field-stripping at the final
# DB-save step. This keeps the streaming logic simple. The `is_premium` flag
# is included in the `complete` event so the client knows what to blur.

@app.post("/analyze/stream")
async def analyze_property_stream(
    request: AnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """SSE-streaming version of /analyze. Yields phase events so the frontend can render partial UI as data arrives."""

    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"

    async def event_generator():
        import asyncio  # not imported at module scope
        import time as _timing
        # Per-phase timing diagnostics. Sent in the `complete` event so we can
        # see in the browser console which phase actually dominates the wait.
        _t_start = _timing.time()
        _t_last = _t_start
        timings = {}
        def _mark(phase_name: str):
            nonlocal _t_last
            now = _timing.time()
            timings[phase_name] = round(now - _t_last, 2)
            timings[f"{phase_name}_total"] = round(now - _t_start, 2)
            _t_last = now
            print(f"[analyze/stream] {phase_name}: {timings[phase_name]}s (total {timings[f'{phase_name}_total']}s)", flush=True)
        try:
            # ============================================================
            # PRE-FLIGHT: credit check + input validation (yield error, don't raise)
            # ============================================================
            credits = current_user.analysis_credits if current_user.analysis_credits is not None else 1
            is_premium = credits > 0 or current_user.is_superuser

            if not is_premium:
                existing_analyses = db.query(Analysis).filter(Analysis.user_id == current_user.id).count()
                if existing_analyses > 0:
                    yield _sse("error", {
                        "status": 402,
                        "detail": "Keine Analyse-Credits mehr. Kaufe Credits um weitere Analysen durchzufuehren."
                    })
                    return
                is_premium = False

            data = request.property_data
            zweck = request.verwendungszweck

            if data.kaufpreis and data.kaufpreis < 1000:
                yield _sse("error", {
                    "status": 422,
                    "detail": "Kaufpreis muss mindestens 1.000 EUR betragen."
                })
                return

            weights = WEIGHTS_INVESTMENT if zweck == "kapitalanlage" else WEIGHTS_SELF_USE
            client = get_anthropic_client()

            # ============================================================
            # PHASE 1: marktdaten + no-go + warnsignale + kennzahlen + kaufnebenkosten
            # (mirrors /analyze lines 3697-3759 + parts of 3766-3775 + later kennzahlen/kaufnebenkosten blocks)
            # ============================================================
            no_go_check = check_no_gos(data)
            warnsignale = detect_warning_signals(data)

            marktdaten = None
            if data.stadt:
                try:
                    objekttyp = data.objekttyp or "Eigentumswohnung"
                    marktdaten = await fetch_live_market_data(
                        stadt=data.stadt,
                        stadtteil=data.stadtteil,
                        objekttyp=objekttyp,
                        plz=data.plz,
                        db=db,
                    )
                    if marktdaten and marktdaten.get("recherche_methode") == "live_web_search_v3":
                        print(f"[OK] Live-Marktdaten fuer {data.stadt} erfolgreich recherchiert (stream)")
                    else:
                        print(f"[WARN] Fallback-Marktdaten fuer {data.stadt} verwendet (stream)")
                except Exception as e:
                    print(f"[ERROR] Marktdaten-Recherche fehlgeschlagen (stream): {str(e)}")
                    marktdaten = {
                        "standort": f"{data.stadtteil}, {data.stadt}" if data.stadtteil else data.stadt,
                        "kaufpreis_qm_durchschnitt": 3500,
                        "miete_qm_durchschnitt": 10,
                        "datenqualität": "ACHTUNG: Konnte keine Live-Daten abrufen!",
                        "recherche_methode": "error_fallback",
                    }

            # Hausgeld-Setup (used by everything below)
            hausgeld_gesamt_global = data.hausgeld or data.nebenkosten or 0
            hausgeld_ist_geschaetzt = False
            if hausgeld_gesamt_global == 0 and data.wohnflaeche and data.wohnflaeche > 0:
                hausgeld_gesamt_global = round(data.wohnflaeche * 4.0, 2)
                hausgeld_ist_geschaetzt = True

            if data.hausgeld_nicht_umlagefaehig and data.hausgeld_nicht_umlagefaehig > 0:
                hausgeld_nicht_umlagefaehig = data.hausgeld_nicht_umlagefaehig
            else:
                hausgeld_nicht_umlagefaehig = hausgeld_gesamt_global * 0.35

            # Kennzahlen (Live-Marktdaten Vergleich) -- yield early so user sees price-vs-market context fast
            kennzahlen = None
            if data.kaufpreis and data.wohnflaeche:
                preis_pro_qm = round(data.kaufpreis / data.wohnflaeche, 2)
                markt_durchschnitt = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None
                kennzahlen = {
                    "preis_pro_qm": preis_pro_qm,
                    "markt_durchschnitt_qm": markt_durchschnitt,
                    "abweichung_prozent": round(((preis_pro_qm / markt_durchschnitt) - 1) * 100, 1) if markt_durchschnitt else None,
                    "unter_markt": preis_pro_qm < markt_durchschnitt if markt_durchschnitt else None,
                    "marktdaten_quelle": marktdaten.get("recherche_methode", "unbekannt") if marktdaten else "keine",
                    "marktdaten_standort": marktdaten.get("standort") if marktdaten else None,
                    "marktdaten_vertrauen": marktdaten.get("vertrauenswuerdigkeit", "unbekannt") if marktdaten else "keine",
                    "kaufpreisfaktor": round(data.kaufpreis / (data.aktuelle_miete * 12), 1) if data.aktuelle_miete else None,
                    "bruttorendite": round((data.aktuelle_miete * 12 / data.kaufpreis) * 100, 2) if data.aktuelle_miete else None,
                }

            # Kaufnebenkosten
            kaufnebenkosten_result = None
            if data.kaufpreis:
                mit_makler = bool(data.provision) or (data.verkäufertyp and data.verkäufertyp.lower() == "makler")
                kaufnebenkosten_result = calculate_kaufnebenkosten(
                    kaufpreis=data.kaufpreis,
                    bundesland=None,
                    mit_makler=mit_makler,
                )

            _mark("marktdaten")
            yield _sse("marktdaten", {
                "marktdaten": marktdaten,
                "no_go_check": no_go_check,
                "warnsignale": warnsignale,
                "kennzahlen": kennzahlen,
                "kaufnebenkosten": kaufnebenkosten_result,
            })

            # ============================================================
            # PHASE 2: synchronous calculations + KB stuff
            # (mirrors /analyze lines 3760-4165)
            # ============================================================
            investment_metriken = None
            cashflow_analyse = None
            mietschaetzung_info = None

            if zweck == "kapitalanlage" and data.kaufpreis:
                miete = data.aktuelle_miete or 0
                ist_geschaetzte_miete = False

                if data.miete_typ_im_expose == "warmmiete" and data.warmmiete_aus_expose:
                    if not mietschaetzung_info:
                        mietschaetzung_info = {}
                    mietschaetzung_info["warmmiete_warnung"] = True
                    mietschaetzung_info["warmmiete_original"] = data.warmmiete_aus_expose
                    mietschaetzung_info["kaltmiete_abgeleitet"] = miete
                    mietschaetzung_info["hinweis_warmmiete"] = (
                        f"ACHTUNG: Im Exposé war nur eine Warmmiete von {data.warmmiete_aus_expose}€ angegeben. "
                        f"Die Kaltmiete wurde auf {miete}€ geschätzt (Warmmiete minus Nebenkosten). "
                        f"Alle Rendite- und Cashflow-Berechnungen basieren auf der geschätzten Kaltmiete. "
                        f"Bitte den tatsächlichen Mietvertrag prüfen."
                    )

                if miete == 0 and data.wohnflaeche and marktdaten:
                    geschaetzte_miete_qm = marktdaten.get("miete_qm_durchschnitt", 10)
                    miete = data.wohnflaeche * geschaetzte_miete_qm
                    ist_geschaetzte_miete = True
                    mietschaetzung_info = {
                        "ist_geschaetzt": True,
                        "geschaetzte_miete_monat": round(miete, 2),
                        "geschaetzte_miete_qm": round(geschaetzte_miete_qm, 2),
                        "wohnflaeche": data.wohnflaeche,
                        "marktdaten_quelle": marktdaten.get("recherche_methode", "unbekannt"),
                        "standort": marktdaten.get("standort", data.stadt),
                        "hinweis": f"Geschätzt auf Basis aktueller Neuvermietungspreise für {data.stadt}: {round(geschaetzte_miete_qm, 2)} €/m² × {data.wohnflaeche} m² = {round(miete, 2)} €/Monat",
                        "empfehlung": "Basiert auf aktuellen Angebotsmieten, nicht auf Bestandsmietverträgen.",
                    }

                if miete > 0:
                    jahreskaltmiete = miete * 12
                    investment_metriken = calculate_investment_metrics(
                        kaufpreis=data.kaufpreis,
                        jahreskaltmiete=jahreskaltmiete,
                        wohnflaeche=data.wohnflaeche,
                    )

                nebenkosten = hausgeld_nicht_umlagefaehig
                ek = max(0, request.eigenkapital or 0)
                zins = request.zinssatz or 4.3
                tilg = request.tilgung or 1.25

                cashflow_analyse = calculate_cashflow(
                    kaufpreis=data.kaufpreis,
                    monatliche_miete=miete,
                    nebenkosten=nebenkosten,
                    eigenkapital=ek,
                    zinssatz=zins,
                    tilgung=tilg,
                )

                geschaetzte_felder = []
                if ist_geschaetzte_miete:
                    geschaetzte_felder.append("miete")
                if hausgeld_ist_geschaetzt:
                    geschaetzte_felder.append("nebenkosten")
                if data.miete_typ_im_expose == "warmmiete":
                    geschaetzte_felder.append("miete")
                if geschaetzte_felder:
                    cashflow_analyse["geschaetzte_felder"] = list(set(geschaetzte_felder))

                if hausgeld_ist_geschaetzt:
                    cashflow_analyse["hausgeld_geschaetzt"] = True
                    cashflow_analyse["hausgeld_geschaetzt_hinweis"] = (
                        f"Hausgeld nicht im Exposé angegeben. Geschätzt: ~{round(hausgeld_gesamt_global, 0):.0f}€/Monat "
                        f"(~4€/m² × {data.wohnflaeche}m²). Nicht umlagefähiger Anteil: ~{round(hausgeld_nicht_umlagefaehig, 0):.0f}€/Monat."
                    )
                    if not mietschaetzung_info:
                        mietschaetzung_info = {}
                    mietschaetzung_info["hausgeld_geschaetzt"] = True
                    mietschaetzung_info["hausgeld_geschaetzt_wert"] = round(hausgeld_gesamt_global, 2)
                    mietschaetzung_info["hausgeld_nicht_umlagefaehig_geschaetzt"] = round(hausgeld_nicht_umlagefaehig, 2)

            # Steuereffekt
            if cashflow_analyse and data.kaufpreis and zweck == "kapitalanlage":
                gebaeudewert = data.kaufpreis * 0.80
                if data.baujahr and data.baujahr >= 2023:
                    afa_satz = 0.03
                elif data.baujahr and data.baujahr < 1925:
                    afa_satz = 0.025
                else:
                    afa_satz = 0.02
                jaehrliche_afa = gebaeudewert * afa_satz
                ek_local = max(0, request.eigenkapital or 0)
                zins_local = request.zinssatz or 4.3
                miete_local = data.aktuelle_miete or 0
                if miete_local == 0 and data.wohnflaeche and marktdaten:
                    miete_local = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)
                finanzierungssumme = data.kaufpreis - ek_local
                jaehrliche_zinsen = finanzierungssumme * (zins_local / 100)
                absetzbar_jahr = jaehrliche_afa + jaehrliche_zinsen + (hausgeld_nicht_umlagefaehig * 12)
                mieteinnahmen_jahr = miete_local * 12
                steuerlicher_gewinn = mieteinnahmen_jahr - absetzbar_jahr
                steuereffekt_42 = round(-steuerlicher_gewinn * 0.42 / 12, 2)
                steuereffekt_35 = round(-steuerlicher_gewinn * 0.35 / 12, 2)
                cashflow_analyse["steuereffekt"] = {
                    "jaehrliche_afa": round(jaehrliche_afa, 2),
                    "jaehrliche_zinsen": round(jaehrliche_zinsen, 2),
                    "absetzbar_gesamt_jahr": round(absetzbar_jahr, 2),
                    "mieteinnahmen_jahr": round(mieteinnahmen_jahr, 2),
                    "steuerlicher_gewinn_jahr": round(steuerlicher_gewinn, 2),
                    "steuereffekt_monat_42": steuereffekt_42,
                    "steuereffekt_monat_35": steuereffekt_35,
                    "steuerersparnis_monat_42": steuereffekt_42,
                    "steuerersparnis_monat_35": steuereffekt_35,
                    "cashflow_nach_steuer_42": round(cashflow_analyse["monatlicher_cashflow"] + steuereffekt_42, 2),
                    "cashflow_nach_steuer_35": round(cashflow_analyse["monatlicher_cashflow"] + steuereffekt_35, 2),
                }

            # Neuvermietungs-Potenzial
            neuvermietung_potenzial = None
            if zweck == "kapitalanlage" and data.kaufpreis and data.wohnflaeche and marktdaten:
                neuvermietung_miete_qm = marktdaten.get("miete_qm_durchschnitt", 0)
                neuvermietung_miete_monat = data.wohnflaeche * neuvermietung_miete_qm
                wg_aufschlag = 0.25
                wg_miete_monat = neuvermietung_miete_monat * (1 + wg_aufschlag)
                moebliert_aufschlag = 0.20
                moebliert_miete_monat = neuvermietung_miete_monat * (1 + moebliert_aufschlag)
                aktuelle_miete = data.aktuelle_miete or 0
                if aktuelle_miete > 0 and neuvermietung_miete_monat > aktuelle_miete * 1.05:
                    uplift_prozent = round(((neuvermietung_miete_monat - aktuelle_miete) / aktuelle_miete) * 100, 1)
                    neuvermietung_potenzial = {
                        "aktuell": round(aktuelle_miete, 2),
                        "neuvermietung": round(neuvermietung_miete_monat, 2),
                        "neuvermietung_qm": round(neuvermietung_miete_qm, 2),
                        "uplift_prozent": uplift_prozent,
                        "uplift_monat": round(neuvermietung_miete_monat - aktuelle_miete, 2),
                        "uplift_jahr": round((neuvermietung_miete_monat - aktuelle_miete) * 12, 2),
                        "wg_miete": round(wg_miete_monat, 2),
                        "wg_uplift_prozent": round(((wg_miete_monat - aktuelle_miete) / aktuelle_miete) * 100, 1),
                        "moebliert_miete": round(moebliert_miete_monat, 2),
                        "moebliert_uplift_prozent": round(((moebliert_miete_monat - aktuelle_miete) / aktuelle_miete) * 100, 1),
                        "hinweis": "Bei Neuvermietung gilt die Mietpreisbremse: max. 10% über ortsüblicher Vergleichsmiete. WG und möblierte Vermietung unterliegen teilweise anderen Regeln.",
                    }
                elif aktuelle_miete == 0:
                    neuvermietung_potenzial = {
                        "aktuell": 0,
                        "neuvermietung": round(neuvermietung_miete_monat, 2),
                        "neuvermietung_qm": round(neuvermietung_miete_qm, 2),
                        "uplift_prozent": 0,
                        "wg_miete": round(wg_miete_monat, 2),
                        "wg_uplift_prozent": round(wg_aufschlag * 100, 1),
                        "moebliert_miete": round(moebliert_miete_monat, 2),
                        "moebliert_uplift_prozent": round(moebliert_aufschlag * 100, 1),
                        "hinweis": "Bei WG-Vermietung und möblierter Vermietung gelten teilweise andere Regeln als bei normaler Vermietung. Kurzfristige Vermietung (Airbnb) ist in vielen Städten stark reguliert.",
                    }

            tilgungsplan = None
            breakeven_eigenkapital = None
            szenarien = None
            sensitivity_analyse = None

            if data.kaufpreis and data.kaufpreis > 0:
                miete = data.aktuelle_miete or 0
                if miete == 0 and data.wohnflaeche and marktdaten:
                    miete = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)
                nebenkosten = hausgeld_nicht_umlagefaehig
                ek = request.eigenkapital or 0
                zins = request.zinssatz or 4.3
                tilg = request.tilgung or 1.25

                tilgungsplan = calculate_tilgungsplan(
                    kaufpreis=data.kaufpreis,
                    eigenkapital=ek,
                    zinssatz=zins,
                    tilgung=tilg,
                    monatliche_miete=miete if miete > 0 else 0,
                    nebenkosten=nebenkosten,
                    jahre=30,
                    mietsteigerung=1.5,
                    wertsteigerung=1.5,
                )

                if zweck == "kapitalanlage" and miete > 0:
                    breakeven_eigenkapital = calculate_breakeven_eigenkapital(
                        kaufpreis=data.kaufpreis,
                        monatliche_miete=miete,
                        nebenkosten=nebenkosten,
                        zinssatz=zins,
                        tilgung=tilg,
                    )
                    szenarien = generate_scenarios(
                        kaufpreis=data.kaufpreis,
                        monatliche_miete=miete,
                        nebenkosten=nebenkosten,
                        eigenkapital=ek,
                        zinssatz=zins,
                        tilgung=tilg,
                    )
                    sensitivity_analyse = calculate_sensitivity_analysis(
                        kaufpreis=data.kaufpreis,
                        monatliche_miete=miete,
                        nebenkosten=nebenkosten,
                        eigenkapital=ek,
                        zinssatz=zins,
                        tilgung=tilg,
                    )

            investment_vergleich = None
            meilensteine = None
            miet_variationen = None
            finanzierungsoptionen = None

            if data.kaufpreis and data.kaufpreis > 0:
                miete = data.aktuelle_miete or 0
                if miete == 0 and data.wohnflaeche and marktdaten:
                    miete = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)
                nebenkosten = hausgeld_nicht_umlagefaehig
                ek = request.eigenkapital or 0
                zins = request.zinssatz or 4.3
                tilg = request.tilgung or 1.25

                finanzierungsoptionen = calculate_financing_options(
                    kaufpreis=data.kaufpreis,
                    monatliche_miete=miete if miete > 0 else 0,
                    nebenkosten=nebenkosten,
                    eigenkapital=ek,
                )

                if zweck == "kapitalanlage" and miete > 0:
                    investment_vergleich = calculate_investment_comparison(
                        kaufpreis=data.kaufpreis,
                        eigenkapital=ek,
                        monatliche_miete=miete,
                        nebenkosten=nebenkosten,
                        zinssatz=zins,
                        tilgung=tilg,
                    )
                    meilensteine = calculate_key_milestones(
                        kaufpreis=data.kaufpreis,
                        eigenkapital=ek,
                        zinssatz=zins,
                        tilgung=tilg,
                        monatliche_miete=miete,
                        nebenkosten=nebenkosten,
                    )
                    miet_variationen = calculate_rental_variations(
                        kaufpreis=data.kaufpreis,
                        eigenkapital=ek,
                        zinssatz=zins,
                        tilgung=tilg,
                        aktuelle_miete=miete,
                        nebenkosten=nebenkosten,
                    )

            # KB stuff
            verbesserungsvorschlaege = None
            foerderungen_empfehlung = None
            fairer_preis_result = None
            afa_result = None
            leverage_result = None
            quick_check_result = None

            if data.kaufpreis and data.kaufpreis > 0:
                miete = data.aktuelle_miete or 0
                if miete == 0 and data.wohnflaeche and marktdaten:
                    miete = data.wohnflaeche * marktdaten.get("miete_qm_durchschnitt", 10)
                nebenkosten = hausgeld_nicht_umlagefaehig
                ek = request.eigenkapital or 0
                zins = request.zinssatz or 4.3
                tilg = request.tilgung or 1.25
                jahresmiete = miete * 12

                if jahresmiete > 0:
                    kaufpreisfaktor = data.kaufpreis / jahresmiete
                    bruttorendite = (jahresmiete / data.kaufpreis) * 100
                    cashflow_monat = cashflow_analyse.get("monatlicher_cashflow", 0) if cashflow_analyse else 0

                    markt_qm = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None
                    fairer_preis_result = berechne_fairen_preis(
                        kaufpreis=data.kaufpreis,
                        jahresmiete=jahresmiete,
                        wohnflaeche=data.wohnflaeche,
                        markt_qm_preis=markt_qm,
                    )
                    verbesserungsvorschlaege = generiere_verbesserungsvorschlaege(
                        kaufpreis=data.kaufpreis,
                        jahresmiete=jahresmiete,
                        kaufpreisfaktor=kaufpreisfaktor,
                        bruttorendite=bruttorendite,
                        cashflow=cashflow_monat,
                        energieklasse=data.energieklasse,
                        ist_miete=miete,
                        markt_miete=marktdaten.get("miete_qm_durchschnitt", 0) * (data.wohnflaeche or 0) if marktdaten else None,
                        score=0,
                        bundesland=None,
                    )
                    foerderungen_empfehlung = empfehle_foerderungen(
                        selbstnutzung=(zweck == "eigennutzung"),
                        kinder_anzahl=0,
                        energieklasse=data.energieklasse,
                        baujahr=data.baujahr,
                        heizung_alt=(data.baujahr and data.baujahr < 2000),
                        bundesland=None,
                        einkommen=None,
                    )
                    if data.baujahr and data.wohnflaeche:
                        gebaeudewert_kb = data.kaufpreis * 0.8
                        afa_result = berechne_afa(
                            gebaeudewert=gebaeudewert_kb,
                            baujahr=data.baujahr,
                            ist_neubau_ab_2023=(data.baujahr >= 2023),
                            ist_denkmal=False,
                            ist_vermietung=(zweck == "kapitalanlage"),
                        )
                    ek_for_leverage = ek if ek > 0 else data.kaufpreis * 0.12
                    if data.kaufpreis > 0:
                        finanzierungssumme_lev = data.kaufpreis - ek
                        objektrendite = bruttorendite
                        leverage_result = berechne_leverage_effekt(
                            objektrendite=objektrendite,
                            fremdkapitalzins=zins,
                            eigenkapital=ek_for_leverage,
                            fremdkapital=finanzierungssumme_lev,
                        )
                    quick_check_result = quick_check({
                        "bruttorendite": bruttorendite,
                        "kaufpreisfaktor": kaufpreisfaktor,
                        "cashflow": cashflow_monat,
                        "energieklasse": data.energieklasse or "",
                        "erbpacht": False,
                        "sozialbindung": False,
                    })

            _mark("berechnungen")
            yield _sse("berechnungen", {
                "cashflow_analyse": cashflow_analyse,
                "investment_metriken": investment_metriken,
                "tilgungsplan": tilgungsplan,
                "breakeven_eigenkapital": breakeven_eigenkapital,
                "szenarien": szenarien,
                "sensitivity_analyse": sensitivity_analyse,
                "investment_vergleich": investment_vergleich,
                "meilensteine": meilensteine,
                "miet_variationen": miet_variationen,
                "finanzierungsoptionen": finanzierungsoptionen,
                "verbesserungsvorschlaege": verbesserungsvorschlaege,
                "foerderungen": foerderungen_empfehlung,
                "fairer_preis": fairer_preis_result,
                "afa_berechnung": afa_result,
                "leverage_effekt": leverage_result,
                "quick_check_result": quick_check_result,
                "neuvermietung_potenzial": neuvermietung_potenzial,
                "mietschaetzung": mietschaetzung_info,
            })

            # ============================================================
            # PHASE 3: KI-Bewertung (Sonnet) + post-processing + potenzial_szenarien
            # (mirrors /analyze lines 4166-4716)
            # ============================================================
            system_prompt = get_ai_system_prompt()

            analyse_prompt = build_main_analysis_prompt(
                data=data,
                request=request,
                marktdaten=marktdaten,
                no_go_check=no_go_check,
                warnsignale=warnsignale,
                investment_metriken=investment_metriken,
                fairer_preis_result=fairer_preis_result,
                foerderungen_empfehlung=foerderungen_empfehlung,
                cashflow_analyse=cashflow_analyse,
                weights=weights,
                zweck=zweck,
            )

            # Token-streaming Sonnet call: statt zu warten bis die ganze Antwort fertig ist,
            # streamen wir Tokens live und emittieren ki_progress Events alle ~600ms mit dem
            # letzten Text-Schnipsel. Frontend kann den User damit "live tippen" lassen.
            # Endgueltige strukturierte ki_bewertung kommt am Ende wie gehabt.
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                yield _sse("error", {"status": 500, "detail": "ANTHROPIC_API_KEY nicht konfiguriert"})
                return

            import time as _time
            full_response_text = ""
            input_tokens_used = 0
            output_tokens_used = 0
            cache_creation_tokens = 0
            cache_read_tokens = 0
            last_progress_at = _time.time()
            # Progressive sections: emit uebersicht_ready as soon as Sonnet has streamed
            # everything except the (slow) detailed kriterien_begründungen. Detection works
            # because the prompt forces the JSON key order (see build_main_analysis_prompt).
            uebersicht_emitted = False
            UEBERSICHT_MARKER = '"kriterien_begründungen"'

            try:
                async with httpx.AsyncClient(timeout=120.0) as http_client:
                    async with http_client.stream(
                        "POST",
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": CLAUDE_SONNET_MODEL,
                            "max_tokens": 8000,
                            "stream": True,
                            "system": [{
                                "type": "text",
                                "text": system_prompt,
                                "cache_control": {"type": "ephemeral"},
                            }],
                            "messages": [{"role": "user", "content": analyse_prompt}],
                        },
                    ) as stream_response:
                        if stream_response.status_code != 200:
                            error_body = ""
                            async for chunk_bytes in stream_response.aiter_bytes():
                                error_body += chunk_bytes.decode("utf-8", errors="replace")
                            print(f"[ERROR] Sonnet stream {stream_response.status_code}: {error_body[:500]}", flush=True)
                            yield _sse("error", {
                                "status": 500,
                                "detail": "KI-Service voruebergehend nicht erreichbar. Bitte versuche es erneut.",
                            })
                            return

                        async for line in stream_response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            try:
                                chunk = json.loads(line[6:])
                            except json.JSONDecodeError:
                                continue

                            ctype = chunk.get("type")
                            if ctype == "content_block_delta":
                                text = chunk.get("delta", {}).get("text", "")
                                if text:
                                    full_response_text += text

                                    # Progressive sections: when the model has output everything
                                    # up to (but not including) "kriterien_begründungen", we can
                                    # parse the prefix as valid JSON and emit uebersicht_ready
                                    # so the frontend can open the result view ~50s before the
                                    # detailed begruendungen finish streaming.
                                    if not uebersicht_emitted and UEBERSICHT_MARKER in full_response_text:
                                        try:
                                            marker_pos = full_response_text.find(UEBERSICHT_MARKER)
                                            prefix = full_response_text[:marker_pos].rstrip().rstrip(',').rstrip()
                                            # Strip optional markdown fence
                                            if prefix.startswith('```'):
                                                prefix = prefix.split('```', 1)[1]
                                                if prefix.startswith('json'):
                                                    prefix = prefix[4:]
                                                prefix = prefix.strip()
                                            candidate = prefix + '}'
                                            partial = json.loads(candidate)

                                            # Calculate gesamtscore + per-criterion weights from kriterien_scores
                                            partial_scores = partial.get("kriterien_scores", []) or []
                                            partial_kriterien = []
                                            partial_total_weighted = 0.0
                                            for ks in partial_scores:
                                                ks_name = ks.get("name")
                                                if not ks_name:
                                                    continue
                                                ks_score = max(0, min(100, int(ks.get("score", 0) or 0)))
                                                ks_gew = weights.get(ks_name, 0)
                                                ks_weighted = (ks_score * ks_gew) / 100
                                                partial_total_weighted += ks_weighted
                                                partial_kriterien.append({
                                                    "name": ks_name,
                                                    "score": ks_score,
                                                    "gewichtung": ks_gew,
                                                    "gewichteter_score": round(ks_weighted, 2),
                                                    "begründung": "",  # filled in by ki_bewertung event
                                                })
                                            partial_gesamtscore = min(100, round(partial_total_weighted, 1))

                                            # Mirror Erbbau-Penalty (same logic as final post-processing)
                                            if data.erbbaurecht or (data.beschreibung and ('erbpacht' in data.beschreibung.lower() or 'erbbaurecht' in data.beschreibung.lower())):
                                                rl = data.erbbau_restlaufzeit_jahre
                                                if rl is None:
                                                    erbbau_penalty = 15
                                                elif rl < 20:
                                                    erbbau_penalty = 30
                                                elif rl < 30:
                                                    erbbau_penalty = 25
                                                elif rl < 50:
                                                    erbbau_penalty = 18
                                                elif rl < 70:
                                                    erbbau_penalty = 10
                                                else:
                                                    erbbau_penalty = 5
                                                partial_gesamtscore = max(0, round(partial_gesamtscore - erbbau_penalty, 1))

                                            # Mirror Empfehlung mapping
                                            if no_go_check["no_go"]:
                                                partial_empfehlung = "NICHT EMPFEHLENSWERT"
                                            elif partial_gesamtscore >= 70:
                                                partial_empfehlung = "PRÜFENSWERT" if warnsignale["kritisch"] else "EMPFEHLENSWERT"
                                            elif partial_gesamtscore >= 55:
                                                partial_empfehlung = "PRÜFENSWERT"
                                            elif partial_gesamtscore >= 40:
                                                partial_empfehlung = "EHER NICHT EMPFEHLENSWERT"
                                            else:
                                                partial_empfehlung = "NICHT EMPFEHLENSWERT"

                                            yield _sse("uebersicht_ready", {
                                                "gesamtscore": partial_gesamtscore,
                                                "verwendungszweck": zweck,
                                                "kriterien": partial_kriterien,
                                                "stärken": partial.get("stärken", []) or [],
                                                "schwächen": partial.get("schwächen", []) or [],
                                                "zusammenfassung": partial.get("zusammenfassung", "") or "",
                                                "empfehlung": partial_empfehlung,
                                                "fairer_preis": partial.get("fairer_preis"),
                                            })
                                            uebersicht_emitted = True
                                            _mark("uebersicht_ready")
                                        except Exception as parse_err:
                                            # Set emitted=True to avoid retrying on every subsequent chunk.
                                            # Final ki_bewertung event will still arrive at end of stream
                                            # with the complete data, so the user gets the analysis -- they
                                            # just don't get the early result-view opening.
                                            print(f"[WARN] uebersicht_ready partial parse failed: {parse_err}", flush=True)
                                            uebersicht_emitted = True

                                    now = _time.time()
                                    if now - last_progress_at >= 0.6:
                                        last_progress_at = now
                                        yield _sse("ki_progress", {
                                            "chars": len(full_response_text),
                                            "preview": full_response_text[-120:],
                                        })
                            elif ctype == "message_start":
                                msg = chunk.get("message", {}) or {}
                                usage = msg.get("usage", {}) or {}
                                input_tokens_used = usage.get("input_tokens", 0) or 0
                                cache_creation_tokens = usage.get("cache_creation_input_tokens", 0) or 0
                                cache_read_tokens = usage.get("cache_read_input_tokens", 0) or 0
                            elif ctype == "message_delta":
                                usage = chunk.get("usage", {}) or {}
                                if usage.get("output_tokens"):
                                    output_tokens_used = usage["output_tokens"]
            except httpx.ReadTimeout:
                print("[ERROR] Sonnet stream timeout nach 120s", flush=True)
                yield _sse("error", {"status": 504, "detail": "Die Analyse hat zu lange gedauert. Bitte versuche es erneut."})
                return
            except Exception as stream_err:
                print(f"[ERROR] Sonnet stream {type(stream_err).__name__}: {str(stream_err)}", flush=True)
                yield _sse("error", {"status": 500, "detail": "Fehler beim Streaming der KI-Bewertung."})
                return

            # Final progress event so the frontend can show "fertig" before the structured data arrives
            yield _sse("ki_progress", {
                "chars": len(full_response_text),
                "preview": full_response_text[-120:],
                "done": True,
            })

            # Usage logging (combine cache tokens like call_claude_direct does)
            try:
                effective_input = input_tokens_used + cache_creation_tokens + int(cache_read_tokens * 0.1)
                log_usage(
                    db=db,
                    user_id=current_user.id,
                    action_type="analyze",
                    input_tokens=effective_input,
                    output_tokens=output_tokens_used,
                )
            except Exception as log_err:
                print(f"[WARN] Usage-Log fehlgeschlagen: {log_err}")

            json_text = full_response_text.strip()
            if json_text.startswith("```"):
                json_text = json_text.split("```")[1]
                if json_text.startswith("json"):
                    json_text = json_text[4:]
            json_text = json_text.strip()

            try:
                ai_analysis = json.loads(json_text)
            except json.JSONDecodeError as e:
                detail = "Die KI-Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut."
                if getattr(current_user, "is_superuser", False):
                    detail = f"[DEBUG JSONDecodeError /analyze/stream] {str(e)[:500]}"
                yield _sse("error", {"status": 500, "detail": detail})
                return

            kriterien_scores = []
            total_weighted = 0
            for criterion in _extract_kriterien_from_ai(ai_analysis):
                name = criterion["name"]
                score = max(0, min(100, int(criterion["score"])))
                gewichtung = weights.get(name, 0)
                gewichteter_score = (score * gewichtung) / 100
                total_weighted += gewichteter_score
                kriterien_scores.append(CriterionScore(
                    name=name,
                    score=score,
                    gewichtung=gewichtung,
                    gewichteter_score=round(gewichteter_score, 2),
                    begründung=criterion.get("begründung", ""),
                ))

            gesamtscore = min(100, round(total_weighted, 1))

            # Erbbau-Penalty (mirrors /analyze)
            if data.erbbaurecht or (data.beschreibung and ('erbpacht' in data.beschreibung.lower() or 'erbbaurecht' in data.beschreibung.lower())):
                rl = data.erbbau_restlaufzeit_jahre
                if rl is None:
                    erbbau_penalty = 15
                elif rl < 20:
                    erbbau_penalty = 30
                elif rl < 30:
                    erbbau_penalty = 25
                elif rl < 50:
                    erbbau_penalty = 18
                elif rl < 70:
                    erbbau_penalty = 10
                else:
                    erbbau_penalty = 5
                gesamtscore = max(0, round(gesamtscore - erbbau_penalty, 1))

            if no_go_check["no_go"]:
                empfehlung = "NICHT EMPFEHLENSWERT"
            elif gesamtscore >= 70:
                empfehlung = "PRÜFENSWERT" if warnsignale["kritisch"] else "EMPFEHLENSWERT"
            elif gesamtscore >= 55:
                empfehlung = "PRÜFENSWERT"
            elif gesamtscore >= 40:
                empfehlung = "EHER NICHT EMPFEHLENSWERT"
            else:
                empfehlung = "NICHT EMPFEHLENSWERT"

            zusammenfassung_erweitert = ai_analysis['zusammenfassung']
            score_int = int(round(gesamtscore))
            zusammenfassung_erweitert = re.sub(
                r'Score\s+\d+/100',
                f'Score {score_int}/100',
                zusammenfassung_erweitert,
            )
            if score_int >= 80:
                score_label = "SEHR EMPFEHLENSWERT"
            elif score_int >= 70:
                score_label = "EMPFEHLENSWERT"
            elif score_int >= 55:
                score_label = "SOLIDE"
            elif score_int >= 40:
                score_label = "UNTERDURCHSCHNITTLICH"
            else:
                score_label = "NICHT EMPFEHLENSWERT"
            for old_label in ["SEHR EMPFEHLENSWERT", "EMPFEHLENSWERT", "SOLIDE", "UNTERDURCHSCHNITTLICH", "NICHT EMPFEHLENSWERT", "PRÜFENSWERT"]:
                if old_label in zusammenfassung_erweitert and old_label != score_label:
                    zusammenfassung_erweitert = zusammenfassung_erweitert.replace(old_label, score_label)
                    break

            ai_fairer_preis = ai_analysis.get('fairer_preis')
            if ai_fairer_preis and ai_fairer_preis.get('fairer_preis'):
                ai_fp = ai_fairer_preis['fairer_preis']
                if isinstance(ai_fp, (int, float)) and ai_fp > 0:
                    differenz_pct = round((data.kaufpreis / ai_fp - 1) * 100, 1)
                    fairer_preis_result = {
                        "fairer_preis": round(ai_fp),
                        "aktueller_preis": data.kaufpreis,
                        "differenz_prozent": differenz_pct,
                        "bewertung": ai_fairer_preis.get('bewertung', 'Marktgerecht'),
                        "begruendung": ai_fairer_preis.get('begruendung', ''),
                        "nach_rendite": fairer_preis_result.get("nach_rendite") if fairer_preis_result else None,
                        "nach_faktor": fairer_preis_result.get("nach_faktor") if fairer_preis_result else None,
                        "nach_cashflow": fairer_preis_result.get("nach_cashflow") if fairer_preis_result else None,
                    }

            # Potenzial-Szenarien
            potenzial_szenarien = None
            if zweck == "kapitalanlage" and data.kaufpreis and cashflow_analyse:
                szenarien_list = []
                aktueller_cf = cashflow_analyse.get("monatlicher_cashflow", 0)
                aktuelle_rate = cashflow_analyse.get("monatliche_rate", 0)
                aktuelle_nk = cashflow_analyse.get("monatliche_nebenkosten", 0)
                aktuelle_miete_cf = cashflow_analyse.get("monatliche_miete", 0)

                def schaetze_cf_score(cf_monat, kaufpreis, bruttorendite_pct):
                    base = 50
                    if cf_monat >= 0: base = 75
                    elif cf_monat >= -100: base = 55
                    elif cf_monat >= -200: base = 40
                    elif cf_monat >= -300: base = 30
                    else: base = 20
                    if bruttorendite_pct >= 5: base += 15
                    elif bruttorendite_pct >= 4: base += 8
                    elif bruttorendite_pct >= 3.5: base += 3
                    return min(100, max(0, base))

                cf_gewichtung = 0.30
                nicht_cf_score = gesamtscore - (schaetze_cf_score(aktueller_cf, data.kaufpreis,
                    cashflow_analyse.get("bruttorendite_prozent", 0)) * cf_gewichtung)

                def berechne_szenario_score(neuer_cf, neuer_kp, neue_miete):
                    neue_br = (neue_miete * 12 / neuer_kp * 100) if neuer_kp > 0 else 0
                    neuer_cf_score = schaetze_cf_score(neuer_cf, neuer_kp, neue_br)
                    kp_bonus = 0
                    if neuer_kp < data.kaufpreis:
                        einsparung_pct = (data.kaufpreis - neuer_kp) / data.kaufpreis * 100
                        kp_bonus = min(5, einsparung_pct * 0.5)
                    return min(100, round(nicht_cf_score + neuer_cf_score * cf_gewichtung + kp_bonus, 0))

                ek_loc = request.eigenkapital or 0
                zins_loc = request.zinssatz or 4.3
                tilg_loc = request.tilgung or 1.25

                if neuvermietung_potenzial and neuvermietung_potenzial.get("neuvermietung", 0) > aktuelle_miete_cf:
                    neue_miete_nv = neuvermietung_potenzial["neuvermietung"]
                    neuer_cf_nv = neue_miete_nv - aktuelle_rate - aktuelle_nk
                    neuer_score_nv = berechne_szenario_score(neuer_cf_nv, data.kaufpreis, neue_miete_nv)
                    szenarien_list.append({
                        "name": "Bei Neuvermietung",
                        "beschreibung": f"Miete steigt auf {round(neue_miete_nv)} EUR/Monat ({neuvermietung_potenzial.get('neuvermietung_qm', 0):.1f} EUR/m2)",
                        "cashflow": round(neuer_cf_nv),
                        "score": int(neuer_score_nv),
                        "aenderung": int(neuer_score_nv - gesamtscore),
                    })

                verhandlungs_preis = None
                if fairer_preis_result and fairer_preis_result.get("fairer_preis"):
                    fp = fairer_preis_result["fairer_preis"]
                    if fp < data.kaufpreis:
                        verhandlungs_preis = fp
                if not verhandlungs_preis:
                    verhandlungs_preis = round(data.kaufpreis * 0.9)

                if verhandlungs_preis < data.kaufpreis:
                    finanzierungssumme_vh = max(0, verhandlungs_preis - ek_loc)
                    neue_rate_vh = finanzierungssumme_vh * (zins_loc + tilg_loc) / 100 / 12
                    neuer_cf_vh = aktuelle_miete_cf - neue_rate_vh - aktuelle_nk
                    neuer_score_vh = berechne_szenario_score(neuer_cf_vh, verhandlungs_preis, aktuelle_miete_cf)
                    einsparung = data.kaufpreis - verhandlungs_preis
                    szenarien_list.append({
                        "name": "Bei Preisverhandlung",
                        "beschreibung": f"Kaufpreis auf {round(verhandlungs_preis):,} EUR (-{round(einsparung):,} EUR)",
                        "cashflow": round(neuer_cf_vh),
                        "score": int(neuer_score_vh),
                        "aenderung": int(neuer_score_vh - gesamtscore),
                    })

                if neuvermietung_potenzial and neuvermietung_potenzial.get("neuvermietung", 0) > aktuelle_miete_cf and verhandlungs_preis < data.kaufpreis:
                    neue_miete_kombi = neuvermietung_potenzial["neuvermietung"]
                    finanzierungssumme_kombi = max(0, verhandlungs_preis - ek_loc)
                    neue_rate_kombi = finanzierungssumme_kombi * (zins_loc + tilg_loc) / 100 / 12
                    neuer_cf_kombi = neue_miete_kombi - neue_rate_kombi - aktuelle_nk
                    neuer_score_kombi = berechne_szenario_score(neuer_cf_kombi, verhandlungs_preis, neue_miete_kombi)
                    szenarien_list.append({
                        "name": "Neuvermietung + Verhandlung",
                        "beschreibung": "Alle Optimierungen kombiniert",
                        "cashflow": round(neuer_cf_kombi),
                        "score": int(neuer_score_kombi),
                        "aenderung": int(neuer_score_kombi - gesamtscore),
                    })

                if szenarien_list:
                    bester = max(szenarien_list, key=lambda s: s["score"])
                    potenzial_szenarien = {
                        "aktuell": {
                            "score": int(round(gesamtscore)),
                            "cashflow": round(aktueller_cf),
                        },
                        "szenarien": szenarien_list,
                        "bestes_szenario": bester,
                        "max_score": bester["score"],
                    }

            _mark("ki_bewertung")
            yield _sse("ki_bewertung", {
                "gesamtscore": gesamtscore,
                "verwendungszweck": zweck,
                "kriterien": [k.dict() for k in kriterien_scores],
                "stärken": ai_analysis["stärken"],
                "schwächen": ai_analysis["schwächen"],
                "zusammenfassung": zusammenfassung_erweitert,
                "empfehlung": empfehlung,
                "fairer_preis": fairer_preis_result,
                "potenzial_szenarien": potenzial_szenarien,
            })

            # ============================================================
            # PHASE 4: Verhandlungsmail + Besichtigungs-Roadmap (parallel)
            # (mirrors /analyze lines 4721-4879)
            # ============================================================
            verhandlungsmail = None
            besichtigungs_roadmap = None

            def _build_verhandlungs_prompt():
                preis_qm = round(data.kaufpreis / data.wohnflaeche, 2) if data.wohnflaeche else None
                markt_qm = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None
                fairer_p = fairer_preis_result.get("fairer_preis") if fairer_preis_result else None
                vm_label = (marktdaten.get("vergleichs_label") if marktdaten else None) or "Markt-Durchschnitt"
                return f"""Erstelle eine professionelle, hoefliche Verhandlungsnachricht die ein Immobilienkaeufer an den Verkaeufer/Makler senden kann.

OBJEKTDATEN:
- Kaufpreis: {data.kaufpreis:,.0f} EUR
- Wohnflaeche: {data.wohnflaeche or '?'} m2
- Preis/m2: {preis_qm or '?'} EUR
- {vm_label}/m2: {markt_qm or '?'} EUR
- Stadt: {data.stadt or '?'}, {data.stadtteil or ''}
- Baujahr: {data.baujahr or '?'}
- Energieklasse: {data.energieklasse or '?'}
- Zustand: {data.zustand or '?'}
- Fairer Preis laut Analyse: {f'{fairer_p:,.0f} EUR' if fairer_p else 'nicht berechnet'}

ANALYSE-ERGEBNIS:
- Score: {gesamtscore}/100
- Schwaechen: {', '.join(ai_analysis.get('schwächen', [])[:3])}
- Cashflow/Monat: {cashflow_analyse.get('monatlicher_cashflow', '?') if cashflow_analyse else '?'} EUR

REGELN:
1. Hoeflich und professionell, nicht aggressiv
2. Konkretes Preisangebot machen (zwischen fairem Preis und Kaufpreis)
3. Argumente mit Zahlen belegen
4. WICHTIG: Wenn Preis/m2 UNTER Marktdurchschnitt liegt, erwaehne den Marktdurchschnitt NIEMALS
5. Sie-Form, keine Emojis, max 200 Woerter

Antworte NUR mit der fertigen Nachricht."""

            def _build_roadmap_prompt():
                return f"""Erstelle eine Besichtigungs-Checkliste fuer diese spezifische Immobilie. Der Kaeufer war noch NICHT bei der Besichtigung.

OBJEKTDATEN:
- Kaufpreis: {data.kaufpreis:,.0f} EUR
- Wohnflaeche: {data.wohnflaeche or '?'} m2
- Stadt: {data.stadt or '?'}, {data.stadtteil or ''}
- Baujahr: {data.baujahr or '?'}
- Objekttyp: {data.objekttyp or '?'}
- Energieklasse: {data.energieklasse or '?'}
- Zustand: {data.zustand or '?'}
- Heizungsart: {data.heizungsart or '?'}

ANALYSE-ERGEBNIS:
- Score: {gesamtscore}/100
- Schwaechen: {', '.join(ai_analysis.get('schwächen', [])[:4])}
- Warnsignale: {json.dumps(warnsignale.get('signale', [])[:3], ensure_ascii=False) if warnsignale else 'keine'}

Antworte als JSON mit dieser Struktur:
{{
    "checkliste": [{{"kategorie": "...", "punkte": [{{"was_pruefen": "...", "warum": "...", "spezifisch": true}}]}}],
    "fragen_an_verkaeufer": ["..."],
    "verhalten_tipps": {{"do": ["..."], "dont": ["..."]}},
    "naechste_schritte": ["..."]
}}

REGELN: spezifisch fuer das Objekt, max 6 Kategorien, professionell, keine Emojis. Antworte NUR mit dem JSON."""

            def _run_verhandlungsmail_sync():
                from database import SessionLocal
                thread_db = SessionLocal()
                try:
                    mail_result = call_claude_direct(
                        "Du schreibst professionelle Verhandlungsnachrichten fuer Immobilienkaeufer.",
                        [{"role": "user", "content": _build_verhandlungs_prompt()}],
                        max_tokens=800,
                        model="claude-haiku-4-5-20251001",
                        db=thread_db, user_id=current_user.id, action_type="verhandlungsmail",
                    )
                    return strip_emojis(mail_result["content"][0]["text"].strip())
                finally:
                    thread_db.close()

            def _run_roadmap_sync():
                from database import SessionLocal
                thread_db = SessionLocal()
                try:
                    roadmap_result = call_claude_direct(
                        "Du bist ein erfahrener Immobilienberater der Kaeufer auf Besichtigungen vorbereitet.",
                        [{"role": "user", "content": _build_roadmap_prompt()}],
                        max_tokens=2000,
                        model="claude-haiku-4-5-20251001",
                        db=thread_db, user_id=current_user.id, action_type="besichtigung",
                    )
                    roadmap_text = roadmap_result["content"][0]["text"].strip()
                    if roadmap_text.startswith("```"):
                        roadmap_text = roadmap_text.split("```")[1]
                        if roadmap_text.startswith("json"):
                            roadmap_text = roadmap_text[4:]
                    return json.loads(roadmap_text.strip())
                finally:
                    thread_db.close()

            extras_tasks = []
            do_verhandlung = is_premium and bool(data.kaufpreis)
            do_roadmap = request.besichtigt is False
            if do_verhandlung:
                extras_tasks.append(asyncio.to_thread(_run_verhandlungsmail_sync))
            if do_roadmap:
                extras_tasks.append(asyncio.to_thread(_run_roadmap_sync))

            if extras_tasks:
                extras_results = await asyncio.gather(*extras_tasks, return_exceptions=True)
                idx = 0
                if do_verhandlung:
                    vm = extras_results[idx]; idx += 1
                    if isinstance(vm, Exception):
                        print(f"[stream] Verhandlungsmail fehlgeschlagen: {vm}")
                    else:
                        verhandlungsmail = vm
                if do_roadmap:
                    rm = extras_results[idx]; idx += 1
                    if isinstance(rm, Exception):
                        print(f"[stream] Roadmap fehlgeschlagen: {rm}")
                    else:
                        besichtigungs_roadmap = rm

            _mark("extras")
            yield _sse("extras", {
                "verhandlungsmail": verhandlungsmail,
                "besichtigungs_roadmap": besichtigungs_roadmap,
                "besichtigt": request.besichtigt,
            })

            # ============================================================
            # PHASE 5: Build AnalysisResult, apply premium gating, persist, deduct credit, follow-up email
            # (mirrors /analyze lines 4683-4969)
            # ============================================================
            result = AnalysisResult(
                gesamtscore=gesamtscore,
                verwendungszweck=zweck,
                kriterien=kriterien_scores,
                cashflow_analyse=cashflow_analyse,
                investment_metriken=investment_metriken,
                no_go_check=no_go_check,
                warnsignale=warnsignale,
                zusammenfassung=zusammenfassung_erweitert,
                stärken=ai_analysis["stärken"],
                schwächen=ai_analysis["schwächen"],
                empfehlung=empfehlung,
                marktdaten=marktdaten,
                tilgungsplan=tilgungsplan,
                breakeven_eigenkapital=breakeven_eigenkapital,
                szenarien=szenarien,
                sensitivity_analyse=sensitivity_analyse,
                investment_vergleich=investment_vergleich,
                meilensteine=meilensteine,
                miet_variationen=miet_variationen,
                finanzierungsoptionen=finanzierungsoptionen,
                verbesserungsvorschlaege=verbesserungsvorschlaege,
                foerderungen=foerderungen_empfehlung,
                fairer_preis=fairer_preis_result,
                afa_berechnung=afa_result,
                leverage_effekt=leverage_result,
                quick_check_result=quick_check_result,
                kennzahlen=kennzahlen,
                mietschaetzung=mietschaetzung_info,
                kaufnebenkosten=kaufnebenkosten_result,
                neuvermietung_potenzial=neuvermietung_potenzial,
                potenzial_szenarien=potenzial_szenarien,
            )
            result.besichtigt = request.besichtigt
            result.verhandlungsmail = verhandlungsmail
            result.besichtigungs_roadmap = besichtigungs_roadmap

            # Credit abziehen
            if is_premium and not current_user.is_superuser and credits > 0:
                current_user.analysis_credits = credits - 1
                db.commit()

            # Premium-Gating bei der Persistenz (siehe Block-Kommentar oben am Endpoint).
            if not is_premium:
                result.szenarien = None
                result.sensitivity_analyse = None
                result.fairer_preis = None
                result.foerderungen = None
                result.verbesserungsvorschlaege = None
                result.leverage_effekt = None
                result.finanzierungsoptionen = None
                result.breakeven_eigenkapital = None
                result.investment_vergleich = None
                result.afa_berechnung = None
                result.verhandlungsmail = None

            result.is_premium = is_premium

            db_analysis = None
            if request.analysis_id:
                db_analysis = db.query(Analysis).filter(
                    Analysis.id == request.analysis_id,
                    Analysis.user_id == current_user.id,
                ).first()

            if db_analysis:
                db_analysis.property_data = data.dict()
                db_analysis.analysis_result = result.dict()
                db_analysis.verwendungszweck = zweck
                db_analysis.eigenkapital = request.eigenkapital or 0
                db_analysis.zinssatz = request.zinssatz or 4.3
                db_analysis.tilgung = request.tilgung or 1.25
                db_analysis.kaufpreis = data.kaufpreis
                db_analysis.wohnflaeche = data.wohnflaeche
                db_analysis.stadt = data.stadt
                db_analysis.stadtteil = data.stadtteil
                db_analysis.gesamtscore = gesamtscore
                db_analysis.is_premium = is_premium
                db_analysis.title = f"{data.stadt or 'Unbekannt'} - {data.objekttyp or 'Immobilie'}"
                db.commit()
                db.refresh(db_analysis)
            else:
                db_analysis = Analysis(
                    user_id=current_user.id,
                    property_data=data.dict(),
                    analysis_result=result.dict(),
                    verwendungszweck=zweck,
                    eigenkapital=request.eigenkapital or 0,
                    zinssatz=request.zinssatz or 4.3,
                    tilgung=request.tilgung or 1.25,
                    kaufpreis=data.kaufpreis,
                    wohnflaeche=data.wohnflaeche,
                    stadt=data.stadt,
                    stadtteil=data.stadtteil,
                    gesamtscore=gesamtscore,
                    is_premium=is_premium,
                    title=f"{data.stadt or 'Unbekannt'} - {data.objekttyp or 'Immobilie'}",
                )
                db.add(db_analysis)
                db.commit()
                db.refresh(db_analysis)

            result.analysis_id = db_analysis.id

            try:
                n_analyses_total = db.query(Analysis).filter(Analysis.user_id == current_user.id).count()
                n_purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).count()
                if n_analyses_total == 1 and n_purchases == 0:
                    send_analysis_followup_email(
                        to_email=current_user.email,
                        username=current_user.username or "dort",
                        stadt=data.stadt or "deiner Stadt",
                        score=gesamtscore or 0,
                        is_premium=False,
                        user_id=current_user.id,
                    )
            except Exception as e:
                print(f"[WARN] Follow-up email failed (stream): {e}")

            _mark("save")
            yield _sse("complete", {
                "analysis_id": db_analysis.id,
                "is_premium": is_premium,
                "timings": timings,
            })

        except HTTPException as e:
            yield _sse("error", {"status": e.status_code, "detail": e.detail})
            return
        except Exception as e:
            import traceback, sys
            tb = traceback.format_exc()
            print(f"[ERROR] /analyze/stream {type(e).__name__}: {str(e)}", flush=True)
            print(f"[ERROR] Traceback:\n{tb}", flush=True)
            sys.stderr.flush()
            detail = "Fehler bei der Analyse. Bitte versuche es erneut."
            if getattr(current_user, "is_superuser", False):
                detail = f"[DEBUG {type(e).__name__} /analyze/stream] {str(e)[:500]}"
            yield _sse("error", {"status": 500, "detail": detail})
            return

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Health Check Endpoint"""
    return {
        "status": "healthy"
    }


# ========================================
# FEEDBACK FLOW (Free->Paid Conversion-Hebel)
# ========================================
# Nach der ersten Analyse schickt send_analysis_followup_email einen Link mit
# HMAC-signiertem Token. Der User klickt, fuellt das Formular aus und bekommt
# danach den Rabattcode ERSTE20 fuer die naechste Analyse.
#
# Token = JWT mit purpose=feedback, exp=60d. Kein DB-Token-Table noetig.

FEEDBACK_COUPON_CODE = "FEEDBACK3"  # 9€ -> 3€ fuer Einzelanalyse, einmalig pro User
FEEDBACK_DEAL_PRICE_EUR = 3
FEEDBACK_DEAL_REGULAR_EUR = 9
FEEDBACK_TOKEN_PURPOSE = "feedback"
FEEDBACK_TOKEN_EXP_DAYS = 60


def make_feedback_token(user_id: int) -> str:
    """JWT-Token mit purpose=feedback fuer die Mail."""
    from jose import jwt as _jose_jwt
    from auth import SECRET_KEY as _SK, ALGORITHM as _ALG
    payload = {
        "sub": str(user_id),
        "purpose": FEEDBACK_TOKEN_PURPOSE,
        "exp": datetime.utcnow() + timedelta(days=FEEDBACK_TOKEN_EXP_DAYS),
    }
    return _jose_jwt.encode(payload, _SK, algorithm=_ALG)


def verify_feedback_token(token: str) -> Optional[int]:
    """Returns user_id wenn Token gueltig und purpose=feedback, sonst None."""
    from jose import jwt as _jose_jwt, JWTError as _JWTError
    from auth import SECRET_KEY as _SK, ALGORITHM as _ALG
    try:
        payload = _jose_jwt.decode(token, _SK, algorithms=[_ALG])
        if payload.get("purpose") != FEEDBACK_TOKEN_PURPOSE:
            return None
        return int(payload["sub"])
    except (_JWTError, ValueError, KeyError, TypeError):
        return None


class FeedbackCheckResponse(BaseModel):
    valid: bool
    already_submitted: bool = False
    user_name: Optional[str] = None
    user_stadt: Optional[str] = None  # Stadt der letzten Analyse fuer Personalisierung
    last_score: Optional[int] = None


class FeedbackSubmitRequest(BaseModel):
    token: str
    nps_score: int  # 0-10
    what_worked: Optional[str] = None
    what_missed: Optional[str] = None
    would_pay: Optional[str] = None  # "ja" / "nein" / "vielleicht"


class FeedbackSubmitResponse(BaseModel):
    coupon_code: str
    message: str


@app.get("/feedback/check", response_model=FeedbackCheckResponse)
def feedback_check(token: str, db: Session = Depends(get_db)):
    """Prueft Feedback-Token aus Mail-Link, liefert Kontext fuer die Frontend-Seite."""
    user_id = verify_feedback_token(token)
    if not user_id:
        return FeedbackCheckResponse(valid=False)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return FeedbackCheckResponse(valid=False)
    already = db.query(AnalysisFeedback).filter(AnalysisFeedback.user_id == user_id).first()
    last_analysis = (
        db.query(Analysis)
        .filter(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .first()
    )
    return FeedbackCheckResponse(
        valid=True,
        already_submitted=bool(already),
        user_name=(user.full_name.split()[0] if user.full_name else user.username),
        user_stadt=(last_analysis.stadt if last_analysis else None),
        last_score=(int(last_analysis.gesamtscore) if last_analysis and last_analysis.gesamtscore is not None else None),
    )


@app.post("/feedback/submit", response_model=FeedbackSubmitResponse)
def feedback_submit(body: FeedbackSubmitRequest, db: Session = Depends(get_db)):
    """Speichert Feedback und gibt den Rabattcode zurueck.

    Auth ueber HMAC-Token (Mail-Link), nicht ueber JWT-Login. So kann der User
    auch eingeloggt-out Feedback geben falls Session abgelaufen.
    """
    user_id = verify_feedback_token(body.token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Link ungueltig oder abgelaufen. Bitte fordere eine neue Mail an.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    if not (0 <= body.nps_score <= 10):
        raise HTTPException(status_code=422, detail="NPS-Score muss zwischen 0 und 10 liegen")

    # Idempotent: nur ein Feedback pro User. Bei wiederholtem Submit -> Code trotzdem rausgeben.
    existing = db.query(AnalysisFeedback).filter(AnalysisFeedback.user_id == user_id).first()
    if existing:
        return FeedbackSubmitResponse(
            coupon_code=FEEDBACK_COUPON_CODE,
            message="Du hast bereits Feedback gegeben -- hier ist dein Rabattcode nochmal.",
        )

    last_analysis = (
        db.query(Analysis)
        .filter(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .first()
    )

    fb = AnalysisFeedback(
        user_id=user_id,
        nps_score=body.nps_score,
        what_worked=(body.what_worked or "").strip() or None,
        what_missed=(body.what_missed or "").strip() or None,
        would_pay=(body.would_pay or "").strip().lower() or None,
        analysis_id=(last_analysis.id if last_analysis else None),
    )
    db.add(fb)
    db.commit()

    return FeedbackSubmitResponse(
        coupon_code=FEEDBACK_COUPON_CODE,
        message="Danke fuer dein Feedback! Hier ist dein Rabattcode.",
    )


@app.get("/admin/recent-followup-status")
def admin_recent_followup_status(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Zeigt die letzten N Analysen + ob die Follow-Up Mail getriggert wurde + welche Version (alt/neu).

    Trigger-Logik (aus /analyze + /analyze/stream): Mail geht nur raus wenn der
    User zum Zeitpunkt der Analyse exakt 1 Analyse hatte UND 0 Purchases.

    Da die neue Branded Version erst seit dem Deploy live ist, lassen sich Mails
    vor/nach diesem Zeitstempel der alten bzw. neuen Variante zuordnen.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Nur Superuser")

    # Cutoff: ab diesem Zeitpunkt geht die neue Branded HTML Mail raus.
    # Commit 8389561 wurde am 2026-05-11 ~21:35 CEST gepusht, Railway-Deploy
    # war ~21:36 CEST = 19:36 UTC. Vor diesem Zeitpunkt: alte Plain-Text Mail.
    NEW_MAIL_DEPLOY_UTC = datetime(2026, 5, 11, 19, 36, 0)

    recent = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(max(1, min(50, limit)))
        .all()
    )

    rows = []
    for a in recent:
        u = db.query(User).filter(User.id == a.user_id).first()
        # Wie viele Analysen hatte dieser User zum Zeitpunkt von 'a' (inkl. a)?
        n_at_time = db.query(Analysis).filter(
            Analysis.user_id == a.user_id,
            Analysis.created_at <= a.created_at,
        ).count()
        # Wie viele Purchases hatte er zum Zeitpunkt von 'a'?
        n_purchases_at_time = 0
        try:
            from models import Purchase
            n_purchases_at_time = db.query(Purchase).filter(
                Purchase.user_id == a.user_id,
                Purchase.created_at <= a.created_at,
            ).count()
        except Exception:
            pass

        mail_triggered = (n_at_time == 1 and n_purchases_at_time == 0)
        if mail_triggered:
            mail_version = "neu_branded_html" if a.created_at >= NEW_MAIL_DEPLOY_UTC else "alt_plain_text"
        else:
            mail_version = None

        # Hat der User Feedback gegeben?
        has_feedback = db.query(AnalysisFeedback).filter(AnalysisFeedback.user_id == a.user_id).first() is not None

        rows.append({
            "analysis_id": a.id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "user_id": a.user_id,
            "username": u.username if u else None,
            "email_tail": (u.email[-12:] if u and u.email else None),  # letzte 12 Zeichen fuer Privacy
            "is_superuser": bool(u.is_superuser) if u else False,
            "stadt": a.stadt,
            "stadtteil": a.stadtteil,
            "gesamtscore": int(a.gesamtscore) if a.gesamtscore is not None else None,
            "verwendungszweck": a.verwendungszweck,
            "user_total_analyses_at_time": n_at_time,
            "user_purchases_at_time": n_purchases_at_time,
            "followup_mail_triggered": mail_triggered,
            "followup_mail_version": mail_version,
            "user_has_given_feedback": has_feedback,
        })

    return {
        "cutoff_utc": NEW_MAIL_DEPLOY_UTC.isoformat(),
        "rows": rows,
    }


@app.post("/admin/resend-followup")
def admin_resend_followup(
    data: dict = Body(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Resend der neuen Branded Follow-Up Mail an alle qualifizierten User.

    Qualifiziert = mindestens 1 Analyse + 0 Purchases + nicht Superuser.

    Body (alles optional):
        dry_run: bool (default True) -- wenn True, NICHT senden, nur Liste zurueckgeben
        user_ids: list[int] -- nur an diese spezifischen User senden (override Qualifikation)
        limit: int -- max wie viele User verarbeiten
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Nur Superuser")
    data = data or {}
    dry_run = bool(data.get("dry_run", True))
    user_ids = data.get("user_ids")
    limit = int(data.get("limit") or 200)

    # Kandidaten finden
    if user_ids:
        candidates = db.query(User).filter(User.id.in_(user_ids)).all()
    else:
        candidates = db.query(User).filter(User.is_superuser == False).limit(limit).all()

    from models import Purchase

    results = []
    sent_count = 0
    skipped_count = 0
    for u in candidates:
        last_analysis = (
            db.query(Analysis)
            .filter(Analysis.user_id == u.id)
            .order_by(Analysis.created_at.desc())
            .first()
        )
        n_analyses = db.query(Analysis).filter(Analysis.user_id == u.id).count()
        n_purchases = db.query(Purchase).filter(Purchase.user_id == u.id).count() if Purchase else 0

        # Qualifikations-Check (kann via user_ids uebersteuert werden, dann nur Info)
        qualifies = n_analyses >= 1 and n_purchases == 0 and last_analysis is not None
        forced = bool(user_ids)  # bei explicit user_ids zwingen wir auch wenn Bedingung nicht passt

        row = {
            "user_id": u.id,
            "username": u.username,
            "email": u.email,
            "n_analyses": n_analyses,
            "n_purchases": n_purchases,
            "last_stadt": last_analysis.stadt if last_analysis else None,
            "last_score": int(last_analysis.gesamtscore) if last_analysis and last_analysis.gesamtscore is not None else None,
            "qualifies": qualifies,
            "sent": False,
            "error": None,
        }

        if not qualifies and not forced:
            row["skipped_reason"] = "nicht qualifiziert (>=1 Analyse + 0 Kaeufe noetig)"
            skipped_count += 1
            results.append(row)
            continue

        if dry_run:
            row["skipped_reason"] = "dry_run"
            results.append(row)
            continue

        try:
            send_analysis_followup_email(
                to_email=u.email,
                username=u.username or u.full_name or "dort",
                stadt=last_analysis.stadt or "deiner Stadt",
                score=int(last_analysis.gesamtscore) if last_analysis.gesamtscore is not None else 0,
                is_premium=False,
                user_id=u.id,
            )
            row["sent"] = True
            sent_count += 1
        except Exception as send_err:
            row["error"] = f"{type(send_err).__name__}: {str(send_err)[:200]}"
        results.append(row)

    return {
        "dry_run": dry_run,
        "considered": len(candidates),
        "qualifying": sum(1 for r in results if r["qualifies"]),
        "sent": sent_count,
        "skipped": skipped_count,
        "results": results,
    }


@app.post("/admin/test-followup-mail")
def admin_test_followup_mail(
    data: dict = Body(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Sendet die Branded Follow-Up Mail an die eigene Admin-Mailadresse zum 1:1-Testen.

    Nicht-destruktiv (kein DB-Eintrag, kein Credit-Effekt). Nutzt echte
    send_analysis_followup_email -> echte Resend -> echte Mail im Postfach.
    Body kann optional stadt+score uebergeben (sonst Defaults).
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Nur Superuser")
    data = data or {}
    stadt = data.get("stadt") or "Magdeburg"
    try:
        score = int(data.get("score") or 77)
    except (ValueError, TypeError):
        score = 77

    send_analysis_followup_email(
        to_email=current_user.email,
        username=current_user.username or current_user.full_name or "Admin",
        stadt=stadt,
        score=score,
        is_premium=False,  # zum Test-Zweck so simulieren als waere User Free-Tier
        user_id=current_user.id,
    )
    return {
        "ok": True,
        "sent_to": current_user.email,
        "subject": f"Deine Amlaki-Analyse für {stadt} — was hat geholfen, was fehlt?",
        "stadt": stadt,
        "score": score,
        "score_variant": "high" if score >= 65 else ("mid" if score >= 40 else "low"),
    }


@app.get("/admin/feedback")
def admin_list_feedback(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Admin: alle Feedback-Eintraege auflisten (neueste zuerst)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Nur Admin")
    fbs = (
        db.query(AnalysisFeedback)
        .order_by(AnalysisFeedback.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    rows = []
    for f in fbs:
        u = db.query(User).filter(User.id == f.user_id).first()
        rows.append({
            "id": f.id,
            "created_at": f.created_at,
            "user_id": f.user_id,
            "username": u.username if u else None,
            "email": u.email if u else None,
            "nps_score": f.nps_score,
            "what_worked": f.what_worked,
            "what_missed": f.what_missed,
            "would_pay": f.would_pay,
            "analysis_id": f.analysis_id,
        })
    return {"feedback": rows, "total": db.query(AnalysisFeedback).count()}


# /admin/make-first-admin endpoint removed for security


# ========================================
# FUNNEL TRACKING
# ========================================

from jose import JWTError, jwt as _jwt
from auth import SECRET_KEY as _AUTH_SECRET, ALGORITHM as _AUTH_ALG

ALLOWED_TRACK_EVENTS = {
    "pricing_view",
    "package_click",
    "checkout_start",
    "checkout_error",
}


class TrackEventRequest(BaseModel):
    event: str
    session_id: Optional[str] = None
    properties: Optional[dict] = None


def _user_id_from_optional_token(authorization: Optional[str], db: Session) -> Optional[int]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = _jwt.decode(token, _AUTH_SECRET, algorithms=[_AUTH_ALG])
        email = payload.get("sub")
        if not email:
            return None
        user = db.query(User).filter(User.email == email.lower()).first()
        return user.id if user else None
    except JWTError:
        return None


@app.post("/track-event", status_code=204)
def track_event(
    body: TrackEventRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Anonymes Funnel-Tracking. Accepts Bearer token optional, fuer logged-in User-Verknuepfung."""
    if body.event not in ALLOWED_TRACK_EVENTS:
        # Whitelist verhindert Mass-Logging-Spam
        raise HTTPException(status_code=400, detail="Unknown event")

    # Properties sanitizen: max 10 keys, Werte zu str truncen
    safe_props = None
    if body.properties:
        items = list(body.properties.items())[:10]
        safe_props = {k: (str(v)[:200] if v is not None else None) for k, v in items}

    safe_session = (body.session_id or "")[:100] or None
    user_id = _user_id_from_optional_token(authorization, db)

    db.add(TrackingEvent(
        user_id=user_id,
        session_id=safe_session,
        event=body.event,
        properties=safe_props,
    ))
    db.commit()
    return None


@app.get("/admin/funnel")
def get_funnel_stats(
    days: int = 30,
    admin: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Funnel-Conversion: pricing_view -> package_click -> checkout_start -> paid."""
    if not admin.is_superuser:
        raise HTTPException(status_code=403, detail="Admin only")

    since = datetime.utcnow() - timedelta(days=days)

    counts = {}
    for ev in ALLOWED_TRACK_EVENTS:
        n = db.query(TrackingEvent).filter(
            TrackingEvent.event == ev,
            TrackingEvent.created_at >= since,
        ).count()
        counts[ev] = n

    # Unique sessions pro Stufe (deduped)
    def unique_sessions(event):
        rows = db.query(TrackingEvent.session_id).filter(
            TrackingEvent.event == event,
            TrackingEvent.created_at >= since,
            TrackingEvent.session_id.isnot(None),
        ).distinct().all()
        return len(rows)

    unique = {ev: unique_sessions(ev) for ev in ALLOWED_TRACK_EVENTS}

    # Paid in Zeitraum
    paid_count = db.query(Purchase).filter(Purchase.created_at >= since).count()

    # Package-Click Verteilung
    pkg_clicks = {}
    rows = db.query(TrackingEvent).filter(
        TrackingEvent.event == "package_click",
        TrackingEvent.created_at >= since,
    ).all()
    for r in rows:
        pkg = (r.properties or {}).get("package", "unknown")
        pkg_clicks[pkg] = pkg_clicks.get(pkg, 0) + 1

    # Conversion-Rates
    def rate(num, denom):
        return round((num / denom) * 100, 1) if denom else None

    return {
        "period_days": days,
        "events_total": counts,
        "events_unique_sessions": unique,
        "paid_purchases": paid_count,
        "package_click_breakdown": pkg_clicks,
        "conversion_rates_pct": {
            "view_to_click": rate(unique["package_click"], unique["pricing_view"]),
            "click_to_checkout": rate(unique["checkout_start"], unique["package_click"]),
            "checkout_to_paid": rate(paid_count, unique["checkout_start"]),
            "view_to_paid": rate(paid_count, unique["pricing_view"]),
        },
    }


# ========================================
# REDEEM / REVIEW GATE
# ========================================

class RedeemSubmitRequest(BaseModel):
    rating: int
    comment: Optional[str] = None


@app.get("/redeem/{token}")
def redeem_validate(token: str, db: Session = Depends(get_db)):
    """Pruefe Token-Status. Frontend ruft das beim Page-Load auf."""
    rt = db.query(RedemptionToken).filter(RedemptionToken.token == token).first()
    if not rt:
        return {"valid": False, "reason": "not_found"}
    if rt.used:
        return {"valid": False, "reason": "already_used", "credits": rt.credits_to_grant}

    user = db.query(User).filter(User.id == rt.user_id).first()
    masked = ""
    if user and "@" in user.email:
        local, domain = user.email.split("@", 1)
        masked = f"{local[:2]}***@{domain}"
    return {
        "valid": True,
        "credits": rt.credits_to_grant,
        "user_email_masked": masked,
        "user_first_name": (user.full_name.split()[0] if (user and user.full_name) else None),
    }


@app.post("/redeem/{token}")
def redeem_submit(token: str, body: RedeemSubmitRequest, db: Session = Depends(get_db)):
    """Bewertung speichern, Credit gutschreiben, Token entwerten."""
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating muss 1-5 sein")

    rt = db.query(RedemptionToken).filter(RedemptionToken.token == token).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Token nicht gefunden")
    if rt.used:
        raise HTTPException(status_code=410, detail="Token bereits eingeloest")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    comment = (body.comment or "").strip()[:1000] or None
    review = Review(
        user_id=user.id,
        rating=body.rating,
        comment=comment,
        source="redeem_outreach",
    )
    db.add(review)
    db.flush()  # damit review.id verfuegbar

    user.analysis_credits = (user.analysis_credits or 0) + (rt.credits_to_grant or 1)
    rt.used = True
    rt.used_at = datetime.utcnow()
    rt.review_id = review.id
    db.commit()

    return {
        "success": True,
        "credits_granted": rt.credits_to_grant,
        "user_credits_total": user.analysis_credits,
    }


# ========================================
# PAYMENT / STRIPE ENDPOINTS
# ========================================

try:
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
except ImportError:
    stripe = None
    print("WARNING: stripe package not installed. Payment endpoints will not work.")

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://amlaki.de")

# Produkt-Preise (Stripe Price IDs werden in Env Vars gesetzt)
CREDIT_PACKAGES = {
    "single": {"credits": 1, "price_cents": 900, "label": "1 Analyse", "price_label": "9"},
    "pack5": {"credits": 5, "price_cents": 3500, "label": "5 Analysen", "price_label": "35"},
    "pack10": {"credits": 10, "price_cents": 5000, "label": "10 Analysen", "price_label": "50"},
}


@app.get("/payments/credits")
def get_credits(current_user: User = Depends(get_current_active_user)):
    """Gibt aktuelle Credits des Users zurück"""
    credits = current_user.analysis_credits if current_user.analysis_credits is not None else 1
    return {
        "credits": credits,
        "is_superuser": current_user.is_superuser,
        "packages": CREDIT_PACKAGES
    }


@app.post("/payments/create-checkout")
def create_checkout_session(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Erstellt eine Stripe Checkout Session"""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe ist noch nicht konfiguriert.")

    package_id = data.get("package", "single")
    coupon_code = data.get("coupon", "").strip().upper()
    if package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Ungueltiges Paket")

    package = CREDIT_PACKAGES[package_id]
    price_cents = package["price_cents"]

    # Rabattcode pruefen
    discount_applied = False
    coupon_rejected_reason = None  # falls Frontend Hinweis zeigen will
    VALID_COUPONS = {
        "WILLKOMMEN20": {"discount_percent": 20, "max_uses_per_user": 1},
        "ERSTE20": {"discount_percent": 20, "max_uses_per_user": 1},
        # FEEDBACK3: aggressiver Deal nach Feedback. 9€ -> 3€. Nur fuer
        # Einzelanalyse, sonst Marge zerstoert.
        "FEEDBACK3": {"discount_percent": 67, "max_uses_per_user": 1, "applies_to": ["single"]},
    }

    if coupon_code and coupon_code in VALID_COUPONS:
        coupon = VALID_COUPONS[coupon_code]

        # Scope-Check: manche Codes gelten nur fuer bestimmte Pakete
        applies_to = coupon.get("applies_to")
        if applies_to and package_id not in applies_to:
            coupon_rejected_reason = f"Code {coupon_code} gilt nur fuer Einzelanalyse."
            print(f"[COUPON] {coupon_code} verworfen: package={package_id} nicht in {applies_to}")
        else:
            # Check if user already used this coupon (via purchase history)
            existing_use = db.query(Purchase).filter(
                Purchase.user_id == current_user.id,
                Purchase.coupon_code == coupon_code
            ).first() if hasattr(Purchase, 'coupon_code') else None

            if existing_use:
                coupon_rejected_reason = f"Code {coupon_code} wurde bereits eingeloest."
                print(f"[COUPON] {coupon_code} bereits verwendet von User {current_user.id}")
            else:
                discount = coupon["discount_percent"]
                price_cents = int(price_cents * (100 - discount) / 100)
                discount_applied = True
                print(f"[COUPON] {coupon_code} angewendet fuer User {current_user.id}: {discount}% Rabatt -> {price_cents/100:.2f} EUR")
    elif coupon_code:
        coupon_rejected_reason = f"Code {coupon_code} ist ungueltig."
        print(f"[COUPON] Ungueltiger Code: {coupon_code}")

    try:
        session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": price_cents,
                    "product_data": {
                        "name": f"AmlakiAI - {package['label']}" + (f" ({coupon_code})" if discount_applied else ""),
                        "description": f"{package['credits']} Analyse-Credit{'s' if package['credits'] > 1 else ''}" + (f" - {VALID_COUPONS[coupon_code]['discount_percent']}% Rabatt" if discount_applied else ""),
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{FRONTEND_URL}/analyze?payment=success&credits={package['credits']}",
            cancel_url=f"{FRONTEND_URL}/analyze?payment=cancelled",
            client_reference_id=str(current_user.id),
            metadata={
                "user_id": str(current_user.id),
                "package": package_id,
                "credits": str(package["credits"]),
                "coupon": coupon_code if discount_applied else "",
            },
        )

        return {"checkout_url": session.url}

    except stripe.error.StripeError as e:
        print(f"[ERROR] Stripe-Fehler: {str(e)}")
        raise HTTPException(status_code=500, detail="Zahlungsfehler. Bitte versuche es erneut.")


@app.post("/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe Webhook - wird nach erfolgreicher Zahlung aufgerufen"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook Secret nicht konfiguriert")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session.get("metadata", {}).get("user_id", 0))
        credits_to_add = int(session.get("metadata", {}).get("credits", 0))
        package_id = session.get("metadata", {}).get("package", "single")

        if user_id and credits_to_add:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                current_credits = user.analysis_credits if user.analysis_credits is not None else 0
                user.analysis_credits = current_credits + credits_to_add

                # Purchase tracken
                from models import Purchase
                package_info = CREDIT_PACKAGES.get(package_id, {})
                purchase = Purchase(
                    user_id=user_id,
                    stripe_session_id=session.get("id"),
                    package=package_id,
                    credits=credits_to_add,
                    amount_cents=package_info.get("price_cents", 0),
                    currency="eur",
                )
                db.add(purchase)
                db.commit()
                print(f"[PAYMENT] User {user_id} kaufte {package_id}: +{credits_to_add} Credits, {package_info.get('price_cents', 0)} Cent")

    return {"status": "ok"}


# ========================================
# ADMIN ENDPOINTS
# ========================================

from schemas import AdminUserResponse, AdminUserUpdate, AdminStatsResponse, RevenueStatsResponse, RevenueDataPoint, PurchaseResponse
from models import Purchase
from datetime import datetime, timedelta

async def get_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Prüft ob User Admin/Superuser ist"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin-Rechte erforderlich"
        )
    return current_user


@app.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin-Statistiken abrufen"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    blocked_users = db.query(User).filter(User.is_active == False).count()
    total_analyses = db.query(Analysis).count()

    users_today = db.query(User).filter(User.created_at >= today_start).count()
    users_this_week = db.query(User).filter(User.created_at >= week_start).count()
    analyses_today = db.query(Analysis).filter(Analysis.created_at >= today_start).count()
    analyses_this_week = db.query(Analysis).filter(Analysis.created_at >= week_start).count()

    # Revenue-Daten
    from sqlalchemy import func as sqlfunc
    total_revenue = db.query(sqlfunc.coalesce(sqlfunc.sum(Purchase.amount_cents), 0)).scalar()
    total_purchases = db.query(Purchase).count()

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        blocked_users=blocked_users,
        total_analyses=total_analyses,
        users_today=users_today,
        users_this_week=users_this_week,
        analyses_today=analyses_today,
        analyses_this_week=analyses_this_week,
        total_revenue_cents=total_revenue,
        total_purchases=total_purchases,
    )


@app.get("/admin/users", response_model=List[AdminUserResponse])
async def get_all_users(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Alle User abrufen (nur Admin)"""
    users = db.query(User).offset(skip).limit(limit).all()

    from sqlalchemy import func as sqlfunc

    result = []
    for user in users:
        # Zähle Analysen
        analyses_count = db.query(Analysis).filter(Analysis.user_id == user.id).count()

        # Letzte Aktivität (letzte Analyse)
        last_analysis = db.query(Analysis).filter(
            Analysis.user_id == user.id
        ).order_by(Analysis.updated_at.desc()).first()

        last_activity = last_analysis.updated_at if last_analysis else user.created_at

        # Usage-Daten
        usage = get_user_total_usage(db, user.id)

        # Purchase-Daten
        user_purchases = db.query(Purchase).filter(Purchase.user_id == user.id).order_by(Purchase.created_at.desc()).all()
        total_purchased_credits = sum(p.credits for p in user_purchases)
        total_revenue_cents = sum(p.amount_cents for p in user_purchases)

        # Reviews
        user_reviews = db.query(Review).filter(Review.user_id == user.id).order_by(Review.created_at.desc()).all()
        avg_rating = (sum(r.rating for r in user_reviews) / len(user_reviews)) if user_reviews else None

        result.append(AdminUserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            updated_at=user.updated_at,
            analyses_count=analyses_count,
            last_activity=last_activity,
            usage_limit_usd=user.usage_limit_usd or 5.0,
            total_cost_usd=usage["total_cost_usd"],
            total_requests=usage["total_requests"],
            analysis_credits=user.analysis_credits if user.analysis_credits is not None else 0,
            total_purchased_credits=total_purchased_credits,
            total_revenue_cents=total_revenue_cents,
            purchases=[PurchaseResponse(
                id=p.id, created_at=p.created_at, package=p.package,
                credits=p.credits, amount_cents=p.amount_cents, currency=p.currency or "eur"
            ) for p in user_purchases],
            avg_rating=avg_rating,
            reviews_count=len(user_reviews),
            reviews=[{
                "id": r.id, "rating": r.rating, "comment": r.comment,
                "source": r.source, "created_at": r.created_at,
            } for r in user_reviews],
        ))

    return result


@app.get("/admin/users/{user_id}", response_model=AdminUserResponse)
async def get_user_details(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Einzelnen User abrufen (nur Admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    analyses_count = db.query(Analysis).filter(Analysis.user_id == user.id).count()
    last_analysis = db.query(Analysis).filter(
        Analysis.user_id == user.id
    ).order_by(Analysis.updated_at.desc()).first()
    last_activity = last_analysis.updated_at if last_analysis else user.created_at

    # Usage-Daten
    usage = get_user_total_usage(db, user.id)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
        analyses_count=analyses_count,
        last_activity=last_activity,
        usage_limit_usd=user.usage_limit_usd or 5.0,
        total_cost_usd=usage["total_cost_usd"],
        total_requests=usage["total_requests"]
    )


@app.patch("/admin/users/{user_id}", response_model=AdminUserResponse)
async def update_user_admin(
    user_id: int,
    user_update: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """User bearbeiten (nur Admin) - blocken, aktivieren, etc."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    # Verhindere, dass Admin sich selbst deaktiviert
    if user.id == admin.id and user_update.is_active == False:
        raise HTTPException(status_code=400, detail="Du kannst dich nicht selbst deaktivieren")

    # Update Felder
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.is_superuser is not None:
        user.is_superuser = user_update.is_superuser
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.email is not None:
        # Prüfe ob E-Mail schon existiert
        existing = db.query(User).filter(User.email == user_update.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="E-Mail bereits vergeben")
        user.email = user_update.email
    if user_update.usage_limit_usd is not None:
        user.usage_limit_usd = user_update.usage_limit_usd

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    analyses_count = db.query(Analysis).filter(Analysis.user_id == user.id).count()
    last_analysis = db.query(Analysis).filter(
        Analysis.user_id == user.id
    ).order_by(Analysis.updated_at.desc()).first()
    last_activity = last_analysis.updated_at if last_analysis else user.created_at

    # Usage-Daten
    usage = get_user_total_usage(db, user.id)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
        analyses_count=analyses_count,
        last_activity=last_activity,
        usage_limit_usd=user.usage_limit_usd or 5.0,
        total_cost_usd=usage["total_cost_usd"],
        total_requests=usage["total_requests"]
    )


@app.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_admin(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """User löschen (nur Admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    # Verhindere, dass Admin sich selbst löscht
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Du kannst dich nicht selbst löschen")

    # Lösche alle Conversations und Messages des Users
    conversations = db.query(Conversation).filter(Conversation.user_id == user_id).all()
    for conv in conversations:
        db.query(ChatMessage).filter(ChatMessage.conversation_id == conv.id).delete()
        db.delete(conv)

    # Manuell FK-abhaengige Records loeschen (kein cascade gesetzt)
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_id).delete()
    db.query(RedemptionToken).filter(RedemptionToken.user_id == user_id).delete()
    db.query(Review).filter(Review.user_id == user_id).delete()
    db.query(TrackingEvent).filter(TrackingEvent.user_id == user_id).delete()
    db.query(PerfLog).filter(PerfLog.user_id == user_id).delete()
    # PasswordResetToken nutzt 'email' (nicht user_id) als FK
    db.query(PasswordResetToken).filter(PasswordResetToken.email == user.email).delete()

    # Lösche User (Analysen + UsageLogs + Purchases werden durch cascade gelöscht)
    db.delete(user)
    db.commit()

    return None


@app.get("/admin/users/{user_id}/analyses", response_model=List[AnalysisListItem])
async def get_user_analyses_admin(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Alle Analysen eines Users abrufen (nur Admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    analyses = db.query(Analysis).filter(Analysis.user_id == user_id).order_by(Analysis.created_at.desc()).all()
    return analyses


@app.get("/admin/users/{user_id}/reviews")
async def get_user_reviews_admin(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Alle Reviews eines Users (nur Admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")
    rows = db.query(Review).filter(Review.user_id == user_id).order_by(Review.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "source": r.source,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@app.get("/admin/perf")
async def get_perf_stats(
    hours: int = 24,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Response-Time Stats pro Endpoint ueber den angegebenen Zeitraum."""
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = db.query(PerfLog).filter(PerfLog.created_at >= since).all()

    by_endpoint = {}
    for r in rows:
        by_endpoint.setdefault(r.endpoint, []).append(r)

    def percentile(arr, p):
        if not arr:
            return 0
        s = sorted(arr)
        k = int(len(s) * p / 100)
        return s[min(k, len(s) - 1)]

    result = []
    for endpoint, logs in by_endpoint.items():
        durations = [l.duration_ms for l in logs]
        errors = sum(1 for l in logs if l.status_code and l.status_code >= 400)
        result.append({
            "endpoint": endpoint,
            "count": len(logs),
            "errors": errors,
            "error_rate_pct": round((errors / len(logs)) * 100, 1) if logs else 0,
            "p50_ms": percentile(durations, 50),
            "p95_ms": percentile(durations, 95),
            "p99_ms": percentile(durations, 99),
            "max_ms": max(durations) if durations else 0,
            "avg_ms": int(sum(durations) / len(durations)) if durations else 0,
        })

    result.sort(key=lambda x: x["count"], reverse=True)

    return {
        "period_hours": hours,
        "total_requests": len(rows),
        "endpoints": result,
    }


@app.get("/admin/reviews")
async def get_all_reviews_admin(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    """Alle Reviews (nur Admin) - sortiert nach Datum, mit User-Email."""
    rows = (
        db.query(Review, User)
        .join(User, Review.user_id == User.id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "source": r.source,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "user_id": u.id,
            "user_email": u.email,
            "user_username": u.username,
        }
        for r, u in rows
    ]


# ========================================
# ADMIN EMAIL ENDPOINT
# ========================================

@app.post("/admin/users/{user_id}/send-email")
async def send_email_to_user(
    user_id: int,
    data: dict = Body(...),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """E-Mail an User senden + optional Credits schenken (nur Admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    subject = data.get("subject", "")
    body_text = data.get("body", "")
    add_credits = data.get("add_credits", 0)

    if not subject or not body_text:
        raise HTTPException(status_code=400, detail="Betreff und Text sind Pflichtfelder")

    # E-Mail via Resend senden (SMTP als Fallback)
    email_sent = False
    if RESEND_API_KEY:
        email_sent = send_email_via_resend(user.email, subject, body_text)
        if not email_sent:
            raise HTTPException(status_code=500, detail="E-Mail konnte nicht gesendet werden. Resend API Fehler.")
    elif SMTP_PASS:
        msg = MIMEMultipart()
        msg["From"] = f"Amlaki <{SMTP_USER}>"
        msg["To"] = user.email
        msg["Subject"] = subject
        msg["Reply-To"] = "arya@amlaki.de"
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        try:
            with smtplib.SMTP_SSL(SMTP_HOST, 465, timeout=10) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            email_sent = True
        except Exception:
            try:
                with smtplib.SMTP(SMTP_HOST, 587, timeout=10) as server:
                    server.starttls()
                    server.login(SMTP_USER, SMTP_PASS)
                    server.send_message(msg)
                email_sent = True
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"E-Mail konnte nicht gesendet werden: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail="Weder RESEND_API_KEY noch SMTP konfiguriert.")

    # Credits hinzufügen wenn gewünscht
    credits_added = 0
    if add_credits and add_credits > 0:
        current_credits = user.analysis_credits if user.analysis_credits is not None else 0
        user.analysis_credits = current_credits + add_credits
        credits_added = add_credits
        db.commit()

    print(f"[ADMIN] E-Mail an {user.email} gesendet. Betreff: {subject}. Credits +{credits_added}")
    return {
        "success": True,
        "email_sent": email_sent,
        "credits_added": credits_added,
        "message": f"E-Mail an {user.email} gesendet" + (f" + {credits_added} Credits geschenkt" if credits_added > 0 else "")
    }


# ========================================
# REVENUE ADMIN ENDPOINT
# ========================================

@app.get("/admin/revenue", response_model=RevenueStatsResponse)
async def get_revenue_stats(
    period: str = "30d",
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Revenue-Statistiken mit Zeitfilter: today, 7d, 30d, 90d, 365d"""
    from sqlalchemy import func as sqlfunc

    now = datetime.utcnow()
    period_map = {
        "today": (timedelta(days=1), "hour"),
        "7d": (timedelta(days=7), "day"),
        "30d": (timedelta(days=30), "day"),
        "90d": (timedelta(days=90), "week"),
        "365d": (timedelta(days=365), "month"),
    }

    delta, group_by = period_map.get(period, (timedelta(days=30), "day"))
    start_date = now - delta

    purchases = db.query(Purchase).filter(Purchase.created_at >= start_date).order_by(Purchase.created_at).all()

    total_revenue_cents = sum(p.amount_cents for p in purchases)
    total_credits = sum(p.credits for p in purchases)

    # Gruppierung fuer Diagramm
    data_points = []
    if group_by == "hour":
        for hour in range(24):
            dt = start_date.replace(hour=hour, minute=0, second=0, microsecond=0)
            dt_end = dt + timedelta(hours=1)
            bucket = [p for p in purchases if dt <= p.created_at < dt_end]
            data_points.append(RevenueDataPoint(
                date=dt.strftime("%H:00"),
                revenue_cents=sum(p.amount_cents for p in bucket),
                purchases=len(bucket),
                credits=sum(p.credits for p in bucket),
            ))
    elif group_by == "day":
        current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        while current <= now:
            next_day = current + timedelta(days=1)
            bucket = [p for p in purchases if current <= p.created_at < next_day]
            data_points.append(RevenueDataPoint(
                date=current.strftime("%d.%m."),
                revenue_cents=sum(p.amount_cents for p in bucket),
                purchases=len(bucket),
                credits=sum(p.credits for p in bucket),
            ))
            current = next_day
    elif group_by == "week":
        current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        while current <= now:
            next_week = current + timedelta(weeks=1)
            bucket = [p for p in purchases if current <= p.created_at < next_week]
            data_points.append(RevenueDataPoint(
                date=f"KW {current.strftime('%V')}",
                revenue_cents=sum(p.amount_cents for p in bucket),
                purchases=len(bucket),
                credits=sum(p.credits for p in bucket),
            ))
            current = next_week
    elif group_by == "month":
        current = start_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        while current <= now:
            if current.month == 12:
                next_month = current.replace(year=current.year + 1, month=1)
            else:
                next_month = current.replace(month=current.month + 1)
            bucket = [p for p in purchases if current <= p.created_at < next_month]
            data_points.append(RevenueDataPoint(
                date=current.strftime("%b %y"),
                revenue_cents=sum(p.amount_cents for p in bucket),
                purchases=len(bucket),
                credits=sum(p.credits for p in bucket),
            ))
            current = next_month

    return RevenueStatsResponse(
        period=period,
        total_revenue_cents=total_revenue_cents,
        total_purchases=len(purchases),
        total_credits=total_credits,
        data_points=data_points,
    )


@app.get("/admin/users-chart")
async def get_users_chart(
    period: str = "30d",
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """User-Registrierungen im Zeitverlauf"""
    now = datetime.utcnow()
    period_map = {
        "today": (timedelta(days=1), "hour"),
        "7d": (timedelta(days=7), "day"),
        "30d": (timedelta(days=30), "day"),
        "90d": (timedelta(days=90), "week"),
        "365d": (timedelta(days=365), "month"),
    }

    delta, group_by = period_map.get(period, (timedelta(days=30), "day"))
    start_date = now - delta

    all_users = db.query(User).filter(User.created_at >= start_date).order_by(User.created_at).all()
    total_users_db = db.query(User).count()

    data_points = []
    if group_by == "hour":
        for hour in range(24):
            dt = start_date.replace(hour=hour, minute=0, second=0, microsecond=0)
            dt_end = dt + timedelta(hours=1)
            count = len([u for u in all_users if dt <= u.created_at < dt_end])
            data_points.append({"date": dt.strftime("%H:00"), "count": count})
    elif group_by == "day":
        current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        while current <= now:
            next_day = current + timedelta(days=1)
            count = len([u for u in all_users if current <= u.created_at < next_day])
            data_points.append({"date": current.strftime("%d.%m."), "count": count})
            current = next_day
    elif group_by == "week":
        current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        while current <= now:
            next_week = current + timedelta(weeks=1)
            count = len([u for u in all_users if current <= u.created_at < next_week])
            data_points.append({"date": f"KW {current.strftime('%V')}", "count": count})
            current = next_week
    elif group_by == "month":
        current = start_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        while current <= now:
            if current.month == 12:
                next_month = current.replace(year=current.year + 1, month=1)
            else:
                next_month = current.replace(month=current.month + 1)
            count = len([u for u in all_users if current <= u.created_at < next_month])
            data_points.append({"date": current.strftime("%b %y"), "count": count})
            current = next_month

    return {
        "period": period,
        "total_new": len(all_users),
        "total_all": total_users_db,
        "data_points": data_points,
    }


# ========================================
# AGENT ADMIN ENDPOINTS
# ========================================

from models import AgentConfig


@app.get("/admin/agents")
def list_agents(current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Liste aller Research-Agents mit vollstaendiger Konfiguration"""
    agents = db.query(AgentConfig).order_by(AgentConfig.id).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "display_name": a.display_name,
            "description": a.description,
            "enabled": a.enabled,
            "schedule": a.schedule,
            "prompt": a.prompt,
            "source_urls": a.source_urls,
            "target_file": a.target_file,
            "target_section": a.target_section,
            "model": a.model or "claude-haiku-4-5-20251001",
            "max_tokens": a.max_tokens or 1500,
            "last_run": a.last_run.isoformat() if a.last_run else None,
            "last_status": a.last_status,
            "last_error": a.last_error,
            "last_result": a.last_result,
        }
        for a in agents
    ]


@app.patch("/admin/agents/{agent_id}")
def update_agent(agent_id: int, data: dict = Body(...), current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Agent-Konfiguration vollstaendig aktualisieren"""
    agent = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent nicht gefunden")

    for field in ["enabled", "display_name", "description", "schedule", "prompt", "source_urls", "target_file", "target_section", "model", "max_tokens"]:
        if field in data:
            setattr(agent, field, data[field])

    db.commit()
    return {"status": "ok", "agent": agent.name}


@app.post("/admin/agents/{agent_id}/run")
async def run_agent_endpoint(agent_id: int, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Agent manuell ausfuehren -- dynamisch oder legacy"""
    agent = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent nicht gefunden")

    agent.last_status = "running"
    agent.last_run = datetime.utcnow()
    db.commit()

    try:
        if agent.prompt:
            # Neuer dynamischer Runner
            from agents.dynamic_runner import run_agent
            result = run_agent(agent)
            agent.last_status = result["status"]
            agent.last_error = result.get("error")
            agent.last_result = result.get("result")
        else:
            # Legacy: hardcoded Agents (zinsen, news)
            if agent.name == "zinsen":
                from agents.zinsen_monitor import run as legacy_run
            elif agent.name == "news":
                from agents.news_agent import run as legacy_run
            else:
                raise ValueError(f"Agent '{agent.name}' hat keinen Prompt und keinen Legacy-Runner")
            success = legacy_run()
            agent.last_status = "success" if success else "error"
            agent.last_error = None if success else "Agent hat Fehler zurueckgegeben"
            agent.last_result = None
    except Exception as e:
        agent.last_status = "error"
        agent.last_error = str(e)[:500]

    agent.last_run = datetime.utcnow()
    db.commit()

    return {"status": agent.last_status, "error": agent.last_error, "result": agent.last_result}


@app.post("/admin/agents")
def create_agent(data: dict = Body(...), current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Neuen Agent erstellen mit vollstaendiger Konfiguration"""
    name = data.get("name", "").strip().lower().replace(" ", "_")
    display_name = data.get("display_name", "").strip()

    if not name or not display_name:
        raise HTTPException(status_code=400, detail="Name und Display-Name erforderlich")

    existing = db.query(AgentConfig).filter(AgentConfig.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agent mit diesem Namen existiert bereits")

    agent = AgentConfig(
        name=name,
        display_name=display_name,
        description=data.get("description", ""),
        enabled=data.get("enabled", True),
        schedule=data.get("schedule", "taeglich 07:00"),
        prompt=data.get("prompt", ""),
        source_urls=data.get("source_urls", ""),
        target_file=data.get("target_file", ""),
        target_section=data.get("target_section", ""),
        model=data.get("model", "claude-haiku-4-5-20251001"),
        max_tokens=data.get("max_tokens", 1500),
    )
    db.add(agent)
    db.commit()

    return {"status": "ok", "id": agent.id, "name": agent.name}


@app.delete("/admin/agents/{agent_id}")
def delete_agent(agent_id: int, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Agent loeschen"""
    agent = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent nicht gefunden")

    db.delete(agent)
    db.commit()
    return {"status": "ok"}
