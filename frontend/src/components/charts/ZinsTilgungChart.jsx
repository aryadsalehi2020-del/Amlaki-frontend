import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const useChartHeight = (desktopH = 300, mobileH = 220) => {
  const [h, setH] = React.useState(desktopH);
  React.useEffect(() => {
    const update = () => setH(window.innerWidth < 768 ? mobileH : desktopH);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [desktopH, mobileH]);
  return h;
};

function ZinsTilgungChart({ tilgungsplan }) {
  const chartHeight = useChartHeight(300, 220);
  const [showYears, setShowYears] = useState(10);

  if (!tilgungsplan || !tilgungsplan.jahre || tilgungsplan.jahre.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Tilgungsplan-Daten verfügbar</p>
      </div>
    );
  }

  // Take only the selected number of years
  const chartData = tilgungsplan.jahre.slice(0, showYears).map((jahr) => ({
    jahr: `Jahr ${jahr.jahr}`,
    zinsen: jahr.zinsen_jahr,
    tilgung: jahr.tilgung_jahr
  }));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      const zinsenAnteil = payload.find(p => p.dataKey === 'zinsen');
      const tilgungAnteil = payload.find(p => p.dataKey === 'tilgung');

      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate/20">
          <p className="font-bold text-primary mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-red-600">
              Zinsen: {formatCurrency(zinsenAnteil?.value || 0)} ({((zinsenAnteil?.value / total) * 100).toFixed(1)}%)
            </p>
            <p className="text-sm text-green-600">
              Tilgung: {formatCurrency(tilgungAnteil?.value || 0)} ({((tilgungAnteil?.value / total) * 100).toFixed(1)}%)
            </p>
            <hr className="my-2 border-slate/20" />
            <p className="text-sm font-bold text-primary">
              Gesamt: {formatCurrency(total)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate totals
  const totalZinsen = tilgungsplan.zusammenfassung?.gesamte_zinsen || 0;
  const totalTilgung = tilgungsplan.zusammenfassung?.gesamte_tilgung || 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-primary flex items-center gap-2">
          <span className="text-2xl"></span>
          Zinsen vs. Tilgung pro Jahr
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate/60">Anzeige:</span>
          <select
            value={showYears}
            onChange={(e) => setShowYears(Number(e.target.value))}
            className="px-3 py-1 border border-slate/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value={5}>5 Jahre</option>
            <option value={10}>10 Jahre</option>
            <option value={15}>15 Jahre</option>
            <option value={20}>20 Jahre</option>
            <option value={30}>30 Jahre</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="jahr"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={{ stroke: '#94a3b8' }}
            interval={showYears <= 10 ? 0 : 'preserveStartEnd'}
            angle={showYears > 10 ? -45 : 0}
            textAnchor={showYears > 10 ? 'end' : 'middle'}
            height={showYears > 10 ? 60 : 30}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={{ stroke: '#94a3b8' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => (
              <span className={value === 'zinsen' ? 'text-red-600' : 'text-green-600'}>
                {value === 'zinsen' ? 'Zinsen' : 'Tilgung'}
              </span>
            )}
          />
          <Bar dataKey="zinsen" name="zinsen" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
          <Bar dataKey="tilgung" name="tilgung" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <p className="text-sm font-medium text-red-700">Gesamte Zinsen (30 Jahre)</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalZinsen)}</p>
          <p className="text-xs text-red-500 mt-1">
            Das ist Geld, das an die Bank geht
          </p>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <p className="text-sm font-medium text-green-700">Gesamte Tilgung (30 Jahre)</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalTilgung)}</p>
          <p className="text-xs text-green-500 mt-1">
            Das wird zu deinem Eigenkapital
          </p>
        </div>
      </div>

      <p className="text-xs text-slate/60 mt-4 text-center">
        Im Laufe der Zeit verschiebt sich das Verh&auml;ltnis: Anfangs zahlst du mehr Zinsen, sp&auml;ter mehr Tilgung.
      </p>
    </div>
  );
}

export default ZinsTilgungChart;
