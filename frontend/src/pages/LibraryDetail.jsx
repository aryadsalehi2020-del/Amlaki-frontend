import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare } from 'lucide-react';
import AnalysisResult from '../components/AnalysisResult';
import ProjectionCharts from '../components/ProjectionCharts';
import ScenarioSimulator from '../components/ScenarioSimulator';
import FairPriceCalculator from '../components/FairPriceCalculator';
import ConfirmDialog from '../components/ConfirmDialog';
import { API_BASE } from '../config';

function LibraryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '' });
  const [activeTool, setActiveTool] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => { fetchAnalysis(); }, [id]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/library/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        setEditForm({ title: data.title || '', notes: data.notes || '' });
      } else if (response.status === 404) { setError('Analyse nicht gefunden'); }
      else { setError('Fehler beim Laden der Analyse'); }
    } catch (error) { setError('Verbindungsfehler'); }
    finally { setLoading(false); }
  };

  const toggleFavorite = async () => {
    try {
      const response = await fetch(`${API_BASE}/library/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ is_favorite: !analysis.is_favorite }) });
      if (response.ok) setAnalysis({ ...analysis, is_favorite: !analysis.is_favorite });
    } catch (error) { console.error(error); }
  };

  const saveChanges = async () => {
    try {
      const response = await fetch(`${API_BASE}/library/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(editForm) });
      if (response.ok) { setAnalysis(await response.json()); setIsEditing(false); }
    } catch (error) { console.error(error); }
  };

  const handleSwitchVerwendungszweck = async (newVerwendungszweck) => {
    if (!analysis || analysis.verwendungszweck === newVerwendungszweck) return;
    setIsReanalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ property_data: analysis.property_data, verwendungszweck: newVerwendungszweck, eigenkapital: analysis.eigenkapital || 0, zinssatz: analysis.zinssatz || 3.75, tilgung: analysis.tilgung || 1.25 }),
      });
      if (response.ok) {
        const newResult = await response.json();
        setAnalysis(prev => ({ ...prev, verwendungszweck: newVerwendungszweck, analysis_result: newResult, gesamtscore: newResult.gesamtscore }));
      }
    } catch (error) { console.error(error); }
    finally { setIsReanalyzing(false); }
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_BASE}/library/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) navigate('/library');
    } catch (error) { console.error(error); }
    finally { setShowDeleteDialog(false); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatCurrency = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);

  if (loading) return (
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20">
      <div className="bg-white rounded-[16px] p-12 text-center border border-[#E8E0D4]">
        <div className="flex items-center gap-[6px] mx-auto mb-4 justify-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-[8px] h-[8px] rounded-full bg-[#B5A68C]" style={{ animation: `typingPulse 1.4s ease-in-out ${i * 0.15}s infinite`, opacity: 0.25 }} />
          ))}
        </div>
        <style>{`@keyframes typingPulse { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 0.9; } }`}</style>
        <p className="text-[#8C7E6A] text-[16px]">Lade Analyse...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20">
      <div className="bg-white rounded-[16px] p-12 text-center border border-[#E8E0D4]">
        <h3 className="text-[18px] font-semibold text-[#2C2418] mb-4">{error}</h3>
        <Link to="/library" className="inline-flex items-center gap-2 px-6 py-3 bg-[#7C8B6F] text-white font-semibold rounded-full hover:bg-[#6B7A5E] transition-all text-[14px]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Zuruck zur Library
        </Link>
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-16 lg:px-20 pt-4 md:pt-20 pb-4 space-y-4 md:space-y-6 overflow-hidden">
      <div className="max-w-[900px]">
        {/* Header */}
        <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4] fade-in">
          <div>
            <Link to="/library" className="text-[#8C7E6A] hover:text-[#5C4F3D] transition-colors text-[13px] mb-2 flex items-center gap-1">
              &larr; Bibliothek
            </Link>
            <div>
              {isEditing ? (
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Titel eingeben..."
                  className="text-[18px] md:text-[22px] font-bold text-[#2C2418] bg-transparent border-b-2 border-[#7C8B6F] focus:outline-none w-full" />
              ) : (
                <h1 className="text-[18px] md:text-[22px] font-bold text-[#2C2418]">{analysis.title || `${analysis.stadt || 'Unbekannt'} - Analyse`}</h1>
              )}
              <p className="text-[#8C7E6A] text-[12px] mt-1">Erstellt am {formatDate(analysis.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={toggleFavorite} className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-all border ${analysis.is_favorite ? 'bg-[#7C8B6F]/10 border-[#7C8B6F] text-[#7C8B6F]' : 'border-[#E8E0D4] text-[#B5A68C] hover:text-[#7C8B6F]'}`}>
                <svg className="w-5 h-5" fill={analysis.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </button>
              {isEditing ? (
                <>
                  <button onClick={saveChanges} className="px-4 py-2 bg-[#7C8B6F]/10 border border-[#7C8B6F]/30 text-[#7C8B6F] font-medium rounded-[10px] text-[13px]">Speichern</button>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-[#E8E0D4] text-[#8C7E6A] rounded-[10px] text-[13px]">Abbrechen</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="w-10 h-10 border border-[#E8E0D4] rounded-[10px] flex items-center justify-center hover:border-[#B5A68C] transition-all">
                  <svg className="w-5 h-5 text-[#8C7E6A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}
              <button onClick={() => setShowDeleteDialog(true)} className="w-10 h-10 border border-[#B85C5C]/30 bg-[#B85C5C]/[0.05] rounded-[10px] flex items-center justify-center hover:bg-[#B85C5C]/10 transition-all">
                <svg className="w-5 h-5 text-[#B85C5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>

          {/* Verwendungszweck Switch */}
          <div className="mt-6 pt-6 border-t border-[#E8E0D4]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-[#8C7E6A]">Analysieren als:</span>
              <div className="inline-flex items-center rounded-full border border-[#E8E0D4] p-1">
                <button onClick={() => handleSwitchVerwendungszweck('kapitalanlage')} disabled={isReanalyzing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[13px] font-medium ${analysis.verwendungszweck === 'kapitalanlage' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'} ${isReanalyzing ? 'opacity-50' : ''}`}>
                  Kapitalanlage
                </button>
                <button onClick={() => handleSwitchVerwendungszweck('eigennutzung')} disabled={isReanalyzing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[13px] font-medium ${analysis.verwendungszweck === 'eigennutzung' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'} ${isReanalyzing ? 'opacity-50' : ''}`}>
                  Eigennutzung
                </button>
              </div>
            </div>
            {isReanalyzing && (
              <div className="flex items-center justify-center gap-2 text-[#7C8B6F] text-[13px] mb-4">
                <div className="w-4 h-4 border-2 border-[#E8E0D4] border-t-[#7C8B6F] rounded-full animate-spin"></div>
                <span>Neu-Analyse lauft...</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-[#F5F0E8] rounded-[10px]">
              <p className="text-[12px] text-[#8C7E6A] mb-1">Kaufpreis</p>
              <p className="font-bold text-[#2C2418]">{formatCurrency(analysis.kaufpreis)}</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0E8] rounded-[10px]">
              <p className="text-[12px] text-[#8C7E6A] mb-1">Eigenkapital</p>
              <p className="font-bold text-[#2C2418]">{formatCurrency(analysis.eigenkapital)}</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0E8] rounded-[10px]">
              <p className="text-[12px] text-[#8C7E6A] mb-1">Finanzierung</p>
              <p className="font-bold text-[#5C4F3D]">{analysis.zinssatz}% / {analysis.tilgung}%</p>
            </div>
          </div>

          {/* Berater Button */}
          <div className="mt-6 pt-6 border-t border-[#E8E0D4]">
            <button
              onClick={() => navigate(`/chat?analysis_id=${id}`)}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#7C8B6F] text-white font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all text-[14px]"
            >
              <MessageSquare className="w-5 h-5" />
              Berater zu diesem Objekt
            </button>
          </div>
        </div>

        {/* Profi-Tools Section */}
        <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4] fade-in fade-in-delay-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-[#2C2418]">Profi-Tools f&uuml;r diese Analyse</h3>
            {activeTool && (
              <button onClick={() => setActiveTool(null)} className="text-[#8C7E6A] hover:text-[#5C4F3D] transition-colors text-[13px] flex items-center gap-1">
                Schlie&szlig;en
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {!activeTool && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: 'projection', name: '30-Jahre-Projektion', desc: 'Cashflow & Verm\u00f6gen \u00fcber Zeit' },
                { id: 'scenario', name: 'Szenarien-Simulator', desc: '"Was w\u00e4re wenn" Analysen' },
                { id: 'fairprice', name: 'Fairer Preis', desc: 'Marktwert & Verhandlungsziel' }
              ].map(tool => (
                <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                  className="p-4 bg-[#F5F0E8] rounded-[12px] border border-[#E8E0D4] hover:border-[#B5A68C] transition-all group text-left">
                  <h4 className="font-semibold text-[#2C2418] group-hover:text-[#7C8B6F] transition-colors text-[14px]">{tool.name}</h4>
                  <p className="text-[12px] text-[#8C7E6A] mt-1">{tool.desc}</p>
                </button>
              ))}
            </div>
          )}

          {activeTool === 'projection' && (
            <div className="border-t border-[#E8E0D4] pt-6 mt-4">
              <ProjectionCharts analysisData={{ kaufpreis: analysis.kaufpreis, kaltmiete: analysis.kaltmiete, hausgeld: analysis.hausgeld, wohnflaeche: analysis.wohnflaeche, vergleichspreisProQm: analysis.analysis_result?.kennzahlen?.preis_pro_qm || 3500 }} />
            </div>
          )}
          {activeTool === 'scenario' && (
            <div className="border-t border-[#E8E0D4] pt-6 mt-4">
              <ScenarioSimulator analysisData={{ kaufpreis: analysis.kaufpreis, kaltmiete: analysis.kaltmiete, hausgeld: analysis.hausgeld }} />
            </div>
          )}
          {activeTool === 'fairprice' && (
            <div className="border-t border-[#E8E0D4] pt-6 mt-4">
              <FairPriceCalculator analysisData={{ kaufpreis: analysis.kaufpreis, kaltmiete: analysis.kaltmiete, hausgeld: analysis.hausgeld, wohnflaeche: analysis.wohnflaeche, vergleichspreisProQm: analysis.analysis_result?.kennzahlen?.preis_pro_qm || 3500 }} />
            </div>
          )}
        </div>

        {/* Full Analysis Result */}
        {analysis.analysis_result && (
          <AnalysisResult result={analysis.analysis_result} propertyData={analysis.property_data}
            onNewAnalysis={() => navigate('/analyze')} onEditData={() => navigate('/analyze', { state: { prefill: analysis.property_data } })}
            onUpgrade={() => navigate('/pricing')} />
        )}
      </div>

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete}
        title="Analyse l\u00f6schen" message="M\u00f6chtest du diese Analyse wirklich unwiderruflich l\u00f6schen?" confirmText="L\u00f6schen" variant="danger" />
    </div>
  );
}

export default LibraryDetail;
