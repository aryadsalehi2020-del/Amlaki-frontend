"""
Zinsen-Monitor Agent
Aktualisiert die Bauzinsen in der Knowledge Base taeglich.
Nutzt Interhyp/Dr.Klein Webdaten via httpx + Claude zur Extraktion.
"""

import httpx
import json
import os
import sys
from datetime import datetime

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TOPIC_FILE = os.path.join(os.path.dirname(__file__), "..", "brain", "topics", "financing.md")


def fetch_interhyp_data():
    """Versucht aktuelle Zinsdaten von Interhyp zu holen"""
    urls = [
        "https://www.interhyp.de/ratgeber/was-muss-ich-wissen/zinsen/zins-charts/",
        "https://www.interhyp.de/bauzins-aktuell/",
    ]

    for url in urls:
        try:
            resp = httpx.get(url, timeout=15, follow_redirects=True, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            })
            if resp.status_code == 200 and len(resp.text) > 1000:
                return resp.text[:15000]  # Ersten 15k Zeichen
        except Exception as e:
            print(f"Fehler bei {url}: {e}")

    return None


def extract_rates_with_claude(html_content):
    """Nutzt Claude um Zinsdaten aus HTML zu extrahieren"""
    if not ANTHROPIC_API_KEY:
        print("FEHLER: ANTHROPIC_API_KEY nicht gesetzt")
        return None

    prompt = f"""Extrahiere die aktuellen Bauzinsen aus folgendem HTML-Content.

Gib die Daten als JSON zurueck in diesem Format:
{{
  "datum": "YYYY-MM-DD",
  "quelle": "Interhyp",
  "ezb_leitzins": "X,XX%",
  "zinsen": [
    {{"zinsbindung": "5 Jahre", "bis_60": "X,XX%", "bis_80": "X,XX%", "bis_100": "X,XX%"}},
    {{"zinsbindung": "10 Jahre", "bis_60": "X,XX%", "bis_80": "X,XX%", "bis_100": "X,XX%"}},
    {{"zinsbindung": "15 Jahre", "bis_60": "X,XX%", "bis_80": "X,XX%", "bis_100": "X,XX%"}},
    {{"zinsbindung": "20 Jahre", "bis_60": "X,XX%", "bis_80": "X,XX%", "bis_100": "X,XX%"}}
  ],
  "trend": "Kurzer Satz zum aktuellen Trend",
  "empfehlung": "Kurze Empfehlung"
}}

Wenn du die Daten nicht finden kannst, gib null zurueck.
Gib NUR das JSON zurueck, keinen anderen Text.

HTML-Content:
{html_content[:12000]}"""

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
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )

        if resp.status_code == 200:
            text = resp.json()["content"][0]["text"].strip()
            # Versuche JSON zu parsen
            if text.startswith("{"):
                return json.loads(text)
            # Manchmal kommt es in Markdown Code Blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
                return json.loads(text)
            if "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                return json.loads(text)
    except Exception as e:
        print(f"Claude API Fehler: {e}")

    return None


def update_financing_md(rates_data):
    """Aktualisiert die financing.md mit neuen Zinsdaten"""
    if not rates_data or not rates_data.get("zinsen"):
        print("Keine Zinsdaten zum Aktualisieren")
        return False

    try:
        with open(TOPIC_FILE, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"FEHLER: {TOPIC_FILE} nicht gefunden")
        return False

    # Finde den Zinsen-Block und ersetze ihn
    datum = rates_data.get("datum", datetime.now().strftime("%d. %B %Y"))
    quelle = rates_data.get("quelle", "Interhyp")

    new_zinsen_block = f"### Bauzinsen (Stand: {datum}, Quelle: {quelle})\n\n"
    new_zinsen_block += "| Zinsbindung | Bis 60% Beleihung | Bis 80% Beleihung | Bis 100% Beleihung |\n"
    new_zinsen_block += "|-------------|-------------------|-------------------|---------------------|\n"

    for zins in rates_data["zinsen"]:
        new_zinsen_block += f"| {zins['zinsbindung']} | {zins['bis_60']} | {zins['bis_80']} | {zins['bis_100']} |\n"

    new_zinsen_block += f"\n- **EZB-Leitzins:** {rates_data.get('ezb_leitzins', 'k.A.')}\n"
    new_zinsen_block += f"- **Trend:** {rates_data.get('trend', 'Keine Daten')}\n"
    new_zinsen_block += f"- **Empfehlung:** {rates_data.get('empfehlung', 'Keine Empfehlung')}\n"

    # Ersetze den alten Block
    import re
    pattern = r"### Bauzinsen \(Stand:.*?\n(?:.*\n)*?(?=\n### |\Z)"
    new_content = re.sub(pattern, new_zinsen_block + "\n", content)

    if new_content == content:
        print("WARNUNG: Konnte Zinsen-Block nicht finden/ersetzen")
        return False

    with open(TOPIC_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"financing.md aktualisiert mit Daten vom {datum}")
    return True


def run():
    """Hauptfunktion des Zinsen-Monitor Agents"""
    print(f"[{datetime.now().isoformat()}] Zinsen-Monitor gestartet...")

    # 1. Daten von Interhyp holen
    print("Lade Interhyp-Daten...")
    html = fetch_interhyp_data()

    if not html:
        print("Konnte keine Webdaten laden. Abbruch.")
        return False

    print(f"HTML geladen ({len(html)} Zeichen)")

    # 2. Zinsen mit Claude extrahieren
    print("Extrahiere Zinsen mit Claude...")
    rates = extract_rates_with_claude(html)

    if not rates:
        print("Konnte keine Zinsdaten extrahieren. Abbruch.")
        return False

    print(f"Zinsdaten extrahiert: {json.dumps(rates, indent=2, ensure_ascii=False)}")

    # 3. Knowledge Base aktualisieren
    print("Aktualisiere Knowledge Base...")
    success = update_financing_md(rates)

    if success:
        print("Zinsen-Monitor erfolgreich abgeschlossen!")
    else:
        print("Fehler beim Aktualisieren der Knowledge Base.")

    return success


if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
