import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const useChartHeight = (desktopH = 350, mobileH = 250) => {
  const [h, setH] = React.useState(desktopH);
  React.useEffect(() => {
    const update = () => setH(window.innerWidth < 768 ? mobileH : desktopH);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [desktopH, mobileH]);
  return h;
};

function TilgungsChart({ tilgungsplan }) {
  const chartHeight = useChartHeight(350, 260);
  if (!tilgungsplan || !tilgungsplan.jahre || tilgungsplan.jahre.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Tilgungsplan-Daten verfügbar</p>
      </div>
    );
  }

  const chartData = tilgungsplan.jahre.map((jahr) => ({
    jahr: jahr.jahr,
    restschuld: jahr.restschuld,
    eigenkapital: jahr.eigenkapital_aufbau,
    immobilienwert: jahr.immobilienwert,
    gesamtvermoegen: jahr.gesamtvermoegen
  }));

  // Find crossover point (where eigenkapital > restschuld)
  const crossoverJahr = chartData.find(
    (d, i, arr) => i > 0 && d.eigenkapital >= d.restschuld && arr[i-1].eigenkapital < arr[i-1].restschuld
  );

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    }
    return `${(value / 1000).toFixed(0)}k€`;
  };

  const formatCurrencyFull = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate/20">
          <p className="font-bold text-primary mb-2">Jahr {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-semibold">{formatCurrencyFull(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
        <span className="text-2xl"></span>
        Vermögensaufbau: Schulden vs. Eigenkapital
      </h4>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRestschuld" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorEigenkapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorImmobilienwert" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="jahr"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={{ stroke: '#94a3b8' }}
            label={{ value: 'Jahr', position: 'insideBottomRight', offset: -5, fill: '#64748b' }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={{ stroke: '#94a3b8' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span className="text-primary">{value}</span>}
          />
          {crossoverJahr && (
            <ReferenceLine
              x={crossoverJahr.jahr}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: `Kreuzung Jahr ${crossoverJahr.jahr}`, fill: '#f59e0b', fontSize: 11 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="immobilienwert"
            name="Immobilienwert"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#colorImmobilienwert)"
          />
          <Area
            type="monotone"
            dataKey="restschuld"
            name="Restschuld"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#colorRestschuld)"
          />
          <Area
            type="monotone"
            dataKey="eigenkapital"
            name="Eigenkapital"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorEigenkapital)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6">
        <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <p className="text-xs text-red-600 font-medium">Restschuld nach 30 Jahren</p>
          <p className="text-lg font-bold text-red-700">
            {formatCurrencyFull(tilgungsplan.zusammenfassung?.restschuld_nach_laufzeit || 0)}
          </p>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
          <p className="text-xs text-green-600 font-medium">Eigenkapital nach 30 Jahren</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrencyFull(chartData[chartData.length - 1]?.eigenkapital || 0)}
          </p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Gesamtvermögen nach 30 Jahren</p>
          <p className="text-lg font-bold text-purple-700">
            {formatCurrencyFull(tilgungsplan.zusammenfassung?.gesamtvermoegen_nach_laufzeit || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TilgungsChart;
