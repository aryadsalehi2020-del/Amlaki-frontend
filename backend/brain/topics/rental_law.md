## TEIL 5: MIETRECHT

### Mieterhöhung §558 BGB (Vergleichsmiete)

- **Kappungsgrenze:** Max. 20% in 3 Jahren (in 627 Gemeinden nur 15%!)
- **Bis zur:** Ortsüblichen Vergleichsmiete
- **Sperrfrist:** 12 Monate zwischen Erhöhungen
- **Begründung durch:** Mietspiegel, 3 Vergleichswohnungen oder Gutachten

### Modernisierungsumlage §559 BGB

- **Umlage:** 8% der Modernisierungskosten pro Jahr dauerhaft
- **Kappung:** Max. 2 EUR/m² (bei Miete <7 EUR) bzw. 3 EUR/m² in 6 Jahren
- **Nur echte Modernisierung!** Nicht: Instandhaltung

```javascript
function berechneModernisierungsumlage(kosten, wohnflaeche, aktuelleKaltmiete) {
  const monatlicheUmlage = (kosten * 0.08) / 12;
  const proQm = monatlicheUmlage / wohnflaeche;

  // Kappungsgrenze
  const maxErhoeung = aktuelleKaltmiete < 7 ? 2 : 3; // EUR/m² in 6 Jahren
  const maxMonatlich = (maxErhoeung * wohnflaeche) / 72; // 72 Monate = 6 Jahre

  return Math.min(monatlicheUmlage, maxMonatlich);
}
```

### Mietpreisbremse

- **Verlängert bis:** 31.12.2029
- **Gilt in:** 410 Gemeinden
- **Regel:** Max. 10% über ortsüblicher Vergleichsmiete bei Neuvermietung

**Ausnahmen:**
- Neubauten ab 01.10.2014
- Umfassende Modernisierung (>1/3 Neubaukosten)
- Vormiete war höher

### Kündigung wegen Eigenbedarf

**Kündigungsfristen nach Mietdauer:**
| Mietdauer | Kündigungsfrist |
|-----------|-----------------|
| Bis 5 Jahre | 3 Monate |
| 5-8 Jahre | 6 Monate |
| Über 8 Jahre | 9 Monate |

**Formvorschriften (streng!):**
- Schriftform (keine E-Mail!)
- Begründung im Kündigungsschreiben
- Hinweis auf Widerspruchsrecht

**Kündigungssperrfrist bei ETW-Umwandlung:** 3-10 Jahre (je nach Bundesland)

### Nebenkostenabrechnung

**Umlagefähig (vollständige Liste):**
- Grundsteuer
- Wasserversorgung & Entwässerung
- Heizung & Warmwasser
- Aufzug
- Straßenreinigung & Müllabfuhr
- Gebäudereinigung
- Gartenpflege
- Beleuchtung (Gemeinschaftsflächen)
- Schornsteinfeger
- Versicherungen (Gebäude, Haftpflicht)
- Hauswart
- Gemeinschaftsantenne/Breitband
- Wäschepflege (Gemeinschaftswaschküche)

**NICHT umlagefähig:**
- Hausverwaltung
- Instandhaltungsrücklage
- Reparaturen
- Bankgebühren

**Fristen:** 12 Monate nach Abrechnungszeitraum!

### WEG-Recht (seit Reform 2020)

**Wichtige Änderungen:**
- Bauliche Veränderungen: Nur noch einfache Mehrheit statt Allstimmigkeit
- Privilegierte Maßnahmen (Barrierefreiheit, E-Ladestationen, Einbruchschutz, Glasfaser): Kann jeder Eigentümer auf eigene Kosten verlangen
- Verwalterzertifizierung: Seit Juni 2024 Pflicht

### GEG-Pflichten (Heizungsgesetz)

**Ab 01.01.2024:** Neue Heizungen müssen 65% erneuerbare Energien nutzen

**Übergangsfristen:**
- Großstädte (>100.000 EW): Ab 30.06.2026 (nach Wärmeplanung)
- Alle anderen: Ab 30.06.2028

**Bei Eigentümerwechsel:** 2-Jahres-Frist für Nachrüstpflichten (Dämmung oberste Geschossdecke, Heizungsleitungen)
