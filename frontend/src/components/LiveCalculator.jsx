import React, { useState, useEffect, useMemo } from 'react';

/**
 * LiveCalculator - Vollständig interaktive Immobilienberechnung
 * Berechnet bei jeder Slider-Änderung ALLE Werte neu und zeigt sie live an.
 */
function LiveCalculator({ kaufpreis, monatlicheMiete, hausgeld, wohnflaeche, baujahr, initialValues }) {
  // Slider-Werte
  const [values, setValues] = useState({
    eigenkapital: initialValues?.eigenkapital || 0,
    zinssatz: initialValues?.zinssatz || 3.75,
    tilgung: initialValues?.tilgung || 1.5,
    mietsteigerung: 1.5,
    wertsteigerung: 1.5
  });

  // Berechnete Werte
  const calculations = useMemo(() => {
    if (!kaufpreis || !monatlicheMiete) return null;

    // Grundwerte
    const jahresmiete = monatlicheMiete * 12;
    const finanzierungssumme = kaufpreis - values.eigenkapital;
    const kaufnebenkosten = kaufpreis * 0.12; // ~12% Kaufnebenkosten
    const gesamtinvestition = kaufpreis + kaufnebenkosten;

    // Kreditrate
    const gesamtrate = values.zinssatz + values.tilgung;
    const jaehrlicheRate = finanzierungssumme * (gesamtrate / 100);
    const monatlicheRate = jaehrlicheRate / 12;

    // Nebenkosten (nur nicht-umlagefähige ~30%)
    const nichtUmlagefahig = (hausgeld || 0) * 0.3;

    // Cashflow
    const monatlichCashflow = monatlicheMiete - monatlicheRate - nichtUmlagefahig;
    const jaehrlichCashflow = monatlichCashflow * 12;

    // Renditen
    const bruttorendite = (jahresmiete / kaufpreis) * 100;
    const nettorendite = ((jahresmiete - (nichtUmlagefahig * 12)) / kaufpreis) * 100;
    const kaufpreisfaktor = kaufpreis / jahresmiete;

    // Eigenkapitalrendite
    const eigenkapitalInklNebenkosten = values.eigenkapital + kaufnebenkosten;
    const eigenkapitalRendite = eigenkapitalInklNebenkosten > 0
      ? (jaehrlichCashflow / eigenkapitalInklNebenkosten) * 100
      : null;

    // Leverage-Effekt
    const leverageFaktor = values.eigenkapital > 0
      ? kaufpreis / values.eigenkapital
      : null;

    // Kredit-Laufzeit
    const kreditLaufzeit = Math.ceil(100 / values.tilgung);

    // Geschätzte Gesamtzinskosten (vereinfacht)
    const geschaetzteZinskosten = finanzierungssumme * (values.zinssatz / 100) * (kreditLaufzeit / 2);

    // Break-Even Eigenkapital
    const verfuegbarFuerKredit = monatlicheMiete - nichtUmlagefahig;
    const maxKreditrate = verfuegbarFuerKredit * 12;
    const maxFinanzierung = maxKreditrate / (gesamtrate / 100);
    const breakEvenEK = Math.max(0, kaufpreis - maxFinanzierung);

    // Preis pro m²
    const preisProQm = wohnflaeche ? kaufpreis / wohnflaeche : null;
    const mieteProQm = wohnflaeche ? monatlicheMiete / wohnflaeche : null;

    // 10-Jahres-Projektion
    const projektion = [];
    let aktuelleRestschuld = finanzierungssumme;
    let aktuelleMiete = monatlicheMiete;
    let aktuellerWert = kaufpreis;

    for (let jahr = 1; jahr <= 10; jahr++) {
      const zinsenJahr = aktuelleRestschuld * (values.zinssatz / 100);
      const tilgungJahr = jaehrlicheRate - zinsenJahr;
      aktuelleRestschuld = Math.max(0, aktuelleRestschuld - tilgungJahr);

      aktuelleMiete *= (1 + values.mietsteigerung / 100);
      aktuellerWert *= (1 + values.wertsteigerung / 100);

      const cashflowJahr = (aktuelleMiete * 12) - jaehrlicheRate - (nichtUmlagefahig * 12);
      const eigenkapitalAufbau = values.eigenkapital + (finanzierungssumme - aktuelleRestschuld);
      const gesamtVermoegen = aktuellerWert - aktuelleRestschuld;

      projektion.push({
        jahr,
        restschuld: aktuelleRestschuld,
        zinsen: zinsenJahr,
        tilgung: tilgungJahr,
        miete: aktuelleMiete,
        wert: aktuellerWert,
        cashflow: cashflowJahr / 12,
        eigenkapitalAufbau,
        gesamtVermoegen
      });
    }

    return {
      // Grundwerte
      finanzierungssumme,
      kaufnebenkosten,
      gesamtinvestition,
      eigenkapitalInklNebenkosten,

      // Raten
      monatlicheRate,
      jaehrlicheRate,
      gesamtrate,
      nichtUmlagefahig,

      // Cashflow
      monatlichCashflow,
      jaehrlichCashflow,

      // Renditen
      bruttorendite,
      nettorendite,
      kaufpreisfaktor,
      eigenkapitalRendite,
      leverageFaktor,

      // Kredit
      kreditLaufzeit,
      geschaetzteZinskosten,
      breakEvenEK,

      // Pro m²
      preisProQm,
      mieteProQm,

      // Projektion
      projektion,

      // Status
      selbsttragend: monatlichCashflow >= 0,
      cashflowPositiv: monatlichCashflow > 0
    };
  }, [kaufpreis, monatlicheMiete, hausgeld, wohnflaeche, values]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const eigenkapitalProzent = kaufpreis > 0 ? (values.eigenkapital / kaufpreis) * 100 : 0;
  const maxEigenkapital = kaufpreis * 0.5;

  if (!calculations) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#E8E0D4] text-center">
        <p className="text-[#8C7E6A]">Keine Daten für Berechnung verfügbar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
        <h3 className="text-2xl font-bold text-[#2C2418] mb-2 flex items-center gap-3">
          <span className="text-3xl">🎛️</span>
          <span className="text-[#2C2418]">Live-Rechner</span>
        </h3>
        <p className="text-[#8C7E6A]">
          Passe die Werte an und sieh sofort wie sich alle Kennzahlen ändern
        </p>
      </div>

      {/* Sliders Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Eigenkapital */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <label className="text-sm font-semibold text-[#8C7E6A] flex items-center gap-2">
                <span className="text-lg"></span> Eigenkapital
              </label>
              <p className="text-xs text-[#B5A68C] mt-1">Beeinflusst Kredithöhe & Cashflow</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-[#7C8B6F] ">
                {formatCurrency(values.eigenkapital)}
              </span>
              <span className="block text-xs text-[#B5A68C]">{eigenkapitalProzent.toFixed(1)}% vom KP</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={maxEigenkapital}
            step={5000}
            value={values.eigenkapital}
            onChange={(e) => setValues({ ...values, eigenkapital: Number(e.target.value) })}
            className="w-full h-2 bg-[#FAF7F2] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-r
              [&::-webkit-slider-thumb]:from-[#7C8B6F]
              [&::-webkit-slider-thumb]:to-[#B5A68C]
              [&::-webkit-slider-thumb]:
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>0€ (100% FK)</span>
            <span>{formatCurrency(maxEigenkapital)} (50%)</span>
          </div>
        </div>

        {/* Zinssatz */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <label className="text-sm font-semibold text-[#8C7E6A] flex items-center gap-2">
                <span className="text-lg"></span> Zinssatz
              </label>
              <p className="text-xs text-[#B5A68C] mt-1">Aktuell ~3.5-4.5% Markt</p>
            </div>
            <span className="text-2xl font-bold text-[#5C4F3D] text-glow-purple">
              {values.zinssatz.toFixed(2)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            step={0.05}
            value={values.zinssatz}
            onChange={(e) => setValues({ ...values, zinssatz: Number(e.target.value) })}
            className="w-full h-2 bg-[#FAF7F2] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-r
              [&::-webkit-slider-thumb]:from-[#B5A68C]
              [&::-webkit-slider-thumb]:to-[#8C7E6A]
              [&::-webkit-slider-thumb]:
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>1%</span>
            <span>8%</span>
          </div>
        </div>

        {/* Tilgung */}
        <div className="bg-white rounded-2xl p-6 border border-[#7C8B6F]/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <label className="text-sm font-semibold text-[#8C7E6A] flex items-center gap-2">
                <span className="text-lg"></span> Tilgung
              </label>
              <p className="text-xs text-[#B5A68C] mt-1">Höher = schneller abbezahlt</p>
            </div>
            <span className="text-2xl font-bold text-[#7C8B6F]" style={{ textShadow: '0 0 10px rgba(124, 139, 111, 0.5)' }}>
              {values.tilgung.toFixed(2)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={0.05}
            value={values.tilgung}
            onChange={(e) => setValues({ ...values, tilgung: Number(e.target.value) })}
            className="w-full h-2 bg-[#FAF7F2] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-r
              [&::-webkit-slider-thumb]:from-[#7C8B6F]
              [&::-webkit-slider-thumb]:to-emerald-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>1% (~100 Jahre)</span>
            <span>5% (~20 Jahre)</span>
          </div>
        </div>

        {/* Mietsteigerung */}
        <div className="bg-white rounded-2xl p-6 border border-accent/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <label className="text-sm font-semibold text-[#8C7E6A] flex items-center gap-2">
                <span className="text-lg"></span> Jährl. Mietsteigerung
              </label>
              <p className="text-xs text-[#B5A68C] mt-1">Für 10-Jahres-Projektion</p>
            </div>
            <span className="text-2xl font-bold text-[#B5A68C] text-glow-gold">
              {values.mietsteigerung.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={values.mietsteigerung}
            onChange={(e) => setValues({ ...values, mietsteigerung: Number(e.target.value) })}
            className="w-full h-2 bg-[#FAF7F2] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-r
              [&::-webkit-slider-thumb]:from-accent
              [&::-webkit-slider-thumb]:to-amber-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>0% (keine)</span>
            <span>4% (hoch)</span>
          </div>
        </div>
      </div>

      {/* Main Results */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
        <h4 className="text-lg font-bold text-[#2C2418] mb-6 flex items-center gap-2">
          <span className="text-xl"></span> Live-Ergebnisse
        </h4>

        {/* Cashflow Hero */}
        <div className={`p-6 rounded-2xl mb-6 border-2 ${
          calculations.selbsttragend
            ? 'bg-[#7C8B6F]/5 border-[#7C8B6F]/30'
            : 'bg-[#B85C5C]/5 border-red-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8C7E6A] font-medium mb-1">Monatlicher Cashflow</p>
              <p className="text-xs text-[#B5A68C]">
                Miete {formatCurrency(monatlicheMiete)} - Rate {formatCurrency(calculations.monatlicheRate)} - NK {formatCurrency(calculations.nichtUmlagefahig)}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-black ${
                calculations.selbsttragend ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
              }`} style={{
                textShadow: calculations.selbsttragend
                  ? '0 0 30px rgba(124, 139, 111, 0.6)'
                  : '0 0 30px rgba(239, 68, 68, 0.6)'
              }}>
                {calculations.monatlichCashflow >= 0 ? '+' : ''}{formatCurrency(calculations.monatlichCashflow)}
              </span>
              <p className="text-sm text-[#B5A68C] mt-1">
                {calculations.selbsttragend ? ' Selbsttragend' : ' Zuzahlung nötig'}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-[#F5F0E8] rounded-xl text-center">
            <p className="text-xs text-[#B5A68C] uppercase tracking-wider mb-1">Bruttorendite</p>
            <p className="text-xl font-bold text-[#7C8B6F]">{calculations.bruttorendite.toFixed(2)}%</p>
          </div>
          <div className="p-4 bg-[#F5F0E8] rounded-xl text-center">
            <p className="text-xs text-[#B5A68C] uppercase tracking-wider mb-1">Kaufpreisfaktor</p>
            <p className="text-xl font-bold text-[#5C4F3D]">{calculations.kaufpreisfaktor.toFixed(1)}x</p>
          </div>
          <div className="p-4 bg-[#F5F0E8] rounded-xl text-center">
            <p className="text-xs text-[#B5A68C] uppercase tracking-wider mb-1">Monatl. Rate</p>
            <p className="text-xl font-bold text-[#2C2418]">{formatCurrency(calculations.monatlicheRate)}</p>
          </div>
          <div className="p-4 bg-[#F5F0E8] rounded-xl text-center">
            <p className="text-xs text-[#B5A68C] uppercase tracking-wider mb-1">Kreditsumme</p>
            <p className="text-xl font-bold text-[#2C2418]">{formatCurrency(calculations.finanzierungssumme)}</p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {calculations.eigenkapitalRendite !== null && (
            <div className="p-4 glass-neon rounded-xl">
              <p className="text-xs text-[#B5A68C] mb-1">EK-Rendite (inkl. Nebenkosten)</p>
              <p className={`text-2xl font-bold ${
                calculations.eigenkapitalRendite > 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
              }`}>
                {calculations.eigenkapitalRendite.toFixed(1)}% p.a.
              </p>
              <p className="text-xs text-[#B5A68C] mt-1">
                auf {formatCurrency(calculations.eigenkapitalInklNebenkosten)} EK
              </p>
            </div>
          )}

          <div className="p-4 glass-neon rounded-xl">
            <p className="text-xs text-[#B5A68C] mb-1">Kredit abbezahlt in</p>
            <p className="text-2xl font-bold text-[#7C8B6F]">~{calculations.kreditLaufzeit} Jahren</p>
            <p className="text-xs text-[#B5A68C] mt-1">bei {values.tilgung}% Tilgung</p>
          </div>

          <div className="p-4 glass-neon rounded-xl">
            <p className="text-xs text-[#B5A68C] mb-1">Geschätzte Zinskosten</p>
            <p className="text-2xl font-bold text-[#B85C5C]">{formatCurrency(calculations.geschaetzteZinskosten)}</p>
            <p className="text-xs text-[#B5A68C] mt-1">über Laufzeit</p>
          </div>
        </div>

        {/* Break-Even Info */}
        {calculations.breakEvenEK > 0 && values.eigenkapital < calculations.breakEvenEK && (
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl mb-6">
            <p className="text-[#B5A68C] font-semibold flex items-center gap-2">
              <span></span>
              Break-Even bei {formatCurrency(calculations.breakEvenEK)} Eigenkapital
            </p>
            <p className="text-sm text-[#8C7E6A] mt-1">
              Mit {formatCurrency(calculations.breakEvenEK - values.eigenkapital)} mehr EK wäre die Immobilie selbsttragend.
            </p>
          </div>
        )}
      </div>

      {/* 10-Year Projection */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
        <h4 className="text-lg font-bold text-[#2C2418] mb-6 flex items-center gap-2">
          <span className="text-xl">📅</span> 10-Jahres-Projektion
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E0D4]">
                <th className="text-left py-3 px-2 text-[#B5A68C] font-medium">Jahr</th>
                <th className="text-right py-3 px-2 text-[#B5A68C] font-medium">Miete/Mon.</th>
                <th className="text-right py-3 px-2 text-[#B5A68C] font-medium">Cashflow/Mon.</th>
                <th className="text-right py-3 px-2 text-[#B5A68C] font-medium">Restschuld</th>
                <th className="text-right py-3 px-2 text-[#B5A68C] font-medium">Immo-Wert</th>
                <th className="text-right py-3 px-2 text-[#B5A68C] font-medium">Vermögen</th>
              </tr>
            </thead>
            <tbody>
              {calculations.projektion.map((jahr, idx) => (
                <tr key={jahr.jahr} className={`border-b border-white/5 ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                  <td className="py-3 px-2 font-medium text-[#2C2418]">{jahr.jahr}</td>
                  <td className="py-3 px-2 text-right text-[#8C7E6A]">{formatCurrency(jahr.miete)}</td>
                  <td className={`py-3 px-2 text-right font-medium ${jahr.cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                    {jahr.cashflow >= 0 ? '+' : ''}{formatCurrency(jahr.cashflow)}
                  </td>
                  <td className="py-3 px-2 text-right text-[#8C7E6A]">{formatCurrency(jahr.restschuld)}</td>
                  <td className="py-3 px-2 text-right text-[#7C8B6F]">{formatCurrency(jahr.wert)}</td>
                  <td className="py-3 px-2 text-right font-bold text-[#5C4F3D]">{formatCurrency(jahr.gesamtVermoegen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-[#F5F0E8] border border-[#E8E0D4] rounded-xl">
          <p className="text-[#5C4F3D] font-semibold">
            Nach 10 Jahren: {formatCurrency(calculations.projektion[9]?.gesamtVermoegen || 0)} Vermögen
          </p>
          <p className="text-sm text-[#8C7E6A] mt-1">
            Bei {values.mietsteigerung}% jährl. Mietsteigerung und {values.wertsteigerung}% Wertsteigerung
          </p>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={() => setValues({
          eigenkapital: initialValues?.eigenkapital || 0,
          zinssatz: initialValues?.zinssatz || 3.75,
          tilgung: initialValues?.tilgung || 1.5,
          mietsteigerung: 1.5,
          wertsteigerung: 1.5
        })}
        className="w-full py-4 text-[#8C7E6A] border border-[#E8E0D4] rounded-xl
          hover:border-[#7C8B6F]/30 hover:text-[#7C8B6F] hover:bg-[#7C8B6F]/5 transition-all duration-300 font-medium"
      >
        ↺ Alle Werte zurücksetzen
      </button>
    </div>
  );
}

export default LiveCalculator;
