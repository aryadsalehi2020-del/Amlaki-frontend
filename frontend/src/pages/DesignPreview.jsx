import React, { useEffect, useRef, useState } from 'react';

// Premium Design v11 - Better Images + Good Labels
const DesignPreview = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef(null);

  // VIDEO SEQUENCE - Same style, dark cinematic city, like one continuous shot
  const images = [
    // 1. ORIGINAL - Dark dramatic city buildings
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=95&auto=format',
    // 2. Same style - dark city looking up at buildings
    'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=1920&q=95&auto=format',
    // 3. Same style - dark modern architecture
    'https://images.unsplash.com/photo-1478860409698-8707f313ee8b?w=1920&q=95&auto=format',
    // 4. Same style - dark skyscrapers looking up
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=95&auto=format',
  ];

  // GOOD LABELS
  const chapters = [
    {
      title: 'Analyse',
      subtitle: 'Datengetrieben entscheiden',
      stat: { value: '2.847', label: 'Objekte analysiert' }
    },
    {
      title: 'Rendite',
      subtitle: 'Potenzial erkennen',
      stat: { value: '12.4%', label: 'Ø Eigenkapitalrendite' }
    },
    {
      title: 'Cashflow',
      subtitle: 'Passives Einkommen',
      stat: { value: '+847€', label: 'Ø monatlicher Cashflow' }
    },
    {
      title: 'Portfolio',
      subtitle: 'Vermögen aufbauen',
      stat: { value: '156M€', label: 'verwaltetes Volumen' }
    },
  ];

  // Preload images
  useEffect(() => {
    let loaded = 0;
    images.forEach(src => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === images.length) setImagesLoaded(true);
      };
      img.src = src;
    });
  }, []);

  // Ultra smooth scroll with lerp
  useEffect(() => {
    let current = 0;
    let target = 0;
    let rafId;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      target = Math.min(scrollTop / docHeight, 1);
      current = lerp(current, target, 0.06);
      setScrollProgress(current);
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Smooth mouse parallax
  useEffect(() => {
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;
    let rafId;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 12;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 12;
    };

    const animate = () => {
      currentX = lerp(currentX, mouseX, 0.04);
      currentY = lerp(currentY, mouseY, 0.04);
      setMousePos({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const totalImages = images.length;
  const progressPerImage = 1 / totalImages;
  const currentIndex = Math.min(Math.floor(scrollProgress / progressPerImage), totalImages - 1);
  const localProgress = (scrollProgress - (currentIndex * progressPerImage)) / progressPerImage;
  const currentChapter = chapters[currentIndex];

  // Easing functions
  const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const icons = {
    arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>,
    play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
    chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-6"/></svg>,
    shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    coin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12m-4-8h8m-6 4h4"/></svg>,
    building: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4"/></svg>,
  };

  const features = [
    { icon: 'chart', label: 'KI-Analyse', desc: 'In Sekunden' },
    { icon: 'shield', label: 'Due Diligence', desc: 'Risiken erkennen' },
    { icon: 'coin', label: 'Förderungen', desc: 'Bis 70%' },
    { icon: 'building', label: 'Portfolio', desc: 'Im Blick' },
  ];

  const styles = {
    container: {
      backgroundColor: '#000',
      color: '#fff',
      minHeight: '500vh',
      position: 'relative',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },

    fixedViewport: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#000',
    },

    imageLayer: (index) => {
      let opacity = 0;
      let scale = 1;
      let x = 0;
      let y = 0;

      const transitionStart = 0.4;
      const transitionProgress = Math.max(0, (localProgress - transitionStart) / (1 - transitionStart));

      if (index === currentIndex) {
        // Current image: move left and zoom in slightly (walking forward)
        opacity = 1 - easeInOutCubic(transitionProgress);
        scale = 1 + (localProgress * 0.08);
        x = -localProgress * 8; // Move left as if walking past
        y = localProgress * 2; // Slight upward movement
      } else if (index === currentIndex + 1) {
        // Next image: slide in from right (what's ahead)
        opacity = easeInOutCubic(transitionProgress);
        scale = 1.1 - (easeInOutCubic(transitionProgress) * 0.1);
        x = (1 - easeInOutCubic(transitionProgress)) * 15; // Slide in from right
        y = (1 - easeInOutCubic(transitionProgress)) * -3;
      } else if (index < currentIndex) {
        opacity = 0;
        x = -20;
      } else {
        opacity = 0;
        x = 20;
      }

      return {
        position: 'absolute',
        top: '-5%',
        left: '-5%',
        width: '110%',
        height: '110%',
        backgroundImage: `url(${images[index]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity,
        transform: `scale(${scale}) translate3d(${x + mousePos.x * 0.06}%, ${y + mousePos.y * 0.06}%, 0)`,
        willChange: 'transform, opacity',
        transition: 'opacity 0.3s ease-out',
      };
    },

    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: `
        linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%),
        linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.6) 100%)
      `,
      zIndex: 2,
    },

    grain: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0.02,
      pointerEvents: 'none',
      zIndex: 3,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    },

    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '1.8rem 4%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 20,
    },

    logoContainer: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '0.6rem',
    },

    logo: {
      fontSize: '1.4rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: 'rgba(255,255,255,0.7)',
    },

    logoHighlight: {
      color: '#fff',
      fontWeight: 700,
    },

    logoByline: {
      fontSize: '0.95rem',
      fontFamily: "'Reenie Beanie', cursive",
      fontWeight: 400,
      color: 'rgba(255,255,255,0.5)',
      marginLeft: '0.4rem',
      position: 'relative',
      top: '1px',
      transform: 'rotate(-1deg)',
    },

    nav: {
      display: 'flex',
      gap: '2rem',
      alignItems: 'center',
    },

    navLink: {
      fontSize: '0.8rem',
      color: 'rgba(255,255,255,0.5)',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'color 0.3s',
    },

    navButton: {
      padding: '0.55rem 1.2rem',
      fontSize: '0.78rem',
      fontWeight: 500,
      color: '#000',
      backgroundColor: '#fff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      transition: 'all 0.3s',
    },

    mainContent: {
      position: 'absolute',
      top: '50%',
      left: '4%',
      transform: 'translateY(-50%)',
      zIndex: 10,
      maxWidth: '520px',
    },

    titleContainer: {
      opacity: localProgress < 0.6 ? 1 : 1 - easeOutExpo((localProgress - 0.6) / 0.4),
      transform: `translateY(${localProgress * 15}px)`,
    },

    eyebrow: {
      fontSize: '0.68rem',
      fontWeight: 500,
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.4)',
      marginBottom: '1rem',
    },

    mainTitle: {
      fontSize: 'clamp(3rem, 8vw, 5.5rem)',
      fontWeight: 600,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      margin: 0,
      marginBottom: '0.6rem',
    },

    subtitle: {
      fontSize: '1.1rem',
      fontWeight: 300,
      color: 'rgba(255,255,255,0.6)',
      marginBottom: '2rem',
    },

    statCard: {
      display: 'inline-flex',
      flexDirection: 'column',
      padding: '1.2rem 1.8rem',
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: '1.8rem',
    },

    statValue: {
      fontSize: '2.2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      fontVariantNumeric: 'tabular-nums',
    },

    statLabel: {
      fontSize: '0.72rem',
      color: 'rgba(255,255,255,0.45)',
      marginTop: '0.2rem',
    },

    ctaGroup: {
      display: 'flex',
      gap: '0.8rem',
      alignItems: 'center',
    },

    primaryCta: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.85rem 1.5rem',
      fontSize: '0.82rem',
      fontWeight: 500,
      color: '#000',
      backgroundColor: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    },

    secondaryCta: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.85rem 1.3rem',
      fontSize: '0.82rem',
      fontWeight: 500,
      color: 'rgba(255,255,255,0.9)',
      backgroundColor: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s',
    },

    // Features bar at bottom
    featuresBar: {
      position: 'absolute',
      bottom: '5rem',
      left: '4%',
      right: '4%',
      display: 'flex',
      gap: '1px',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '10px',
      overflow: 'hidden',
      zIndex: 10,
      opacity: scrollProgress < 0.15 ? 1 : Math.max(0, 1 - (scrollProgress - 0.15) / 0.15),
      transition: 'opacity 0.4s',
    },

    featureItem: {
      flex: 1,
      padding: '1rem 1.2rem',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      cursor: 'pointer',
      transition: 'background 0.3s',
    },

    featureIcon: {
      color: 'rgba(255,255,255,0.6)',
    },

    featureLabel: {
      fontSize: '0.8rem',
      fontWeight: 500,
    },

    featureDesc: {
      fontSize: '0.65rem',
      color: 'rgba(255,255,255,0.4)',
      marginTop: '0.1rem',
    },

    // Right side
    rightSide: {
      position: 'absolute',
      right: '4%',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '2rem',
      zIndex: 20,
    },

    progressDots: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },

    progressDot: (index) => ({
      width: '6px',
      height: index === currentIndex ? '28px' : '6px',
      borderRadius: '3px',
      backgroundColor: index === currentIndex ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    }),

    chapterInfo: {
      textAlign: 'right',
    },

    chapterNumber: {
      fontSize: '0.6rem',
      letterSpacing: '0.2em',
      color: 'rgba(255,255,255,0.3)',
      marginBottom: '0.3rem',
    },

    chapterName: {
      fontSize: '0.9rem',
      fontWeight: 500,
      color: 'rgba(255,255,255,0.6)',
    },

    // Bottom
    bottomBar: {
      position: 'absolute',
      bottom: '1.5rem',
      left: '4%',
      right: '4%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 20,
    },

    progressText: {
      fontSize: '0.7rem',
      color: 'rgba(255,255,255,0.3)',
      fontVariantNumeric: 'tabular-nums',
    },

    scrollHint: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: scrollProgress < 0.03 ? 1 : 0,
      transition: 'opacity 0.4s',
    },

    scrollText: {
      fontSize: '0.6rem',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.3)',
    },

    scrollIcon: {
      width: '16px',
      height: '26px',
      borderRadius: '8px',
      border: '1.5px solid rgba(255,255,255,0.2)',
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '4px',
    },

    scrollDot: {
      width: '2px',
      height: '4px',
      backgroundColor: 'rgba(255,255,255,0.4)',
      borderRadius: '1px',
      animation: 'scrollMove 1.6s ease-in-out infinite',
    },

    loading: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      opacity: imagesLoaded ? 0 : 1,
      pointerEvents: imagesLoaded ? 'none' : 'auto',
      transition: 'opacity 0.6s ease',
    },

    loadingText: {
      fontSize: '0.7rem',
      letterSpacing: '0.3em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.3)',
    },
  };

  const keyframes = `
    @import url('https://fonts.googleapis.com/css2?family=Reenie+Beanie&display=swap');

    /* Hide ALL scrollbars */
    html, body, * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    html::-webkit-scrollbar,
    body::-webkit-scrollbar,
    *::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
    }

    @keyframes scrollMove {
      0%, 100% { transform: translateY(0); opacity: 0.8; }
      50% { transform: translateY(5px); opacity: 0.2; }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>

      <div style={styles.loading}>
        <span style={styles.loadingText}>Laden...</span>
      </div>

      <div ref={containerRef} style={styles.container}>
        <div style={styles.fixedViewport}>
          {images.map((_, index) => (
            <div key={index} style={styles.imageLayer(index)} />
          ))}

          <div style={styles.overlay} />
          <div style={styles.grain} />

          <header style={styles.header}>
            <div style={styles.logoContainer}>
              <div style={styles.logo}>
                <span style={styles.logoHighlight}>A</span>MLAK<span style={styles.logoHighlight}>I</span>
              </div>
              <span style={styles.logoByline}>by Arya Salehi</span>
            </div>
            <nav style={styles.nav}>
              <span style={styles.navLink}>Features</span>
              <span style={styles.navLink}>Preise</span>
              <span style={styles.navLink}>Über uns</span>
              <button
                style={styles.navButton}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 20px rgba(255,255,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Login
              </button>
            </nav>
          </header>

          <div style={styles.mainContent}>
            <div style={styles.titleContainer}>
              <p style={styles.eyebrow}>Immobilien Investment Platform</p>
              <h1 style={styles.mainTitle}>{currentChapter.title}</h1>
              <p style={styles.subtitle}>{currentChapter.subtitle}</p>

              <div style={styles.statCard}>
                <span style={styles.statValue}>{currentChapter.stat.value}</span>
                <span style={styles.statLabel}>{currentChapter.stat.label}</span>
              </div>

              <div style={styles.ctaGroup}>
                <button
                  style={styles.primaryCta}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 30px rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Kostenlos starten {icons.arrow}
                </button>
                <button
                  style={styles.secondaryCta}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                >
                  {icons.play} Demo
                </button>
              </div>
            </div>
          </div>

          <div style={styles.rightSide}>
            <div style={styles.progressDots}>
              {images.map((_, index) => (
                <div key={index} style={styles.progressDot(index)} />
              ))}
            </div>
            <div style={styles.chapterInfo}>
              <p style={styles.chapterNumber}>{String(currentIndex + 1).padStart(2, '0')} / {String(totalImages).padStart(2, '0')}</p>
              <p style={styles.chapterName}>{currentChapter.title}</p>
            </div>
          </div>

          <div style={styles.featuresBar}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={styles.featureItem}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={styles.featureIcon}>{icons[feature.icon]}</div>
                <div>
                  <div style={styles.featureLabel}>{feature.label}</div>
                  <div style={styles.featureDesc}>{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.bottomBar}>
            <span style={styles.progressText}>{Math.round(scrollProgress * 100)}%</span>
            <div style={styles.scrollHint}>
              <span style={styles.scrollText}>Scroll</span>
              <div style={styles.scrollIcon}>
                <div style={styles.scrollDot} />
              </div>
            </div>
            <span style={styles.progressText}>AMLAKI</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default DesignPreview;
