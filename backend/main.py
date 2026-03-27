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

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Body, Request
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
from models import User, Analysis, UsageLog, Conversation, ChatMessage
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
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://amlaki.de,https://www.amlaki.de,http://localhost:5173,http://localhost:3000,http://localhost:3001").split(",")
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
# USAGE TRACKING & LIMITS
# ========================================

# Claude Preise (pro 1M Tokens)
PRICING = {
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
}

def calculate_cost(input_tokens: int, output_tokens: int, model: str = "claude-sonnet-4-20250514") -> float:
    """Berechnet Kosten in USD basierend auf Modell"""
    prices = PRICING.get(model, PRICING["claude-sonnet-4-20250514"])
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

def log_usage(db: Session, user_id: int, action_type: str, input_tokens: int, output_tokens: int, model: str = "claude-sonnet-4-20250514"):
    """Speichert einen Usage-Log"""
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
def register_user(request: Request, user: UserCreate, db: Session = Depends(get_db)):
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

    # Log neue Registrierung (SMTP geht nicht auf Render Free Plan)
    print(f"NEUER USER REGISTRIERT: {db_user.username} ({db_user.email})")

    return db_user


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

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


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


def send_reset_email(to_email: str, reset_token: str):
    """Sendet Passwort-Reset Email via IONOS SMTP"""
    if not SMTP_PASS:
        print("WARNUNG: SMTP_PASS nicht gesetzt, kann keine Emails senden")
        return False

    frontend_url = os.getenv("FRONTEND_URL", "https://amlaki.de")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    msg = MIMEMultipart()
    msg["From"] = f"AmlakiAI <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = "Passwort zuruecksetzen - AmlakiAI"

    body = f"""Hallo,

du hast angefordert, dein Passwort bei AmlakiAI zurueckzusetzen.

Klicke auf folgenden Link um ein neues Passwort zu setzen:
{reset_link}

Der Link ist 1 Stunde gueltig.

Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.

Viele Gruesse,
Dein AmlakiAI Team
"""

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
        send_reset_email(email, token)

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

    # Loesche alle Conversations und Messages
    conversations = db.query(Conversation).filter(Conversation.user_id == current_user.id).all()
    for conv in conversations:
        db.query(ChatMessage).filter(ChatMessage.conversation_id == conv.id).delete()
        db.delete(conv)

    # Loesche alle Analysen, UsageLogs (cascaded durch relationship)
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
    "cashflow_rendite": 25,
    "lage": 20,
    "kaufpreis_qm": 20,
    "zukunftspotenzial": 10,
    "zustand_baujahr": 10,
    "energieeffizienz": 5,
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

    # 1. Erbpacht prüfen
    if data.beschreibung and ('erbpacht' in data.beschreibung.lower() or
                               'erbbaurecht' in data.beschreibung.lower()):
        no_gos.append("Erbpacht/Erbbaurecht erkannt")

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

    # Erbpacht zusätzlich warnen (ist auch No-Go)
    if 'erbpacht' in text or 'erbbaurecht' in text:
        warnsignale.append("KRITISCH: Erbpacht/Erbbaurecht!")
        schweregrad += 5

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
    verkäufertyp: Optional[str] = None
    provision: Optional[str] = None
    beschreibung: Optional[str] = None


class AnalysisRequest(BaseModel):
    """Anfrage für Immobilienanalyse"""
    property_data: PropertyData
    verwendungszweck: str  # "kapitalanlage" oder "eigennutzung"
    eigenkapital: Optional[float] = 0
    zinssatz: Optional[float] = 3.75  # Angepasst auf 3.75%
    tilgung: Optional[float] = 1.25   # Angepasst auf 1.25%
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
    # Premium Status
    is_premium: bool = False  # True = alle Features sichtbar


def get_anthropic_client():
    """Erstellt Anthropic Client mit deaktiviertem Logging"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nicht konfiguriert")
    import httpx as _httpx
    return anthropic.Anthropic(
        api_key=api_key,
        http_client=_httpx.Client(
            timeout=120.0,
            follow_redirects=True,
        )
    )


def call_claude_direct(system_prompt: str, messages: list, max_tokens: int = 4096, model: str = "claude-sonnet-4-20250514", db: Session = None, user_id: int = None, action_type: str = None):
    """Call Claude API directly via httpx. Optionally logs usage if db+user_id provided."""
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
    """Löscht eine Analyse"""
    analysis = db.query(Analysis)\
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)\
        .first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(analysis)
    db.commit()
    return None


@app.post("/extract-pdf")
@limiter.limit("10/hour")
async def extract_pdf_data(request: Request, file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)):
    """
    Extrahiert Immobiliendaten aus einem PDF-Exposé mittels Claude
    """
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
    "stadt": "<Stadt>",
    "stadtteil": "<Stadtteil/Bezirk>",
    "objekttyp": "<z.B. Eigentumswohnung, Einfamilienhaus>",
    "zustand": "<z.B. gepflegt, renovierungsbedürftig, Neubau>",
    "ausstattung": "<z.B. gehoben, normal, einfach>",
    "balkon_terrasse": <true/false>,
    "keller": <true/false>,
    "stellplatz": "<z.B. Tiefgarage, Außenstellplatz, keiner>",
    "vermietet": <true/false>,
    "aktuelle_miete": <monatliche Kaltmiete in Euro falls vermietet>,
    "verkäufertyp": "<privat oder Makler>",
    "provision": "<z.B. 3,57% oder provisionsfrei>",
    "beschreibung": "<Kurze Zusammenfassung des Objekts in 2-3 Sätzen>"
}

Antworte NUR mit dem JSON, kein anderer Text."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
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
                      model="claude-sonnet-4-20250514")
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
        return PropertyData(**property_data)

    except json.JSONDecodeError as e:
        print(f"[ERROR] Fehler beim Parsen der KI-Antwort: {str(e)}")
        raise HTTPException(status_code=500, detail="Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.")
    except Exception as e:
        print(f"[ERROR] Fehler bei der PDF-Extraktion: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der PDF-Extraktion. Bitte versuche es erneut.")


# Schnelle Marktdaten-Lookup aus Knowledge Base
# Miete = aktuelle NEUVERMIETUNGSPREISE (Angebotsmieten), NICHT Bestandsdurchschnitt
KNOWN_CITIES = {
    "muenchen": {"kauf_von": 8800, "kauf_bis": 9500, "miete": 21.0, "trend": "+2,5%", "faktor": "32-38"},
    "münchen": {"kauf_von": 8800, "kauf_bis": 9500, "miete": 21.0, "trend": "+2,5%", "faktor": "32-38"},
    "berlin": {"kauf_von": 5600, "kauf_bis": 6200, "miete": 15.5, "trend": "+3,0%", "faktor": "26-32"},
    "hamburg": {"kauf_von": 5300, "kauf_bis": 5800, "miete": 15.5, "trend": "+2,0%", "faktor": "25-30"},
    "frankfurt": {"kauf_von": 5000, "kauf_bis": 5500, "miete": 16.5, "trend": "+1,5%", "faktor": "24-29"},
    "koeln": {"kauf_von": 4200, "kauf_bis": 4800, "miete": 14.5, "trend": "+2,5%", "faktor": "23-28"},
    "köln": {"kauf_von": 4200, "kauf_bis": 4800, "miete": 14.5, "trend": "+2,5%", "faktor": "23-28"},
    "stuttgart": {"kauf_von": 4800, "kauf_bis": 5400, "miete": 16.0, "trend": "+2,0%", "faktor": "24-29"},
    "duesseldorf": {"kauf_von": 4500, "kauf_bis": 5100, "miete": 13.5, "trend": "+2,5%", "faktor": "23-28"},
    "düsseldorf": {"kauf_von": 4500, "kauf_bis": 5100, "miete": 13.5, "trend": "+2,5%", "faktor": "23-28"},
    "leipzig": {"kauf_von": 2800, "kauf_bis": 3300, "miete": 10.0, "trend": "+4,0%", "faktor": "18-23"},
    "dresden": {"kauf_von": 2600, "kauf_bis": 3100, "miete": 9.5, "trend": "+3,5%", "faktor": "17-22"},
    "hannover": {"kauf_von": 3200, "kauf_bis": 3700, "miete": 11.5, "trend": "+2,5%", "faktor": "20-25"},
    "nuernberg": {"kauf_von": 3500, "kauf_bis": 4000, "miete": 12.5, "trend": "+3,0%", "faktor": "21-26"},
    "nürnberg": {"kauf_von": 3500, "kauf_bis": 4000, "miete": 12.5, "trend": "+3,0%", "faktor": "21-26"},
    "bremen": {"kauf_von": 2800, "kauf_bis": 3300, "miete": 10.5, "trend": "+2,5%", "faktor": "19-24"},
    "essen": {"kauf_von": 2200, "kauf_bis": 2800, "miete": 9.5, "trend": "+3,0%", "faktor": "16-21"},
    "dortmund": {"kauf_von": 2100, "kauf_bis": 2700, "miete": 9.5, "trend": "+3,5%", "faktor": "16-21"},
    "chemnitz": {"kauf_von": 1000, "kauf_bis": 1600, "miete": 7.0, "trend": "+5,0%", "faktor": "12-16"},
}

def quick_market_lookup(stadt: str) -> Optional[dict]:
    """Schneller Lookup aus Knowledge Base - kein API Call noetig"""
    key = stadt.lower().strip()
    if key in KNOWN_CITIES:
        d = KNOWN_CITIES[key]
        return {
            "standort": stadt,
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
            "datenqualität": f"Knowledge Base Daten fuer {stadt} (Stand: Maerz 2026)"
        }
    return None


@app.post("/extract-url")
@limiter.limit("20/hour")
async def extract_url_data(request: Request, data: dict = Body(...), current_user: User = Depends(get_current_active_user)):
    """
    Extrahiert Immobiliendaten aus einer ImmoScout24/Immowelt URL
    """
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
{{"kaufpreis": null, "wohnflaeche": null, "zimmer": null, "baujahr": null, "stadt": null, "stadtteil": null, "objekttyp": null, "aktuelle_miete": null, "hausgeld": null, "hausgeld_nicht_umlagefaehig": null, "energieklasse": null, "heizungsart": null, "zustand": null, "balkon_terrasse": null, "keller": null, "stellplatz": null, "vermietet": null, "provision": null, "beschreibung": null}}

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


async def fetch_live_market_data(stadt: str, stadtteil: Optional[str], objekttyp: str = "Eigentumswohnung") -> dict:
    """
    V3.1 - MARKTDATEN mit Fast-Path
    1. Erst Knowledge Base Lookup (instant)
    2. Nur bei unbekannten Staedten: Web-Suche + Claude
    """
    # Fast-Path: Knowledge Base Lookup
    fast_result = quick_market_lookup(stadt)
    if fast_result:
        if stadtteil:
            fast_result["standort"] = f"{stadtteil}, {stadt}"
        return fast_result

    # Slow-Path: Web-Recherche fuer unbekannte Staedte
    location = f"{stadtteil}, {stadt}" if stadtteil else stadt

    # Schritt 1: Web-Suche durchführen für aktuelle Preise
    search_queries = [
        f"Immobilienpreise {location} 2024 2025 €/m²",
        f"{objekttyp} kaufen {location} Quadratmeterpreis aktuell",
        f"Mietspiegel {location} Kaltmiete pro qm",
        f"Immobilienmarkt {location} Preisentwicklung"
    ]

    # Versuche Daten von bekannten Immobilienportalen zu holen
    search_results = []

    async with httpx.AsyncClient(timeout=10.0) as http_client:
        for query in search_queries[:1]:  # Nur 1 Query fuer Speed
            try:
                # DuckDuckGo HTML-Suche (kein API-Key nötig)
                encoded_query = query.replace(' ', '+')
                url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                }
                response = await http_client.get(url, headers=headers)
                if response.status_code == 200:
                    # Extrahiere relevante Snippets
                    text = response.text
                    # Suche nach Preisangaben im HTML
                    price_patterns = re.findall(r'(\d{1,2}[.,]?\d{0,3})\s*(?:€|Euro)?\s*/?\s*(?:m²|qm|Quadratmeter)', text, re.IGNORECASE)
                    search_results.append({
                        "query": query,
                        "found_prices": price_patterns[:5] if price_patterns else [],
                        "raw_snippet": text[:2000] if len(text) > 100 else ""
                    })
            except Exception as e:
                print(f"[ERROR] Suchanfrage fehlgeschlagen: {str(e)}")
                search_results.append({"query": query, "error": "Suchanfrage fehlgeschlagen"})

    # Schritt 2: Claude analysiert die Suchergebnisse UND recherchiert selbst (Haiku fuer Speed)
    research_prompt = f"""WICHTIG: Du musst LIVE-MARKTDATEN für diese Immobilienbewertung recherchieren!

=== STANDORT ===
Stadt: {stadt}
Stadtteil: {stadtteil or "Nicht angegeben"}
Objekttyp: {objekttyp}

=== GEFUNDENE SUCHERGEBNISSE ===
{json.dumps(search_results, indent=2, ensure_ascii=False)}

=== DEINE AUFGABE ===
1. Analysiere die gefundenen Preisangaben
2. Nutze dein AKTUELLES Wissen über Immobilienpreise in {location}
3. Berücksichtige regionale Besonderheiten (Uni-Stadt, Wirtschaftsstandort, etc.)
4. Gib REALISTISCHE, AKTUELLE Werte an - KEINE generischen Schätzungen!

REGELN:
- Bei Großstädten (München, Frankfurt, Hamburg): Preise 4.000-12.000 €/m²
- Bei Mittelstädten: Preise 2.000-5.000 €/m²
- Bei ländlichen Gebieten: Preise 1.000-3.000 €/m²
- Mieten: Typisch 8-15 €/m² in Städten, 5-9 €/m² ländlich

Antworte als JSON:
{{
    "standort": "{location}",
    "objekttyp": "{objekttyp}",
    "kaufpreis_qm_von": <untere Grenze in Euro>,
    "kaufpreis_qm_bis": <obere Grenze in Euro>,
    "kaufpreis_qm_durchschnitt": <Mittelwert>,
    "miete_qm_von": <untere Grenze>,
    "miete_qm_bis": <obere Grenze>,
    "miete_qm_durchschnitt": <Mittelwert>,
    "preisentwicklung_5_jahre": "<z.B. +25% oder -5%>",
    "tendenz": "<steigend/stabil/fallend>",
    "prognose_2025": "<kurze Einschätzung>",
    "standort_bewertung": <1-10>,
    "standort_faktoren": ["<Faktor1>", "<Faktor2>", ...],
    "datenquellen": ["<Quelle1>", "<Quelle2>"],
    "aktualitaet": "Live-Recherche {stadt} Stand 2025",
    "vertrauenswuerdigkeit": "<hoch/mittel/niedrig>"
}}

WICHTIG: Gib KONKRETE Zahlen für DIESEN Standort an, keine Platzhalter!"""

    try:
        # Haiku fuer Speed (3x schneller als Sonnet, reicht fuer Marktdaten)
        data_result = call_claude_direct(
            "Du extrahierst Immobilien-Marktdaten. Antworte NUR als JSON, kein anderer Text.",
            [{"role": "user", "content": research_prompt}],
            max_tokens=1500,
            model="claude-haiku-4-5-20251001"
        )

        json_text = data_result["content"][0]["text"].strip()
        if json_text.startswith("```"):
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
        json_text = json_text.strip()

        market_data = json.loads(json_text)
        market_data["recherche_methode"] = "live_web_search_v3"
        return market_data

    except Exception as e:
        # Fallback: Minimale Schätzung mit Warnung
        return {
            "standort": location,
            "fehler": "Live-Recherche fehlgeschlagen",
            "kaufpreis_qm_durchschnitt": 3500,  # Konservativer Fallback
            "miete_qm_durchschnitt": 10,
            "datenqualität": "ACHTUNG: Fallback-Werte - Live-Recherche empfohlen!",
            "recherche_methode": "fallback"
        }


@app.post("/search-market-data")
async def search_market_data(stadt: str, stadtteil: Optional[str] = None, objekttyp: Optional[str] = "Eigentumswohnung", current_user: User = Depends(get_current_active_user)):
    """
    V3.0 - LIVE Marktdaten-Recherche
    Sucht AKTUELLE Preise für Stadt/Stadtteil/Objekttyp
    """
    return await fetch_live_market_data(stadt, stadtteil, objekttyp or "Eigentumswohnung")


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
        "bremen": 5.0, "hamburg": 5.5, "hessen": 6.0, "mecklenburg-vorpommern": 6.0,
        "niedersachsen": 5.0, "nordrhein-westfalen": 6.5, "rheinland-pfalz": 5.0,
        "saarland": 6.5, "sachsen": 3.5, "sachsen-anhalt": 6.5, "schleswig-holstein": 6.5,
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
    zinssatz: float = 3.75,
    tilgung: float = 1.25
) -> dict:
    """
    Berechnet Cashflow mit 100% Finanzierung

    Standard-Finanzierung:
    - Zinssatz: 3.75%
    - Tilgung: 1.25%
    - Gesamt: 5.0% p.a.

    Args:
        kaufpreis: Kaufpreis der Immobilie
        monatliche_miete: Monatliche Kaltmiete
        nebenkosten: Monatliche Nebenkosten (Hausgeld etc.)
        eigenkapital: Eigenkapitalanteil (default: 0 = 100% Finanzierung)
        zinssatz: Zinssatz in % (default: 3.75%)
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
    mietsteigerung: float = 1.5,
    wertsteigerung: float = 1.5
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
    jahre: int = 30
) -> dict:
    """
    Vergleicht Immobilien-Investment mit alternativen Anlageformen.
    """
    # Alternative: ETF mit 7% Rendite
    etf_rendite = 7.0

    # Immobilien-Investment
    tilgungsplan = calculate_tilgungsplan(
        kaufpreis=kaufpreis,
        eigenkapital=eigenkapital,
        zinssatz=zinssatz,
        tilgung=tilgung,
        monatliche_miete=monatliche_miete,
        nebenkosten=nebenkosten,
        jahre=jahre
    )

    immobilien_endvermoegen = tilgungsplan["zusammenfassung"]["gesamtvermoegen_nach_laufzeit"]

    # Tatsaechliches Eigenkapital inkl. Kaufnebenkosten (~12%)
    tatsaechliches_ek = eigenkapital + (kaufpreis * 0.12) if eigenkapital == 0 else eigenkapital

    # ETF-Investment: Tatsaechliches EK investiert
    etf_nur_ek = tatsaechliches_ek * ((1 + etf_rendite/100) ** jahre)

    # ETF-Investment: EK + monatliche Zuzahlung (falls negativ Cashflow)
    monatlicher_cashflow = tilgungsplan["jahre"][0]["monatlicher_cashflow"] if tilgungsplan["jahre"] else 0
    zuzahlung = abs(monatlicher_cashflow) if monatlicher_cashflow < 0 else 0

    # Zinseszins-Formel für regelmäßige Einzahlung
    monatliche_rendite = (1 + etf_rendite/100) ** (1/12) - 1
    monate = jahre * 12
    if zuzahlung > 0:
        etf_mit_sparrate = tatsaechliches_ek * ((1 + etf_rendite/100) ** jahre) + \
            zuzahlung * (((1 + monatliche_rendite) ** monate - 1) / monatliche_rendite)
    else:
        etf_mit_sparrate = etf_nur_ek

    return {
        "immobilie": {
            "endvermoegen": round(immobilien_endvermoegen, 2),
            "eingesetztes_kapital": round(tatsaechliches_ek, 2),
            "monatliche_zuzahlung": round(zuzahlung, 2),
            "gesamtinvestition": round(eigenkapital + (zuzahlung * monate), 2),
            "rendite_faktor": round(immobilien_endvermoegen / tatsaechliches_ek, 2) if tatsaechliches_ek > 0 else 0
        },
        "etf_nur_eigenkapital": {
            "endvermoegen": round(etf_nur_ek, 2),
            "angenommene_rendite": etf_rendite,
            "eingesetztes_kapital": round(tatsaechliches_ek, 2)
        },
        "etf_mit_sparrate": {
            "endvermoegen": round(etf_mit_sparrate, 2),
            "monatliche_sparrate": round(zuzahlung, 2),
            "gesamtinvestition": round(tatsaechliches_ek + (zuzahlung * monate), 2)
        },
        "vergleich": {
            "immobilie_vs_etf_nur_ek": round(immobilien_endvermoegen - etf_nur_ek, 2),
            "immobilie_vs_etf_sparrate": round(immobilien_endvermoegen - etf_mit_sparrate, 2),
            "immobilie_besser_als_etf": immobilien_endvermoegen > etf_mit_sparrate
        }
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
        {"name": "Niedrige Rate", "zins": 3.5, "tilgung": 1.0},
        {"name": "Standard", "zins": 3.75, "tilgung": 1.25},
        {"name": "Schnelle Tilgung", "zins": 3.75, "tilgung": 2.0},
        {"name": "Aggressive Tilgung", "zins": 3.75, "tilgung": 3.0},
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
    - Cashflow-Berechnung (3.75% Zins, 1.25% Tilgung)
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
                objekttyp=objekttyp
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
    if data.hausgeld_nicht_umlagefaehig and data.hausgeld_nicht_umlagefaehig > 0:
        hausgeld_nicht_umlagefaehig = data.hausgeld_nicht_umlagefaehig
    else:
        hausgeld_nicht_umlagefaehig = hausgeld_gesamt_global * 0.35

    if zweck == "kapitalanlage" and data.kaufpreis:
        miete = data.aktuelle_miete or 0
        ist_geschaetzte_miete = False

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
        zins = request.zinssatz or 3.75
        tilg = request.tilgung or 1.25

        cashflow_analyse = calculate_cashflow(
            kaufpreis=data.kaufpreis,
            monatliche_miete=miete,
            nebenkosten=nebenkosten,
            eigenkapital=ek,
            zinssatz=zins,
            tilgung=tilg
        )

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
        jaehrliche_zinsen = finanzierungssumme * ((zins or 3.75) / 100)

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
        zins = request.zinssatz or 3.75
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
        zins = request.zinssatz or 3.75
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
        zins = request.zinssatz or 3.75
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

    # V3.0: Marktdaten-Info für Prompt
    marktdaten_hinweis = ""
    if marktdaten:
        if marktdaten.get("recherche_methode") == "live_web_search_v3":
            marktdaten_hinweis = "[OK] LIVE-MARKTDATEN ERFOLGREICH RECHERCHIERT"
        else:
            marktdaten_hinweis = "[WARN] FALLBACK-DATEN - Bewertung mit Vorsicht!"

    analyse_prompt = f"""Analysiere diese Immobilie professionell und bewerte jedes Kriterium mit einem Score von 0-100.

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
- Markt-Durchschnitt: {marktdaten.get('kaufpreis_qm_durchschnitt', 'Unbekannt') if marktdaten else 'Unbekannt'} €/m²
- Bewertung: {"UNTER Markt [OK]" if marktdaten and data.kaufpreis and data.wohnflaeche and (data.kaufpreis/data.wohnflaeche) < marktdaten.get('kaufpreis_qm_durchschnitt', 999999) else "ÜBER Markt [WARN]" if marktdaten else "Keine Daten"}

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

Standard-Finanzierung: 3.75% Zins + 1.25% Tilgung = 5.0% Gesamtrate

=== BEWERTUNGSKRITERIEN für {zweck.upper()} ===
{json.dumps(weights, indent=2, ensure_ascii=False)}

[WICHTIG] V3.0 - BEWERTUNGSREGELN MIT LIVE-DATEN:

1. **cashflow_rendite** (Gewichtung: {weights['cashflow_rendite']}%)
   - Kaufpreisfaktor: <20 sehr gut, 20-25 gut, >25 kritisch
   - Bruttorendite: >5% sehr gut, 4-5% gut, <3% kritisch
   - Cashflow-Bewertung NACH STEUER (nicht vor Steuer!):
     * Berechne zuerst den Cashflow NACH Steuer (AfA + Zinsabzug bei 42% Steuersatz)
     * Wenn Cashflow nach Steuer positiv oder nur leicht negativ = GUTER Score (60-80)
     * Negativer Cashflow vor Steuer ist KEIN Grund fuer einen schlechten Score wenn er nach Steuer positiv wird
     * Cashflow-Toleranz: bis -0.15% des Kaufpreises/Monat VOR Steuer ist akzeptabel
   - NEUVERMIETUNGSPOTENZIAL MUSS in den Score einfliessen:
     * Wenn Neuvermietung den Cashflow deutlich verbessert, Score ERHOEHEN (z.B. +10-20 Punkte)
     * Wenn Wohnung in Kuerze frei wird = fast wie Neuvermietungs-Cashflow bewerten

2. **lage** (Gewichtung: {weights['lage']}%)
   - Stadtteil-Bewertung aus LIVE-Marktdaten
   - Standort-Faktoren berücksichtigen (Uni, Wirtschaft, ÖPNV)

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
   - Prognose berücksichtigen

5. **zustand_baujahr** (Gewichtung: {weights['zustand_baujahr']}%)
   - Zustand, Baujahr, Sanierungsbedarf
   - Fertighäuser 1960-1990 kritisch prüfen

6. **energieeffizienz** (Gewichtung: {weights['energieeffizienz']}%)
   - Energieklasse (G/H = Sanierung empfohlen, KfW 261 prüfen!)

7. **nebenkosten** (Gewichtung: {weights['nebenkosten']}%)
   - Hausgeld/Nebenkosten im Verhältnis

8. **grundriss** (Gewichtung: {weights['grundriss']}%)
   - Zimmerzahl, Schnitt, Ausstattung

9. **verkäufertyp** (Gewichtung: {weights['verkäufertyp']}%)
   - Privat vs. Makler, Provision

WICHTIG - V6.0 PHILOSOPHIE (PROFESSIONELL, REALISTISCH, GESAMTBILD):
- IMMER Live-Marktdaten in der Begründung zitieren!
- Du bist ein professioneller Immobilienberater. Sprich wie ein seriöser Berater.
- NIEMALS absolute Kaufempfehlungen oder Kaufwarnungen. Du gibst EINSCHÄTZUNGEN.
- Formuliere als Einschätzung: "aus unserer Sicht", "nach unserer Analyse"
- KEINE widersprüchlichen Aussagen! Score und Text MÜSSEN zusammenpassen:
  * Score <40 = NICHT "gemischtes Bild" sagen! Das ist klar negativ.
  * Score 40-55 = "gemischt" oder "prüfenswert" ist OK
  * Score >55 = positiv formulieren

PREIS-BEWERTUNG (WICHTIG - REALISTISCHE EINORDNUNG):
- Bis 10% über Markt = "leicht über Marktdurchschnitt" (NICHT "deutlich überteuert"!)
- 10-20% über Markt = "über Marktdurchschnitt"
- 20-30% über Markt = "deutlich über Markt"
- Über 30% über Markt = "stark überteuert"
- Unter Markt = IMMER positiv hervorheben!

FAIRER PREIS (WICHTIG - REALISTISCH BLEIBEN):
- Der faire Preis darf MAXIMAL 25% unter dem Kaufpreis liegen! Mehr als 25% Rabatt ist unrealistisch.
- Wenn die Berechnung einen fairen Preis ergibt der >25% unter Kaufpreis liegt, setze ihn auf Kaufpreis minus 25%.
- Begründe den fairen Preis mit Marktdaten und konkreten Mängeln.

GESAMTBILD BEWERTEN (KRITISCH WICHTIG - NICHT NUR CASHFLOW!):
- Negativer Cashflow VOR STEUER allein ist KEIN Grund fuer einen niedrigen Score!
- Du MUSST das GESAMTBILD bewerten. Einzelne Kriterien-Scores muessen das reflektieren:
  1) Kaufpreis relativ zum Markt: >20% unter Markt = EXZELLENTER Einkauf, cashflow_rendite Score MUSS das belohnen
  2) Cashflow NACH STEUER ist relevanter als vor Steuer
  3) Neuvermietungspotenzial: Wenn Miete deutlich unter Markt liegt, ist das POSITIV (Score erhoehen!)
  4) Steuerliche Vorteile (AfA + Zinsabzug) MUESSEN den cashflow_rendite Score positiv beeinflussen
  5) Wertsteigerungspotenzial (Lage, Trend)
  6) Vermögensaufbau durch Tilgung
- BEISPIEL: Objekt 30% unter Markt, Cashflow vor Steuer -400€ aber nach Steuer +50€, Neuvermietung bringt +500€
  = Das ist ein GUTER Deal! Score sollte 70-80 sein, NICHT 50-60!
- Ein Objekt das deutlich unter Markt liegt mit temporaer negativem Cashflow ist EMPFEHLENSWERT!
- Cashflow-Toleranz: bis -0.15% des Kaufpreises/Monat VOR Steuer ist akzeptabel.

Antworte als JSON:
{{
    "kriterien": [
        {{
            "name": "cashflow_rendite",
            "score": <0-100>,
            "begründung": "<präzise Begründung mit Zahlen>"
        }},
        ... (alle 9 Kriterien)
    ],
    "stärken": ["<konkrete Stärke mit Zahlen>", ...],
    "schwächen": ["<konkrete Schwäche mit Zahlen>", ...],
    "zusammenfassung": "<3-4 Saetze. REGELN: 1) Beginne POSITIV wenn Objekt unter Markt liegt. 2) Preisvergleich NUR in PROZENT (z.B. '36% unter Markt'). NIEMALS absolute Euro-Betraege fuer Rabatt/Wertzuwachs nennen! 3) Steuervorteile nur kurz erwaehnen ('steuerliche Vorteile durch AfA und Zinsabzug'), KEINE konkreten Nach-Steuer-Cashflow-Zahlen nennen (weil Mieteinnahmen ebenfalls versteuert werden muessen). 4) Bei Neuvermietungspotenzial NUR den Endwert nennen (z.B. 'Bei Neuvermietung steigt der Cashflow auf ca. +550€/Monat'), NICHT die Differenz. 5) Zusammenfassung MUSS zum Score passen: Score >70 = klar positiv formulieren.>",
    "fairer_preis": {{
        "fairer_preis": <deine Einschaetzung des fairen Preises in Euro als Zahl>,
        "bewertung": "<Unter Marktwert / Marktgerecht / Leicht ueber Marktwert / Ueberteuert / Stark ueberteuert>",
        "begruendung": "<1 Satz warum du diesen fairen Preis ansetzt, z.B. basierend auf Marktvergleich, Zustand, Lage>"
    }}
}}

REGELN FUER FAIRER PREIS:
- Beruecksichtige ALLE Faktoren: Marktpreis/m2, Zustand, Baujahr, Energieklasse, Lage, Mietpotenzial
- Wenn das Objekt UNTER dem Marktdurchschnitt liegt, ist der faire Preis MINDESTENS der Kaufpreis (es ist ja schon guenstig!)
- Ein Objekt das 30%+ unter Markt liegt = Bewertung "Unter Marktwert", NICHT "Ueberteuert"
- Der faire Preis muss zum Score und zur Zusammenfassung passen! Kein Widerspruch!

Antworte NUR mit dem JSON."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2500,
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

        for criterion in ai_analysis["kriterien"]:
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
                begründung=criterion["begründung"]
            ))

        # Gesamtscore (auf 100 normalisiert) - kein künstlicher Bonus
        gesamtscore = min(100, round(total_weighted, 1))

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
            neuvermietung_potenzial=neuvermietung_potenzial
        )

        # Verhandlungsmail generieren (nur Premium)
        if is_premium and data.kaufpreis:
            try:
                preis_qm = round(data.kaufpreis / data.wohnflaeche, 2) if data.wohnflaeche else None
                markt_qm = marktdaten.get("kaufpreis_qm_durchschnitt") if marktdaten else None
                fairer_p = fairer_preis_result.get("fairer_preis") if fairer_preis_result else None

                verhandlungs_prompt = f"""Erstelle eine professionelle, hoefliche Verhandlungsnachricht die ein Immobilienkaeufer an den Verkaeufer/Makler senden kann.

OBJEKTDATEN:
- Kaufpreis: {data.kaufpreis:,.0f} EUR
- Wohnflaeche: {data.wohnflaeche or '?'} m2
- Preis/m2: {preis_qm or '?'} EUR
- Markt-Durchschnitt/m2: {markt_qm or '?'} EUR
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
3. Argumente mit Zahlen belegen (Marktdaten, Energiekosten, Sanierungsbedarf)
4. Interesse am Objekt zeigen, aber sachlich bleiben
5. Auf Deutsch, duzen vermeiden, Sie-Form
6. Keine Emojis
7. Format: Betreff + Nachricht
8. Max 200 Woerter

Antworte NUR mit der fertigen Nachricht, kein anderer Text."""

                mail_result = call_claude_direct(
                    "Du schreibst professionelle Verhandlungsnachrichten fuer Immobilienkaeufer.",
                    [{"role": "user", "content": verhandlungs_prompt}],
                    max_tokens=800,
                    model="claude-haiku-4-5-20251001",
                    db=db, user_id=current_user.id, action_type="verhandlungsmail"
                )
                result.verhandlungsmail = strip_emojis(mail_result["content"][0]["text"].strip())
            except Exception as e:
                print(f"Verhandlungsmail-Generierung fehlgeschlagen: {e}")
                result.verhandlungsmail = None

        # Besichtigungs-Roadmap generieren (wenn User noch nicht besichtigt hat)
        result.besichtigt = request.besichtigt
        if request.besichtigt == False:
            try:
                besichtigungs_prompt = f"""Erstelle eine Besichtigungs-Checkliste fuer diese spezifische Immobilie. Der Kaeufer war noch NICHT bei der Besichtigung.

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

                roadmap_result = call_claude_direct(
                    "Du bist ein erfahrener Immobilienberater der Kaeufer auf Besichtigungen vorbereitet.",
                    [{"role": "user", "content": besichtigungs_prompt}],
                    max_tokens=2000,
                    model="claude-haiku-4-5-20251001",
                    db=db, user_id=current_user.id, action_type="besichtigung"
                )
                roadmap_text = roadmap_result["content"][0]["text"].strip()
                if roadmap_text.startswith("```"):
                    roadmap_text = roadmap_text.split("```")[1]
                    if roadmap_text.startswith("json"):
                        roadmap_text = roadmap_text[4:]
                roadmap_text = roadmap_text.strip()
                result.besichtigungs_roadmap = json.loads(roadmap_text)
            except Exception as e:
                print(f"Besichtigungs-Roadmap-Generierung fehlgeschlagen: {e}")
                result.besichtigungs_roadmap = None

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
            db_analysis.zinssatz = request.zinssatz or 3.75
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
                zinssatz=request.zinssatz or 3.75,
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

        return result
        
    except json.JSONDecodeError as e:
        print(f"[ERROR] Fehler beim Parsen der KI-Analyse: {str(e)}")
        raise HTTPException(status_code=500, detail="Die KI-Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut.")
    except Exception as e:
        print(f"[ERROR] Fehler bei der Analyse: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Analyse. Bitte versuche es erneut.")


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
                objekttyp="Eigentumswohnung"
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
                objekttyp="Eigentumswohnung"
            )
        except:
            pass

    # Build dynamic knowledge prompt using topic classifier
    knowledge_section = build_knowledge_prompt(message, max_topics=3)

    # System Prompt
    system_prompt = f"""STRIKTE FORMATIERUNGSREGELN (IMMER EINHALTEN):
1. ABSOLUT KEINE Emojis. Kein einziges Emoji-Zeichen in deiner gesamten Antwort. Keine Ausnahmen. Auch keine Unicode-Symbole wie Pfeile, Haekchen oder Sterne.
2. Verwende ## und ### fuer Ueberschriften. Nutze **Fettschrift** fuer wichtige Begriffe innerhalb von Absaetzen.
3. Verwende Aufzaehlungszeichen (-) fuer Listen.
4. Halte den Ton professionell, sachlich und kompetent.
5. Strukturiere Antworten klar mit Absaetzen und Zwischenueberschriften.

Antworte in einfacher, verstaendlicher Sprache. Vermeide Fachjargon wo moeglich - erklaere komplexe Begriffe kurz in Klammern wenn noetig. Strukturiere Antworten mit kurzen Absaetzen und Aufzaehlungen. Jede Antwort soll so klar sein, dass auch jemand ohne Vorwissen sie versteht.

Du bist AmlakI, ein professioneller Immobilienberater fuer den DACH-Markt (Deutschland, Oesterreich, Schweiz).
Du verfuegst ueber Expertenwissen in: Immobilienbewertung, Finanzierung, Steueroptimierung, Foerderprogramme, Mietrecht, WEG-Recht, Due Diligence und Verhandlungsfuehrung.
Deine Beratung basiert auf aktuellen Marktdaten, geltendem Recht und anerkannten Bewertungsverfahren.

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
{json.dumps(context, indent=2, ensure_ascii=False)}
''' if context else ''}

Antworte auf Deutsch, praezise und hilfreich.
Nutze Markdown fuer Formatierung (fett, Listen, etc.).
Bei Preisfragen: IMMER konkrete Zahlen aus den Live-Daten!"""

    api_key = os.getenv("ANTHROPIC_API_KEY")

    async def generate():
        full_response = ""
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
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 4096,
                        "stream": True,
                        "system": system_prompt,
                        "messages": messages_for_claude,
                    },
                ) as response:
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
                                elif chunk.get("type") == "message_stop":
                                    pass
                            except json.JSONDecodeError:
                                pass
        except Exception as e:
            print(f"[ERROR] Streaming-Fehler: {str(e)}")
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


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Health Check Endpoint"""
    return {
        "status": "healthy"
    }


# /admin/make-first-admin endpoint removed for security


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
    if package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Ungueltiges Paket")

    package = CREDIT_PACKAGES[package_id]

    try:
        session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": package["price_cents"],
                    "product_data": {
                        "name": f"AmlakiAI - {package['label']}",
                        "description": f"{package['credits']} Analyse-Credit{'s' if package['credits'] > 1 else ''}",
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

        if user_id and credits_to_add:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                current_credits = user.analysis_credits if user.analysis_credits is not None else 0
                user.analysis_credits = current_credits + credits_to_add
                db.commit()

    return {"status": "ok"}


# ========================================
# ADMIN ENDPOINTS
# ========================================

from schemas import AdminUserResponse, AdminUserUpdate, AdminStatsResponse
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

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        blocked_users=blocked_users,
        total_analyses=total_analyses,
        users_today=users_today,
        users_this_week=users_this_week,
        analyses_today=analyses_today,
        analyses_this_week=analyses_this_week
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
            total_requests=usage["total_requests"]
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

    # Lösche User (Analysen + UsageLogs werden durch cascade gelöscht)
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
