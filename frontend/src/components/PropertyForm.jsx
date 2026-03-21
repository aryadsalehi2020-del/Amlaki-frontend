import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile, INVESTMENT_GOALS, RISK_PROFILES } from '../contexts/UserProfileContext';

function PropertyForm({ initialData, onAnalyze, onBack }) {
  const { profile: investorProfile, isProfileComplete } = useUserProfile();
  const [formData, setFormData] = useState({
    kaufpreis: initialData?.kaufpreis || '', wohnflaeche: initialData?.wohnflaeche || '', zimmer: initialData?.zimmer || '',
    baujahr: initialData?.baujahr || '', etage: initialData?.etage || '', nebenkosten: initialData?.nebenkosten || '',
    hausgeld: initialData?.hausgeld || '', energieklasse: initialData?.energieklasse || '', heizungsart: initialData?.heizungsart || '',
    adresse: initialData?.adresse || '', stadt: initialData?.stadt || '', stadtteil: initialData?.stadtteil || '',
    objekttyp: initialData?.objekttyp || '', zustand: initialData?.zustand || '', ausstattung: initialData?.ausstattung || '',
    balkon_terrasse: initialData?.balkon_terrasse || false, keller: initialData?.keller || false,
    stellplatz: initialData?.stellplatz || '', vermietet: initialData?.vermietet || false,
    aktuelle_miete: initialData?.aktuelle_miete || '', verkaufertyp: initialData?.verkaufertyp || '', provision: initialData?.provision || '',
  });

  const [verwendungszweck, setVerwendungszweck] = useState('kapitalanlage');
  const [besichtigt, setBesichtigt] = useState(null); // null = nicht ausgewählt, true/false
  const [finanzierung, setFinanzierung] = useState({ eigenkapital: 0, zinssatz: 3.75, tilgung: 1.25 });
  const [validationError, setValidationError] = useState(null);

  // Profile toggle: 'default' uses global profile, 'custom' uses local overrides
  const [profileMode, setProfileMode] = useState('default');
  const [customProfile, setCustomProfile] = useState({
    goal: investorProfile.goal || 'cashflow',
    riskProfile: investorProfile.riskProfile || 'ausgewogen',
    eigenkapital: investorProfile.eigenkapital || 50000,
    mindestRendite: investorProfile.mindestRendite || 4,
  });

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const handleFinanzierungChange = useCallback((e) => {
    const { name, value } = e.target;
    setFinanzierung(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  }, []);

  const getActiveProfile = useCallback(() => {
    if (profileMode === 'custom') {
      return customProfile;
    }
    return {
      goal: investorProfile.goal,
      riskProfile: investorProfile.riskProfile,
      eigenkapital: investorProfile.eigenkapital,
      mindestRendite: investorProfile.mindestRendite,
    };
  }, [profileMode, customProfile, investorProfile]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault(); setValidationError(null);
    const kaufpreis = formData.kaufpreis ? parseFloat(formData.kaufpreis) : 0;
    const wohnflaeche = formData.wohnflaeche ? parseFloat(formData.wohnflaeche) : 0;
    if (!kaufpreis || kaufpreis < 1000) { setValidationError('Bitte geben Sie einen gultigen Kaufpreis ein (min. 1.000)'); return; }
    if (!wohnflaeche || wohnflaeche < 5) { setValidationError('Bitte geben Sie eine gultige Wohnflache ein (min. 5 m2)'); return; }
    const processedData = { ...formData, kaufpreis, wohnflaeche, zimmer: formData.zimmer ? parseFloat(formData.zimmer) : null, baujahr: formData.baujahr ? parseInt(formData.baujahr) : null, nebenkosten: formData.nebenkosten ? parseFloat(formData.nebenkosten) : null, hausgeld: formData.hausgeld ? parseFloat(formData.hausgeld) : null, aktuelle_miete: formData.aktuelle_miete ? parseFloat(formData.aktuelle_miete) : null };
    const activeProfile = verwendungszweck === 'kapitalanlage' ? getActiveProfile() : null;
    onAnalyze(processedData, verwendungszweck, finanzierung, activeProfile, besichtigt);
  }, [formData, verwendungszweck, finanzierung, onAnalyze, getActiveProfile]);

  const inputClass = "w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] placeholder:text-[#B5A68C] text-[15px]";
  const labelClass = "block text-[13px] font-medium text-[#5C4F3D] mb-2";
  const selectClass = "w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[15px]";
  const sectionTitle = (label) => <h3 className="text-[18px] font-semibold text-[#2C2418] mb-6">{label}</h3>;

  return (
    <div className="fade-in">
      <div className="bg-white rounded-[20px] p-8 md:p-10 border border-[#E8E0D4]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[28px] font-bold text-[#2C2418] mb-2">Objektdaten</h2>
            <p className="text-[#8C7E6A] text-[14px]">Geben Sie die Immobiliendaten ein</p>
          </div>
          <button onClick={onBack} className="px-4 py-2 border border-[#E8E0D4] text-[#8C7E6A] font-medium rounded-[10px] hover:border-[#B5A68C] hover:text-[#5C4F3D] transition-all flex items-center gap-2 text-[14px]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zuruck
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {validationError && (
            <div className="mb-6 p-4 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[14px]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {validationError}
              </div>
            </div>
          )}

          {/* Verwendungszweck */}
          <div className="mb-10 p-6 bg-[#FAF7F2] rounded-[16px] border border-[#E8E0D4]">
            <label className="text-[16px] font-semibold text-[#2C2418] block mb-1">Verwendungszweck wahlen</label>
            <p className="text-[13px] text-[#8C7E6A] mb-4">Die KI-Bewertung andert sich je nach Ziel</p>
            <div className="grid md:grid-cols-2 gap-4">
              <button type="button" onClick={() => setVerwendungszweck('kapitalanlage')}
                className={`py-5 px-6 rounded-[16px] border-2 font-medium transition-all text-left ${verwendungszweck === 'kapitalanlage' ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] hover:border-[#B5A68C]'}`}>
                <span className={`text-[16px] block mb-2 ${verwendungszweck === 'kapitalanlage' ? 'text-[#7C8B6F] font-semibold' : 'text-[#5C4F3D]'}`}>Kapitalanlage</span>
                <div className={`text-[12px] space-y-1 ${verwendungszweck === 'kapitalanlage' ? 'text-[#7C8B6F]/80' : 'text-[#8C7E6A]'}`}>
                  <p>Rendite & Cashflow: 30%</p><p>Einkaufspreis: 20% | Lage & Potenzial: 25%</p><p>Zustand, Energie & Mietpotenzial: 25%</p>
                </div>
              </button>
              <button type="button" onClick={() => setVerwendungszweck('eigennutzung')}
                className={`py-5 px-6 rounded-[16px] border-2 font-medium transition-all text-left ${verwendungszweck === 'eigennutzung' ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] hover:border-[#B5A68C]'}`}>
                <span className={`text-[16px] block mb-2 ${verwendungszweck === 'eigennutzung' ? 'text-[#7C8B6F] font-semibold' : 'text-[#5C4F3D]'}`}>Eigennutzung</span>
                <div className={`text-[12px] space-y-1 ${verwendungszweck === 'eigennutzung' ? 'text-[#7C8B6F]/80' : 'text-[#8C7E6A]'}`}>
                  <p>Lage & Umfeld: 25% | Grundriss: 20%</p><p>Zustand: 15% | Zukunftspotenzial: 15%</p><p>Wohnqualitaet & Lebensstandard</p>
                </div>
              </button>
            </div>
            {verwendungszweck === 'kapitalanlage' && <p className="mt-3 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">Bei Kapitalanlage wird Cashflow, Rendite und Mietpotenzial priorisiert</p>}
            {verwendungszweck === 'eigennutzung' && <p className="mt-3 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">Bei Eigennutzung wird Wohnqualitat, Lage und Zustand priorisiert</p>}
          </div>

          {/* Besichtigung */}
          <div className="mb-10 p-6 bg-[#FAF7F2] rounded-[16px] border border-[#E8E0D4]">
            <label className="text-[16px] font-semibold text-[#2C2418] block mb-1">Warst du schon bei der Besichtigung?</label>
            <p className="text-[13px] text-[#8C7E6A] mb-4">Wir passen die Analyse an deinen aktuellen Stand an</p>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setBesichtigt(true)}
                className={`py-4 px-5 rounded-[16px] border-2 font-medium transition-all text-center ${besichtigt === true ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] hover:border-[#B5A68C]'}`}>
                <span className={`text-[15px] block ${besichtigt === true ? 'text-[#7C8B6F] font-semibold' : 'text-[#5C4F3D]'}`}>Ja, war ich schon</span>
              </button>
              <button type="button" onClick={() => setBesichtigt(false)}
                className={`py-4 px-5 rounded-[16px] border-2 font-medium transition-all text-center ${besichtigt === false ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] hover:border-[#B5A68C]'}`}>
                <span className={`text-[15px] block ${besichtigt === false ? 'text-[#7C8B6F] font-semibold' : 'text-[#5C4F3D]'}`}>Nein, noch nicht</span>
              </button>
            </div>
            {besichtigt === false && <p className="mt-3 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">Du erhaeltst eine personalisierte Besichtigungs-Checkliste mit deiner Analyse</p>}
            {besichtigt === true && <p className="mt-3 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">Hast du bei der Besichtigung etwas Neues erfahren? Trage es unten ein fuer eine praezisere Analyse</p>}
          </div>

          {/* Investoren-Profil / Wohnprofil */}
          {verwendungszweck === 'eigennutzung' ? (
          <div className="mb-10 p-6 bg-[#FAF7F2] rounded-[16px] border border-[#E8E0D4]">
            <label className="text-[16px] font-semibold text-[#2C2418] block mb-1">Deine Prioritaeten</label>
            <p className="text-[13px] text-[#8C7E6A] mb-4">Die Bewertung wird auf dein Wohnprofil abgestimmt</p>
            <div className="bg-[#7C8B6F]/5 rounded-[12px] p-4 border border-[#7C8B6F]/20">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div><span className="text-[#7C8B6F] font-medium">Lage & Umfeld</span><span className="text-[#8C7E6A] ml-1">25%</span></div>
                <div><span className="text-[#7C8B6F] font-medium">Grundriss & Schnitt</span><span className="text-[#8C7E6A] ml-1">20%</span></div>
                <div><span className="text-[#7C8B6F] font-medium">Zustand & Substanz</span><span className="text-[#8C7E6A] ml-1">15%</span></div>
                <div><span className="text-[#7C8B6F] font-medium">Zukunftspotenzial</span><span className="text-[#8C7E6A] ml-1">15%</span></div>
                <div><span className="text-[#7C8B6F] font-medium">Energieeffizienz</span><span className="text-[#8C7E6A] ml-1">10%</span></div>
                <div><span className="text-[#7C8B6F] font-medium">Preis-Leistung</span><span className="text-[#8C7E6A] ml-1">15%</span></div>
              </div>
            </div>
          </div>
          ) : (
          <div className="mb-10 p-6 bg-[#FAF7F2] rounded-[16px] border border-[#E8E0D4]">
            <label className="text-[16px] font-semibold text-[#2C2418] block mb-1">Dein Investment-Profil</label>
            <p className="text-[13px] text-[#8C7E6A] mb-4">Verwende dein Standardprofil oder passe es fuer diese Analyse an</p>

            {/* Toggle */}
            <div className="flex mb-4 bg-white rounded-[10px] border border-[#E8E0D4] p-1">
              <button
                type="button"
                onClick={() => setProfileMode('default')}
                className={`flex-1 py-2.5 px-4 rounded-[8px] text-[13px] font-medium transition-all ${
                  profileMode === 'default'
                    ? 'bg-[#7C8B6F] text-white'
                    : 'bg-white text-[#7C8B6F] hover:bg-[#FAF7F2]'
                }`}
              >
                Mein Standard verwenden
              </button>
              <button
                type="button"
                onClick={() => setProfileMode('custom')}
                className={`flex-1 py-2.5 px-4 rounded-[8px] text-[13px] font-medium transition-all ${
                  profileMode === 'custom'
                    ? 'bg-[#7C8B6F] text-white'
                    : 'bg-white text-[#7C8B6F] hover:bg-[#FAF7F2]'
                }`}
              >
                Individuell anpassen
              </button>
            </div>

            {profileMode === 'default' ? (
              <div className="bg-[#7C8B6F]/5 rounded-[12px] p-4 border border-[#7C8B6F]/20">
                {isProfileComplete ? (
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <span className="text-[#7C8B6F] font-semibold text-[14px]">{INVESTMENT_GOALS[investorProfile.goal]?.label}</span>
                      <span className="text-[#B5A68C]">|</span>
                      <span className="text-[#5C4F3D] text-[14px]">{RISK_PROFILES[investorProfile.riskProfile]?.label}</span>
                      <span className="text-[#B5A68C]">|</span>
                      <span className="text-[#5C4F3D] text-[14px]">{Number(investorProfile.eigenkapital).toLocaleString('de-DE')} EUR EK</span>
                    </div>
                    <Link to="/settings" className="px-4 py-2 bg-white border border-[#E8E0D4] text-[#5C4F3D] rounded-[10px] font-medium hover:bg-[#F5F0E8] transition-all text-[13px] shrink-0">
                      Standard andern
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[#5C4F3D] font-semibold text-[14px]">Noch kein Profil eingerichtet</p>
                      <p className="text-[#8C7E6A] text-[12px]">Richte dein Standardprofil ein oder passe es hier individuell an</p>
                    </div>
                    <Link to="/settings" className="px-4 py-2 bg-white border border-[#E8E0D4] text-[#5C4F3D] rounded-[10px] font-medium hover:bg-[#F5F0E8] transition-all text-[13px] shrink-0">
                      Jetzt einrichten
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Investment-Ziel */}
                <div>
                  <label className="block text-[12px] font-medium text-[#5C4F3D] mb-2">Investment-Ziel</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(INVESTMENT_GOALS).map(([key, goal]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCustomProfile(prev => ({ ...prev, goal: key }))}
                        className={`py-2 px-4 rounded-[10px] border text-[13px] font-medium transition-all ${
                          customProfile.goal === key
                            ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]'
                            : 'border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                        }`}
                      >
                        {goal.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risikoprofil */}
                <div>
                  <label className="block text-[12px] font-medium text-[#5C4F3D] mb-2">Risikoprofil</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(RISK_PROFILES).map(([key, rp]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCustomProfile(prev => ({ ...prev, riskProfile: key }))}
                        className={`py-2 px-4 rounded-[10px] border text-[13px] font-medium transition-all ${
                          customProfile.riskProfile === key
                            ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]'
                            : 'border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                        }`}
                      >
                        {rp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eigenkapital & Ziel-Rendite */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[12px] font-medium text-[#5C4F3D]">Eigenkapital fuer dieses Objekt</label>
                      <div className="group relative">
                        <span className="text-[#B5A68C] cursor-help text-[10px] border border-[#E8E0D4] rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">i</span>
                        <div className="hidden group-hover:block absolute bottom-5 left-0 w-52 bg-white border border-[#E8E0D4] rounded-[10px] p-2.5 text-[11px] text-[#5C4F3D] shadow-lg z-10">
                          Wie viel eigenes Geld du fuer diesen Kauf einsetzen willst.
                        </div>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={customProfile.eigenkapital}
                      onChange={(e) => setCustomProfile(prev => ({ ...prev, eigenkapital: parseFloat(e.target.value) || 0 }))}
                      placeholder="z.B. 50000"
                      className="w-full px-4 py-2.5 bg-white border border-[#E8E0D4] rounded-[10px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[14px]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[12px] font-medium text-[#5C4F3D]">Ziel-Rendite pro Jahr (%)</label>
                      <div className="group relative">
                        <span className="text-[#B5A68C] cursor-help text-[10px] border border-[#E8E0D4] rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">i</span>
                        <div className="hidden group-hover:block absolute bottom-5 left-0 w-52 bg-white border border-[#E8E0D4] rounded-[10px] p-2.5 text-[11px] text-[#5C4F3D] shadow-lg z-10">
                          Wie viel Prozent Gewinn du dir pro Jahr wuenschst. 3-6% ist ein guter Richtwert.
                        </div>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      value={customProfile.mindestRendite}
                      onChange={(e) => setCustomProfile(prev => ({ ...prev, mindestRendite: parseFloat(e.target.value) || 0 }))}
                      placeholder="z.B. 4"
                      className="w-full px-4 py-2.5 bg-white border border-[#E8E0D4] rounded-[10px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[14px]"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#8C7E6A]">Diese Einstellungen gelten nur fuer diese Analyse und ueberschreiben nicht dein Standardprofil.</p>
              </div>
            )}
          </div>
          )}

          {/* Hauptdaten */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div><label className={labelClass}>Kaufpreis (EUR) *</label><input type="number" name="kaufpreis" value={formData.kaufpreis} onChange={handleChange} required placeholder="z.B. 350000" className={inputClass} /></div>
            <div><label className={labelClass}>Wohnflache (m2) *</label><input type="number" name="wohnflaeche" value={formData.wohnflaeche} onChange={handleChange} required placeholder="z.B. 75" className={inputClass} /></div>
            <div><label className={labelClass}>Zimmer</label><input type="number" step="0.5" name="zimmer" value={formData.zimmer} onChange={handleChange} placeholder="z.B. 3" className={inputClass} /></div>
          </div>

          {sectionTitle('Lage')}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div><label className={labelClass}>Stadt *</label><input type="text" name="stadt" value={formData.stadt} onChange={handleChange} required placeholder="z.B. Munchen" className={inputClass} /></div>
            <div><label className={labelClass}>Stadtteil</label><input type="text" name="stadtteil" value={formData.stadtteil} onChange={handleChange} placeholder="z.B. Schwabing" className={inputClass} /></div>
            <div><label className={labelClass}>Adresse</label><input type="text" name="adresse" value={formData.adresse} onChange={handleChange} placeholder="z.B. Musterstrasse 12" className={inputClass} /></div>
          </div>

          {sectionTitle('Objektdetails')}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div><label className={labelClass}>Baujahr</label><input type="number" name="baujahr" value={formData.baujahr} onChange={handleChange} placeholder="z.B. 1985" className={inputClass} /></div>
            <div><label className={labelClass}>Etage</label><input type="text" name="etage" value={formData.etage} onChange={handleChange} placeholder="z.B. 2. OG" className={inputClass} /></div>
            <div><label className={labelClass}>Objekttyp</label><select name="objekttyp" value={formData.objekttyp} onChange={handleChange} className={selectClass}><option value="">Bitte wahlen</option><option value="Eigentumswohnung">Eigentumswohnung</option><option value="Einfamilienhaus">Einfamilienhaus</option><option value="Doppelhaushalfte">Doppelhaushalfte</option><option value="Reihenhaus">Reihenhaus</option><option value="Mehrfamilienhaus">Mehrfamilienhaus</option></select></div>
            <div><label className={labelClass}>Zustand</label><select name="zustand" value={formData.zustand} onChange={handleChange} className={selectClass}><option value="">Bitte wahlen</option><option value="Neubau">Neubau</option><option value="Neuwertig">Neuwertig</option><option value="Modernisiert">Modernisiert</option><option value="Gepflegt">Gepflegt</option><option value="Renovierungsbedurftig">Renovierungsbedurftig</option></select></div>
          </div>

          {sectionTitle('Energie')}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div><label className={labelClass}>Energieklasse</label><select name="energieklasse" value={formData.energieklasse} onChange={handleChange} className={selectClass}><option value="">Bitte wahlen</option>{['A+','A','B','C','D','E','F','G','H'].map(k => <option key={k} value={k}>{k}</option>)}</select></div>
            <div><label className={labelClass}>Heizungsart</label><input type="text" name="heizungsart" value={formData.heizungsart} onChange={handleChange} placeholder="z.B. Gas-Zentralheizung" className={inputClass} /></div>
          </div>

          {sectionTitle('Kosten')}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div><label className={labelClass}>Hausgeld / Monat (EUR)</label><input type="number" name="hausgeld" value={formData.hausgeld} onChange={handleChange} placeholder="z.B. 250" className={inputClass} /></div>
            <div><label className={labelClass}>Verkaufertyp</label><select name="verkaufertyp" value={formData.verkaufertyp} onChange={handleChange} className={selectClass}><option value="">Bitte wahlen</option><option value="Privat">Privat</option><option value="Makler">Makler</option></select></div>
            <div><label className={labelClass}>Provision</label><input type="text" name="provision" value={formData.provision} onChange={handleChange} placeholder="z.B. 3,57% oder provisionsfrei" className={inputClass} /></div>
          </div>

          {sectionTitle('Ausstattung')}
          <div className="flex flex-wrap gap-6 mb-8">
            <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="balkon_terrasse" checked={formData.balkon_terrasse} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Balkon / Terrasse</span></label>
            <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="keller" checked={formData.keller} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Keller</span></label>
            <div className="flex items-center gap-3"><label className="text-[13px] text-[#5C4F3D]">Stellplatz:</label><select name="stellplatz" value={formData.stellplatz} onChange={handleChange} className="px-3 py-2 bg-white border border-[#E8E0D4] rounded-[8px] text-[13px] focus:border-[#7C8B6F] focus:outline-none text-[#2C2418]"><option value="">Keiner</option><option value="Tiefgarage">Tiefgarage</option><option value="Aussenstellplatz">Aussenstellplatz</option><option value="Garage">Garage</option></select></div>
          </div>

          {verwendungszweck === 'kapitalanlage' && (
            <>
              {sectionTitle('Vermietung')}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div><label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="vermietet" checked={formData.vermietet} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Aktuell vermietet</span></label></div>
                <div><label className={labelClass}>Aktuelle Kaltmiete / Monat (EUR)</label><input type="number" name="aktuelle_miete" value={formData.aktuelle_miete} onChange={handleChange} placeholder="z.B. 850" className={inputClass} /></div>
              </div>

              {sectionTitle('Finanzierung')}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div><label className={labelClass}>Eigenkapital (EUR)</label><input type="number" name="eigenkapital" value={finanzierung.eigenkapital} onChange={handleFinanzierungChange} placeholder="0 = 100% Finanzierung" className={inputClass} /></div>
                <div><label className={labelClass}>Zinssatz (%)</label><input type="number" step="0.1" name="zinssatz" value={finanzierung.zinssatz} onChange={handleFinanzierungChange} className={inputClass} /></div>
                <div><label className={labelClass}>Tilgung (%)</label><input type="number" step="0.1" name="tilgung" value={finanzierung.tilgung} onChange={handleFinanzierungChange} className={inputClass} /></div>
              </div>
            </>
          )}

          <button type="submit" className="w-full py-4 bg-[#7C8B6F] text-white font-semibold rounded-full text-[16px] hover:bg-[#6B7A5E] transition-all mt-4 active:scale-[0.98]">
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Immobilie bewerten
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default PropertyForm;
