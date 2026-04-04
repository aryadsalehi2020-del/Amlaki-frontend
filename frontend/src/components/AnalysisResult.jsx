import React, { useState, useMemo } from 'react';

// Info tooltip for financial terms
function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5 align-middle">
      <button type="button" onClick={() => setShow(!show)} onBlur={() => setTimeout(() => setShow(false), 200)}
        className="w-4 h-4 rounded-full border border-[#B5A68C] text-[#B5A68C] text-[10px] font-medium inline-flex items-center justify-center hover:bg-[#B5A68C]/10 transition-colors cursor-pointer leading-none">i</button>
      {show && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-56 bg-white border border-[#E8E0D4] rounded-xl p-3 text-[12px] text-[#5C4F3D] shadow-lg z-50 leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-[#E8E0D4] rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

// Chart components
import CashflowChart from './charts/CashflowChart';
import TilgungsChart from './charts/TilgungsChart';
import ZinsTilgungChart from './charts/ZinsTilgungChart';

// UI components
import BreakEvenCalculator from './BreakEvenCalculator';
import ScenarioComparison from './ScenarioComparison';
import LiveCalculator from './LiveCalculator';
import FullReport from './FullReport';
import SensitivityMatrix from './SensitivityMatrix';
import InvestmentComparison from './InvestmentComparison';
import MilestonesTimeline from './MilestonesTimeline';
import RentalVariations from './RentalVariations';
import FinancingOptions from './FinancingOptions';

// Dynamic Scoring
import { useUserProfile, INVESTMENT_GOALS } from '../contexts/UserProfileContext';
import {
  calculateDynamicWeights,
  calculateAdjustedScore,
  getWeightDifferences,
  generatePersonalizedWarnings,
  getProfileBasedRecommendation
} from '../utils/dynamicWeights';

function ScoreCircle({ score, adjustedScore = null, showAdjusted = false }) {
  const radius = 60;
  const displayScore = showAdjusted && adjustedScore !== null ? adjustedScore : score;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  // Ehrliche Farbschwellen
  const getScoreColor = (score) => {
    if (score >= 65) return '#7C8B6F'; // olive - gut
    if (score >= 55) return '#B5A68C'; // khaki - solide
    if (score >= 40) return '#8C7E6A'; // muted - schwach
    return '#B85C5C'; // muted red - schlecht
  };

  // Ehrliche Labels
  const getScoreLabel = (score) => {
    if (score >= 75) return 'Exzellent';
    if (score >= 65) return 'Gut';
    if (score >= 55) return 'Solide';
    if (score >= 40) return 'Unterdurchschnittlich';
    return 'Nicht empfehlenswert';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 md:w-40 md:h-40">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full animate-glow opacity-30"
             style={{ background: `radial-gradient(circle, ${getScoreColor(displayScore)}40, transparent)` }}></div>

        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            fill="none"
            stroke="rgba(181, 166, 140, 0.2)"
            strokeWidth="12"
          />
          {/* Score circle with gradient */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            fill="none"
            stroke={getScoreColor(displayScore)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-circle"
            style={{
              '--score-offset': offset,
              filter: `drop-shadow(0 0 8px ${getScoreColor(displayScore)}80)`
            }}
          />
        </svg>

        {/* Score number - centered in circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl md:text-5xl font-black" style={{ color: getScoreColor(displayScore) }}>
            {Math.round(displayScore)}
          </span>
        </div>
      </div>

      {/* Label below circle */}
      <span className="text-[12px] font-semibold text-[#B5A68C] mt-2 px-3 py-1 bg-[#F5F0E8] rounded-full">
        {getScoreLabel(displayScore)}
      </span>
    </div>
  );
}

function CriterionBar({ criterion, weightDiff = null, showAdjusted = false }) {
  // Angepasste Schwellen: +10 positiver
  const getBarColor = (score) => {
    if (score >= 60) return 'from-[#7C8B6F] to-[#6B7A5E]';   // war 70
    if (score >= 45) return 'from-[#B5A68C] to-[#A3927A]';   // war 50
    if (score >= 30) return 'from-[#B85C5C] to-[#A34A4A]';      // war 30
    return 'from-[#B85C5C] to-[#8B3A3A]';
  };

  const getScoreEmoji = (score) => {
    if (score >= 60) return '\u{1F7E2}';  // war 70
    if (score >= 45) return '\u{1F7E1}';  // war 50
    if (score >= 30) return '\u{1F7E0}';  // war 30
    return '\u{1F534}';
  };

  const criterionLabels = {
    cashflow_rendite: 'Cashflow / Rendite',
    lage: 'Lage',
    kaufpreis_qm: 'Kaufpreis / m²',
    zukunftspotenzial: 'Zukunftspotenzial',
    zustand_baujahr: 'Zustand / Baujahr',
    energieeffizienz: 'Energieeffizienz',
    nebenkosten: 'Nebenkosten',
    grundriss: 'Grundriss',
    'verkäufertyp': 'Verkäufertyp',
    'verkaeufertyp': 'Verkäufertyp',
  };

  const displayWeight = showAdjusted && weightDiff ? weightDiff.adjusted : criterion.gewichtung;
  const hasWeightChange = weightDiff && Math.abs(weightDiff.diff) >= 1;

  return (
    <div className={`mb-6 p-4 rounded-xl border transition-all ${
      hasWeightChange && showAdjusted
        ? weightDiff.direction === 'up'
          ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
          : 'bg-[#F5F0E8] border-[#E8E0D4] hover:border-slate/20'
        : 'bg-[#F5F0E8] border-[#E8E0D4] hover:border-[#7C8B6F]/30'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getScoreEmoji(criterion.score)}</span>
          <span className="text-base font-semibold text-[#2C2418]">
            {criterionLabels[criterion.name] || criterion.name}
          </span>
          {hasWeightChange && showAdjusted && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              weightDiff.direction === 'up'
                ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]'
                : 'bg-slate/20 text-[#8C7E6A]/60'
            }`}>
              {weightDiff.direction === 'up' ? '↑ Wichtiger' : '↓ Weniger wichtig'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            hasWeightChange && showAdjusted
              ? weightDiff.direction === 'up'
                ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]'
                : 'bg-slate/10 text-[#8C7E6A]/60'
              : 'bg-[#2C2418]/5 text-[#8C7E6A]'
          }`}>
            {displayWeight}%
            {hasWeightChange && showAdjusted && (
              <span className="ml-1">
                ({weightDiff.diff > 0 ? '+' : ''}{weightDiff.diff})
              </span>
            )}
          </span>
          <span className="text-lg font-bold text-[#2C2418]">
            {Math.round(criterion.score)}<span className="text-[12px] font-normal text-[#B5A68C]">/100</span>
          </span>
        </div>
      </div>
      <div className="h-3 bg-slate/10 rounded-full overflow-hidden shadow-inner mb-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getBarColor(criterion.score)} transition-all duration-1000 shadow-lg`}
          style={{ width: `${criterion.score}%` }}
        />
      </div>
      <p className="text-sm text-[#8C7E6A] leading-relaxed">{criterion.begründung}</p>
    </div>
  );
}

// Tab configuration
const TABS = [
  { id: 'uebersicht', label: 'Übersicht', icon: '' },
  { id: 'tipps', label: 'Tipps & Förderungen', icon: '' },
  { id: 'projektionen', label: 'Projektionen', icon: '' },
  { id: 'szenarien', label: 'Szenarien', icon: '' },
  { id: 'optionen', label: 'Optionen', icon: '' },
  { id: 'vergleich', label: 'Vergleich', icon: '' }
];

function PremiumLock({ onUpgrade }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-[6px] z-10 rounded-[16px] flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-10 h-10 bg-[#7C8B6F]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-[#7C8B6F]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <p className="text-[14px] font-semibold text-[#2C2418] mb-1">Premium-Feature</p>
          <p className="text-[12px] text-[#8C7E6A] mb-3">Verfuegbar mit Analyse-Credits</p>
          {onUpgrade && (
            <button onClick={onUpgrade} className="px-4 py-2 bg-[#7C8B6F] text-white text-[13px] font-medium rounded-[10px] hover:bg-[#6B7A5E] transition-all">
              Credits kaufen
            </button>
          )}
        </div>
      </div>
      <div className="opacity-30 pointer-events-none" style={{ minHeight: '120px' }}>
        <div className="bg-[#FAF7F2] rounded-[16px] p-6 border border-[#E8E0D4] h-full">
          <div className="h-4 bg-[#E8E0D4] rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-[#E8E0D4] rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-[#E8E0D4] rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-[#E8E0D4] rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}

function AnalysisResult({ result, propertyData, onNewAnalysis, onEditData, onSwitchVerwendungszweck, onChangeEigenkapital, onUpgrade }) {
  const [activeTab, setActiveTab] = useState('uebersicht');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showPersonalized, setShowPersonalized] = useState(true);
  const [eigenkapitalInput, setEigenkapitalInput] = useState(result.cashflow_analyse?.eigenkapital || 0);
  const [showEigenkapitalEditor, setShowEigenkapitalEditor] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // Dynamic Scoring Integration
  let userProfileContext;
  try {
    userProfileContext = useUserProfile();
  } catch (e) {
    userProfileContext = null;
  }

  const profile = userProfileContext?.profile;
  const isProfileComplete = userProfileContext?.isProfileComplete;

  // Berechne dynamische Scores und Warnungen
  const dynamicData = useMemo(() => {
    if (!profile || !isProfileComplete) {
      return {
        adjustedScore: null,
        weightDiffs: {},
        warnings: [],
        recommendation: null
      };
    }

    const adjustedScore = calculateAdjustedScore(result.kriterien, profile);
    const weightDiffs = getWeightDifferences(profile);
    const warnings = generatePersonalizedWarnings(result, profile);
    const recommendation = getProfileBasedRecommendation(
      showPersonalized ? adjustedScore : result.gesamtscore,
      profile
    );

    return { adjustedScore, weightDiffs, warnings, recommendation };
  }, [result, profile, isProfileComplete, showPersonalized]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check if extended analysis data is available
  const hasExtendedData = result.tilgungsplan || result.szenarien || result.sensitivity_analyse;

  // Get the tilgungsplan to use (from selected scenario or default)
  const activeTilgungsplan = selectedScenario?.tilgungsplan || result.tilgungsplan;

  if (showFullReport) {
    try {
      return <FullReport result={result || {}} propertyData={propertyData || {}} onBack={() => setShowFullReport(false)} />;
    } catch (e) {
      return (
        <div className="p-8 text-center">
          <p className="text-[#B85C5C] font-semibold mb-4">Fehler beim Laden des Reports</p>
          <button onClick={() => setShowFullReport(false)} className="px-4 py-2 bg-[#7C8B6F] text-white rounded-xl">Zur\u00fcck</button>
        </div>
      );
    }
  }

  return (
    <div className="fade-in space-y-5 md:space-y-8">
      {/* Header Card with Score */}
      <div className="bg-white rounded-3xl p-4 md:p-10 border border-[#E8E0D4]">
        {/* Verwendungszweck Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Verwendungszweck Toggle */}
              <div className="inline-flex items-center rounded-full border border-[#E8E0D4] p-1">
                <button
                  onClick={() => onSwitchVerwendungszweck && result.verwendungszweck !== 'kapitalanlage' && onSwitchVerwendungszweck('kapitalanlage')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    result.verwendungszweck === 'kapitalanlage'
                      ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]'
                      : 'text-[#B5A68C] hover:text-[#2C2418] cursor-pointer'
                  }`}
                  disabled={!onSwitchVerwendungszweck}
                >
                  <span className="font-semibold text-[12px]">Kapitalanlage</span>
                </button>
                <button
                  onClick={() => onSwitchVerwendungszweck && result.verwendungszweck !== 'eigennutzung' && onSwitchVerwendungszweck('eigennutzung')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    result.verwendungszweck === 'eigennutzung'
                      ? 'bg-[#F5F0E8] text-[#5C4F3D]'
                      : 'text-[#B5A68C] hover:text-[#2C2418] cursor-pointer'
                  }`}
                  disabled={!onSwitchVerwendungszweck}
                >
                  <span className="font-semibold text-[12px]">Eigennutzung</span>
                </button>
              </div>
              {isProfileComplete && profile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F0E8] border border-[#E8E0D4] rounded-full">
                  <span>{INVESTMENT_GOALS[profile.goal]?.icon}</span>
                  <span className="text-[#5C4F3D] text-sm font-medium">
                    {INVESTMENT_GOALS[profile.goal]?.label}
                  </span>
                </div>
              )}
            </div>

        {/* Titel + Score nebeneinander */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[20px] md:text-[28px] font-bold text-[#2C2418]">
            Bewertungsergebnis
          </h2>
          <div className="shrink-0">
            <ScoreCircle
              score={result.gesamtscore}
              adjustedScore={dynamicData.adjustedScore}
              showAdjusted={showPersonalized && isProfileComplete}
            />
          </div>
        </div>

        {/* Bewertungstext volle Breite */}
        <div>
            <p className="text-[#8C7E6A] text-[15px] md:text-[16px] leading-relaxed">{result.zusammenfassung?.replace(/\s*Dies ist eine datenbasierte Einsch.*$/, '')}</p>
            <p className="text-[#B5A68C] text-[10px] mt-2">Datenbasierte Einsch&auml;tzung, keine Anlageberatung.</p>

            {/* Personalized Recommendation */}
            {isProfileComplete && dynamicData.recommendation && (
              <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${
                dynamicData.recommendation.action === 'invest'
                  ? 'bg-green-500/10 border-[#7C8B6F]/20 text-[#7C8B6F]'
                  : dynamicData.recommendation.action === 'consider'
                    ? 'bg-[#B5A68C]/10 border-[#B5A68C]/30 text-[#8C7E6A]'
                    : dynamicData.recommendation.action === 'caution'
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                      : 'bg-[#B85C5C]/5 border-[#B85C5C]/20 text-[#B85C5C]'
              }`}>
                <span className="text-lg">{dynamicData.recommendation.emoji}</span>
                <span className="font-medium">{dynamicData.recommendation.text}</span>
              </div>
            )}
        </div>

        {/* Personalized Toggle - nur bei Kapitalanlage sinnvoll */}
        {isProfileComplete && dynamicData.adjustedScore !== null && result.verwendungszweck === 'kapitalanlage' && (
          <div className="mt-6 pt-6 border-t border-[#E8E0D4]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPersonalized(!showPersonalized)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    showPersonalized ? 'bg-[#B5A68C]' : 'bg-slate/30'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    showPersonalized ? 'left-7' : 'left-1'
                  }`} />
                </button>
                <span className="text-sm text-[#8C7E6A]">
                  Personalisierte Bewertung ({INVESTMENT_GOALS[profile?.goal]?.label || 'Individuell'})
                </span>
              </div>
              {showPersonalized && dynamicData.adjustedScore !== result.gesamtscore && (
                <span className="text-xs text-[#8C7E6A]/60">
                  Basis-Score: {Math.round(result.gesamtscore)} | Angepasst: {dynamicData.adjustedScore}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mt-5 md:mt-8 pt-5 md:pt-8 border-t border-[#E8E0D4]">
          <button
            onClick={onNewAnalysis}
            className="py-3 md:py-4 bg-gradient-gold text-[#2C2418] font-bold rounded-xl
              btn-premium shadow-lg text-[14px] md:text-lg"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Neue Analyse
            </span>
          </button>
          <button
            onClick={() => setShowFullReport(true)}
            className="py-3 md:py-4 border-2 border-[#7C8B6F] text-[#7C8B6F] font-semibold rounded-xl
              hover:bg-[#7C8B6F]/5 transition-all text-[14px] md:text-lg"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Full Report
            </span>
          </button>
          <button
            onClick={onEditData}
            className="py-3 md:py-4 border-2 border-slate/30 text-[#2C2418] font-semibold rounded-xl
              hover:border-accent hover:bg-accent/5 transition-all text-[14px] md:text-lg"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Daten bearbeiten
            </span>
          </button>
        </div>
      </div>

      {/* Tab Navigation - Only show if extended data is available and it's kapitalanlage */}
      {hasExtendedData && result.verwendungszweck === 'kapitalanlage' && (
        <div className="bg-white border border-[#E8E0D4] rounded-xl p-1">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-[#7C8B6F]/15 text-[#2C2418] font-semibold'
                    : 'text-[#8C7E6A]/70 hover:bg-[#FAF7F2] hover:text-[#2C2418]'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'uebersicht' && (
        <>
          {/* Personalized Warnings */}
          {isProfileComplete && dynamicData.warnings.length > 0 && showPersonalized && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 fade-in card-hover border-2 border-[#E8E0D4]">
              <h3 className="text-xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Personalisierte Hinweise
                <span className="text-xs bg-[#F5F0E8] text-[#5C4F3D] px-2 py-1 rounded-full ml-2">
                  {INVESTMENT_GOALS[profile.goal]?.label}
                </span>
              </h3>

              <div className="space-y-3">
                {dynamicData.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl flex items-start gap-3 ${
                      warning.type === 'critical'
                        ? 'bg-[#B85C5C]/5 border border-[#B85C5C]/20'
                        : warning.type === 'warning'
                          ? 'bg-[#B5A68C]/10 border border-[#B5A68C]/30'
                          : warning.type === 'positive'
                            ? 'bg-green-500/10 border border-[#7C8B6F]/20'
                            : 'bg-[#F5F0E8] border border-blue-500/30'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{warning.icon}</span>
                    <div>
                      {warning.title && (
                        <p className={`font-bold mb-1 ${
                          warning.type === 'critical' ? 'text-[#B85C5C]' :
                          warning.type === 'warning' ? 'text-[#8C7E6A]' :
                          warning.type === 'positive' ? 'text-[#7C8B6F]' : 'text-blue-400'
                        }`}>
                          {warning.title}
                        </p>
                      )}
                      <p className="text-[#8C7E6A] text-sm leading-relaxed">{warning.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Potenzial-Szenarien */}
          {result.potenzial_szenarien && result.potenzial_szenarien.szenarien?.length > 0 && (
            <div className="bg-white border-2 border-[#7C8B6F]/20 rounded-3xl p-4 md:p-8 fade-in">
              <h3 className="text-xl font-bold text-[#2C2418] mb-2 flex items-center gap-3">
                Potenzial-Rechner
              </h3>
              <p className="text-[13px] text-[#8C7E6A] mb-6">Was waere wenn? Realistische Szenarien fuer dieses Objekt.</p>

              <div className="space-y-3">
                {/* Aktuell */}
                <div className="flex items-center justify-between p-4 bg-[#F5F0E8] rounded-xl border border-[#E8E0D4]">
                  <div>
                    <p className="text-[14px] font-medium text-[#8C7E6A]">Aktuell</p>
                    <p className="text-[12px] text-[#B5A68C]">Ohne Veraenderungen</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[14px] font-bold ${result.potenzial_szenarien.aktuell.cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                      {result.potenzial_szenarien.aktuell.cashflow >= 0 ? '+' : ''}{formatCurrency(result.potenzial_szenarien.aktuell.cashflow)}/Mo
                    </span>
                    <span className="text-[20px] font-bold text-[#2C2418] w-12 text-right">{result.potenzial_szenarien.aktuell.score}</span>
                  </div>
                </div>

                {/* Szenarien */}
                {result.potenzial_szenarien.szenarien.map((s, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${
                    s.score === result.potenzial_szenarien.max_score
                      ? 'bg-[#7C8B6F]/5 border-[#7C8B6F]/30'
                      : 'bg-white border-[#E8E0D4]'
                  }`}>
                    <div>
                      <p className="text-[14px] font-medium text-[#2C2418]">{s.name}</p>
                      <p className="text-[12px] text-[#8C7E6A]">{s.beschreibung}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[14px] font-bold ${s.cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                        {s.cashflow >= 0 ? '+' : ''}{formatCurrency(s.cashflow)}/Mo
                      </span>
                      <div className="text-right">
                        <span className={`text-[20px] font-bold w-12 inline-block text-right ${s.score >= 65 ? 'text-[#7C8B6F]' : 'text-[#2C2418]'}`}>{s.score}</span>
                        <span className="text-[11px] text-[#7C8B6F] font-medium ml-1">+{s.aenderung}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bestes Szenario Highlight */}
              {result.potenzial_szenarien.max_score > result.potenzial_szenarien.aktuell.score + 5 && (
                <div className="mt-4 p-4 bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 rounded-xl">
                  <p className="text-[13px] text-[#5C4F3D]">
                    <span className="font-semibold text-[#7C8B6F]">Bestes Potenzial: Score {result.potenzial_szenarien.max_score}</span>
                    {' '}-- mit {result.potenzial_szenarien.bestes_szenario.name.toLowerCase()} steigt der Score um +{result.potenzial_szenarien.bestes_szenario.aenderung} Punkte und der Cashflow auf {formatCurrency(result.potenzial_szenarien.bestes_szenario.cashflow)}/Monat.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mietschätzung Hinweis (NEU) */}
          {result.mietschaetzung && result.mietschaetzung.ist_geschaetzt && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl p-4 md:p-8 fade-in border-2 border-[#B5A68C]/30">
              <h3 className="text-xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                <span className="text-[#8C7E6A]">Geschätzte Mieteinnahmen</span>
              </h3>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-[#B5A68C]/10 rounded-xl border border-[#B5A68C]/30 text-center">
                  <p className="text-[#B5A68C] text-sm mb-1">Geschätzte Monatsmiete</p>
                  <p className="text-2xl font-bold text-[#8C7E6A]">
                    {formatCurrency(result.mietschaetzung.geschaetzte_miete_monat)}
                  </p>
                </div>
                <div className="p-4 bg-[#F5F0E8] rounded-xl border border-[#E8E0D4] text-center">
                  <p className="text-[#B5A68C] text-sm mb-1">Marktmiete/m²</p>
                  <p className="text-[18px] md:text-2xl font-bold text-[#2C2418]">
                    {result.mietschaetzung.geschaetzte_miete_qm?.toFixed(2)} €
                  </p>
                </div>
                <div className="p-4 bg-[#F5F0E8] rounded-xl border border-[#E8E0D4] text-center">
                  <p className="text-[#B5A68C] text-sm mb-1">Wohnfläche</p>
                  <p className="text-[18px] md:text-2xl font-bold text-[#2C2418]">
                    {result.mietschaetzung.wohnflaeche} m²
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#B5A68C]/10 rounded-xl border border-[#B5A68C]/30">
                <p className="text-[#8C7E6A] text-[13px] leading-relaxed">
                  Geschätzt auf Basis aktueller Neuvermietungspreise für {result.mietschaetzung.standort}. Die tatsächliche Miete kann je nach Zustand, Ausstattung und Lage innerhalb des Stadtteils abweichen.
                </p>
              </div>
            </div>
          )}

          {/* Neuvermietungs-Potenzial */}
          {result.neuvermietung_potenzial && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl p-4 md:p-8 fade-in">
              <h3 className="text-xl font-bold text-[#2C2418] mb-2">
                Mietoptimierung
              </h3>
              <p className="text-[13px] text-[#8C7E6A] mb-6">So kannst du die Rendite verbessern</p>

              <div className="space-y-3 mb-6">
                {/* Neuvermietung */}
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E0D4]">
                  <div>
                    <p className="text-[14px] font-medium text-[#2C2418]">Neuvermietung<InfoTip text="Aktuelle Angebotsmiete bei Neuvermietung. Mietpreisbremse erlaubt max. 10% über ortsüblicher Vergleichsmiete." /></p>
                    <p className="text-[12px] text-[#8C7E6A]">{result.neuvermietung_potenzial.neuvermietung_qm?.toFixed(2)} €/m²</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#2C2418]">{formatCurrency(result.neuvermietung_potenzial.neuvermietung)}/Monat</p>
                    {result.neuvermietung_potenzial.aktuell > 0 && result.neuvermietung_potenzial.uplift_prozent > 0 && (
                      <p className="text-[12px] text-[#7C8B6F] font-medium">+{result.neuvermietung_potenzial.uplift_prozent}% vs. aktuelle Miete</p>
                    )}
                  </div>
                </div>

                {/* WG */}
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E0D4]">
                  <div>
                    <p className="text-[14px] font-medium text-[#2C2418]">WG-Vermietung<InfoTip text="Zimmerweise Vermietung bringt typisch 20-40% mehr Miete, bedeutet aber mehr Verwaltungsaufwand und hoehere Fluktuation." /></p>
                    <p className="text-[12px] text-[#8C7E6A]">+{result.neuvermietung_potenzial.wg_uplift_prozent}% vs. {result.neuvermietung_potenzial.aktuell > 0 ? 'aktuelle Miete' : 'Neuvermietung'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#7C8B6F]">{formatCurrency(result.neuvermietung_potenzial.wg_miete)}/Monat</p>
                  </div>
                </div>

                {/* Moebliert */}
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E0D4]">
                  <div>
                    <p className="text-[14px] font-medium text-[#2C2418]">Möblierte Vermietung<InfoTip text="Möblierte Wohnungen erzielen 15-30% höhere Mieten. Kürzere Kündigungsfristen und steuerliche Vorteile durch Möbel-AfA." /></p>
                    <p className="text-[12px] text-[#8C7E6A]">+{result.neuvermietung_potenzial.moebliert_uplift_prozent}% vs. {result.neuvermietung_potenzial.aktuell > 0 ? 'aktuelle Miete' : 'Neuvermietung'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#7C8B6F]">{formatCurrency(result.neuvermietung_potenzial.moebliert_miete)}/Monat</p>
                  </div>
                </div>
              </div>

              {/* Aktuell vs. Potenzial bei vermieteten */}
              {result.neuvermietung_potenzial.aktuell > 0 && result.neuvermietung_potenzial.uplift_prozent > 0 && (
                <div className="p-4 bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 rounded-xl mb-4">
                  <p className="text-[13px] text-[#5C4F3D]">
                    <span className="font-semibold text-[#7C8B6F]">Mietpotenzial:</span> Die aktuelle Miete von {formatCurrency(result.neuvermietung_potenzial.aktuell)} liegt {result.neuvermietung_potenzial.uplift_prozent}% unter dem aktuellen Neuvermietungsniveau. Bei einem Mieterwechsel könnten die Einnahmen um {formatCurrency(result.neuvermietung_potenzial.uplift_monat)}/Monat steigen ({formatCurrency(result.neuvermietung_potenzial.uplift_jahr)}/Jahr).
                  </p>
                </div>
              )}

              <p className="text-[11px] text-[#8C7E6A]">{result.neuvermietung_potenzial.hinweis}</p>
            </div>
          )}

          {/* Energie-Analyse (bei schlechter Energieklasse) */}
          {result.no_go_check?.energie_analyse && (
            <div className={`bg-white border border-[#E8E0D4] rounded-3xl p-4 md:p-8 fade-in border-2 ${
              result.no_go_check.energie_analyse.lohnt_sich_sanierung
                ? 'border-[#7C8B6F]/20'
                : 'border-[#B85C5C]/20'
            }`}>
              <h3 className="text-xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                <span className={result.no_go_check.energie_analyse.lohnt_sich_sanierung ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}>
                  Energieeffizienz-Analyse (Klasse {result.no_go_check.energie_analyse.energieklasse})
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  result.no_go_check.energie_analyse.lohnt_sich_sanierung
                    ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]'
                    : 'bg-[#B85C5C]/10 text-[#B85C5C]'
                }`}>
                  {result.no_go_check.energie_analyse.lohnt_sich_sanierung ? 'Sanierung lohnt sich!' : 'Kritisch'}
                </span>
              </h3>

              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-[#F5F0E8] rounded-xl border border-[#E8E0D4] text-center">
                  <p className="text-[#B5A68C] text-sm mb-1">Sanierungskosten</p>
                  <p className="text-xl font-bold text-[#2C2418]">
                    {formatCurrency(result.no_go_check.energie_analyse.geschaetzte_sanierungskosten)}
                  </p>
                  <p className="text-xs text-[#B5A68C]">{result.no_go_check.energie_analyse.sanierung_kosten_pro_qm} €/m²</p>
                </div>
                <div className="p-4 bg-[#7C8B6F]/5 rounded-xl border border-[#7C8B6F]/20 text-center">
                  <p className="text-[#B5A68C] text-sm mb-1">KfW-Zuschuss</p>
                  <p className="text-xl font-bold text-[#7C8B6F]">
                    -{formatCurrency(result.no_go_check.energie_analyse.kfw_zuschuss_betrag)}
                  </p>
                  <p className="text-xs text-[#7C8B6F]">{result.no_go_check.energie_analyse.kfw_zuschuss_prozent}% Tilgungszuschuss</p>
                </div>
                <div className="p-4 bg-[#B5A68C]/10 rounded-xl border border-[#B5A68C]/30 text-center">
                  <p className="text-[#B5A68C] text-sm mb-1">Effektive Kosten</p>
                  <p className="text-xl font-bold text-[#8C7E6A]">
                    {formatCurrency(result.no_go_check.energie_analyse.effektive_kosten_nach_foerderung)}
                  </p>
                  <p className="text-xs text-[#B5A68C]">nach Förderung</p>
                </div>
                <div className={`p-4 rounded-xl border text-center ${
                  result.no_go_check.energie_analyse.amortisation_jahre < 15
                    ? 'bg-[#7C8B6F]/5 border-[#7C8B6F]/20'
                    : 'bg-[#B85C5C]/5 border-[#B85C5C]/20'
                }`}>
                  <p className="text-[#B5A68C] text-sm mb-1">Amortisation</p>
                  <p className={`text-xl font-bold ${
                    result.no_go_check.energie_analyse.amortisation_jahre < 15 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
                  }`}>
                    {result.no_go_check.energie_analyse.amortisation_jahre} Jahre
                  </p>
                  <p className="text-xs text-[#B5A68C]">Energieersparnis: {formatCurrency(result.no_go_check.energie_analyse.jaehrliche_energieersparnis)}/Jahr</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${
                result.no_go_check.energie_analyse.lohnt_sich_sanierung
                  ? 'bg-[#7C8B6F]/5 border border-[#7C8B6F]/20'
                  : 'bg-[#B85C5C]/5 border border-[#B85C5C]/20'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{result.no_go_check.energie_analyse.lohnt_sich_sanierung ? '' : ''}</span>
                  <div>
                    <p className={`font-semibold mb-1 ${
                      result.no_go_check.energie_analyse.lohnt_sich_sanierung ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
                    }`}>
                      {result.no_go_check.energie_analyse.fazit}
                    </p>
                    <p className="text-[#8C7E6A] text-sm">
                      {result.no_go_check.energie_analyse.lohnt_sich_sanierung
                        ? `Mit ${result.no_go_check.energie_analyse.kfw_programm} kannst du die Sanierungskosten deutlich reduzieren. Die geschätzte Wertsteigerung beträgt ${formatCurrency(result.no_go_check.energie_analyse.geschaetzte_wertsteigerung)}.`
                        : 'Die Sanierungskosten übersteigen den erwarteten Nutzen. Prüfe alternative Objekte oder verhandle den Kaufpreis deutlich nach unten.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kaufnebenkosten Übersicht */}
          {result.kaufnebenkosten && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl p-4 md:p-8 fade-in card-hover">
              <h3 className="text-xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Kaufnebenkosten
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Linke Seite: Aufschlüsselung */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[#F5F0E8] rounded-xl">
                    <span className="text-[#8C7E6A]">Kaufpreis</span>
                    <span className="font-bold text-[#2C2418]">{formatCurrency(result.kaufnebenkosten.kaufpreis)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#F5F0E8] rounded-xl">
                    <span className="text-[#8C7E6A]">Grunderwerbsteuer ({result.kaufnebenkosten.grunderwerbsteuer_prozent}%)</span>
                    <span className="font-bold text-[#B85C5C]">+{formatCurrency(result.kaufnebenkosten.grunderwerbsteuer)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#F5F0E8] rounded-xl">
                    <span className="text-[#8C7E6A]">Notar & Grundbuch ({result.kaufnebenkosten.notar_grundbuch_prozent}%)</span>
                    <span className="font-bold text-[#B85C5C]">+{formatCurrency(result.kaufnebenkosten.notar_grundbuch)}</span>
                  </div>
                  {result.kaufnebenkosten.makler > 0 && (
                    <div className="flex justify-between items-center p-3 bg-[#F5F0E8] rounded-xl">
                      <span className="text-[#8C7E6A]">Makler ({result.kaufnebenkosten.makler_prozent}%)</span>
                      <span className="font-bold text-[#B85C5C]">+{formatCurrency(result.kaufnebenkosten.makler)}</span>
                    </div>
                  )}
                </div>

                {/* Rechte Seite: Zusammenfassung */}
                <div className="flex flex-col justify-center">
                  <div className="p-6 bg-[#7C8B6F]/5 border-2 border-[#E8E0D4] rounded-2xl text-center">
                    <p className="text-[#B5A68C] text-sm mb-2">Gesamtinvestition</p>
                    <p className="text-3xl font-black text-[#7C8B6F]">{formatCurrency(result.kaufnebenkosten.gesamtkosten)}</p>
                    <p className="text-sm text-[#8C7E6A] mt-2">
                      Kaufpreis + {formatCurrency(result.kaufnebenkosten.gesamt)} Nebenkosten ({result.kaufnebenkosten.gesamt_prozent}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notar-Checkliste */}
          {result.kaufnebenkosten && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl p-4 md:p-8 fade-in card-hover">
              <h3 className="text-[18px] md:text-xl font-bold text-[#2C2418] mb-2">
                Notar-Checkliste
              </h3>
              <p className="text-[13px] text-[#8C7E6A] mb-5">Dein Fahrplan vom Kaufvertrag bis zur Schlüsselübergabe</p>

              <div className="space-y-3">
                {[
                  { nr: 1, titel: 'Finanzierungszusage einholen', beschreibung: 'Bank bestätigt die Kreditbereitschaft. Ohne Zusage keinen Notartermin vereinbaren.', timing: 'Vor dem Notartermin' },
                  { nr: 2, titel: 'Kaufvertragsentwurf prüfen', beschreibung: 'Notar sendet Entwurf mind. 14 Tage vorher. Kaufpreis, Übergabetermin, Mängelhaftung und Sondervereinbarungen prüfen.', timing: '14 Tage vorher' },
                  { nr: 3, titel: 'Notartermin wahrnehmen', beschreibung: 'Notar liest den Vertrag vor und beurkundet. Personalausweis mitbringen. Fragen stellen ist erlaubt und erwünscht.', timing: 'Notartermin' },
                  { nr: 4, titel: 'Auflassungsvormerkung', beschreibung: 'Notar beantragt die Vormerkung im Grundbuch. Schützt dich vor Doppelverkauf oder Belastung durch den Verkäufer.', timing: '1-2 Wochen nach Beurkundung' },
                  { nr: 5, titel: 'Grunderwerbsteuer zahlen', beschreibung: `Finanzamt sendet Bescheid über ${result.kaufnebenkosten.grunderwerbsteuer_prozent || 'ca. 3,5-6,5'}% des Kaufpreises. Frist: 4 Wochen nach Bescheid.`, timing: '4-8 Wochen nach Beurkundung' },
                  { nr: 6, titel: 'Kaufpreis überweisen', beschreibung: 'Erst nach Fälligkeitsmitteilung des Notars. Niemals vorher überweisen, auch wenn der Verkäufer drängt.', timing: 'Nach Fälligkeitsmitteilung' },
                  { nr: 7, titel: 'Grundbucheintragung', beschreibung: 'Du wirst als neuer Eigentümer eingetragen. Kann 3-6 Monate dauern. Grundschuldeintragung der Bank erfolgt parallel.', timing: '3-6 Monate nach Zahlung' },
                  { nr: 8, titel: 'Schlüsselübergabe', beschreibung: 'Übergabeprotokoll erstellen: Zählerstände (Strom, Gas, Wasser), Schlüsselanzahl, Zustand dokumentieren.', timing: 'Am vereinbarten Übergabetermin' },
                ].map((schritt) => (
                  <div key={schritt.nr} className="flex items-start gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E0D4]">
                    <span className="w-7 h-7 rounded-full bg-[#7C8B6F]/10 text-[#7C8B6F] flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5">{schritt.nr}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#2C2418]">{schritt.titel}</span>
                        <span className="text-[10px] text-[#B5A68C] bg-[#B5A68C]/10 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{schritt.timing}</span>
                      </div>
                      <p className="text-[12px] text-[#8C7E6A] mt-1 leading-relaxed">{schritt.beschreibung}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#B5A68C] mt-4 text-center">
                Allgemeine Übersicht. Im Einzelfall können Abweichungen auftreten -- dein Notar berät dich individuell.
              </p>
            </div>
          )}

          {/* Break-Even Calculator (new) */}
          {result.breakeven_eigenkapital && result.verwendungszweck === 'kapitalanlage' && (
            <div className="fade-in-delay-1">
              <BreakEvenCalculator
                breakeven={result.breakeven_eigenkapital}
                aktuellesEigenkapital={result.cashflow_analyse?.eigenkapital || 0}
                kaufpreis={propertyData?.kaufpreis || 0}
              />
            </div>
          )}

          {/* Cashflow Analysis (for investment) */}
          {result.cashflow_analyse && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-10 fade-in-delay-1 card-hover">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5 md:mb-8">
                <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] flex items-center gap-3">
                  Cashflow-Analyse
                </h3>

                {/* Eigenkapital Editor */}
                <div className="flex items-center gap-3">
                  {showEigenkapitalEditor ? (
                    <div className="flex items-center gap-2 bg-[#F5F0E8] rounded-xl p-2">
                      <input
                        type="number"
                        value={eigenkapitalInput}
                        onChange={(e) => setEigenkapitalInput(parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-2 bg-white/10 border border-[#E8E0D4] rounded-lg text-[#2C2418] text-right"
                        step="5000"
                        min="0"
                      />
                      <span className="text-[#B5A68C]">€</span>
                      <button
                        onClick={() => {
                          if (onChangeEigenkapital) {
                            onChangeEigenkapital(eigenkapitalInput);
                          }
                          setShowEigenkapitalEditor(false);
                        }}
                        className="px-3 py-2 bg-[#7C8B6F]/10 text-[#7C8B6F] rounded-lg hover:bg-[#7C8B6F]/30 transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEigenkapitalInput(result.cashflow_analyse?.eigenkapital || 0);
                          setShowEigenkapitalEditor(false);
                        }}
                        className="px-3 py-2 bg-[#B85C5C]/10 text-[#B85C5C] rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowEigenkapitalEditor(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F5F0E8] border border-[#E8E0D4] rounded-xl hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-[#B5A68C] text-sm">Eigenkapital:</span>
                      <span className="text-[#2C2418] font-bold">{formatCurrency(result.cashflow_analyse?.eigenkapital || 0)}</span>
                      <svg className="w-4 h-4 text-[#7C8B6F] group-hover:text-[#5C4F3D] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                <div>
                  <h4 className="font-bold text-[#2C2418] mb-6 text-lg">Monatliche Berechnung</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 px-4 bg-green-500/10 rounded-xl border border-[#7C8B6F]/20">
                      <span className="text-[#8C7E6A] font-medium">
                        {result.cashflow_analyse?.geschaetzte_felder?.includes("miete") ? "Kaltmiete" : "Mieteinnahmen"}
                        {result.cashflow_analyse?.geschaetzte_felder?.includes("miete") && (
                          <span className="ml-1 text-xs text-amber-600" title="Aus Warmmiete abgeleitet">~</span>
                        )}
                      </span>
                      <span className="font-bold text-[#7C8B6F] text-lg">
                        {result.cashflow_analyse?.geschaetzte_felder?.includes("miete") ? "~" : "+"}
                        {formatCurrency(result.cashflow_analyse.monatliche_miete)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-[#B85C5C]/5 rounded-xl border border-[#B85C5C]/20">
                      <span className="text-[#8C7E6A] font-medium">Kreditrate</span>
                      <span className="font-bold text-[#B85C5C] text-lg">
                        -{formatCurrency(result.cashflow_analyse.monatliche_rate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-[#B85C5C]/5 rounded-xl border border-[#B85C5C]/20">
                      <span className="text-[#8C7E6A] font-medium">
                        Nebenkosten/Hausgeld
                        {result.cashflow_analyse?.hausgeld_geschaetzt && (
                          <span className="ml-1 text-xs text-amber-600" title="Geschätzter Wert (~4€/m²)">~</span>
                        )}
                      </span>
                      <span className="font-bold text-[#B85C5C] text-lg">
                        {result.cashflow_analyse?.hausgeld_geschaetzt ? "~" : "-"}
                        {formatCurrency(result.cashflow_analyse.monatliche_nebenkosten)}
                      </span>
                    </div>
                    {(result.cashflow_analyse?.hausgeld_geschaetzt || result.cashflow_analyse?.geschaetzte_felder?.length > 0) && (
                      <p className="text-xs text-amber-600/80 px-2">
                        ~ = geschätzter Wert.
                        {result.cashflow_analyse?.geschaetzte_felder?.includes("miete") && " Kaltmiete aus Warmmiete abgeleitet."}
                        {result.cashflow_analyse?.hausgeld_geschaetzt && " Hausgeld beim Verwalter erfragen."}
                      </p>
                    )}
                    <div className={`flex justify-between items-center py-4 px-5 rounded-2xl shadow-lg ${result.cashflow_analyse.monatlicher_cashflow >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
                      <span className="font-bold text-[#2C2418] text-lg">Monatlicher Cashflow<InfoTip text="Was am Ende des Monats übrig bleibt: Mieteinnahmen minus Kreditrate minus Nebenkosten. Positiv = du verdienst, negativ = du zahlst drauf." /></span>
                      <span className="font-black text-[#2C2418] text-2xl">
                        {result.cashflow_analyse.monatlicher_cashflow >= 0 ? '+' : ''}
                        {formatCurrency(result.cashflow_analyse.monatlicher_cashflow)}
                      </span>
                    </div>
                    {/* Cashflow bei Neuvermietung */}
                    {result.neuvermietung_potenzial && result.neuvermietung_potenzial.neuvermietung > 0 && result.cashflow_analyse.monatliche_miete > 0 && result.neuvermietung_potenzial.neuvermietung > result.cashflow_analyse.monatliche_miete && (
                      <div className="mt-3 p-4 bg-[#F5F0E8] rounded-xl border border-[#E8E0D4]">
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#8C7E6A]">Cashflow bei Neuvermietung</span>
                          <span className={`text-[16px] font-bold ${(result.neuvermietung_potenzial.neuvermietung - result.cashflow_analyse.monatliche_rate - result.cashflow_analyse.monatliche_nebenkosten) >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                            {(result.neuvermietung_potenzial.neuvermietung - result.cashflow_analyse.monatliche_rate - result.cashflow_analyse.monatliche_nebenkosten) >= 0 ? '+' : ''}
                            {formatCurrency(result.neuvermietung_potenzial.neuvermietung - result.cashflow_analyse.monatliche_rate - result.cashflow_analyse.monatliche_nebenkosten)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#B5A68C] mt-1">Bei Neuvermietung zu {formatCurrency(result.neuvermietung_potenzial.neuvermietung)}/Monat ({result.neuvermietung_potenzial.neuvermietung_qm?.toFixed(2)} €/m²)</p>
                      </div>
                    )}

                    {result.cashflow_analyse?.steuereffekt && (
                      <div className="mt-3 p-4 bg-[#7C8B6F]/5 rounded-xl border border-[#7C8B6F]/20">
                        <p className="text-[13px] font-medium text-[#7C8B6F] mb-2">Cashflow nach Steuereffekt (geschätzt)</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#8C7E6A]">Bei 42% Grenzsteuersatz</span>
                          <span className={`text-[16px] font-bold ${result.cashflow_analyse.steuereffekt.cashflow_nach_steuer_42 >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                            {result.cashflow_analyse.steuereffekt.cashflow_nach_steuer_42 >= 0 ? '+' : ''}{formatCurrency(result.cashflow_analyse.steuereffekt.cashflow_nach_steuer_42)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[13px] text-[#8C7E6A]">Bei 35% Grenzsteuersatz</span>
                          <span className={`text-[16px] font-bold ${result.cashflow_analyse.steuereffekt.cashflow_nach_steuer_35 >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                            {result.cashflow_analyse.steuereffekt.cashflow_nach_steuer_35 >= 0 ? '+' : ''}{formatCurrency(result.cashflow_analyse.steuereffekt.cashflow_nach_steuer_35)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#B5A68C] mt-2">Berücksichtigt AfA ({formatCurrency(result.cashflow_analyse.steuereffekt.jaehrliche_afa)}/Jahr) und Zinsabzug</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#2C2418] mb-6 text-lg">Kennzahlen</h4>
                  <div className="space-y-4">
                    <div className={`p-5 rounded-2xl shadow-md ${result.cashflow_analyse.selbsttragend ? 'bg-green-500/10 border-2 border-[#7C8B6F]/20' : 'bg-[#B85C5C]/5 border-2 border-[#B85C5C]/20'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        {result.cashflow_analyse.selbsttragend ? (
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                        <span className={`font-bold text-lg ${result.cashflow_analyse.selbsttragend ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                          {result.cashflow_analyse.selbsttragend ? 'Selbsttragend \u2713' : 'Nicht selbsttragend'}
                        </span>
                      </div>
                      <p className="text-sm text-[#8C7E6A] leading-relaxed">
                        {result.cashflow_analyse.selbsttragend
                          ? 'Die Immobilie finanziert sich selbst bei 100% Finanzierung.'
                          : 'Monatliche Zuzahlung erforderlich.'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-accent/5 rounded-xl border border-accent/20">
                      <span className="text-[#8C7E6A] font-medium">Bruttorendite<InfoTip text="Jahresmiete geteilt durch Kaufpreis. Zeigt wie viel Prozent des Kaufpreises du jährlich als Miete zurückbekommst. Ab 5% gilt als gut." /></span>
                      <span className="font-bold text-xl text-[#B5A68C]">
                        {result.cashflow_analyse.bruttorendite_prozent.toFixed(2)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-[#F5F0E8] rounded-xl border border-slate/20">
                      <span className="text-[#8C7E6A] font-medium">Finanzierungssumme</span>
                      <span className="font-bold text-[#2C2418]">
                        {formatCurrency(result.cashflow_analyse.finanzierungssumme)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-[#F5F0E8] rounded-xl border border-slate/20">
                      <span className="text-[#8C7E6A] font-medium">Jährlicher Cashflow</span>
                      <span className={`font-bold ${result.cashflow_analyse.jaehrlicher_cashflow >= 0 ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                        {result.cashflow_analyse.jaehrlicher_cashflow >= 0 ? '+' : ''}
                        {formatCurrency(result.cashflow_analyse.jaehrlicher_cashflow)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Criteria Breakdown */}
          <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-10 fade-in-delay-2 card-hover">
            <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-5 md:mb-8 flex items-center gap-3">
              Detailbewertung
              {isProfileComplete && showPersonalized && Object.keys(dynamicData.weightDiffs).length > 0 && (
                <span className="text-xs bg-[#F5F0E8] text-[#5C4F3D] px-2 py-1 rounded-full ml-2">
                  Gewichtung angepasst
                </span>
              )}
            </h3>

            <div className="space-y-6">
              {(result.kriterien || [])
                .filter(k => k.gewichtung > 0)
                .sort((a, b) => {
                  // Bei personalisierter Ansicht nach angepasster Gewichtung sortieren
                  if (showPersonalized && isProfileComplete) {
                    const aWeight = dynamicData.weightDiffs[a.name]?.adjusted || a.gewichtung;
                    const bWeight = dynamicData.weightDiffs[b.name]?.adjusted || b.gewichtung;
                    return bWeight - aWeight;
                  }
                  return b.gewichtung - a.gewichtung;
                })
                .map((criterion, index) => (
                  <CriterionBar
                    key={criterion.name}
                    criterion={criterion}
                    weightDiff={dynamicData.weightDiffs[criterion.name]}
                    showAdjusted={showPersonalized && isProfileComplete}
                  />
                ))}
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-xl p-4 md:p-8 fade-in-delay-3 card-hover border-2 border-[#7C8B6F]/20">
              <h3 className="text-xl font-bold text-[#7C8B6F] mb-4 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Stärken
              </h3>
              <ul className="space-y-3">
                {(result.stärken || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl">
                    <span className="text-green-500 text-lg font-bold flex-shrink-0">{'\u2713'}</span>
                    <span className="text-[#2C2418] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-xl p-4 md:p-8 fade-in-delay-3 card-hover border-2 border-[#B85C5C]/20">
              <h3 className="text-xl font-bold text-[#B85C5C] mb-4 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                Schwächen
              </h3>
              <ul className="space-y-3">
                {(result.schwächen || []).map((item, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-[#B85C5C]/5 rounded-xl">
                    <span className="text-red-500 text-lg font-bold flex-shrink-0">!</span>
                    <span className="text-[#2C2418] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* V3.0 Kennzahlen & Markt-Vergleich */}
          {result.kennzahlen && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 fade-in-delay-3 card-hover border-2 border-[#E8E0D4]">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Markt-Vergleich (Live-Daten)
                {result.kennzahlen.marktdaten_quelle === 'live_web_search_v3' && (
                  <span className="text-xs bg-[#7C8B6F]/10 text-[#7C8B6F] px-2 py-1 rounded-full ml-2">✓ Live</span>
                )}
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Preis pro qm */}
                <div className="p-5 bg-gradient-to-br from-slate/5 to-slate/10 rounded-2xl border border-slate/20">
                  <p className="text-sm text-[#8C7E6A]/70 mb-2 font-medium">Objekt-Preis</p>
                  <p className="text-[18px] md:text-2xl font-bold text-[#2C2418]">
                    {result.kennzahlen.preis_pro_qm?.toLocaleString('de-DE')} €/m²
                  </p>
                </div>

                {/* Markt-Durchschnitt */}
                <div className="p-5 bg-gradient-to-br from-slate/5 to-slate/10 rounded-2xl border border-slate/20">
                  <p className="text-sm text-[#8C7E6A]/70 mb-2 font-medium">Markt-Durchschnitt</p>
                  <p className="text-[18px] md:text-2xl font-bold text-[#2C2418]">
                    {result.kennzahlen.markt_durchschnitt_qm?.toLocaleString('de-DE') || '---'} €/m²
                  </p>
                </div>

                {/* Abweichung */}
                <div className={`p-5 rounded-2xl border ${
                  result.kennzahlen.unter_markt
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                    : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300'
                }`}>
                  <p className="text-sm text-[#8C7E6A]/70 mb-2 font-medium">Abweichung vom Markt</p>
                  <p className={`text-2xl font-bold ${
                    result.kennzahlen.unter_markt ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'
                  }`}>
                    {result.kennzahlen.abweichung_prozent > 0 ? '+' : ''}
                    {result.kennzahlen.abweichung_prozent?.toFixed(1) || '---'}%
                  </p>
                  <p className={`text-sm mt-1 font-semibold ${
                    result.kennzahlen.unter_markt ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {result.kennzahlen.unter_markt ? '✓ Unter Markt' : '⚠ Über Markt'}
                  </p>
                </div>

                {/* Kaufpreisfaktor */}
                {result.kennzahlen.kaufpreisfaktor && (
                  <div className={`p-5 rounded-2xl border ${
                    result.kennzahlen.kaufpreisfaktor < 20
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                      : result.kennzahlen.kaufpreisfaktor < 25
                        ? 'bg-[#B5A68C]/10 border border-[#B5A68C]/30'
                        : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300'
                  }`}>
                    <p className="text-sm text-[#8C7E6A]/70 mb-2 font-medium">Kaufpreisfaktor<InfoTip text="Kaufpreis geteilt durch Jahresmiete. Zeigt nach wie vielen Jahren sich der Kauf durch Mieteinnahmen bezahlt hat. Unter 20 ist gut, über 25 ist teuer." /></p>
                    <p className={`text-2xl font-bold ${
                      result.kennzahlen.kaufpreisfaktor < 20 ? 'text-[#7C8B6F]' :
                      result.kennzahlen.kaufpreisfaktor < 25 ? 'text-[#B5A68C]' : 'text-[#B85C5C]'
                    }`}>
                      {result.kennzahlen.kaufpreisfaktor}
                    </p>
                    <p className="text-xs text-[#8C7E6A]/60 mt-1">
                      {'<'}20 gut, {'<'}25 ok, {'>'}25 hoch
                    </p>
                  </div>
                )}
              </div>

              {/* Datenquelle Info */}
              <div className="flex items-center justify-between text-sm border-t border-[#E8E0D4] pt-4">
                <span className="text-[#8C7E6A]/60">
                   Standort: {result.kennzahlen.marktdaten_standort || 'Nicht angegeben'}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  result.kennzahlen.marktdaten_vertrauen === 'hoch'
                    ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]'
                    : result.kennzahlen.marktdaten_vertrauen === 'mittel'
                      ? 'bg-[#B5A68C]/10 text-[#B5A68C]'
                      : 'bg-slate-100 text-[#8C7E6A]-700'
                }`}>
                  Vertrauen: {result.kennzahlen.marktdaten_vertrauen || 'unbekannt'}
                </span>
              </div>
            </div>
          )}

          {/* Market Data */}
          {result.marktdaten && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-10 fade-in-delay-3 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-5 md:mb-8 flex items-center gap-3">
                Marktdaten & Prognose
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-slate/5 to-slate/10 rounded-2xl border border-slate/20">
                  <p className="text-sm text-[#8C7E6A]/70 mb-3 font-medium">Kaufpreis / m²</p>
                  <p className="text-xl font-bold text-[#2C2418] mb-2">
                    {formatCurrency(result.marktdaten.kaufpreis_qm_von)} - {formatCurrency(result.marktdaten.kaufpreis_qm_bis)}
                  </p>
                  <p className="text-sm text-[#B5A68C] font-semibold">
                    Ø {formatCurrency(result.marktdaten.kaufpreis_qm_durchschnitt)}
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-slate/5 to-slate/10 rounded-2xl border border-slate/20">
                  <p className="text-sm text-[#8C7E6A]/70 mb-3 font-medium">Miete / m²</p>
                  <p className="text-xl font-bold text-[#2C2418] mb-2">
                    {result.marktdaten.miete_qm_von?.toFixed(2)}€ - {result.marktdaten.miete_qm_bis?.toFixed(2)}€
                  </p>
                  <p className="text-sm text-[#B5A68C] font-semibold">
                    Ø {result.marktdaten.miete_qm_durchschnitt?.toFixed(2)}€
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-[#7C8B6F]/30">
                  <p className="text-sm text-[#8C7E6A]/70 mb-3 font-medium">5-Jahres-Entwicklung</p>
                  <p className="text-xl font-bold text-[#B5A68C] mb-2">
                    {result.marktdaten.preisentwicklung_5_jahre}
                  </p>
                  <p className="text-sm text-[#2C2418] font-semibold">
                    {result.marktdaten.tendenz}
                  </p>
                </div>
              </div>

              {result.marktdaten.prognose && (
                <div className="mt-6 p-6 bg-[#7C8B6F]/5 border border-[#E8E0D4] rounded-2xl border-2 border-[#E8E0D4]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#7C8B6F] rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#2C2418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-400 mb-2">Marktprognose</p>
                      <p className="text-[#2C2418] leading-relaxed">{result.marktdaten.prognose}</p>
                    </div>
                  </div>
                </div>
              )}

              {result.marktdaten.datenqualität && (
                <p className="text-xs text-[#8C7E6A]/50 mt-6 italic text-center">
                  {result.marktdaten.datenqualität}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Tipps & Förderungen Tab */}
      {activeTab === 'tipps' && (
        result.is_premium === false ? <PremiumLock onUpgrade={onUpgrade} /> :
        <div className="space-y-5 md:space-y-8">
          {/* Fairer Preis */}
          {result.fairer_preis && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Fairer Preis Analyse
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#7C8B6F]/5 border border-[#E8E0D4] rounded-xl p-3 text-center">
                  <p className="text-[#8C7E6A] text-[11px] mb-1">Aktueller Preis</p>
                  <p className="text-[16px] md:text-xl font-bold text-[#2C2418]">{formatCurrency(result.fairer_preis.aktueller_preis)}</p>
                </div>
                <div className="bg-green-500/10 border border-[#7C8B6F]/20 rounded-xl p-3 text-center">
                  <p className="text-[#8C7E6A] text-[11px] mb-1">Fairer Preis</p>
                  <p className="text-[16px] md:text-xl font-bold text-[#7C8B6F]">{formatCurrency(result.fairer_preis.fairer_preis)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${result.fairer_preis.differenz_prozent > 0 ? 'bg-[#B85C5C]/5 border border-[#B85C5C]/20' : 'bg-green-500/10 border border-[#7C8B6F]/20'}`}>
                  <p className="text-[#8C7E6A] text-[11px] mb-1">Differenz</p>
                  <p className={`text-[16px] md:text-xl font-bold ${result.fairer_preis.differenz_prozent > 0 ? 'text-[#B85C5C]' : 'text-[#7C8B6F]'}`}>
                    {result.fairer_preis.differenz_prozent > 0 ? '+' : ''}{result.fairer_preis.differenz_prozent}%
                  </p>
                </div>
                <div className="bg-[#B5A68C]/10 border border-[#B5A68C]/30 rounded-xl p-3 text-center">
                  <p className="text-[#8C7E6A] text-[11px] mb-1">Bewertung</p>
                  <p className="text-[16px] md:text-xl font-bold text-[#8C7E6A] capitalize">{result.fairer_preis.bewertung}</p>
                </div>
              </div>
              {result.fairer_preis.begruendung && (
                <p className="mt-4 text-[13px] text-[#8C7E6A] bg-[#FAF7F2] p-3 rounded-xl">{result.fairer_preis.begruendung}</p>
              )}
            </div>
          )}

          {/* Verbesserungsvorschläge */}
          {result.verbesserungsvorschlaege && result.verbesserungsvorschlaege.length > 0 && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Verbesserungsvorschläge
              </h3>
              <div className="space-y-4">
                {result.verbesserungsvorschlaege.map((tipp, index) => (
                  <div key={index} className="bg-gradient-to-r from-slate/5 to-transparent rounded-2xl p-6 border-l-4 border-accent">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{tipp.icon}</span>
                      <h4 className="text-lg font-bold text-[#2C2418]">{tipp.typ}</h4>
                      {tipp.prioritaet && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tipp.prioritaet === 'hoch' ? 'bg-[#B85C5C]/10 text-[#B85C5C]' :
                          tipp.prioritaet === 'sehr hoch' ? 'bg-red-500/30 text-red-300' :
                          'bg-[#B5A68C]/10 text-[#B5A68C]'
                        }`}>
                          {tipp.prioritaet}
                        </span>
                      )}
                    </div>
                    <p className="text-[#2C2418] mb-2">{tipp.tipp}</p>
                    {tipp.effekt && <p className="text-sm text-[#7C8B6F] mb-1">{'\u{2192}'} {tipp.effekt}</p>}
                    {tipp.argument && <p className="text-sm text-[#8C7E6A] italic">{tipp.argument}</p>}
                    {tipp.optionen && (
                      <ul className="mt-3 space-y-1">
                        {tipp.optionen.map((opt, i) => (
                          <li key={i} className="text-sm text-[#8C7E6A] flex items-center gap-2">
                            <span className="text-[#B5A68C]">{'\u{2022}'}</span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Förderungen */}
          {result.foerderungen && result.foerderungen.length > 0 && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Passende Förderungen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.foerderungen.map((foerderung, index) => (
                  <div key={index} className={`rounded-2xl p-6 border-2 ${
                    foerderung.prioritaet === 'sehr hoch' ? 'border-green-400 bg-green-500/10' :
                    foerderung.prioritaet === 'hoch' ? 'border-blue-400 bg-[#F5F0E8]' :
                    'border-slate/20 bg-[#F5F0E8]'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-[#B5A68C] uppercase">{foerderung.programm}</span>
                        <h4 className="text-lg font-bold text-[#2C2418]">{foerderung.name}</h4>
                      </div>
                      {foerderung.prioritaet && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          foerderung.prioritaet === 'sehr hoch' ? 'bg-green-500/30 text-green-300' :
                          foerderung.prioritaet === 'hoch' ? 'bg-blue-500/30 text-blue-300' :
                          'bg-slate/20 text-[#8C7E6A]'
                        }`}>
                          {foerderung.prioritaet}
                        </span>
                      )}
                    </div>
                    {foerderung.kredit && <p className="text-sm text-[#2C2418] mb-1">{'\u{1F4B0}'} Kredit: {formatCurrency(foerderung.kredit)}</p>}
                    {foerderung.zins && <p className="text-sm text-[#2C2418] mb-1">{'\u{1F4C9}'} Zins: {foerderung.zins}</p>}
                    {foerderung.zuschuss && <p className="text-sm text-[#7C8B6F] mb-1">{'\u{1F381}'} {foerderung.zuschuss}</p>}
                    {foerderung.foerderung_prozent && <p className="text-sm text-[#7C8B6F] mb-1">{'\u{2705}'} {foerderung.foerderung_prozent}% Förderung</p>}
                    {foerderung.grund && <p className="text-sm text-[#8C7E6A] mb-2">{foerderung.grund}</p>}
                    {foerderung.wichtig && (
                      <p className="text-xs text-[#8C7E6A] bg-[#B5A68C]/10 rounded-lg px-3 py-2 mt-2">
                        {'\u{26A0}\u{FE0F}'} {foerderung.wichtig}
                      </p>
                    )}
                    {foerderung.tipp && (
                      <p className="text-xs text-[#7C8B6F] bg-[#F5F0E8] rounded-lg px-3 py-2 mt-2">
                        {'\u{1F4A1}'} {foerderung.tipp}
                      </p>
                    )}
                    {foerderung.link && (
                      <a href={foerderung.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C8B6F] hover:underline mt-2 inline-block">
                        Zum Förderprogramm →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AfA Berechnung */}
          {result.afa_berechnung && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                AfA (Abschreibung)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.afa_berechnung.linear && (
                  <div className="bg-[#F5F0E8] rounded-2xl p-6">
                    <h4 className="font-bold text-[#2C2418] mb-3">Lineare AfA</h4>
                    <div className="space-y-2 text-sm">
                      <p>AfA-Satz: <span className="font-semibold">{result.afa_berechnung.linear.satz_prozent}%</span></p>
                      <p>Dauer: <span className="font-semibold">{result.afa_berechnung.linear.dauer_jahre} Jahre</span></p>
                      <p>Jährlich absetzbar: <span className="font-semibold text-[#7C8B6F]">{formatCurrency(result.afa_berechnung.linear.jaehrlich)}</span></p>
                      <p>Gesamt in 15 Jahren: <span className="font-semibold text-[#7C8B6F]">{formatCurrency(result.afa_berechnung.linear.gesamt_15_jahre)}</span></p>
                    </div>
                  </div>
                )}
                {result.afa_berechnung.degressiv && (
                  <div className="bg-green-500/10 rounded-2xl p-6">
                    <h4 className="font-bold text-[#2C2418] mb-3">Degressive AfA {'\u{2728}'}</h4>
                    <div className="space-y-2 text-sm">
                      <p>AfA-Satz: <span className="font-semibold">{result.afa_berechnung.degressiv.satz_prozent}%</span> vom Restwert</p>
                      <p>Gesamt in 15 Jahren: <span className="font-semibold text-[#7C8B6F]">{formatCurrency(result.afa_berechnung.degressiv.gesamt_15_jahre)}</span></p>
                      <p className="text-[#7C8B6F] font-medium">Vorteil vs. linear: +{formatCurrency(result.afa_berechnung.degressiv.vorteil_vs_linear)}</p>
                      <p className="text-xs text-[#8C7E6A] mt-2">{result.afa_berechnung.degressiv.empfehlung}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leverage Effekt */}
          {result.leverage_effekt && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Leverage-Effekt (Hebel)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#F5F0E8] rounded-xl p-4 text-center">
                  <p className="text-[#8C7E6A] text-sm mb-1">Objektrendite</p>
                  <p className="text-xl font-bold text-[#2C2418]">{result.leverage_effekt.objektrendite_prozent}%</p>
                </div>
                <div className="bg-[#F5F0E8] rounded-xl p-4 text-center">
                  <p className="text-[#8C7E6A] text-sm mb-1">FK-Zins</p>
                  <p className="text-xl font-bold text-[#2C2418]">{result.leverage_effekt.fremdkapitalzins_prozent}%</p>
                </div>
                <div className="bg-[#F5F0E8] rounded-xl p-4 text-center">
                  <p className="text-[#8C7E6A] text-sm mb-1">Hebel</p>
                  <p className="text-xl font-bold text-[#2C2418]">{result.leverage_effekt.hebel_faktor}x</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${result.leverage_effekt.ist_positiver_hebel ? 'bg-[#7C8B6F]/10' : 'bg-[#B85C5C]/10'}`}>
                  <p className="text-[#8C7E6A] text-sm mb-1">EK-Rendite</p>
                  <p className={`text-xl font-bold ${result.leverage_effekt.ist_positiver_hebel ? 'text-[#7C8B6F]' : 'text-[#B85C5C]'}`}>
                    {result.leverage_effekt.eigenkapitalrendite_prozent}%
                  </p>
                </div>
              </div>
              {result.leverage_effekt.warnung && (
                <div className="mt-4 bg-[#B85C5C]/5 border border-[#B85C5C]/20 rounded-xl p-4">
                  <p className="text-[#B85C5C] text-sm">{'\u{26A0}\u{FE0F}'} {result.leverage_effekt.warnung}</p>
                </div>
              )}
              <p className="text-sm text-[#8C7E6A] mt-4">
                Break-Even-Zins: {result.leverage_effekt.break_even_zins}% - Ab diesem FK-Zins wird der Hebel negativ.
              </p>
            </div>
          )}

          {/* Quick Check */}
          {result.quick_check_result && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-4 flex items-center gap-3">
                Quick-Check
              </h3>
              <div className="flex items-center justify-between mb-6">
                <span className="text-3xl">
                  {result.quick_check_result.ampel === 'gruen' ? '\u{1F7E2}' :
                   result.quick_check_result.ampel === 'gelb' ? '\u{1F7E1}' : '\u{1F534}'}
                </span>
                <p className="text-lg font-bold text-[#2C2418]">{result.quick_check_result.empfehlung?.replace(/\[(ROT|GELB|OK|ERROR)\]\s*/g, '')}</p>
                <span className="text-lg text-[#8C7E6A]">{result.quick_check_result.bestanden}/{result.quick_check_result.gesamt} Kriterien</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(result.quick_check_result.checks).map(([key, value]) => (
                  <div key={key} className={`rounded-xl p-4 flex items-center gap-3 ${value ? 'bg-green-500/10' : 'bg-[#B85C5C]/5'}`}>
                    <span>{value ? '\u{2705}' : '\u{274C}'}</span>
                    <span className="text-sm">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verhandlungsnachricht */}
          {result.verhandlungsmail && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-2 flex items-center gap-3">
                Verhandlungsnachricht
              </h3>
              <p className="text-[13px] text-[#8C7E6A] mb-5">Fertige Nachricht an den Verk&auml;ufer/Makler - basierend auf deiner Analyse. Kopieren und anpassen.</p>
              <div className="bg-[#FAF7F2] border border-[#E8E0D4] rounded-2xl p-6 relative">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.verhandlungsmail);
                    const btn = document.getElementById('copy-btn-mail');
                    if (btn) { btn.textContent = 'Kopiert!'; setTimeout(() => { btn.textContent = 'Kopieren'; }, 2000); }
                  }}
                  id="copy-btn-mail"
                  className="absolute top-4 right-4 px-3 py-1.5 bg-[#7C8B6F] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#6B7A5E] transition-all"
                >
                  Kopieren
                </button>
                <pre className="text-[14px] text-[#2C2418] whitespace-pre-wrap font-sans leading-relaxed">{result.verhandlungsmail?.replace(/\*\*/g, '')}</pre>
              </div>
            </div>
          )}

          {/* Besichtigungs-Roadmap */}
          {result.besichtigungs_roadmap && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-8 card-hover">
              <h3 className="text-[18px] md:text-2xl font-bold text-[#2C2418] mb-2 flex items-center gap-3">
                Dein Besichtigungs-Leitfaden
              </h3>
              <p className="text-[13px] text-[#8C7E6A] mb-6">Personalisiert f&uuml;r dieses Objekt -- worauf du achten solltest, was du fragen kannst und wie du dich positionierst.</p>

              {/* Checkliste */}
              {result.besichtigungs_roadmap.checkliste && (
                <div className="mb-5 md:mb-8">
                  <h4 className="text-[16px] font-semibold text-[#2C2418] mb-4">Checkliste f&uuml;r die Besichtigung</h4>
                  <div className="space-y-4">
                    {result.besichtigungs_roadmap.checkliste.map((kat, i) => (
                      <div key={i} className="bg-[#FAF7F2] border border-[#E8E0D4] rounded-2xl p-5">
                        <h5 className="text-[14px] font-semibold text-[#5C4F3D] mb-3">{kat.kategorie}</h5>
                        <ul className="space-y-2">
                          {kat.punkte.map((p, j) => (
                            <li key={j} className="flex items-start gap-3">
                              <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 ${p.spezifisch ? 'border-[#7C8B6F] bg-[#7C8B6F]/10' : 'border-[#E8E0D4]'}`} />
                              <div>
                                <span className="text-[13px] font-medium text-[#2C2418]">{p.was_pruefen}</span>
                                {p.spezifisch && <span className="ml-2 text-[11px] text-[#7C8B6F] bg-[#7C8B6F]/10 px-1.5 py-0.5 rounded">Objektspezifisch</span>}
                                <p className="text-[12px] text-[#8C7E6A] mt-0.5">{p.warum}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fragen an Verk&auml;ufer */}
              {result.besichtigungs_roadmap.fragen_an_verkaeufer && (
                <div className="mb-5 md:mb-8">
                  <h4 className="text-[16px] font-semibold text-[#2C2418] mb-4">Fragen an den Verk&auml;ufer / Makler</h4>
                  <div className="bg-[#FAF7F2] border border-[#E8E0D4] rounded-2xl p-5">
                    <ul className="space-y-3">
                      {result.besichtigungs_roadmap.fragen_an_verkaeufer.map((frage, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-[#7C8B6F] font-bold text-[13px] mt-0.5">{i + 1}.</span>
                          <span className="text-[13px] text-[#2C2418]">{frage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Verhalten Tipps */}
              {result.besichtigungs_roadmap.verhalten_tipps && (
                <div className="mb-5 md:mb-8">
                  <h4 className="text-[16px] font-semibold text-[#2C2418] mb-4">So positionierst du dich richtig</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 rounded-2xl p-5">
                      <h5 className="text-[13px] font-semibold text-[#7C8B6F] mb-3">Das solltest du tun</h5>
                      <ul className="space-y-2">
                        {result.besichtigungs_roadmap.verhalten_tipps.do?.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#2C2418]">
                            <span className="text-[#7C8B6F] mt-0.5 flex-shrink-0">+</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-[#B85C5C]/5 border border-[#B85C5C]/15 rounded-2xl p-5">
                      <h5 className="text-[13px] font-semibold text-[#B85C5C] mb-3">Das solltest du vermeiden</h5>
                      <ul className="space-y-2">
                        {result.besichtigungs_roadmap.verhalten_tipps.dont?.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#2C2418]">
                            <span className="text-[#B85C5C] mt-0.5 flex-shrink-0">-</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Naechste Schritte */}
              {result.besichtigungs_roadmap.naechste_schritte && (
                <div>
                  <h4 className="text-[16px] font-semibold text-[#2C2418] mb-4">Nach der Besichtigung</h4>
                  <div className="bg-[#FAF7F2] border border-[#E8E0D4] rounded-2xl p-5">
                    <ul className="space-y-2">
                      {result.besichtigungs_roadmap.naechste_schritte.map((schritt, i) => (
                        <li key={i} className="flex items-start gap-3 text-[13px] text-[#2C2418]">
                          <span className="w-6 h-6 rounded-full bg-[#7C8B6F]/10 text-[#7C8B6F] flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</span>
                          {schritt}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[12px] text-[#7C8B6F] bg-[#7C8B6F]/5 px-3 py-2 rounded-[8px]">
                      Nach der Besichtigung kannst du deine Analyse mit neuen Erkenntnissen verfeinern -- einfach die Daten aktualisieren.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hinweis f\u00fcr bereits besichtigte Objekte */}
          {result.besichtigt === true && (
            <div className="bg-[#7C8B6F]/5 border border-[#7C8B6F]/20 rounded-2xl p-5">
              <p className="text-[13px] text-[#5C4F3D]">
                <span className="font-semibold text-[#7C8B6F]">Tipp:</span> Du warst bereits bei der Besichtigung. Falls du neue Erkenntnisse hast (z.B. Zustand, Renovierungsbedarf, Nachbarschaft), kannst du deine Daten aktualisieren und eine noch praezisere Analyse erhalten.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Projektionen Tab */}
      {activeTab === 'projektionen' && hasExtendedData && (
        <div className="space-y-8">
          {/* NEW: Full Live Calculator */}
          <LiveCalculator
            kaufpreis={propertyData?.kaufpreis || 0}
            monatlicheMiete={propertyData?.aktuelle_miete || result.mietschaetzung?.geschaetzte_miete_monat || 0}
            hausgeld={propertyData?.hausgeld || propertyData?.nebenkosten || result.cashflow_analyse?.monatliche_nebenkosten || 0}
            hausgeldNichtUmlagefaehig={propertyData?.hausgeld_nicht_umlagefaehig || result.cashflow_analyse?.monatliche_nebenkosten || null}
            wohnflaeche={propertyData?.wohnflaeche || 0}
            baujahr={propertyData?.baujahr || null}
            neuvermietungPotenzial={result.neuvermietung_potenzial}
            initialValues={{
              eigenkapital: result.cashflow_analyse?.eigenkapital || 0,
              zinssatz: result.cashflow_analyse?.zinssatz_prozent || 3.75,
              tilgung: result.cashflow_analyse?.tilgung_prozent || 1.5
            }}
          />

          {/* Charts */}
          <div className="bg-white rounded-2xl p-4 md:p-8 border border-[#E8E0D4]">
            <CashflowChart szenarien={result.szenarien} />
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-8 border border-[#E8E0D4]">
            <TilgungsChart tilgungsplan={activeTilgungsplan} />
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-8 border border-[#E8E0D4]">
            <ZinsTilgungChart tilgungsplan={activeTilgungsplan} />
          </div>
        </div>
      )}

      {/* Szenarien Tab */}
      {activeTab === 'szenarien' && hasExtendedData && (
        result.is_premium === false ? <PremiumLock onUpgrade={onUpgrade} /> :
        <div className="space-y-8">
          <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-10 card-hover">
            <ScenarioComparison
              szenarien={result.szenarien}
              onSelectScenario={setSelectedScenario}
            />
          </div>

          {/* Show selected scenario details */}
          {selectedScenario && (
            <div className="bg-white border border-[#E8E0D4] rounded-3xl shadow-2xl p-4 md:p-10 card-hover">
              <h4 className="text-lg font-bold text-[#2C2418] mb-6">
                Details: {selectedScenario.name} Szenario
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <TilgungsChart tilgungsplan={selectedScenario.tilgungsplan} />
                <ZinsTilgungChart tilgungsplan={selectedScenario.tilgungsplan} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optionen Tab - Finanzierung & Miet-Variationen */}
      {activeTab === 'optionen' && hasExtendedData && (
        result.is_premium === false ? <PremiumLock onUpgrade={onUpgrade} /> :
        <div className="space-y-8">
          {/* Financing Options */}
          {result.finanzierungsoptionen && (
            <FinancingOptions optionen={result.finanzierungsoptionen} />
          )}

          {/* Rental Variations */}
          {result.miet_variationen && (
            <RentalVariations variationen={result.miet_variationen} />
          )}

          {/* Sensitivity Matrix */}
          {result.sensitivity_analyse && (
            <SensitivityMatrix sensitivity={result.sensitivity_analyse} />
          )}
        </div>
      )}

      {/* Vergleich Tab - Investment Comparison & Milestones */}
      {activeTab === 'vergleich' && hasExtendedData && (
        result.is_premium === false ? <PremiumLock onUpgrade={onUpgrade} /> :
        <div className="space-y-8">
          {/* Investment Comparison */}
          {result.investment_vergleich && (
            <InvestmentComparison vergleich={result.investment_vergleich} />
          )}

          {/* Milestones Timeline */}
          {result.meilensteine && (
            <MilestonesTimeline meilensteine={result.meilensteine} />
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[#B5A68C] text-[10px] text-center mt-2 px-4">
        Datenbasierte Einsch&auml;tzung. Keine professionelle Immobilienbewertung, Rechts- oder Finanzberatung.
      </p>
    </div>
  );
}

export default AnalysisResult;
