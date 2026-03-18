import React, { useState, useEffect } from 'react';

const FACTS = [
  { t: 'Munchen: 9.000+ EUR/m2', s: 'Spitzenreiter bei Immobilienpreisen' },
  { t: '50% Eigentumsquote', s: 'Eine der niedrigsten in Europa' },
  { t: '+75% seit 2010', s: 'Durchschnittliche Wertsteigerung' },
  { t: 'Berlin +200%', s: 'Von gunstigster Hauptstadt zum Boom' },
  { t: 'Klasse A+ = +20%', s: 'Energieeffizienz steigert den Wert' },
  { t: '20% EK = bessere Zinsen', s: '0,3-0,5% Zinsvorteil' },
];

function LoadingState({ message }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * FACTS.length));
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVis(false);
      setTimeout(() => { setIdx(p => (p + 1) % FACTS.length); setVis(true); }, 300);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="py-24 text-center fade-in">
      <div className="w-12 h-12 mx-auto mb-12 relative">
        <div className="absolute inset-0 border-2 border-[#E8E0D4] rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-[#7C8B6F] rounded-full animate-spin" style={{ animationDuration: '1s' }} />
      </div>

      <p className="text-[#2C2418] text-[17px] font-medium tracking-tight mb-2">{message || 'Analyse lauft...'}</p>
      <p className="text-[#8C7E6A] text-[14px] mb-16">Bewertung wird erstellt</p>

      <div className="max-w-[200px] mx-auto mb-16">
        <div className="h-[3px] bg-[#E8E0D4] rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-[#B5A68C] rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
        </div>
      </div>

      <div className={`transition-all duration-300 ${vis ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-[#5C4F3D] text-[14px] font-medium">{FACTS[idx].t}</p>
        <p className="text-[#8C7E6A] text-[13px] mt-1">{FACTS[idx].s}</p>
      </div>
    </div>
  );
}

export default LoadingState;
