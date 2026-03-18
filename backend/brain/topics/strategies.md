## TEIL 8: VERMIETUNG

### Mieterauswahl

**3x-Regel:** Nettoeinkommen >= 3x Kaltmiete

**Erforderliche Unterlagen:**
- SCHUFA-BonitätsCheck (29,95 EUR)
- Mietschuldenfreiheitsbescheinigung vom Vorvermieter
- Letzte 3 Gehaltsnachweise
- Personalausweis-Kopie
- Selbstauskunft (Arbeitgeber, Beschäftigungsdauer)

**Mietnomaden-Warnsignale:**
- Verweigerte Mietschuldenfreiheitsbescheinigung
- Barzahlung der Kaution gewünscht
- Ausweichende Antworten zum Wohnort
- Keine konkrete Jobbezeichnung
- Drängen auf schnellen Einzug

### Schönheitsreparaturen (aktuelle Rechtsprechung)

**Unwirksam:**
- Starre Fristen ("alle 3 Jahre Küche streichen")
- Bei unrenoviert übergebener Wohnung: Klausel meist komplett unwirksam

**Wirksam:**
- Flexible, bedarfsorientierte Formulierung
- "Während der Mietzeit bei Bedarf"

### Kleinreparaturklausel

**Wirksam bei:**
- Max. 100-120 EUR pro Einzelfall
- Max. 8% der Jahresnettokaltmiete insgesamt
- Nur für Gegenstände, die Mieter häufig bedient

---

## TEIL 9: EXIT-STRATEGIEN

### Steuerfreier Verkauf

- **Nach 10 Jahren:** Gewinn steuerfrei
- **Frist läuft ab:** Datum des notariellen Kaufvertrags
- **AfA wird NICHT zurückgezahlt!** -> Bleibt als Steuervorteil

### Schenkung (Freibeträge alle 10 Jahre)

| Empfänger | Freibetrag |
|-----------|------------|
| Ehepartner | 500.000 EUR |
| Kinder | 400.000 EUR |
| Enkel | 200.000 EUR |
| Andere | 20.000 EUR |

### Nießbrauch-Trick

**Effekt:** Mindert Schenkungswert erheblich

```javascript
function berechneNiessbrauchWert(jahresmiete, alter) {
  // Vervielfältiger nach Alter (vereinfacht)
  const vervielfaeltiger = {
    50: 18.9,
    55: 17.3,
    60: 14.0,
    65: 12.4,
    70: 10.8
  };

  return jahresmiete * vervielfaeltiger[alter];
}

// Beispiel: 60 Jahre alt, 29.000 EUR Jahresmiete
// Nießbrauchwert: 29.000 x 14 = 406.000 EUR
// -> 800.000 EUR-Immobilie kann unter Freibetrag 400.000 EUR verschenkt werden!
```

### Holding-Struktur (Share Deal)

- **Bei Verkauf der GmbH-Anteile** (statt Immobilie): 95% des Gewinns steuerfrei
- **Effektive Steuer:** Nur ca. 1,5% statt bis zu 45%

---

## TEIL 10: PROFI-STRATEGIEN

### BRRRR-Methode

**B**uy – Unter Marktwert kaufen (Ziel: 70% des After-Repair-Value)
**R**ehab – Sanieren und aufwerten
**R**ent – Vermieten für stabilen Cashflow
**R**efinance – Nach 6-12 Monaten refinanzieren (80% des neuen Wertes)
**R**epeat – Eigenkapital für nächste Immobilie nutzen

```javascript
// BRRRR Beispiel
const kauf = 150000;
const sanierung = 25000;
const investment = kauf + sanierung; // 175.000 EUR

const neuerWert = 230000;
const refinanzierung = neuerWert * 0.80; // 184.000 EUR

const rueckfluss = refinanzierung - investment; // 9.000 EUR + laufender Cashflow!
```

### Cashflow-Optimierung

**Möblierte Vermietung:**
- 10-30% höhere Miete
- Hamburger Modell: 2% des Möbel-Zeitwerts monatlich
- Kürzere Kündigungsfristen

**Garagen separat vermieten:**
- Nicht an Mietspiegel gebunden
- Freie Preisgestaltung
- Nur 3 Monate Kündigungsfrist
- Separat kündbar ohne Wohnungskündigung

**WG-Vermietung:**
- Oft 20-40% mehr Gesamtmiete
- Aber: Höherer Verwaltungsaufwand

### Kurzzeitvermietung (Airbnb) – VORSICHT!

**Regulierungen in Deutschland:**
| Stadt | Maximale Tage/Jahr | Genehmigung? | Bußgeld |
|-------|-------------------|--------------|---------|
| Berlin | 90 Tage | Ab 2 Monaten/Jahr | Bis 500.000 EUR |
| München | 8 Wochen | Ab 8 Wochen | Bis 500.000 EUR |
| Hamburg | 8 Wochen | Ab 8 Wochen | Bis 500.000 EUR |
| Köln | Keine Grenze | Immer nötig | Bis 50.000 EUR |
| Frankfurt | 8 Wochen | Ab 8 Wochen | Bis 500.000 EUR |

**Ab 2025/2026:** EU-weite Registrierungspflicht für alle Kurzzeitvermietungen!

**Empfehlung:** Für Kapitalanleger meist NICHT empfehlenswert wegen:
- Hohem Verwaltungsaufwand
- Rechtlichen Risiken
- Fehlender Planungssicherheit
