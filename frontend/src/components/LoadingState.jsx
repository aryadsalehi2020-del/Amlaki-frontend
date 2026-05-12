import React, { useState, useEffect } from 'react';

const TIPS = [
  'Kaufnebenkosten liegen bei 7-12% des Kaufpreises',
  'Eigenkapital ab 20% verbessert den Zinssatz deutlich',
  'Energieklasse A+ kann bis zu 650 EUR/qm mehr wert sein',
  'Immer mindestens 3 Bankangebote vergleichen',
  'WEG-Protokolle der letzten 3 Jahre immer anfordern',
  'Grundbuch Abteilung II auf Belastungen pruefen',
];

const STEPS = [
  { key: 'marktdaten', label: 'Marktdaten' },
  { key: 'berechnungen', label: 'Berechnungen' },
  { key: 'ki', label: 'KI-Bewertung' },
];

function StepPill({ label, status }) {
  // status: 'done' | 'active' | 'pending'
  const isDone = status === 'done';
  const isActive = status === 'active';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flex: '0 0 auto',
    }}>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: isDone ? '#7C8B6F' : (isActive ? '#FFFFFF' : '#FFFFFF'),
        border: `1.5px solid ${isDone || isActive ? '#7C8B6F' : '#D8D0BE'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}>
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && (
          <div className="loading-dot" style={{ width: 6, height: 6, background: '#7C8B6F' }} />
        )}
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: isActive ? 600 : 500,
        color: isDone ? '#7C8B6F' : (isActive ? '#2C2418' : '#8C7E6A'),
        transition: 'color 0.3s ease',
      }}>
        {label}
      </span>
    </div>
  );
}

function LoadingState({ message, streamingPreview, currentPhase, progressPct }) {
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => { setTipIdx(p => (p + 1) % TIPS.length); setTipVisible(true); }, 400);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  // Step states based on currentPhase
  // currentPhase: 'marktdaten' | 'berechnungen' | 'ki' | null (initial)
  const stepStatus = (key) => {
    if (!currentPhase) return key === 'marktdaten' ? 'active' : 'pending';
    const order = ['marktdaten', 'berechnungen', 'ki'];
    const currentIdx = order.indexOf(currentPhase);
    const myIdx = order.indexOf(key);
    if (myIdx < currentIdx) return 'done';
    if (myIdx === currentIdx) return 'active';
    return 'pending';
  };

  // Streaming preview, cleaned for casual display (strip JSON syntax)
  const cleanedPreview = streamingPreview
    ? streamingPreview.replace(/[{}\[\]"\\,]/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  const showLivePreview = cleanedPreview.length > 0;
  const pct = Math.max(0, Math.min(100, Math.round(progressPct ?? 0)));

  return (
    <div style={{ padding: '60px 20px 40px 20px' }}>
      {/* Step pills row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 18,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {STEPS.map(s => (
          <StepPill key={s.key} label={s.label} status={stepStatus(s.key)} />
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        maxWidth: 480,
        margin: '0 auto 14px auto',
        height: 6,
        background: '#ECE5D6',
        borderRadius: 999,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #7C8B6F 0%, #9AAB8C 100%)',
          borderRadius: 999,
          transition: 'width 600ms ease-out',
        }} />
      </div>

      {/* Percentage + current label */}
      <div style={{ textAlign: 'center', marginBottom: showLivePreview ? 28 : 24 }}>
        <p style={{
          margin: '0 0 2px 0',
          color: '#2C2418',
          fontSize: 14,
          fontWeight: 600,
        }}>
          {message || 'Analyse wird erstellt'}
        </p>
        <p style={{
          margin: 0,
          color: '#8C7E6A',
          fontSize: 12,
          fontFamily: "'JetBrains Mono','Menlo','Monaco',monospace",
          letterSpacing: '0.04em',
        }}>
          {pct}%
        </p>
      </div>

      {showLivePreview ? (
        <div style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '12px 16px',
          background: 'rgba(124, 139, 111, 0.06)',
          border: '1px solid rgba(124, 139, 111, 0.18)',
          borderRadius: 10,
          textAlign: 'left',
          fontSize: 12,
          lineHeight: '1.5',
          color: '#5C4F3D',
          fontStyle: 'italic',
          minHeight: 48,
          transition: 'all 0.2s ease',
        }}>
          <span style={{ opacity: 0.6, marginRight: 6 }}>...</span>
          {cleanedPreview}
          <span className="loading-dot" style={{ marginLeft: 4, transform: 'translateY(2px)', display: 'inline-block', width: 4, height: 4, background: '#7C8B6F' }} />
        </div>
      ) : (
        <div style={{
          transition: 'opacity 0.5s ease',
          opacity: tipVisible ? 1 : 0,
          textAlign: 'center',
        }}>
          <p style={{ color: '#5C4F3D', fontSize: 12 }}>{TIPS[tipIdx]}</p>
        </div>
      )}
    </div>
  );
}

export default LoadingState;
