import React, { useState } from 'react';

function ScenarioComparison({ szenarien, onSelectScenario }) {
  const [selectedIndex, setSelectedIndex] = useState(1); // Realistisch is default

  if (!szenarien || szenarien.length === 0) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Szenario-Daten verfügbar</p>
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

  const scenarioIcons = {
    'Konservativ': '',
    'Realistisch': '',
    'Optimistisch': ''
  };

  const scenarioColors = {
    'Konservativ': {
      bg: 'from-orange-500/10 to-amber-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      accent: 'text-orange-400',
      ring: 'ring-orange-500/50'
    },
    'Realistisch': {
      bg: 'from-[#7C8B6F]/5 to-[#7C8B6F]/10',
      border: 'border-[#E8E0D4]',
      text: 'text-[#7C8B6F]',
      accent: 'text-[#7C8B6F]',
      ring: 'ring-[#7C8B6F]/50'
    },
    'Optimistisch': {
      bg: 'from-green-500/10 to-emerald-500/10',
      border: 'border-green-500/30',
      text: 'text-[#7C8B6F]',
      accent: 'text-[#7C8B6F]',
      ring: 'ring-green-500/50'
    }
  };

  const handleSelect = (index) => {
    setSelectedIndex(index);
    if (onSelectScenario) {
      onSelectScenario(szenarien[index]);
    }
  };

  return (
    <div>
      <h4 className="text-lg font-bold text-[#2C2418] mb-6 flex items-center gap-2">
        <span className="text-2xl">🎭</span>
        Szenario-Vergleich
      </h4>

      <div className="grid md:grid-cols-3 gap-4">
        {szenarien.map((szenario, index) => {
          const colors = scenarioColors[szenario.name] || scenarioColors['Realistisch'];
          const isSelected = selectedIndex === index;
          const cashflow = szenario.cashflow_analyse;
          const tilgungsplan = szenario.tilgungsplan;

          return (
            <div
              key={szenario.name}
              onClick={() => handleSelect(index)}
              className={`
                relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300
                bg-gradient-to-br ${colors.bg} ${colors.border}
                ${isSelected ? `ring-4 ${colors.ring} shadow-xl scale-[1.02]` : 'hover:shadow-lg hover:scale-[1.01]'}
              `}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{scenarioIcons[szenario.name]}</span>
                <div>
                  <h5 className={`font-bold ${colors.text}`}>{szenario.name}</h5>
                  <p className="text-xs text-[#B5A68C]">{szenario.beschreibung}</p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3">
                {/* Monthly Cashflow */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8C7E6A]">Cashflow/Monat</span>
                  <span className={`font-bold ${cashflow?.monatlicher_cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                    {cashflow?.monatlicher_cashflow >= 0 ? '+' : ''}
                    {formatCurrency(cashflow?.monatlicher_cashflow || 0)}
                  </span>
                </div>

                {/* Annual Cashflow */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8C7E6A]">Cashflow/Jahr</span>
                  <span className={`font-bold ${cashflow?.jaehrlicher_cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                    {cashflow?.jaehrlicher_cashflow >= 0 ? '+' : ''}
                    {formatCurrency(cashflow?.jaehrlicher_cashflow || 0)}
                  </span>
                </div>

                <hr className="border-[#E8E0D4]" />

                {/* Assumptions */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#B5A68C]">Zinssatz</span>
                    <span className={colors.accent}>{szenario.annahmen?.zinssatz}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#B5A68C]">Tilgung</span>
                    <span className={colors.accent}>{szenario.annahmen?.tilgung}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#B5A68C]">Mietsteigerung</span>
                    <span className={colors.accent}>{szenario.annahmen?.mietsteigerung_prozent}%/Jahr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#B5A68C]">Wertsteigerung</span>
                    <span className={colors.accent}>{szenario.annahmen?.wertsteigerung_prozent}%/Jahr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#B5A68C]">Leerstand</span>
                    <span className={colors.accent}>{szenario.annahmen?.leerstand_prozent}%</span>
                  </div>
                </div>

                <hr className="border-[#E8E0D4]" />

                {/* 30-Year Projection */}
                <div className="pt-1">
                  <p className="text-xs text-[#B5A68C] mb-2">Nach 30 Jahren:</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#8C7E6A]">Vermögen</span>
                    <span className={`font-bold text-sm ${colors.text}`}>
                      {formatCurrency(tilgungsplan?.zusammenfassung?.gesamtvermoegen_nach_laufzeit || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Self-Sustaining Badge */}
              <div className={`mt-4 p-2 rounded-lg ${cashflow?.selbsttragend ? 'bg-[#7C8B6F]/10' : 'bg-[#B85C5C]/10'}`}>
                <p className={`text-xs font-medium text-center ${cashflow?.selbsttragend ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                  {cashflow?.selbsttragend ? '✓ Selbsttragend' : '✗ Zuzahlung erforderlich'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-[#F5F0E8] rounded-xl">
        <p className="text-xs text-[#8C7E6A]">
          <span className="font-bold text-[#2C2418]">Tipp:</span> Klicken Sie auf ein Szenario, um es in den Charts oben anzuzeigen.
          Das <span className="text-[#7C8B6F] font-medium">realistische Szenario</span> basiert auf Ihren aktuellen Parametern.
        </p>
      </div>
    </div>
  );
}

export default ScenarioComparison;
