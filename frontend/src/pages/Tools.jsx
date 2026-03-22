import React, { useState, useEffect } from 'react';
import ProjectionCharts from '../components/ProjectionCharts';
import ScenarioSimulator from '../components/ScenarioSimulator';
import FairPriceCalculator from '../components/FairPriceCalculator';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function ToolInputPanel({ data, onChange, showFinancing = true }) {
  const inputClass = "w-full px-3 py-2 bg-white border border-[#E8E0D4] rounded-[8px] text-[#2C2418] text-[13px] focus:border-[#7C8B6F] focus:outline-none focus:ring-2 focus:ring-[#7C8B6F]/10";
  const labelClass = "text-[12px] text-[#8C7E6A] mb-1 block";

  return (
    <div className="bg-white rounded-[16px] p-4 border border-[#E8E0D4] mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[14px] font-semibold text-[#2C2418]">
          Basisdaten anpassen
        </h4>
        <button
          onClick={() => onChange({
            kaufpreis: 320000, kaltmiete: 1050, hausgeld: 320, wohnflaeche: 82,
            eigenkapital: 50000, zinssatz: 3.75, tilgung: 1.5, vergleichspreisProQm: 3800
          })}
          className="text-[12px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors"
        >
          Zur&uuml;cksetzen
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Kaufpreis</label>
          <input type="number" value={data.kaufpreis} onChange={(e) => onChange({ ...data, kaufpreis: parseFloat(e.target.value) || 0 })} className={inputClass} step="10000" />
        </div>
        <div>
          <label className={labelClass}>Wohnfl&auml;che (m&sup2;)</label>
          <input type="number" value={data.wohnflaeche} onChange={(e) => onChange({ ...data, wohnflaeche: parseFloat(e.target.value) || 0 })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Kaltmiete/Monat</label>
          <input type="number" value={data.kaltmiete} onChange={(e) => onChange({ ...data, kaltmiete: parseFloat(e.target.value) || 0 })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Hausgeld/Monat</label>
          <input type="number" value={data.hausgeld} onChange={(e) => onChange({ ...data, hausgeld: parseFloat(e.target.value) || 0 })} className={inputClass} />
        </div>

        {showFinancing && (
          <>
            <div>
              <label className={labelClass}>Eigenkapital</label>
              <input type="number" value={data.eigenkapital} onChange={(e) => onChange({ ...data, eigenkapital: parseFloat(e.target.value) || 0 })} className={inputClass} step="5000" />
            </div>
            <div>
              <label className={labelClass}>Zinssatz (%)</label>
              <input type="number" value={data.zinssatz} onChange={(e) => onChange({ ...data, zinssatz: parseFloat(e.target.value) || 0 })} className={inputClass} step="0.1" min="0" max="15" />
            </div>
            <div>
              <label className={labelClass}>Tilgung (%)</label>
              <input type="number" value={data.tilgung} onChange={(e) => onChange({ ...data, tilgung: parseFloat(e.target.value) || 0 })} className={inputClass} step="0.25" min="0" max="10" />
            </div>
            <div>
              <label className={labelClass}>Marktpreis/m2</label>
              <input type="number" value={data.vergleichspreisProQm} onChange={(e) => onChange({ ...data, vergleichspreisProQm: parseFloat(e.target.value) || 0 })} className={inputClass} step="100" />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E8E0D4] grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[12px] text-[#8C7E6A]">Preis/m2</p>
          <p className="text-[14px] font-semibold text-[#2C2418]">
            {data.wohnflaeche > 0 ? formatCurrency(data.kaufpreis / data.wohnflaeche) : '-'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[12px] text-[#8C7E6A]">Bruttorendite</p>
          <p className="text-[14px] font-semibold text-[#7C8B6F]">
            {data.kaufpreis > 0 ? ((data.kaltmiete * 12 / data.kaufpreis) * 100).toFixed(2) : '0'}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[12px] text-[#8C7E6A]">Kaufpreisfaktor</p>
          <p className="text-[14px] font-semibold text-[#5C4F3D]">
            {data.kaltmiete > 0 ? (data.kaufpreis / (data.kaltmiete * 12)).toFixed(1) : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Tools() {
  const [activeTool, setActiveTool] = useState('projection');
  const [showInputPanel, setShowInputPanel] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [projectionData, setProjectionData] = useState({ kaufpreis: 320000, kaltmiete: 1050, hausgeld: 320, wohnflaeche: 82, eigenkapital: 50000, zinssatz: 3.75, tilgung: 1.5, vergleichspreisProQm: 3800 });
  const [scenarioData, setScenarioData] = useState({ kaufpreis: 280000, kaltmiete: 950, hausgeld: 280, wohnflaeche: 72, eigenkapital: 40000, zinssatz: 3.5, tilgung: 2.0, vergleichspreisProQm: 3600 });
  const [fairpriceData, setFairpriceData] = useState({ kaufpreis: 350000, kaltmiete: 1200, hausgeld: 350, wohnflaeche: 95, eigenkapital: 60000, zinssatz: 4.0, tilgung: 1.25, vergleichspreisProQm: 4000 });

  const tools = [
    { id: 'projection', name: '30-Jahres-Projektion', description: 'Cashflow, Verm\u00f6gensaufbau und Tilgung \u00fcber Zeit' },
    { id: 'scenario', name: 'Szenarien-Simulator', description: '"Was w\u00e4re wenn" Analysen f\u00fcr verschiedene Situationen' },
    { id: 'fairprice', name: 'Fairer Preis', description: 'Berechne den objektiven Marktwert' }
  ];

  const getCurrentToolData = () => {
    switch (activeTool) {
      case 'projection': return { data: projectionData, setData: setProjectionData };
      case 'scenario': return { data: scenarioData, setData: setScenarioData };
      case 'fairprice': return { data: fairpriceData, setData: setFairpriceData };
      default: return null;
    }
  };

  const currentToolData = getCurrentToolData();

  return (
    <div className="px-4 md:px-16 lg:px-20 py-6 md:py-20">
      <div className="max-w-[900px] space-y-5">
        {/* Header */}
        <div className="fade-in">
          <h1 className="text-[26px] md:text-[48px] font-bold tracking-tight text-[#2C2418] leading-[1.05]">
            Profi-Tools
          </h1>
          <p className="text-[#8C7E6A] text-[13px] mt-1">
            M&auml;chtige Werkzeuge f&uuml;r fundierte Immobilienentscheidungen
          </p>
        </div>

        {/* Tool Selector Cards */}
        <div className="grid md:grid-cols-3 gap-3 fade-in fade-in-delay-1">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`bg-white rounded-[16px] p-5 border text-left transition-all ${
                  isActive ? 'border-[#7C8B6F] shadow-sm' : 'border-[#E8E0D4] hover:border-[#B5A68C]'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {isActive && <span className="w-2 h-2 rounded-full bg-[#7C8B6F]" />}
                </div>
                <h3 className={`font-semibold mb-1 text-[14px] ${isActive ? 'text-[#2C2418]' : 'text-[#5C4F3D]'}`}>
                  {tool.name}
                </h3>
                <p className="text-[12px] text-[#8C7E6A]">{tool.description}</p>
              </button>
            );
          })}
        </div>

        {/* Input Panel Toggle */}
        <div className="flex items-center justify-between fade-in">
          <button
            onClick={() => setShowInputPanel(!showInputPanel)}
            className="flex items-center gap-2 text-[13px] text-[#8C7E6A] hover:text-[#5C4F3D] transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showInputPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showInputPanel ? 'Eingaben ausblenden' : 'Eingaben anzeigen'}
          </button>
          <p className="text-[12px] text-[#8C7E6A]">
            Passe die Werte an deine Immobilie an
          </p>
        </div>

        {/* Tool-Specific Input Panel */}
        {showInputPanel && currentToolData && (
          <div className="fade-in">
            <ToolInputPanel data={currentToolData.data} onChange={currentToolData.setData} showFinancing={activeTool !== 'fairprice'} />
          </div>
        )}

        {/* Active Tool Content */}
        <div className="fade-in fade-in-delay-2">
          {activeTool === 'projection' && (
            <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
              <ProjectionCharts analysisData={projectionData} />
            </div>
          )}
          {activeTool === 'scenario' && (
            <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
              <ScenarioSimulator analysisData={scenarioData} />
            </div>
          )}
          {activeTool === 'fairprice' && (
            <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
              <FairPriceCalculator analysisData={fairpriceData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tools;
