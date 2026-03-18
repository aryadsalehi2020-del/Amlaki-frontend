import React from 'react';

function SensitivityMatrix({ sensitivity }) {
  if (!sensitivity || !sensitivity.matrix) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Sensitivitätsanalyse verfügbar</p>
      </div>
    );
  }

  const { matrix, zinssaetze, eigenkapital_werte, eigenkapital_prozente, aktueller_zins_index, aktueller_ek_index } = sensitivity;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatEK = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    }
    return `${(value / 1000).toFixed(0)}k€`;
  };

  // Get color based on cashflow value
  const getCellColor = (cashflow, isCurrentCell) => {
    if (isCurrentCell) {
      return 'bg-accent/30 ring-2 ring-accent';
    }
    if (cashflow >= 200) return 'bg-green-500 text-[#2C2418]';
    if (cashflow >= 100) return 'bg-green-400 text-[#2C2418]';
    if (cashflow >= 0) return 'bg-green-300 text-green-900';
    if (cashflow >= -100) return 'bg-yellow-300 text-yellow-900';
    if (cashflow >= -200) return 'bg-orange-400 text-[#2C2418]';
    if (cashflow >= -300) return 'bg-orange-500 text-[#2C2418]';
    return 'bg-red-500 text-[#2C2418]';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
        <span className="text-2xl"></span>
        Sensitivitätsanalyse (Cashflow-Heatmap)
      </h4>
      <p className="text-sm text-slate/60 mb-6">
        Monatlicher Cashflow bei verschiedenen Zinssatz- und Eigenkapital-Kombinationen
      </p>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-xs text-slate/60">Negativ</span>
        <div className="flex gap-0.5">
          <div className="w-6 h-4 bg-red-500 rounded-l"></div>
          <div className="w-6 h-4 bg-orange-500"></div>
          <div className="w-6 h-4 bg-orange-400"></div>
          <div className="w-6 h-4 bg-yellow-300"></div>
          <div className="w-6 h-4 bg-green-300"></div>
          <div className="w-6 h-4 bg-green-400"></div>
          <div className="w-6 h-4 bg-green-500 rounded-r"></div>
        </div>
        <span className="text-xs text-slate/60">Positiv</span>
      </div>

      {/* Mobile scroll hint */}
      <p className="text-xs text-[#B5A68C] mb-2 md:hidden">← Tabelle horizontal scrollen →</p>

      {/* Matrix Table */}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-xs text-slate/60 font-medium">
                <div className="flex items-center gap-1">
                  <span>Zins ↓</span>
                  <span className="text-slate/40">/</span>
                  <span>EK →</span>
                </div>
              </th>
              {eigenkapital_prozente.map((prozent, i) => (
                <th
                  key={i}
                  className={`p-2 text-center ${i === aktueller_ek_index ? 'bg-accent/10' : ''}`}
                >
                  <div className="text-xs font-bold text-primary">{prozent}%</div>
                  <div className="text-xs text-slate/50">{formatEK(eigenkapital_werte[i])}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, zinsIndex) => (
              <tr key={zinsIndex}>
                <td className={`p-2 text-center ${zinsIndex === aktueller_zins_index ? 'bg-accent/10' : ''}`}>
                  <span className="text-sm font-bold text-primary">{zinssaetze[zinsIndex]}%</span>
                </td>
                {row.map((cell, ekIndex) => {
                  const isCurrentCell = zinsIndex === aktueller_zins_index && ekIndex === aktueller_ek_index;

                  return (
                    <td
                      key={ekIndex}
                      className={`p-2 text-center transition-all ${getCellColor(cell.monatlicher_cashflow, isCurrentCell)}`}
                    >
                      <div className="text-sm font-bold">
                        {cell.monatlicher_cashflow >= 0 ? '+' : ''}
                        {cell.monatlicher_cashflow.toFixed(0)}€
                      </div>
                      {isCurrentCell && (
                        <div className="text-xs opacity-75">Aktuell</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Insights */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {/* Best Case */}
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">Bester Fall (Matrix)</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(Math.max(...matrix.flat().map(c => c.monatlicher_cashflow)))}/Monat
          </p>
          <p className="text-xs text-green-600">bei niedrigstem Zins & höchstem EK</p>
        </div>

        {/* Current */}
        <div className="p-4 bg-accent/10 rounded-xl border border-accent/30">
          <p className="text-xs text-[#B5A68C] font-medium mb-1">Aktuelle Einstellung</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(matrix[aktueller_zins_index]?.[aktueller_ek_index]?.monatlicher_cashflow || 0)}/Monat
          </p>
          <p className="text-xs text-slate/60">
            {zinssaetze[aktueller_zins_index]}% Zins, {eigenkapital_prozente[aktueller_ek_index]}% EK
          </p>
        </div>

        {/* Worst Case */}
        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-xs text-red-600 font-medium mb-1">Schlechtester Fall (Matrix)</p>
          <p className="text-lg font-bold text-red-700">
            {formatCurrency(Math.min(...matrix.flat().map(c => c.monatlicher_cashflow)))}/Monat
          </p>
          <p className="text-xs text-red-600">bei höchstem Zins & 0% EK</p>
        </div>
      </div>

      {/* Break-Even Analysis */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h5 className="text-sm font-bold text-blue-700 mb-2">Break-Even Analyse:</h5>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-600">
              <span className="font-medium">Bei aktuellem Zinssatz ({zinssaetze[aktueller_zins_index]}%):</span>
            </p>
            <ul className="mt-1 space-y-1">
              {eigenkapital_prozente.map((prozent, i) => {
                const cell = matrix[aktueller_zins_index]?.[i];
                if (cell?.selbsttragend) {
                  return (
                    <li key={i} className="text-green-600 flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      Ab {prozent}% EK ({formatEK(eigenkapital_werte[i])}) positiv
                    </li>
                  );
                }
                return null;
              }).filter(Boolean).slice(0, 1)}
              {!matrix[aktueller_zins_index]?.some(c => c.selbsttragend) && (
                <li className="text-red-600 flex items-center gap-1">
                  <span className="text-red-500">✗</span>
                  Nicht selbsttragend in diesem Bereich
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-blue-600">
              <span className="font-medium">Bei 0% Eigenkapital:</span>
            </p>
            <ul className="mt-1 space-y-1">
              {zinssaetze.map((zins, i) => {
                const cell = matrix[i]?.[0];
                if (cell?.selbsttragend) {
                  return (
                    <li key={i} className="text-green-600 flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      Bei {zins}% Zins oder weniger positiv
                    </li>
                  );
                }
                return null;
              }).filter(Boolean).slice(0, 1)}
              {!matrix.some((row) => row[0]?.selbsttragend) && (
                <li className="text-red-600 flex items-center gap-1">
                  <span className="text-red-500">✗</span>
                  Eigenkapital erforderlich
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-xs text-slate/50 mt-4 text-center">
        Die markierte Zelle zeigt Ihre aktuelle Konfiguration. Grüne Zellen = positiver Cashflow, rote = Zuzahlung nötig.
      </p>
    </div>
  );
}

export default SensitivityMatrix;
