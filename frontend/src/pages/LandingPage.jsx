import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  TrendingUp,
  MessageSquare,
  ClipboardCheck,
  Scale,
  Brain,
  Coins,
  Search,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Shield,
  BarChart3,
  Building2,
  MapPin,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

/* -------------------------------------------------- */
/*  Intersection Observer hook for fade-in animations  */
/* -------------------------------------------------- */
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.15, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
}

/* -------------------------------------------------- */
/*  Animated section wrapper                          */
/* -------------------------------------------------- */
function FadeInSection({ children, className = '', delay = 0 }) {
  const [ref, isInView] = useInView();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s, transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------- */
/*  Logo component                                    */
/* -------------------------------------------------- */
function Logo({ size = 'default' }) {
  const textClass = size === 'large' ? 'text-2xl' : 'text-xl';
  return (
    <span className={`${textClass} font-bold tracking-tight select-none`}>
      <span style={{ color: '#7C8B6F' }} className="font-extrabold">A</span>
      <span style={{ color: '#2C2418' }}>mlak</span>
      <span style={{ color: '#7C8B6F' }} className="font-extrabold">I</span>
    </span>
  );
}

/* -------------------------------------------------- */
/*  Feature data                                      */
/* -------------------------------------------------- */
const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Marktwertanalyse',
    description: 'Bewertung auf Basis realer Transaktionsdaten und Bodenrichtwerte \u2013 nach anerkannten Verfahren.',
  },
  {
    icon: MessageSquare,
    title: 'Verhandlungsberatung',
    description: 'Datengest\u00fctzte Strategien mit konkreten Argumenten f\u00fcr deine Preisverhandlung.',
  },
  {
    icon: ClipboardCheck,
    title: 'Besichtigungsprotokoll',
    description: 'Systematische Pr\u00fcfung aller Gewerke \u2013 von Dach bis Elektrik, nach Sachverst\u00e4ndigen-Standard.',
  },
  {
    icon: Scale,
    title: 'Steuer- und AfA-Optimierung',
    description: 'AfA, Zinsabzug und F\u00f6rderungen berechnet. Cashflow vor und nach Steuer auf einen Blick.',
  },
  {
    icon: Brain,
    title: 'Pers\u00f6nliche KI-Analyse',
    description: 'Fachwissen erfahrener Immobilienexperten und Gutachter \u2013 jederzeit abrufbar.',
  },
  {
    icon: Coins,
    title: 'Finanzierungsanalyse',
    description: 'Kaufnebenkosten, R\u00fccklagen und Cashflow-Prognosen nach bankkonformen Standards.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Objekt erfassen',
    description: 'Inserat-Link eingeben oder Objektdaten manuell erfassen. Unsere KI extrahiert automatisch alle relevanten Kennzahlen.',
  },
  {
    number: '02',
    title: 'Professionelle Analyse',
    description: 'Bewertung nach Ertragswert-, Vergleichswert- und Sachwertverfahren. Abgleich mit aktuellen Transaktionsdaten und F\u00f6rderm\u00f6glichkeiten.',
  },
  {
    number: '03',
    title: 'Informiert handeln',
    description: 'Fundierte Entscheidungsgrundlage mit klarer Handlungsempfehlung, Risikoeinsch\u00e4tzung und konkreten n\u00e4chsten Schritten.',
  },
];

const STATS = [
  { value: '2026', label: 'Marktdaten' },
  { value: '30 Sek', label: 'pro Analyse' },
  { value: '15+', label: 'St\u00e4dte abgedeckt' },
  { value: '24/7', label: 'Verf\u00fcgbar' },
];

const PROBLEMS = [
  {
    icon: Shield,
    title: 'Interessenkonflikt',
    description: 'Makler arbeiten f\u00fcr den Verk\u00e4ufer. Unabh\u00e4ngige Bewertung im K\u00e4uferinteresse fehlt.',
  },
  {
    icon: BarChart3,
    title: 'Informationsasymmetrie',
    description: 'Ohne Transaktionsdaten und Marktanalysen fehlt die Grundlage f\u00fcr faire Preiseinsch\u00e4tzungen.',
  },
  {
    icon: Building2,
    title: 'Komplexit\u00e4t',
    description: 'WEG-Recht, F\u00f6rderungen, Steuern \u2013 der Kaufprozess erfordert Fachwissen aus \u00fcber einem Dutzend Disziplinen.',
  },
];

/* ================================================== */
/*  LANDING PAGE                                      */
/* ================================================== */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  }, []);

  /* ---- colour tokens as inline styles ---- */
  const C = {
    bg: '#FAF7F2',
    bgAlt: '#F5F0E8',
    khaki: '#B5A68C',
    khakiLight: '#C4B89E',
    olive: '#7C8B6F',
    oliveHover: '#6B7A5E',
    heading: '#2C2418',
    body: '#5C4F3D',
    card: '#FFFFFF',
    border: '#E8E0D4',
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.body,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: '100vh',
        overflowX: 'hidden',
        filter: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >

      {/* ===== NAVBAR ===== */}
      <nav
        style={{ background: 'rgba(250,247,242,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.khakiLight}40`, boxShadow: scrolled ? '0 2px 12px rgba(44,36,24,0.06)' : 'none', transition: 'box-shadow 0.3s ease' }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
          <Logo />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              ['features', 'Leistungen'],
              ['how', 'Ablauf'],
              ['pricing', 'Preise'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: C.body, background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.body)}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-200"
              style={{ background: 'transparent', color: C.body, border: `1px solid ${C.border}`, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.khaki)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              Anmelden
            </button>
            <button
              onClick={() => navigate('/analyze')}
              className="text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200"
              style={{ background: C.olive, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.oliveHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.olive)}
            >
              Kostenlos testen
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex items-center justify-center"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.heading, minWidth: '44px', minHeight: '44px' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div
            className="md:hidden px-4 sm:px-5 pb-5 flex flex-col gap-1"
            style={{ background: 'rgba(250,247,242,0.98)' }}
          >
            {[
              ['features', 'Leistungen'],
              ['how', 'Ablauf'],
              ['pricing', 'Preise'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left text-base font-medium rounded-xl"
                style={{ color: C.body, background: 'none', border: 'none', cursor: 'pointer', minHeight: '48px', padding: '12px 8px' }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
              className="text-base font-semibold px-5 rounded-full mt-2 text-center"
              style={{ background: C.olive, color: '#FFFFFF', border: 'none', cursor: 'pointer', minHeight: '48px', lineHeight: '48px' }}
            >
              Anmelden
            </button>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <header className="pt-24 pb-12 md:pt-36 md:pb-24 px-4 sm:px-5">
        <div className="max-w-3xl mx-auto text-center">
          <FadeInSection>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-5 md:mb-6"
              style={{ background: `${C.khaki}12`, color: C.khaki, border: `1px solid ${C.khaki}30` }}
            >
              <Sparkles size={14} style={{ color: C.khaki }} />
              KI-Immobilienanalyse f&uuml;r Käufer und Investoren
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <h1
              className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mb-4 md:mb-5"
              style={{ color: C.heading, letterSpacing: '-0.035em', lineHeight: 1.1 }}
            >
              Kaufen oder lassen?
              <br />
              <span className="text-2xl sm:text-3xl md:text-5xl" style={{ color: C.olive }}>Wir analysieren. Du entscheidest.</span>
            </h1>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <p
              className="text-base sm:text-lg md:text-xl leading-relaxed mb-7 md:mb-8 max-w-xl mx-auto"
              style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}
            >
              Rendite, Cashflow und fairer Preis &ndash; in 30 Sekunden analysiert. Damit du kaufst, was sich rechnet.
            </p>
          </FadeInSection>

          <FadeInSection delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/analyze')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold transition-all duration-200"
                style={{ background: C.olive, color: '#FFFFFF', border: 'none', cursor: 'pointer', minHeight: '48px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.oliveHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.olive)}
              >
                Kostenlos testen
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => scrollTo('showcase')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold transition-all duration-200"
                style={{
                  background: 'transparent',
                  color: C.khaki,
                  border: `1.5px solid ${C.border}`,
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.khaki)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
              >
                So funktioniert's
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: C.khaki }}>
              Erste Analyse gratis -- keine Kreditkarte erforderlich
            </p>
          </FadeInSection>

          {/* Removed icon grid - was too generic */}
          <FadeInSection delay={0.45}>
            <div className="mt-10 md:mt-14 hidden">
              {[].map(([Icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center">
                    <span>{label}</span>
                  </div>
                  <span className="text-xs font-medium text-center">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </header>

      {/* ===== APP SHOWCASE ===== */}
      <section id="showcase" className="py-20 md:py-28 px-4 sm:px-5 overflow-hidden" style={{ background: C.bgAlt }}>
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-10 md:mb-14">
              <span
                className="inline-block text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: C.olive }}
              >
                So sieht es aus
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                Professionelle Analyse in Sekunden
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}>
                Exposé hochladen, KI-Bewertung erhalten, mit deinem persönlichen KI-Assistenten ins Detail gehen.
              </p>
            </div>
          </FadeInSection>

          {/* Phone mockups */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
            {[
              { src: '/screenshots/lp_chart_szenarien.png', label: 'Was-wäre-wenn Szenarien', delay: 0 },
              { src: '/screenshots/lp_score_v2.png', label: 'KI-Bewertung', delay: 0.12, featured: true },
              { src: '/screenshots/lp_chat.png', label: 'Persönlicher KI-Assistent', delay: 0.24 },
            ].map(({ src, label, delay, featured }) => (
              <FadeInSection key={label} delay={delay} className="flex flex-col items-center gap-3">
                <div
                  className="relative rounded-[2rem] overflow-hidden"
                  style={{
                    width: featured ? '220px' : '200px',
                    boxShadow: featured
                      ? '0 25px 60px rgba(44,36,24,0.18), 0 8px 20px rgba(44,36,24,0.08)'
                      : '0 15px 40px rgba(44,36,24,0.12), 0 4px 12px rgba(44,36,24,0.06)',
                    border: `3px solid ${featured ? C.olive + '40' : C.border}`,
                    transform: featured ? 'scale(1)' : 'scale(0.92)',
                    background: C.card,
                  }}
                >
                  <img
                    src={src}
                    alt={label}
                    className="w-full h-auto block"
                    loading="lazy"
                    style={{ borderRadius: 'calc(2rem - 3px)' }}
                  />
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: featured ? C.olive : C.khaki }}
                >
                  {label}
                </span>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Khaki divider */}
      <div className="flex justify-center" style={{ background: C.bg }}>
        <div style={{ width: '60px', height: '2px', background: C.khaki, borderRadius: '1px' }} />
      </div>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-10 md:mb-12">
              <span
                className="inline-block text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: C.olive }}
              >
                Leistungen
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                Professionelle Beratung &ndash; in jedem Schritt des Kaufprozesses
              </h2>
              <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}>
                Jedes Modul basiert auf aktuellem Fachwissen und wird kontinuierlich mit den neuesten Marktdaten, Gesetzes&auml;nderungen und F&ouml;rderprogrammen aktualisiert.
              </p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <FadeInSection key={title} delay={i * 0.08}>
                <div
                  className="rounded-2xl p-5 sm:p-6 h-full transition-shadow duration-300"
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 1px 3px rgba(44,36,24,0.04)',
                    borderTop: `2px solid ${C.khakiLight}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(44,36,24,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(44,36,24,0.04)')}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${C.khaki}15` }}
                  >
                    <Icon size={20} style={{ color: C.khaki }} />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: C.heading }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.body }}>
                    {description}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>

          {/* Mid-page CTA */}
          <FadeInSection delay={0.2}>
            <div className="text-center mt-10 md:mt-14">
              <button
                onClick={() => navigate('/analyze')}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-full text-base font-semibold transition-all duration-200"
                style={{ background: C.olive, color: '#FFFFFF', border: 'none', cursor: 'pointer', minHeight: '48px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.oliveHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.olive)}
              >
                Jetzt kostenlos testen
                <ArrowRight size={18} />
              </button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="py-20 md:py-28 px-4 sm:px-5" style={{ background: C.bgAlt }}>
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-10 md:mb-14">
              <span
                className="inline-block text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: C.olive }}
              >
                Ablauf
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                Von der Objekterfassung zur fundierten Entscheidung
              </h2>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {STEPS.map(({ number, title, description }, i) => (
              <FadeInSection key={number} delay={i * 0.12}>
                <div className="text-left md:text-left">
                  <span
                    className="inline-block text-3xl sm:text-4xl font-extrabold mb-2"
                    style={{ color: C.khaki, letterSpacing: '-0.04em' }}
                  >
                    {number}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: C.heading }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.body }}>
                    {description}
                  </p>
                  {i < STEPS.length - 1 && (
                    <div className="md:hidden mt-6 mb-2" style={{ borderBottom: `1px solid ${C.border}` }} />
                  )}
                  {i < STEPS.length - 1 && (
                    <ChevronRight
                      size={24}
                      className="hidden md:block mx-auto mt-4"
                      style={{ color: C.khakiLight, transform: 'rotate(0deg)' }}
                    />
                  )}
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Khaki divider */}
      <div className="flex justify-center" style={{ background: C.bg }}>
        <div style={{ width: '60px', height: '2px', background: C.khaki, borderRadius: '1px' }} />
      </div>

      {/* ===== STATS / TRUST ===== */}
      <section className="py-20 md:py-24 px-4 sm:px-5" style={{ background: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-8 md:mb-10">
              <h2
                className="text-xl sm:text-2xl md:text-3xl font-bold mb-3"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                Fachlich fundiert. Kontinuierlich aktualisiert.
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}>
                Unsere KI wurde mit dem Fachwissen aus Immobilienbewertung, Miet- und WEG-Recht, Steueroptimierung, F&ouml;rderprogrammen und Finanzierung trainiert &ndash; und wird fortlaufend mit aktuellen Markt- und Rechtsdaten aktualisiert.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div
              className="rounded-2xl p-5 sm:p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
              style={{ background: C.card, border: `1px solid ${C.border}`, borderBottom: `3px solid ${C.khaki}` }}
            >
              {STATS.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div
                    className="text-xl sm:text-2xl md:text-3xl font-bold mb-1"
                    style={{ color: C.khaki, letterSpacing: '-0.02em' }}
                  >
                    {value}
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: C.khaki }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-5" style={{ background: C.bgAlt }}>
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-10 md:mb-12">
              <span
                className="inline-block text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: C.olive }}
              >
                Preise
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                Professionelle Analyse ab 9 €
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}>
                Erste Analyse gratis. Keine Abos, keine versteckten Kosten.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: 'Free', price: '0', unit: '', desc: 'Zum Kennenlernen', credits: '1 Analyse', features: ['Score und Bewertung', 'Cashflow-Berechnung', 'Grundlegende Kennzahlen', 'KI-Chat'], cta: 'Kostenlos starten', popular: false },
              { name: 'Basic', price: '9', unit: '', desc: '1 vollständige Analyse', credits: '1 Analyse', features: ['Alles aus Free', 'Szenarien-Vergleich', 'Förderungen und AfA', 'Fairer Preis Berechnung', 'Verbesserungsvorschläge'], cta: '1 Credit kaufen', popular: false },
              { name: 'Plus', price: '35', unit: '', desc: 'Mehrere Objekte vergleichen', credits: '5 Analysen (7€/St.)', features: ['Alles aus Basic', '5 vollständige Analysen', 'Mengenrabatt 22%', 'Ideal zum Vergleichen'], cta: '5 Credits kaufen', popular: true },
            ].map((plan, i) => (
              <FadeInSection key={plan.name} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-6 sm:p-7 h-full flex flex-col relative"
                  style={{
                    background: C.card,
                    border: plan.popular ? `2px solid ${C.olive}` : `1px solid ${C.border}`,
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: C.olive, color: '#fff' }}>
                      Beliebt
                    </div>
                  )}
                  <h3 className="text-lg font-bold mb-1" style={{ color: C.heading }}>{plan.name}</h3>
                  <p className="text-xs mb-4" style={{ color: C.khaki }}>{plan.desc}</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold" style={{ color: C.heading }}>{plan.price}</span>
                    <span className="text-lg font-bold" style={{ color: C.heading }}> €</span>
                  </div>
                  <p className="text-sm mb-5" style={{ color: C.khaki }}>{plan.credits}</p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm" style={{ color: C.body }}>
                        <CheckCircle2 size={16} style={{ color: C.olive, marginTop: '2px', flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/analyze')}
                    className="w-full py-3 rounded-full font-semibold text-sm transition-all duration-200"
                    style={{
                      background: plan.popular ? C.olive : 'transparent',
                      color: plan.popular ? '#fff' : C.olive,
                      border: plan.popular ? 'none' : `1.5px solid ${C.olive}`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = plan.popular ? C.oliveHover : `${C.olive}10`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = plan.popular ? C.olive : 'transparent'; }}
                  >
                    {plan.cta}
                  </button>
                </div>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection delay={0.3}>
            <p className="text-center text-xs mt-6" style={{ color: C.khaki }}>
              Sichere Zahlung via Stripe. Keine Abos, keine versteckten Kosten.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 md:py-28 px-4 sm:px-5" style={{ background: C.bg }}>
        <div className="max-w-3xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-10 md:mb-12">
              <span
                className="inline-block text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: C.olive }}
              >
                Fragen &amp; Antworten
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                H&auml;ufig gestellte Fragen
              </h2>
            </div>
          </FadeInSection>

          <div className="space-y-4">
            {[
              {
                q: 'Ersetzt AmlakI einen Makler oder Gutachter?',
                a: 'AmlakI liefert eine datenbasierte Ersteinsch\u00e4tzung auf Basis aktueller Marktdaten, Transaktionspreise und anerkannter Bewertungsverfahren. F\u00fcr rechtsverbindliche Gutachten oder komplexe Einzelf\u00e4lle empfehlen wir zus\u00e4tzlich einen Sachverst\u00e4ndigen.',
              },
              {
                q: 'Wie genau ist die KI-Bewertung?',
                a: 'Unsere Analyse basiert auf Ertragswert-, Vergleichswert- und Sachwertverfahren \u2013 den gleichen Methoden, die Banken und Gutachter verwenden. Die KI greift auf aktuelle Bodenrichtwerte, Mietspiegeldaten und Transaktionspreise zu.',
              },
              {
                q: 'F\u00fcr wen ist AmlakI gedacht?',
                a: 'F\u00fcr alle, die eine Immobilie als Kapitalanlage kaufen m\u00f6chten \u2013 vom Erstk\u00e4ufer bis zum erfahrenen Investor. Besonders hilfreich, wenn du Rendite, Cashflow und F\u00f6rderungen schnell einsch\u00e4tzen willst, bevor du einen Makler kontaktierst.',
              },
              {
                q: 'Welche Daten brauche ich f\u00fcr eine Analyse?',
                a: 'Kaufpreis, Wohnfl\u00e4che, Kaltmiete und Baujahr reichen f\u00fcr eine solide Erstanalyse. Je mehr Angaben (Hausgeld, Energieklasse, Lage), desto pr\u00e4ziser wird die Bewertung.',
              },
              {
                q: 'Ist die erste Analyse wirklich kostenlos?',
                a: 'Ja. Du erh\u00e4ltst 1 vollst\u00e4ndige Analyse mit Score, Cashflow-Berechnung, fairem Preis und F\u00f6rderungscheck \u2013 ohne Kreditkarte, ohne Abo.',
              },
              {
                q: 'Wie sch\u00fctzt ihr meine Daten?',
                a: 'Alle Daten werden verschl\u00fcsselt \u00fcbertragen und auf europ\u00e4ischen Servern gespeichert. Wir verkaufen keine Nutzerdaten und geben sie nicht an Dritte weiter. Details findest du in unserer Datenschutzerkl\u00e4rung.',
              },
            ].map(({ q, a }, i) => (
              <FadeInSection key={i} delay={i * 0.06}>
                <details
                  className="group rounded-2xl overflow-hidden"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  <summary
                    className="flex items-center justify-between cursor-pointer px-5 sm:px-6 py-4 sm:py-5 text-sm sm:text-base font-semibold select-none list-none"
                    style={{ color: C.heading }}
                  >
                    {q}
                    <ChevronRight
                      size={18}
                      className="shrink-0 ml-3 transition-transform duration-200 group-open:rotate-90"
                      style={{ color: C.khaki }}
                    />
                  </summary>
                  <div className="px-5 sm:px-6 pb-4 sm:pb-5 text-sm leading-relaxed" style={{ color: C.body }}>
                    {a}
                  </div>
                </details>
              </FadeInSection>
            ))}
          </div>

          {/* FAQ Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  { '@type': 'Question', name: 'Ersetzt AmlakI einen Makler oder Gutachter?', acceptedAnswer: { '@type': 'Answer', text: 'AmlakI liefert eine datenbasierte Ersteinschaetzung auf Basis aktueller Marktdaten, Transaktionspreise und anerkannter Bewertungsverfahren. Fuer rechtsverbindliche Gutachten oder komplexe Einzelfaelle empfehlen wir zusaetzlich einen Sachverstaendigen.' } },
                  { '@type': 'Question', name: 'Wie genau ist die KI-Bewertung?', acceptedAnswer: { '@type': 'Answer', text: 'Die Analyse basiert auf Ertragswert-, Vergleichswert- und Sachwertverfahren - den gleichen Methoden, die Banken und Gutachter verwenden. Die KI greift auf aktuelle Bodenrichtwerte, Mietspiegeldaten und Transaktionspreise zu.' } },
                  { '@type': 'Question', name: 'Fuer wen ist AmlakI gedacht?', acceptedAnswer: { '@type': 'Answer', text: 'Fuer alle, die eine Immobilie als Kapitalanlage kaufen moechten - vom Erstkaeufer bis zum erfahrenen Investor. Besonders hilfreich, wenn du Rendite, Cashflow und Foerderungen schnell einschaetzen willst.' } },
                  { '@type': 'Question', name: 'Welche Daten brauche ich fuer eine Analyse?', acceptedAnswer: { '@type': 'Answer', text: 'Kaufpreis, Wohnflaeche, Kaltmiete und Baujahr reichen fuer eine solide Erstanalyse. Je mehr Angaben (Hausgeld, Energieklasse, Lage), desto praeziser wird die Bewertung.' } },
                  { '@type': 'Question', name: 'Ist die erste Analyse wirklich kostenlos?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. 1 vollstaendige Analyse mit Score, Cashflow-Berechnung, fairem Preis und Foerderungscheck - ohne Kreditkarte, ohne Abo.' } },
                  { '@type': 'Question', name: 'Wie schuetzt ihr meine Daten?', acceptedAnswer: { '@type': 'Answer', text: 'Alle Daten werden verschluesselt uebertragen und auf europaeischen Servern gespeichert. Keine Weitergabe an Dritte.' } },
                ],
              }),
            }}
          />
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 md:py-12 px-4 sm:px-5" style={{ background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8 mb-8">
            <div>
              <Logo />
              <p className="text-sm mt-2" style={{ color: C.khaki }}>
                Dein KI-Immobilienassistent.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6">
              {[
                ['features', 'Leistungen'],
                ['how', 'Ablauf'],
                ['pricing', 'Preise'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="text-sm transition-colors duration-200"
                  style={{ color: C.body, background: 'none', border: 'none', cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.body)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <p className="text-xs" style={{ color: C.khaki }}>
              &copy; {new Date().getFullYear()} AmlakI. Alle Rechte vorbehalten.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                onClick={() => navigate('/impressum')}
                className="text-xs transition-colors duration-200"
                style={{ color: C.khaki, background: 'none', border: 'none', cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.khaki)}
              >
                Impressum
              </button>
              <button
                onClick={() => navigate('/datenschutz')}
                className="text-xs transition-colors duration-200"
                style={{ color: C.khaki, background: 'none', border: 'none', cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.khaki)}
              >
                Datenschutz
              </button>
              <button
                onClick={() => navigate('/blog')}
                className="text-xs transition-colors duration-200"
                style={{ color: C.khaki, background: 'none', border: 'none', cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.khaki)}
              >
                Ratgeber
              </button>
              <a
                href="https://instagram.com/amlaki.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors duration-200"
                style={{ color: C.khaki, minHeight: '44px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.khaki)}
              >
                Instagram
              </a>
              <span className="text-xs flex items-center gap-1" style={{ color: C.khaki, minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                <MapPin size={12} />
                Made in Hamburg
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
