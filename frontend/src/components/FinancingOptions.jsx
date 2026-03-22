import React, { useState } from 'react';

function FinancingOptions({ optionen }) {
  const [selectedOption, setSelectedOption] = useState(1); // Standard is default

  if (!optionen || optionen.length === 0) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Finanzierungsoptionen verfügbar</p>
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

  const optionStyles = [
    { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-700', icon: '' },
    { bg: 'from-green-50 to-green-100', border: 'border-green-200', text: 'text-green-700', icon: '' },
    { bg: 'from-amber-50 to-amber-100', border: 'border-amber-200', text: 'text-amber-700', icon: '' },
    { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-700', icon: '' },
    { bg: 'from-red-50 to-red-100', border: 'border-red-200', text: 'text-red-700', icon: '' },
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-2">
        Finanzierungsoptionen im Vergleich
      </h4>
      <p className="text-sm text-slate/60 mb-6">
        Verschiedene Zins- und Tilgungskombinationen
      </p>

      {/* Options Grid */}
      <div className="grid md:grid-cols-5 gap-3">
        {optionen.map((option, index) => {
          const style = optionStyles[index] || optionStyles[0];
          const isSelected = selectedOption === index;

          return (
            <div
              key={index}
              onClick={() => setSelectedOption(index)}
              className={`
                p-4 rounded-xl cursor-pointer transition-all border-2
                bg-gradient-to-br ${style.bg} ${style.border}
                ${isSelected ? 'ring-4 ring-accent/30 scale-105 shadow-lg' : 'hover:scale-102 hover:shadow-md'}
              `}
            >
              <div className="text-center mb-3">
                <span className="text-2xl">{style.icon}</span>
                <p className={`font-bold text-sm ${style.text}`}>{option.name}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate/60">Zins:</span>
                  <span className="font-medium">{option.zinssatz}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate/60">Tilgung:</span>
                  <span className="font-medium">{option.tilgung}%</span>
                </div>
                <hr className="border-slate/20" />
                <div className="flex justify-between">
                  <span className="text-slate/60">Rate:</span>
                  <span className="font-bold">{formatCurrency(option.monatliche_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate/60">Cashflow:</span>
                  <span className={`font-bold ${option.monatlicher_cashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {option.monatlicher_cashflow >= 0 ? '+' : ''}{option.monatlicher_cashflow.toFixed(0)}€
                  </span>
                </div>
              </div>

              <div className={`mt-3 p-2 rounded-lg text-center ${option.selbsttragend ? 'bg-green-200' : 'bg-red-200'}`}>
                <p className={`text-xs font-medium ${option.selbsttragend ? 'text-green-800' : 'text-red-800'}`}>
                  {option.selbsttragend ? '✓ Selbsttragend' : '✗ Zuzahlung'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Option Details */}
      {selectedOption !== null && optionen[selectedOption] && (
        <div className="mt-6 p-5 bg-slate/5 rounded-xl border border-slate/20">
          <h5 className="font-bold text-primary mb-4 flex items-center gap-2">
            <span>{optionStyles[selectedOption]?.icon}</span>
            Details: {optionen[selectedOption].name}
          </h5>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-xs text-slate/60">Monatliche Rate</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(optionen[selectedOption].monatliche_rate)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-xs text-slate/60">Monatlicher Cashflow</p>
              <p className={`text-xl font-bold ${optionen[selectedOption].monatlicher_cashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {optionen[selectedOption].monatlicher_cashflow >= 0 ? '+' : ''}
                {formatCurrency(optionen[selectedOption].monatlicher_cashflow)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-xs text-slate/60">Abbezahlt in ca.</p>
              <p className="text-xl font-bold text-primary">
                {optionen[selectedOption].jahre_bis_abbezahlt} Jahren
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-xs text-slate/60">Gesamtkosten (geschätzt)</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(optionen[selectedOption].gesamtkosten_geschaetzt)}
              </p>
            </div>
          </div>

          {/* Trade-off explanation */}
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <span className="font-bold">Trade-off: </span>
              {optionen[selectedOption].tilgung < 1.5
                ? 'Niedrige Rate = mehr Liquidität, aber längere Laufzeit und höhere Gesamtzinsen.'
                : optionen[selectedOption].tilgung < 2.5
                  ? 'Ausgewogenes Verhältnis zwischen Rate und Laufzeit.'
                  : 'Schnelle Tilgung = weniger Zinsen insgesamt, aber höhere monatliche Belastung.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm font-bold text-green-700 mb-1">Beste Option für Cashflow:</p>
          <p className="text-green-600">
            {optionen.reduce((best, opt) =>
              opt.monatlicher_cashflow > best.monatlicher_cashflow ? opt : best
            ).name}
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-bold text-blue-700 mb-1">Schnellste Entschuldung:</p>
          <p className="text-blue-600">
            {optionen.reduce((best, opt) =>
              opt.jahre_bis_abbezahlt < best.jahre_bis_abbezahlt ? opt : best
            ).name}
          </p>
        </div>
      </div>
    </div>
  );
}

export default FinancingOptions;
