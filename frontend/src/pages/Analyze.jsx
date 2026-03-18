import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import PropertyForm from '../components/PropertyForm';
import AnalysisResult from '../components/AnalysisResult';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';

function Analyze() {
  const [step, setStep] = useState('upload');
  const [propertyData, setPropertyData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [lastFinanzierung, setLastFinanzierung] = useState(null);
  const [lastVerwendungszweck, setLastVerwendungszweck] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

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

  const handleAnalyze = useCallback(async (formData, verwendungszweck, finanzierung) => {
    setError(null); setStep('analyzing'); setLoadingMessage('Immobilie wird bewertet...');
    setLastVerwendungszweck(verwendungszweck); setLastFinanzierung(finanzierung); setPropertyData(formData);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ property_data: formData, verwendungszweck, eigenkapital: finanzierung.eigenkapital, zinssatz: finanzierung.zinssatz, tilgung: finanzierung.tilgung }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      const resultData = await res.json();
      setAnalysisResult(resultData);
      if (resultData.analysis_id) setSavedAnalysisId(resultData.analysis_id);
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
        body: JSON.stringify({ property_data: propertyData, verwendungszweck: v, eigenkapital: fin.eigenkapital, zinssatz: fin.zinssatz, tilgung: fin.tilgung }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      setAnalysisResult(await res.json()); setStep('result');
    } catch (err) { setError(err.message); setStep('result'); }
  }, [propertyData, lastFinanzierung, token]);

  const handleChangeEigenkapital = useCallback(async (ek) => {
    if (!propertyData || !lastVerwendungszweck) return;
    setError(null); setStep('analyzing'); setLoadingMessage(`Berechne mit ${ek.toLocaleString('de-DE')} EUR EK...`);
    setLastFinanzierung({ ...lastFinanzierung, eigenkapital: ek });
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ property_data: propertyData, verwendungszweck: lastVerwendungszweck, eigenkapital: ek, zinssatz: lastFinanzierung?.zinssatz || 3.75, tilgung: lastFinanzierung?.tilgung || 1.25 }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Fehler'); }
      setAnalysisResult(await res.json()); setStep('result');
    } catch (err) { setError(err.message); }
  }, [propertyData, lastVerwendungszweck, lastFinanzierung, token]);

  return (
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20">
      <div className="max-w-[900px]">
        {step === 'upload' && (
          <header className="text-center mb-16 fade-in">
            <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-[#2C2418] mb-3">Neue Analyse</h1>
            <p className="text-[#8C7E6A] text-[16px] max-w-md mx-auto font-light">Expose hochladen oder Daten manuell eingeben</p>
          </header>
        )}

        {error && (
          <div className="mb-8 px-5 py-4 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[16px] fade-in">
            <p className="text-[#B85C5C] text-[14px]">{error}</p>
          </div>
        )}

        <main>
          {step === 'upload' && <FileUpload onFileUpload={handleFileUpload} onManualEntry={handleManualEntry} />}
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
                onSwitchVerwendungszweck={handleSwitchVerwendungszweck} onChangeEigenkapital={handleChangeEigenkapital} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Analyze;
