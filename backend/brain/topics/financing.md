## TEIL 3: FINANZIERUNG

### Finanzierungsarten

| Typ | Beschreibung | Vorteil | Für wen |
|-----|--------------|---------|---------|
| Annuität | Gleichbleibende Rate | Planungssicherheit | Standard |
| Volltilger | Am Ende schuldenfrei | 0,15-0,35% Zinsrabatt | Sicherheitsbewusste |
| Endfällig | Nur Zinsen, am Ende alles | Zinsen voll absetzbar | Kapitalanleger |
| Forward | Zinssicherung für später | Schutz vor Zinsanstieg | Anschlussfinanzierung |
| Variabel | Zins folgt Markt | Kurzfristig flexibel | Spezialsituationen |
| Cap | Variable mit Obergrenze | Zinsschutz mit Flexibilität | Risikofreudige |

### Aktuelle Bauzinsen (Januar 2026)

| Zinsbindung | Effektivzins |
|-------------|--------------|
| 5 Jahre | 3,1-3,4% |
| 10 Jahre | 3,3-3,8% |
| 15 Jahre | 3,5-4,0% |
| 20 Jahre | 3,8-4,2% |

### Beleihungsauslauf & Zinsaufschläge

| Beleihung | Zinsaufschlag |
|-----------|---------------|
| Bis 60% | Bestkonditionen |
| 60-80% | +0,1-0,2% |
| 80-100% | +0,2-0,4% |
| >100% | +0,4-0,8% |

### Finanzierungstricks der Profis

#### §489 BGB Sonderkündigungsrecht
- **Nach 10 Jahren ab Vollauszahlung:** Kündigung mit 6 Monaten Frist
- **OHNE Vorfälligkeitsentschädigung!**
- **Strategie:** 15+ Jahre Zinsbindung, nach 10 Jahren refinanzieren wenn günstiger

#### Bereitstellungszinsen verhandeln
- **Standard:** 0,25%/Monat nach 3 Monaten
- **Verhandelbar:** 12-18 Monate bereitstellungsfrei
- **Bei Neubau unbedingt verhandeln!**

#### Sondertilgung
- **Standard:** 5% p.a. (kostet ca. 0,1% Zinsaufschlag)
- **Besser:** 10% p.a. verhandeln
- **Effekt:** Senkt Vorfälligkeitsentschädigung erheblich

#### Disagio (Zinsvorauszahlung)
- **Sofort als Werbungskosten absetzbar**
- **Lohnt sich bei hohem Steuersatz**

### Haushaltsrechnung der Banken

```javascript
// So rechnen Banken
function pruefeBankHaushaltsrechnung(nettoEinkommen, mieteinnahmen, kreditraten) {
  // Mieteinnahmen nur zu 70-75% angerechnet
  const anrechenbareMiete = mieteinnahmen * 0.75;

  // Pauschalen (typisch)
  const lebenshaltung = 800; // Alleinstehend
  const proWeiteresPerson = 250;
  const autoKosten = 300; // Pro Fahrzeug

  const verfuegbar = nettoEinkommen + anrechenbareMiete - lebenshaltung;
  const kapitaldienstfaehigkeit = verfuegbar / kreditraten;

  return kapitaldienstfaehigkeit >= 1.0; // Muss positiv sein
}
```
