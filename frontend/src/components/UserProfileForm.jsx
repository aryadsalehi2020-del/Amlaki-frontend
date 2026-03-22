import React, { useState, useEffect } from 'react';

function UserProfileForm({ profile, onProfileChange }) {
  const [formData, setFormData] = useState({
    jahreseinkommen: profile?.jahreseinkommen || '', eigenkapital: profile?.eigenkapital || '', beruf: profile?.beruf || 'angestellt',
    kinder: profile?.kinder || 0, bundesland: profile?.bundesland || 'Hessen', verheiratet: profile?.verheiratet || false,
    hatDepot: profile?.hatDepot || false, depotWert: profile?.depotWert || '', hatLebensversicherung: profile?.hatLebensversicherung || false,
    lvRueckkaufswert: profile?.lvRueckkaufswert || '', hatRiester: profile?.hatRiester || false, riesterGuthaben: profile?.riesterGuthaben || '',
    hatBausparvertrag: profile?.hatBausparvertrag || false, bausparGuthaben: profile?.bausparGuthaben || '',
    schufa: profile?.schufa || 'gut', befristetAngestellt: profile?.befristetAngestellt || false, probezeit: profile?.probezeit || false,
    bestehendeKredite: profile?.bestehendeKredite || '',
  });

  useEffect(() => { onProfileChange(formData); }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || '' : value }));
  };

  const bundeslaender = ['Baden-Wurttemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'NRW', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thuringen'];

  const inputClass = "w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] placeholder:text-[#B5A68C] text-[15px]";
  const labelClass = "block text-[13px] font-medium text-[#5C4F3D] mb-2";

  return (
    <div className="space-y-6">
      {/* Finanzielle Situation */}
      <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
        <h3 className="text-[18px] font-semibold text-[#2C2418] mb-6">Finanzielle Situation</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div><label className={labelClass}>Jahreseinkommen brutto (EUR)</label><input type="number" name="jahreseinkommen" value={formData.jahreseinkommen} onChange={handleChange} placeholder="z.B. 60000" className={inputClass} /><p className="text-[12px] text-[#8C7E6A] mt-1">Wichtig fur Forderungsgrenzen</p></div>
          <div><label className={labelClass}>Verfugbares Eigenkapital (EUR)</label><input type="number" name="eigenkapital" value={formData.eigenkapital} onChange={handleChange} placeholder="z.B. 50000" className={inputClass} /><p className="text-[12px] text-[#8C7E6A] mt-1">Bargeld + kurzfristig verfugbar</p></div>
          <div><label className={labelClass}>Bestehende Kreditraten (EUR/Monat)</label><input type="number" name="bestehendeKredite" value={formData.bestehendeKredite} onChange={handleChange} placeholder="z.B. 300" className={inputClass} /><p className="text-[12px] text-[#8C7E6A] mt-1">Auto, Konsumkredit, etc.</p></div>
          <div><label className={labelClass}>SCHUFA-Score</label><select name="schufa" value={formData.schufa} onChange={handleChange} className={inputClass}><option value="sehr-gut">Sehr gut (97-100%)</option><option value="gut">Gut (90-97%)</option><option value="mittel">Mittel (80-90%)</option><option value="schlecht">Problematisch (&lt;80%)</option></select></div>
        </div>
      </div>

      {/* Berufliche Situation */}
      <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
        <h3 className="text-[18px] font-semibold text-[#2C2418] mb-6">Berufliche Situation</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div><label className={labelClass}>Beschaftigungsart</label><select name="beruf" value={formData.beruf} onChange={handleChange} className={inputClass}><option value="angestellt">Angestellt (unbefristet)</option><option value="beamte">Beamte/r</option><option value="selbststaendig">Selbststandig/Freiberufler</option><option value="befristet">Befristet angestellt</option><option value="rentner">Rentner/in</option></select></div>
          <div><label className={labelClass}>Bundesland</label><select name="bundesland" value={formData.bundesland} onChange={handleChange} className={inputClass}>{bundeslaender.map(bl => (<option key={bl} value={bl}>{bl}</option>))}</select><p className="text-[12px] text-[#8C7E6A] mt-1">Fur Landesforderung + Grunderwerbsteuer</p></div>
        </div>
        <div className="flex flex-wrap gap-6 mt-6">
          <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="probezeit" checked={formData.probezeit} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Noch in Probezeit</span></label>
          <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" name="verheiratet" checked={formData.verheiratet} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" /><span className="text-[#5C4F3D] group-hover:text-[#2C2418] transition-colors text-[14px]">Verheiratet</span></label>
        </div>
      </div>

      {/* Familie */}
      <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
        <h3 className="text-[18px] font-semibold text-[#2C2418] mb-6">Familie</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div><label className={labelClass}>Anzahl Kinder</label><select name="kinder" value={formData.kinder} onChange={handleChange} className={inputClass}><option value={0}>Keine Kinder</option><option value={1}>1 Kind</option><option value={2}>2 Kinder</option><option value={3}>3 Kinder</option><option value={4}>4+ Kinder</option></select><p className="text-[12px] text-[#7C8B6F] mt-1">Wichtig! Kinder erhohen KfW-Forderung erheblich</p></div>
        </div>
      </div>

      {/* Bestehendes Vermogen */}
      <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
        <h3 className="text-[18px] font-semibold text-[#2C2418] mb-2">Bestehendes Verm&ouml;gen (EK-Ersatz)</h3>
        <p className="text-[#8C7E6A] text-[13px] mb-6">Diese Werte k&ouml;nnen als Eigenkapital-Ersatz dienen und verbessern deine Kreditchancen</p>
        <div className="space-y-4">
          {[
            { name: 'hatDepot', label: 'Wertpapierdepot vorhanden', valueName: 'depotWert', hint: 'Lombardkredit moglich: bis 70% beleihbar', placeholder: 'Depotwert in EUR' },
            { name: 'hatLebensversicherung', label: 'Kapital-Lebensversicherung', valueName: 'lvRueckkaufswert', hint: 'Policendarlehen moglich: bis 100% beleihbar', placeholder: 'Ruckkaufswert in EUR' },
            { name: 'hatRiester', label: 'Riester-Vertrag', valueName: 'riesterGuthaben', hint: 'Wohn-Riester: 100% fur Immobilienkauf entnehmbar', placeholder: 'Guthaben in EUR' },
            { name: 'hatBausparvertrag', label: 'Bausparvertrag', valueName: 'bausparGuthaben', hint: 'Direktes Eigenkapital + gunstiges Bauspardarlehen', placeholder: 'Guthaben in EUR' },
          ].map(item => (
            <div key={item.name} className="p-4 bg-[#FAF7F2] rounded-[12px]">
              <label className="flex items-center gap-3 cursor-pointer group mb-3">
                <input type="checkbox" name={item.name} checked={formData[item.name]} onChange={handleChange} className="w-5 h-5 rounded bg-white border-[#E8E0D4] text-[#7C8B6F] focus:ring-[#7C8B6F]/50" />
                <span className="text-[#2C2418] font-medium text-[14px]">{item.label}</span>
              </label>
              {formData[item.name] && (
                <div className="ml-8">
                  <input type="number" name={item.valueName} value={formData[item.valueName]} onChange={handleChange} placeholder={item.placeholder} className={inputClass} />
                  <p className="text-[12px] text-[#7C8B6F] mt-1">{item.hint}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserProfileForm;
