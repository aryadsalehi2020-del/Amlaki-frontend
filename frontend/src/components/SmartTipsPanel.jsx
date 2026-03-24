import React, { useMemo, useState } from 'react';
import { GRUNDERWERBSTEUER, formatCurrency } from '../constants';

function SmartTipsPanel({ profile, immobilie }) {
  const [expandedTipps, setExpandedTipps] = useState(new Set([0]));
  const [filterKategorie, setFilterKategorie] = useState('alle');

  const toggleTipp = (index) => {
    const newExpanded = new Set(expandedTipps);
    if (newExpanded.has(index)) newExpanded.delete(index); else newExpanded.add(index);
    setExpandedTipps(newExpanded);
  };

  const relevanteTipps = useMemo(() => {
    if (!profile) return [];
    const tipps = [];
    const eigenkapital = parseFloat(profile.eigenkapital) || 0;
    const einkommen = parseFloat(profile.jahreseinkommen) || 0;
    const kinder = parseInt(profile.kinder) || 0;
    const kaufpreis = immobilie?.kaufpreis || 0;

    if (kinder > 0 && einkommen > 0) {
      const kfwGrenze = 90000 + (kinder * 10000);
      const verheiratetBonus = profile.verheiratet ? 10000 : 0;
      if (einkommen <= (kfwGrenze + verheiratetBonus)) {
        const maxKredit = 170000 + Math.min(kinder, 5) * 20000;
        const zinsErsparnis = maxKredit * 0.025 * 10;
        tipps.push({ kategorie: 'KfW-F\u00f6rderung', titel: 'KfW 300: Wohneigentum f\u00fcr Familien', prioritaet: 'hoch', ersparnis: zinsErsparnis, ersparnisText: `${formatCurrency(zinsErsparnis)} Zinsersparnis`, zusammenfassung: `Kredit bis ${formatCurrency(maxKredit)} zu nur 1,12% Zins`, details: [`Ihr Haushaltseinkommen (${formatCurrency(einkommen)}) liegt unter der Grenze`, `Mit ${kinder} Kind${kinder > 1 ? 'ern' : ''}: Maximaler Kredit ${formatCurrency(maxKredit)}`, 'Zinssatz nur 1,12% - deutlich unter Marktniveau!', 'Wichtig: Antrag VOR Kaufvertrag stellen!'], aktion: 'KfW-F\u00f6rderung pr\u00fcfen' });
      }
      if (immobilie?.energieKlasse && ['F', 'G', 'H'].includes(immobilie.energieKlasse)) {
        const maxKreditJkA = 100000 + (kinder >= 3 ? 50000 : 0);
        tipps.push({ kategorie: 'KfW-F\u00f6rderung', titel: 'KfW 308: Jung kauft Alt', prioritaet: 'hoch', ersparnis: maxKreditJkA * 0.02 * 10, ersparnisText: `${formatCurrency(maxKreditJkA * 0.02 * 10)} potenzielle Ersparnis`, zusammenfassung: `Sanierungskredit bis ${formatCurrency(maxKreditJkA)} zu Sonderkonditionen`, details: [`Energieklasse ${immobilie.energieKlasse} qualifiziert!`, `Kredit bis ${formatCurrency(maxKreditJkA)} zu 1,12% Zins`, 'Sanierung auf Effizienzhaus 85 EE innerhalb 54 Monaten', 'Kombinierbar mit Heizungsf\u00f6rderung'], aktion: 'Programm pr\u00fcfen' });
      }
    }

    tipps.push({ kategorie: 'KfW-F\u00f6rderung', titel: 'KfW 124: Wohneigentumsprogramm', prioritaet: 'mittel', ersparnis: 8000, ersparnisText: 'ca. 5.000-15.000 EUR \u00fcber Laufzeit', zusammenfassung: 'Bis 100.000 EUR zu ca. 3,4-3,9% Zins - f\u00fcr jeden verf\u00fcgbar', details: ['Kredit bis 100.000 EUR', 'KEINE Einkommensgrenzen', '\u00dcber jede Hausbank beantragbar', 'Tilgungsfreie Anlaufzeit m\u00f6glich'], aktion: 'Bei Hausbank anfragen' });

    if (eigenkapital < kaufpreis * 0.2 && kaufpreis > 0) {
      if (profile.hatDepot && profile.depotWert) {
        const beleihbar = parseFloat(profile.depotWert) * 0.7;
        tipps.push({ kategorie: 'Eigenkapital-Ersatz', titel: 'Depot beleihen (Lombardkredit)', prioritaet: 'hoch', ersparnis: beleihbar * 0.015, ersparnisText: `Bis ${formatCurrency(beleihbar)} als EK nutzbar`, zusammenfassung: 'Wertpapiere als Sicherheit nutzen', details: [`Ihr Depot ist bis 70% beleihbar = ${formatCurrency(beleihbar)}`, 'Depot bleibt in Ihrem Besitz', 'Achtung: Bei Kursverlusten Nachschusspflicht'], aktion: 'Broker vergleichen' });
      }
    }

    if (immobilie?.verwendungszweck === 'kapitalanlage') {
      tipps.push({ kategorie: 'Steuer-Optimierung', titel: 'Kaufpreisaufteilung optimieren', prioritaet: 'mittel', ersparnis: kaufpreis * 0.015, ersparnisText: `${formatCurrency(kaufpreis * 0.015)} \u00fcber 50 Jahre m\u00f6glich`, zusammenfassung: 'Geb\u00e4udeanteil maximieren f\u00fcr h\u00f6here AfA', details: ['Nur Geb\u00e4udeanteil ist abschreibbar', 'Eigenes Gutachten lohnt sich!', 'Gutachterkosten: 1.500-3.000 EUR'], aktion: 'Gutachter suchen' });
    }

    const landesTipp = getLandesfoerderung(profile.bundesland);
    if (landesTipp) tipps.push(landesTipp);

    const prioritaetOrder = { 'hoch': 0, 'mittel': 1, 'info': 2 };
    return tipps.sort((a, b) => (prioritaetOrder[a.prioritaet] - prioritaetOrder[b.prioritaet]) || ((b.ersparnis || 0) - (a.ersparnis || 0)));
  }, [profile, immobilie]);

  const kategorien = ['alle', ...new Set(relevanteTipps.map(t => t.kategorie))];
  const gefilterteTipps = filterKategorie === 'alle' ? relevanteTipps : relevanteTipps.filter(t => t.kategorie === filterKategorie);
  const gesamtErsparnis = relevanteTipps.filter(t => t.prioritaet !== 'info').reduce((sum, t) => sum + (t.ersparnis || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-[20px] font-semibold text-[#2C2418]">Personalisierte Spar-Tipps</h3>
          <p className="text-[#8C7E6A] text-[13px] mt-1">{relevanteTipps.length} Tipps - Potenzielle Ersparnis: <span className="text-[#7C8B6F] font-semibold">{formatCurrency(gesamtErsparnis)}</span></p>
        </div>
      </div>

      {relevanteTipps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {kategorien.map((kat) => (
            <button key={kat} onClick={() => setFilterKategorie(kat)}
              className={`px-4 py-2 rounded-[10px] text-[13px] font-medium transition-all ${filterKategorie === kat ? 'bg-[#7C8B6F] text-white' : 'bg-[#F5F0E8] text-[#8C7E6A] hover:bg-[#E8E0D4] border border-[#E8E0D4]'}`}>
              {kat === 'alle' ? 'Alle Tipps' : kat}
              {kat !== 'alle' && <span className="ml-2 opacity-60">({relevanteTipps.filter(t => t.kategorie === kat).length})</span>}
            </button>
          ))}
        </div>
      )}

      {relevanteTipps.length === 0 ? (
        <div className="bg-white p-8 rounded-[16px] border border-[#E8E0D4] text-center">
          <h4 className="text-[16px] font-semibold text-[#2C2418] mb-2">Profil ausf&uuml;llen f&uuml;r Tipps</h4>
          <p className="text-[#8C7E6A] text-[14px]">F&uuml;llen Sie Ihr Finanzprofil aus, um personalisierte Spar-Tipps zu erhalten</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gefilterteTipps.map((tipp, idx) => {
            const isExpanded = expandedTipps.has(relevanteTipps.indexOf(tipp));
            return (
              <div key={idx} className="bg-white rounded-[16px] border border-[#E8E0D4] overflow-hidden transition-all">
                <button onClick={() => toggleTipp(relevanteTipps.indexOf(tipp))} className="w-full p-5 flex items-start gap-4 text-left hover:bg-[#FAF7F2] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${tipp.prioritaet === 'hoch' ? 'text-[#7C8B6F]' : 'text-[#8C7E6A]'}`}>{tipp.kategorie}</span>
                      {tipp.prioritaet === 'hoch' && <span className="px-2 py-0.5 bg-[#7C8B6F]/10 text-[#7C8B6F] text-[11px] rounded-full font-semibold">Hohe Priorit&auml;t</span>}
                    </div>
                    <h4 className="text-[16px] font-semibold text-[#2C2418]">{tipp.titel}</h4>
                    <p className="text-[13px] text-[#8C7E6A] mt-1">{tipp.zusammenfassung}</p>
                    {tipp.ersparnisText && <p className="text-[13px] font-medium mt-2 text-[#7C8B6F]">{tipp.ersparnisText}</p>}
                  </div>
                  <svg className={`w-5 h-5 text-[#B5A68C] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[#E8E0D4]">
                    <div className="pt-4">
                      <ul className="space-y-2 mb-4">
                        {tipp.details.map((detail, i) => (
                          <li key={i} className="text-[13px] text-[#5C4F3D] flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-[#F5F0E8] text-[#8C7E6A]">{i + 1}</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                      {tipp.aktion && (
                        <button className="px-5 py-2.5 rounded-[10px] font-medium text-[13px] transition-all bg-[#7C8B6F]/10 text-[#7C8B6F] hover:bg-[#7C8B6F]/20 border border-[#7C8B6F]/30 flex items-center gap-2">
                          {tipp.aktion}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getGrunderwerbsteuerSatz(bundesland) { return GRUNDERWERBSTEUER[bundesland] || 6.0; }

function getLandesfoerderung(bundesland) {
  const foerderungen = {
    'NRW': { kategorie: 'Landesf\u00f6rderung', titel: 'NRW.BANK Eigentumsf\u00f6rderung', prioritaet: 'hoch', ersparnis: 40000, ersparnisText: 'Zinssatz nur 0,5%!', zusammenfassung: 'Extrem g\u00fcnstiges F\u00f6rderdarlehen f\u00fcr NRW-B\u00fcrger', details: ['F\u00f6rderdarlehen 100.000-184.000 EUR m\u00f6glich', 'Extrem g\u00fcnstiger 0,5% Zins', 'Einkommensgrenzen: ca. 62.000 EUR (Familie mit 2 Kindern)', 'Kombinierbar mit KfW-F\u00f6rderung'], aktion: 'NRW.BANK Rechner nutzen' },
    'Brandenburg': { kategorie: 'Landesf\u00f6rderung', titel: 'ILB Wohneigentumsf\u00f6rderung', prioritaet: 'hoch', ersparnis: 80000, ersparnisText: 'Bis 230.000 EUR ZINSFREI!', zusammenfassung: 'Die beste Landesf\u00f6rderung Deutschlands', details: ['Darlehen bis 230.000 EUR komplett ZINSFREI!', 'Gilt f\u00fcr Familien mit Kindern', 'Beste Immobilienf\u00f6rderung in ganz Deutschland'], aktion: 'ILB kontaktieren' },
    'Bayern': { kategorie: 'Landesf\u00f6rderung', titel: 'BayernLabo Eigenwohnraumf\u00f6rderung', prioritaet: 'mittel', ersparnis: 25000, ersparnisText: 'Bis 3% unter Marktzins', zusammenfassung: 'G\u00fcnstige Konditionen plus niedrigste GrESt', details: ['Zinsverbilligung bis zu 3 Prozentpunkte', 'Nur 3,5% Grunderwerbsteuer in Bayern!'], aktion: 'BayernLabo Rechner nutzen' },
  };
  return foerderungen[bundesland] || null;
}

export default SmartTipsPanel;
