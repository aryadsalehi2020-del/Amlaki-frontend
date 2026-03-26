// Central constants file for the application

// Styling constants
export const INPUT_CLASS = "w-full px-4 py-3 bg-transparent border border-zinc-800 rounded-md focus:border-zinc-600 outline-none transition-all text-white placeholder:text-zinc-600 text-[14px]";
export const LABEL_CLASS = "block text-[11px] font-medium text-zinc-500 uppercase tracking-[0.15em] mb-2";
export const BUTTON_PRIMARY = "px-5 py-2.5 bg-white text-[#09090B] font-semibold rounded text-[13px] hover:bg-zinc-200 transition-colors";
export const BUTTON_SECONDARY = "px-5 py-2.5 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white rounded text-[13px] transition-all";
export const CARD_CLASS = "border border-zinc-800/50 rounded-md p-6";

// Financial calculation constants
export const KAUFNEBENKOSTEN_PERCENT = 0.12; // 12% buying costs
export const NICHT_UMLAGEFAEHIG_PERCENT = 0.35; // 35% non-allocatable costs
export const DEPOT_BELEIHBAR_PERCENT = 0.70; // 70% of depot can be used as collateral
export const INSTANDHALTUNG_PRO_QM = 12; // €12 per sqm per year maintenance

// KfW Funding limits (2025)
export const KFW_LIMITS = {
  300: {
    name: 'Wohneigentum für Familien',
    maxKredit: 270000,
    zins: 1.12,
    einkommensgrenze: {
      1: 90000,
      2: 100000,
      3: 110000,
      4: 120000,
      5: 130000
    }
  },
  308: {
    name: 'Klimafreundlicher Neubau',
    maxKredit: 150000,
    zins: 2.1
  },
  261: {
    name: 'Sanierung zum Effizienzhaus',
    maxKredit: 150000,
    tilgungszuschuss: 0.15
  }
};

// Grunderwerbsteuer by Bundesland
export const GRUNDERWERBSTEUER = {
  'Baden-Württemberg': 5.0,
  'Bayern': 3.5,
  'Berlin': 6.0,
  'Brandenburg': 6.5,
  'Bremen': 5.0,
  'Hamburg': 5.5,
  'Hessen': 6.0,
  'Mecklenburg-Vorpommern': 6.0,
  'Niedersachsen': 5.0,
  'NRW': 6.5,
  'Rheinland-Pfalz': 5.0,
  'Saarland': 6.5,
  'Sachsen': 3.5,
  'Sachsen-Anhalt': 5.0,
  'Schleswig-Holstein': 6.5,
  'Thüringen': 5.0
};

// Bundesländer list
export const BUNDESLAENDER = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'NRW',
  'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt',
  'Schleswig-Holstein', 'Thüringen'
];

// Energy classes
export const ENERGY_CLASSES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Score thresholds (optimiert für positivere Bewertung)
export const SCORE_THRESHOLDS = {
  EXCELLENT: 75,   // war 80 -> jetzt 75
  VERY_GOOD: 60,   // war 65 -> jetzt 60
  GOOD: 45,        // war 50 -> jetzt 45
  ACCEPTABLE: 30   // war 35 -> jetzt 30
};

// Score color helper — monochrome
export const getScoreColor = (score) => {
  if (score >= 60) return { color: 'white', hex: '#FAFAFA', label: 'Sehr gut' };
  if (score >= 45) return { color: 'white', hex: '#A1A1AA', label: 'Gut' };
  if (score >= 30) return { color: 'white', hex: '#71717A', label: 'Okay' };
  return { color: 'white', hex: '#52525B', label: 'Kritisch' };
};

// Format helpers
export const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatPercent = (value, decimals = 2) => {
  return `${value.toFixed(decimals)}%`;
};
