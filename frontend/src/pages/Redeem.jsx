import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../config';

const COLORS = {
  bgOuter: '#EFE8DA',
  card: '#FFFFFF',
  cardBorder: '#E8E0D4',
  textDark: '#2C2418',
  textMid: '#3D3526',
  textMuted: '#8C7E6A',
  accent: '#7C8B6F',
  accentDark: '#5A6B4F',
  starInactive: '#E8E0D4',
  starActive: '#C9A85C',
  giftBg: '#F5EFE2',
  giftBorder: '#E8DCC2',
  buttonBg: '#2C2418',
  buttonBgDisabled: '#B5A68C',
};

function Star({ filled, onClick, onHover, onLeave, size = 36 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: 'none',
        border: 'none',
        padding: 4,
        cursor: 'pointer',
        lineHeight: 0,
      }}
      aria-label="Stern"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? COLORS.starActive : COLORS.starInactive}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </button>
  );
}

// Wrapper MUSS ausserhalb der Hauptkomponente leben — sonst wird er bei jedem
// State-Update neu erstellt, React mountet die Children remountet und das
// Textarea verliert seinen Focus nach jedem getippten Zeichen.
function Wrapper({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bgOuter,
      padding: '48px 16px',
      fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 24px' }}>
          <div style={{ width: 8, height: 8, background: COLORS.accent, borderRadius: '50%' }} />
          <span style={{
            fontSize: 18, letterSpacing: '0.22em', color: COLORS.accent,
            fontWeight: 700, textTransform: 'uppercase',
          }}>amlaki</span>
        </div>
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 18,
          padding: '44px 36px',
          boxShadow: '0 1px 0 rgba(44,36,24,0.04)',
        }}>
          {children}
        </div>
        <p style={{
          textAlign: 'center', marginTop: 24,
          color: '#B5A68C', fontSize: 12, letterSpacing: '0.04em', fontWeight: 500,
        }}>
          <Link to="/" style={{ color: '#8C7E6A', textDecoration: 'none' }}>amlaki.de</Link>
          {' · '}Hamburg
        </p>
      </div>
    </div>
  );
}

export default function Redeem() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState({ status: 'loading' }); // loading | valid | used | invalid | submitting | done | error
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/redeem/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.valid) {
          setState({ status: data.reason === 'already_used' ? 'used' : 'invalid', credits: data.credits });
        } else {
          setState({ status: 'valid', credits: data.credits, firstName: data.user_first_name, masked: data.user_email_masked });
        }
      })
      .catch(() => setState({ status: 'invalid' }));
  }, [token]);

  const submit = async () => {
    if (rating < 1) return;
    setState(s => ({ ...s, status: 'submitting' }));
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/redeem/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Fehler');
      setState(s => ({ ...s, status: 'done', credits: data.credits_granted }));
    } catch (e) {
      setErrorMsg(e.message || 'Fehler beim Speichern');
      setState(s => ({ ...s, status: 'valid' }));
    }
  };

  if (state.status === 'loading') {
    return <Wrapper><p style={{ color: COLORS.textMuted, margin: 0 }}>Wird geladen ...</p></Wrapper>;
  }

  if (state.status === 'invalid') {
    return (
      <Wrapper>
        <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.accent, fontWeight: 700 }}>
          Ungültiger Link
        </p>
        <h1 style={{ margin: '0 0 16px 0', color: COLORS.textDark, fontSize: 26, lineHeight: 1.25, fontWeight: 700 }}>
          Dieser Einlöse-Link existiert nicht
        </h1>
        <p style={{ margin: 0, color: COLORS.textMid, fontSize: 15, lineHeight: 1.6 }}>
          Bitte prüfe den Link aus der Mail oder schreib mir eine kurze Nachricht: <a href="mailto:arya@amlaki.de" style={{ color: COLORS.accentDark }}>arya@amlaki.de</a>.
        </p>
      </Wrapper>
    );
  }

  if (state.status === 'used') {
    return (
      <Wrapper>
        <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.accent, fontWeight: 700 }}>
          Schon eingelöst
        </p>
        <h1 style={{ margin: '0 0 16px 0', color: COLORS.textDark, fontSize: 26, lineHeight: 1.25, fontWeight: 700 }}>
          Deine Analyse wartet
        </h1>
        <p style={{ margin: '0 0 24px 0', color: COLORS.textMid, fontSize: 15, lineHeight: 1.6 }}>
          Du hast die Bewertung schon abgegeben. Logg dich ein und nutz deine zweite Analyse.
        </p>
        <Link to="/login" style={{
          display: 'inline-block', padding: '14px 28px',
          background: COLORS.buttonBg, color: '#FFFFFF',
          fontSize: 15, fontWeight: 600,
          textDecoration: 'none', borderRadius: 10, letterSpacing: '0.01em',
        }}>Zum Login &nbsp;&rarr;</Link>
      </Wrapper>
    );
  }

  if (state.status === 'done') {
    return (
      <Wrapper>
        <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.accent, fontWeight: 700 }}>
          Vielen Dank
        </p>
        <h1 style={{ margin: '0 0 16px 0', color: COLORS.textDark, fontSize: 28, lineHeight: 1.2, fontWeight: 700 }}>
          Bewertung gespeichert
        </h1>
        <div style={{
          background: COLORS.giftBg, border: `1px solid ${COLORS.giftBorder}`,
          borderRadius: 10, padding: '18px 22px', margin: '20px 0 28px 0',
        }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A38649', fontWeight: 700 }}>
            Freigeschaltet
          </p>
          <p style={{ margin: 0, color: COLORS.textDark, fontSize: 15, lineHeight: 1.55, fontWeight: 500 }}>
            <strong>Eine zweite Analyse</strong> ist deinem Account gutgeschrieben. Logg dich ein und nutz sie für ein neues oder dasselbe Objekt.
          </p>
        </div>
        <Link to="/login" style={{
          display: 'inline-block', padding: '14px 28px',
          background: COLORS.buttonBg, color: '#FFFFFF',
          fontSize: 15, fontWeight: 600,
          textDecoration: 'none', borderRadius: 10, letterSpacing: '0.01em',
        }}>Zur Analyse &nbsp;&rarr;</Link>
      </Wrapper>
    );
  }

  // status === 'valid' or 'submitting'
  const submitting = state.status === 'submitting';
  const display = hover || rating;
  const ratingLabel = ['', 'Schlecht', 'Ausreichend', 'Okay', 'Gut', 'Sehr gut'][display] || ' ';

  return (
    <Wrapper>
      <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.accent, fontWeight: 700 }}>
        Letzter Schritt
      </p>
      <h1 style={{ margin: '0 0 14px 0', color: COLORS.textDark, fontSize: 28, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em' }}>
        Wie war deine Analyse{state.firstName ? `, ${state.firstName}` : ''}?
      </h1>
      <p style={{ margin: '0 0 28px 0', color: COLORS.textMid, fontSize: 15, lineHeight: 1.6 }}>
        Eine kurze Bewertung &mdash; dann ist deine zweite Analyse freigeschaltet.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
        {[1,2,3,4,5].map(n => (
          <Star
            key={n}
            filled={n <= display}
            onClick={() => setRating(n)}
            onHover={() => setHover(n)}
            onLeave={() => setHover(0)}
          />
        ))}
        <span style={{ marginLeft: 14, color: COLORS.textMuted, fontSize: 14, fontWeight: 500 }}>
          {ratingLabel}
        </span>
      </div>

      <label style={{ display: 'block', marginTop: 22, marginBottom: 8, fontSize: 13, fontWeight: 500, color: COLORS.textMuted, letterSpacing: '0.02em' }}>
        Was war dir wichtig oder hat dir gefehlt? <span style={{ color: '#B5A68C' }}>(optional)</span>
      </label>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Schreib was dir aufgefallen ist ..."
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 14px',
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 10,
          fontFamily: "inherit",
          fontSize: 15, lineHeight: 1.5,
          color: COLORS.textDark,
          background: '#FBF8F1',
          resize: 'vertical',
          outline: 'none',
        }}
      />

      {errorMsg && (
        <p style={{ margin: '14px 0 0 0', color: '#B85C5C', fontSize: 14 }}>{errorMsg}</p>
      )}

      <div style={{ marginTop: 28, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={submit}
          disabled={rating < 1 || submitting}
          style={{
            padding: '14px 28px',
            background: rating < 1 ? COLORS.buttonBgDisabled : COLORS.buttonBg,
            color: '#FFFFFF',
            fontSize: 15, fontWeight: 600,
            border: 'none', borderRadius: 10,
            cursor: rating < 1 || submitting ? 'not-allowed' : 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          {submitting ? 'Wird gesendet ...' : 'Bewertung absenden →'}
        </button>
        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>
          Du bekommst dafür <strong style={{ color: COLORS.textDark }}>1 Analyse-Credit</strong> gutgeschrieben.
        </span>
      </div>
    </Wrapper>
  );
}
