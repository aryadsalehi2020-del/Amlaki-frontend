import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile, INVESTMENT_GOALS } from '../contexts/UserProfileContext';

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
  const [finanzierung, setFinanzierung] = useState({ eigenkapital: 0, zinssatz: 3.75, tilgung: 1.25 });
  const [validationError, setValidationError] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const handleFinanzierungChange = useCallback((e) => {
    const { name, value } = e.target;
    setFinanzierung(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault(); setValidationError(null);
    const kaufpreis = formData.kaufpreis ? parseFloat(formData.kaufpreis) : 0;
    const wohnflaeche = formData.wohnflaeche ? parseFloat(formData.wohnflaeche) : 0;
    if (!kaufpreis || kaufpreis < 1000) { setValidationError('Bitte geben Sie einen gultigen Kaufpreis ein (min. 1.000)'); return; }
    if (!wohnflaeche || wohnflaeche < 5) { setValidationError('Bitte geben Sie eine gultige Wohnflache ein (min. 5 m2)'); return; }
    const processedData = { ...formData, kaufpreis, wohnflaeche, zimmer: formData.zimmer ? parseFloat(formData.zimmer) : null, baujahr: formData.baujahr ? parseInt(formData.baujahr) : null, nebenkosten: formData.nebenkosten ? parseFloat(formData.nebenkosten) : null, hausgeld: formData.hausgeld ? parseFloat(formData.hausgeld) : null, aktuelle_miete: formData.aktuelle_miete ? parseFloat(formData.aktuelle_miete) : null };
    onAnalyze(processedData, verwendungszweck, finanzierung);
  }, [formData, verwendungszweck, finanzierung, onAnalyze]);

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
                  <p>Cashflow & Rendite: 30% Gewichtung</p><p>Lage: 20% | Preis/m2: 15%</p><p>Fokus auf Vermietbarkeit</p>
                </div>
              </button>
              <button type="button" onClick={() => setVerwendungszweck('eigennutzung')}
                className={`py-5 px-6 rounded-[16px] border-2 font-medium transition-all text-left ${verwendungszweck === 'eigennutzung' ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] hover:border-[#B5A68C]'}`}>
                <span className={`text-[16px] block mb-2 ${verwendungszweck === 'eigennutzung' ? 'text-[#7C8B6F] font-semibold' : 'text-[#5C4F3D]'}`}>Eigennutzung</span>
                <div className={`text-[12px] space-y-1 ${verwendungszweck === 'eigennutzung' ? 'text-[#7C8B6F]/80' : 'text-[#8C7E6A]'}`}>
                  <p>Lage: 25% | Grundriss: 20%</p><p>Zustand: 15% | Zukunft: 15%</p><p>Fokus auf Wohnqualitat</p>
                </div>
              </button>
            </div>
            {verwendungszweck === 'kapitalanlage' && <p className="mt-3 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">Bei Kapitalanlage wird Cashflow, Rendite und Mietpotenzial priorisiert</p>}
            {verwendungszweck === 'eigennutzung' && <p className="mt-3 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">Bei Eigennutzung wird Wohnqualitat, Lage und Zustand priorisiert</p>}
          </div>

          {/* Investoren-Profil */}
          <div className="mb-10 p-6 bg-[#FAF7F2] rounded-[16px] border border-[#E8E0D4]">
            <label className="text-[16px] font-semibold text-[#2C2418] block mb-1">Dein Investment-Ziel</label>
            <p className="text-[13px] text-[#8C7E6A] mb-4">Personalisiere die Bewertung nach deiner Strategie</p>
            {isProfileComplete ? (
              <div className="flex flex-col md:flex-row md:items-center gap-4 bg-[#7C8B6F]/5 rounded-[12px] p-4 border border-[#7C8B6F]/20">
                <div className="flex items-center gap-3 flex-1">
                  <div>
                    <p className="text-[#7C8B6F] font-semibold text-[16px]">{INVESTMENT_GOALS[investorProfile.goal]?.label}</p>
                    <p className="text-[#8C7E6A] text-[13px]">{INVESTMENT_GOALS[investorProfile.goal]?.description}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-end">
                  <span className="text-[#7C8B6F] text-[13px] flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Scores werden personalisiert
                  </span>
                  <Link to="/profile" className="px-4 py-2 bg-white border border-[#E8E0D4] text-[#5C4F3D] rounded-[10px] font-medium hover:bg-[#F5F0E8] transition-all text-[13px]">Ziel andern</Link>
                </div>
              </div>
            ) : (
              <Link to="/profile" className="flex flex-col md:flex-row md:items-center gap-4 bg-[#F5F0E8] rounded-[12px] p-4 border border-[#E8E0D4] hover:bg-[#E8E0D4]/50 transition-all group">
                <div className="flex items-center gap-3 flex-1">
                  <div>
                    <p className="text-[#5C4F3D] font-semibold">Noch kein Ziel definiert</p>
                    <p className="text-[#8C7E6A] text-[13px]">Richte dein Profil ein fur personalisierte Scores</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-white border border-[#E8E0D4] text-[#5C4F3D] rounded-[10px] font-medium text-[13px]">Jetzt einrichten</span>
              </Link>
            )}
          </div>

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
