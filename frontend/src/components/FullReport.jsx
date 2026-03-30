import React, { useRef } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

// Safe number formatting
const n = (v) => Math.round(Number(v) || 0).toLocaleString('de-DE');
const eur = (v) => n(v) + '\u20ac';
const pct = (v) => (Number(v) || 0).toFixed(2) + '%';

// Error Boundary
class ReportErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-[#B85C5C] font-semibold mb-4">Fehler beim Laden des Reports</p>
          <button onClick={this.props.onBack} className="px-6 py-3 bg-[#7C8B6F] text-white rounded-xl font-semibold">
            Zur\u00fcck zur Analyse
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Section({ title, children }) {
  return (
    <div className="mb-8 break-inside-avoid">
      <h2 className="text-[18px] md:text-[22px] font-bold text-[#2C2418] mb-4 pb-2 border-b-2 border-[#7C8B6F]">{title}</h2>
      {children}
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div className="bg-[#FAF7F2] rounded-xl p-4 text-center">
      <p className="text-[12px] text-[#8C7E6A] mb-1">{label}</p>
      <p className="text-[20px] md:text-[24px] font-bold" style={{ color: color || '#2C2418' }}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div className={`flex justify-between py-2 ${bold ? 'border-t border-[#E8E0D4] pt-3 mt-1' : ''}`}>
      <span className={`text-[14px] ${bold ? 'font-semibold text-[#2C2418]' : 'text-[#5C4F3D]'}`}>{label}</span>
      <span className="text-[14px] font-semibold" style={{ color: color || '#2C2418' }}>{value}</span>
    </div>
  );
}

function ReportContent({ result, propertyData, onBack }) {
  const r = result || {};
  const p = propertyData || {};
  const cf = r.cashflow_analyse || {};
  const kn = r.kaufnebenkosten || {};
  const fp = r.fairer_preis || {};
  const afa = r.afa_berechnung || {};
  const lev = r.leverage_effekt || {};
  const sz = r.szenarien || [];
  const fo = r.foerderungen || [];
  const tipps = r.verbesserungsvorschlaege || [];
  const krit = r.kriterien || [];
  const score = Number(r.gesamtscore) || 0;
  const scoreCol = score >= 65 ? '#7C8B6F' : score >= 40 ? '#B5A68C' : '#B85C5C';
  const cashflow = Number(cf.cashflow_vor_steuer || cf.monatlicher_cashflow) || 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-[14px] text-[#8C7E6A] hover:text-[#7C8B6F]">
          <ArrowLeft size={18} /> Zur\u00fcck
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-[#7C8B6F] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6B7A5E]">
          <Printer size={16} /> PDF / Drucken
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E0D4] p-6 md:p-10 print:border-none print:p-0">

        {/* Title */}
        <div className="text-center mb-8 pb-6 border-b border-[#E8E0D4]">
          <p className="text-[20px] font-bold mb-3">
            <span className="text-[#7C8B6F]">A</span><span className="text-[#2C2418]">mlak</span><span className="text-[#7C8B6F]">I</span>
            <span className="text-[12px] text-[#8C7E6A] ml-2">Vollst\u00e4ndiger Analysebericht</span>
          </p>
          <h1 className="text-[24px] md:text-[32px] font-bold text-[#2C2418] mb-2">
            {p.titel || p.title || (r.zusammenfassung || '').split('.')[0] || 'Immobilienanalyse'}
          </h1>
          <p className="text-[14px] text-[#8C7E6A]">
            {[p.stadt, p.stadtteil].filter(Boolean).join(' ')} | {p.wohnflaeche || '?'}m\u00b2 | Baujahr {p.baujahr || '?'}
          </p>
          <p className="text-[12px] text-[#B5A68C] mt-2">
            Erstellt am {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* 1. Score */}
        <Section title="1. Bewertung">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center" style={{ borderColor: scoreCol }}>
                <span className="text-[32px] font-bold" style={{ color: scoreCol }}>{Math.round(score)}</span>
              </div>
              <p className="text-[14px] font-semibold mt-2" style={{ color: scoreCol }}>
                {score >= 65 ? 'Empfehlenswert' : score >= 55 ? 'Solide' : score >= 40 ? 'Pr\u00fcfen' : 'Nicht empfohlen'}
              </p>
            </div>
            <p className="flex-1 text-[14px] text-[#5C4F3D] leading-relaxed">{r.zusammenfassung || 'Keine Zusammenfassung verf\u00fcgbar.'}</p>
          </div>
          {krit.length > 0 && (
            <div className="mt-4 space-y-2">
              {krit.map((k, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[12px] text-[#8C7E6A] w-32 shrink-0 truncate">{String(k.name || '').replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Number(k.score) || 0}%`, backgroundColor: (Number(k.score) || 0) >= 60 ? '#7C8B6F' : (Number(k.score) || 0) >= 40 ? '#B5A68C' : '#B85C5C' }} />
                  </div>
                  <span className="text-[13px] font-semibold w-10 text-right">{Math.round(Number(k.score) || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 2. KPIs */}
        <Section title="2. Kennzahlen">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Kaufpreis" value={eur(p.kaufpreis)} />
            <KPI label="Bruttorendite" value={pct(cf.bruttorendite || r.kennzahlen?.bruttorendite)} color={(Number(cf.bruttorendite) || 0) >= 4 ? '#7C8B6F' : '#B85C5C'} />
            <KPI label="Kaufpreisfaktor" value={(Number(cf.kaufpreisfaktor || r.kennzahlen?.kaufpreisfaktor) || 0).toFixed(1)} />
            <KPI label="Preis/m\u00b2" value={eur((Number(p.kaufpreis) || 0) / Math.max(Number(p.wohnflaeche) || 1, 1))} />
          </div>
        </Section>

        {/* 3. Cashflow */}
        <Section title="3. Cashflow-Berechnung">
          <div className="bg-[#FAF7F2] rounded-xl p-5">
            <Row label="Kaltmiete" value={'+' + eur(cf.monatliche_miete)} />
            <Row label="Kreditrate" value={'-' + eur(cf.monatliche_rate)} />
            <Row label="Nicht umlagef\u00e4hige NK" value={'-' + eur(cf.monatliche_nebenkosten)} />
            <Row label="Cashflow vor Steuer" value={eur(cashflow)} bold color={cashflow >= 0 ? '#7C8B6F' : '#B85C5C'} />
            {Number(cf.steuerersparnis_monat) > 0 && (
              <>
                <Row label="Steuerersparnis (mtl.)" value={'+' + eur(cf.steuerersparnis_monat)} />
                <Row label="Cashflow nach Steuer" value={eur(cf.cashflow_nach_steuer)} bold color={(Number(cf.cashflow_nach_steuer) || 0) >= 0 ? '#7C8B6F' : '#B85C5C'} />
              </>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <KPI label="Eigenkapital" value={eur(cf.eigenkapital)} />
            <KPI label="Zinssatz" value={pct(cf.zinssatz_prozent)} />
            <KPI label="Tilgung" value={pct(cf.tilgung_prozent)} />
          </div>
        </Section>

        {/* 4. Nebenkosten */}
        {Number(kn.gesamt) > 0 && (
          <Section title="4. Kaufnebenkosten">
            <div className="bg-[#FAF7F2] rounded-xl p-5">
              {Number(kn.grunderwerbsteuer) > 0 && <Row label={'Grunderwerbsteuer (' + (kn.grunderwerbsteuer_prozent || '?') + '%)'} value={eur(kn.grunderwerbsteuer)} />}
              {Number(kn.notar) > 0 && <Row label="Notar & Grundbuch" value={eur(kn.notar)} />}
              {Number(kn.makler) > 0 && <Row label="Makler" value={eur(kn.makler)} />}
              <Row label="Gesamt" value={eur(kn.gesamt)} bold />
            </div>
          </Section>
        )}

        {/* 5. AfA */}
        {Number(afa.jaehrliche_afa) > 0 && (
          <Section title="5. Abschreibung (AfA)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="AfA-Satz" value={(Number(afa.afa_satz) || 0) + '%'} />
              <KPI label="J\u00e4hrliche AfA" value={eur(afa.jaehrliche_afa)} />
              <KPI label="Geb\u00e4udewert" value={eur(afa.gebaeudewert)} />
              <KPI label="Steuerersparnis/J." value={eur(afa.steuerersparnis_jahr)} color="#7C8B6F" />
            </div>
          </Section>
        )}

        {/* 6. Fairer Preis */}
        {Number(fp.fairer_preis) > 0 && (
          <Section title="6. Fairer Preis">
            <div className="grid grid-cols-3 gap-3">
              <KPI label="Fairer Preis" value={eur(fp.fairer_preis)} color="#7C8B6F" />
              <KPI label="Kaufpreis" value={eur(p.kaufpreis)} />
              <KPI label="Differenz" value={eur((Number(fp.fairer_preis) || 0) - (Number(p.kaufpreis) || 0))} color={(Number(fp.fairer_preis) || 0) > (Number(p.kaufpreis) || 0) ? '#7C8B6F' : '#B85C5C'} />
            </div>
            {fp.begruendung && <p className="text-[13px] text-[#5C4F3D] mt-3">{fp.begruendung}</p>}
          </Section>
        )}

        {/* 7. Leverage */}
        {lev.ek_rendite !== undefined && (
          <Section title="7. Leverage-Effekt">
            <div className="grid grid-cols-3 gap-3">
              <KPI label="EK-Rendite" value={pct(lev.ek_rendite)} color="#7C8B6F" />
              <KPI label="Objektrendite" value={pct(lev.objektrendite)} />
              <KPI label="Hebel" value={lev.hebel_positiv ? 'Positiv' : 'Negativ'} color={lev.hebel_positiv ? '#7C8B6F' : '#B85C5C'} />
            </div>
          </Section>
        )}

        {/* 8. Szenarien */}
        {sz.length > 0 && (
          <Section title="8. Szenarien">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E8E0D4]">
                    <th className="text-left py-2 text-[#8C7E6A]">Szenario</th>
                    <th className="text-right py-2 text-[#8C7E6A]">Cashflow/Monat</th>
                    <th className="text-right py-2 text-[#8C7E6A]">Rendite</th>
                  </tr>
                </thead>
                <tbody>
                  {sz.map((s, i) => (
                    <tr key={i} className="border-b border-[#F5F0E8]">
                      <td className="py-2 font-medium text-[#2C2418]">{s.name || s.szenario || 'Szenario ' + (i + 1)}</td>
                      <td className="py-2 text-right font-semibold" style={{ color: (Number(s.cashflow_monat) || 0) >= 0 ? '#7C8B6F' : '#B85C5C' }}>{eur(s.cashflow_monat)}</td>
                      <td className="py-2 text-right">{pct(s.bruttorendite || s.rendite)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* 9. Foerderungen */}
        {fo.length > 0 && (
          <Section title="9. F\u00f6rderungen">
            <div className="space-y-3">
              {fo.map((f, i) => (
                <div key={i} className="bg-[#FAF7F2] rounded-xl p-4">
                  <h4 className="text-[14px] font-semibold text-[#2C2418]">{f.name || f.programm || 'F\u00f6rderung'}</h4>
                  <p className="text-[13px] text-[#5C4F3D]">{f.beschreibung || f.details || ''}</p>
                  {Number(f.betrag) > 0 && <p className="text-[14px] font-bold text-[#7C8B6F] mt-1">Bis zu {eur(f.betrag)}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 10. Tipps */}
        {tipps.length > 0 && (
          <Section title="10. Verbesserungsvorschl\u00e4ge">
            <div className="space-y-2">
              {tipps.map((t, i) => (
                <div key={i} className="flex gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                  <span className="text-[#7C8B6F] font-bold shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-[14px] font-semibold text-[#2C2418]">{typeof t === 'string' ? t : (t.titel || t.title || '')}</p>
                    {t.beschreibung && <p className="text-[13px] text-[#5C4F3D] mt-1">{t.beschreibung}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 11. Staerken/Schwaechen */}
        {((r.staerken || []).length > 0 || (r.schwaechen || []).length > 0) && (
          <Section title="11. St\u00e4rken & Schw\u00e4chen">
            <div className="grid md:grid-cols-2 gap-4">
              {(r.staerken || []).length > 0 && (
                <div>
                  <h4 className="text-[14px] font-semibold text-[#7C8B6F] mb-2">St\u00e4rken</h4>
                  {(r.staerken || []).map((s, i) => <p key={i} className="text-[13px] text-[#5C4F3D] flex gap-2"><span className="text-[#7C8B6F]">{'\u2714'}</span> {s}</p>)}
                </div>
              )}
              {(r.schwaechen || []).length > 0 && (
                <div>
                  <h4 className="text-[14px] font-semibold text-[#B85C5C] mb-2">Schw\u00e4chen</h4>
                  {(r.schwaechen || []).map((s, i) => <p key={i} className="text-[13px] text-[#5C4F3D] flex gap-2"><span className="text-[#B85C5C]">{'\u2718'}</span> {s}</p>)}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-[#E8E0D4] text-center">
          <p className="text-[12px] text-[#B5A68C]">Erstellt mit AmlakI — amlaki.de — Keine Anlageberatung. Alle Angaben ohne Gew\u00e4hr.</p>
        </div>
      </div>
    </div>
  );
}

export default function FullReport({ result, propertyData, onBack }) {
  return (
    <ReportErrorBoundary onBack={onBack}>
      <ReportContent result={result} propertyData={propertyData} onBack={onBack} />
    </ReportErrorBoundary>
  );
}
