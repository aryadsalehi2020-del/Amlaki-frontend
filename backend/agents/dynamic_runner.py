"""
Dynamischer Agent-Runner
Fuehrt Agents basierend auf DB-Konfiguration aus.
Kein hardcoded Code pro Agent -- alles ueber Prompt + URLs + Target-File.
"""

import httpx
import json
import os
import re
from datetime import datetime

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TOPICS_DIR = os.path.join(os.path.dirname(__file__), "..", "brain", "topics")


def fetch_url(url: str, max_chars: int = 15000) -> str:
    """Fetched HTML von einer URL"""
    try:
        resp = httpx.get(url, timeout=20, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        if resp.status_code == 200 and len(resp.text) > 100:
            return resp.text[:max_chars]
    except Exception as e:
        print(f"[Agent] Fehler bei {url}: {e}")
    return ""


def call_claude(prompt: str, system: str = "", model: str = "claude-haiku-4-5-20251001", max_tokens: int = 1500) -> str:
    """Ruft Claude API direkt auf"""
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY nicht gesetzt")

    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": max_tokens,
            "system": system or "Du bist ein Recherche-Agent fuer Immobiliendaten.",
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["content"][0]["text"].strip()


def update_topic_file(target_file: str, target_section: str, new_content: str) -> bool:
    """Ersetzt eine Section in einem Topic-File"""
    filepath = os.path.join(TOPICS_DIR, target_file)

    if not os.path.exists(filepath):
        # Neues File erstellen
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {target_file.replace('.md', '').title()}\n\n{new_content}\n")
        return True

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if target_section:
        # Versuche Section zu finden und zu ersetzen
        pattern = re.compile(
            rf"(## {re.escape(target_section)}.*?\n)(.*?)(?=\n## |\Z)",
            re.DOTALL
        )
        if pattern.search(content):
            new_file = pattern.sub(rf"\1{new_content}\n", content)
        else:
            # Section nicht gefunden -- am Ende anfuegen
            new_file = content.rstrip() + f"\n\n## {target_section}\n{new_content}\n"
    else:
        # Kein Section-Target -- ganzes File ersetzen
        new_file = new_content

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_file)

    return True


def run_agent(agent_config) -> dict:
    """
    Fuehrt einen Agent basierend auf seiner DB-Konfiguration aus.

    agent_config: AgentConfig Objekt oder dict mit:
        - name, prompt, source_urls, target_file, target_section, model, max_tokens

    Returns: dict mit status, result, error
    """
    name = agent_config.name if hasattr(agent_config, 'name') else agent_config.get('name', 'unknown')
    prompt = agent_config.prompt if hasattr(agent_config, 'prompt') else agent_config.get('prompt', '')
    source_urls = agent_config.source_urls if hasattr(agent_config, 'source_urls') else agent_config.get('source_urls', '')
    target_file = agent_config.target_file if hasattr(agent_config, 'target_file') else agent_config.get('target_file', '')
    target_section = agent_config.target_section if hasattr(agent_config, 'target_section') else agent_config.get('target_section', '')
    model = agent_config.model if hasattr(agent_config, 'model') else agent_config.get('model', 'claude-haiku-4-5-20251001')
    max_tokens = agent_config.max_tokens if hasattr(agent_config, 'max_tokens') else agent_config.get('max_tokens', 1500)

    if not prompt:
        return {"status": "error", "error": "Kein Prompt konfiguriert", "result": None}

    try:
        # 1. URLs scrapen (wenn vorhanden)
        scraped_content = ""
        if source_urls:
            urls = [u.strip() for u in source_urls.split(",") if u.strip()]
            for url in urls:
                html = fetch_url(url)
                if html:
                    scraped_content += f"\n\n--- Quelle: {url} ---\n{html}"

        # 2. Prompt zusammenbauen
        full_prompt = prompt
        if scraped_content:
            full_prompt += f"\n\nGESCRAPTE DATEN:\n{scraped_content}"
        full_prompt += f"\n\nDatum heute: {datetime.now().strftime('%Y-%m-%d')}"

        # 3. Claude aufrufen
        result = call_claude(
            prompt=full_prompt,
            model=model or "claude-haiku-4-5-20251001",
            max_tokens=max_tokens or 1500
        )

        # 4. In Knowledge Base schreiben (wenn Target konfiguriert)
        if target_file:
            update_topic_file(target_file, target_section, result)

        return {
            "status": "success",
            "result": result[:500],  # Gekuerzt fuer DB
            "error": None
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:500],
            "result": None
        }
