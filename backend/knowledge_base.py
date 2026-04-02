"""
AmlakI Knowledge Base
Umfassendes Wissen für die Immobilienanalyse
Version 3.0 ULTIMATE - Januar 2026

WICHTIG: Um das "Gehirn" der KI zu ändern:
1. Bearbeite die Datei: backend/brain/KNOWLEDGE.md
2. Starte den Server neu

Die KNOWLEDGE.md Datei wird bei jedem Start geladen und an die KI übergeben.
"""

from typing import List, Dict, Any, Optional
import math
import os
from pathlib import Path

# Pfad zur Knowledge-Datei
BRAIN_DIR = Path(__file__).parent / "brain"
KNOWLEDGE_FILE = BRAIN_DIR / "KNOWLEDGE.md"


def load_knowledge_from_file() -> str:
    """
    Lädt das Wissen aus der KNOWLEDGE.md Datei.
    Falls die Datei nicht existiert, wird das eingebaute Wissen verwendet.
    """
    if KNOWLEDGE_FILE.exists():
        try:
            with open(KNOWLEDGE_FILE, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Warnung: Konnte KNOWLEDGE.md nicht laden: {e}")
    return None

# =============================================================================
# PHILOSOPHIE: NIEMALS NUR "NEIN" SAGEN!
# =============================================================================
# Auch bei schlechter Bewertung IMMER konstruktive Tipps geben.
# Der User entscheidet selbst - wir zeigen ALLE Optionen!

# =============================================================================
# KFW-FÖRDERPROGRAMME
# =============================================================================

KFW_PROGRAMME = {
    "124": {
        "name": "KfW 124 Wohneigentumsprogramm",
        "kredit_max": 100000,
        "zins_effektiv": 3.4,
        "zinsbindung": "5-10 Jahre",
        "fuer": "Selbstgenutzte Immobilien (Kauf oder Bau)",
        "wichtig": "Antrag ZWINGEND vor Kaufvertrag über Hausbank!",
        "tilgungsfrei_moeglich": True
    },
    "261": {
        "name": "KfW 261/262 BEG Wohngebäude (Energetische Sanierung)",
        "kredit_max": 150000,
        "tilgungszuschuss": {
            "EH40": {"prozent": 20, "max": 30000},
            "EH40_EE": {"prozent": 25, "max": 37500},
            "EH55": {"prozent": 15, "max": 18000},
            "EH55_EE": {"prozent": 17.5, "max": 26250},
            "EH70_EE": {"prozent": 15, "max": 22500},
            "EH85": {"prozent": 10, "max": 15000}
        },
        "max_zuschuss_mit_allen_boni": 67500,
        "fuer": "Energetische Sanierung zum Effizienzhaus",
        "wichtig": "Antrag VOR Baubeginn, Energieberater erforderlich"
    },
    "297": {
        "name": "KfW 297/298 Klimafreundlicher Neubau",
        "kredit_ohne_qng": 100000,
        "kredit_mit_qng": 150000,
        "zins_effektiv": 1.13,
        "fuer": "Neubau als Effizienzhaus",
        "wichtig": "Seit Dezember 2025: EH 55 wieder förderfähig!"
    },
    "308": {
        "name": "KfW 308 Jung kauft Alt",
        "kredit_basis": 100000,
        "kredit_ab_2_kinder": 125000,
        "kredit_ab_3_kinder": 150000,
        "zins_effektiv": 1.12,
        "einkommensgrenzen": {
            "1_kind": 90000,
            "pro_weiteres": 10000
        },
        "sanierungspflicht": "EH 85 EE innerhalb 54 Monaten",
        "fuer": "Familien mit Kindern, unsanierte Bestandsimmobilien (F, G, H)",
        "nur_selbstnutzer": True,
        "wichtig": "NUR für Selbstnutzer, NICHT für Kapitalanleger!"
    },
    "458": {
        "name": "KfW 458 Heizungsförderung",
        "foerderung": {
            "grundfoerderung": 30,
            "effizienzbonus": 5,  # Wärmepumpe mit natürlichem Kältemittel
            "klimabonus": 20,  # Nur Selbstnutzer, Austausch fossil
            "einkommensbonus": 30  # Haushaltseinkommen <= 40.000€
        },
        "max_foerderung": 70,
        "fuer": "Klimafreundliche Heizungen",
        "wichtig": "Volle Förderung nur für Selbstnutzer"
    },
    "159": {
        "name": "KfW 159 Altersgerecht Umbauen",
        "kredit_max": 50000,
        "fuer": "Barrierereduzierung, Einbruchschutz",
        "auch_fuer_vermieter": True
    },
    "270": {
        "name": "KfW 270 Erneuerbare Energien",
        "fuer": "PV-Anlagen, Batteriespeicher",
        "kredit": "Zinsgünstig, variabel"
    }
}

# =============================================================================
# BAFA-FÖRDERUNGEN
# =============================================================================

BAFA_FOERDERUNGEN = {
    "einzelmassnahmen": {
        "name": "BAFA Einzelmaßnahmen",
        "daemmung_fenster_sonnenschutz": {
            "foerderung_standard": 15,
            "foerderung_mit_isfp": 20
        },
        "isfp_bonus": {
            "name": "iSFP-Bonus (Individueller Sanierungsfahrplan)",
            "effekt": "Förderfähige Kosten verdoppeln sich auf 60.000€!",
            "beispiel": {
                "ohne_isfp": {"kosten": 30000, "zuschuss": 4500},
                "mit_isfp": {"kosten": 60000, "zuschuss": 12000}
            }
        }
    }
}

# =============================================================================
# LANDESFÖRDERUNGEN
# =============================================================================

LANDESFOERDERUNGEN = {
    "NRW": {
        "name": "NRW.BANK Eigentumsförderung",
        "grunddarlehen": 184000,
        "zins": 0.0,
        "laufzeit_jahre": 30,
        "kinderbonus_pro_kind": 24000,
        "tilgungsnachlass": 10,
        "einkommensgrenze_4_personen": 69000,
        "highlight": "Das großzügigste Programm Deutschlands!"
    },
    "Hessen": {
        "name": "WI-Bank Hessen-Darlehen",
        "darlehen_max": 200000,
        "zins_sollzins": 0.60,
        "zinsbindung_jahre": 20,
        "vorteil": "Nachrangige Grundbucheintragung -> bessere Konditionen bei Hausbank"
    },
    "Bayern": {
        "name": "BayernLabo Förderung",
        "kinderzuschuss_pro_kind": 7500,
        "darlehen_anteil": "30-40% der förderfähigen Kosten",
        "hinweis": "Einkommensgrenzen 2023 um 25% erhöht"
    },
    "Baden-Württemberg": {
        "name": "L-Bank Z15-Darlehen",
        "darlehen_max": 100000,
        "zinsverbilligung_jahre": 10,
        "hinweis": "Seit Dezember 2025: Digitale Antragstellung möglich"
    }
}

# =============================================================================
# AFA-SYSTEMATIK (Abschreibung für Abnutzung)
# =============================================================================

AFA_REGELN = {
    "linear": {
        "ab_2023": {"satz": 3.0, "dauer_jahre": 33},
        "1925_bis_2022": {"satz": 2.0, "dauer_jahre": 50},
        "vor_1925": {"satz": 2.5, "dauer_jahre": 40}
    },
    "degressiv": {
        "gueltig_fuer": "Neubauten zwischen Oktober 2023 und September 2029",
        "satz": 5.0,
        "basis": "Jeweiliger Restwert",
        "vorteil": "Höhere Abschreibung in den ersten Jahren",
        "wechsel_zu_linear": "Nach ca. 13-14 Jahren empfohlen (einmaliger Wechsel erlaubt)"
    },
    "sonder_afa_7b": {
        "zusaetzliche_afa": 5.0,
        "dauer_jahre": 4,
        "gesamt_extra": 20,
        "voraussetzungen": [
            "Baukosten max. 5.200€/m²",
            "Effizienzhaus 40 mit QNG-Zertifikat",
            "Mindestens 10 Jahre Vermietung"
        ],
        "kombinierbar_mit_degressiv": True
    },
    "denkmal_afa": {
        "vermietung": {
            "gesamt": 100,
            "verteilung": "8x9% + 4x7% = 100% in 12 Jahren"
        },
        "selbstnutzung": {
            "gesamt": 90,
            "verteilung": "10x9% = 90% in 10 Jahren"
        },
        "wichtig": "Abstimmung mit Denkmalschutzbehörde VOR Baubeginn!"
    },
    "verkuerzte_restnutzungsdauer": {
        "beschreibung": "Gutachten für 15-25 Jahre statt pauschal 50 Jahre",
        "effekt": "AfA-Satz steigt auf 4-6,7%!",
        "gutachten_kosten": "900-1.500€ (selbst absetzbar)",
        "anerkennungsquote": ">97%",
        "lohnt_bei": "Altbauten mit Sanierungsstau"
    }
}

# =============================================================================
# STEUERLICH ABSETZBARE KOSTEN
# =============================================================================

ABSETZBARE_KOSTEN = {
    "sofort_absetzbar": [
        "Schuldzinsen (größter Posten!)",
        "Disagio (Zinsvorauszahlung)",
        "Bereitstellungszinsen",
        "Hausverwaltung",
        "Instandhaltung/Reparaturen (nicht anschaffungsnah!)",
        "Fahrtkosten zur Immobilie (0,30€/km)",
        "Telefon/Porto (anteilig)",
        "Büromaterial",
        "Kontoführungsgebühren",
        "Steuerberater (Anlage V-Anteil)",
        "Mitgliedsbeiträge (Haus & Grund)",
        "Mahnkosten",
        "Räumungskosten",
        "Mietausfälle (als Werbungskosten)",
        "Maklerkosten bei Neuvermietung"
    ],
    "ueber_afa_abzuschreiben": [
        "Anschaffungskosten Gebäude",
        "Kaufnebenkosten (Notar, Grundbuch, Grunderwerbsteuer, Makler beim KAUF)",
        "Anschaffungsnahe Herstellungskosten (15%-Regel!)"
    ]
}

# =============================================================================
# 15%-REGEL (Anschaffungsnahe Herstellungskosten)
# =============================================================================

REGEL_15_PROZENT = {
    "definition": "Übersteigen Instandsetzungskosten innerhalb von 3 Jahren nach Kauf 15% des Gebäudewertes, werden ALLE diese Kosten zu Herstellungskosten",
    "folge": "Kosten müssen über 50 Jahre abgeschrieben werden statt sofort",
    "gestaltungstipps": [
        "Renovierung auf NACH der 3-Jahres-Frist verschieben",
        "Eigenleistung: Nur Materialkosten zählen",
        "Kosten auf 3 Jahre verteilen, jedes Jahr unter 5% bleiben"
    ]
}

# =============================================================================
# AKTUELLE BAUZINSEN (Januar 2026)
# =============================================================================

BAUZINSEN = {
    "5_jahre": {"von": 3.1, "bis": 3.4},
    "10_jahre": {"von": 3.3, "bis": 3.8},
    "15_jahre": {"von": 3.5, "bis": 4.0},
    "20_jahre": {"von": 3.8, "bis": 4.2}
}

BELEIHUNGSAUFSCHLAEGE = {
    "bis_60": 0.0,
    "60_80": 0.15,
    "80_100": 0.30,
    "ueber_100": 0.60
}

# =============================================================================
# MIETRECHT
# =============================================================================

MIETRECHT = {
    "mieterhoehung_558": {
        "kappungsgrenze_normal": 20,
        "kappungsgrenze_angespannt": 15,
        "anzahl_gemeinden_15_prozent": 627,
        "sperrfrist_monate": 12,
        "begruendung_durch": ["Mietspiegel", "3 Vergleichswohnungen", "Gutachten"]
    },
    "modernisierungsumlage_559": {
        "umlage_prozent": 8,
        "kappung_niedrige_miete": {"grenze_euro": 7, "max_euro_qm": 2},
        "kappung_hohe_miete": {"max_euro_qm": 3},
        "zeitraum_jahre": 6
    },
    "mietpreisbremse": {
        "verlaengert_bis": "31.12.2029",
        "gilt_in_gemeinden": 410,
        "max_ueber_vergleichsmiete": 10,
        "ausnahmen": [
            "Neubauten ab 01.10.2014",
            "Umfassende Modernisierung (>1/3 Neubaukosten)",
            "Vormiete war höher"
        ]
    },
    "kuendigung_eigenbedarf": {
        "fristen": {
            "bis_5_jahre": 3,
            "5_8_jahre": 6,
            "ueber_8_jahre": 9
        },
        "formvorschriften": [
            "Schriftform (keine E-Mail!)",
            "Begründung im Kündigungsschreiben",
            "Hinweis auf Widerspruchsrecht"
        ]
    }
}

# =============================================================================
# NEBENKOSTEN
# =============================================================================

NEBENKOSTEN = {
    "umlagefaehig": [
        "Grundsteuer",
        "Wasserversorgung & Entwässerung",
        "Heizung & Warmwasser",
        "Aufzug",
        "Straßenreinigung & Müllabfuhr",
        "Gebäudereinigung",
        "Gartenpflege",
        "Beleuchtung (Gemeinschaftsflächen)",
        "Schornsteinfeger",
        "Versicherungen (Gebäude, Haftpflicht)",
        "Hauswart",
        "Gemeinschaftsantenne/Breitband",
        "Wäschepflege (Gemeinschaftswaschküche)"
    ],
    "nicht_umlagefaehig": [
        "Hausverwaltung",
        "Instandhaltungsrücklage",
        "Reparaturen",
        "Bankgebühren"
    ],
    "frist_monate": 12
}

# =============================================================================
# DUE DILIGENCE
# =============================================================================

DUE_DILIGENCE = {
    "pflichtdokumente_weg": [
        {"dokument": "Teilungserklärung + GO", "wichtig": "Rechte & Pflichten, Sondereigentum"},
        {"dokument": "ETV-Protokolle (3 Jahre)", "wichtig": "Streit, Beschlüsse, Probleme"},
        {"dokument": "Wirtschaftsplan (aktuell)", "wichtig": "Geplante Kosten"},
        {"dokument": "Jahresabrechnung (letzte)", "wichtig": "Tatsächliche Kosten"},
        {"dokument": "Erhaltungsrücklage", "wichtig": "Finanzpolster der WEG"},
        {"dokument": "Hausgeld-Aufschlüsselung", "wichtig": "Umlagefähig vs. nicht"},
        {"dokument": "Sanierungsplanung", "wichtig": "Anstehende Maßnahmen"}
    ],
    "technische_pruefung": {
        "dach": {"lebensdauer": "50-80 Jahre", "kosten_efh": "39.000-60.000€"},
        "fassade": {"lebensdauer": "30-50 Jahre", "kosten_efh": "15.000-40.000€"},
        "fenster": {"lebensdauer": "30-40 Jahre", "kosten_efh": "8.000-18.000€"},
        "heizung": {"lebensdauer": "15-20 Jahre", "kosten_efh": "15.000-40.000€"},
        "elektrik": {"lebensdauer": "30-40 Jahre", "kosten_efh": "12.000-18.000€"},
        "sanitaer": {"lebensdauer": "30-50 Jahre", "kosten_efh": "10.000-20.000€"}
    },
    "kritische_red_flags": [
        "Bleirohre: Austauschpflicht bis 12.01.2026!",
        "Risse über 2mm: Statikproblem",
        "Feuchter Keller ohne Horizontalsperre",
        "Asbest in Fassadendämmung (Baujahr 1960-1990)",
        "Konstanttemperaturkessel über 30 Jahre"
    ],
    "grundbuch": {
        "abteilung_1": "Eigentümer",
        "abteilung_2": "Wegerechte, Nießbrauch, Wohnrecht, Zwangsversteigerungsvermerk",
        "abteilung_3": "Grundschulden",
        "wertminderung_niessbrauch": "30-70%",
        "baulastenverzeichnis": "Separat beim Bauordnungsamt anfordern (20-50€)"
    }
}

# =============================================================================
# MARKTDATEN 2025/2026
# =============================================================================

MARKTDATEN = {
    "kaufpreise_pro_qm": {
        "muenchen": {"preis": 9000, "trend": "stabil"},
        "berlin": {"preis": 5840, "trend": "+1,6%"},
        "hamburg": {"preis": 5500, "trend": "+0,4%"},
        "frankfurt": {"preis": 5200, "trend": "stabil"},
        "leipzig": {"preis": 3000, "trend": "+2,9%"},
        "bundesdurchschnitt": {"von": 3260, "bis": 4250, "trend": "+2-3%"}
    },
    "mieten": {
        "steigerung_2025": "+4,7% bis +5,3%",
        "muenchen_neubau": 22.64,
        "bundesdurchschnitt": {"von": 11.20, "bis": 12.40},
        "prognose_2026": "+4-5%"
    },
    "renditen": {
        "hoechste": {
            "chemnitz": 5.58,
            "hagen": 5.39,
            "halle": 5.30,
            "wuppertal": 5.08,
            "gelsenkirchen": 5.07
        },
        "a_staedte": {"von": 2.8, "bis": 3.6},
        "top_50_durchschnitt": 4.01
    },
    "prognose": {
        "kaufpreise_2026_2027": "+3-4%, Metropolen bis +5%",
        "mieten": "Weiter steigend, keine Entspannung",
        "bauzinsen": "Stabil 3,1-3,7%",
        "bis_2030": "+22% nominal möglich"
    }
}

# =============================================================================
# DEAL-BREAKER (Finger weg!)
# =============================================================================

DEALBREAKER = [
    "Unklare Eigentums-/Lastenlage (Wohnrecht, Nießbrauch)",
    "Massive Bauschäden/Statik/Feuchte mit unklarer Sanierbarkeit",
    "WEG-Governance hochriskant (Mehrheitseigentümer, Dauerstreit, leere Kasse)",
    "Cashflow im Worst-Case-Szenario nicht tragfähig",
    "Fehlende Kernunterlagen trotz Nachfrage",
    "Erbpacht mit Restlaufzeit < 50 Jahre",
    "Zwangsversteigerungsvermerk im Grundbuch",
    "Asbest/Altlasten ohne klaren Sanierungsplan",
    "Sperrminorität eines unkooperativen Eigentümers"
]

# =============================================================================
# BERECHNUNGSFUNKTIONEN
# =============================================================================

def berechne_fairen_preis(kaufpreis: float, jahresmiete: float, wohnflaeche: float = None,
                          markt_qm_preis: float = None) -> Dict[str, Any]:
    """
    Berechnet den fairen Preis nach mehreren Methoden.
    Zielrendite und Zielfaktor werden an den lokalen Markt angepasst.
    """
    # Zielwerte nach Marktklasse anpassen
    if markt_qm_preis and markt_qm_preis > 7000:
        # A-Stadt (München, Hamburg, Frankfurt etc.) - Faktor 30-38 üblich
        ziel_rendite = 0.03
        ziel_faktor = 30
    elif markt_qm_preis and markt_qm_preis > 4000:
        # B-Stadt - Faktor 24-28 üblich
        ziel_rendite = 0.04
        ziel_faktor = 24
    else:
        # C-Stadt / ländlich - Faktor 18-22 üblich
        ziel_rendite = 0.05
        ziel_faktor = 20

    # Methode 1: Nach Rendite
    nach_rendite = jahresmiete / ziel_rendite

    # Methode 2: Nach Faktor
    nach_faktor = jahresmiete * ziel_faktor

    # Methode 3: Nach Cashflow (vereinfacht)
    # Verfügbar für Rate ca. 65% der Miete (35% NK)
    verfuegbar = jahresmiete * 0.65
    max_kredit = verfuegbar / 0.053  # 3.8% Zins + 1.5% Tilgung
    nach_cashflow = max_kredit * 0.9  # 10% Puffer

    # Methode 4: Nach Markt (Vergleich mit lokalen qm-Preisen)
    nach_markt = None
    if markt_qm_preis and wohnflaeche and wohnflaeche > 0:
        nach_markt = round(markt_qm_preis * wohnflaeche)

    # Gewichteter Durchschnitt - Marktvergleich ist die objektivste Methode
    if nach_markt is not None:
        # Alle 4 Methoden: Markt 40%, Rendite 25%, Faktor 25%, Cashflow 10%
        fairer_preis_raw = round(
            nach_markt * 0.40 + nach_rendite * 0.25 + nach_faktor * 0.25 + nach_cashflow * 0.10
        )
    else:
        # Ohne Marktdaten: Rendite 40%, Faktor 40%, Cashflow 20%
        fairer_preis_raw = round(nach_rendite * 0.4 + nach_faktor * 0.4 + nach_cashflow * 0.2)

    # Cap: fairer Preis darf max 25% unter Kaufpreis liegen (realistisch)
    min_fairer_preis = round(kaufpreis * 0.75)
    fairer_preis = max(fairer_preis_raw, min_fairer_preis)

    differenz_prozent = round((kaufpreis / fairer_preis - 1) * 100, 1)

    # Realistische Bewertung
    if differenz_prozent > 20:
        bewertung = "Stark überteuert"
    elif differenz_prozent > 10:
        bewertung = "Überteuert"
    elif differenz_prozent > 5:
        bewertung = "Leicht über Marktwert"
    elif differenz_prozent >= -5:
        bewertung = "Marktgerecht"
    else:
        bewertung = "Unter Marktwert"

    result = {
        "fairer_preis": fairer_preis,
        "nach_rendite": round(nach_rendite),
        "nach_faktor": round(nach_faktor),
        "nach_cashflow": round(nach_cashflow),
        "aktueller_preis": kaufpreis,
        "differenz_prozent": differenz_prozent,
        "bewertung": bewertung
    }
    if nach_markt is not None:
        result["nach_markt"] = nach_markt

    return result


def empfehle_foerderungen(
    selbstnutzung: bool = False,
    kinder_anzahl: int = 0,
    energieklasse: str = None,
    baujahr: int = None,
    heizung_alt: bool = False,
    bundesland: str = None,
    einkommen: float = None
) -> List[Dict[str, Any]]:
    """
    Empfiehlt passende Förderungen basierend auf den Eingaben.
    """
    empfehlungen = []

    # KfW 124 - Selbstnutzung
    if selbstnutzung:
        empfehlungen.append({
            "programm": "KfW 124",
            "name": "Wohneigentumsprogramm",
            "kredit": 100000,
            "zins": "marktnaher Zins",
            "grund": "Selbstgenutzte Immobilie",
            "wichtig": "Antrag VOR Kaufvertrag!",
            "link": "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/F%C3%B6rderprodukte/Wohneigentumsprogramm-(124)/",
            "prioritaet": "hoch"
        })

    # KfW 261 - Energetische Sanierung (KfW 262 eingestellt, in 261 integriert)
    if energieklasse and energieklasse.upper() in ['D', 'E', 'F', 'G', 'H']:
        empfehlungen.append({
            "programm": "KfW 261",
            "name": "BEG Wohngebäude-Kredit",
            "kredit": 150000,
            "zuschuss": "Bis 45% Tilgungszuschuss (max. 67.500€)",
            "grund": f"Energieklasse {energieklasse} - Sanierung förderfähig",
            "wichtig": "Antrag VOR Baubeginn, Energieberater erforderlich! Gebäude muss mind. 5 Jahre alt sein.",
            "link": "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/F%C3%B6rderprodukte/Bundesf%C3%B6rderung-f%C3%BCr-effiziente-Geb%C3%A4ude-Wohngeb%C3%A4ude-Kredit-(261-262)/",
            "prioritaet": "hoch"
        })

    # KfW 308 - Jung kauft Alt (Familien + Bestandserwerb)
    if selbstnutzung and kinder_anzahl > 0 and energieklasse and energieklasse.upper() in ['F', 'G', 'H']:
        kredit = 100000 if kinder_anzahl == 1 else (125000 if kinder_anzahl == 2 else 150000)
        einkommensgrenze = 90000 + (kinder_anzahl - 1) * 10000
        empfehlungen.append({
            "programm": "KfW 308",
            "name": "Wohneigentum für Familien - Bestandserwerb (Jung kauft Alt)",
            "kredit": kredit,
            "zins": "ca. 1,12% (ca. 2,5 Prozentpunkte unter Marktzins)",
            "grund": f"Familie mit {kinder_anzahl} Kind(ern) + Energieklasse {energieklasse}",
            "einkommensgrenze": einkommensgrenze,
            "bedingung": "Sanierung zu Effizienzhaus 85 EE innerhalb von 54 Monaten",
            "link": "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/F%C3%B6rderprodukte/Wohneigentum-f%C3%BCr-Familien-Bestandserwerb-(308)/",
            "prioritaet": "sehr hoch"
        })

    # KfW 458 - Heizungsförderung (seit 2024 über KfW, nicht mehr BAFA)
    if heizung_alt:
        foerderung = 30  # Grundförderung
        if selbstnutzung:
            foerderung += 20  # Klimageschwindigkeits-Bonus
        if einkommen and einkommen <= 40000:
            foerderung += 30  # Einkommens-Bonus
        foerderung = min(foerderung, 70)
        empfehlungen.append({
            "programm": "KfW 458",
            "name": "Heizungsförderung für Privatpersonen",
            "foerderung_prozent": foerderung,
            "grund": "Alte Heizung austauschfähig",
            "beispiel": f"Bei 30.000€ Wärmepumpe: bis zu {int(30000 * foerderung / 100):,}€ Zuschuss!",
            "hinweis": None if selbstnutzung else "Als Vermieter nur 30% Grundförderung (Klimabonus und Einkommensbonus gelten nur für Eigennutzer)",
            "link": "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/F%C3%B6rderprodukte/Heizungsf%C3%B6rderung-f%C3%BCr-Privatpersonen-Wohngeb%C3%A4ude-(458)/",
            "prioritaet": "hoch" if foerderung >= 50 else "mittel"
        })

    # BAFA Einzelmaßnahmen (Dämmung, Fenster - Heizung läuft seit 2024 über KfW)
    empfehlungen.append({
        "programm": "BAFA",
        "name": "BEG Einzelmaßnahmen (Gebäudehülle)",
        "foerderung": "15-20% Zuschuss",
        "fuer": "Dämmung, Fenster, Sonnenschutz, Lüftungsanlagen",
        "tipp": "Mit iSFP-Bonus: Förderfähige Kosten verdoppeln sich auf 60.000€!",
        "link": "https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/effiziente_gebaeude_node.html",
        "prioritaet": "mittel"
    })

    # Landesförderungen
    if bundesland:
        landes = LANDESFOERDERUNGEN.get(bundesland)
        if landes:
            empfehlungen.append({
                "programm": f"Landesförderung {bundesland}",
                "name": landes["name"],
                "details": landes,
                "prioritaet": "hoch" if bundesland == "NRW" else "mittel"
            })

    return sorted(empfehlungen, key=lambda x: {"sehr hoch": 0, "hoch": 1, "mittel": 2}.get(x.get("prioritaet", "mittel"), 2))


def generiere_verbesserungsvorschlaege(
    kaufpreis: float,
    jahresmiete: float,
    kaufpreisfaktor: float,
    bruttorendite: float,
    cashflow: float,
    energieklasse: str = None,
    ist_miete: float = None,
    markt_miete: float = None,
    score: int = 0,
    bundesland: str = None
) -> List[Dict[str, Any]]:
    """
    Generiert konstruktive Verbesserungsvorschläge - auch bei schlechtem Score!
    NIEMALS nur "Nein" sagen!
    """
    tipps = []

    # 1. Preisverhandlung
    if kaufpreisfaktor > 22:
        ziel_faktor = 22
        ziel_preis = jahresmiete * ziel_faktor
        differenz = kaufpreis - ziel_preis
        neue_rendite = 100 / ziel_faktor
        tipps.append({
            "typ": "Preisverhandlung",
            "icon": "",
            "tipp": f"Verhandle den Preis auf {ziel_preis:,.0f}€ (-{differenz/1000:.0f}k)",
            "effekt": f"Kaufpreisfaktor sinkt auf {ziel_faktor}, Rendite steigt auf {neue_rendite:.1f}%",
            "argument": f"Vergleichbare Objekte in der Region haben Faktor {ziel_faktor}",
            "prioritaet": "hoch"
        })

    # 2. Mieterhöhungspotenzial
    if ist_miete and markt_miete and ist_miete < markt_miete * 0.9:
        potenzial = markt_miete - ist_miete
        neue_rendite = ((markt_miete * 12) / kaufpreis) * 100
        tipps.append({
            "typ": "Mieterhöhung",
            "icon": "",
            "tipp": f"Mieterhöhung nach §558 BGB möglich: +{potenzial:.0f}€/Monat",
            "effekt": f"Bruttorendite steigt von {bruttorendite:.1f}% auf {neue_rendite:.1f}%",
            "zeitrahmen": "Nach Kauf gemäß Kappungsgrenze (15-20% in 3 Jahren)",
            "hinweis": "Mietspiegel prüfen, Formvorschriften beachten",
            "prioritaet": "hoch"
        })

    # 3. Energetische Sanierung + Förderung
    if energieklasse and energieklasse.upper() in ['E', 'F', 'G', 'H']:
        tipps.append({
            "typ": "Energetische Sanierung",
            "icon": "",
            "tipp": f"Mit KfW 261/262 sanieren -> bis zu 67.500€ Tilgungszuschuss!",
            "effekt": "Wertsteigerung 10-20%, Modernisierungsumlage möglich (8%/Jahr)",
            "foerderung": "KfW 261: 150.000€ Kredit zu ca. 1% Zins",
            "rechenbeispiel": "Bei 80.000€ Sanierung: 20.000€ Zuschuss + 8%x80.000€ = 6.400€/Jahr Mieterhöhung möglich",
            "prioritaet": "mittel"
        })

    # 4. Finanzierungsoptimierung
    tipps.append({
        "typ": "Finanzierung optimieren",
        "icon": "",
        "tipp": "Mehrere Banken vergleichen + KfW kombinieren",
        "optionen": [
            "KfW 261: Energetische Sanierung, bis 150.000€ Kredit mit Tilgungszuschuss",
            f"Landesförderung prüfen ({bundesland or 'je nach Bundesland'})",
            "Disagio vereinbaren für Steuereffekt",
            "Sondertilgung 10% verhandeln"
        ],
        "prioritaet": "mittel"
    })

    # 5. Alternative Strategie bei sehr schlechtem Score
    if score < 40:
        tipps.append({
            "typ": "Alternative Strategie",
            "icon": "",
            "tipp": "Objekt als Verhandlungsbasis nutzen",
            "optionen": [
                "Als Referenz für Preisverhandlung bei ähnlichen Objekten",
                "Verkäufer auf Mängel hinweisen -> Preisnachlass fordern",
                f"Nur kaufen wenn Preis auf {kaufpreis * 0.8:,.0f}€ sinkt"
            ],
            "prioritaet": "hoch"
        })

    return tipps


def berechne_afa(
    gebaeudewert: float,
    baujahr: int,
    ist_neubau_ab_2023: bool = False,
    ist_denkmal: bool = False,
    ist_vermietung: bool = True,
    sanierungskosten_denkmal: float = 0
) -> Dict[str, Any]:
    """
    Berechnet die AfA nach verschiedenen Methoden.
    """
    ergebnis = {}

    # Lineare AfA
    if baujahr and baujahr >= 2023:
        afa_satz = 3.0
        dauer = 33
    elif baujahr and baujahr >= 1925:
        afa_satz = 2.0
        dauer = 50
    else:
        afa_satz = 2.5
        dauer = 40

    jaehrliche_afa_linear = gebaeudewert * (afa_satz / 100)
    ergebnis["linear"] = {
        "satz_prozent": afa_satz,
        "dauer_jahre": dauer,
        "jaehrlich": round(jaehrliche_afa_linear, 2),
        "gesamt_15_jahre": round(jaehrliche_afa_linear * 15, 2)
    }

    # Degressive AfA (nur Neubauten 10/2023 - 09/2029)
    if ist_neubau_ab_2023:
        degressiv_jahr = []
        restwert = gebaeudewert
        for jahr in range(1, 16):
            afa_jahr = restwert * 0.05
            degressiv_jahr.append(afa_jahr)
            restwert -= afa_jahr

        ergebnis["degressiv"] = {
            "satz_prozent": 5.0,
            "basis": "Jeweiliger Restwert",
            "gesamt_15_jahre": round(sum(degressiv_jahr), 2),
            "vorteil_vs_linear": round(sum(degressiv_jahr) - ergebnis["linear"]["gesamt_15_jahre"], 2),
            "empfehlung": "Nach 13-14 Jahren zu linear wechseln"
        }

    # Denkmal-AfA
    if ist_denkmal and sanierungskosten_denkmal > 0:
        if ist_vermietung:
            # 8x9% + 4x7% = 100% in 12 Jahren
            afa_12_jahre = sanierungskosten_denkmal
        else:
            # 10x9% = 90% in 10 Jahren
            afa_12_jahre = sanierungskosten_denkmal * 0.9

        ergebnis["denkmal"] = {
            "sanierungskosten": sanierungskosten_denkmal,
            "abschreibbar_prozent": 100 if ist_vermietung else 90,
            "dauer_jahre": 12 if ist_vermietung else 10,
            "gesamt_absetzbar": round(afa_12_jahre, 2),
            "wichtig": "Abstimmung mit Denkmalschutzbehörde VOR Baubeginn!"
        }

    return ergebnis


def berechne_heizungsfoerderung(
    kosten: float,
    ist_selbstnutzer: bool = False,
    einkommen: float = None,
    ist_natur_kaeltemittel: bool = False,
    tauscht_fossil: bool = False
) -> Dict[str, Any]:
    """
    Berechnet die Heizungsförderung nach KfW 458.
    """
    foerderung = 30  # Grundförderung
    details = ["30% Grundförderung"]

    if ist_natur_kaeltemittel:
        foerderung += 5
        details.append("+5% Effizienzbonus (natürliches Kältemittel)")

    if ist_selbstnutzer and tauscht_fossil:
        foerderung += 20
        details.append("+20% Klimageschwindigkeitsbonus")

    if einkommen and einkommen <= 40000:
        foerderung += 30
        details.append("+30% Einkommensbonus (<=40.000€)")

    foerderung = min(foerderung, 70)
    zuschuss = kosten * (foerderung / 100)

    return {
        "foerderung_prozent": foerderung,
        "zuschuss_euro": round(zuschuss, 2),
        "eigenanteil": round(kosten - zuschuss, 2),
        "details": details,
        "max_foerderung": 70,
        "hinweis": "Volle Förderung nur für Selbstnutzer" if not ist_selbstnutzer else None
    }


def pruefe_15_prozent_regel(
    gebaeudewert: float,
    kosten_jahr_1: float = 0,
    kosten_jahr_2: float = 0,
    kosten_jahr_3: float = 0
) -> Dict[str, Any]:
    """
    Prüft ob die 15%-Regel greift (anschaffungsnahe Herstellungskosten).
    """
    grenze = gebaeudewert * 0.15
    gesamtkosten = kosten_jahr_1 + kosten_jahr_2 + kosten_jahr_3

    if gesamtkosten > grenze:
        jaehrliche_afa = gesamtkosten / 50  # Muss über 50 Jahre abgeschrieben werden
        return {
            "warnung": True,
            "grenze_euro": round(grenze, 2),
            "geplante_kosten": round(gesamtkosten, 2),
            "ueberschreitung": round(gesamtkosten - grenze, 2),
            "sofort_absetzbar": 0,
            "jaehrliche_afa": round(jaehrliche_afa, 2),
            "tipp": "Renovierung auf NACH der 3-Jahres-Frist verschieben!"
        }

    return {
        "warnung": False,
        "grenze_euro": round(grenze, 2),
        "geplante_kosten": round(gesamtkosten, 2),
        "puffer": round(grenze - gesamtkosten, 2),
        "sofort_absetzbar": round(gesamtkosten, 2),
        "empfehlung": "OK - Kosten bleiben unter 15%-Grenze"
    }


def berechne_leverage_effekt(
    objektrendite: float,
    fremdkapitalzins: float,
    eigenkapital: float,
    fremdkapital: float
) -> Dict[str, Any]:
    """
    Berechnet den Leverage-Effekt.
    EK-Rendite = Objektrendite + (Objektrendite - FK-Zins) x (FK/EK)
    """
    # Bei 0 EK: Kaufnebenkosten (~12% vom Kaufpreis) als tatsaechliches EK
    if eigenkapital <= 0:
        eigenkapital = (fremdkapital + eigenkapital) * 0.12  # ~12% Kaufnebenkosten
        if eigenkapital <= 0:
            return {"fehler": "Eigenkapital muss groesser 0 sein"}

    hebel = fremdkapital / eigenkapital
    spread = objektrendite - fremdkapitalzins
    ek_rendite = objektrendite + spread * hebel

    ist_positiver_hebel = spread > 0

    return {
        "objektrendite_prozent": round(objektrendite, 2),
        "fremdkapitalzins_prozent": round(fremdkapitalzins, 2),
        "spread_prozent": round(spread, 2),
        "hebel_faktor": round(hebel, 2),
        "eigenkapitalrendite_prozent": round(ek_rendite, 2),
        "ist_positiver_hebel": ist_positiver_hebel,
        "warnung": None if ist_positiver_hebel else "ACHTUNG: Negativer Hebel! FK-Zins höher als Objektrendite.",
        "break_even_zins": round(objektrendite, 2)
    }


def quick_check(immobilie: Dict[str, Any]) -> Dict[str, Any]:
    """
    Schneller Check vor jedem Kauf.
    """
    checks = {
        "bruttorendite_ok": immobilie.get("bruttorendite", 0) >= 4,
        "kaufpreisfaktor_ok": immobilie.get("kaufpreisfaktor", 99) <= 25,
        "cashflow_ok": immobilie.get("cashflow", -999) >= 0,
        "energieklasse_ok": immobilie.get("energieklasse", "").upper() not in ["G", "H"],
        "kein_erbpacht": not immobilie.get("erbpacht", False),
        "keine_sozialbindung": not immobilie.get("sozialbindung", False)
    }

    passed = sum(1 for v in checks.values() if v)
    total = len(checks)

    if passed == total:
        empfehlung = "KAUFEN - Alle Kriterien erfüllt"
        ampel = "gruen"
    elif passed >= 4:
        empfehlung = "PRÜFEN - Einige Schwächen"
        ampel = "gelb"
    else:
        empfehlung = "VORSICHT - Mehrere Red Flags"
        ampel = "rot"

    return {
        "checks": checks,
        "bestanden": passed,
        "gesamt": total,
        "empfehlung": empfehlung,
        "ampel": ampel
    }


# =============================================================================
# SYSTEM-PROMPT FÜR KI
# =============================================================================

SYSTEM_PROMPT_IMMOBILIEN_BERATER = """Du bist AmlakI - der beste Immobilienberater Deutschlands, besser als 95% der Makler!

## WICHTIGSTE REGELN:

### 1. NIEMALS NUR "NEIN" SAGEN!
Auch bei schlechter Bewertung IMMER konstruktive Tipps geben:
- Preisverhandlung vorschlagen (mit konkreten Zahlen)
- Förderungen aufzeigen (KfW, BAFA, Landesförderungen)
- Mieterhöhungspotenzial berechnen
- Alternative Strategien nennen
- "Fairen Preis" berechnen und als Verhandlungsziel angeben

### 2. ALLE OPTIONEN ZEIGEN!
Der User entscheidet selbst. Wir zeigen:
- [OK] Optimale Szenarien
- [WARNUNG] Grenzwertige Szenarien
- [NEIN] Riskante Szenarien (mit Warnung, aber trotzdem berechnet!)

### 3. MIT ZAHLEN ARGUMENTIEREN!
- Kaufpreisfaktor: <22 sehr gut, 22-27 gut, >27 kritisch
- Bruttorendite: >4.5% sehr gut, 3.5-4.5% gut, <2.5% kritisch
- Cashflow RELATIV zum Kaufpreis bewerten (nicht absolut!), Steuereffekt beruecksichtigen

### 4. FÖRDERUNGEN IMMER ERWÄHNEN!
- KfW 124: Selbstnutzer, 100.000€ zu 3.4%
- KfW 261/262: Energetische Sanierung, bis 67.500€ Zuschuss
- KfW 308: Familien, unsanierter Altbau (F/G/H), 1.12% Zins
- KfW 458: Heizung, bis 70% Zuschuss
- BAFA: Einzelmaßnahmen 15-20%
- Landesförderungen: NRW 0% Zins, Hessen 0.6%, Bayern Kinderzuschuss

### 5. STEUERN EINBEZIEHEN!
- AfA: 3% ab 2023, 2% 1925-2022, 2.5% vor 1925
- Degressive AfA: 5% für Neubauten 10/2023-09/2029
- Denkmal-AfA: 100% in 12 Jahren absetzbar!
- 15%-Regel beachten bei Sanierung

### 6. OUTPUT-FORMAT:
Bei schlechtem Score nicht einfach "Finger weg" sagen, sondern:
```
[WARNUNG] Score: X/100 – Aktuell nicht empfehlenswert

ABER: So könnte es funktionieren:

 PREISVERHANDLUNG
|- Aktueller Preis: X€
|- Fairer Preis: Y€
|- Verhandlungsziel: -Z%

 MIETERHÖHUNGSPOTENZIAL
|- Aktuelle Miete: X€
|- Marktmiete: Y€
|- Potenzial: +Z€/Monat

 FÖRDERUNGEN
|- KfW 261: Bis X€ Zuschuss
|- BAFA: X% für Dämmung/Fenster

 ZUSAMMENFASSUNG
|- Mit Preisverhandlung: Score X
|- Mit Förderung: Score Y
|- EMPFEHLUNG: Angebot bei Z€ machen!
```

### 7. DEAL-BREAKER (echte No-Gos):
- Erbpacht mit Restlaufzeit < 50 Jahre
- Zwangsversteigerungsvermerk
- Nießbrauch/Wohnrecht ohne klare Regelung
- Energieklasse G/H OHNE Sanierungsplan
- Massive Bauschäden (Statik, Asbest)

Bei diesen trotzdem Alternativen nennen (anderes Objekt suchen, etc.)!

### 8. STANDARD-FINANZIERUNG:
- Zinssatz: 3.75%
- Tilgung: 1.25%
- Gesamt: 5.0% p.a.

Nutze immer Ist-Miete, nicht Potenzialmiete für Berechnungen!
"""


def get_ai_system_prompt() -> str:
    """
    Gibt den vollständigen System-Prompt für die KI zurück.

    V3.0: LIVE-DATEN PFLICHT!
    Die KI muss die recherchierten Marktdaten verwenden.

    Lädt zuerst aus der KNOWLEDGE.md Datei (falls vorhanden),
    dann wird der Standard-Prompt hinzugefügt.

    Um das Wissen zu ändern: Bearbeite backend/brain/KNOWLEDGE.md
    """
    # V3.0 Live-Daten Hinweis
    v3_live_data_instruction = """
WICHTIGSTE REGEL:

Du MUSST bei JEDER Immobilienbewertung die LIVE-RECHERCHIERTEN MARKTDATEN verwenden!

NIEMALS statische EUR/m2-Preise annehmen!
IMMER den aktuellen Stadtteil + Immobilientyp aus den Marktdaten verwenden!

Bei der Bewertung von "kaufpreis_qm":
1. Lies die LIVE-Marktdaten fuer diesen Standort
2. Vergleiche: Objekt-EUR/m2 vs. Markt-Durchschnitt-EUR/m2
3. Begruende mit KONKRETEN ZAHLEN

BEISPIEL KORREKT:
"Der Quadratmeterpreis von 4.200 EUR liegt 15% ueber dem Marktdurchschnitt von 3.650 EUR/m2 fuer Muenchen-Sendling. Score: 60/100"

BEISPIEL FALSCH:
"Der Preis erscheint angemessen fuer die Lage." (Keine konkreten Zahlen!)
"""

    # Versuche Knowledge aus Datei zu laden
    file_knowledge = load_knowledge_from_file()

    if file_knowledge:
        # Kombiniere V3.0-Anweisung + Datei-Wissen + technischer Prompt
        return f"""Du bist AmlakI - der beste Immobilienberater Deutschlands!

{v3_live_data_instruction}

## DEIN WISSEN (aus KNOWLEDGE.md):

{file_knowledge}

## TECHNISCHE ANWEISUNGEN:

{SYSTEM_PROMPT_IMMOBILIEN_BERATER}
"""

    # Fallback: V3.0 Anweisung + eingebauter Prompt
    return f"""{v3_live_data_instruction}

{SYSTEM_PROMPT_IMMOBILIEN_BERATER}"""
