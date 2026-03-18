"""
Datenbank-Modelle für User und Analysen
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Conversation(Base):
    """Chat-Konversation eines Users"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Neue Unterhaltung")
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)  # optional link to an analysis
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Einzelne Nachricht in einer Konversation"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    tokens_used = Column(Integer, default=0)

    conversation = relationship("Conversation", back_populates="messages")


class User(Base):
    """User-Modell für Authentifizierung"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Settings
    default_verwendungszweck = Column(String, default="kapitalanlage")
    default_zinssatz = Column(Float, default=3.75)
    default_tilgung = Column(Float, default=1.25)

    # Usage Limits
    usage_limit_usd = Column(Float, default=5.0)  # $5 default limit

    # Relationships
    analyses = relationship("Analysis", back_populates="owner", cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")


class Analysis(Base):
    """Gespeicherte Immobilien-Analysen"""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Analyse-Metadaten
    title = Column(String, nullable=True)  # User kann Titel vergeben
    notes = Column(Text, nullable=True)    # Notizen zur Immobilie
    is_favorite = Column(Boolean, default=False)
    tags = Column(String, nullable=True)   # Comma-separated tags

    # Immobilien-Daten (als JSON gespeichert)
    property_data = Column(JSON, nullable=False)

    # Analyse-Ergebnis (als JSON gespeichert)
    analysis_result = Column(JSON, nullable=False)

    # Verwendungszweck
    verwendungszweck = Column(String, nullable=False)

    # Finanzierung
    eigenkapital = Column(Float, default=0)
    zinssatz = Column(Float, default=3.75)
    tilgung = Column(Float, default=1.25)

    # Quick-Access Felder für Suche/Filter
    kaufpreis = Column(Float, nullable=True)
    wohnflaeche = Column(Float, nullable=True)
    stadt = Column(String, nullable=True)
    stadtteil = Column(String, nullable=True)
    gesamtscore = Column(Float, nullable=True)

    # Relationship
    owner = relationship("User", back_populates="analyses")


class UsageLog(Base):
    """Token-Verbrauch pro API-Call"""
    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # API-Call Details
    action_type = Column(String, nullable=False)  # 'chat', 'analyze', 'pdf_extract', etc.

    # Token-Verbrauch
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)

    # Kosten (berechnet)
    cost_usd = Column(Float, default=0.0)

    # Relationship
    user = relationship("User", back_populates="usage_logs")
