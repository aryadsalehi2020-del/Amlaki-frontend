import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile, INVESTMENT_GOALS, RISK_PROFILES } from '../contexts/UserProfileContext';
import { useAuth } from '../contexts/AuthContext';

function PropertyForm({ initialData, onAnalyze, onBack }) {
  const { profile: investorProfile, isProfileComplete } = useUserProfile();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    kaufpreis: initialData?.kaufpreis || '', wohnflaeche: initialData?.wohnflaeche || '', zimmer: initialData?.zimmer || '',
    baujahr: initialData?.baujahr || '', etage: initialData?.etage || '', nebenkosten: initialData?.nebenkosten || '',
    hausgeld: initialData?.hausgeld || '', hausgeld_nicht_umlagefaehig: initialData?.hausgeld_nicht_umlagefaehig || '', energieklasse: initialData?.energieklasse || '', heizungsart: initialData?.heizungsart || '',
    adresse: initialData?.adresse || '', plz: initialData?.plz || '', stadt: initialData?.stadt || '', stadtteil: initialData?.stadtteil || '',
    objekttyp: initialData?.objekttyp || '', zustand: initialData?.zustand || '', ausstattung: initialData?.ausstattung || '',
    balkon_terrasse: initialData?.balkon_terrasse || false, keller: initialData?.keller || false,
    stellplatz: initialData?.stellplatz || '', vermietet: initialData?.vermietet || false,
    aktuelle_miete: initialData?.aktuelle_miete || '',
    verkaufertyp: initialData?.verkaufertyp || initialData?.['verkäufertyp'] || (initialData?.provision ? 'Makler' : ''),
    provision: initialData?.provision || '',
  });

  const [verwendungszweck, setVerwendungszweck] = useState('kapitalanlage');
  const [besichtigt, setBesichtigt] = useState(null); // null = nicht ausgewählt, true/false
  const [besichtigungsNotizen, setBesichtigungsNotizen] = useState('');
  const [finanzierung, setFinanzierung] = useState({ eigenkapital: 0, zinssatz: user?.default_zinssatz || 3.75, tilgung: user?.default_tilgung || 1.25 });
  const [validationError, setValidationError] = useState(null);

  // Profile toggle: 'default' uses global profile, 'custom' uses local overrides
  const [profileMode, setProfileMode] = useState('default');
  const [customProfile, setCustomProfile] = useState({
    goals: investorProfile.goals || (investorProfile.goal ? [investorProfile.goal] : ['cashflow']),
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
      goals: investorProfile.goals || (investorProfile.goal ? [investorProfile.goal] : ['cashflow']),
      goal: Array.isArray(investorProfile.goals) ? investorProfile.goals[0] : (investorProfile.goal || 'cashflow'),
      riskProfile: investorProfile.riskProfile,
      eigenkapital: investorProfile.eigenkapital,
      mindestRendite: investorProfile.mindestRendite,
    };
  }, [profileMode, customProfile, investorProfile]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault(); setValidationError(null);
    const kaufpreis = formData.kaufpreis ? parseFloat(formData.kaufpreis) : 0;
    const wohnflaeche = formData.wohnflaeche ? parseFloat(formData.wohnflaeche) : 0;
    if (!kaufpreis || kaufpreis < 1000) { setValidationError('Bitte gib einen g\u00fcltigen Kaufpreis ein (min. 1.000)'); return; }
    if (!wohnflaeche || wohnflaeche < 5) { setValidationError('Bitte gib eine g\u00fcltige Wohnfl\u00e4che ein (min. 5 m\u00b2)'); return; }
    const processedData = { ...formData, kaufpreis, wohnflaeche, zimmer: formData.zimmer ? parseFloat(formData.zimmer) : null, baujahr: formData.baujahr ? parseInt(formData.baujahr) : null, nebenkosten: formData.nebenkosten ? parseFloat(formData.nebenkosten) : null, hausgeld: formData.hausgeld ? parseFloat(formData.hausgeld) : null, hausgeld_nicht_umlagefaehig: formData.hausgeld_nicht_umlagefaehig ? parseFloat(formData.hausgeld_nicht_umlagefaehig) : null, aktuelle_miete: formData.aktuelle_miete ? parseFloat(formData.aktuelle_miete) : null };
    const activeProfile = verwendungszweck === 'kapitalanlage' ? getActiveProfile() : null;
    onAnalyze(processedData, verwendungszweck, finanzierung, activeProfile, besichtigt, besichtigungsNotizen);
  }, [formData, verwendungszweck, finanzierung, onAnalyze, getActiveProfile]);

  const inputClass = "w-full px-3 py-2.5 bg-white border border-[#E8E0D4] rounded-[10px] focus:outline-none focus:border-[#7C8B6F] focus:ring-2 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] placeholder:text-[#B5A68C] text-[14px]";
  const labelClass = "block text-[12px] font-medium text-[#5C4F3D] mb-1";
  const selectClass = "w-full px-3 py-2.5 bg-white border border-[#E8E0D4] rounded-[10px] focus:outline-none focus:border-[#7C8B6F] focus:ring-2 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[14px]";
  const sectionTitle = (label) => <h3 className="text-[14px] font-semibold text-[#2C2418] mb-3 mt-2">{label}</h3>;

  return (
    <div className="fade-in">
      <div className="bg-white rounded-[20px] p-4 md:p-10 border border-[#E8E0D4]">
        <div className="mb-4 md:mb-8">
          <button onClick={onBack} className="text-[#8C7E6A] hover:text-[#5C4F3D] transition-colors text-[13px] mb-2 flex items-center gap-1">
            &larr; Zur&uuml;ck
          </button>
          <h2 className="text-[20px] md:text-[28px] font-bold text-[#2C2418] text-center">Objektdaten</h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Top submit button */}
          <button type="submit" className="w-full py-3.5 bg-[#7C8B6F] text-white font-semibold rounded-full text-[15px] hover:bg-[#6B7A5E] transition-all mb-6 active:scale-[0.98]">
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Immobilie bewerten
            </span>
          </button>
          {validationError && (
            <div className="mb-6 p-4 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[14px]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {validationError}
              </div>
            </div>
          )}

          {/* Verwendungszweck */}
          <div className="mb-6 p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E8E0D4]">
            <label className="text-[13px] font-semibold text-[#2C2418] block mb-2">Verwendungszweck</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setVerwendungszweck('kapitalanlage')}
                className={`py-2.5 px-3 rounded-[10px] border-2 font-medium transition-all text-center ${verwendungszweck === 'kapitalanlage' ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]' : 'border-[#E8E0D4] text-[#5C4F3D] hover:border-[#B5A68C]'}`}>
                <span className="text-[13px]">Kapitalanlage</span>
              </button>
              <button type="button" onClick={() => setVerwendungszweck('eigennutzung')}
                className={`py-2.5 px-3 rounded-[10px] border-2 font-medium transition-all text-center ${verwendungszweck === 'eigennutzung' ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]' : 'border-[#E8E0D4] text-[#5C4F3D] hover:border-[#B5A68C]'}`}>
                <span className="text-[13px]">Eigennutzung</span>
              </button>
            </div>
          </div>

          {/* Besichtigung */}
          <div className="mb-6 p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E8E0D4]">
            <label className="text-[13px] font-semibold text-[#2C2418] block mb-2">Schon besichtigt?</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setBesichtigt(true)}
                className={`py-2 px-3 rounded-[10px] border-2 font-medium transition-all text-center text-[13px] ${besichtigt === true ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]' : 'border-[#E8E0D4] text-[#5C4F3D] hover:border-[#B5A68C]'}`}>
                Ja
              </button>
              <button type="button" onClick={() => setBesichtigt(false)}
                className={`py-2 px-3 rounded-[10px] border-2 font-medium transition-all text-center text-[13px] ${besichtigt === false ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]' : 'border-[#E8E0D4] text-[#5C4F3D] hover:border-[#B5A68C]'}`}>
                Nein
              </button>
            </div>
            {besichtigt === true && (
              <div className="mt-3">
                <textarea
                  value={besichtigungsNotizen}
                  onChange={(e) => setBesichtigungsNotizen(e.target.value)}
                  placeholder="Notizen: z.B. Keller feucht, Heizung 2005..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D4] rounded-[10px] focus:outline-none focus:border-[#7C8B6F] transition-all text-[#2C2418] placeholder:text-[#B5A68C] text-[13px] resize-none"
                />
              </div>
            )}
          </div>

          {/* Investoren-Profil / Wohnprofil */}
          {verwendungszweck === 'eigennutzung' ? (
          <div className="mb-6 p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E8E0D4]">
            <label className="text-[13px] font-semibold text-[#2C2418] block mb-2">Bewertungs-Gewichtung</label>
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
          <div className="mb-6 p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E8E0D4]">
            <label className="text-[13px] font-semibold text-[#2C2418] block mb-2">Investment-Profil</label>

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
                      <span className="text-[#7C8B6F] font-semibold text-[14px]">{(Array.isArray(investorProfile.goals) ? investorProfile.goals : [investorProfile.goal || 'cashflow']).map(g => INVESTMENT_GOALS[g]?.label).filter(Boolean).join(', ')}</span>
                      <span className="text-[#B5A68C]">|</span>
                      <span className="text-[#5C4F3D] text-[14px]">{RISK_PROFILES[investorProfile.riskProfile]?.label}</span>
                      <span className="text-[#B5A68C]">|</span>
                      <span className="text-[#5C4F3D] text-[14px]">{Number(investorProfile.eigenkapital).toLocaleString('de-DE')} € EK</span>
                    </div>
                    <Link to="/settings" className="px-4 py-2 bg-white border border-[#E8E0D4] text-[#5C4F3D] rounded-[10px] font-medium hover:bg-[#F5F0E8] transition-all text-[13px] shrink-0">
                      Standard &auml;ndern
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
                  <label className="block text-[12px] font-medium text-[#5C4F3D] mb-2">Investment-Ziele (mehrere m&ouml;glich)</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(INVESTMENT_GOALS).map(([key, goal]) => {
                      const goals = customProfile.goals || [];
                      const isSelected = goals.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCustomProfile(prev => {
                            const current = prev.goals || [];
                            const updated = current.includes(key) ? current.filter(g => g !== key) : [...current, key];
                            return { ...prev, goals: updated.length > 0 ? updated : current };
                          })}
                          className={`py-2 px-4 rounded-[10px] border text-[13px] font-medium transition-all ${
                            isSelected
                              ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 text-[#7C8B6F]'
                              : 'border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                          }`}
                        >
                          {goal.label}
                        </button>
                      );
                    })}
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
                      <label className="text-[12px] font-medium text-[#5C4F3D]">Eigenkapital f&uuml;r dieses Objekt</label>
                      <div className="group relative">
                        <span className="text-[#B5A68C] cursor-help text-[10px] border border-[#E8E0D4] rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">i</span>
                        <div className="hidden group-hover:block absolute bottom-5 left-0 w-52 bg-white border border-[#E8E0D4] rounded-[10px] p-2.5 text-[11px] text-[#5C4F3D] shadow-lg z-10">
                          Wie viel eigenes Geld du f&uuml;r diesen Kauf einsetzen willst.
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
                          Wie viel Prozent Gewinn du dir pro Jahr w\u00fcnschst. 3-6% ist ein guter Richtwert.
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

                <p className="text-[11px] text-[#8C7E6A]">Diese Einstellungen gelten nur f&uuml;r diese Analyse und &uuml;berschreiben nicht dein Standardprofil.</p>
              </div>
            )}
          </div>
          )}

          {/* Hauptdaten */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div><label className={labelClass}>Kaufpreis (&euro;) *</label><input type="number" name="kaufpreis" value={formData.kaufpreis} onChange={handleChange} required placeholder="350000" className={inputClass} /></div>
            <div><label className={labelClass}>Wohnfl&auml;che (m&sup2;) *</label><input type="number" name="wohnflaeche" value={formData.wohnflaeche} onChange={handleChange} required placeholder="75" className={inputClass} /></div>
            <div><label className={labelClass}>Zimmer</label><input type="number" step="0.5" name="zimmer" value={formData.zimmer} onChange={handleChange} placeholder="3" className={inputClass} /></div>
          </div>

          {sectionTitle('Lage')}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div><label className={labelClass}>PLZ</label><input type="text" name="plz" value={formData.plz} onChange={handleChange} placeholder="22297" className={inputClass} maxLength={5} /></div>
            <div><label className={labelClass}>Stadt *</label><input type="text" name="stadt" value={formData.stadt} onChange={handleChange} required placeholder="Hamburg" className={inputClass} /></div>
            <div><label className={labelClass}>Stadtteil</label><input type="text" name="stadtteil" value={formData.stadtteil} onChange={handleChange} placeholder="Winterhude" className={inputClass} /></div>
            <div><label className={labelClass}>Adresse</label><input type="text" name="adresse" value={formData.adresse} onChange={handleChange} placeholder="Musterstra&szlig;e 12" className={inputClass} /></div>
          </div>

          {sectionTitle('Objektdetails')}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div><label className={labelClass}>Baujahr</label><input type="number" name="baujahr" value={formData.baujahr} onChange={handleChange} placeholder="z.B. 1985" className={inputClass} /></div>
            <div><label className={labelClass}>Etage</label><input type="text" name="etage" value={formData.etage} onChange={handleChange} placeholder="z.B. 2. OG" className={inputClass} /></div>
            <div><label className={labelClass}>Objekttyp</label><select name="objekttyp" value={formData.objekttyp} onChange={handleChange} className={selectClass}><option value="">Bitte w&auml;hlen</option><option value="Eigentumswohnung">Eigentumswohnung</option><option value="Einfamilienhaus">Einfamilienhaus</option><option value="Doppelhaushälfte">Doppelhaush&auml;lfte</option><option value="Reihenhaus">Reihenhaus</option><option value="Mehrfamilienhaus">Mehrfamilienhaus</option></select></div>
            <div><label className={labelClass}>Zustand</label><select name="zustand" value={formData.zustand} onChange={handleChange} className={selectClass}><option value="">Bitte w&auml;hlen</option><option value="Neubau">Neubau</option><option value="Neuwertig">Neuwertig</option><option value="Modernisiert">Modernisiert</option><option value="Gepflegt">Gepflegt</option><option value="Renovierungsbedürftig">Renovierungsbed&uuml;rftig</option></select></div>
          </div>

          {sectionTitle('Energie')}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div><label className={labelClass}>Energieklasse</label><select name="energieklasse" value={formData.energieklasse} onChange={handleChange} className={selectClass}><option value="">Bitte w&auml;hlen</option>{['A+','A','B','C','D','E','F','G','H'].map(k => <option key={k} value={k}>{k}</option>)}</select></div>
            <div><label className={labelClass}>Heizungsart</label><input type="text" name="heizungsart" value={formData.heizungsart} onChange={handleChange} placeholder="z.B. Gas-Zentralheizung" className={inputClass} /></div>
          </div>

          {sectionTitle('Kosten')}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className={labelClass}>Hausgeld / Monat (&euro;)</label><input type="number" name="hausgeld" value={formData.hausgeld} onChange={handleChange} placeholder="z.B. 250" className={inputClass} /></div>
            <div><label className={labelClass}>Davon nicht umlagef&auml;hig (&euro;)</label><input type="number" name="hausgeld_nicht_umlagefaehig" value={formData.hausgeld_nicht_umlagefaehig} onChange={handleChange} placeholder="Steht oft im Exposé, sonst leer" className={inputClass} /><p className="text-[11px] text-[#B5A68C] mt-1">Wenn nicht bekannt, schätzen wir ca. 30% des Hausgelds</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div><label className={labelClass}>Verk&auml;ufertyp</label><select name="verkaufertyp" value={formData.verkaufertyp} onChange={handleChange} className={selectClass}><option value="">Bitte wählen</option><option value="Privat">Privat</option><option value="Makler">Makler</option></select></div>
            <div><label className={labelClass}>Provision</label><input type="text" name="provision" value={formData.provision} onChange={handleChange} placeholder="z.B. 3,57% oder provisionsfrei" className={inputClass} /></div>
          </div>

          {sectionTitle('Ausstattung')}
          <div className="flex flex-wrap gap-4 mb-5">
            <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="balkon_terrasse" checked={formData.balkon_terrasse} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Balkon / Terrasse</span></label>
            <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="keller" checked={formData.keller} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Keller</span></label>
            <div className="flex items-center gap-3"><label className="text-[13px] text-[#5C4F3D]">Stellplatz:</label><select name="stellplatz" value={formData.stellplatz} onChange={handleChange} className="px-3 py-2 bg-white border border-[#E8E0D4] rounded-[8px] text-[13px] focus:border-[#7C8B6F] focus:outline-none text-[#2C2418]"><option value="">Keiner</option><option value="Tiefgarage">Tiefgarage</option><option value="Außenstellplatz">Au&szlig;enstellplatz</option><option value="Garage">Garage</option></select></div>
          </div>

          {verwendungszweck === 'kapitalanlage' && (
            <>
              {sectionTitle('Vermietung')}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div><label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="vermietet" checked={formData.vermietet} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Aktuell vermietet</span></label></div>
                <div><label className={labelClass}>Aktuelle Kaltmiete / Monat (&euro;)</label><input type="number" name="aktuelle_miete" value={formData.aktuelle_miete} onChange={handleChange} placeholder="z.B. 850" className={inputClass} /></div>
              </div>

              {sectionTitle('Finanzierung')}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                <div>
                  <label className={labelClass}>Eigenkapital (&euro;)</label>
                  <input type="number" name="eigenkapital" value={finanzierung.eigenkapital} onChange={handleFinanzierungChange} placeholder="0 = 100% Finanzierung" className={inputClass} />
                  {formData.kaufpreis > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: 'Nur NK', value: Math.round(formData.kaufpreis * 0.12) },
                        { label: '10% + NK', value: Math.round(formData.kaufpreis * 0.22) },
                        { label: '20% + NK', value: Math.round(formData.kaufpreis * 0.32) },
                        { label: '30% + NK', value: Math.round(formData.kaufpreis * 0.42) },
                      ].map((opt) => (
                        <button key={opt.label} type="button"
                          onClick={() => setFinanzierung(prev => ({ ...prev, eigenkapital: opt.value }))}
                          className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${finanzierung.eigenkapital === opt.value ? 'bg-[#7C8B6F] text-white border-[#7C8B6F]' : 'border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'}`}>
                          {opt.label} ({(opt.value / 1000).toFixed(0)}k)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div><label className={labelClass}>Zinssatz (%)</label><input type="number" step="0.1" name="zinssatz" value={finanzierung.zinssatz} onChange={handleFinanzierungChange} className={inputClass} /></div>
                <div><label className={labelClass}>Tilgung (%)</label><input type="number" step="0.1" name="tilgung" value={finanzierung.tilgung} onChange={handleFinanzierungChange} className={inputClass} /></div>
              </div>
            </>
          )}

          <button type="submit" className="w-full py-3.5 bg-[#7C8B6F] text-white font-semibold rounded-full text-[15px] hover:bg-[#6B7A5E] transition-all mt-3 active:scale-[0.98]">
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
