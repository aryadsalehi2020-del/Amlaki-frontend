import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MessageSquare, Lock } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import PropertyForm from '../components/PropertyForm';
import AnalysisResult from '../components/AnalysisResult';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';

function CreditsBadge({ credits }) {
  if (credits === null || credits === undefined) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7C8B6F]/10 border border-[#7C8B6F]/20 rounded-full text-[13px] font-medium text-[#7C8B6F]">
      {credits} {credits === 1 ? 'Credit' : 'Credits'}
    </div>
  );
}

function PaywallModal({ onClose, token }) {
  const [loading, setLoading] = useState(null);

  const packages = [
    { id: 'single', credits: 1, price: '9', perUnit: '9', popular: false },
    { id: 'pack5', credits: 5, price: '35', perUnit: '7', popular: true },
    { id: 'pack10', credits: 10, price: '50', perUnit: '5', popular: false },
  ];

  const handlePurchase = async (packageId) => {
    setLoading(packageId);
    try {
      const res = await fetch(`${API_BASE}/payments/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ package: packageId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || 'Fehler beim Erstellen der Zahlung');
        setLoading(null);
        return;
      }
      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch (err) {
      alert('Verbindungsfehler. Bitte versuche es erneut.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] max-w-lg w-full p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8C7E6A] hover:text-[#2C2418] text-xl">&times;</button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#7C8B6F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-[#7C8B6F]" />
          </div>
          <h2 className="text-[22px] font-bold text-[#2C2418] mb-2">Analyse-Credits kaufen</h2>
          <p className="text-[14px] text-[#8C7E6A]">
            Schalte die vollst&auml;ndige Immobilienanalyse frei -- mit Szenarien, F&ouml;rderungen und Verbesserungsvorschl&auml;gen.
          </p>
        </div>

        <div className="space-y-3">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading !== null}
              className={`w-full p-4 rounded-[14px] border-2 text-left transition-all flex items-center justify-between ${
                pkg.popular
                  ? 'border-[#7C8B6F] bg-[#7C8B6F]/[0.04]'
                  : 'border-[#E8E0D4] hover:border-[#B5A68C]'
              } ${loading === pkg.id ? 'opacity-70' : ''}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-[#2C2418]">
                    {pkg.credits} {pkg.credits === 1 ? 'Analyse' : 'Analysen'}
                  </span>
                  {pkg.popular && (
                    <span className="text-[11px] font-medium bg-[#7C8B6F] text-white px-2 py-0.5 rounded-full">Beliebt</span>
                  )}
                </div>
                <span className="text-[12px] text-[#8C7E6A]">{pkg.perUnit} pro Analyse</span>
              </div>
              <span className="text-[18px] font-bold text-[#2C2418]">
                {loading === pkg.id ? '...' : `${pkg.price} \u20AC`}
              </span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-[#B5A68C] text-center mt-6">
          Sichere Zahlung via Stripe. Keine Abos, keine versteckten Kosten.
        </p>
      </div>
    </div>
  );
}

function Analyze() {
  const [step, setStep] = useState('upload');
  const [propertyData, setPropertyData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [lastFinanzierung, setLastFinanzierung] = useState(null);
  const [lastVerwendungszweck, setLastVerwendungszweck] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [credits, setCredits] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Prefill from Library "Daten bearbeiten"
  useEffect(() => {
    if (location.state?.prefill) {
      setPropertyData(location.state.prefill);
      setStep('form');
      // Clear state so it doesn't re-trigger on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch credits on mount + after payment
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/credits`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
        }
      } catch (err) { /* ignore */ }
    };
    fetchCredits();

    // Check for payment success
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      fetchCredits();
    }
  }, [token, searchParams]);

  const handleUrlImport = useCallback((data) => {
    setPropertyData(data);
    setStep('form');
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    setError(null); setStep('analyzing'); setLoadingMessage('Expose wird analysiert...');
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/extract-pdf`, { method: 'POST', body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      setPropertyData(await res.json()); setStep('form');
    } catch (err) { setError(err.message); setStep('upload'); }
  }, []);

  const handleManualEntry = useCallback(() => { setPropertyData({}); setStep('form'); }, []);

  const handleAnalyze = useCallback(async (formData, verwendungszweck, finanzierung, investmentProfile, besichtigt, besichtigungsNotizen) => {
    setError(null); setStep('analyzing'); setLoadingMessage('Immobilie wird bewertet...');
    setLastVerwendungszweck(verwendungszweck); setLastFinanzierung(finanzierung); setPropertyData(formData);
    try {
      const requestBody = { property_data: formData, verwendungszweck, eigenkapital: finanzierung.eigenkapital, zinssatz: finanzierung.zinssatz, tilgung: finanzierung.tilgung, besichtigt: besichtigt, besichtigungs_notizen: besichtigungsNotizen || null };
      if (investmentProfile) {
        requestBody.investment_profile = {
          goal: Array.isArray(investmentProfile.goals) ? investmentProfile.goals[0] : (investmentProfile.goal || 'cashflow'),
          goals: investmentProfile.goals || (investmentProfile.goal ? [investmentProfile.goal] : ['cashflow']),
          risk_profile: investmentProfile.riskProfile,
          eigenkapital: investmentProfile.eigenkapital,
          mindest_rendite: investmentProfile.mindestRendite,
        };
      }
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(requestBody),
      });
      if (res.status === 402) {
        setShowPaywall(true);
        setStep('form');
        return;
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      const resultData = await res.json();
      setAnalysisResult(resultData);
      if (resultData.analysis_id) setSavedAnalysisId(resultData.analysis_id);
      // Update credits after analysis
      setCredits(prev => prev !== null && prev > 0 ? prev - 1 : prev);
      setStep('result');
    } catch (err) { setError(err.message); setStep('form'); }
  }, [token]);

  const handleSwitchVerwendungszweck = useCallback(async (v) => {
    if (!propertyData) return;
    const fin = lastFinanzierung || { eigenkapital: 0, zinssatz: 3.75, tilgung: 1.25 };
    setError(null); setStep('analyzing');
    setLoadingMessage(v === 'kapitalanlage' ? 'Bewerte als Kapitalanlage...' : 'Bewerte als Eigennutzung...');
    setLastVerwendungszweck(v); setLastFinanzierung(fin);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ property_data: propertyData, verwendungszweck: v, eigenkapital: fin.eigenkapital, zinssatz: fin.zinssatz, tilgung: fin.tilgung, analysis_id: savedAnalysisId }),
      });
      if (res.status === 402) { setShowPaywall(true); setStep('result'); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      const resultData = await res.json();
      setAnalysisResult(resultData);
      if (resultData.analysis_id) setSavedAnalysisId(resultData.analysis_id);
      setStep('result');
    } catch (err) { setError(err.message); setStep('result'); }
  }, [propertyData, lastFinanzierung, token, savedAnalysisId]);

  const handleChangeEigenkapital = useCallback(async (ek) => {
    if (!propertyData || !lastVerwendungszweck) return;
    setError(null); setStep('analyzing'); setLoadingMessage(`Berechne mit ${ek.toLocaleString('de-DE')} EUR EK...`);
    setLastFinanzierung({ ...lastFinanzierung, eigenkapital: ek });
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ property_data: propertyData, verwendungszweck: lastVerwendungszweck, eigenkapital: ek, zinssatz: lastFinanzierung?.zinssatz || 3.75, tilgung: lastFinanzierung?.tilgung || 1.25, analysis_id: savedAnalysisId }),
      });
      if (res.status === 402) { setShowPaywall(true); setStep('result'); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      const resultData = await res.json();
      setAnalysisResult(resultData);
      if (resultData.analysis_id) setSavedAnalysisId(resultData.analysis_id);
      setStep('result');
    } catch (err) { setError(err.message); }
  }, [propertyData, lastVerwendungszweck, lastFinanzierung, token, savedAnalysisId]);

  return (
    <div className="px-6 md:px-16 lg:px-20 py-3 md:py-5">
      <div className="max-w-[900px]">
        {step === 'upload' && (
          <header className="text-center mb-4 md:mb-6 fade-in">
            <div className="flex items-center justify-center gap-3 mb-1">
              <h1 className="text-[24px] md:text-[40px] font-bold tracking-tight text-[#2C2418]">Neue Analyse</h1>
              <CreditsBadge credits={credits} />
            </div>
          </header>
        )}

        {searchParams.get('payment') === 'success' && (
          <div className="mb-8 px-5 py-4 bg-[#7C8B6F]/[0.08] border border-[#7C8B6F]/[0.2] rounded-[16px] fade-in">
            <p className="text-[#7C8B6F] text-[14px] font-medium">Zahlung erfolgreich! Deine Credits wurden aufgeladen.</p>
          </div>
        )}

        {error && (
          <div className="mb-8 px-5 py-4 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[16px] fade-in">
            <p className="text-[#B85C5C] text-[14px]">{error}</p>
          </div>
        )}

        <main>
          {step === 'upload' && <FileUpload onFileUpload={handleFileUpload} onManualEntry={handleManualEntry} onUrlImport={handleUrlImport} />}
          {step === 'form' && <PropertyForm initialData={propertyData} onAnalyze={handleAnalyze} onBack={() => { setStep('upload'); setPropertyData(null); setAnalysisResult(null); setError(null); }} />}
          {step === 'analyzing' && <LoadingState message={loadingMessage} />}
          {step === 'result' && analysisResult && (
            <>
              {savedAnalysisId && (
                <div className="mb-6 bg-white border border-[#E8E0D4] rounded-[16px] p-5 fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#7C8B6F]/10 rounded-[12px] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-[#7C8B6F]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#2C2418]">Analyse gespeichert</p>
                      <p className="text-[12px] text-[#8C7E6A] mt-0.5">Mit dem Berater besprechen?</p>
                    </div>
                    <button
                      onClick={() => navigate(`/chat?analysis_id=${savedAnalysisId}`)}
                      className="px-5 py-2.5 bg-[#7C8B6F] text-white font-medium rounded-[10px] hover:bg-[#6B7A5E] transition-all text-[13px] flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Berater starten
                    </button>
                  </div>
                </div>
              )}
              <AnalysisResult result={analysisResult} propertyData={propertyData}
                onNewAnalysis={() => { setStep('upload'); setPropertyData(null); setAnalysisResult(null); setSavedAnalysisId(null); setError(null); }}
                onEditData={() => { setStep('form'); setAnalysisResult(null); }}
                onSwitchVerwendungszweck={handleSwitchVerwendungszweck} onChangeEigenkapital={handleChangeEigenkapital}
                onUpgrade={() => setShowPaywall(true)} />
            </>
          )}
        </main>
      </div>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} token={token} />}
    </div>
  );
}

export default Analyze;
