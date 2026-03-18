import React from 'react';

function BreakEvenCalculator({ breakeven, aktuellesEigenkapital, kaufpreis }) {
  if (!breakeven) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Break-Even-Daten verfügbar</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const benoetigtesEK = breakeven.benoetigtes_eigenkapital;
  const differenz = benoetigtesEK - aktuellesEigenkapital;
  const prozentErreicht = benoetigtesEK > 0
    ? Math.min(100, (aktuellesEigenkapital / benoetigtesEK) * 100)
    : 100;

  const istBreakEvenErreicht = aktuellesEigenkapital >= benoetigtesEK;
  const istPositiverCashflow = benoetigtesEK <= 0;

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
        <span className="text-2xl"></span>
        Break-Even Eigenkapital
      </h4>

      {istPositiverCashflow ? (
        <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl border-2 border-green-300 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-800 font-bold text-lg">Positiver Cashflow ohne Eigenkapital!</p>
              <p className="text-green-700 text-sm">Diese Immobilie ist selbsttragend bei 100% Finanzierung.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Bar Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate/70">Fortschritt zum Break-Even</span>
              <span className={`text-sm font-bold ${istBreakEvenErreicht ? 'text-green-600' : 'text-amber-600'}`}>
                {prozentErreicht.toFixed(1)}%
              </span>
            </div>

            <div className="relative h-6 bg-slate/10 rounded-full overflow-hidden shadow-inner">
              {/* Target marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: '100%', transform: 'translateX(-2px)' }}
              />

              {/* Progress fill */}
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  istBreakEvenErreicht
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500'
                }`}
                style={{ width: `${prozentErreicht}%` }}
              />

              {/* Current value label inside */}
              <div className="absolute inset-0 flex items-center px-3">
                <span className={`text-xs font-bold ${prozentErreicht > 50 ? 'text-[#2C2418]' : 'text-slate/70'}`}>
                  {formatCurrency(aktuellesEigenkapital)}
                </span>
              </div>
            </div>

            {/* Target label */}
            <div className="flex justify-end mt-1">
              <span className="text-xs text-red-600 font-medium">
                Ziel: {formatCurrency(benoetigtesEK)}
              </span>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white rounded-xl border border-slate/20 shadow-sm">
              <p className="text-xs text-slate/60 mb-1">Aktuelles Eigenkapital</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(aktuellesEigenkapital)}</p>
              <p className="text-xs text-slate/50 mt-1">
                {((aktuellesEigenkapital / kaufpreis) * 100).toFixed(1)}% vom Kaufpreis
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate/20 shadow-sm">
              <p className="text-xs text-slate/60 mb-1">Benötigtes Eigenkapital</p>
              <p className="text-xl font-bold text-[#B5A68C]">{formatCurrency(benoetigtesEK)}</p>
              <p className="text-xs text-slate/50 mt-1">
                {breakeven.eigenkapital_quote_prozent.toFixed(1)}% vom Kaufpreis
              </p>
            </div>
          </div>

          {/* Difference Display */}
          {differenz > 0 ? (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-amber-800 font-bold">
                    Es fehlen noch {formatCurrency(differenz)}
                  </p>
                  <p className="text-amber-700 text-sm">
                    für einen neutralen Cashflow (Break-Even)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-800 font-bold">Break-Even erreicht!</p>
                  <p className="text-green-700 text-sm">
                    Sie haben {formatCurrency(Math.abs(differenz))} über dem Break-Even
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs text-blue-700">
          <span className="font-bold">Info:</span> {breakeven.hinweis}
        </p>
      </div>
    </div>
  );
}

export default BreakEvenCalculator;
