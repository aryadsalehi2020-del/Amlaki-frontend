import React, { useState, useEffect } from 'react';

const TIPS = [
  'Kaufnebenkosten liegen bei 7-12% des Kaufpreises',
  'Eigenkapital ab 20% verbessert den Zinssatz deutlich',
  'Energieklasse A+ kann bis zu 650 EUR/qm mehr wert sein',
  'Immer mindestens 3 Bankangebote vergleichen',
  'WEG-Protokolle der letzten 3 Jahre immer anfordern',
  'Grundbuch Abteilung II auf Belastungen pruefen',
];

function LoadingState({ message }) {
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => { setTipIdx(p => (p + 1) % TIPS.length); setTipVisible(true); }, 400);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      {/* Three dots - calm fade animation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="loading-dot-slow"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>

      <p style={{ color: '#2C2418', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
        {message || 'Analyse wird erstellt'}
      </p>
      <p style={{ color: '#8C7E6A', fontSize: '13px', marginBottom: '48px' }}>
        Das kann einen Moment dauern
      </p>

      <div style={{
        transition: 'opacity 0.5s ease',
        opacity: tipVisible ? 1 : 0,
      }}>
        <p style={{ color: '#5C4F3D', fontSize: '13px' }}>{TIPS[tipIdx]}</p>
      </div>

      <style>{`
        .loading-dot-slow {
          display: block;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background-color: #B5A68C;
          opacity: 0.15;
          animation: loadPulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes loadPulseSlow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default LoadingState;
