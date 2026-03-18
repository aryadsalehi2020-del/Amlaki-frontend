## TEIL 2: STEUEROPTIMIERUNG

### AfA-Systematik (Abschreibung für Abnutzung)

#### Lineare AfA
| Baujahr | AfA-Satz | Abschreibungsdauer | Bemessungsgrundlage |
|---------|----------|--------------------|--------------------|
| Ab 2023 | 3% | 33 Jahre | Nur Gebäudewert (ohne Grundstück!) |
| 1925-2022 | 2% | 50 Jahre | Nur Gebäudewert |
| Vor 1925 | 2,5% | 40 Jahre | Nur Gebäudewert |

#### Degressive AfA (Neu seit 2024!)
- **Gilt für:** Neubauten zwischen Oktober 2023 und September 2029
- **Satz:** 5% vom jeweiligen Restwert
- **Vorteil:** Höhere Abschreibung in den ersten Jahren

```javascript
// Vergleich Linear vs. Degressiv bei 1.000.000 EUR Gebäudewert
function vergleicheAfA(gebaeudewert, jahre) {
  let linearGesamt = 0;
  let degressivGesamt = 0;
  let degressivRestwert = gebaeudewert;

  for (let i = 0; i < jahre; i++) {
    // Linear: Konstant 3%
    linearGesamt += gebaeudewert * 0.03;

    // Degressiv: 5% vom Restwert
    const degressivJahr = degressivRestwert * 0.05;
    degressivGesamt += degressivJahr;
    degressivRestwert -= degressivJahr;
  }

  return { linearGesamt, degressivGesamt };
}

// Nach 5 Jahren bei 1 Mio EUR:
// Linear: 150.000 EUR (5 x 30.000 EUR)
// Degressiv: 226.000 EUR -> 50% mehr Abschreibung!
```

**Empfehlung:** Nach ca. 13-14 Jahren zur linearen AfA wechseln (einmaliger Wechsel erlaubt).

#### Sonder-AfA nach §7b EStG
- **Zusätzliche AfA:** 5% für 4 Jahre (= 20% extra)
- **Voraussetzungen:**
  - Baukosten max. 5.200 EUR/m²
  - Effizienzhaus 40 mit QNG-Zertifikat
  - Mindestens 10 Jahre Vermietung
- **Kombinierbar mit degressiver AfA!**

```javascript
// Maximale AfA in ersten 4 Jahren (Neubau ab 2023)
// Degressiv + Sonder-AfA:
// Jahr 1: 5% + 5% = 10%
// Jahr 2: 5% + 5% = 10%
// Jahr 3: 5% + 5% = 10%
// Jahr 4: 5% + 5% = 10%
// -> 36% in 4 Jahren abgeschrieben!
```

#### Denkmal-AfA (§7h, §7i EStG) – DER Steuertrick!
- **Vermietung:** 100% der Sanierungskosten in 12 Jahren (8x9% + 4x7%)
- **Selbstnutzung:** 90% der Sanierungskosten in 10 Jahren (10x9%)
- **WICHTIG:** Abstimmung mit Denkmalschutzbehörde VOR Baubeginn!

```javascript
// Denkmal-AfA Beispiel
const sanierungskosten = 500000;
const grenzsteuersatz = 0.42;

// Steuerersparnis über 12 Jahre bei Vermietung:
const steuerersparnis = sanierungskosten * grenzsteuersatz; // 210.000 EUR!
```

#### Verkürzte Restnutzungsdauer (Profi-Trick!)
- **Statt pauschal 50 Jahre:** Gutachten für 15-25 Jahre Restnutzungsdauer
- **Effekt:** AfA-Satz steigt auf 4-6,7%!
- **Gutachten kostet:** 900-1.500 EUR (selbst absetzbar)
- **Anerkennungsquote:** >97%
- **Lohnt sich bei:** Altbauten mit Sanierungsstau

### Absetzbare Kosten (vollständige Liste)

**Sofort absetzbar:**
- Schuldzinsen (größter Posten!)
- Disagio (Zinsvorauszahlung)
- Bereitstellungszinsen
- Hausverwaltung
- Instandhaltung/Reparaturen (nicht anschaffungsnah!)
- Fahrtkosten zur Immobilie (0,30 EUR/km)
- Telefon/Porto (anteilig)
- Büromaterial
- Kontoführungsgebühren
- Steuerberater (Anlage V-Anteil)
- Mitgliedsbeiträge (Haus & Grund)
- Mahnkosten
- Räumungskosten
- Mietausfälle (als Werbungskosten)
- Maklerkosten bei Neuvermietung

**Über AfA abzuschreiben:**
- Anschaffungskosten Gebäude
- Kaufnebenkosten (Notar, Grundbuch, Grunderwerbsteuer, Makler beim KAUF)
- Anschaffungsnahe Herstellungskosten (15%-Regel!)

### 15%-Regel (Anschaffungsnahe Herstellungskosten)

**Definition:** Übersteigen Instandsetzungskosten innerhalb von **3 Jahren nach Kauf 15% des Gebäudewertes**, werden ALLE diese Kosten zu Herstellungskosten.

```javascript
function pruefeAnschaffungsnaheKosten(gebaeudewert, kostenJahr1, kostenJahr2, kostenJahr3) {
  const grenze = gebaeudewert * 0.15;
  const gesamtkosten = kostenJahr1 + kostenJahr2 + kostenJahr3;

  if (gesamtkosten > grenze) {
    // Alle Kosten müssen über 50 Jahre abgeschrieben werden!
    const jaehrlicheAfA = gesamtkosten / 50;
    return {
      warnung: true,
      grenze: grenze,
      istKosten: gesamtkosten,
      sofortAbsetzbar: 0,
      jaehrlicheAfA: jaehrlicheAfA
    };
  }

  return {
    warnung: false,
    sofortAbsetzbar: gesamtkosten
  };
}

// Beispiel: 240.000 EUR Gebäudewert
// Grenze: 36.000 EUR in 3 Jahren
// Bei 45.000 EUR Renovierung -> nur 900 EUR/Jahr statt 45.000 EUR sofort!
```

**Gestaltungstipps:**
1. Renovierung auf NACH der 3-Jahres-Frist verschieben
2. Eigenleistung: Nur Materialkosten zählen
3. Kosten auf 3 Jahre verteilen, jedes Jahr unter 15%/3 = 5% bleiben

### Spekulationssteuer

- **Frist:** 10 Jahre ab notariellem Kaufvertrag
- **Steuersatz:** Persönlicher Einkommensteuersatz (bis 45%)
- **Ausnahme Eigennutzung:** Steuerfrei, wenn im Verkaufsjahr + 2 vorangegangenen Kalenderjahren selbst bewohnt

```javascript
function berechneSpekuSteuer(kaufdatum, verkaufsdatum, gewinn, steuersatz) {
  const jahreDifferenz = (verkaufsdatum - kaufdatum) / (365 * 24 * 60 * 60 * 1000);

  if (jahreDifferenz > 10) {
    return 0; // Steuerfrei!
  }

  return gewinn * steuersatz;
}
```

### Drei-Objekt-Grenze

**Gefahr gewerblicher Grundstückshandel:**
- Mehr als 3 Objekte innerhalb von 5 Jahren verkauft
- Folge: Einkommensteuer + Gewerbesteuer auf ALLE Verkäufe (rückwirkend!)
- Jede Wohnung zählt einzeln

### Vermietung an Angehörige

- **66%-Regel:** Miete mindestens 66% der ortsüblichen Vergleichsmiete
- **Effekt:** 100% Werbungskostenabzug
- **Voraussetzungen:**
  - Schriftlicher Mietvertrag
  - Regelmäßige Überweisungen
  - Kaution wie bei Fremden

### Immobilien-GmbH (Vermögensverwaltend)

| Merkmal | Privatperson | VV-GmbH |
|---------|--------------|---------|
| Steuersatz | Bis 45% | 15,825% |
| 10-Jahres-Frist | Ja, steuerfrei | Nein |
| Gewerbesteuer | Nein | Mit erweiterter Kürzung: Nein |
| Laufende Kosten | Gering | Buchhaltung, Jahresabschluss |

**Lohnt sich ab:** 500.000-1.000.000 EUR Immobilienvermögen bei hohem Steuersatz
