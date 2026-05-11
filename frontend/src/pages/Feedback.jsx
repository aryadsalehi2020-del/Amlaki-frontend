import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../config';

// Design language matches Welcome-Mail / Redeem page: warm pastels, sage accent,
// dunkler CTA button. Keine grellen Farben, keine Emojis.
const COLORS = {
  bgOuter: '#EFE8DA',
  card: '#FFFFFF',
  cardBorder: '#E8E0D4',
  textDark: '#2C2418',
  textMid: '#3D3526',
  textMuted: '#8C7E6A',
  accent: '#7C8B6F',
  accentDark: '#5A6B4F',
  giftBg: '#F4EFE2',
  giftBorder: '#E8DCC2',
  buttonBg: '#2C2418',
  buttonBgDisabled: '#B5A68C',
  inputBg: '#FAF7F2',
  inputBorder: '#E8E0D4',
  npsLow: '#C46B5C',  // 0-6 (Detractor)
  npsMid: '#C9A85C',  // 7-8 (Passive)
  npsHigh: '#7C8B6F', // 9-10 (Promoter)
};

function npsColor(n) {
  if (n >= 9) return COLORS.npsHigh;
  if (n >= 7) return COLORS.npsMid;
  return COLORS.npsLow;
}

function NpsButton({ value, selected, onClick }) {
  const active = selected === value;
  const color = npsColor(value);
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      style={{
        flex: '1 1 0',
        minWidth: 32,
        height: 44,
        background: active ? color : '#FFFFFF',
        color: active ? '#FFFFFF' : COLORS.textDark,
        border: `1px solid ${active ? color : COLORS.cardBorder}`,
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        transition: 'all 0.12s ease',
      }}
      aria-label={`Bewertung ${value}`}
      aria-pressed={active}
    >
      {value}
    </button>
  );
}

function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 18px',
        background: selected ? COLORS.accent : '#FFFFFF',
        color: selected ? '#FFFFFF' : COLORS.textDark,
        border: `1px solid ${selected ? COLORS.accent : COLORS.cardBorder}`,
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        transition: 'all 0.12s ease',
      }}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export default function Feedback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [check, setCheck] = useState({ loading: true, valid: false, alreadySubmitted: false, userName: '', userStadt: '', lastScore: null });
  const [nps, setNps] = useState(null);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatMissed, setWhatMissed] = useState('');
  const [wouldPay, setWouldPay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null); // { coupon_code, message }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheck({ loading: false, valid: false, alreadySubmitted: false, userName: '', userStadt: '', lastScore: null });
      return;
    }
    fetch(`${API_BASE}/feedback/check?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setCheck({
        loading: false,
        valid: !!d.valid,
        alreadySubmitted: !!d.already_submitted,
        userName: d.user_name || '',
        userStadt: d.user_stadt || '',
        lastScore: d.last_score == null ? null : Number(d.last_score),
      }))
      .catch(() => setCheck({ loading: false, valid: false, alreadySubmitted: false, userName: '', userStadt: '', lastScore: null }));
  }, [token]);

  const canSubmit = useMemo(() => nps !== null && !submitting, [nps, submitting]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          nps_score: nps,
          what_worked: whatWorked.trim() || null,
          what_missed: whatMissed.trim() || null,
          would_pay: wouldPay || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Fehler ${res.status}`);
      }
      const data = await res.json();
      setSuccess({ coupon_code: data.coupon_code, message: data.message });
    } catch (err) {
      setSubmitError(err.message || 'Etwas ist schiefgegangen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!success?.coupon_code) return;
    try {
      await navigator.clipboard.writeText(success.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked - ignore
    }
  }

  const wrapStyle = {
    minHeight: '100vh',
    background: COLORS.bgOuter,
    padding: '48px 16px',
    fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
    WebkitFontSmoothing: 'antialiased',
  };
  const innerStyle = { maxWidth: 640, margin: '0 auto' };
  const cardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 18,
    padding: '40px 36px',
    boxShadow: '0 1px 0 rgba(44,36,24,0.04)',
  };
  const eyebrowStyle = {
    margin: '0 0 8px 0',
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: COLORS.accent,
    fontWeight: 600,
  };
  const labelStyle = {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.textDark,
    margin: '0 0 8px 0',
  };
  const textareaStyle = {
    width: '100%',
    minHeight: 80,
    padding: '12px 14px',
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 1.5,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  };

  // BRANDING HEADER
  const brandHeader = (
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, background: COLORS.accent, borderRadius: '50%' }} />
        <span style={{ fontSize: 20, letterSpacing: '0.22em', color: COLORS.accent, fontWeight: 700, textTransform: 'uppercase' }}>amlaki</span>
      </Link>
    </div>
  );

  // STATE: Loading
  if (check.loading) {
    return (
      <div style={wrapStyle}>
        <div style={innerStyle}>
          {brandHeader}
          <div style={cardStyle}>
            <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 14 }}>Link wird geprueft...</p>
          </div>
        </div>
      </div>
    );
  }

  // STATE: Invalid token
  if (!check.valid) {
    return (
      <div style={wrapStyle}>
        <div style={innerStyle}>
          {brandHeader}
          <div style={cardStyle}>
            <p style={eyebrowStyle}>Link ungültig</p>
            <h1 style={{ margin: '0 0 16px 0', color: COLORS.textDark, fontSize: 26, lineHeight: 1.2, fontWeight: 700 }}>
              Der Feedback-Link ist abgelaufen
            </h1>
            <p style={{ margin: '0 0 24px 0', color: COLORS.textMid, fontSize: 15, lineHeight: 1.5 }}>
              Feedback-Links sind 60 Tage gueltig. Falls du Feedback geben moechtest, antworte einfach auf die Mail oder schreib mir direkt an arya@amlaki.de.
            </p>
            <Link to="/" style={{ display: 'inline-block', padding: '12px 24px', background: COLORS.buttonBg, color: '#FFF', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // STATE: Success (after submit OR if user already submitted)
  if (success || check.alreadySubmitted) {
    const code = success?.coupon_code || 'FEEDBACK3';
    const isRepeat = !success && check.alreadySubmitted;
    return (
      <div style={wrapStyle}>
        <div style={innerStyle}>
          {brandHeader}
          <div style={cardStyle}>
            <p style={eyebrowStyle}>{isRepeat ? 'Bereits eingelöst' : 'Dein Feedback-Deal'}</p>
            <h1 style={{ margin: '0 0 10px 0', color: COLORS.textDark, fontSize: 28, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Nächste Analyse <span style={{ color: COLORS.accent }}>3&nbsp;€</span> statt <span style={{ textDecoration: 'line-through', color: COLORS.textMuted, fontWeight: 500 }}>9&nbsp;€</span>
            </h1>
            <p style={{ margin: '0 0 22px 0', color: COLORS.textMid, fontSize: 15, lineHeight: 1.55 }}>
              {isRepeat
                ? 'Du hast den Deal bereits aktiviert. Code gilt einmalig pro Account auf die Einzelanalyse.'
                : 'Danke für dein Feedback. Voller Premium-Umfang für dein nächstes Objekt (Fairer Preis, Szenarien, KfW-Förderungen, Verhandlungsmail).'}
            </p>

            <div style={{
              background: COLORS.giftBg,
              border: `1px solid ${COLORS.giftBorder}`,
              borderRadius: 14,
              padding: '20px 24px',
              margin: '0 0 22px 0',
              textAlign: 'center',
            }}>
              <p style={{ margin: '0 0 6px 0', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.accent, fontWeight: 700 }}>
                Rabattcode
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                margin: '4px 0 14px 0',
                fontFamily: "'JetBrains Mono','Menlo','Monaco',monospace",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: COLORS.textDark,
              }}>
                {code}
              </div>
              <div>
                <button
                  type="button"
                  onClick={copyCode}
                  style={{
                    padding: '9px 20px',
                    background: COLORS.accent,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {copied ? 'Kopiert' : 'Code kopieren'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/pricing?coupon=${code}&package=single`)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: COLORS.buttonBg,
                color: '#FFF',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              Einzelanalyse für 3&nbsp;€ kaufen &nbsp;&rarr;
            </button>
            <p style={{ margin: '12px 0 0 0', color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, textAlign: 'center' }}>
              Code gilt einmalig, nur auf die Einzelanalyse (1 Credit).
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE: Form
  const stadtHook = check.userStadt ? ` zu deiner Analyse in ${check.userStadt}` : '';
  return (
    <div style={wrapStyle}>
      <div style={innerStyle}>
        {brandHeader}
        <div style={cardStyle}>
          <p style={eyebrowStyle}>60 Sekunden Feedback</p>
          <h1 style={{ margin: '0 0 12px 0', color: COLORS.textDark, fontSize: 28, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {check.userName ? `Moin ${check.userName}, ` : 'Moin, '}wie war Amlaki bisher?
          </h1>
          <p style={{ margin: '0 0 32px 0', color: COLORS.textMid, fontSize: 16, lineHeight: 1.55 }}>
            Dein ehrliches Feedback{stadtHook} geht direkt an mich. 3 kurze Fragen, danach schalte ich dir deine nächste Analyse für <strong style={{ color: COLORS.textDark }}>3&nbsp;€ statt 9&nbsp;€</strong> frei.
          </p>

          {/* NPS */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Wie wahrscheinlich wuerdest du Amlaki einem Freund empfehlen?</label>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0 6px 0' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <NpsButton key={n} value={n} selected={nps} onClick={setNps} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textMuted, marginTop: 6, letterSpacing: '0.04em' }}>
              <span>Gar nicht</span>
              <span>Auf jeden Fall</span>
            </div>
          </div>

          {/* What worked */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Was hat dir am meisten geholfen? <span style={{ fontWeight: 400, color: COLORS.textMuted }}>(optional)</span></label>
            <textarea
              value={whatWorked}
              onChange={e => setWhatWorked(e.target.value)}
              placeholder="z.B. der Cashflow ist sofort klar geworden, fairer Preis war ueberraschend, Score-Logik leuchtet ein..."
              style={textareaStyle}
              maxLength={1000}
            />
          </div>

          {/* What missed */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Was hat gefehlt oder war verwirrend? <span style={{ fontWeight: 400, color: COLORS.textMuted }}>(optional, aber besonders hilfreich)</span></label>
            <textarea
              value={whatMissed}
              onChange={e => setWhatMissed(e.target.value)}
              placeholder="z.B. zu lange Wartezeit, Begruendungen zu kurz, eine Funktion die du erwartet haettest..."
              style={textareaStyle}
              maxLength={1000}
            />
          </div>

          {/* Would pay */}
          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>Wuerdest du fuer die volle Analyse zahlen? <span style={{ fontWeight: 400, color: COLORS.textMuted }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Pill label="Ja" selected={wouldPay === 'ja'} onClick={() => setWouldPay(wouldPay === 'ja' ? '' : 'ja')} />
              <Pill label="Vielleicht" selected={wouldPay === 'vielleicht'} onClick={() => setWouldPay(wouldPay === 'vielleicht' ? '' : 'vielleicht')} />
              <Pill label="Nein" selected={wouldPay === 'nein'} onClick={() => setWouldPay(wouldPay === 'nein' ? '' : 'nein')} />
            </div>
          </div>

          {submitError && (
            <div style={{
              marginBottom: 16,
              padding: '12px 14px',
              background: 'rgba(196,107,92,0.08)',
              border: `1px solid rgba(196,107,92,0.24)`,
              borderRadius: 10,
              color: '#9A4A3D',
              fontSize: 13,
              lineHeight: 1.5,
            }}>{submitError}</div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '15px 24px',
              background: canSubmit ? COLORS.buttonBg : COLORS.buttonBgDisabled,
              color: '#FFF',
              border: 'none',
              borderRadius: 10,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.01em',
              transition: 'background 0.12s ease',
            }}
          >
            {submitting ? 'Wird abgesendet...' : 'Feedback absenden & 3 €-Deal aktivieren'}
          </button>
          {nps === null && (
            <p style={{ margin: '12px 0 0 0', color: COLORS.textMuted, fontSize: 12, textAlign: 'center' }}>
              Waehl bitte zumindest eine Zahl zwischen 0 und 10.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
