import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import blogArticles from '../data/blogArticles';

const C = {
  bg: '#FAF7F2',
  olive: '#7C8B6F',
  khaki: '#B5A68C',
  dark: '#2C2418',
  border: '#E8E0D4',
  body: '#5C4F3D',
  muted: '#8C7E6A',
  card: '#FFFFFF',
  bgAlt: '#F5F0E8',
};

export default function BlogIndex() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Helmet>
        <title>Immobilien-Ratgeber | AmlakI</title>
        <meta name="description" content="Fachwissen fuer Kapitalanleger: Rendite berechnen, Steuern optimieren, Foerderungen nutzen. Verstaendlich erklaert von AmlakI." />
        <link rel="canonical" href="https://amlaki.de/blog" />
      </Helmet>

      {/* Navbar */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'rgba(250, 247, 242, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
              <span style={{ color: C.olive }}>A</span>
              <span style={{ color: C.dark }}>mlak</span>
              <span style={{ color: C.olive }}>I</span>
            </span>
          </Link>
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: C.muted,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
          >
            Zurueck zur Startseite
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 48, textAlign: 'center', padding: '120px 20px 48px' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: C.dark, marginBottom: 12, letterSpacing: '-0.03em' }}>
          Immobilien-Ratgeber
        </h1>
        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: C.muted, maxWidth: 520, margin: '0 auto' }}>
          Fachwissen fuer Kapitalanleger -- verstaendlich erklaert.
        </p>
      </section>

      {/* Article Grid */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))',
            gap: 24,
          }}
        >
          {blogArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 20px', background: C.bg }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>
            {new Date().getFullYear()} AmlakI -- amlaki.de
          </span>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link to="/impressum" style={{ fontSize: 13, color: C.khaki, textDecoration: 'none' }}>Impressum</Link>
            <Link to="/datenschutz" style={{ fontSize: 13, color: C.khaki, textDecoration: 'none' }}>Datenschutz</Link>
            <a href="https://amlaki.de" style={{ fontSize: 13, color: C.khaki, textDecoration: 'none' }}>amlaki.de</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ArticleCard({ article }) {
  const [hovered, setHovered] = React.useState(false);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Link
      to={`/blog/${article.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 28,
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          boxShadow: hovered ? '0 8px 30px rgba(44,36,24,0.08)' : '0 1px 3px rgba(44,36,24,0.04)',
          transform: hovered ? 'translateY(-2px)' : 'none',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            color: C.olive,
            background: 'rgba(124,139,111,0.1)',
            padding: '4px 10px',
            borderRadius: 20,
            marginBottom: 14,
            alignSelf: 'flex-start',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {article.category}
        </span>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 10, lineHeight: 1.35, letterSpacing: '-0.02em' }}>
          {article.title}
        </h2>
        <p style={{ fontSize: 14, color: C.body, lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
          {article.excerpt}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: C.muted }}>
          <span>{formattedDate}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.khaki }} />
          <span>{article.readingTime}</span>
        </div>
      </div>
    </Link>
  );
}
