/**
 * Dynamic Scoring System
 * Berechnet personalisierte Gewichtungen basierend auf Investorenprofil
 */

// Basis-Gewichtungen für Kapitalanlage
export const BASE_WEIGHTS_INVESTMENT = {
  cashflow_rendite: 30,
  lage: 15,
  kaufpreis_qm: 20,
  zukunftspotenzial: 10,
  zustand_baujahr: 10,
  mietpotenzial: 5,
  energieeffizienz: 5,
  nebenkosten: 3,
  grundriss: 2
};

// Gewichtungs-Modifikatoren pro Investitionsziel
export const GOAL_WEIGHT_MODIFIERS = {
  cashflow: {
    name: 'Cashflow-Fokus',
    description: 'Maximiert Rendite und laufende Einnahmen',
    modifiers: {
      cashflow_rendite: +10,
      mietpotenzial: +10,
      kaufpreis_qm: +5,
      zukunftspotenzial: -10,
      lage: -5
    }
  },
  vermoegensaufbau: {
    name: 'Verm\u00f6gensaufbau',
    description: 'Fokus auf Wertsteigerung und gute Lagen',
    modifiers: {
      cashflow_rendite: -10,
      lage: +10,
      zukunftspotenzial: +15,
      kaufpreis_qm: -5,
      mietpotenzial: -5
    }
  },
  flip: {
    name: 'Fix & Flip',
    description: 'Kaufen, renovieren, mit Gewinn verkaufen',
    modifiers: {
      cashflow_rendite: -20,  // Irrelevant
      kaufpreis_qm: +20,      // Muss günstig sein
      zustand_baujahr: +15,   // Renovierungspotenzial
      zukunftspotenzial: -5,
      lage: -5
    }
  },
  altersvorsorge: {
    name: 'Altersvorsorge',
    description: 'Langfristig stabil und sicher',
    modifiers: {
      cashflow_rendite: +5,
      lage: +5,
      zustand_baujahr: +5,
      zukunftspotenzial: +5,
      energieeffizienz: +5,
      kaufpreis_qm: -10
    }
  },
  steuern: {
    name: 'Steueroptimierung',
    description: 'AfA und Abschreibungen maximieren',
    modifiers: {
      cashflow_rendite: -5,
      zustand_baujahr: +10,   // AfA-relevant
      energieeffizienz: +10,  // Förderfähig
      zukunftspotenzial: -5
    }
  }
};

// Risikoprofil-Modifikatoren (angepasste Schwellen: +10 positiver)
export const RISK_MODIFIERS = {
  konservativ: {
    name: 'Konservativ',
    scoreThreshold: 55,       // war 65 -> jetzt 55
    warningMultiplier: 1.5,   // Mehr Warnungen anzeigen
    modifiers: {
      lage: +5,
      zustand_baujahr: +5,
      energieeffizienz: +3,
      cashflow_rendite: -5
    }
  },
  ausgewogen: {
    name: 'Ausgewogen',
    scoreThreshold: 40,       // war 50 -> jetzt 40
    warningMultiplier: 1.0,
    modifiers: {}  // Keine Änderungen
  },
  risikofreudig: {
    name: 'Risikofreudig',
    scoreThreshold: 25,       // war 35 -> jetzt 25
    warningMultiplier: 0.5,   // Weniger Warnungen
    modifiers: {
      zukunftspotenzial: +5,
      kaufpreis_qm: +5,
      zustand_baujahr: -5,
      lage: -5
    }
  }
};

/**
 * Berechnet dynamische Gewichtungen basierend auf Profil
 */
export function calculateDynamicWeights(profile) {
  const { goal = 'cashflow', riskProfile = 'ausgewogen' } = profile;

  // Starte mit Basis-Gewichtungen
  const weights = { ...BASE_WEIGHTS_INVESTMENT };

  // Wende Goal-Modifikatoren an
  const goalMods = GOAL_WEIGHT_MODIFIERS[goal]?.modifiers || {};
  Object.entries(goalMods).forEach(([key, modifier]) => {
    if (weights[key] !== undefined) {
      weights[key] = Math.max(0, weights[key] + modifier);
    }
  });

  // Wende Risiko-Modifikatoren an
  const riskMods = RISK_MODIFIERS[riskProfile]?.modifiers || {};
  Object.entries(riskMods).forEach(([key, modifier]) => {
    if (weights[key] !== undefined) {
      weights[key] = Math.max(0, weights[key] + modifier);
    }
  });

  // Normalisiere auf 100%
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total !== 100) {
    const factor = 100 / total;
    Object.keys(weights).forEach(key => {
      weights[key] = Math.round(weights[key] * factor * 10) / 10;
    });
  }

  return weights;
}

/**
 * Berechnet angepassten Gesamtscore
 */
export function calculateAdjustedScore(kriterien, profile) {
  if (!kriterien || kriterien.length === 0) return 0;

  const dynamicWeights = calculateDynamicWeights(profile);
  let weightedSum = 0;
  let totalWeight = 0;

  kriterien.forEach(k => {
    const weight = dynamicWeights[k.name] || k.gewichtung || 0;
    weightedSum += k.score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Generiert Gewichtungs-Diff für UI
 */
export function getWeightDifferences(profile) {
  const dynamicWeights = calculateDynamicWeights(profile);
  const differences = {};

  Object.entries(dynamicWeights).forEach(([key, newWeight]) => {
    const baseWeight = BASE_WEIGHTS_INVESTMENT[key] || 0;
    const diff = newWeight - baseWeight;
    if (Math.abs(diff) >= 1) {
      differences[key] = {
        base: baseWeight,
        adjusted: newWeight,
        diff: diff,
        direction: diff > 0 ? 'up' : 'down'
      };
    }
  });

  return differences;
}

/**
 * Generiert personalisierte Warnungen
 */
export function generatePersonalizedWarnings(analysisResult, profile) {
  const warnings = [];
  const { goal, riskProfile, experience, eigenkapital, mindestCashflow, mindestRendite } = profile;

  if (!analysisResult) return warnings;

  const cf = analysisResult.cashflow_analyse;
  const score = analysisResult.gesamtscore;

  // Anfänger-Warnungen
  if (experience === 'anfaenger') {
    if (cf?.monatlicher_cashflow < 0) {
      warnings.push({
        type: 'critical',
        icon: '⚠️',
        title: 'Negativer Cashflow',
        message: 'Als Anfänger solltest du Objekte mit negativem Cashflow meiden. Du müsstest jeden Monat Geld zuschießen.'
      });
    }

    if (score < 50) {
      warnings.push({
        type: 'warning',
        icon: '📚',
        title: 'Niedriger Score',
        message: 'Bei deinem Erfahrungslevel empfehle ich Immobilien mit Score > 60 für den Einstieg.'
      });
    }

    if (analysisResult.no_go_check?.no_go) {
      warnings.push({
        type: 'critical',
        icon: '🛑',
        title: 'No-Go erkannt',
        message: 'Diese Immobilie hat kritische Probleme. Als Anfänger: Finger weg!'
      });
    }
  }

  // Cashflow-Ziel
  if (goal === 'cashflow') {
    if (cf?.bruttorendite_prozent < (mindestRendite || 4)) {
      warnings.push({
        type: 'warning',
        icon: '💰',
        title: 'Rendite unter Ziel',
        message: `Mit ${cf.bruttorendite_prozent?.toFixed(1)}% Bruttorendite erreichst du dein Ziel von ${mindestRendite || 4}% nicht.`
      });
    }

    if (mindestCashflow > 0 && cf?.monatlicher_cashflow < mindestCashflow) {
      warnings.push({
        type: 'info',
        icon: '📊',
        title: 'Cashflow unter Ziel',
        message: `Monatlicher Cashflow (${cf.monatlicher_cashflow}€) liegt unter deinem Ziel (${mindestCashflow}€).`
      });
    }

    if (cf?.bruttorendite_prozent >= 6) {
      warnings.push({
        type: 'positive',
        icon: '🎯',
        title: 'Top Cashflow-Objekt!',
        message: `${cf.bruttorendite_prozent?.toFixed(1)}% Bruttorendite - perfekt für dein Cashflow-Ziel!`
      });
    }
  }

  // Vermögensaufbau
  if (goal === 'vermoegensaufbau') {
    if (analysisResult.kennzahlen?.abweichung_prozent < -15) {
      warnings.push({
        type: 'positive',
        icon: '📈',
        title: 'Wertsteigerungspotenzial',
        message: `Preis liegt ${Math.abs(analysisResult.kennzahlen.abweichung_prozent)}% unter Markt - gutes Potenzial!`
      });
    }
  }

  // Konservatives Profil
  if (riskProfile === 'konservativ') {
    if (score < RISK_MODIFIERS.konservativ.scoreThreshold) {
      warnings.push({
        type: 'warning',
        icon: '🛡️',
        title: 'Unter Risiko-Schwelle',
        message: `Bei deinem konservativen Profil sollte der Score mindestens ${RISK_MODIFIERS.konservativ.scoreThreshold} sein.`
      });
    }

    if (cf?.selbsttragend === false) {
      warnings.push({
        type: 'warning',
        icon: '💵',
        title: 'Nicht selbsttragend',
        message: 'Konservative Investoren sollten auf selbsttragende Immobilien setzen.'
      });
    }
  }

  // Eigenkapital-Check
  if (eigenkapital && cf?.eigenkapital) {
    const ekAnteil = cf.eigenkapital / eigenkapital;
    if (ekAnteil > 0.8) {
      warnings.push({
        type: 'warning',
        icon: '💵',
        title: 'Hohe EK-Bindung',
        message: `Diese Immobilie würde ${Math.round(ekAnteil * 100)}% deines Eigenkapitals binden. Behalte Reserven!`
      });
    }
  }

  return warnings;
}

/**
 * Gibt die Empfehlung basierend auf Profil zurück (positivere Schwellen)
 */
export function getProfileBasedRecommendation(score, profile) {
  const { riskProfile, goal, experience } = profile;
  const threshold = RISK_MODIFIERS[riskProfile]?.scoreThreshold || 40;

  // Ehrliche Empfehlungen basierend auf Score
  if (score >= 70) {
    return {
      action: 'invest',
      emoji: '',
      text: 'Starkes Investment fuer dein Profil',
      color: 'zinc-200'
    };
  } else if (score >= 55) {
    return {
      action: 'consider',
      emoji: '',
      text: 'Prüfenswert - genau hinschauen',
      color: 'zinc-400'
    };
  } else if (score >= 40) {
    return {
      action: 'caution',
      emoji: '',
      text: 'Eher nicht empfehlenswert',
      color: 'zinc-500'
    };
  } else {
    return {
      action: 'avoid',
      emoji: '',
      text: 'Nicht empfehlenswert',
      color: 'zinc-600'
    };
  }
}
