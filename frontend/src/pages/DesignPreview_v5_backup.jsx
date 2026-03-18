/**
 * DESIGN PREVIEW V5 - AWARD-WINNING 2026
 *
 * Inspired by: Awwwards SOTD, Linear, Stripe, Vercel
 * Features: Scroll animations, magnetic effects, 3D transforms,
 * noise textures, glowing elements, cinematic transitions
 */

import React, { useState, useEffect, useRef } from 'react';

const DesignPreview = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef(null);

  // Track mouse for magnetic effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => setScrollY(window.scrollY);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // Entrance animation
    setTimeout(() => setLoaded(true), 100);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Parallax calculation
  const parallax = (speed) => scrollY * speed;

  // Colors
  const c = {
    bg: '#050505',
    bgCard: '#0a0a0a',
    bgElevated: '#111111',
    text: '#ffffff',
    textDim: '#888888',
    textMuted: '#555555',
    accent: '#0066FF',
    accentGlow: 'rgba(0, 102, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #0066FF 0%, #00CCFF 50%, #0066FF 100%)',
    success: '#00FF88',
    border: 'rgba(255,255,255,0.06)',
  };

  // Styles
  const styles = {
    // Noise overlay
    noise: {
      position: 'fixed',
      inset: 0,
      opacity: 0.03,
      pointerEvents: 'none',
      zIndex: 1000,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    },

    // Glow orbs
    glowOrb: (x, y, color, size, blur) => ({
      position: 'fixed',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      filter: `blur(${blur}px)`,
      left: x,
      top: y,
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.4,
      transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
    }),

    // Grid lines
    gridLines: {
      position: 'fixed',
      inset: 0,
      backgroundImage: `
        linear-gradient(${c.border} 1px, transparent 1px),
        linear-gradient(90deg, ${c.border} 1px, transparent 1px)
      `,
      backgroundSize: '100px 100px',
      pointerEvents: 'none',
      zIndex: 1,
      opacity: 0.3,
      maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)',
    },

    // Magnetic button
    magneticBtn: {
      position: 'relative',
      padding: '18px 40px',
      fontSize: '0.9375rem',
      fontWeight: 600,
      background: c.accent,
      color: '#fff',
      border: 'none',
      borderRadius: '60px',
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease',
      boxShadow: `0 0 40px ${c.accentGlow}`,
    },

    // Glass card
    glassCard: {
      background: 'rgba(255,255,255,0.02)',
      backdropFilter: 'blur(40px)',
      border: `1px solid ${c.border}`,
      borderRadius: '24px',
      overflow: 'hidden',
    },

    // Gradient border
    gradientBorder: {
      position: 'relative',
      background: c.bgCard,
      borderRadius: '24px',
      padding: '1px',
      backgroundImage: `linear-gradient(${c.bgCard}, ${c.bgCard}), linear-gradient(135deg, ${c.accent}40, transparent 50%, ${c.accent}20)`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
    },
  };

  // Animated counter component
  const AnimatedNumber = ({ value, suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
        { threshold: 0.5 }
      );
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!isVisible) return;
      let start = 0;
      const duration = 2000;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(value * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [isVisible, value]);

    return <span ref={ref}>{count.toLocaleString('de-DE')}{suffix}</span>;
  };

  // Text reveal animation
  const RevealText = ({ children, delay = 0 }) => (
    <span style={{
      display: 'inline-block',
      overflow: 'hidden',
    }}>
      <span style={{
        display: 'inline-block',
        transform: loaded ? 'translateY(0)' : 'translateY(120%)',
        transition: `transform 1s cubic-bezier(0.23, 1, 0.32, 1) ${delay}s`,
      }}>
        {children}
      </span>
    </span>
  );

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        backgroundColor: c.bg,
        color: c.text,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Noise texture overlay */}
      <div style={styles.noise} />

      {/* Animated grid lines */}
      <div style={styles.gridLines} />

      {/* Floating glow orbs */}
      <div style={{
        ...styles.glowOrb('10%', '20%', c.accent, '600px', 150),
        transform: `translate(${parallax(-0.02)}px, ${parallax(-0.05)}px)`,
      }} />
      <div style={{
        ...styles.glowOrb('70%', '60%', '#00CCFF', '400px', 120),
        transform: `translate(${parallax(0.03)}px, ${parallax(-0.03)}px)`,
      }} />
      <div style={{
        ...styles.glowOrb('80%', '-10%', '#0066FF', '500px', 140),
        transform: `translate(${parallax(-0.01)}px, ${parallax(-0.02)}px)`,
      }} />

      {/* Cursor follower glow */}
      <div style={{
        position: 'fixed',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${c.accent}15 0%, transparent 70%)`,
        left: mousePos.x - 200,
        top: mousePos.y - 200,
        pointerEvents: 'none',
        zIndex: 2,
        transition: 'left 0.3s ease-out, top 0.3s ease-out',
      }} />

      {/* ============ NAVIGATION ============ */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '20px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: scrollY > 50 ? 'rgba(5,5,5,0.8)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 50 ? `1px solid ${c.border}` : 'none',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          letterSpacing: '-0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: c.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 900,
          }}>
            A
          </div>
          <span>
            Amlak<span style={{ color: c.accent }}>I</span>
          </span>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
          {['Produkt', 'Features', 'Preise'].map((item, i) => (
            <a
              key={item}
              href="#"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: c.textDim,
                textDecoration: 'none',
                position: 'relative',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.color = c.text}
              onMouseLeave={(e) => e.target.style.color = c.textDim}
            >
              {item}
            </a>
          ))}

          <button style={{
            padding: '12px 24px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'transparent',
            color: c.text,
            border: `1px solid ${c.border}`,
            borderRadius: '60px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            Login
          </button>

          <button style={{
            padding: '12px 24px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: c.text,
            color: c.bg,
            border: 'none',
            borderRadius: '60px',
            cursor: 'pointer',
          }}>
            Starten
          </button>
        </div>
      </nav>

      {/* ============ HERO SECTION ============ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '160px 24px 120px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Floating badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 20px',
          borderRadius: '100px',
          border: `1px solid ${c.border}`,
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(10px)',
          marginBottom: '40px',
          fontSize: '0.875rem',
          color: c.textDim,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1) 0.2s',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: c.success,
            boxShadow: `0 0 12px ${c.success}`,
            animation: 'pulse 2s infinite',
          }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          Version 3.0 ist live
        </div>

        {/* Main headline with reveal animation */}
        <h1 style={{
          fontSize: 'clamp(3.5rem, 10vw, 8rem)',
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: '-0.04em',
          marginBottom: '32px',
          maxWidth: '1200px',
        }}>
          <RevealText delay={0.1}>Die Zukunft der</RevealText>
          <br />
          <span style={{
            background: c.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            <RevealText delay={0.2}>Immobilienanalyse</RevealText>
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: c.textDim,
          maxWidth: '600px',
          lineHeight: 1.7,
          marginBottom: '48px',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s cubic-bezier(0.23, 1, 0.32, 1) 0.5s',
        }}>
          KI-gestützte Renditeanalyse, Risikobewertung und
          Investment-Empfehlungen in Echtzeit.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '80px',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s cubic-bezier(0.23, 1, 0.32, 1) 0.6s',
        }}>
          <button
            style={styles.magneticBtn}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = `0 0 60px ${c.accentGlow}`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = `0 0 40px ${c.accentGlow}`;
            }}
          >
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Jetzt starten
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
            {/* Shine effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'shine 3s infinite',
            }} />
            <style>{`@keyframes shine { 0% { left: -100%; } 50%, 100% { left: 100%; } }`}</style>
          </button>

          <button style={{
            padding: '18px 40px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            background: 'transparent',
            color: c.text,
            border: `1px solid ${c.border}`,
            borderRadius: '60px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s ease',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Demo ansehen
          </button>
        </div>

        {/* Animated Stats */}
        <div style={{
          display: 'flex',
          gap: '80px',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s cubic-bezier(0.23, 1, 0.32, 1) 0.7s',
        }}>
          {[
            { value: 4200, suffix: '+', label: 'Analysen' },
            { value: 98, suffix: '%', label: 'Genauigkeit' },
            { value: 850, suffix: '+', label: 'Nutzer' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                background: c.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div style={{ fontSize: '0.875rem', color: c.textMuted, marginTop: '8px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: c.textMuted,
          fontSize: '0.75rem',
          opacity: scrollY > 100 ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          <span>Scroll</span>
          <div style={{
            width: '24px',
            height: '40px',
            borderRadius: '12px',
            border: `1px solid ${c.border}`,
            position: 'relative',
          }}>
            <div style={{
              width: '4px',
              height: '8px',
              borderRadius: '2px',
              background: c.accent,
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'scrollDown 1.5s infinite',
            }} />
            <style>{`@keyframes scrollDown { 0% { top: 8px; opacity: 1; } 100% { top: 24px; opacity: 0; } }`}</style>
          </div>
        </div>
      </section>

      {/* ============ FEATURES BENTO GRID ============ */}
      <section style={{
        padding: '120px 48px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '80px',
        }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
          }}>
            Alles in einer Plattform
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: c.textDim,
            maxWidth: '500px',
            margin: '0 auto',
          }}>
            Professionelle Tools für fundierte Investment-Entscheidungen
          </p>
        </div>

        {/* Bento Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'repeat(2, 320px)',
          gap: '20px',
        }}>
          {/* Large card - Analysis */}
          <div
            style={{
              gridColumn: 'span 7',
              gridRow: 'span 2',
              ...styles.gradientBorder,
              cursor: 'pointer',
              transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = `0 40px 80px -20px ${c.accentGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              background: c.bgCard,
              borderRadius: '23px',
              height: '100%',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${c.accent}30, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2">
                  <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
                </svg>
              </div>

              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                marginBottom: '12px',
                letterSpacing: '-0.02em',
              }}>
                Echtzeit-Analyse
              </h3>
              <p style={{
                fontSize: '1rem',
                color: c.textDim,
                lineHeight: 1.6,
                marginBottom: '32px',
                maxWidth: '400px',
              }}>
                Kaufpreis, Miete und Nebenkosten eingeben.
                Sofort Rendite, Cashflow und Bewertung erhalten.
              </p>

              {/* Mini visualization */}
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px',
              }}>
                {[65, 85, 45, 90, 70, 55, 95, 80].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: i === 6 ? c.gradient : `${c.accent}30`,
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Small cards */}
          {[
            { icon: 'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18ZM12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z', title: 'KI-Assistent', desc: 'Fragen beantworten lassen' },
            { icon: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z', title: 'Objekt-Library', desc: 'Alle Analysen verwalten' },
            { icon: 'M4 2v20M4 12h16M4 4h14a2 2 0 0 1 2 2v4M4 20h14a2 2 0 0 0 2-2v-4', title: 'Tilgungsplan', desc: '30-Jahre Projektion' },
            { icon: 'M2 12h5l2 9 4-18 3 9h4', title: 'Live-Tracking', desc: 'Echtzeit Updates' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                gridColumn: 'span 5',
                ...styles.glassCard,
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = `${c.accent}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = c.border;
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${c.accent}20, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon}/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                {item.title}
              </h3>
              <p style={{
                fontSize: '0.9375rem',
                color: c.textDim,
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PROPERTY SHOWCASE ============ */}
      <section style={{
        padding: '120px 48px',
        position: 'relative',
        zIndex: 10,
        background: `linear-gradient(180deg, transparent 0%, ${c.bgElevated} 20%, ${c.bgElevated} 80%, transparent 100%)`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Analysierte Objekte
            </h2>
            <p style={{ color: c.textDim, fontSize: '1.0625rem' }}>
              Alle Kennzahlen auf einen Blick
            </p>
          </div>

          {/* Property Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
          }}>
            {[
              { location: 'Frankfurt-Bockenheim', price: '450.000 €', rendite: '4,2%', score: 78, cashflow: '+127 €' },
              { location: 'München-Schwabing', price: '380.000 €', rendite: '3,8%', score: 72, cashflow: '+89 €' },
            ].map((property, i) => (
              <div
                key={i}
                style={{
                  ...styles.glassCard,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = `${c.accent}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = c.border;
                }}
              >
                {/* Image placeholder with gradient */}
                <div style={{
                  height: '200px',
                  background: `linear-gradient(135deg, ${c.bgCard} 0%, ${c.bgElevated} 100%)`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="1" style={{ opacity: 0.3 }}>
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>

                  {/* Score circle */}
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: c.bgCard,
                    border: `3px solid ${property.score >= 70 ? c.success : c.accent}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: property.score >= 70 ? c.success : c.accent,
                    boxShadow: `0 0 20px ${property.score >= 70 ? c.success : c.accent}40`,
                  }}>
                    {property.score}
                  </div>

                  {/* Rendite badge */}
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: `${c.success}15`,
                    border: `1px solid ${c.success}30`,
                    color: c.success,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}>
                    {property.rendite} Rendite
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '4px' }}>
                        {property.location}
                      </h3>
                      <p style={{ fontSize: '0.8125rem', color: c.textMuted }}>
                        3-Zimmer-Wohnung
                      </p>
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      background: c.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      {property.price}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    padding: '16px 0',
                    borderTop: `1px solid ${c.border}`,
                    color: c.textDim,
                    fontSize: '0.875rem',
                  }}>
                    <span>85 m²</span>
                    <span>{property.cashflow}/Monat</span>
                  </div>

                  <button style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    background: 'transparent',
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}>
                    Details ansehen
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section style={{
        padding: '160px 48px',
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '80px',
          borderRadius: '40px',
          background: `linear-gradient(135deg, ${c.accent}10, transparent)`,
          border: `1px solid ${c.accent}20`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            background: `radial-gradient(circle, ${c.accent}20 0%, transparent 60%)`,
            pointerEvents: 'none',
          }} />

          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            position: 'relative',
          }}>
            Bereit zu starten?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: c.textDim,
            marginBottom: '40px',
            position: 'relative',
          }}>
            Analysiere dein erstes Objekt kostenlos
          </p>
          <button
            style={{
              ...styles.magneticBtn,
              padding: '20px 48px',
              fontSize: '1rem',
              position: 'relative',
            }}
          >
            Jetzt kostenlos starten
          </button>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{
        padding: '48px',
        borderTop: `1px solid ${c.border}`,
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          marginBottom: '12px',
        }}>
          Amlak<span style={{ color: c.accent }}>I</span>
        </div>
        <p style={{ color: c.textMuted, fontSize: '0.8125rem' }}>
          Die Zukunft der Immobilienanalyse
        </p>
      </footer>
    </div>
  );
};

export default DesignPreview;
