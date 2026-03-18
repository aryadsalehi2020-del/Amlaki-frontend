import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Settings() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    default_verwendungszweck: user?.default_verwendungszweck || 'kapitalanlage',
    default_zinssatz: user?.default_zinssatz || 3.75,
    default_tilgung: user?.default_tilgung || 1.25
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20 max-w-[900px]">
      {/* Header */}
      <div className="mb-10 fade-in">
        <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-[#2C2418] leading-[1.05]">
          Einstellungen
        </h1>
        <p className="text-[#8C7E6A] text-[14px] mt-2">
          Passen Sie Ihr Profil und Standardwerte an
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
                <p className="text-[12px] text-[#8C7E6A] mt-1">E-Mail kann nicht geandert werden</p>
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
                <p className="text-[12px] text-[#8C7E6A] mt-1">Username kann nicht geandert werden</p>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#5C4F3D] mb-2">
                Vollstandiger Name
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
            Diese Werte werden als Standard fur neue Analysen verwendet
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
                    Die Gesamtrate (Zins + Tilgung) von <span className="text-[#5C4F3D] font-semibold">{(formData.default_zinssatz + formData.default_tilgung).toFixed(2)}%</span> wird fur Cashflow-Berechnungen verwendet. Sie konnen diese Werte jederzeit bei einzelnen Analysen anpassen.
                  </p>
                </div>
              </div>
            </div>
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
    </div>
  );
}

export default Settings;
