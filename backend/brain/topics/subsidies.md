## TEIL 1: STAATLICHE FOERDERUNGEN & ZUSCHUESSE (Stand 2026)

### KfW-Foerderprogramme Uebersicht

#### KfW 124 Wohneigentumsprogramm
- **Kredit:** Bis zu 100.000 EUR
- **Zins:** Ca. 3,4% effektiv
- **Zinsbindung:** 5-10 Jahre
- **Für:** Selbstgenutzte Immobilien (Kauf oder Bau)
- **WICHTIG:** Antrag ZWINGEND vor Kaufvertrag über Hausbank!
- **Tilgungsfreie Anlaufjahre möglich**

#### KfW 261/262 BEG Wohngebäude (Energetische Sanierung)
- **Kredit:** Bis 150.000 EUR pro Wohneinheit
- **Tilgungszuschüsse:** 5-45% je nach Effizienzhaus-Stufe

| Effizienzhaus-Stufe | Tilgungszuschuss | Maximalbetrag |
|---------------------|------------------|---------------|
| EH 40 | 20% | 24.000 EUR |
| EH 40 EE/NH | 25% | 37.500 EUR |
| EH 55 | 15% | 18.000 EUR |
| EH 55 EE/NH | 17,5% | 26.250 EUR |
| EH 70 EE/NH | 15% | 22.500 EUR |
| EH 85/85 EE | 10% | 15.000 EUR |

**Maximaler Zuschuss mit allen Boni (EH 40 EE + WPB + Serielle Sanierung): 67.500 EUR!**

#### KfW 297/298 Klimafreundlicher Neubau
- **Kredit:** 100.000 EUR (EH 55) bis 150.000 EUR (mit QNG-Zertifikat)
- **Zins:** Ca. 1,13% effektiv (Dezember 2025)
- **Dezember 2025:** EH 55 wieder förderfähig!
- **Für:** Neubau als Effizienzhaus

#### KfW 308 "Jung kauft Alt"
- **Für:** Familien mit Kindern, die unsanierte Bestandsimmobilien (Klasse F, G, H) kaufen
- **Kredit:** Bis 150.000 EUR (bei 3+ Kindern)
- **Zins:** Ca. 1,12% effektiv
- **Einkommensgrenzen:** 90.000 EUR bei 1 Kind, +10.000 EUR je weiteres Kind
- **Sanierungspflicht:** EH 85 EE innerhalb 54 Monaten
- **Nur für SELBSTNUTZER, nicht für Kapitalanleger!**

#### KfW 458 Heizungsförderung (seit 2024)
- **30% Grundförderung** für alle klimafreundlichen Heizungen
- **+5% Effizienzbonus:** Wärmepumpe mit natürlichem Kältemittel oder Erdwärme
- **+20% Klimageschwindigkeitsbonus:** Austausch fossiler Heizung (nur Selbstnutzer)
- **+30% Einkommensbonus:** Haushaltseinkommen <=40.000 EUR
- **Maximale Gesamtförderung: 70%**

```javascript
// Heizungsförderung berechnen
function berechneHeizungsfoerderung(kosten, istSelbstnutzer, einkommen, istNaturKaeltemittel) {
  let foerderung = 0.30; // Grundförderung

  if (istNaturKaeltemittel) foerderung += 0.05; // Effizienzbonus
  if (istSelbstnutzer) foerderung += 0.20; // Klimabonus
  if (einkommen <= 40000) foerderung += 0.30; // Einkommensbonus

  foerderung = Math.min(foerderung, 0.70); // Max 70%

  return kosten * foerderung;
}

// Beispiel: Wärmepumpe 28.000 EUR, Selbstnutzer, geringes Einkommen
// -> 28.000 x 70% = 19.600 EUR Zuschuss!
```

#### KfW 159 Altersgerecht Umbauen
- **Kredit:** Bis 50.000 EUR
- **Für:** Barrierereduzierung, Einbruchschutz
- **Auch für Vermieter interessant**

#### KfW 270 Erneuerbare Energien
- **Für:** PV-Anlagen, Batteriespeicher
- **Kredit:** Zinsgünstig, variabel

### BAFA-Förderungen (Einzelmaßnahmen)

- **Dämmung, Fenster, Sonnenschutz:** 15% Förderung
- **Mit iSFP-Bonus:** 20% Förderung + Verdopplung der förderfähigen Kosten!

```javascript
// iSFP-Bonus Berechnung
const foerderfaehigeKosten = 30000; // Standard
const mitISFP = 60000; // Mit individuellem Sanierungsfahrplan verdoppelt!

const zuschussOhne = foerderfaehigeKosten * 0.15; // 4.500 EUR
const zuschussMit = mitISFP * 0.20; // 12.000 EUR = 2,67x mehr!
```

### Landesförderungen

#### NRW (NRW.BANK) – Das großzügigste Programm!
- **Grunddarlehen:** Bis 184.000 EUR zu **0,0% Zinsen für 30 Jahre**
- **Familienbonus:** +24.000 EUR pro Kind
- **Tilgungsnachlass:** 10% (muss nicht zurückgezahlt werden!)
- **Einkommensgrenze:** Ca. 69.000 EUR Brutto (4 Personen)

```javascript
// NRW Förderung Familie mit 2 Kindern
const grunddarlehen = 184000;
const kinderbonus = 2 * 24000; // 48.000 EUR
const gesamtdarlehen = grunddarlehen + kinderbonus; // 232.000 EUR
const tilgungsnachlass = gesamtdarlehen * 0.10; // 23.200 EUR geschenkt!
```

#### Hessen (WI-Bank)
- **Hessen-Darlehen:** Bis 200.000 EUR
- **Zins:** 0,60% Sollzins
- **Zinsbindung:** 20 Jahre
- **Vorteil:** Nachrangige Grundbucheintragung -> bessere Konditionen bei Hausbank

#### Bayern (BayernLabo)
- **Kinderzuschuss:** 7.500 EUR pro Kind (einmalig!)
- **Darlehen:** 30-40% der förderfähigen Kosten
- **Einkommensgrenzen:** 2023 um 25% erhöht

#### Baden-Württemberg (L-Bank)
- **Z15-Darlehen:** Bis 100.000 EUR
- **Zinsverbilligung:** 10 Jahre
- **Seit Dezember 2025:** Digitale Antragstellung möglich

### Wohn-Riester

- **Grundzulage:** 175 EUR/Jahr
- **Kinderzulage:** 300 EUR/Kind (geboren ab 2008), 185 EUR/Kind (davor)
- **Eigenbeitrag:** 4% des Vorjahreseinkommens, max. 2.100 EUR
- **Wohnförderkonto:** Wird mit 2% p.a. verzinst, bei Rente versteuert
- **Lohnt sich für:** Familien mit Kindern, Geringverdiener mit hohem Zulagen-Anteil
