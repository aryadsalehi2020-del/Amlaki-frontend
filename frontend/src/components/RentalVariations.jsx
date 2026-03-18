import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

function RentalVariations({ variationen }) {
  if (!variationen || variationen.length === 0) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Miet-Variationen verfügbar</p>
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

  const chartData = variationen.map(v => ({
    ...v,
    label: v.miete_aenderung_prozent === 0
      ? 'Aktuell'
      : `${v.miete_aenderung_prozent > 0 ? '+' : ''}${v.miete_aenderung_prozent}%`,
    color: v.monatlicher_cashflow >= 0 ? '#10b981' : '#ef4444'
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate/20">
          <p className="font-bold text-primary mb-2">
            Miete: {formatCurrency(data.monatliche_miete)}
          </p>
          <div className="space-y-1 text-sm">
            <p className={data.monatlicher_cashflow >= 0 ? 'text-green-600' : 'text-red-600'}>
              Cashflow: {data.monatlicher_cashflow >= 0 ? '+' : ''}{formatCurrency(data.monatlicher_cashflow)}/Monat
            </p>
            <p className="text-slate/70">Bruttorendite: {data.bruttorendite.toFixed(2)}%</p>
            <p className={data.selbsttragend ? 'text-green-600' : 'text-red-600'}>
              {data.selbsttragend ? '✓ Selbsttragend' : '✗ Zuzahlung nötig'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Find the break-even point
  const breakEvenMiete = variationen.find(v => v.monatlicher_cashflow >= 0);

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
        <span className="text-2xl"></span>
        Miet-Sensitivität
      </h4>
      <p className="text-sm text-slate/60 mb-6">
        Wie verändert sich der Cashflow bei verschiedenen Miethöhen?
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `${v}€`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="5 5" />
          <Bar dataKey="monatlicher_cashflow" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                stroke={entry.miete_aenderung_prozent === 0 ? '#f59e0b' : 'transparent'}
                strokeWidth={entry.miete_aenderung_prozent === 0 ? 3 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Variation Cards */}
      <div className="grid grid-cols-5 gap-2 mt-6">
        {variationen.map((v, index) => (
          <div
            key={index}
            className={`p-3 rounded-xl text-center transition-all ${
              v.miete_aenderung_prozent === 0
                ? 'bg-amber-100 border-2 border-amber-400 ring-2 ring-amber-200'
                : v.selbsttragend
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
            }`}
          >
            <p className="text-xs text-slate/60 mb-1">
              {v.miete_aenderung_prozent === 0
                ? 'Aktuell'
                : `${v.miete_aenderung_prozent > 0 ? '+' : ''}${v.miete_aenderung_prozent}%`
              }
            </p>
            <p className="font-bold text-sm">
              {formatCurrency(v.monatliche_miete)}
            </p>
            <p className={`text-xs font-medium mt-1 ${v.monatlicher_cashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {v.monatlicher_cashflow >= 0 ? '+' : ''}{v.monatlicher_cashflow.toFixed(0)}€
            </p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-700">
          <span className="font-bold">Erkenntnis: </span>
          {breakEvenMiete
            ? `Ab einer Miete von ${formatCurrency(breakEvenMiete.monatliche_miete)} ist die Immobilie selbsttragend.`
            : 'Bei keiner der getesteten Miethöhen ist die Immobilie selbsttragend.'
          }
        </p>
      </div>
    </div>
  );
}

export default RentalVariations;
