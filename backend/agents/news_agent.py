"""
News-Intelligence Agent
Scannt Nachrichtenquellen nach Events die den Immobilienmarkt betreffen.
Bewertet Impact und schreibt konkrete Implikationen fuer Kaeufer.
Ergebnis wird in brain/topics/market_data.md als News-Sektion angehaengt.
"""

import httpx
import json
import os
import sys
from datetime import datetime

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TOPIC_FILE = os.path.join(os.path.dirname(__file__), "..", "brain", "topics", "market_data.md")

NEWS_SOURCES = [
    {
        "name": "Handelsblatt Immobilien",
        "url": "https://www.handelsblatt.com/finanzen/immobilien/",
    },
    {
        "name": "FAZ Immobilien",
        "url": "https://www.faz.net/aktuell/wirtschaft/wohnen/",
    },
    {
        "name": "tagesschau Wirtschaft",
        "url": "https://www.tagesschau.de/wirtschaft/",
    },
]


def fetch_news_page(url):
    """Holt eine Nachrichtenseite"""
    try:
        resp = httpx.get(url, timeout=15, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        if resp.status_code == 200:
            return resp.text[:20000]
    except Exception as e:
        print(f"Fehler bei {url}: {e}")
    return None


def analyze_news_with_claude(news_contents):
    """Claude analysiert die Nachrichteninhalte auf Immobilien-Relevanz"""
    if not ANTHROPIC_API_KEY:
        print("FEHLER: ANTHROPIC_API_KEY nicht gesetzt")
        return None

    combined = "\n\n---\n\n".join([
        f"QUELLE: {src['name']}\n{content}"
        for src, content in news_contents
        if content
    ])

    if not combined.strip():
        return None

    prompt = f"""Analysiere die folgenden Nachrichten-Webseiten und finde alle Meldungen die relevant fuer den deutschen Immobilienmarkt sind.

Fuer jede relevante Meldung, bewerte:
1. Was ist passiert?
2. Wie beeinflusst es Immobilienkaeufer/Kapitalanleger?
3. Impact-Level: HOCH, MITTEL, oder NIEDRIG

Gib das Ergebnis als JSON zurueck:
{{
  "datum": "{datetime.now().strftime('%Y-%m-%d')}",
  "news": [
    {{
      "titel": "Kurzer Titel",
      "zusammenfassung": "Was ist passiert (1-2 Saetze)",
      "impact": "HOCH|MITTEL|NIEDRIG",
      "bedeutung_fuer_kaeufer": "Konkrete Auswirkung fuer Immobilienkaeufer (1-2 Saetze)",
      "quelle": "Name der Quelle"
    }}
  ],
  "markteinschaetzung": "Kurze Gesamteinschaetzung des aktuellen Marktumfelds (2-3 Saetze)"
}}

Maximal 5 relevante Meldungen. Nur wirklich immobilienrelevante News (Zinsen, Baupreise, Gesetze, EZB, Wohnungspolitik, Energiekosten).
Wenn keine relevanten News gefunden werden, gib ein leeres news-Array zurueck.
Gib NUR das JSON zurueck.

NACHRICHTENINHALTE:
{combined[:15000]}"""

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 2000,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=45,
        )

        if resp.status_code == 200:
            text = resp.json()["content"][0]["text"].strip()
            if text.startswith("{"):
                return json.loads(text)
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
                return json.loads(text)
            if "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                return json.loads(text)
    except Exception as e:
        print(f"Claude API Fehler: {e}")

    return None


def update_market_data_md(news_data):
    """Aktualisiert die market_data.md mit aktuellen News"""
    if not news_data:
        print("Keine News-Daten zum Aktualisieren")
        return False

    try:
        with open(TOPIC_FILE, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"FEHLER: {TOPIC_FILE} nicht gefunden")
        return False

    # Baue News-Sektion
    datum = news_data.get("datum", datetime.now().strftime("%Y-%m-%d"))
    news_section = f"\n### Aktuelle Markt-News (Stand: {datum})\n\n"

    if news_data.get("markteinschaetzung"):
        news_section += f"**Markteinschaetzung:** {news_data['markteinschaetzung']}\n\n"

    news_items = news_data.get("news", [])
    if news_items:
        for item in news_items:
            impact_marker = {"HOCH": "!!!", "MITTEL": "!!", "NIEDRIG": "!"}.get(item.get("impact", ""), "")
            news_section += f"- **{item['titel']}** ({item.get('impact', 'k.A.')}): {item['zusammenfassung']}"
            if item.get("bedeutung_fuer_kaeufer"):
                news_section += f" → {item['bedeutung_fuer_kaeufer']}"
            news_section += "\n"
    else:
        news_section += "Keine immobilienrelevanten Meldungen.\n"

    # Ersetze alte News-Sektion oder haenge an
    import re
    pattern = r"\n### Aktuelle Markt-News \(Stand:.*?\n(?:.*\n)*?(?=\n### |\Z)"
    if re.search(pattern, content):
        new_content = re.sub(pattern, news_section, content)
    else:
        # Haenge ans Ende an
        new_content = content.rstrip() + "\n" + news_section

    with open(TOPIC_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"market_data.md aktualisiert mit {len(news_items)} News vom {datum}")
    return True


def run():
    """Hauptfunktion des News-Intelligence Agents"""
    print(f"[{datetime.now().isoformat()}] News-Intelligence Agent gestartet...")

    # 1. News-Seiten laden
    news_contents = []
    for source in NEWS_SOURCES:
        print(f"Lade {source['name']}...")
        html = fetch_news_page(source["url"])
        if html:
            print(f"  -> {len(html)} Zeichen geladen")
            news_contents.append((source, html))
        else:
            print(f"  -> FEHLER beim Laden")

    if not news_contents:
        print("Keine News-Quellen erreichbar. Abbruch.")
        return False

    # 2. Mit Claude analysieren
    print("Analysiere News mit Claude...")
    analysis = analyze_news_with_claude(news_contents)

    if not analysis:
        print("Konnte News nicht analysieren. Abbruch.")
        return False

    news_count = len(analysis.get("news", []))
    print(f"{news_count} relevante Meldungen gefunden")

    # 3. Knowledge Base aktualisieren
    print("Aktualisiere Knowledge Base...")
    success = update_market_data_md(analysis)

    if success:
        print("News-Intelligence Agent erfolgreich abgeschlossen!")
    else:
        print("Fehler beim Aktualisieren.")

    return success


if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
