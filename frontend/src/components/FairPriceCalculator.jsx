import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';

function FairPriceCalculator({ analysisData }) {
  const { token } = useAuth();
  const [values, setValues] = useState({
    kaufpreis: analysisData?.kaufpreis || 300000,
    kaltmiete: analysisData?.kaltmiete || 950,
    hausgeld: analysisData?.hausgeld || 280,
    wohnflaeche: analysisData?.wohnflaeche || 75,
    vergleichspreisProQm: analysisData?.vergleichspreisProQm || 3500,
    zielRendite: 4.5,
    zielFaktor: 22,
    zinssatz: 3.8,
    tilgungssatz: 1.5
  });
  const [stadtInput, setStadtInput] = useState('');
  const [isLoadingMarkt, setIsLoadingMarkt] = useState(false);
  const [marktdatenInfo, setMarktdatenInfo] = useState(null);

  const fetchLiveMarktdaten = async () => {
    if (!stadtInput.trim()) return;
    setIsLoadingMarkt(true);
    try {
      const response = await fetch(`${API_BASE}/search-market-data?stadt=${encodeURIComponent(stadtInput)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.kaufpreis_qm_durchschnitt) {
          setValues(v => ({ ...v, vergleichspreisProQm: Math.round(data.kaufpreis_qm_durchschnitt) }));
          setMarktdatenInfo({
            standort: data.standort,
            quelle: data.recherche_methode === 'live_web_search_v3' ? 'Live-Recherche' : 'Schätzung',
            preis: data.kaufpreis_qm_durchschnitt
          });
        }
      }
    } catch (error) {
      console.error('Marktdaten-Fehler:', error);
    } finally {
      setIsLoadingMarkt(false);
    }
  };

  const calculation = useMemo(() => {
    const {
      kaufpreis,
      kaltmiete,
      hausgeld,
      wohnflaeche,
      vergleichspreisProQm,
      zielRendite,
      zielFaktor,
      zinssatz,
      tilgungssatz
    } = values;

    const jahresmiete = kaltmiete * 12;
    const aktuellerFaktor = kaufpreis / jahresmiete;
    const aktuelleBruttorendite = (jahresmiete / kaufpreis) * 100;
    const preisProQm = kaufpreis / wohnflaeche;

    // Methode 1: Nach Zielrendite
    const nachRendite = Math.round(jahresmiete / (zielRendite / 100));

    // Methode 2: Nach Kaufpreisfaktor
    const nachFaktor = Math.round(jahresmiete * zielFaktor);

    // Methode 3: Nach Vergleichspreis/m²
    const nachVergleich = Math.round(vergleichspreisProQm * wohnflaeche);

    // Methode 4: Für Cashflow-Neutralität
    const nichtUmlagefaehig = hausgeld * 0.35;
    const verfuegbarFuerRate = kaltmiete - nichtUmlagefaehig;
    const jahresRate = verfuegbarFuerRate * 12;
    const maxKreditFuerCashflow0 = jahresRate / (zinssatz / 100 + tilgungssatz / 100);
    const nachCashflow = Math.round(maxKreditFuerCashflow0 * 0.88); // 12% Nebenkosten abziehen

    // Gewichteter Durchschnitt -- Marktvergleich am staerksten (wie Backend)
    const fairerPreis = Math.round(
      (nachVergleich * 0.40 + nachRendite * 0.25 + nachFaktor * 0.25 + nachCashflow * 0.10)
    );

    // Differenz zum aktuellen Preis
    const differenz = kaufpreis - fairerPreis;
    const differenzProzent = ((kaufpreis / fairerPreis) - 1) * 100;

    // Empfehlung
    let empfehlung;
    let empfehlungFarbe;
    if (differenzProzent <= -5) {
      empfehlung = 'Schnäppchen! Preis liegt unter dem fairen Wert.';
      empfehlungFarbe = 'olive';
    } else if (differenzProzent <= 5) {
      empfehlung = 'Fairer Preis. Kaufen wenn Objekt passt.';
      empfehlungFarbe = 'olive';
    } else if (differenzProzent <= 15) {
      empfehlung = 'Leicht überteuert. Preisverhandlung empfohlen.';
      empfehlungFarbe = 'accent';
    } else if (differenzProzent <= 25) {
      empfehlung = 'Deutlich überteuert. Nur bei starken Argumenten kaufen.';
      empfehlungFarbe = 'orange-400';
    } else {
      empfehlung = 'Stark überteuert. Finger weg oder aggressiv verhandeln!';
      empfehlungFarbe = 'red-400';
    }

    return {
      aktuell: {
        kaufpreis,
        faktor: aktuellerFaktor,
        rendite: aktuelleBruttorendite,
        preisProQm
      },
      methoden: [
        {
          name: 'Nach Zielrendite',
          preis: nachRendite,
          beschreibung: `Preis für ${zielRendite}% Bruttorendite`,
          gewicht: '30%'
        },
        {
          name: 'Nach Kaufpreisfaktor',
          preis: nachFaktor,
          beschreibung: `Preis für Faktor ${zielFaktor}`,
          gewicht: '30%'
        },
        {
          name: 'Nach Vergleichspreisen',
          preis: nachVergleich,
          beschreibung: `${vergleichspreisProQm}€/m² × ${wohnflaeche}m²`,
          gewicht: '20%'
        },
        {
          name: 'Für Cashflow-Neutral',
          preis: nachCashflow,
          beschreibung: 'Max. Preis für Cashflow = 0',
          gewicht: '20%'
        }
      ],
      fairerPreis,
      differenz,
      differenzProzent,
      empfehlung,
      empfehlungFarbe,
      verhandlungsziel: Math.round(fairerPreis * 0.95) // 5% unter fair
    };
  }, [values]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-[#2C2418]">
          Fairer Preis Rechner
        </h3>
        <p className="text-[#8C7E6A] text-sm mt-1">
          Berechne den objektiven Marktwert und das optimale Verhandlungsziel
        </p>
      </div>

      {/* Live-Marktdaten Section */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8E0D4] bg-[#7C8B6F]/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-[#7C8B6F] font-medium mb-2"> Live-Marktdaten laden</label>
            <input
              type="text"
              value={stadtInput}
              onChange={(e) => setStadtInput(e.target.value)}
              placeholder="Stadt eingeben (z.B. München, Hamburg-Eimsbüttel)"
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] placeholder-text-muted focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <button
            onClick={fetchLiveMarktdaten}
            disabled={isLoadingMarkt || !stadtInput.trim()}
            className="px-4 py-2 bg-[#7C8B6F] text-[#2C2418] rounded-lg font-medium hover:bg-[#7C8B6F]/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {isLoadingMarkt ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Lade...
              </>
            ) : (
              <> Preise abrufen</>
            )}
          </button>
        </div>
        {marktdatenInfo && (
          <div className="mt-3 p-2 bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 rounded-lg text-sm">
            <span className="text-[#7C8B6F] font-medium">✓ {marktdatenInfo.standort}:</span>
            <span className="text-[#2C2418] ml-2">{marktdatenInfo.preis.toLocaleString('de-DE')} €/m²</span>
            <span className="text-[#B5A68C] ml-2">({marktdatenInfo.quelle})</span>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
        <h4 className="text-sm font-bold text-[#8C7E6A] uppercase tracking-wider mb-4">Objektdaten</h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Kaufpreis</label>
            <input
              type="number"
              value={values.kaufpreis}
              onChange={(e) => setValues(v => ({ ...v, kaufpreis: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Kaltmiete/Monat</label>
            <input
              type="number"
              value={values.kaltmiete}
              onChange={(e) => setValues(v => ({ ...v, kaltmiete: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Wohnfläche m²</label>
            <input
              type="number"
              value={values.wohnflaeche}
              onChange={(e) => setValues(v => ({ ...v, wohnflaeche: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">
              Vergleichspreis €/m²
              {marktdatenInfo && <span className="text-[#7C8B6F] text-xs ml-1">(Live)</span>}
            </label>
            <input
              type="number"
              value={values.vergleichspreisProQm}
              onChange={(e) => setValues(v => ({ ...v, vergleichspreisProQm: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
        </div>

        <h4 className="text-sm font-bold text-[#8C7E6A] uppercase tracking-wider mb-4 mt-6">Zielwerte</h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Ziel-Bruttorendite %</label>
            <input
              type="number"
              step="0.1"
              value={values.zielRendite}
              onChange={(e) => setValues(v => ({ ...v, zielRendite: parseFloat(e.target.value) || 4 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Ziel-Kaufpreisfaktor</label>
            <input
              type="number"
              value={values.zielFaktor}
              onChange={(e) => setValues(v => ({ ...v, zielFaktor: parseInt(e.target.value) || 20 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Zinssatz %</label>
            <input
              type="number"
              step="0.1"
              value={values.zinssatz}
              onChange={(e) => setValues(v => ({ ...v, zinssatz: parseFloat(e.target.value) || 3 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8C7E6A] mb-2">Tilgung %</label>
            <input
              type="number"
              step="0.1"
              value={values.tilgungssatz}
              onChange={(e) => setValues(v => ({ ...v, tilgungssatz: parseFloat(e.target.value) || 1 }))}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right focus:ring-2 focus:ring-[#7C8B6F]/30 focus:border-[#7C8B6F] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Aktueller vs. Fairer Preis */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
          <h4 className="text-lg font-bold text-[#2C2418] mb-4">Preisvergleich</h4>

          <div className="space-y-4">
            <div className="p-4 bg-[#F5F0E8] rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-[#8C7E6A]">Aktueller Preis</span>
                <span className="text-2xl font-bold text-[#2C2418]">{formatCurrency(calculation.aktuell.kaufpreis)}</span>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-[#B5A68C]">
                <span>Faktor {calculation.aktuell.faktor.toFixed(1)}</span>
                <span>{calculation.aktuell.rendite.toFixed(2)}% Rendite</span>
                <span>{formatCurrency(calculation.aktuell.preisProQm)}/m²</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className={`px-4 py-2 rounded-full font-bold ${
                calculation.differenzProzent > 0
                  ? 'bg-[#B85C5C]/10 text-[#B85C5C]'
                  : 'bg-[#7C8B6F]/10 text-[#7C8B6F]'
              }`}>
                {calculation.differenzProzent > 0 ? '+' : ''}{calculation.differenzProzent.toFixed(1)}%
                ({calculation.differenz > 0 ? '+' : ''}{formatCurrency(calculation.differenz)})
              </div>
            </div>

            <div className="p-4 bg-[#7C8B6F]/5 rounded-xl border border-[#7C8B6F]/20">
              <div className="flex justify-between items-center">
                <span className="text-[#7C8B6F] font-medium">Fairer Preis</span>
                <span className="text-2xl font-bold text-[#7C8B6F]">{formatCurrency(calculation.fairerPreis)}</span>
              </div>
            </div>

            <div className="p-4 bg-accent/10 rounded-xl border border-accent/30">
              <div className="flex justify-between items-center">
                <span className="text-[#B5A68C] font-medium">Verhandlungsziel (-5%)</span>
                <span className="text-xl font-bold text-[#B5A68C]">{formatCurrency(calculation.verhandlungsziel)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bewertungsmethoden */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
          <h4 className="text-lg font-bold text-[#2C2418] mb-4">Bewertungsmethoden</h4>

          <div className="space-y-3">
            {calculation.methoden.map((methode, idx) => (
              <div key={idx} className="p-3 bg-[#F5F0E8] rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-[#2C2418]">{methode.name}</p>
                    <p className="text-xs text-[#B5A68C]">{methode.beschreibung}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#2C2418]">{formatCurrency(methode.preis)}</p>
                    <p className="text-xs text-[#B5A68C]">Gewicht: {methode.gewicht}</p>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="mt-2 h-2 bg-[#FAF7F2] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      methode.preis >= values.kaufpreis ? 'bg-[#7C8B6F]' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min((methode.preis / values.kaufpreis) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Empfehlung */}
      <div className="bg-white rounded-xl p-5 border"
           style={{
             borderColor: calculation.empfehlungFarbe === 'olive' ? 'rgba(124, 139, 111, 0.3)' :
                          calculation.empfehlungFarbe === 'accent' ? 'rgba(251, 191, 36, 0.3)' :
                          calculation.empfehlungFarbe === 'orange-400' ? 'rgba(251, 146, 60, 0.3)' :
                          'rgba(248, 113, 113, 0.3)',
             backgroundColor: calculation.empfehlungFarbe === 'olive' ? 'rgba(124, 139, 111, 0.05)' :
                              calculation.empfehlungFarbe === 'accent' ? 'rgba(251, 191, 36, 0.05)' :
                              calculation.empfehlungFarbe === 'orange-400' ? 'rgba(251, 146, 60, 0.05)' :
                              'rgba(248, 113, 113, 0.05)'
           }}>
        <div>
          <div>
            <p className="font-bold text-[#2C2418] text-lg">{calculation.empfehlung}</p>
            {calculation.differenz > 0 && (
              <p className="text-[#8C7E6A] text-sm mt-1">
                Verhandlungsargument: "Der faire Marktpreis liegt bei {formatCurrency(calculation.fairerPreis)}.
                Mein maximales Angebot ist {formatCurrency(calculation.verhandlungsziel)}."
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FairPriceCalculator;
