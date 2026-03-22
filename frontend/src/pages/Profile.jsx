import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile, INVESTMENT_GOALS, RISK_PROFILES, EXPERIENCE_LEVELS } from '../contexts/UserProfileContext';
import UserProfileForm from '../components/UserProfileForm';
import UserGoalsForm from '../components/UserGoalsForm';
import CreditChanceIndicator from '../components/CreditChanceIndicator';
import SmartTipsPanel from '../components/SmartTipsPanel';
import { formatCurrency, ENERGY_CLASSES } from '../constants';

function Profile() {
  const { user } = useAuth();
  const { profile: investorProfile, isProfileComplete: isInvestorProfileComplete } = useUserProfile();
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : {};
  });

  const [testKaufpreis, setTestKaufpreis] = useState(300000);
  const [testImmobilie, setTestImmobilie] = useState({
    kaufpreis: 300000,
    energieKlasse: 'D',
    verwendungszweck: 'kapitalanlage'
  });

  const [activeSection, setActiveSection] = useState('investor');

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }, [profile]);

  const handleProfileChange = (newProfile) => {
    setProfile(newProfile);
  };

  const gesamtEK = () => {
    let summe = parseFloat(profile.eigenkapital) || 0;
    if (profile.hatDepot) summe += (parseFloat(profile.depotWert) || 0) * 0.7;
    if (profile.hatLebensversicherung) summe += parseFloat(profile.lvRueckkaufswert) || 0;
    if (profile.hatRiester) summe += parseFloat(profile.riesterGuthaben) || 0;
    if (profile.hatBausparvertrag) summe += parseFloat(profile.bausparGuthaben) || 0;
    return summe;
  };

  const getProfileStrength = () => {
    let filled = 0;
    const fields = ['eigenkapital', 'jahreseinkommen', 'beruf', 'kinder', 'bundesland', 'schufa'];
    fields.forEach(f => { if (profile[f]) filled++; });
    if (profile.hatDepot || profile.hatLebensversicherung || profile.hatRiester || profile.hatBausparvertrag) filled++;
    return Math.round((filled / 7) * 100);
  };

  const profileStrength = getProfileStrength();

  return (
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20">
      <div className="max-w-[900px] space-y-8">
        {/* Header */}
        <div className="fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-[#2C2418] leading-[1.05]">
                Mein Finanzprofil
              </h1>
              <p className="text-[#8C7E6A] text-[14px] mt-2">
                Ihr personliches Profil fur optimale Finanzierungs- und Fordertipps
              </p>
            </div>

            {/* Profile Strength Indicator */}
            <div className="bg-white border border-[#E8E0D4] rounded-[12px] p-4 flex items-center gap-4">
              <div className="relative w-14 h-14">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#E8E0D4" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="#7C8B6F"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${profileStrength * 0.94} 94`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#2C2418]">
                  {profileStrength}%
                </span>
              </div>
              <div>
                <p className="text-[#2C2418] font-medium text-[14px]">Profil-Vollstandigkeit</p>
                <p className="text-[#8C7E6A] text-[12px]">
                  {profileStrength >= 70 ? 'Sehr gut ausgefullt' : profileStrength >= 40 ? 'Mehr Details = bessere Tipps' : 'Bitte ausfullen'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-[16px] p-1.5 border border-[#E8E0D4] fade-in fade-in-delay-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: 'investor', label: 'Investoren-Profil', highlight: !isInvestorProfileComplete },
              { id: 'profil', label: 'Finanz-Profil' },
              { id: 'test', label: 'Kredit-Chance' },
              { id: 'tipps', label: 'Spar-Tipps' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] font-medium transition-all whitespace-nowrap text-[14px] ${
                  activeSection === tab.id
                    ? 'bg-[#7C8B6F] text-white'
                    : tab.highlight
                      ? 'text-[#7C8B6F] border border-[#7C8B6F]/30 hover:bg-[#7C8B6F]/5'
                      : 'text-[#8C7E6A] hover:bg-[#F5F0E8] hover:text-[#5C4F3D]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.highlight && <span className="text-xs">!</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active section */}
        {activeSection === 'investor' && (
          <div className="fade-in space-y-6">
            {/* Current Profile Summary */}
            {isInvestorProfileComplete && (
              <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[13px] text-[#5C4F3D] bg-[#F5F0E8] border border-[#E8E0D4] px-3 py-1.5 rounded-full font-medium">
                    {(Array.isArray(investorProfile.goals) ? investorProfile.goals : [investorProfile.goal || 'cashflow']).map(g => INVESTMENT_GOALS[g]?.label).filter(Boolean).join(', ')}
                  </span>
                  <span className="text-[13px] text-[#5C4F3D] bg-[#F5F0E8] border border-[#E8E0D4] px-3 py-1.5 rounded-full font-medium">
                    {RISK_PROFILES[investorProfile.riskProfile]?.label}
                  </span>
                  <span className="text-[13px] text-[#5C4F3D] bg-[#F5F0E8] border border-[#E8E0D4] px-3 py-1.5 rounded-full font-medium">
                    {EXPERIENCE_LEVELS[investorProfile.experience]?.label}
                  </span>
                  <div className="ml-auto text-[#7C8B6F] font-medium flex items-center gap-2 text-[13px]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Profil aktiv
                  </div>
                </div>
              </div>
            )}

            {/* UserGoalsForm */}
            <UserGoalsForm onComplete={() => setActiveSection('profil')} />

            {/* Info Box */}
            <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
              <h4 className="text-[16px] font-semibold text-[#2C2418] mb-3">
                Warum ist das wichtig?
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-[13px] text-[#8C7E6A]">
                <div className="p-4 bg-[#F5F0E8] rounded-[12px]">
                  <p className="font-medium text-[#5C4F3D] mb-2">Personalisierte Scores</p>
                  <p>Die Gewichtung der Bewertungskriterien wird auf dein Ziel angepasst. Cashflow-Investoren bekommen andere Scores als Vermogensaufbauer.</p>
                </div>
                <div className="p-4 bg-[#F5F0E8] rounded-[12px]">
                  <p className="font-medium text-[#5C4F3D] mb-2">Smarte Warnungen</p>
                  <p>Basierend auf deiner Erfahrung und Risikobereitschaft erhaltst du passende Hinweise und Warnungen.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'profil' && (
          <div className="grid lg:grid-cols-3 gap-8 fade-in">
            <div className="lg:col-span-2">
              <UserProfileForm profile={profile} onProfileChange={handleProfileChange} />
            </div>
            <div className="space-y-6">
              <CreditChanceIndicator profile={profile} kaufpreis={testKaufpreis} />
              <div className="bg-white rounded-[16px] p-4 border border-[#E8E0D4]">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#7C8B6F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-[#7C8B6F] font-medium text-[13px]">Automatisch gespeichert</p>
                    <p className="text-[#8C7E6A] text-[12px]">Daten bleiben lokal in Ihrem Browser</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'test' && (
          <div className="grid lg:grid-cols-2 gap-8 fade-in">
            <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
              <h3 className="text-[18px] font-semibold text-[#2C2418] mb-6">
                Test-Immobilie konfigurieren
              </h3>

              <div className="space-y-6">
                {/* Kaufpreis Slider */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[13px] font-medium text-[#5C4F3D]">Kaufpreis</label>
                    <span className="text-[20px] font-bold text-[#2C2418]">{formatCurrency(testKaufpreis)}</span>
                  </div>
                  <input
                    type="range"
                    min={50000}
                    max={1500000}
                    step={10000}
                    value={testKaufpreis}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setTestKaufpreis(value);
                      setTestImmobilie(prev => ({ ...prev, kaufpreis: value }));
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[12px] text-[#8C7E6A] mt-2">
                    <span>50.000</span>
                    <span>1.500.000</span>
                  </div>
                </div>

                {/* EK-Quote Anzeige */}
                {testKaufpreis > 0 && gesamtEK() > 0 && (
                  <div className="p-4 bg-[#F5F0E8] rounded-[12px]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[13px] text-[#5C4F3D]">Ihre EK-Quote</span>
                      <span className="text-[16px] font-bold text-[#2C2418]">
                        {((gesamtEK() / testKaufpreis) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#E8E0D4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-[#7C8B6F]"
                        style={{ width: `${Math.min((gesamtEK() / testKaufpreis) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-[#8C7E6A] mt-2">
                      {(gesamtEK() / testKaufpreis) >= 0.2
                        ? 'Sehr gute EK-Quote - beste Zinskonditionen'
                        : (gesamtEK() / testKaufpreis) >= 0.1
                          ? 'Akzeptable EK-Quote - mittlere Konditionen'
                          : 'Niedrige EK-Quote - hohere Zinsen oder EK-Ersatz nutzen'}
                    </p>
                  </div>
                )}

                {/* Energieklasse */}
                <div>
                  <label className="block text-[13px] font-medium text-[#5C4F3D] mb-3">Energieklasse</label>
                  <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
                    {ENERGY_CLASSES.map(k => (
                      <button
                        key={k}
                        onClick={() => setTestImmobilie(prev => ({ ...prev, energieKlasse: k }))}
                        className={`py-2 px-3 rounded-[8px] text-[13px] font-semibold transition-all ${
                          testImmobilie.energieKlasse === k
                            ? 'bg-[#7C8B6F]/10 border border-[#7C8B6F] text-[#7C8B6F]'
                            : 'border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  {['F', 'G', 'H'].includes(testImmobilie.energieKlasse) && (
                    <p className="text-[12px] text-[#7C8B6F] mt-2">
                      KfW 308 "Jung kauft Alt" moglicherweise verfugbar!
                    </p>
                  )}
                </div>

                {/* Verwendungszweck */}
                <div>
                  <label className="block text-[13px] font-medium text-[#5C4F3D] mb-3">Verwendungszweck</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTestImmobilie(prev => ({ ...prev, verwendungszweck: 'kapitalanlage' }))}
                      className={`py-4 rounded-[12px] text-[13px] font-medium transition-all flex flex-col items-center gap-2 ${
                        testImmobilie.verwendungszweck === 'kapitalanlage'
                          ? 'bg-[#7C8B6F]/10 border-2 border-[#7C8B6F] text-[#7C8B6F]'
                          : 'border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                      }`}
                    >
                      Kapitalanlage
                    </button>
                    <button
                      onClick={() => setTestImmobilie(prev => ({ ...prev, verwendungszweck: 'eigennutzung' }))}
                      className={`py-4 rounded-[12px] text-[13px] font-medium transition-all flex flex-col items-center gap-2 ${
                        testImmobilie.verwendungszweck === 'eigennutzung'
                          ? 'bg-[#7C8B6F]/10 border-2 border-[#7C8B6F] text-[#7C8B6F]'
                          : 'border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                      }`}
                    >
                      Eigennutzung
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <CreditChanceIndicator profile={profile} kaufpreis={testKaufpreis} />
            </div>
          </div>
        )}

        {activeSection === 'tipps' && (
          <div className="fade-in">
            <SmartTipsPanel profile={profile} immobilie={testImmobilie} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
