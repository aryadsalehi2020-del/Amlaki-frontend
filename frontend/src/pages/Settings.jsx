import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile, INVESTMENT_GOALS, RISK_PROFILES, EXPERIENCE_LEVELS } from '../contexts/UserProfileContext';
import { API_BASE } from '../config';

function Settings() {
  const { user, token, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { profile: investorProfile, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    default_verwendungszweck: user?.default_verwendungszweck || 'kapitalanlage',
    default_zinssatz: user?.default_zinssatz || 3.75,
    default_tilgung: user?.default_tilgung || 1.25
  });
  const [profileData, setProfileData] = useState({
    goals: Array.isArray(investorProfile.goals) ? investorProfile.goals : (investorProfile.goal ? [investorProfile.goal] : ['cashflow']),
    riskProfile: investorProfile.riskProfile || 'ausgewogen',
    experience: investorProfile.experience || 'anfaenger',
    eigenkapital: investorProfile.eigenkapital || 50000,
    mindestRendite: investorProfile.mindestRendite || 4,
    maxMonatlicheBelastung: investorProfile.maxMonatlicheBelastung || 1500,
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateUser(formData);
      setSuccess('Einstellungen erfolgreich gespeichert!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-16 lg:px-20 py-6 md:py-20 max-w-[900px]">
      {/* Header */}
      <div className="mb-6 md:mb-10 fade-in">
        <h1 className="text-[26px] md:text-[48px] font-bold tracking-tight text-[#2C2418] leading-[1.05]">
          Einstellungen
        </h1>
        <p className="text-[#8C7E6A] text-[13px] mt-1">
          Passe dein Profil und Standardwerte an
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-[#7C8B6F]/10 border border-[#7C8B6F]/30 rounded-[12px] text-[#7C8B6F] mb-6 fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[14px]">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] mb-6 fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[14px]">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-[16px] p-6 md:p-8 border border-[#E8E0D4] fade-in fade-in-delay-1">
          <h2 className="text-[18px] font-semibold text-[#2C2418] mb-6">
            Profil
          </h2>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-[#F5F0E8] border border-[#E8E0D4] rounded-[12px] text-[#8C7E6A] cursor-not-allowed text-[15px]"
                />
                <p className="text-[12px] text-[#8C7E6A] mt-1">E-Mail kann nicht ge&auml;ndert werden</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full px-4 py-3 bg-[#F5F0E8] border border-[#E8E0D4] rounded-[12px] text-[#8C7E6A] cursor-not-allowed text-[15px]"
                />
                <p className="text-[12px] text-[#8C7E6A] mt-1">Username kann nicht ge&auml;ndert werden</p>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                Vollst&auml;ndiger Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Max Mustermann"
                className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] placeholder:text-[#B5A68C] text-[15px]"
              />
            </div>
          </div>
        </div>

        {/* Default Analysis Settings */}
        <div className="bg-white rounded-[16px] p-6 md:p-8 border border-[#E8E0D4] fade-in fade-in-delay-2">
          <h2 className="text-[18px] font-semibold text-[#2C2418] mb-2">
            Standard-Analysewerte
          </h2>
          <p className="text-[#8C7E6A] text-[13px] mb-6">
            Diese Werte werden als Standard f&uuml;r neue Analysen verwendet
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                Standard-Verwendungszweck
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, default_verwendungszweck: 'kapitalanlage' })}
                  className={`py-4 px-6 rounded-[12px] border-2 font-medium transition-all text-[15px] ${
                    formData.default_verwendungszweck === 'kapitalanlage'
                      ? 'border-[#7C8B6F] bg-[#7C8B6F]/10 text-[#7C8B6F]'
                      : 'border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                  }`}
                >
                  Kapitalanlage
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, default_verwendungszweck: 'eigennutzung' })}
                  className={`py-4 px-6 rounded-[12px] border-2 font-medium transition-all text-[15px] ${
                    formData.default_verwendungszweck === 'eigennutzung'
                      ? 'border-[#7C8B6F] bg-[#7C8B6F]/10 text-[#7C8B6F]'
                      : 'border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                  }`}
                >
                  Eigennutzung
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                  Standard-Zinssatz (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="default_zinssatz"
                  value={formData.default_zinssatz}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[15px]"
                />
                <p className="text-[12px] text-[#8C7E6A] mt-1">Aktuell empfohlen: 3.75%</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                  Standard-Tilgung (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="default_tilgung"
                  value={formData.default_tilgung}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[15px]"
                />
                <p className="text-[12px] text-[#8C7E6A] mt-1">Aktuell empfohlen: 1.25%</p>
              </div>
            </div>

            <div className="p-4 bg-[#F5F0E8] border border-[#E8E0D4] rounded-[12px]">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#7C8B6F] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-[13px]">
                  <p className="text-[#5C4F3D] font-medium mb-1">Info</p>
                  <p className="text-[#8C7E6A] leading-relaxed">
                    Die Gesamtrate (Zins + Tilgung) von <span className="text-[#5C4F3D] font-semibold">{(formData.default_zinssatz + formData.default_tilgung).toFixed(2)}%</span> wird f&uuml;r Cashflow-Berechnungen verwendet. Du kannst diese Werte jederzeit bei einzelnen Analysen anpassen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dein Anlageprofil */}
        <div className="bg-white rounded-[16px] p-6 md:p-8 border border-[#E8E0D4] fade-in fade-in-delay-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[18px] font-semibold text-[#2C2418]">
              Dein Anlageprofil
            </h2>
            {profileSuccess && (
              <span className="text-[13px] text-[#7C8B6F] font-medium">{profileSuccess}</span>
            )}
          </div>
          <p className="text-[#8C7E6A] text-[13px] mb-6">
            Dein Standard-Investmentprofil f&uuml;r neue Analysen
          </p>

          {/* Investitionsziel (Multi-Select) */}
          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#5C4F3D] mb-1">
              Investitionsziele
            </label>
            <p className="text-[11px] text-[#8C7E6A] mb-3">Mehrere ausw&auml;hlbar</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(INVESTMENT_GOALS).map(([key, goal]) => {
                const isSelected = profileData.goals.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProfileData(prev => {
                      const current = prev.goals || [];
                      const updated = current.includes(key)
                        ? current.filter(g => g !== key)
                        : [...current, key];
                      return { ...prev, goals: updated.length > 0 ? updated : current };
                    })}
                    className={`py-2.5 px-2.5 rounded-[12px] border-2 text-left transition-all overflow-hidden ${
                      isSelected
                        ? 'border-[#7C8B6F] bg-[#7C8B6F]/5'
                        : 'border-[#E8E0D4] hover:border-[#B5A68C]'
                    }`}
                  >
                    <span className={`text-[12px] font-medium block truncate ${
                      isSelected ? 'text-[#7C8B6F]' : 'text-[#5C4F3D]'
                    }`}>{goal.label}</span>
                    <span className={`text-[10px] block mt-0.5 leading-snug ${
                      isSelected ? 'text-[#7C8B6F]/70' : 'text-[#8C7E6A]'
                    }`}>{goal.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risikoprofil */}
          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#5C4F3D] mb-3">
              Risikoprofil
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(RISK_PROFILES).map(([key, rp]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfileData(prev => ({ ...prev, riskProfile: key }))}
                  className={`py-2.5 px-2.5 rounded-[12px] border-2 text-left transition-all overflow-hidden ${
                    profileData.riskProfile === key
                      ? 'border-[#7C8B6F] bg-[#7C8B6F]/5'
                      : 'border-[#E8E0D4] hover:border-[#B5A68C]'
                  }`}
                >
                  <span className={`text-[12px] font-medium block truncate ${
                    profileData.riskProfile === key ? 'text-[#7C8B6F]' : 'text-[#5C4F3D]'
                  }`}>{rp.label}</span>
                  <span className={`text-[10px] block mt-0.5 leading-snug ${
                    profileData.riskProfile === key ? 'text-[#7C8B6F]/70' : 'text-[#8C7E6A]'
                  }`}>{rp.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Erfahrungslevel */}
          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#5C4F3D] mb-3">
              Erfahrungslevel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(EXPERIENCE_LEVELS).map(([key, exp]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfileData(prev => ({ ...prev, experience: key }))}
                  className={`py-2.5 px-2.5 rounded-[12px] border-2 text-left transition-all overflow-hidden ${
                    profileData.experience === key
                      ? 'border-[#7C8B6F] bg-[#7C8B6F]/5'
                      : 'border-[#E8E0D4] hover:border-[#B5A68C]'
                  }`}
                >
                  <span className={`text-[12px] font-medium block truncate ${
                    profileData.experience === key ? 'text-[#7C8B6F]' : 'text-[#5C4F3D]'
                  }`}>{exp.label}</span>
                  <span className={`text-[10px] block mt-0.5 leading-snug ${
                    profileData.experience === key ? 'text-[#7C8B6F]/70' : 'text-[#8C7E6A]'
                  }`}>{exp.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Finanzielle Parameter */}
          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#5C4F3D] mb-3">
              Deine Finanzen
            </label>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-[12px] text-[#8C7E6A]">Verf&uuml;gbares Eigenkapital</label>
                  <div className="group relative">
                    <span className="text-[#B5A68C] cursor-help text-[11px] border border-[#E8E0D4] rounded-full w-4 h-4 inline-flex items-center justify-center">i</span>
                    <div className="hidden group-hover:block absolute bottom-6 left-0 w-56 bg-white border border-[#E8E0D4] rounded-[10px] p-3 text-[11px] text-[#5C4F3D] shadow-lg z-10">
                      Das Geld, das du f&uuml;r den Kauf einsetzen kannst. Bei den meisten Banken brauchst du mindestens die Kaufnebenkosten (ca. 10-15%) als Eigenkapital.
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={profileData.eigenkapital}
                  onChange={(e) => setProfileData(prev => ({ ...prev, eigenkapital: parseFloat(e.target.value) || 0 }))}
                  placeholder="z.B. 50000"
                  className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[15px]"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-[12px] text-[#8C7E6A]">Ziel-Rendite pro Jahr (%)</label>
                  <div className="group relative">
                    <span className="text-[#B5A68C] cursor-help text-[11px] border border-[#E8E0D4] rounded-full w-4 h-4 inline-flex items-center justify-center">i</span>
                    <div className="hidden group-hover:block absolute bottom-6 left-0 w-56 bg-white border border-[#E8E0D4] rounded-[10px] p-3 text-[11px] text-[#5C4F3D] shadow-lg z-10">
                      Wie viel Prozent Gewinn du dir pro Jahr wuenschst. Ueblich sind 3-6%. Wir zeigen dir nur Objekte, die dein Ziel erreichen koennen.
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={profileData.mindestRendite}
                  onChange={(e) => setProfileData(prev => ({ ...prev, mindestRendite: parseFloat(e.target.value) || 0 }))}
                  placeholder="z.B. 4"
                  className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[15px]"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-[12px] text-[#8C7E6A]">Monatliches Budget</label>
                  <div className="group relative">
                    <span className="text-[#B5A68C] cursor-help text-[11px] border border-[#E8E0D4] rounded-full w-4 h-4 inline-flex items-center justify-center">i</span>
                    <div className="hidden group-hover:block absolute bottom-6 left-0 w-56 bg-white border border-[#E8E0D4] rounded-[10px] p-3 text-[11px] text-[#5C4F3D] shadow-lg z-10">
                      Der Betrag, den du maximal pro Monat f&uuml;r die Immobilie ausgeben m&ouml;chtest (Kreditrate + Nebenkosten). Faustregel: nicht mehr als 35% deines Nettoeinkommens.
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={profileData.maxMonatlicheBelastung}
                  onChange={(e) => setProfileData(prev => ({ ...prev, maxMonatlicheBelastung: parseFloat(e.target.value) || 0 }))}
                  placeholder="z.B. 1500"
                  className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all text-[#2C2418] text-[15px]"
                />
              </div>
            </div>
          </div>

          {/* Save Profile Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                updateProfile(profileData);
                setProfileSuccess('Anlageprofil gespeichert');
                setTimeout(() => setProfileSuccess(''), 3000);
              }}
              className="px-6 py-2.5 bg-[#7C8B6F]/10 text-[#7C8B6F] font-medium rounded-full hover:bg-[#7C8B6F]/20 transition-all text-[14px]"
            >
              Anlageprofil speichern
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end fade-in fade-in-delay-3">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-[#7C8B6F] text-white font-semibold rounded-full hover:bg-[#6B7A5E] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] text-[15px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Speichern...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Einstellungen speichern
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Account löschen */}
      <div className="mt-12 pt-8 border-t border-[#E8E0D4]">
        <h3 className="text-[16px] font-semibold text-[#B85C5C] mb-2">Account löschen</h3>
        <p className="text-[13px] text-[#8C7E6A] mb-4">
          Dein Account und alle gespeicherten Analysen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <button
          onClick={async () => {
            if (!confirm('Bist du sicher? Dein Account und ALLE Daten werden unwiderruflich gelöscht.')) return;
            if (!confirm('Letzte Warnung: Alle Analysen, Chats und Daten gehen verloren. Fortfahren?')) return;
            try {
              const res = await fetch(`${API_BASE}/auth/delete-account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (!res.ok) {
                const d = await res.json();
                alert(d.detail || 'Fehler beim Löschen');
                return;
              }
              logout();
              navigate('/');
            } catch (err) {
              alert('Fehler: ' + err.message);
            }
          }}
          className="px-5 py-2.5 border-2 border-[#B85C5C]/30 text-[#B85C5C] text-[13px] font-medium rounded-[10px] hover:bg-[#B85C5C]/5 transition-all"
        >
          Account endgültig löschen
        </button>
      </div>
    </div>
  );
}

export default Settings;
