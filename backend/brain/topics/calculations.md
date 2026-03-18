## TEIL 4: RENDITEBERECHNUNG

### Alle Kennzahlen mit Formeln

```javascript
// 1. Bruttorendite (Schnellcheck)
const bruttorendite = (jahreskaltmiete / kaufpreis) * 100;
// Benchmark: >5% gut, 3-5% mittel, <3% kritisch

// 2. Kaufpreisfaktor
const kaufpreisfaktor = kaufpreis / jahreskaltmiete;
// Benchmark: <20 gut, 20-25 okay, >25 teuer, >30 kritisch

// 3. Nettomietrendite (aussagekräftiger)
const nettomietrendite = (jahreskaltmiete - nichtUmlagefaehigeKosten) / (kaufpreis + kaufnebenkosten) * 100;
// Benchmark: >3,5% gut

// 4. Objektrendite (vor Finanzierung)
const objektrendite = jahresreinertrag / gesamtinvestition * 100;

// 5. Eigenkapitalrendite (nach Leverage)
const eigenkapitalrendite = (jahresreinertrag - zinsen) / eigenkapital * 100;

// 6. Cashflow-Rendite
const cashflowRendite = (jaehrlichCashflow / eigenkapital) * 100;
```

### Leverage-Effekt Formel

```javascript
function berechneLeverage(objektrendite, fremdkapitalzins, fremdkapitalquote) {
  // EK-Rendite = Objektrendite + (Objektrendite - FK-Zins) x (FK/EK)
  const eigenkapitalquote = 1 - fremdkapitalquote;
  const hebel = fremdkapitalquote / eigenkapitalquote;

  const ekRendite = objektrendite + (objektrendite - fremdkapitalzins) * hebel;

  return ekRendite;
}

// Beispiel: 5% Objektrendite, 3% FK-Zins, 75% Fremdkapital
// EK-Rendite = 5% + (5% - 3%) x 3 = 11%

// ACHTUNG Negativer Hebel!
// Bei 3% Objektrendite, 4,5% FK-Zins:
// EK-Rendite = 3% + (3% - 4,5%) x 3 = -1,5%
```

### Break-Even-Zins

```javascript
// Der FK-Zins, ab dem der Hebel negativ wird
const breakEvenZins = nettomietrendite;
// Liegt der FK-Zins darüber -> negativer Cashflow!
```

### Sensitivitätsanalyse (Pflicht bei Profi-Beratung!)

**Jedes Investment muss auf Robustheit geprüft werden:**

```javascript
function sensitivitaetsanalyse(basisfall) {
  const szenarien = [];

  // Szenario 1: Miete -10%
  szenarien.push({
    name: 'Miete -10%',
    cashflow: berechneCashflow({...basisfall, miete: basisfall.miete * 0.9}),
    kritisch: false
  });

  // Szenario 2: Preis +10% (Verhandlung gescheitert)
  szenarien.push({
    name: 'Kaufpreis +10%',
    cashflow: berechneCashflow({...basisfall, kaufpreis: basisfall.kaufpreis * 1.1}),
    kritisch: false
  });

  // Szenario 3: Zins +2% (Anschlussfinanzierung)
  szenarien.push({
    name: 'Zins +2%',
    cashflow: berechneCashflow({...basisfall, zins: basisfall.zins + 0.02}),
    kritisch: true // Sehr relevant!
  });

  // Szenario 4: Leerstand 3 Monate
  szenarien.push({
    name: 'Leerstand 3 Monate',
    cashflow: berechneCashflow({...basisfall, leerstandMonate: 3}),
    kritisch: true
  });

  // Szenario 5: CapEx-Schock (neue Heizung)
  szenarien.push({
    name: 'Heizung defekt (25.000 EUR)',
    einmalkosten: 25000,
    jahreBisAmortisation: 25000 / (basisfall.cashflowJahr || 1)
  });

  // Worst Case: Alles zusammen
  szenarien.push({
    name: 'WORST CASE',
    cashflow: berechneCashflow({
      ...basisfall,
      miete: basisfall.miete * 0.9,
      zins: basisfall.zins + 0.02,
      leerstandMonate: 2
    }),
    kritisch: true
  });

  return szenarien;
}
```

**Bewertungsmatrix:**
| Worst-Case Cashflow | Bewertung |
|---------------------|-----------|
| > 0 EUR | Robust – Investment trägt sich auch unter Stress |
| -100 bis 0 EUR | Akzeptabel – Puffer erforderlich |
| < -100 EUR | Riskant – Nur mit hoher Liquiditätsreserve |
| < -300 EUR | Gefährlich – Investment gefährdet Gesamtfinanzen |

### Vollständige Cashflow-Berechnung

```javascript
function berechneMonatlichenCashflow(params) {
  const {
    kaltmiete,
    stellplatzMiete = 0,
    nebenkosten, // Vorauszahlung, durchlaufend
    kaufpreis,
    zinssatz,
    tilgungssatz,
    hausgeldGesamt,
    nichtUmlagefaehigerAnteil = 0.35, // Ca. 35% vom Hausgeld
    leerstandsReserve = 0.02, // 2%
    mietausfallReserve = 0.02, // 2%
  } = params;

  // Einnahmen
  const bruttoMiete = kaltmiete + stellplatzMiete;

  // Ausgaben
  const kreditrate = (kaufpreis * (zinssatz + tilgungssatz)) / 12;
  const nichtUmlagefaehigeNK = hausgeldGesamt * nichtUmlagefaehigerAnteil;
  const leerstand = bruttoMiete * leerstandsReserve;
  const mietausfall = bruttoMiete * mietausfallReserve;

  const cashflow = bruttoMiete - kreditrate - nichtUmlagefaehigeNK - leerstand - mietausfall;

  return {
    einnahmen: bruttoMiete,
    kreditrate,
    nichtUmlagefaehigeNK,
    reserven: leerstand + mietausfall,
    cashflow,
    cashflowJahr: cashflow * 12
  };
}
```
