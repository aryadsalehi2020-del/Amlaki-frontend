import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Datenschutz() {
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

  const h3Style = {
    color: C.heading,
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    marginTop: '1rem',
  };

  const pStyle = {
    color: C.body,
    fontSize: '0.95rem',
    lineHeight: 1.7,
    marginBottom: '0.5rem',
  };

  const ulStyle = {
    color: C.body,
    fontSize: '0.95rem',
    lineHeight: 1.7,
    marginBottom: '0.75rem',
    paddingLeft: '1.5rem',
    listStyleType: 'disc',
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
              marginBottom: '0.5rem',
              letterSpacing: '-0.035em',
            }}
          >
            Datenschutzerklärung
          </h1>
          <p style={{ ...pStyle, marginBottom: '2rem' }}>
            Stand: März 2026
          </p>

          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '1rem',
              padding: '2rem',
            }}
          >
            {/* 1. Verantwortlicher */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>1. Verantwortlicher</h2>
              <p style={pStyle}>
                Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer
                nationaler Datenschutzgesetze sowie sonstiger datenschutzrechtlicher
                Bestimmungen ist:
              </p>
              <p style={pStyle}>
                Arya Salehi<br />
                Tilsiter Strasse 2<br />
                22049 Hamburg<br />
                E-Mail: kontakt@amlaki.de
              </p>
            </div>

            {/* 2. Erhebung und Speicherung personenbezogener Daten */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>
                2. Erhebung und Speicherung personenbezogener Daten
              </h2>

              <h3 style={h3Style}>a) Beim Besuch der Website</h3>
              <p style={pStyle}>
                Beim Aufrufen unserer Website werden durch den auf Ihrem Endgerät
                zum Einsatz kommenden Browser automatisch Informationen an den
                Server unserer Website gesendet. Diese Informationen werden
                temporär in einem sogenannten Logfile gespeichert. Folgende
                Informationen werden dabei ohne Ihr Zutun erfasst und bis zur
                automatisierten Löschung gespeichert:
              </p>
              <ul style={ulStyle}>
                <li>IP-Adresse des anfragenden Rechners</li>
                <li>Datum und Uhrzeit des Zugriffs</li>
                <li>Name und URL der abgerufenen Datei</li>
                <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
                <li>Verwendeter Browser und ggf. das Betriebssystem Ihres Rechners</li>
              </ul>
              <p style={pStyle}>
                Die Rechtsgrundlage für die Datenverarbeitung ist Art. 6 Abs. 1
                lit. f DSGVO. Unser berechtigtes Interesse folgt aus den oben
                aufgelisteten Zwecken zur Datenerhebung.
              </p>

              <h3 style={h3Style}>b) Bei Registrierung (E-Mail)</h3>
              <p style={pStyle}>
                Wenn Sie sich über unser Formular auf der Startseite
                registrieren, erheben wir Ihre E-Mail-Adresse. Die
                Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs.
                1 lit. a DSGVO). Ihre E-Mail-Adresse wird ausschließlich dafür
                verwendet, Sie über den Start von AmlakI und relevante Updates zu
                informieren. Die E-Mail-Adresse wird zusätzlich lokal in Ihrem
                Browser (localStorage) gespeichert, um das Formular korrekt
                darzustellen.
              </p>
              <p style={pStyle}>
                Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie uns
                eine formlose E-Mail an kontakt@amlaki.de
                senden. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
                Datenverarbeitung bleibt vom Widerruf unberührt.
              </p>
            </div>

            {/* 3. Newsletter / Mailchimp */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>3. Newsletter / E-Mail-Marketing (Mailchimp)</h2>
              <p style={pStyle}>
                Für den Versand unserer E-Mail-Benachrichtigungen nutzen wir den
                Dienst Mailchimp der Firma Intuit Inc., 2700 Coast Ave., Mountain
                View, CA 94043, USA. Ihre E-Mail-Adresse wird an Mailchimp
                übermittelt und dort gespeichert.
              </p>
              <p style={pStyle}>
                Mailchimp verfügt über eine Zertifizierung nach dem EU-U.S. Data
                Privacy Framework. Weitere Informationen zum Datenschutz bei
                Mailchimp finden Sie unter:{' '}
                <a
                  href="https://www.intuit.com/privacy/statement/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.olive, textDecoration: 'underline' }}
                >
                  https://www.intuit.com/privacy/statement/
                </a>
              </p>
              <p style={pStyle}>
                Die Rechtsgrundlage ist Ihre Einwilligung gemäß Art. 6 Abs. 1 lit.
                a DSGVO. Sie können den Newsletter jederzeit abbestellen.
              </p>
            </div>

            {/* 4. Cookies */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>4. Cookies</h2>
              <p style={pStyle}>
                Unsere Website verwendet derzeit keine Tracking-Cookies und keine
                Cookies zu Werbezwecken. Es werden lediglich technisch notwendige
                Cookies und lokale Speicherung (localStorage) eingesetzt, die für
                den Betrieb der Website erforderlich sind, z.B. zur
                Authentifizierung und zur Speicherung Ihrer Registrierung.
              </p>
              <p style={pStyle}>
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
                Interesse am technisch einwandfreien Betrieb der Website).
              </p>
            </div>

            {/* 5. Hosting */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>5. Hosting</h2>
              <p style={pStyle}>
                Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut,
                CA 91789, USA gehostet. Beim Besuch unserer Website erfasst Vercel
                automatisch Informationen in sogenannten Server-Logfiles, die Ihr
                Browser automatisch übermittelt (siehe Abschnitt 2a).
              </p>
              <p style={pStyle}>
                Die Nutzung von Vercel erfolgt auf Grundlage von Art. 6 Abs. 1
                lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer
                zuverlässigen Darstellung unserer Website. Vercel verfügt über
                Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO.
              </p>
              <p style={pStyle}>
                Weitere Informationen:{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.olive, textDecoration: 'underline' }}
                >
                  https://vercel.com/legal/privacy-policy
                </a>
              </p>
            </div>

            {/* 6. Ihre Rechte */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>6. Ihre Rechte</h2>
              <p style={pStyle}>
                Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie
                betreffenden personenbezogenen Daten:
              </p>
              <ul style={ulStyle}>
                <li>
                  <strong>Recht auf Auskunft</strong> (Art. 15 DSGVO) — Sie können
                  Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten
                  verlangen.
                </li>
                <li>
                  <strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO) — Sie
                  können die Berichtigung unrichtiger Daten verlangen.
                </li>
                <li>
                  <strong>Recht auf Löschung</strong> (Art. 17 DSGVO) — Sie können
                  die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten
                  verlangen, soweit nicht die Verarbeitung zur Ausübung des Rechts
                  auf freie Meinungsäußerung, zur Erfüllung einer rechtlichen
                  Verpflichtung, aus Gründen des öffentlichen Interesses oder zur
                  Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen
                  erforderlich ist.
                </li>
                <li>
                  <strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18
                  DSGVO) — Sie können die Einschränkung der Verarbeitung Ihrer
                  personenbezogenen Daten verlangen.
                </li>
                <li>
                  <strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO) —
                  Sie können verlangen, dass wir Ihnen Ihre Daten in einem
                  strukturierten, gängigen und maschinenlesbaren Format übermitteln.
                </li>
                <li>
                  <strong>Widerspruchsrecht</strong> (Art. 21 DSGVO) — Sie können
                  jederzeit gegen die Verarbeitung Ihrer personenbezogenen Daten
                  Widerspruch einlegen.
                </li>
                <li>
                  <strong>Recht auf Widerruf der Einwilligung</strong> (Art. 7 Abs.
                  3 DSGVO) — Sie können Ihre einmal erteilte Einwilligung jederzeit
                  gegenüber uns widerrufen.
                </li>
                <li>
                  <strong>Beschwerderecht bei einer Aufsichtsbehörde</strong> (Art.
                  77 DSGVO) — Sie können sich bei einer Datenschutz-Aufsichtsbehörde
                  über die Verarbeitung Ihrer personenbezogenen Daten beschweren,
                  z.B. beim Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit und
                  Informationsfreiheit: Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit.
                </li>
              </ul>
            </div>

            {/* 7. Datensicherheit */}
            <div style={sectionStyle}>
              <h2 style={h2Style}>7. Datensicherheit</h2>
              <p style={pStyle}>
                Wir verwenden innerhalb des Website-Besuchs das verbreitete
                SSL-Verfahren (Secure Socket Layer) in Verbindung mit der jeweils
                höchsten Verschlüsselungsstufe, die von Ihrem Browser unterstützt
                wird. Ob eine einzelne Seite unseres Internetauftrittes
                verschlüsselt übertragen wird, erkennen Sie an der geschlossenen
                Darstellung des Schlüssel- beziehungsweise Schloss-Symbols in der
                Statusleiste Ihres Browsers.
              </p>
            </div>

            {/* 8. Aktualitaet */}
            <div style={{ marginBottom: 0 }}>
              <h2 style={h2Style}>8. Aktualität und Änderung dieser Datenschutzerklärung</h2>
              <p style={pStyle}>
                Diese Datenschutzerklärung ist aktuell gültig und hat den Stand
                März 2026. Durch die Weiterentwicklung
                unserer Website oder aufgrund geänderter gesetzlicher
                beziehungsweise behördlicher Vorgaben kann es notwendig werden,
                diese Datenschutzerklärung zu ändern. Die jeweils aktuelle
                Datenschutzerklärung kann jederzeit auf dieser Seite abgerufen
                werden.
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
              onClick={() => navigate('/impressum')}
              className="text-xs transition-colors duration-200"
              style={{ color: C.khaki, background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.olive)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.khaki)}
            >
              Impressum
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
