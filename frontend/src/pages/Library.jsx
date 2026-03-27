import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../constants';
import { API_BASE } from '../config';

function Library() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => { if (searchParams.get('filter') === 'favorites') setFilter('favorites'); }, [searchParams]);
  useEffect(() => { fetchAnalyses(); }, []);

  const fetchAnalyses = async () => {
    try {
      const res = await fetch(`${API_BASE}/library`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAnalyses(await res.json());
    } catch (e) { console.error(e); setFetchError(true); } finally { setLoading(false); }
  };

  const toggleFavorite = async (id, current) => {
    try {
      const res = await fetch(`${API_BASE}/library/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_favorite: !current })
      });
      if (res.ok) setAnalyses(analyses.map(a => a.id === id ? { ...a, is_favorite: !current } : a));
    } catch (e) { console.error(e); }
  };

  const deleteAnalysis = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/library/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAnalyses(analyses.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleFilter = (f) => { setFilter(f); f === 'favorites' ? setSearchParams({ filter: 'favorites' }) : setSearchParams({}); };

  const sorted = analyses
    .filter(a => {
      if (filter === 'favorites' && !a.is_favorite) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return a.title?.toLowerCase().includes(t) || a.stadt?.toLowerCase().includes(t) || a.stadtteil?.toLowerCase().includes(t);
      }
      return true;
    })
    .sort((a, b) => {
      let c = 0;
      if (sortBy === 'date') c = new Date(a.created_at) - new Date(b.created_at);
      else if (sortBy === 'score') c = (a.gesamtscore || 0) - (b.gesamtscore || 0);
      else if (sortBy === 'price') c = (a.kaufpreis || 0) - (b.kaufpreis || 0);
      return sortOrder === 'desc' ? -c : c;
    });

  return (
    <div className="px-4 md:px-16 lg:px-20 py-6 md:py-20 max-w-[900px]">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 md:mb-12 fade-in">
        <div>
          <h1 className="text-[26px] md:text-[48px] font-bold tracking-tight text-[#2C2418] leading-[1.05]">Bibliothek</h1>
          <p className="text-[#8C7E6A] text-[13px] mt-1">{analyses.length} Analysen</p>
        </div>
        <Link to="/analyze" className="px-4 md:px-5 py-2 md:py-2.5 bg-[#7C8B6F] text-white text-[13px] md:text-[14px] font-semibold rounded-full hover:bg-[#6B7A5E] transition-all active:scale-[0.98]">
          Neue Analyse
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="mb-6 md:mb-10 space-y-3 md:space-y-4 fade-in fade-in-delay-1">
        <input
          type="text" placeholder="Suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
        />
        <div className="flex items-center gap-6">
          <div className="flex gap-1 bg-[#F5F0E8] rounded-full p-0.5">
            {['all', 'favorites'].map(f => (
              <button key={f} onClick={() => handleFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  filter === f ? 'bg-white text-[#2C2418] shadow-sm' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'
                }`}>
                {f === 'all' ? 'Alle' : 'Favoriten'}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            {[{ v: 'date', l: 'Datum' }, { v: 'score', l: 'Score' }, { v: 'price', l: 'Preis' }].map(s => (
              <button key={s.v} onClick={() => { sortBy === s.v ? setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc') : (setSortBy(s.v), setSortOrder('desc')); }}
                className={`text-[13px] transition-colors ${sortBy === s.v ? 'text-[#2C2418] font-medium' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'}`}>
                {s.l}{sortBy === s.v ? (sortOrder === 'desc' ? ' \u2193' : ' \u2191') : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="bg-white border border-[#B85C5C]/20 rounded-[16px] p-8 text-center mb-6 fade-in">
          <p className="text-[#B85C5C] text-[14px] font-medium mb-1">Analysen konnten nicht geladen werden</p>
          <p className="text-[#8C7E6A] text-[13px]">Bitte versuche es erneut oder pr&uuml;fe deine Internetverbindung.</p>
          <button onClick={() => { setFetchError(false); setLoading(true); fetchAnalyses(); }} className="mt-4 px-5 py-2 bg-[#7C8B6F] text-white text-[13px] font-semibold rounded-full hover:bg-[#6B7A5E] transition-all">
            Erneut versuchen
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="flex items-center gap-[6px]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-[8px] h-[8px] rounded-full bg-[#B5A68C]" style={{ animation: `typingPulse 1.4s ease-in-out ${i * 0.15}s infinite`, opacity: 0.25 }} />
            ))}
          </div>
          <style>{`@keyframes typingPulse { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 0.9; } }`}</style>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-[#E8E0D4] rounded-[16px] p-16 text-center fade-in">
          <p className="text-[#8C7E6A] text-[14px] mb-5">
            {searchTerm ? 'Keine Ergebnisse' : filter === 'favorites' ? 'Keine Favoriten' : 'Noch keine Analysen'}
          </p>
          {!searchTerm && filter === 'all' && (
            <Link to="/analyze" className="inline-block px-6 py-3 bg-[#7C8B6F] text-white text-[14px] font-semibold rounded-full hover:bg-[#6B7A5E] transition-all">
              Erste Analyse starten
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E8E0D4] rounded-[16px] overflow-hidden fade-in fade-in-delay-2">
          {sorted.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-4 px-5 py-4 group ${i > 0 ? 'border-t border-[#E8E0D4]' : ''}`}>
              {/* Score */}
              <span className="font-mono text-[15px] text-[#7C8B6F] w-8 text-right flex-shrink-0">{Math.round(a.gesamtscore || 0)}</span>

              {/* Info */}
              <Link to={`/library/${a.id}`} className="flex-1 min-w-0">
                <p className="text-[#2C2418] text-[14px] font-medium truncate group-hover:text-[#5C4F3D] transition-colors">
                  {a.title || a.stadt || '\u2014'}
                </p>
                <p className="text-[#8C7E6A] text-[12px]">
                  {a.stadt}{a.stadtteil ? `, ${a.stadtteil}` : ''} · {formatCurrency(a.kaufpreis)} · {formatDate(a.created_at)}
                </p>
              </Link>

              {/* Type */}
              <span className="text-[#8C7E6A] text-[11px] flex-shrink-0 hidden sm:block">
                {a.verwendungszweck === 'kapitalanlage' ? 'Kapital' : 'Eigen'}
              </span>

              {/* Fav */}
              <button onClick={() => toggleFavorite(a.id, a.is_favorite)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${a.is_favorite ? 'text-[#7C8B6F]' : 'text-[#E8E0D4] hover:text-[#B5A68C]'}`}>
                <svg className="w-4 h-4" fill={a.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {/* Delete */}
              <button onClick={() => setDeleteDialog({ open: true, id: a.id, title: a.title || a.stadt || 'Analyse' })}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#E8E0D4] hover:text-[#B85C5C] transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Arrow */}
              <Link to={`/library/${a.id}`} className="text-[#E8E0D4] group-hover:text-[#B5A68C] text-[18px] transition-colors flex-shrink-0">&rsaquo;</Link>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}
        onConfirm={() => deleteAnalysis(deleteDialog.id)} title="Analyse löschen?"
        message={`"${deleteDialog.title}" wirklich löschen?`} confirmText="Löschen" cancelText="Abbrechen" variant="danger" />
    </div>
  );
}

export default Library;
