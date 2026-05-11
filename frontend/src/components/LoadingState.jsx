import React, { useState, useEffect } from 'react';

const TIPS = [
  'Kaufnebenkosten liegen bei 7-12% des Kaufpreises',
  'Eigenkapital ab 20% verbessert den Zinssatz deutlich',
  'Energieklasse A+ kann bis zu 650 EUR/qm mehr wert sein',
  'Immer mindestens 3 Bankangebote vergleichen',
  'WEG-Protokolle der letzten 3 Jahre immer anfordern',
  'Grundbuch Abteilung II auf Belastungen pruefen',
];

function LoadingState({ message, streamingPreview }) {
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => { setTipIdx(p => (p + 1) % TIPS.length); setTipVisible(true); }, 400);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  // Live-Token-Stream Preview: ersetzt die rotierenden Tipps sobald die KI tippt.
  // Der Roh-Output ist JSON, wir zeigen nur "lesbare" Stuecke (Buchstaben + Spaces),
  // damit der User echte Bewegung sieht ohne Klammern/Anfuehrungszeichen-Soup.
  const cleanedPreview = streamingPreview
    ? streamingPreview.replace(/[{}\[\]"\\,]/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  const showLivePreview = cleanedPreview.length > 0;

  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      {/* Three dots - calm fade animation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="loading-dot" />
        ))}
      </div>

      <p style={{ color: '#2C2418', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
        {message || 'Analyse wird erstellt'}
      </p>
      <p style={{ color: '#8C7E6A', fontSize: '13px', marginBottom: '48px' }}>
        Das kann einen Moment dauern
      </p>

      {showLivePreview ? (
        <div style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '14px 18px',
          background: 'rgba(124, 139, 111, 0.06)',
          border: '1px solid rgba(124, 139, 111, 0.18)',
          borderRadius: '12px',
          textAlign: 'left',
          fontSize: '13px',
          lineHeight: '1.5',
          color: '#5C4F3D',
          fontStyle: 'italic',
          minHeight: '56px',
          transition: 'all 0.2s ease',
        }}>
          <span style={{ opacity: 0.6, marginRight: 6 }}>...</span>
          {cleanedPreview}
          <span className="loading-dot" style={{ marginLeft: 4, transform: 'translateY(2px)', display: 'inline-block' }} />
        </div>
      ) : (
        <div style={{
          transition: 'opacity 0.5s ease',
          opacity: tipVisible ? 1 : 0,
        }}>
          <p style={{ color: '#5C4F3D', fontSize: '13px' }}>{TIPS[tipIdx]}</p>
        </div>
      )}
    </div>
  );
}

export default LoadingState;
