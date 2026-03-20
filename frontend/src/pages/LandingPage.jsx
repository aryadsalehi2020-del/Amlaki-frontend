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
    description: 'Bewertung auf Basis realer Transaktionsdaten, Bodenrichtwerte und aktueller Marktentwicklungen \u2013 nach anerkannten Verfahren der Immobilienwirtschaft.',
  },
  {
    icon: MessageSquare,
    title: 'Verhandlungsberatung',
    description: 'Datengest\u00fctzte Verhandlungsstrategien mit konkreten Argumenten \u2013 entwickelt aus der Analyse tausender erfolgreicher Immobilientransaktionen.',
  },
  {
    icon: ClipboardCheck,
    title: 'Besichtigungsprotokoll',
    description: 'Systematische Pr\u00fcfung aller relevanten Gewerke \u2013 von Dachkonstruktion bis Elektrik. Basierend auf den Pr\u00fcfstandards zertifizierter Bausachverst\u00e4ndiger.',
  },
  {
    icon: Scale,
    title: 'Notar- und Vertragsbegleitung',
    description: 'Verst\u00e4ndliche Aufbereitung aller notariellen Schritte \u2013 Auflassung, Grundbucheintragung, Belastungsvollmacht \u2013 damit du jeden Schritt nachvollziehen kannst.',
  },
  {
    icon: Brain,
    title: 'Pers\u00f6nliche KI-Beratung',
    description: 'Trainiert mit dem Fachwissen erfahrener Immobilienberater, Gutachter und Finanzexperten. Beantwortet komplexe Fragen auf dem Niveau eines Branchenprofis.',
  },
  {
    icon: Coins,
    title: 'Finanzierungsanalyse',
    description: 'Vollst\u00e4ndige Kostenaufstellung inkl. Kaufnebenkosten, Instandhaltungsr\u00fccklagen und Cashflow-Prognosen \u2013 nach bankkonformen Berechnungsstandards.',
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
  { value: '2026', label: 'Datenstand aktualisiert' },
  { value: 'DACH', label: 'DE \u00b7 AT \u00b7 CH Marktabdeckung' },
  { value: '13+', label: 'Fachgebiete integriert' },
  { value: '24/7', label: 'Verf\u00fcgbarkeit' },
];

const PROBLEMS = [
  {
    icon: Shield,
    title: 'Interessenkonflikt bei klassischer Beratung',
    description: 'Makler werden vom Verk\u00e4ufer beauftragt und \u00fcber die Provision verg\u00fctet. Eine unabh\u00e4ngige Bewertung im Interesse des K\u00e4ufers findet dabei selten statt.',
  },
  {
    icon: BarChart3,
    title: 'Informationsasymmetrie am Immobilienmarkt',
    description: 'Ohne Zugang zu Transaktionsdaten, Bodenrichtwerten und Marktanalysen fehlt K\u00e4ufern die Grundlage f\u00fcr eine fundierte Preiseinsch\u00e4tzung.',
  },
  {
    icon: Building2,
    title: 'Komplexit\u00e4t des Kaufprozesses',
    description: 'Bewertungsverfahren, WEG-Recht, F\u00f6rderprogramme, steuerliche Aspekte \u2013 der Immobilienkauf erfordert Fachwissen aus \u00fcber einem Dutzend Disziplinen.',
  },
];

/* ================================================== */
/*  LANDING PAGE                                      */
/* ================================================== */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        filter: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* ===== NAVBAR ===== */}
      <nav
        style={{ background: 'rgba(250,247,242,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.khakiLight}40` }}
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
              onClick={() => navigate('/register')}
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
              Spezialisierte KI-Beratung f&uuml;r Immobilienkäufer im DACH-Raum
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <h1
              className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mb-4 md:mb-5"
              style={{ color: C.heading, letterSpacing: '-0.035em', lineHeight: 1.1 }}
            >
              Immobilienberatung
              <br />
              <span style={{ color: C.olive }}>auf Expertenniveau.</span>
            </h1>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <p
              className="text-base sm:text-lg md:text-xl leading-relaxed mb-7 md:mb-8 max-w-xl mx-auto"
              style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}
            >
              AmlakI vereint das Fachwissen von Immobiliengutachtern, Finanzberatern und Juristen in einer KI, die speziell f&uuml;r den DACH-Immobilienmarkt trainiert wurde. Jede Analyse basiert auf aktuellen Marktdaten, anerkannten Bewertungsverfahren und geltendem Recht.
            </p>
          </FadeInSection>

          <FadeInSection delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold transition-all duration-200"
                style={{ background: C.olive, color: '#FFFFFF', border: 'none', cursor: 'pointer', minHeight: '48px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.oliveHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.olive)}
              >
                Kostenlos testen
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => scrollTo('pricing')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold transition-all duration-200"
                style={{
                  background: 'transparent',
                  color: C.khaki,
                  border: `1.5px solid ${C.khaki}`,
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.khaki)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
              >
                Preise ansehen
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: C.khaki }}>
              Erste Analyse gratis -- keine Kreditkarte erforderlich
            </p>
          </FadeInSection>

          {/* Icon grid – subtle feature preview */}
          <FadeInSection delay={0.45}>
            <div className="mt-10 md:mt-14 grid grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5 max-w-sm sm:max-w-lg md:max-w-2xl mx-auto">
              {[
                [TrendingUp, 'Marktwert'],
                [MessageSquare, 'Verhandlung'],
                [ClipboardCheck, 'Besichtigung'],
                [Scale, 'Notar'],
                [Brain, 'KI-Beratung'],
                [Coins, 'Finanzierung'],
              ].map(([Icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: C.bgAlt, border: `1px solid ${C.border}` }}
                  >
                    <Icon size={20} style={{ color: C.olive }} />
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: C.khaki }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </header>

      {/* ===== PROBLEM ===== */}
      <section className="py-14 md:py-24 px-4 sm:px-5" style={{ background: C.bgAlt }}>
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-10 md:mb-12">
              <span
                className="inline-block text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: C.olive }}
              >
                Ausgangslage
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                style={{ color: C.heading, letterSpacing: '-0.025em' }}
              >
                Warum K&auml;ufer eine unabh&auml;ngige Beratung brauchen
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}>
                Der Immobilienkauf ist eine der gr&ouml;&szlig;ten finanziellen Entscheidungen im Leben &ndash; und eine der intransparentesten.
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {PROBLEMS.map(({ icon: Icon, title, description }, i) => (
              <FadeInSection key={title} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-5 sm:p-6 h-full"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: C.bgAlt }}
                  >
                    <Icon size={20} style={{ color: C.olive }} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: C.heading }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.body }}>
                    {description}
                  </p>
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

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-14 md:py-24 px-4 sm:px-5" style={{ background: C.bg }}>
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
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="py-14 md:py-24 px-4 sm:px-5" style={{ background: C.bgAlt }}>
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

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(({ number, title, description }, i) => (
              <FadeInSection key={number} delay={i * 0.12}>
                <div className="text-center md:text-left">
                  <span
                    className="inline-block text-4xl sm:text-5xl font-extrabold mb-3"
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
      <section className="py-14 md:py-20 px-4 sm:px-5" style={{ background: C.bg }}>
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
                Unsere KI wurde mit dem Fachwissen aus Immobilienbewertung, Miet- und WEG-Recht, Steueroptimierung, F&ouml;rderprogrammen und Finanzierung trainiert &ndash; und wird fortlaufend mit aktuellen Markt- und Rechtsdaten aus dem DACH-Raum aktualisiert.
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
      <section id="pricing" className="py-14 md:py-24 px-4 sm:px-5" style={{ background: C.bgAlt }}>
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
                Professionelle Analyse ab 4,99
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: C.body, fontSize: 'max(16px, 1rem)' }}>
                Erste Analyse gratis. Keine Abos, keine versteckten Kosten. Zum Vergleich: Ein Immobiliengutachter kostet 500-2.000.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: 'Gratis', price: '0', unit: '', desc: 'Zum Kennenlernen', credits: '1 Analyse', features: ['Score und Bewertung', 'Cashflow-Berechnung', 'Grundlegende Kennzahlen', 'KI-Chat'], cta: 'Kostenlos starten', popular: false },
              { name: 'Starter', price: '4,99', unit: '', desc: 'Einzelne Analyse', credits: '1 Analyse', features: ['Alles aus Gratis', 'Szenarien-Vergleich', 'Foerderungen und AfA', 'Fairer Preis Berechnung', 'Verbesserungsvorschlaege'], cta: 'Analyse kaufen', popular: false },
              { name: 'Investor', price: '19,99', unit: '', desc: 'Fuer ernsthafte Kaeufer', credits: '5 Analysen (3,99/St.)', features: ['Alles aus Starter', '5 vollstaendige Analysen', 'Mengenrabatt 20%', 'Ideal zum Vergleichen'], cta: 'Paket kaufen', popular: true },
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
                    {plan.price !== '0' && <span className="text-lg font-bold" style={{ color: C.heading }}> EUR</span>}
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
                    onClick={() => navigate('/register')}
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
              Sichere Zahlung via Stripe. Auch 10er-Paket verfuegbar (29,99 / 2,99 pro Analyse).
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 md:py-12 px-4 sm:px-5" style={{ background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8 mb-8">
            <div>
              <Logo />
              <p className="text-sm mt-2" style={{ color: C.khaki }}>
                Dein KI-Immobilienberater f&uuml;r den DACH-Raum.
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
            <div className="flex items-center gap-4">
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
                Made in Frankfurt
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
