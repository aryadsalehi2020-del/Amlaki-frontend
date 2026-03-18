import os
import re

TOPIC_DIR = os.path.join(os.path.dirname(__file__), "topics")

# Keywords mapped to topic files
TOPIC_KEYWORDS = {
    "core_rules": ["grundregel", "mietbegriff", "nettokaltmiete", "warmmiete", "ist-miete"],
    "valuation": ["bewertung", "verkehrswert", "ertragswert", "vergleichswert", "sachwert", "gutachten", "marktwert", "wert", "preis pro qm"],
    "subsidies": ["kfw", "förderung", "bafa", "zuschuss", "wohn-riester", "landesförderung", "heizungsförderung", "tilgungszuschuss"],
    "taxes": ["afa", "abschreibung", "steuer", "spekulationssteuer", "werbungskosten", "denkmal", "steuervorteil", "gmbh", "grenzsteuersatz"],
    "financing": ["finanzierung", "zins", "tilgung", "kredit", "bank", "darlehen", "annuität", "sondertilgung", "beleihung", "disagio", "forward"],
    "calculations": ["rendite", "cashflow", "leverage", "eigenkapitalrendite", "kaufpreisfaktor", "bruttorendite", "break-even", "sensitivität"],
    "rental_law": ["miete", "mietrecht", "mieterhöhung", "kündigung", "eigenbedarf", "nebenkosten", "weg", "hausgeld", "mietpreisbremse", "modernisierung", "geg", "heizung"],
    "due_diligence": ["due diligence", "besichtigung", "grundbuch", "teilungserklärung", "protokoll", "energieausweis", "sanierung", "dach", "keller", "elektrik", "versicherung"],
    "market_data": ["markt", "preis", "stadt", "münchen", "berlin", "frankfurt", "hamburg", "prognose", "trend", "mietspiegel"],
    "strategies": ["strategie", "brrrr", "vermietung", "exit", "verkauf", "schenkung", "nießbrauch", "möbliert", "airbnb", "wg"],
}


def classify_topics(user_message: str, max_topics: int = 3) -> list[str]:
    """Classify which knowledge topics are relevant for a user message."""
    message_lower = user_message.lower()
    scores = {}

    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in message_lower)
        if score > 0:
            scores[topic] = score

    # Always include core_rules
    if "core_rules" not in scores:
        scores["core_rules"] = 0.5

    # Sort by score, take top N
    sorted_topics = sorted(scores.keys(), key=lambda t: scores[t], reverse=True)
    return sorted_topics[:max_topics]


def load_topic(topic_name: str) -> str:
    """Load a topic file's content."""
    filepath = os.path.join(TOPIC_DIR, f"{topic_name}.md")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    return ""


def build_knowledge_prompt(user_message: str, max_topics: int = 3) -> str:
    """Build the knowledge section of the system prompt based on the user's question."""
    topics = classify_topics(user_message, max_topics)

    sections = []
    for topic in topics:
        content = load_topic(topic)
        if content:
            sections.append(f"=== WISSEN: {topic.upper().replace('_', ' ')} ===\n{content}")

    return "\n\n".join(sections)
