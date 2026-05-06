import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { API_BASE } from '../config';

const C = {
  bg: '#EFE8DA', card: '#FFFFFF', border: '#E8E0D4',
  textDark: '#2C2418', textMid: '#3D3526', muted: '#8C7E6A',
  accent: '#7C8B6F',
};

export default function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email || '';
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent | error

  const resend = async () => {
    if (!email) return;
    setResendState('sending');
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setResendState('sent');
      else setResendState('error');
    } catch {
      setResendState('error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, padding: '48px 16px',
      fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
      WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 24px' }}>
          <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%' }} />
          <span style={{ fontSize: 18, letterSpacing: '0.22em', color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>amlaki</span>
        </div>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 18, padding: '44px 36px', boxShadow: '0 1px 0 rgba(44,36,24,0.04)',
        }}>
          <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent, fontWeight: 700 }}>
            Letzter Schritt
          </p>
          <h1 style={{ margin: '0 0 16px 0', color: C.textDark, fontSize: 28, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Bestätige deine E-Mail
          </h1>
          <p style={{ margin: '0 0 22px 0', color: C.textMid, fontSize: 16, lineHeight: 1.6 }}>
            Wir haben dir eine Mail geschickt{email && (<> an <strong style={{ color: C.textDark }}>{email}</strong></>)}.
            Klicke den Bestätigungs-Link in der Mail und dein Account ist aktiv.
          </p>

          <div style={{
            background: '#F5EFE2', border: `1px solid #E8DCC2`,
            borderRadius: 10, padding: '16px 20px', marginBottom: 28,
          }}>
            <p style={{ margin: '0 0 4px 0', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A38649', fontWeight: 700 }}>
              Wichtig
            </p>
            <p style={{ margin: 0, color: C.textDark, fontSize: 14, lineHeight: 1.55, fontWeight: 500 }}>
              Die Mail kann im <strong>Spam-Ordner</strong> landen — bitte dort auch nachschauen. Die Zustellung dauert in seltenen Fällen 1-2 Minuten.
            </p>
          </div>

          {email && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 22 }}>
              <p style={{ margin: '0 0 12px 0', color: C.muted, fontSize: 13 }}>
                Keine Mail erhalten?
              </p>
              <button onClick={resend} disabled={resendState === 'sending' || resendState === 'sent'}
                style={{
                  padding: '12px 22px',
                  background: resendState === 'sent' ? C.accent : C.textDark,
                  color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                  border: 'none', borderRadius: 10,
                  cursor: resendState === 'sending' || resendState === 'sent' ? 'default' : 'pointer',
                  opacity: resendState === 'sending' ? 0.7 : 1,
                }}>
                {resendState === 'sending' ? 'Wird gesendet ...'
                  : resendState === 'sent' ? 'Mail erneut gesendet'
                  : resendState === 'error' ? 'Fehler — nochmal versuchen'
                  : 'Mail erneut senden'}
              </button>
            </div>
          )}

          <p style={{ marginTop: 28, color: C.muted, fontSize: 13 }}>
            <Link to="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 500 }}>Zurück zum Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
