import React, { useState, useEffect, useCallback } from 'react';

function InteractiveSliders({ initialValues, kaufpreis, monatlicheMiete, nebenkosten, onValuesChange }) {
  const [values, setValues] = useState({
    eigenkapital: initialValues?.eigenkapital || 0,
    zinssatz: initialValues?.zinssatz || 3.75,
    tilgung: initialValues?.tilgung || 1.25
  });

  const [calculatedCashflow, setCalculatedCashflow] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateCashflow();
      if (onValuesChange) {
        onValuesChange(values);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [values]);

  const calculateCashflow = useCallback(() => {
    if (!kaufpreis || !monatlicheMiete) return;

    const finanzierungssumme = kaufpreis - values.eigenkapital;
    const jaehrlicheRate = finanzierungssumme * ((values.zinssatz + values.tilgung) / 100);
    const monatlicheRate = jaehrlicheRate / 12;

    // Nur nicht-umlagefähige Nebenkosten abziehen (ca. 30% vom Hausgeld)
    // Typisch: Instandhaltungsrücklage + Verwaltung = ca. 30%
    const nichtUmlagefahig = (nebenkosten || 0) * 0.3;

    const monatlichCashflow = monatlicheMiete - monatlicheRate - nichtUmlagefahig;
    const jaehrlichCashflow = monatlichCashflow * 12;

    // Eigenkapitalrendite berechnen
    let eigenkapitalRendite = null;
    if (values.eigenkapital > 0) {
      eigenkapitalRendite = (jaehrlichCashflow / values.eigenkapital) * 100;
    }

    setCalculatedCashflow({
      monatlich: monatlichCashflow,
      jaehrlich: jaehrlichCashflow,
      monatlicheRate,
      finanzierungssumme,
      nichtUmlagefahigeKosten: nichtUmlagefahig,
      eigenkapitalRendite,
      selbsttragend: monatlichCashflow >= 0
    });
  }, [kaufpreis, monatlicheMiete, nebenkosten, values]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const eigenkapitalProzent = kaufpreis > 0 ? (values.eigenkapital / kaufpreis) * 100 : 0;

  // Berechne max sinnvolles Eigenkapital (Kaufnebenkosten + etwas Puffer)
  const kaufnebenkosten = kaufpreis * 0.12; // ca. 12% Kaufnebenkosten
  const maxEigenkapital = Math.min(kaufpreis, kaufpreis * 0.5); // Max 50% EK

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
      <h4 className="text-lg font-bold text-[#2C2418] mb-6 flex items-center gap-2">
        <span className="text-2xl">🎚️</span>
        <span className="text-[#2C2418]">Interaktive Simulation</span>
      </h4>

      <div className="space-y-8">
        {/* Eigenkapital Slider */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <label className="text-sm font-medium text-[#8C7E6A]">Eigenkapital</label>
              <p className="text-xs text-[#B5A68C]">Mehr EK = weniger Kredit = besserer Cashflow</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-[#7C8B6F] ">{formatCurrency(values.eigenkapital)}</span>
              <span className="text-sm text-[#B5A68C] ml-2">({eigenkapitalProzent.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="relative">
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
                [&::-webkit-slider-thumb]:bg-gradient-to-br
                [&::-webkit-slider-thumb]:from-[#7C8B6F]
                [&::-webkit-slider-thumb]:to-[#B5A68C]
                [&::-webkit-slider-thumb]:
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125"
            />
            {/* Kaufnebenkosten Marker */}
            <div
              className="absolute top-4 h-3 w-0.5 bg-accent"
              style={{ left: `${(kaufnebenkosten / maxEigenkapital) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>0€ (100% Finanzierung)</span>
            <span className="text-[#B5A68C]">↑ Kaufnebenkosten</span>
            <span>{formatCurrency(maxEigenkapital)}</span>
          </div>
        </div>

        {/* Zinssatz Slider */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <label className="text-sm font-medium text-[#8C7E6A]">Zinssatz</label>
              <p className="text-xs text-[#B5A68C]">Aktueller Marktzins ~3.5-4.5%</p>
            </div>
            <span className="text-xl font-bold text-[#5C4F3D] text-glow-purple">{values.zinssatz.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.05}
            value={values.zinssatz}
            onChange={(e) => setValues({ ...values, zinssatz: Number(e.target.value) })}
            className="w-full h-2 bg-[#FAF7F2] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-[#B5A68C]
              [&::-webkit-slider-thumb]:to-[#8C7E6A]
              [&::-webkit-slider-thumb]:
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>0.5%</span>
            <span>8%</span>
          </div>
        </div>

        {/* Tilgung Slider */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <label className="text-sm font-medium text-[#8C7E6A]">Tilgung</label>
              <p className="text-xs text-[#B5A68C]">Höhere Tilgung = schneller abbezahlt</p>
            </div>
            <span className="text-xl font-bold text-[#7C8B6F]" style={{ textShadow: '0 0 10px rgba(124, 139, 111, 0.5)' }}>
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
              [&::-webkit-slider-thumb]:bg-gradient-to-br
              [&::-webkit-slider-thumb]:from-[#7C8B6F]
              [&::-webkit-slider-thumb]:to-emerald-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
            style={{
              '--thumb-shadow': '0 0 15px rgba(124, 139, 111, 0.5)'
            }}
          />
          <div className="flex justify-between text-xs text-[#B5A68C] mt-2">
            <span>1% (langsam)</span>
            <span>5% (schnell)</span>
          </div>
        </div>
      </div>

      {/* Real-time Result */}
      {calculatedCashflow && (
        <div className="mt-8 pt-6 border-t border-[#E8E0D4]">
          <p className="text-sm text-[#B5A68C] mb-4 text-center">Ergebnis bei diesen Einstellungen:</p>

          <div className={`p-5 rounded-2xl border ${
            calculatedCashflow.selbsttragend
              ? 'bg-[#7C8B6F]/5 border-[#7C8B6F]/20'
              : 'bg-[#B85C5C]/5 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#8C7E6A] font-medium">Monatlicher Cashflow</span>
              <span className={`text-3xl font-black ${
                calculatedCashflow.selbsttragend ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
              }`} style={{
                textShadow: calculatedCashflow.selbsttragend
                  ? '0 0 20px rgba(124, 139, 111, 0.5)'
                  : '0 0 20px rgba(239, 68, 68, 0.5)'
              }}>
                {calculatedCashflow.monatlich >= 0 ? '+' : ''}
                {formatCurrency(calculatedCashflow.monatlich)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-2 bg-[#F5F0E8] rounded-lg">
                <span className="text-[#B5A68C]">Kreditsumme:</span>
                <span className="font-medium text-[#2C2418]">{formatCurrency(calculatedCashflow.finanzierungssumme)}</span>
              </div>
              <div className="flex justify-between p-2 bg-[#F5F0E8] rounded-lg">
                <span className="text-[#B5A68C]">Monatl. Rate:</span>
                <span className="font-medium text-[#2C2418]">{formatCurrency(calculatedCashflow.monatlicheRate)}</span>
              </div>
              <div className="flex justify-between p-2 bg-[#F5F0E8] rounded-lg">
                <span className="text-[#B5A68C]">Jährl. Cashflow:</span>
                <span className={`font-medium ${calculatedCashflow.jaehrlich >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                  {calculatedCashflow.jaehrlich >= 0 ? '+' : ''}
                  {formatCurrency(calculatedCashflow.jaehrlich)}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-[#F5F0E8] rounded-lg">
                <span className="text-[#B5A68C]">Gesamtrate:</span>
                <span className="font-medium text-[#2C2418]">{(values.zinssatz + values.tilgung).toFixed(2)}%</span>
              </div>
            </div>

            {/* EK-Rendite */}
            {calculatedCashflow.eigenkapitalRendite !== null && (
              <div className="mt-4 p-3 bg-[#F5F0E8] rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[#B5A68C] text-sm">Eigenkapitalrendite:</span>
                  <span className={`text-lg font-bold ${
                    calculatedCashflow.eigenkapitalRendite > 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
                  }`}>
                    {calculatedCashflow.eigenkapitalRendite.toFixed(1)}% p.a.
                  </span>
                </div>
                <p className="text-xs text-[#B5A68C] mt-1">
                  {calculatedCashflow.eigenkapitalRendite > 3
                    ? ' Gute Rendite auf eingesetztes Kapital'
                    : calculatedCashflow.eigenkapitalRendite > 0
                      ? ' Moderate Rendite - akzeptabel'
                      : ' Negative Rendite - Zuzahlung nötig'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Insights */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 glass-neon rounded-xl text-center">
              <p className="text-xs text-[#B5A68C]">Kredit abbezahlt in</p>
              <p className="text-xl font-bold text-[#7C8B6F]">
                ~{Math.ceil(100 / values.tilgung)} Jahren
              </p>
            </div>
            <div className="p-3 glass-neon rounded-xl text-center">
              <p className="text-xs text-[#B5A68C]">Geschätzte Zinskosten</p>
              <p className="text-xl font-bold text-[#B85C5C]">
                ~{formatCurrency(calculatedCashflow.finanzierungssumme * values.zinssatz / 100 * (100 / values.tilgung) / 2)}
              </p>
            </div>
          </div>

          {/* Hinweis zu Kaufnebenkosten */}
          {values.eigenkapital < kaufnebenkosten && (
            <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-xl">
              <p className="text-sm text-[#B5A68C] flex items-start gap-2">
                <span></span>
                <span>
                  <strong>Achtung:</strong> Eigenkapital ({formatCurrency(values.eigenkapital)}) liegt unter den
                  Kaufnebenkosten (~{formatCurrency(kaufnebenkosten)}). Diese müssen zusätzlich bezahlt werden!
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={() => setValues({
          eigenkapital: initialValues?.eigenkapital || 0,
          zinssatz: initialValues?.zinssatz || 3.75,
          tilgung: initialValues?.tilgung || 1.25
        })}
        className="mt-6 w-full py-3 text-sm text-[#8C7E6A] border border-[#E8E0D4] rounded-xl
          hover:border-[#7C8B6F]/30 hover:text-[#7C8B6F] hover:bg-[#7C8B6F]/5 transition-all duration-300"
      >
        ↺ Auf Ursprungswerte zurücksetzen
      </button>
    </div>
  );
}

export default InteractiveSliders;
