import React, { createContext, useState, useContext, useEffect } from 'react';

const UserProfileContext = createContext(null);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

// Investitionsziele mit Beschreibungen
export const INVESTMENT_GOALS = {
  cashflow: {
    label: 'Cashflow',
    icon: '',
    description: 'Monatliche Einnahmen maximieren',
    color: 'zinc-300'
  },
  vermoegensaufbau: {
    label: 'Vermoegensaufbau',
    icon: '',
    description: 'Langfristiger Wertzuwachs',
    color: 'zinc-300'
  },
  flip: {
    label: 'Fix & Flip',
    icon: '',
    description: 'Kaufen, renovieren, verkaufen',
    color: 'zinc-300'
  },
  altersvorsorge: {
    label: 'Altersvorsorge',
    icon: '',
    description: 'Sichere Rente durch Immobilien',
    color: 'zinc-300'
  },
  steuern: {
    label: 'Steueroptimierung',
    icon: '',
    description: 'Steuervorteile nutzen',
    color: 'zinc-300'
  }
};

// Risikoprofile
export const RISK_PROFILES = {
  konservativ: {
    label: 'Konservativ',
    icon: '',
    description: 'Sicherheit vor Rendite, geringe Risiken',
    multiplier: 0.8
  },
  ausgewogen: {
    label: 'Ausgewogen',
    icon: '',
    description: 'Balance zwischen Sicherheit und Rendite',
    multiplier: 1.0
  },
  risikofreudig: {
    label: 'Risikofreudig',
    icon: '',
    description: 'Hohe Rendite, hoehere Risiken akzeptiert',
    multiplier: 1.2
  }
};

// Erfahrungslevel
export const EXPERIENCE_LEVELS = {
  anfaenger: {
    label: 'Anfaenger',
    icon: '',
    description: '0-2 Immobilien, wenig Erfahrung',
    warningLevel: 'high'
  },
  fortgeschritten: {
    label: 'Fortgeschritten',
    icon: '',
    description: '3-5 Immobilien, solide Grundlagen',
    warningLevel: 'medium'
  },
  profi: {
    label: 'Profi',
    icon: '',
    description: '6+ Immobilien, tiefes Verstaendnis',
    warningLevel: 'low'
  }
};

// Default-Profile
const DEFAULT_PROFILE = {
  goal: 'cashflow',
  riskProfile: 'ausgewogen',
  experience: 'anfaenger',
  // Finanzielle Situation
  eigenkapital: 50000,
  monatlichesEinkommen: 4000,
  beruf: '',
  // Präferenzen
  maxKaufpreis: 300000,
  bevorzugteStaedte: [],
  mindestCashflow: 0,
  mindestRendite: 4,
  // Zusätzliche Flags
  isFirstProperty: true,
  hasExistingCredits: false,
  existingCreditLoad: 0
};

export const UserProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(() => {
    // Lade gespeichertes Profil aus localStorage
    const saved = localStorage.getItem('userInvestmentProfile');
    if (saved) {
      try {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_PROFILE;
      }
    }
    return DEFAULT_PROFILE;
  });

  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Prüfe ob Profil vollständig ist
  useEffect(() => {
    const requiredFields = ['goal', 'riskProfile', 'experience', 'eigenkapital'];
    const complete = requiredFields.every(field =>
      profile[field] !== undefined && profile[field] !== null && profile[field] !== ''
    );
    setIsProfileComplete(complete);
  }, [profile]);

  // Speichere Profil bei Änderungen
  useEffect(() => {
    localStorage.setItem('userInvestmentProfile', JSON.stringify(profile));
  }, [profile]);

  const updateProfile = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const resetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    localStorage.removeItem('userInvestmentProfile');
  };

  // Berechne dynamische Gewichtungen basierend auf Profil
  const getDynamicWeights = () => {
    const baseWeights = {
      cashflow_rendite: 30,
      lage: 20,
      kaufpreis_qm: 15,
      zukunftspotenzial: 10,
      zustand_baujahr: 10,
      energieeffizienz: 5,
      nebenkosten: 5,
      grundriss: 3,
      verkaeufertyp: 2
    };

    const goalAdjustments = {
      cashflow: {
        cashflow_rendite: +15,
        lage: -5,
        kaufpreis_qm: +5,
        zukunftspotenzial: -10,
        nebenkosten: +5
      },
      vermoegensaufbau: {
        cashflow_rendite: -10,
        lage: +10,
        zukunftspotenzial: +15,
        kaufpreis_qm: -5
      },
      flip: {
        cashflow_rendite: -20,
        kaufpreis_qm: +20,
        zustand_baujahr: +15,
        zukunftspotenzial: -5,
        lage: -5
      },
      altersvorsorge: {
        cashflow_rendite: +5,
        lage: +5,
        zustand_baujahr: +5,
        zukunftspotenzial: +5,
        energieeffizienz: +5,
        kaufpreis_qm: -10
      },
      steuern: {
        cashflow_rendite: -5,
        zustand_baujahr: +10,
        energieeffizienz: +10,
        zukunftspotenzial: -5
      }
    };

    // Wende Goal-Anpassungen an
    const adjustedWeights = { ...baseWeights };
    const goalAdj = goalAdjustments[profile.goal] || {};

    Object.entries(goalAdj).forEach(([key, value]) => {
      if (adjustedWeights[key] !== undefined) {
        adjustedWeights[key] = Math.max(0, Math.min(50, adjustedWeights[key] + value));
      }
    });

    // Normalisiere auf 100%
    const total = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
    if (total !== 100) {
      const factor = 100 / total;
      Object.keys(adjustedWeights).forEach(key => {
        adjustedWeights[key] = Math.round(adjustedWeights[key] * factor);
      });
    }

    return adjustedWeights;
  };

  // Generiere personalisierte Warnungen
  const getPersonalizedWarnings = (analysisResult) => {
    const warnings = [];

    if (!analysisResult) return warnings;

    // Anfänger-Warnungen
    if (profile.experience === 'anfaenger') {
      if (analysisResult.cashflow_analyse?.monatlicher_cashflow < 0) {
        warnings.push({
          type: 'critical',
          icon: '⚠️',
          message: 'Als Anfänger solltest du negativen Cashflow vermeiden - das erhöht dein Risiko erheblich!'
        });
      }
      if (analysisResult.warnsignale?.anzahl > 0) {
        warnings.push({
          type: 'warning',
          icon: '📚',
          message: 'Lass diese Warnsignale von einem erfahrenen Investor prüfen bevor du kaufst.'
        });
      }
    }

    // Cashflow-Ziel Warnungen
    if (profile.goal === 'cashflow') {
      const cfAnalysis = analysisResult.cashflow_analyse;
      if (cfAnalysis) {
        if (cfAnalysis.bruttorendite_prozent < 4) {
          warnings.push({
            type: 'warning',
            icon: '💰',
            message: `Mit ${cfAnalysis.bruttorendite_prozent}% Bruttorendite erreichst du dein Cashflow-Ziel schwer. Ziel: >5%`
          });
        }
        if (profile.mindestCashflow > 0 && cfAnalysis.monatlicher_cashflow < profile.mindestCashflow) {
          warnings.push({
            type: 'info',
            icon: '📊',
            message: `Cashflow (${cfAnalysis.monatlicher_cashflow}€) liegt unter deinem Ziel (${profile.mindestCashflow}€)`
          });
        }
      }
    }

    // Konservatives Risikoprofil
    if (profile.riskProfile === 'konservativ') {
      if (analysisResult.gesamtscore < 60) {
        warnings.push({
          type: 'warning',
          icon: '🛡️',
          message: 'Bei deinem konservativen Profil solltest du nur Immobilien mit Score >60 in Betracht ziehen.'
        });
      }
    }

    // Eigenkapital-Check
    if (analysisResult.cashflow_analyse?.eigenkapital) {
      const benoetigtesEK = analysisResult.cashflow_analyse.eigenkapital;
      if (benoetigtesEK > profile.eigenkapital * 0.8) {
        warnings.push({
          type: 'info',
          icon: '💵',
          message: `Diese Immobilie würde ${Math.round(benoetigtesEK / profile.eigenkapital * 100)}% deines EK binden. Reserve einplanen!`
        });
      }
    }

    return warnings;
  };

  // Berechne angepassten Score basierend auf Profil
  const getAdjustedScore = (baseScore, kriterien) => {
    if (!kriterien || kriterien.length === 0) return baseScore;

    const dynamicWeights = getDynamicWeights();
    let adjustedTotal = 0;
    let weightSum = 0;

    kriterien.forEach(k => {
      const weight = dynamicWeights[k.name] || k.gewichtung;
      adjustedTotal += k.score * (weight / 100);
      weightSum += weight;
    });

    // Normalisiere
    const adjustedScore = weightSum > 0 ? (adjustedTotal / weightSum) * 100 : baseScore;

    return Math.round(adjustedScore);
  };

  const value = {
    profile,
    updateProfile,
    resetProfile,
    isProfileComplete,
    getDynamicWeights,
    getPersonalizedWarnings,
    getAdjustedScore,
    INVESTMENT_GOALS,
    RISK_PROFILES,
    EXPERIENCE_LEVELS
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
