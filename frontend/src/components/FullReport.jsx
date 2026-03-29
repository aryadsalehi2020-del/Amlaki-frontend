import React, { useRef } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

const fmt = (v) => {
  try { return Math.round(v || 0).toLocaleString('de-DE') + '\u20ac'; }
  catch { return '0\u20ac'; }
};

function Section({ title, children }) {
  return (
    <div className="mb-8 break-inside-avoid">
      <h2 className="text-[18px] md:text-[22px] font-bold text-[#2C2418] mb-4 pb-2 border-b-2 border-[#7C8B6F]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color = '#2C2418' }) {
  return (
    <div className="bg-[#FAF7F2] rounded-xl p-4 text-center">
      <p className="text-[12px] text-[#8C7E6A] mb-1">{label}</p>
      <p className="text-[20px] md:text-[24px] font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-[#8C7E6A] mt-1">{sub}</p>}
    </div>
  );
}

function DataRow({ label, value, bold = false, color = '#5C4F3D' }) {
  return (
    <div className={`flex justify-between py-2 ${bold ? 'border-t border-[#E8E0D4] pt-3 mt-1' : ''}`}>
      <span className={`text-[14px] ${bold ? 'font-semibold text-[#2C2418]' : 'text-[#5C4F3D]'}`}>{label}</span>
      <span className={`text-[14px] font-semibold`} style={{ color: bold ? color : '#2C2418' }}>{value}</span>
    </div>
  );
}

export default function FullReport({ result, propertyData, onBack }) {
  const reportRef = useRef(null);

  const cf = result.cashflow_analyse || {};
  const kn = result.kaufnebenkosten || {};
  const fp = result.fairer_preis || {};
  const afa = result.afa_berechnung || {};
  const leverage = result.leverage_effekt || {};
  const szenarien = result.szenarien || [];
  const foerderungen = result.foerderungen || [];
  const tipps = result.verbesserungsvorschlaege || [];
  const kriterien = result.kriterien || [];
  const sensitivity = result.sensitivity_analyse || {};
  const meilensteine = result.meilensteine || [];

  const handlePrint = () => {
    window.print();
  };

  const scoreColor = (result.gesamtscore || 0) >= 65 ? '#7C8B6F' : (result.gesamtscore || 0) >= 40 ? '#B5A68C' : '#B85C5C';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - nicht im Print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-[14px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors">
          <ArrowLeft size={18} />
          Zur\u00fcck zur Analyse
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7C8B6F] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6B7A5E] transition-colors"
        >
          <Printer size={16} />
          PDF / Drucken
        </button>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white rounded-2xl border border-[#E8E0D4] p-6 md:p-10 print:border-none print:p-0 print:rounded-none">

        {/* Title */}
        <div className="text-center mb-8 pb-6 border-b border-[#E8E0D4]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[20px] font-bold">
              <span className="text-[#7C8B6F]">A</span>
              <span className="text-[#2C2418]">mlak</span>
              <span className="text-[#7C8B6F]">I</span>
            </span>
            <span className="text-[12px] text-[#8C7E6A]">Vollst\u00e4ndiger Analysebericht</span>
          </div>
          <h1 className="text-[24px] md:text-[32px] font-bold text-[#2C2418] mb-2">
            {propertyData?.titel || propertyData?.title || result.zusammenfassung?.split('.')[0] || 'Immobilienanalyse'}
          </h1>
          <p className="text-[14px] text-[#8C7E6A]">
            {propertyData?.stadt || ''} {propertyData?.stadtteil || ''} | {propertyData?.wohnflaeche || '?'}m\u00b2 | Baujahr {propertyData?.baujahr || '?'}
          </p>
          <p className="text-[12px] text-[#B5A68C] mt-2">
            Erstellt am {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* 1. Score & Zusammenfassung */}
        <Section title="1. Bewertung">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto" style={{ borderColor: scoreColor }}>
                <span className="text-[32px] font-bold" style={{ color: scoreColor }}>{Math.round(result.gesamtscore || 0)}</span>
              </div>
              <p className="text-[14px] font-semibold mt-2" style={{ color: scoreColor }}>
                {(result.gesamtscore || 0) >= 65 ? 'Empfehlenswert' : (result.gesamtscore || 0) >= 55 ? 'Solide' : (result.gesamtscore || 0) >= 40 ? 'Pr\u00fcfen' : 'Nicht empfohlen'}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-[#5C4F3D] leading-relaxed">{result.zusammenfassung || ''}</p>
            </div>
          </div>

          {/* Kriterien */}
          {kriterien.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[14px] font-semibold text-[#2C2418] mb-3">Bewertungskriterien</h3>
              <div className="space-y-2">
                {kriterien.map((k, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[12px] text-[#8C7E6A] w-32 shrink-0">{k.name?.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${k.score || 0}%`,
                        backgroundColor: (k.score || 0) >= 60 ? '#7C8B6F' : (k.score || 0) >= 40 ? '#B5A68C' : '#B85C5C'
                      }} />
                    </div>
                    <span className="text-[13px] font-semibold w-10 text-right">{Math.round(k.score || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* 2. Kennzahlen */}
        <Section title="2. Kennzahlen">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Kaufpreis" value={fmt(propertyData?.kaufpreis || 0)} />
            <KPICard label="Bruttorendite" value={`${(cf.bruttorendite || result.kennzahlen?.bruttorendite || 0).toFixed(2)}%`} color={cf.bruttorendite >= 4 ? '#7C8B6F' : '#B85C5C'} />
            <KPICard label="Kaufpreisfaktor" value={(cf.kaufpreisfaktor || result.kennzahlen?.kaufpreisfaktor || 0).toFixed(1)} />
            <KPICard label="Preis/m\u00b2" value={`${Math.round((propertyData?.kaufpreis || 0) / (propertyData?.wohnflaeche || 1)).toLocaleString('de-DE')}\u20ac`} />
          </div>
        </Section>

        {/* 3. Cashflow */}
        <Section title="3. Cashflow-Berechnung">
          <div className="bg-[#FAF7F2] rounded-xl p-5">
            <DataRow label="Kaltmiete" value={`+${Math.round(cf.monatliche_miete || 0).toLocaleString('de-DE')}\u20ac`} />
            <DataRow label="Kreditrate" value={`-${Math.round(cf.monatliche_rate || 0).toLocaleString('de-DE')}\u20ac`} />
            <DataRow label="Nicht umlagef\u00e4hige NK" value={`-${Math.round(cf.monatliche_nebenkosten || 0).toLocaleString('de-DE')}\u20ac`} />
            {cf.mietausfallwagnis > 0 && <DataRow label="Mietausfallwagnis" value={`-${Math.round(cf.mietausfallwagnis || 0).toLocaleString('de-DE')}\u20ac`} />}
            <DataRow label="Cashflow vor Steuer" value={`${Math.round(cf.cashflow_vor_steuer || cf.monatlicher_cashflow || 0).toLocaleString('de-DE')}\u20ac`}
              bold color={(cf.cashflow_vor_steuer || cf.monatlicher_cashflow || 0) >= 0 ? '#7C8B6F' : '#B85C5C'} />
            {cf.steuerersparnis_monat > 0 && (
              <>
                <DataRow label="Steuerersparnis (mtl.)" value={`+${Math.round(cf.steuerersparnis_monat || 0).toLocaleString('de-DE')}\u20ac`} />
                <DataRow label="Cashflow nach Steuer" value={`${Math.round(cf.cashflow_nach_steuer || 0).toLocaleString('de-DE')}\u20ac`}
                  bold color={(cf.cashflow_nach_steuer || 0) >= 0 ? '#7C8B6F' : '#B85C5C'} />
              </>
            )}
          </div>

          {/* Finanzierung */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPICard label="Eigenkapital" value={`${Math.round(cf.eigenkapital || 0).toLocaleString('de-DE')}\u20ac`} />
            <KPICard label="Zinssatz" value={`${(cf.zinssatz_prozent || 0).toFixed(2)}%`} />
            <KPICard label="Tilgung" value={`${(cf.tilgung_prozent || 0).toFixed(2)}%`} />
          </div>
        </Section>

        {/* 4. Kaufnebenkosten */}
        {kn.gesamt > 0 && (
          <Section title="4. Kaufnebenkosten">
            <div className="bg-[#FAF7F2] rounded-xl p-5">
              {kn.grunderwerbsteuer > 0 && <DataRow label={`Grunderwerbsteuer (${kn.grunderwerbsteuer_prozent || '?'}%)`} value={`${Math.round(kn.grunderwerbsteuer).toLocaleString('de-DE')}\u20ac`} />}
              {kn.notar > 0 && <DataRow label="Notar & Grundbuch" value={`${Math.round(kn.notar).toLocaleString('de-DE')}\u20ac`} />}
              {kn.makler > 0 && <DataRow label="Makler" value={`${Math.round(kn.makler).toLocaleString('de-DE')}\u20ac`} />}
              <DataRow label="Kaufnebenkosten gesamt" value={`${Math.round(kn.gesamt).toLocaleString('de-DE')}\u20ac`} bold />
            </div>
          </Section>
        )}

        {/* 5. AfA */}
        {afa.jaehrliche_afa > 0 && (
          <Section title="5. Abschreibung (AfA)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="AfA-Satz" value={`${afa.afa_satz || 0}%`} />
              <KPICard label="J\u00e4hrliche AfA" value={`${Math.round(afa.jaehrliche_afa || 0).toLocaleString('de-DE')}\u20ac`} />
              <KPICard label="Geb\u00e4udewert" value={`${Math.round(afa.gebaeudewert || 0).toLocaleString('de-DE')}\u20ac`} />
              <KPICard label="Steuerersparnis/Jahr" value={`${Math.round(afa.steuerersparnis_jahr || 0).toLocaleString('de-DE')}\u20ac`} color="#7C8B6F" />
            </div>
          </Section>
        )}

        {/* 6. Fairer Preis */}
        {fp.fairer_preis > 0 && (
          <Section title="6. Fairer Preis">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KPICard label="Fairer Preis" value={`${Math.round(fp.fairer_preis).toLocaleString('de-DE')}\u20ac`} color="#7C8B6F" />
              <KPICard label="Kaufpreis" value={`${Math.round(propertyData?.kaufpreis || 0).toLocaleString('de-DE')}\u20ac`} />
              <KPICard label="Differenz" value={`${Math.round((fp.fairer_preis || 0) - (propertyData?.kaufpreis || 0)).toLocaleString('de-DE')}\u20ac`}
                color={(fp.fairer_preis || 0) > (propertyData?.kaufpreis || 0) ? '#7C8B6F' : '#B85C5C'} />
            </div>
            {fp.begruendung && <p className="text-[13px] text-[#5C4F3D] mt-3 leading-relaxed">{fp.begruendung}</p>}
          </Section>
        )}

        {/* 7. Leverage */}
        {leverage.ek_rendite !== undefined && (
          <Section title="7. Leverage-Effekt">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard label="EK-Rendite" value={`${(leverage.ek_rendite || 0).toFixed(1)}%`} color="#7C8B6F" />
              <KPICard label="Objektrendite" value={`${(leverage.objektrendite || 0).toFixed(1)}%`} />
              <KPICard label="Hebel" value={leverage.hebel_positiv ? 'Positiv' : 'Negativ'} color={leverage.hebel_positiv ? '#7C8B6F' : '#B85C5C'} />
            </div>
          </Section>
        )}

        {/* 8. Szenarien */}
        {szenarien.length > 0 && (
          <Section title="8. Szenarien-Vergleich">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E8E0D4]">
                    <th className="text-left py-2 text-[#8C7E6A] font-medium">Szenario</th>
                    <th className="text-right py-2 text-[#8C7E6A] font-medium">Cashflow/Monat</th>
                    <th className="text-right py-2 text-[#8C7E6A] font-medium">Rendite</th>
                  </tr>
                </thead>
                <tbody>
                  {szenarien.map((s, i) => (
                    <tr key={i} className="border-b border-[#F5F0E8]">
                      <td className="py-2 font-medium text-[#2C2418]">{s.name || s.szenario || `Szenario ${i + 1}`}</td>
                      <td className="py-2 text-right font-semibold" style={{ color: (s.cashflow_monat || 0) >= 0 ? '#7C8B6F' : '#B85C5C' }}>
                        {Math.round(s.cashflow_monat || 0).toLocaleString('de-DE')}\u20ac
                      </td>
                      <td className="py-2 text-right">{(s.bruttorendite || s.rendite || 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* 9. F\u00f6rderungen */}
        {foerderungen.length > 0 && (
          <Section title="9. F\u00f6rderungen & Zusch\u00fcsse">
            <div className="space-y-3">
              {foerderungen.map((f, i) => (
                <div key={i} className="bg-[#FAF7F2] rounded-xl p-4">
                  <h4 className="text-[14px] font-semibold text-[#2C2418] mb-1">{f.name || f.programm}</h4>
                  <p className="text-[13px] text-[#5C4F3D]">{f.beschreibung || f.details}</p>
                  {f.betrag > 0 && <p className="text-[14px] font-bold text-[#7C8B6F] mt-1">Bis zu {Math.round(f.betrag).toLocaleString('de-DE')}\u20ac</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 10. Verbesserungsvorschl\u00e4ge */}
        {tipps.length > 0 && (
          <Section title="10. Verbesserungsvorschl\u00e4ge">
            <div className="space-y-2">
              {tipps.map((t, i) => (
                <div key={i} className="flex gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                  <span className="text-[#7C8B6F] font-bold shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-[14px] font-semibold text-[#2C2418]">{t.titel || t.title || t}</p>
                    {t.beschreibung && <p className="text-[13px] text-[#5C4F3D] mt-1">{t.beschreibung}</p>}
                    {t.effekt && <p className="text-[13px] text-[#7C8B6F] font-medium mt-1">{t.effekt}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 11. St\u00e4rken & Schw\u00e4chen */}
        {(result.staerken?.length > 0 || result.schwaechen?.length > 0) && (
          <Section title="11. St\u00e4rken & Schw\u00e4chen">
            <div className="grid md:grid-cols-2 gap-4">
              {result.staerken?.length > 0 && (
                <div>
                  <h4 className="text-[14px] font-semibold text-[#7C8B6F] mb-2">St\u00e4rken</h4>
                  <ul className="space-y-1">
                    {result.staerken.map((s, i) => (
                      <li key={i} className="text-[13px] text-[#5C4F3D] flex gap-2">
                        <span className="text-[#7C8B6F] shrink-0">\u2714</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.schwaechen?.length > 0 && (
                <div>
                  <h4 className="text-[14px] font-semibold text-[#B85C5C] mb-2">Schw\u00e4chen</h4>
                  <ul className="space-y-1">
                    {result.schwaechen.map((s, i) => (
                      <li key={i} className="text-[13px] text-[#5C4F3D] flex gap-2">
                        <span className="text-[#B85C5C] shrink-0">\u2718</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-[#E8E0D4] text-center">
          <p className="text-[12px] text-[#B5A68C]">
            Erstellt mit AmlakI \u2014 amlaki.de \u2014 Keine Anlageberatung. Alle Angaben ohne Gew\u00e4hr.
          </p>
        </div>
      </div>
    </div>
  );
}
