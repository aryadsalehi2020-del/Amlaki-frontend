import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Impressum() {
  const navigate = useNavigate();

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


  const sectionStyle = {
    marginBottom: '2rem',
  };

  const h2Style = {
    color: C.heading,
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
    letterSpacing: '-0.02em',
  };

  const pStyle = {
    color: C.body,
    fontSize: '0.95rem',
    lineHeight: 1.7,
    marginBottom: '0.5rem',
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.body,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: '100vh',
        filter: 'none',
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          background: 'rgba(250,247,242,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${C.border}`,
        }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: C.body, background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.body)}
          >
            <ArrowLeft size={16} />
            Zurück zur Startseite
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-28 pb-16 px-5">
        <div className="max-w-3xl mx-auto">
          <h1
            style={{
              color: C.heading,
              fontSize: '2.25rem',
              fontWeight: 800,
              marginBottom: '2rem',
              letterSpacing: '-0.035em',
            }}
          >
            Impressum
          </h1>

          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '1rem',
              padding: '2rem',
            }}
          >
            {/* Angaben gemaess § 5 TMG */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>Angaben gemäß § 5 TMG</h2>
              <p style={pStyle}>
                Arya Salehi<br />
                [Adresse wird nachgetragen]<br />
                Deutschland
              </p>
            </div>

            {/* Kontakt */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>Kontakt</h2>
              <p style={pStyle}>
                E-Mail: kontakt@amlaki.de<br />
                Support: support@amlaki.de
              </p>
            </div>

            {/* Verantwortlich */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <p style={pStyle}>
                Arya Salehi<br />
                [Adresse wird nachgetragen]
              </p>
            </div>

            {/* Haftungsausschluss */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>Haftungsausschluss</h2>

              <h3
                style={{
                  color: C.heading,
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                Haftung für Inhalte
              </h3>
              <p style={pStyle}>
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt.
                Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
                können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind
                wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
                den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind
                wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
                gespeicherte fremde Informationen zu überwachen oder nach Umständen
                zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
                Informationen nach den allgemeinen Gesetzen bleiben hiervon
                unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
                Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
                Inhalte umgehend entfernen.
              </p>

              <h3
                style={{
                  color: C.heading,
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                Haftung für Links
              </h3>
              <p style={pStyle}>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren
                Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
                fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
                der Seiten verantwortlich. Die verlinkten Seiten wurden zum
                Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
                Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
                erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten
                Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung
                nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
                derartige Links umgehend entfernen.
              </p>
            </div>

            {/* Urheberrecht */}
            <div style={{ marginBottom: 0 }}>
              <h2 style={h2Style}>Urheberrecht</h2>
              <p style={pStyle}>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
                diesen Seiten unterliegen dem deutschen Urheberrecht. Die
                Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
                schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                Downloads und Kopien dieser Seite sind nur für den privaten, nicht
                kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser
                Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte
                Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
                gekennzeichnet. Sollten Sie trotzdem auf eine
                Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
                entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
                werden wir derartige Inhalte umgehend entfernen.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-8 px-5"
        style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs" style={{ color: C.khaki }}>
            &copy; {new Date().getFullYear()} AmlakI. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/datenschutz')}
              className="text-xs transition-colors duration-200"
              style={{ color: C.khaki, background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.khaki)}
            >
              Datenschutz
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
