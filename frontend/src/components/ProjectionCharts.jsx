import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../constants';

// Simple chart components without external library
function ProjectionCharts({ analysisData }) {
  const [activeChart, setActiveChart] = useState('cashflow');
  const [hoveredYear, setHoveredYear] = useState(null);

  const projection = useMemo(() => {
    if (!analysisData) return null;

    const kaufpreis = analysisData.kaufpreis || 300000;
    const kaltmiete = analysisData.kaltmiete || 950;
    const hausgeld = analysisData.hausgeld || 280;
    const zinssatz = (analysisData.zinssatz || 3.75) / 100;
    const tilgungssatz = (analysisData.tilgung || 1.5) / 100;
    const eigenkapital = analysisData.eigenkapital || kaufpreis * 0.12;
    const kredit = Math.max(kaufpreis - eigenkapital, 0) || kaufpreis;

    const jahresRate = kredit * (zinssatz + tilgungssatz);
    const nichtUmlagefaehig = hausgeld * 0.35;

    let restschuld = kredit;
    let immowert = kaufpreis;
    const jahre = [];

    for (let jahr = 0; jahr <= 30; jahr++) {
      const zinsen = restschuld * zinssatz;
      const tilgung = Math.min(jahresRate - zinsen, restschuld);

      // Mietsteigerung 2% p.a.
      const mieteJahr = (kaltmiete * 12) * Math.pow(1.02, jahr);
      // Wertsteigerung 2% p.a.
      immowert = kaufpreis * Math.pow(1.02, jahr);

      const cashflowJahr = mieteJahr - jahresRate - (nichtUmlagefaehig * 12);

      jahre.push({
        jahr,
        miete: Math.round(mieteJahr),
        zinsen: Math.round(zinsen),
        tilgung: Math.round(tilgung),
        restschuld: Math.round(restschuld),
        immowert: Math.round(immowert),
        eigenkapitalImObjekt: Math.round(immowert - restschuld),
        cashflow: Math.round(cashflowJahr),
        cashflowKumuliert: 0 // Will be calculated
      });

      restschuld = Math.max(0, restschuld - tilgung);
    }

    // Kumulierten Cashflow berechnen
    let kumuliert = 0;
    jahre.forEach(j => {
      kumuliert += j.cashflow;
      j.cashflowKumuliert = kumuliert;
    });

    // Zusammenfassung
    const letztes = jahre[30];
    return {
      jahre,
      zusammenfassung: {
        endwertImmobilie: letztes.immowert,
        restschuld: letztes.restschuld,
        eigenkapitalImObjekt: letztes.eigenkapitalImObjekt,
        gesamtCashflow: letztes.cashflowKumuliert,
        anfangsEK: eigenkapital,
        vermoegenszuwachs: letztes.eigenkapitalImObjekt - eigenkapital,
        renditeGesamt: Math.round(((letztes.eigenkapitalImObjekt / eigenkapital) - 1) * 100),
        jahrBisSchuldenfrei: jahre.findIndex(j => j.restschuld === 0) || 30
      }
    };
  }, [analysisData]);

  if (!projection) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4] text-center">
        <p className="text-[#8C7E6A]">Keine Daten für Projektion verfügbar</p>
      </div>
    );
  }

  const charts = [
    { id: 'cashflow', label: 'Cashflow', icon: '' },
    { id: 'tilgung', label: 'Tilgung', icon: '' },
    { id: 'vermoegen', label: 'Vermögen', icon: '' },
    { id: 'zinsen', label: 'Zinsen vs. Tilgung', icon: '' }
  ];

  // Find max values for scaling
  const maxCashflow = Math.max(...projection.jahre.map(j => Math.abs(j.cashflow)));
  const maxImmowert = Math.max(...projection.jahre.map(j => j.immowert));
  const maxRestschuld = projection.jahre[0].restschuld;

  const getBarHeight = (value, max) => {
    if (max === 0) return 0;
    return Math.min(Math.abs(value / max) * 80, 80);
  };

  const data = projection.jahre.filter((_, i) => i % 5 === 0 || i === 30);

  return (
    <div className="space-y-6">
      {/* Chart Selector */}
      <div className="flex flex-wrap gap-2">
        {charts.map((chart) => (
          <button
            key={chart.id}
            onClick={() => setActiveChart(chart.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeChart === chart.id
                ? 'bg-[#7C8B6F] text-[#2C2418]'
                : 'bg-[#F5F0E8] text-[#8C7E6A] hover:bg-white/10 hover:text-[#2C2418] border border-[#E8E0D4]'
            }`}
          >
            <span>{chart.icon}</span>
            {chart.label}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8E0D4]">
        <h3 className="text-lg font-bold text-[#2C2418] mb-6 flex items-center gap-2">
          {charts.find(c => c.id === activeChart)?.icon}
          {activeChart === 'cashflow' && '30-Jahres Cashflow-Projektion'}
          {activeChart === 'tilgung' && 'Schuldenabbau über Zeit'}
          {activeChart === 'vermoegen' && 'Vermögensaufbau'}
          {activeChart === 'zinsen' && 'Zinsen vs. Tilgung im Zeitverlauf'}
        </h3>

        {/* Simple Bar Chart */}
        <div className="relative h-64 flex items-end gap-2">
          {activeChart === 'cashflow' && data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div
                className="relative w-full flex flex-col items-center justify-center"
                style={{ height: '200px' }}
                onMouseEnter={() => setHoveredYear(d.jahr)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {/* Positive bar (above center) */}
                <div className="h-1/2 w-full flex items-end justify-center">
                  {d.cashflow >= 0 && (
                    <div
                      className="w-8 bg-[#7C8B6F] rounded-t-lg transition-all"
                      style={{ height: `${getBarHeight(d.cashflow, maxCashflow)}px` }}
                    />
                  )}
                </div>

                {/* Zero line */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-white/30" />

                {/* Negative bar (below center) */}
                <div className="h-1/2 w-full flex items-start justify-center">
                  {d.cashflow < 0 && (
                    <div
                      className="w-8 bg-red-500 rounded-b-lg transition-all"
                      style={{ height: `${getBarHeight(d.cashflow, maxCashflow)}px` }}
                    />
                  )}
                </div>

                {/* Tooltip */}
                {hoveredYear === d.jahr && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#FAF7F2] border border-[#E8E0D4] rounded-xl text-sm z-10 whitespace-nowrap">
                    <p className="font-bold text-[#2C2418]">Jahr {d.jahr}</p>
                    <p className={d.cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}>
                      Cashflow: {formatCurrency(d.cashflow)}/Jahr
                    </p>
                    <p className="text-[#B5A68C]">Kumuliert: {formatCurrency(d.cashflowKumuliert)}</p>
                  </div>
                )}
              </div>
              <span className="text-xs text-[#B5A68C] mt-2">J{d.jahr}</span>
            </div>
          ))}

          {activeChart === 'tilgung' && data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div
                className="relative w-full flex items-end justify-center"
                style={{ height: '200px' }}
                onMouseEnter={() => setHoveredYear(d.jahr)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                <div
                  className="w-8 bg-gradient-to-t from-[#7C8B6F] to-[#B5A68C] rounded-t-lg transition-all"
                  style={{ height: `${(d.restschuld / maxRestschuld) * 180}px` }}
                />

                {hoveredYear === d.jahr && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#FAF7F2] border border-[#E8E0D4] rounded-xl text-sm z-10 whitespace-nowrap">
                    <p className="font-bold text-[#2C2418]">Jahr {d.jahr}</p>
                    <p className="text-[#7C8B6F]">Restschuld: {formatCurrency(d.restschuld)}</p>
                    <p className="text-[#7C8B6F]">Getilgt: {formatCurrency(maxRestschuld - d.restschuld)}</p>
                  </div>
                )}
              </div>
              <span className="text-xs text-[#B5A68C] mt-2">J{d.jahr}</span>
            </div>
          ))}

          {activeChart === 'vermoegen' && data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div
                className="relative w-full flex items-end justify-center gap-1"
                style={{ height: '200px' }}
                onMouseEnter={() => setHoveredYear(d.jahr)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {/* Immobilienwert */}
                <div
                  className="w-4 bg-[#7C8B6F]/50 rounded-t-lg"
                  style={{ height: `${(d.immowert / maxImmowert) * 180}px` }}
                />
                {/* Eigenkapital im Objekt */}
                <div
                  className="w-4 bg-[#7C8B6F] rounded-t-lg"
                  style={{ height: `${(d.eigenkapitalImObjekt / maxImmowert) * 180}px` }}
                />

                {hoveredYear === d.jahr && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#FAF7F2] border border-[#E8E0D4] rounded-xl text-sm z-10 whitespace-nowrap">
                    <p className="font-bold text-[#2C2418]">Jahr {d.jahr}</p>
                    <p className="text-[#7C8B6F]">Immobilienwert: {formatCurrency(d.immowert)}</p>
                    <p className="text-[#7C8B6F]">Ihr Eigenkapital: {formatCurrency(d.eigenkapitalImObjekt)}</p>
                    <p className="text-[#B5A68C]">Restschuld: {formatCurrency(d.restschuld)}</p>
                  </div>
                )}
              </div>
              <span className="text-xs text-[#B5A68C] mt-2">J{d.jahr}</span>
            </div>
          ))}

          {activeChart === 'zinsen' && data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div
                className="relative w-full flex items-end justify-center gap-0.5"
                style={{ height: '200px' }}
                onMouseEnter={() => setHoveredYear(d.jahr)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {/* Zinsen */}
                <div
                  className="w-3 bg-red-400 rounded-t-lg"
                  style={{ height: `${(d.zinsen / projection.jahre[0].zinsen) * 150}px` }}
                />
                {/* Tilgung */}
                <div
                  className="w-3 bg-[#7C8B6F] rounded-t-lg"
                  style={{ height: `${Math.min((d.tilgung / projection.jahre[0].zinsen) * 150, 180)}px` }}
                />

                {hoveredYear === d.jahr && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#FAF7F2] border border-[#E8E0D4] rounded-xl text-sm z-10 whitespace-nowrap">
                    <p className="font-bold text-[#2C2418]">Jahr {d.jahr}</p>
                    <p className="text-[#B85C5C]">Zinsen: {formatCurrency(d.zinsen)}/Jahr</p>
                    <p className="text-[#7C8B6F]">Tilgung: {formatCurrency(d.tilgung)}/Jahr</p>
                  </div>
                )}
              </div>
              <span className="text-xs text-[#B5A68C] mt-2">J{d.jahr}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-[#E8E0D4]">
          {activeChart === 'cashflow' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#7C8B6F] rounded" />
                <span className="text-[#8C7E6A] text-sm">Positiver Cashflow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-[#8C7E6A] text-sm">Negativer Cashflow</span>
              </div>
            </>
          )}
          {activeChart === 'tilgung' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-t from-[#7C8B6F] to-[#B5A68C] rounded" />
              <span className="text-[#8C7E6A] text-sm">Verbleibende Restschuld</span>
            </div>
          )}
          {activeChart === 'vermoegen' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#7C8B6F]/50 rounded" />
                <span className="text-[#8C7E6A] text-sm">Immobilienwert</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#7C8B6F] rounded" />
                <span className="text-[#8C7E6A] text-sm">Dein Eigenkapital</span>
              </div>
            </>
          )}
          {activeChart === 'zinsen' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-[#8C7E6A] text-sm">Zinszahlung</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#7C8B6F] rounded" />
                <span className="text-[#8C7E6A] text-sm">Tilgung</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#7C8B6F]/20">
          <p className="text-[#B5A68C] text-xs uppercase tracking-wider mb-1">Nach 30 Jahren</p>
          <p className="text-2xl font-bold text-[#7C8B6F]">{formatCurrency(projection.zusammenfassung.endwertImmobilie)}</p>
          <p className="text-xs text-[#8C7E6A]">Immobilienwert</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8E0D4]">
          <p className="text-[#B5A68C] text-xs uppercase tracking-wider mb-1">Dein Verm&ouml;gen</p>
          <p className="text-2xl font-bold text-[#7C8B6F]">{formatCurrency(projection.zusammenfassung.eigenkapitalImObjekt)}</p>
          <p className="text-xs text-[#8C7E6A]">Eigenkapital im Objekt</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8E0D4]">
          <p className="text-[#B5A68C] text-xs uppercase tracking-wider mb-1">Gesamtrendite</p>
          <p className="text-2xl font-bold text-[#5C4F3D]">{projection.zusammenfassung.renditeGesamt}%</p>
          <p className="text-xs text-[#8C7E6A]">auf Eigenkapital</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-accent/20">
          <p className="text-[#B5A68C] text-xs uppercase tracking-wider mb-1">Cashflow Summe</p>
          <p className={`text-2xl font-bold ${projection.zusammenfassung.gesamtCashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
            {formatCurrency(projection.zusammenfassung.gesamtCashflow)}
          </p>
          <p className="text-xs text-[#8C7E6A]">über 30 Jahre</p>
        </div>
      </div>

      {/* Highlight Box */}
      <div className="bg-white rounded-xl p-5 border border-[#7C8B6F]/20 bg-[#7C8B6F]/5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#7C8B6F]/10 rounded-xl flex items-center justify-center text-2xl">
            
          </div>
          <div>
            <p className="text-[#7C8B6F] font-bold text-lg">
              Aus {formatCurrency(projection.zusammenfassung.anfangsEK)} wurden {formatCurrency(projection.zusammenfassung.eigenkapitalImObjekt)}!
            </p>
            <p className="text-[#8C7E6A]">
              Das ist ein Vermögenszuwachs von {formatCurrency(projection.zusammenfassung.vermoegenszuwachs)} -
              oder {(projection.zusammenfassung.renditeGesamt / 30).toFixed(1)}% p.a. auf dein Eigenkapital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectionCharts;
