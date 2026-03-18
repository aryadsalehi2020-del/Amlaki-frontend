## TEIL 6: DUE DILIGENCE

### WEG Due Diligence (Eigentumswohnung) – PFLICHTUNTERLAGEN

**Ohne diese Dokumente: HOHES RISIKO!**

| Dokument | Warum wichtig | Red Flag wenn... |
|----------|---------------|------------------|
| Teilungserklärung + GO | Rechte & Pflichten, Sondereigentum | Unklare Abgrenzungen |
| ETV-Protokolle (3 Jahre) | Streit, Beschlüsse, Probleme | Dauerstreit, Anfechtungen |
| Wirtschaftsplan (aktuell) | Geplante Kosten | Hohe Sonderumlagen geplant |
| Jahresabrechnung (letzte) | Tatsächliche Kosten | Hohe Nachzahlungen |
| Erhaltungsrücklage | Finanzpolster der WEG | < 20 EUR/m² bei Altbau |
| Hausgeld-Aufschlüsselung | Umlagefähig vs. nicht | > 40% nicht umlagefähig |
| Sanierungsplanung | Anstehende Maßnahmen | Dach/Fassade/Heizung geplant |

### WEG-Kernrisiken

```javascript
function bewerteWEGRisiko(weg) {
  let risiko = 0;
  const gruende = [];

  // Rücklage zu niedrig
  const ruecklageProQm = weg.erhaltungsruecklage / weg.gesamtflaeche;
  if (ruecklageProQm < 15) {
    risiko += 30;
    gruende.push(`Rücklage nur ${ruecklageProQm.toFixed(0)} EUR/m² (sollte >20 EUR sein)`);
  }

  // Gebäudealter vs. letzte Sanierung
  const jahreSeitSanierung = 2026 - (weg.letzteSanierung || weg.baujahr);
  if (jahreSeitSanierung > 30 && !weg.kernsaniert) {
    risiko += 25;
    gruende.push(`${jahreSeitSanierung} Jahre seit letzter Sanierung – Sonderumlage wahrscheinlich`);
  }

  // Mehrheitseigentümer
  if (weg.groessterEigentuemer > 0.5) {
    risiko += 20;
    gruende.push('Mehrheitseigentümer dominiert Beschlüsse – Governance-Risiko');
  }

  // Streit/Anfechtungen
  if (weg.anfechtungenLetzte3Jahre > 0) {
    risiko += 15;
    gruende.push('Beschlussanfechtungen in letzten 3 Jahren – Konfliktpotenzial');
  }

  // Verwaltung
  if (!weg.verwalterZertifiziert) {
    risiko += 10;
    gruende.push('Verwalter nicht zertifiziert (seit 06/2024 Pflicht)');
  }

  return {
    risikoScore: Math.min(risiko, 100),
    gruende,
    empfehlung: risiko > 50 ? 'VORSICHT' : risiko > 25 ? 'PRÜFEN' : 'OK'
  };
}
```

### Technische Prüfung mit Kostenrahmen

| Gewerk | Lebensdauer | Sanierungskosten EFH | Red Flags |
|--------|-------------|---------------------|-----------|
| Dach (Ziegel) | 50-80 J. | 39.000-60.000 EUR | Moos, durchgebogene Sparren |
| Fassade/WDVS | 30-50 J. | 15.000-40.000 EUR | Risse, Algenbefall |
| Fenster (3-fach) | 30-40 J. | 8.000-18.000 EUR | Kondensation, Zugluft |
| Heizung (WP) | 15-20 J. | 15.000-40.000 EUR | Ölheizung, Kessel >30 J. |
| Elektrik | 30-40 J. | 12.000-18.000 EUR | Schmelzsicherungen, Stoffkabel |
| Sanitär | 30-50 J. | 10.000-20.000 EUR | Bleirohre! (Pflicht bis 01/2026) |

**Kritische Red Flags:**
- Bleirohre: Austauschpflicht bis 12.01.2026!
- Risse über 2mm: Statikproblem
- Feuchter Keller ohne Horizontalsperre
- Asbest in Fassadendämmung (Baujahr 1960-1990)
- Konstanttemperaturkessel über 30 Jahre

### Grundbuch-Analyse

**Abteilung I:** Eigentümer
**Abteilung II (KRITISCH!):**
- Wegerechte
- Nießbrauch -> Wertminderung 30-70%!
- Wohnrecht -> Wertminderung 30-70%!
- Zwangsversteigerungsvermerk -> FINGER WEG!

**Abteilung III:** Grundschulden (müssen vor Verkauf gelöscht werden)

**Baulastenverzeichnis:** Separat beim Bauordnungsamt anfordern (20-50 EUR)

### Energetische Bewertung

| Effizienzklasse | kWh/m²a | Bewertung | Jung kauft Alt? |
|-----------------|---------|-----------|-----------------|
| A+ | <30 | Passivhaus | Nein |
| A-B | 30-75 | Neubau-Standard | Nein |
| C-D | 75-130 | Durchschnitt | Nein |
| E-F | 130-200 | Sanierungsbedarf | F: Ja |
| G-H | >200 | Dringend sanieren | Ja |

**Preisunterschied:** Klasse A/A+ ist ca. 650 EUR/m² mehr wert als D/E!

---

## TEIL 7: VERSICHERUNGEN

| Versicherung | Pflicht? | Umlagefähig? | Kosten/Jahr | Deckung |
|--------------|----------|--------------|-------------|---------|
| Wohngebäude | Ja* | Ja | 200-800 EUR | Feuer, Wasser, Sturm |
| Grundbesitzerhaftpflicht | Nein** | Ja | 30-150 EUR | Personenschäden |
| Elementar | Empfohlen | Ja | 50-300 EUR | Hochwasser, Erdbeben |
| Mietausfall | Optional | Nein | 60-400 EUR | Mietausfall 6-24 Mon. |
| Vermieterrechtsschutz | Optional | Nein | 100-200 EUR | Räumungsklagen |
| Gewässerschaden | Bei Öltank | Ja | 30-100 EUR | Grundwasserschaden |

*Bei Finanzierung von Bank gefordert
**Aber essentiell!

**Tipp:** Gleitender Neuwert vereinbaren (Baupreisindex 2026: 27,63)

---

## ANHANG: CHECKLISTEN

### Due-Diligence-Checkliste (vor Kauf)

**Dokumente einfordern:**
- [ ] Grundbuchauszug (nicht älter als 3 Monate)
- [ ] Flurkarte/Lageplan
- [ ] Energieausweis (Verbrauch oder Bedarf)
- [ ] Baugenehmigung + Nutzungsänderungen
- [ ] Teilungserklärung (bei ETW)
- [ ] Wirtschaftsplan + Hausgeldabrechnung (3 Jahre)
- [ ] WEG-Protokolle (3 Jahre)
- [ ] Mietvertrag + Mieterhistorie
- [ ] Nebenkostenabrechnungen

**Vor Ort prüfen:**
- [ ] Dach (Ziegel, Dachrinne, Gauben)
- [ ] Fassade (Risse, Putz, Dämmung)
- [ ] Keller (Feuchtigkeit, Geruch)
- [ ] Heizung (Alter, Typ, Wartungsprotokolle)
- [ ] Fenster (Dichtungen, Verglasung)
- [ ] Elektrik (Sicherungskasten, Leitungen)
- [ ] Sanitär (Wasserdruck, Rohre)
- [ ] Umgebung (Lärm, Nachbarn, Infrastruktur)

**Behörden kontaktieren:**
- [ ] Bauamt (Baulastenverzeichnis)
- [ ] Katasteramt (Flächenangaben)
- [ ] Gutachterausschuss (Bodenrichtwerte)

### Finanzierungscheckliste

- [ ] Eigenkapital für Nebenkosten vorhanden?
- [ ] Haushaltsrechnung positiv bei Ausfall?
- [ ] KfW-Förderung geprüft?
- [ ] Landesförderung geprüft?
- [ ] Mindestens 3 Bankangebote verglichen?
- [ ] Sondertilgung vereinbart?
- [ ] Bereitstellungsfreie Zeit verhandelt?
- [ ] Zinsbindung gewählt (min. 10 Jahre)?

### Vermietungscheckliste

- [ ] Mietspiegel geprüft?
- [ ] Mietpreisbremse relevant?
- [ ] Selbstauskunft erhalten?
- [ ] SCHUFA geprüft?
- [ ] Mietschuldenfreiheitsbescheinigung?
- [ ] 3 Gehaltsnachweise?
- [ ] Mietvertrag erstellt?
- [ ] Kaution korrekt (max. 3 Kaltmieten)?
- [ ] Übergabeprotokoll vorbereitet?
