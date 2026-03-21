"""
Runner fuer alle Research-Agents.
Prueft DB-Config ob Agent aktiviert ist.
Kann lokal oder via GitHub Actions ausgefuehrt werden.
"""

import sys
import os

# Fuege Backend-Pfad hinzu
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def get_agent_config(name):
    """Prueft ob ein Agent in der DB aktiviert ist"""
    try:
        from database import SessionLocal
        from models import AgentConfig
        session = SessionLocal()
        agent = session.query(AgentConfig).filter(AgentConfig.name == name).first()
        if agent:
            enabled = agent.enabled
            session.close()
            return enabled
        session.close()
    except Exception as e:
        print(f"DB-Config Check fehlgeschlagen: {e}")
    # Default: aktiviert wenn DB nicht erreichbar
    return True


def update_agent_status(name, status, error=None):
    """Aktualisiert den Status eines Agents in der DB"""
    try:
        from database import SessionLocal
        from models import AgentConfig
        from datetime import datetime
        session = SessionLocal()
        agent = session.query(AgentConfig).filter(AgentConfig.name == name).first()
        if agent:
            agent.last_run = datetime.utcnow()
            agent.last_status = status
            agent.last_error = error[:500] if error else None
            session.commit()
        session.close()
    except Exception as e:
        print(f"Status-Update fehlgeschlagen: {e}")


def main():
    from agents.zinsen_monitor import run as run_zinsen
    from agents.news_agent import run as run_news

    agents = [
        ("zinsen", "ZINSEN-MONITOR", run_zinsen),
        ("news", "NEWS-INTELLIGENCE", run_news),
    ]

    results = {}

    print("=" * 60)
    print("AmlakiAI Research Agents")
    print("=" * 60)

    for name, label, run_fn in agents:
        print(f"\n--- {label} ---")

        # Pruefe ob aktiviert
        if not get_agent_config(name):
            print(f"  UEBERSPRUNGEN (deaktiviert in Admin)")
            results[name] = True  # Kein Fehler
            continue

        try:
            success = run_fn()
            results[name] = success
            update_agent_status(name, "success" if success else "error",
                              None if success else "Agent hat False zurueckgegeben")
        except Exception as e:
            print(f"FEHLER: {e}")
            results[name] = False
            update_agent_status(name, "error", str(e))

    # Zusammenfassung
    print("\n" + "=" * 60)
    print("ERGEBNISSE:")
    for agent, success in results.items():
        status = "OK" if success else "FEHLER"
        print(f"  {agent}: {status}")
    print("=" * 60)

    all_ok = all(results.values())
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
