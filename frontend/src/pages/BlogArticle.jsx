import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
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

export default function BlogArticle() {
  const { slug } = useParams();
  const article = blogArticles.find((a) => a.slug === slug);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const otherArticles = blogArticles.filter((a) => a.slug !== slug).slice(0, 2);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AmlakI',
      url: 'https://amlaki.de',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://amlaki.de/blog/${article.slug}`,
    },
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Helmet>
        <title>{article.metaTitle}</title>
        <meta name="description" content={article.metaDescription} />
        <link rel="canonical" href={`https://amlaki.de/blog/${article.slug}`} />
        <meta property="og:title" content={article.metaTitle} />
        <meta property="og:description" content={article.metaDescription} />
        <meta property="og:url" content={`https://amlaki.de/blog/${article.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="AmlakI" />
        <meta property="article:published_time" content={article.publishedAt} />
        <meta property="article:author" content={article.author} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
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
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
              <span style={{ color: C.olive }}>A</span>
              <span style={{ color: C.dark }}>mlak</span>
              <span style={{ color: C.olive }}>I</span>
            </span>
          </Link>
          <Link
            to="/blog"
            style={{
              fontSize: 13,
              color: C.muted,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
          >
            Alle Artikel
          </Link>
        </div>
      </nav>

      {/* Article Header */}
      <header style={{ paddingTop: 100, maxWidth: 720, margin: '0 auto', padding: '100px 20px 0' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            color: C.olive,
            background: 'rgba(124,139,111,0.1)',
            padding: '4px 10px',
            borderRadius: 20,
            marginBottom: 20,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {article.category}
        </span>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 700, color: C.dark, marginBottom: 16, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
          {article.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: C.muted, flexWrap: 'wrap' }}>
          <span>{formattedDate}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.khaki }} />
          <span>{article.readingTime} Lesezeit</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.khaki }} />
          <span>{article.author}</span>
        </div>
      </header>

      {/* Article Body */}
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>
        <div className="blog-prose">
          {article.body()}
        </div>
      </article>

      {/* More Articles */}
      {otherArticles.length > 0 && (
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 80px' }}>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 24, letterSpacing: '-0.02em' }}>
              Weitere Artikel
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 20 }}>
              {otherArticles.map((a) => (
                <SmallArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 20px', background: C.bg }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
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

function SmallArticleCard({ article }) {
  const [hovered, setHovered] = React.useState(false);

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
          borderRadius: 14,
          padding: 22,
          transition: 'box-shadow 0.3s ease',
          boxShadow: hovered ? '0 6px 24px rgba(44,36,24,0.07)' : '0 1px 3px rgba(44,36,24,0.04)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 600,
            color: C.olive,
            background: 'rgba(124,139,111,0.1)',
            padding: '3px 8px',
            borderRadius: 16,
            marginBottom: 10,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {article.category}
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 8, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
          {article.title}
        </h3>
        <div style={{ fontSize: 12, color: C.muted }}>
          {article.readingTime}
        </div>
      </div>
    </Link>
  );
}
