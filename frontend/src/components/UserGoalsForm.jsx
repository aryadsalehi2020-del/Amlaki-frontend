import React, { useState } from 'react';
import { useUserProfile, INVESTMENT_GOALS, RISK_PROFILES, EXPERIENCE_LEVELS } from '../contexts/UserProfileContext';

function UserGoalsForm({ onComplete, compact = false }) {
  const { profile, updateProfile, isProfileComplete } = useUserProfile();
  const [activeStep, setActiveStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const steps = [
    { id: 'goal', title: 'Investitionsziel' },
    { id: 'risk', title: 'Risikoprofil' },
    { id: 'experience', title: 'Erfahrung' }
  ];

  const handleGoalSelect = (goal) => { updateProfile({ goal }); if (!compact) setActiveStep(1); };
  const handleRiskSelect = (riskProfile) => { updateProfile({ riskProfile }); if (!compact) setActiveStep(2); };
  const handleExperienceSelect = (experience) => { updateProfile({ experience }); localStorage.setItem('profileSetupDone', 'true'); if (onComplete && isProfileComplete) onComplete(); };
  const handleFinancialUpdate = (field, value) => { updateProfile({ [field]: value }); };

  const inputClass = "w-full px-3 py-2 bg-white border border-[#E8E0D4] rounded-[8px] text-[#2C2418] text-[13px] focus:border-[#7C8B6F] focus:outline-none focus:ring-2 focus:ring-[#7C8B6F]/10";

  if (compact) {
    return (
      <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
        <h3 className="text-[16px] font-semibold text-[#2C2418] mb-4">Dein Investorenprofil</h3>
        <div className="mb-4">
          <label className="text-[13px] text-[#5C4F3D] mb-2 block">Investitionsziel</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(INVESTMENT_GOALS).map(([key, goal]) => (
              <button key={key} onClick={() => handleGoalSelect(key)}
                className={`px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all ${
                  profile.goal === key ? 'bg-[#7C8B6F]/10 border border-[#7C8B6F] text-[#7C8B6F]' : 'bg-[#F5F0E8] border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                }`}>
                {goal.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[13px] text-[#5C4F3D] mb-2 block">Risikoprofil</label>
          <div className="flex gap-2">
            {Object.entries(RISK_PROFILES).map(([key, risk]) => (
              <button key={key} onClick={() => handleRiskSelect(key)}
                className={`flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all ${
                  profile.riskProfile === key ? 'bg-[#7C8B6F]/10 border border-[#7C8B6F] text-[#7C8B6F]' : 'bg-[#F5F0E8] border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                }`}>
                {risk.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[13px] text-[#5C4F3D] mb-2 block">Erfahrungslevel</label>
          <div className="flex gap-2">
            {Object.entries(EXPERIENCE_LEVELS).map(([key, exp]) => (
              <button key={key} onClick={() => handleExperienceSelect(key)}
                className={`flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all ${
                  profile.experience === key ? 'bg-[#7C8B6F]/10 border border-[#7C8B6F] text-[#7C8B6F]' : 'bg-[#F5F0E8] border border-[#E8E0D4] text-[#8C7E6A] hover:border-[#B5A68C]'
                }`}>
                {exp.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[13px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors flex items-center gap-1">
          {showAdvanced ? 'Weniger' : 'Erweiterte Einstellungen'}
        </button>
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-[#E8E0D4] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-[#8C7E6A] mb-1 block">Eigenkapital</label>
                <input type="number" value={profile.eigenkapital} onChange={(e) => handleFinancialUpdate('eigenkapital', parseInt(e.target.value) || 0)} className={inputClass} placeholder="50000" />
              </div>
              <div>
                <label className="text-[12px] text-[#8C7E6A] mb-1 block">Max. Kaufpreis</label>
                <input type="number" value={profile.maxKaufpreis} onChange={(e) => handleFinancialUpdate('maxKaufpreis', parseInt(e.target.value) || 0)} className={inputClass} placeholder="300000" />
              </div>
            </div>
            {profile.goal === 'cashflow' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-[#8C7E6A] mb-1 block">Mind. Cashflow/Monat</label>
                  <input type="number" value={profile.mindestCashflow} onChange={(e) => handleFinancialUpdate('mindestCashflow', parseInt(e.target.value) || 0)} className={inputClass} placeholder="100" />
                </div>
                <div>
                  <label className="text-[12px] text-[#8C7E6A] mb-1 block">Mind. Rendite %</label>
                  <input type="number" step="0.5" value={profile.mindestRendite} onChange={(e) => handleFinancialUpdate('mindestRendite', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="4" />
                </div>
              </div>
            )}
          </div>
        )}
        <div className={`mt-4 p-3 rounded-[8px] ${isProfileComplete ? 'bg-[#7C8B6F]/10 border border-[#7C8B6F]/30' : 'bg-[#F5F0E8] border border-[#E8E0D4]'}`}>
          <p className={`text-[13px] font-medium ${isProfileComplete ? 'text-[#7C8B6F]' : 'text-[#8C7E6A]'}`}>
            {isProfileComplete ? 'Profil vollstandig - Scores werden personalisiert' : 'Bitte alle Felder ausfullen fur personalisierte Bewertung'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button onClick={() => setActiveStep(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[10px] transition-all text-[14px] ${
                activeStep === index ? 'bg-[#7C8B6F]/10 border border-[#7C8B6F] text-[#7C8B6F]'
                : index < activeStep ? 'bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 text-[#7C8B6F]'
                : 'bg-[#F5F0E8] border border-[#E8E0D4] text-[#8C7E6A]'
              }`}>
              <span className="font-medium">{step.title}</span>
              {index < activeStep && <span className="text-[#7C8B6F]">&#10003;</span>}
            </button>
            {index < steps.length - 1 && <div className={`w-8 h-0.5 ${index < activeStep ? 'bg-[#7C8B6F]' : 'bg-[#E8E0D4]'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-[16px] p-8 border border-[#E8E0D4]">
        {activeStep === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-[22px] font-bold text-[#2C2418] mb-2">Was ist dein Investitionsziel?</h2>
              <p className="text-[#8C7E6A] text-[14px]">Wahle dein primares Ziel - die Bewertung wird darauf optimiert</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(INVESTMENT_GOALS).map(([key, goal]) => (
                <button key={key} onClick={() => handleGoalSelect(key)}
                  className={`p-6 rounded-[16px] border-2 transition-all text-left hover:scale-[1.02] ${
                    profile.goal === key ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] bg-[#FAF7F2] hover:border-[#B5A68C]'
                  }`}>
                  <h3 className={`text-[16px] font-semibold mb-1 ${profile.goal === key ? 'text-[#7C8B6F]' : 'text-[#2C2418]'}`}>{goal.label}</h3>
                  <p className="text-[13px] text-[#8C7E6A]">{goal.description}</p>
                  {profile.goal === key && <div className="mt-3 text-[#7C8B6F] text-[13px] font-medium">Ausgewahlt</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-[22px] font-bold text-[#2C2418] mb-2">Wie ist deine Risikobereitschaft?</h2>
              <p className="text-[#8C7E6A] text-[14px]">Dies beeinflusst die Gewichtung von Sicherheits-Kriterien</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(RISK_PROFILES).map(([key, risk]) => (
                <button key={key} onClick={() => handleRiskSelect(key)}
                  className={`p-8 rounded-[16px] border-2 transition-all text-center hover:scale-[1.02] ${
                    profile.riskProfile === key ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] bg-[#FAF7F2] hover:border-[#B5A68C]'
                  }`}>
                  <h3 className={`text-[18px] font-semibold mb-2 ${profile.riskProfile === key ? 'text-[#7C8B6F]' : 'text-[#2C2418]'}`}>{risk.label}</h3>
                  <p className="text-[13px] text-[#8C7E6A]">{risk.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-[22px] font-bold text-[#2C2418] mb-2">Wie viel Erfahrung hast du?</h2>
              <p className="text-[#8C7E6A] text-[14px]">Anfanger erhalten mehr Warnhinweise und Erklarungen</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(EXPERIENCE_LEVELS).map(([key, exp]) => (
                <button key={key} onClick={() => handleExperienceSelect(key)}
                  className={`p-8 rounded-[16px] border-2 transition-all text-center hover:scale-[1.02] ${
                    profile.experience === key ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : 'border-[#E8E0D4] bg-[#FAF7F2] hover:border-[#B5A68C]'
                  }`}>
                  <h3 className={`text-[18px] font-semibold mb-2 ${profile.experience === key ? 'text-[#7C8B6F]' : 'text-[#2C2418]'}`}>{exp.label}</h3>
                  <p className="text-[13px] text-[#8C7E6A]">{exp.description}</p>
                </button>
              ))}
            </div>
            {isProfileComplete && (
              <div className="mt-8 p-6 bg-[#7C8B6F]/10 border border-[#7C8B6F]/30 rounded-[16px] text-center">
                <h3 className="text-[18px] font-bold text-[#7C8B6F] mb-2">Profil vollstandig!</h3>
                <p className="text-[#5C4F3D] text-[14px] mb-4">Deine Analysen werden jetzt auf <strong>{INVESTMENT_GOALS[profile.goal]?.label}</strong> optimiert</p>
                {onComplete && (
                  <button onClick={onComplete} className="px-6 py-3 bg-[#7C8B6F] text-white rounded-full font-semibold hover:bg-[#6B7A5E] transition-all text-[14px]">Weiter zur Analyse</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}
          className={`px-6 py-3 rounded-[10px] font-medium transition-all text-[14px] ${activeStep === 0 ? 'text-[#B5A68C] cursor-not-allowed' : 'text-[#8C7E6A] hover:text-[#5C4F3D] border border-[#E8E0D4] hover:border-[#B5A68C]'}`}>
          Zuruck
        </button>
        {activeStep < 2 && (
          <button onClick={() => setActiveStep(activeStep + 1)} className="px-6 py-3 bg-[#7C8B6F] text-white rounded-full font-semibold hover:bg-[#6B7A5E] transition-all text-[14px]">Weiter</button>
        )}
      </div>
    </div>
  );
}

export default UserGoalsForm;
