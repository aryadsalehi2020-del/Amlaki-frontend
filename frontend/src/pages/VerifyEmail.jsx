import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../config';

const C = {
  bg: '#EFE8DA', card: '#FFFFFF', border: '#E8E0D4',
  textDark: '#2C2418', textMid: '#3D3526', muted: '#8C7E6A',
  accent: '#7C8B6F', accentDark: '#5A6B4F', error: '#B85C5C',
};

function Shell({ children }) {
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
        }}>{children}</div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    fetch(`${API_BASE}/auth/verify-email/${token}`, { method: 'POST' })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) setState({ status: data.already_verified ? 'already' : 'success' });
        else if (r.status === 410) setState({ status: 'expired' });
        else setState({ status: 'invalid' });
      })
      .catch(() => setState({ status: 'invalid' }));
  }, [token]);

  if (state.status === 'loading') {
    return <Shell><p style={{ color: C.muted, margin: 0 }}>Wird bestätigt ...</p></Shell>;
  }

  if (state.status === 'success' || state.status === 'already') {
    return (
      <Shell>
        <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent, fontWeight: 700 }}>
          {state.status === 'already' ? 'Bereits aktiviert' : 'E-Mail bestätigt'}
        </p>
        <h1 style={{ margin: '0 0 16px 0', color: C.textDark, fontSize: 28, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {state.status === 'already' ? 'Account ist schon aktiv' : 'Account ist aktiv'}
        </h1>
        <p style={{ margin: '0 0 28px 0', color: C.textMid, fontSize: 15, lineHeight: 1.6 }}>
          Du kannst dich jetzt einloggen und deine erste Analyse starten.
        </p>
        <Link to="/login" style={{
          display: 'inline-block', padding: '14px 28px',
          background: C.textDark, color: '#FFFFFF',
          fontSize: 15, fontWeight: 600,
          textDecoration: 'none', borderRadius: 10, letterSpacing: '0.01em',
        }}>Zum Login &nbsp;&rarr;</Link>
      </Shell>
    );
  }

  if (state.status === 'expired') {
    return (
      <Shell>
        <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.error, fontWeight: 700 }}>
          Link abgelaufen
        </p>
        <h1 style={{ margin: '0 0 16px 0', color: C.textDark, fontSize: 26, lineHeight: 1.25, fontWeight: 700 }}>
          Dieser Bestätigungslink ist abgelaufen
        </h1>
        <p style={{ margin: '0 0 24px 0', color: C.textMid, fontSize: 15, lineHeight: 1.6 }}>
          Logg dich kurz mit deiner E-Mail ein, dann schicken wir dir einen neuen Link.
        </p>
        <Link to="/login" style={{
          display: 'inline-block', padding: '14px 28px',
          background: C.textDark, color: '#FFFFFF',
          fontSize: 15, fontWeight: 600,
          textDecoration: 'none', borderRadius: 10, letterSpacing: '0.01em',
        }}>Zum Login &nbsp;&rarr;</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.error, fontWeight: 700 }}>
        Ungültig
      </p>
      <h1 style={{ margin: '0 0 16px 0', color: C.textDark, fontSize: 26, lineHeight: 1.25, fontWeight: 700 }}>
        Dieser Bestätigungslink existiert nicht
      </h1>
      <p style={{ margin: 0, color: C.textMid, fontSize: 15, lineHeight: 1.6 }}>
        Prüfe den Link aus der Mail oder schreib uns: <a href="mailto:arya@amlaki.de" style={{ color: C.accentDark }}>arya@amlaki.de</a>
      </p>
    </Shell>
  );
}
