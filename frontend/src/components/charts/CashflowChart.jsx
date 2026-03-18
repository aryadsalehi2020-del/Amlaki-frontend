import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';

// Hook for responsive chart height
const useChartHeight = (desktopHeight = 350, mobileHeight = 250) => {
  const [height, setHeight] = useState(desktopHeight);

  useEffect(() => {
    const updateHeight = () => {
      setHeight(window.innerWidth < 768 ? mobileHeight : desktopHeight);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [desktopHeight, mobileHeight]);

  return height;
};

function CashflowChart({ szenarien }) {
  if (!szenarien || szenarien.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#F5F0E8] rounded-xl border border-[#E8E0D4]">
        <p className="text-[#8C7E6A]">Keine Szenario-Daten verfügbar</p>
      </div>
    );
  }

  // Prepare data for the chart - combine all scenarios
  const maxJahre = Math.max(
    ...szenarien.map(s => s.tilgungsplan?.jahre?.length || 0)
  );

  const chartData = [];
  for (let i = 0; i < maxJahre; i++) {
    const dataPoint = { jahr: i + 1 };

    szenarien.forEach((szenario) => {
      const jahrDaten = szenario.tilgungsplan?.jahre?.[i];
      if (jahrDaten) {
        const key = szenario.name.toLowerCase();
        dataPoint[key] = jahrDaten.monatlicher_cashflow;
      }
    });

    chartData.push(dataPoint);
  }

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
      return (
        <div className="bg-white p-4 rounded-xl border border-[#E8E0D4]">
          <p className="font-bold text-[#2C2418] mb-2">Jahr {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-semibold">{formatCurrency(entry.value)}/Monat</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartHeight = useChartHeight(350, 250);

  return (
    <div className="w-full">
      <h4 className="text-base md:text-lg font-bold text-[#2C2418] mb-4 md:mb-6 flex items-center gap-2">
        <span className="text-xl md:text-2xl"></span>
        <span className="text-[#2C2418]">Cashflow-Entwicklung über 30 Jahre</span>
      </h4>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorKonservativ" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRealistisch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOptimistisch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="jahr"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            tickLine={{ stroke: '#71717a' }}
            axisLine={{ stroke: '#71717a' }}
            label={{ value: 'Jahr', position: 'insideBottomRight', offset: -5, fill: '#a1a1aa' }}
          />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            tickLine={{ stroke: '#71717a' }}
            axisLine={{ stroke: '#71717a' }}
            tickFormatter={(value) => `${value}€`}
            label={{ value: 'Cashflow/Monat', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span className="text-[#2C2418] capitalize">{value}</span>}
          />
          <ReferenceLine
            y={0}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: 'Break-Even',
              fill: '#ef4444',
              fontSize: 12,
              position: 'right'
            }}
          />

          {/* Konservativ */}
          <Area
            type="monotone"
            dataKey="konservativ"
            stroke="transparent"
            fill="url(#colorKonservativ)"
          />
          <Line
            type="monotone"
            dataKey="konservativ"
            name="Konservativ"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Realistisch */}
          <Area
            type="monotone"
            dataKey="realistisch"
            stroke="transparent"
            fill="url(#colorRealistisch)"
          />
          <Line
            type="monotone"
            dataKey="realistisch"
            name="Realistisch"
            stroke="#00d4ff"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 8, fill: '#00d4ff', stroke: '#fff', strokeWidth: 2 }}
            style={{ filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.5))' }}
          />

          {/* Optimistisch */}
          <Area
            type="monotone"
            dataKey="optimistisch"
            stroke="transparent"
            fill="url(#colorOptimistisch)"
          />
          <Line
            type="monotone"
            dataKey="optimistisch"
            name="Optimistisch"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <p className="text-orange-400 font-semibold">Konservativ</p>
          <p className="text-[#B5A68C] text-xs">Zins +1%, Miete +0.5%/Jahr</p>
        </div>
        <div className="p-3 bg-[#7C8B6F]/5 border border-[#E8E0D4] rounded-xl">
          <p className="text-[#7C8B6F] font-semibold">Realistisch</p>
          <p className="text-[#B5A68C] text-xs">Aktuelle Werte</p>
        </div>
        <div className="p-3 bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 rounded-xl">
          <p className="text-[#7C8B6F] font-semibold">Optimistisch</p>
          <p className="text-[#B5A68C] text-xs">Miete +2.5%/Jahr</p>
        </div>
      </div>
    </div>
  );
}

export default CashflowChart;
