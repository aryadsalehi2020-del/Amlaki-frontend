"""
Datenbank-Konfiguration für SQLAlchemy
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
import time

# SQLite Datenbank (einfach für Development)
# Für Production würde man PostgreSQL verwenden
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./amlaki.db")

# Render/Supabase verwendet postgres:// - wir brauchen postgresql+psycopg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Connection args basierend auf Datenbanktyp
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    # PostgreSQL mit Supabase Pooler
    # NullPool weil Supabase bereits Connection Pooling macht (PgBouncer)
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        connect_args={
            "connect_timeout": 30
        }
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency für Datenbankzugriff"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Führt notwendige Migrationen durch"""
    migrations = [
        ("users", "usage_limit_usd", "ALTER TABLE users ADD COLUMN usage_limit_usd FLOAT DEFAULT 5.0"),
        ("users", "analysis_credits", "ALTER TABLE users ADD COLUMN analysis_credits INTEGER DEFAULT 1"),
        ("analyses", "is_premium", "ALTER TABLE analyses ADD COLUMN is_premium BOOLEAN DEFAULT FALSE"),
        # Agent-Erweiterungen fuer dynamische Konfiguration
        ("agent_configs", "prompt", "ALTER TABLE agent_configs ADD COLUMN prompt TEXT"),
        ("agent_configs", "source_urls", "ALTER TABLE agent_configs ADD COLUMN source_urls TEXT"),
        ("agent_configs", "target_file", "ALTER TABLE agent_configs ADD COLUMN target_file VARCHAR"),
        ("agent_configs", "target_section", "ALTER TABLE agent_configs ADD COLUMN target_section VARCHAR"),
        ("agent_configs", "model", "ALTER TABLE agent_configs ADD COLUMN model VARCHAR DEFAULT 'claude-haiku-4-5-20251001'"),
        ("agent_configs", "max_tokens", "ALTER TABLE agent_configs ADD COLUMN max_tokens INTEGER DEFAULT 1500"),
        ("agent_configs", "last_result", "ALTER TABLE agent_configs ADD COLUMN last_result TEXT"),
    ]

    for table, column, sql in migrations:
        try:
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
                result.close()
                print(f"Migration: {column} existiert bereits in {table}")
        except Exception:
            try:
                with engine.connect() as conn:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"Migration: {column} Spalte zu {table} hinzugefuegt")
            except Exception as e:
                print(f"Migration {column} fehlgeschlagen: {e}")


def seed_agents():
    """Erstellt Default-Agent-Konfigurationen falls noch nicht vorhanden"""
    try:
        from models import AgentConfig
        session = SessionLocal()
        existing = session.query(AgentConfig).count()
        if existing == 0:
            defaults = [
                AgentConfig(
                    name="zinsen",
                    display_name="Zinsen-Monitor",
                    description="Aktualisiert Bauzinsen von Interhyp taeglich",
                    enabled=True,
                    schedule="taeglich 07:00",
                ),
                AgentConfig(
                    name="news",
                    display_name="News-Intelligence",
                    description="Scannt Handelsblatt, FAZ, tagesschau nach immobilienrelevanten News",
                    enabled=True,
                    schedule="taeglich 07:00",
                ),
            ]
            for agent in defaults:
                session.add(agent)
            session.commit()
            print("Agent-Konfigurationen erstellt (zinsen, news)")
        session.close()
    except Exception as e:
        print(f"Agent-Seed fehlgeschlagen: {e}")


def init_db(max_retries=5, retry_delay=3):
    """Initialisiert die Datenbank-Tabellen mit Retry-Logik"""
    # Importiere Models hier um sicherzustellen dass alle Tabellen registriert sind
    from models import User, Analysis, UsageLog, AgentConfig

    for attempt in range(max_retries):
        try:
            # Teste Verbindung zuerst
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            # Erstelle alle Tabellen
            Base.metadata.create_all(bind=engine)
            print(f"Database initialized with tables: {list(Base.metadata.tables.keys())}")

            # Führe Migrationen für existierende Tabellen durch
            run_migrations()
            # Seed Agent-Konfigurationen
            seed_agents()
            return  # Erfolg!

        except Exception as e:
            print(f"Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("WARNING: Could not connect to database after all retries. App will start anyway.")
                print("Database operations may fail until connection is available.")
