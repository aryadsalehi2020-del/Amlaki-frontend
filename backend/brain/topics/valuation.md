## TEIL 0.5: IMMOBILIENBEWERTUNG (DE-STANDARD)

### Verkehrswert vs. Marktpreis

| Begriff | Definition | Relevanz |
|---------|------------|----------|
| **Verkehrswert** | Objektiv ermittelter Wert nach ImmoWertV | Gutachten, Finanzierung, Erbschaft |
| **Marktpreis** | Tatsächlich geforderter/gezahlter Preis | Kann abweichen (Emotion, Zeitdruck, Knappheit) |

**Regel:** Abweichungen zwischen Verkehrswert und Marktpreis immer begründen!

### Die drei Bewertungsverfahren

#### 1. Vergleichswertverfahren
- **Für:** ETW, EFH in homogenen Märkten, Standardobjekte
- **Basis:** Reale Kaufpreise vergleichbarer Objekte + Anpassungen
- **Risiko:** Angebotsdaten ≠ Kaufpreise; Unikate schwer vergleichbar

```javascript
function vergleichswert(vergleichspreise, anpassungen) {
  // Durchschnitt der Vergleichspreise mit Anpassungsfaktoren
  const basiswert = vergleichspreise.reduce((a, b) => a + b) / vergleichspreise.length;
  return basiswert * (1 + anpassungen.lage + anpassungen.zustand + anpassungen.ausstattung);
}
```

#### 2. Ertragswertverfahren (für Kapitalanleger!)
- **Für:** Renditeobjekte (vermietetes Wohnen, MFH, Gewerbe)
- **Basis:** Nachhaltiger Ertrag, Bewirtschaftungskosten, Liegenschaftszins

```javascript
function ertragswert(jahresreinertrag, liegenschaftszins, restnutzungsdauer, bodenwert) {
  // Vereinfachte Formel
  const vervielfaeltiger = (1 - Math.pow(1 + liegenschaftszins, -restnutzungsdauer)) / liegenschaftszins;
  const ertragswertGebaeude = jahresreinertrag * vervielfaeltiger;
  return ertragswertGebaeude + bodenwert;
}

// Beispiel: 24.000 Reinertrag, 5% Liegenschaftszins, 50 Jahre RND, 100.000 Boden
// -> Ertragswert ca. 537.000
```

**Regel:** Ertragswert NIEMALS auf Wunschmieten stützen – Mietrecht begrenzt Upside!

#### 3. Sachwertverfahren
- **Für:** Eigennutzer, Spezialimmobilien, wenig Vergleichsdaten
- **Basis:** Bodenwert + Herstellungskosten - Alterswertminderung

```javascript
function sachwert(bodenwert, herstellungskosten, alter, gesamtnutzungsdauer, marktanpassungsfaktor) {
  const alterswertminderung = Math.min(alter / gesamtnutzungsdauer, 0.7); // Max 70%
  const zeitwertGebaeude = herstellungskosten * (1 - alterswertminderung);
  return (bodenwert + zeitwertGebaeude) * marktanpassungsfaktor;
}
```

**Risiko:** Ohne Marktanpassungsfaktor kann das Ergebnis am Markt vorbeizielen!
