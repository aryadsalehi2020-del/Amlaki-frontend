import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

function InvestmentComparison({ vergleich }) {
  if (!vergleich) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Vergleichsdaten verfügbar</p>
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

  const chartData = [
    {
      name: 'Immobilie',
      endvermoegen: vergleich.immobilie.endvermoegen,
      color: '#10b981'
    },
    {
      name: 'ETF (nur EK)',
      endvermoegen: vergleich.etf_nur_eigenkapital.endvermoegen,
      color: '#3b82f6'
    },
    {
      name: 'ETF (mit Sparrate)',
      endvermoegen: vergleich.etf_mit_sparrate.endvermoegen,
      color: '#8b5cf6'
    }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate/20">
          <p className="font-bold text-primary">{payload[0].payload.name}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const immoBesser = vergleich.vergleich.immobilie_besser_als_etf;

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
        <span className="text-2xl"></span>
        Investment-Vergleich: Immobilie vs. ETF
      </h4>
      <p className="text-sm text-slate/60 mb-6">Endvermögen nach 30 Jahren</p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="endvermoegen" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Comparison Result */}
      <div className={`mt-6 p-4 rounded-xl ${immoBesser ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{immoBesser ? '' : ''}</span>
          <div>
            <p className={`font-bold ${immoBesser ? 'text-green-700' : 'text-amber-700'}`}>
              {immoBesser
                ? `Immobilie schlägt ETF um ${formatCurrency(vergleich.vergleich.immobilie_vs_etf_sparrate)}`
                : `ETF wäre ${formatCurrency(Math.abs(vergleich.vergleich.immobilie_vs_etf_sparrate))} besser`
              }
            </p>
            <p className="text-sm text-slate/70">
              {immoBesser
                ? 'Die Immobilie ist die bessere Anlage bei diesen Annahmen'
                : 'Bei diesen Annahmen wäre ein ETF-Sparplan rentabler'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {/* Immobilie */}
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl"></span>
            <span className="font-bold text-green-700">Immobilie</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate/60">Endvermögen:</span>
              <span className="font-bold text-green-600">{formatCurrency(vergleich.immobilie.endvermoegen)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Eigenkapital:</span>
              <span>{formatCurrency(vergleich.immobilie.eingesetztes_kapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Mtl. Zuzahlung:</span>
              <span>{formatCurrency(vergleich.immobilie.monatliche_zuzahlung)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Faktor:</span>
              <span className="font-bold">{vergleich.immobilie.rendite_faktor}x</span>
            </div>
          </div>
        </div>

        {/* ETF nur EK */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl"></span>
            <span className="font-bold text-blue-700">ETF (nur EK)</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate/60">Endvermögen:</span>
              <span className="font-bold text-blue-600">{formatCurrency(vergleich.etf_nur_eigenkapital.endvermoegen)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Investiert:</span>
              <span>{formatCurrency(vergleich.etf_nur_eigenkapital.eingesetztes_kapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Rendite p.a.:</span>
              <span>{vergleich.etf_nur_eigenkapital.angenommene_rendite}%</span>
            </div>
          </div>
        </div>

        {/* ETF mit Sparrate */}
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl"></span>
            <span className="font-bold text-purple-700">ETF + Sparrate</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate/60">Endvermögen:</span>
              <span className="font-bold text-purple-600">{formatCurrency(vergleich.etf_mit_sparrate.endvermoegen)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Mtl. Sparrate:</span>
              <span>{formatCurrency(vergleich.etf_mit_sparrate.monatliche_sparrate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Gesamt investiert:</span>
              <span>{formatCurrency(vergleich.etf_mit_sparrate.gesamtinvestition)}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate/50 mt-4 text-center">
        ETF-Berechnung basiert auf 7% durchschnittlicher Jahresrendite. Die tatsächlichen Ergebnisse können erheblich abweichen.
      </p>
    </div>
  );
}

export default InvestmentComparison;
