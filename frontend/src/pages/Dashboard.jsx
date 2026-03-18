import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile, INVESTMENT_GOALS } from '../contexts/UserProfileContext';
import { formatCurrency, formatDate, getScoreColor } from '../constants';
import { API_BASE } from '../config';

function Dashboard() {
  const { user, token } = useAuth();
  const { profile: investorProfile, isProfileComplete: isInvestorProfileComplete } = useUserProfile();
  const [stats, setStats] = useState({ totalAnalyses: 0, favorites: 0, recentAnalyses: [], bestAnalysis: null });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/library`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const a = await res.json();
        setStats({
          totalAnalyses: a.length, favorites: a.filter(x => x.is_favorite).length,
          recentAnalyses: a.slice(0, 5),
          bestAnalysis: a.length ? a.reduce((p, c) => (c.gesamtscore || 0) > (p.gesamtscore || 0) ? c : p) : null
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20 max-w-[900px]">
      {/* Hero */}
      <div className="mb-16 fade-in">
        <p className="text-[#8C7E6A] text-[13px] font-medium mb-3">{greeting}</p>
        <h1 className="text-[40px] md:text-[52px] font-bold tracking-tight leading-[1.05] text-[#2C2418]">
          {user?.full_name || user?.username}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 mb-20 fade-in fade-in-delay-1">
        <Link to="/library" className="group py-6 pr-8">
          <p className="font-mono text-[36px] md:text-[44px] font-extralight text-[#2C2418] tracking-tight">{stats.totalAnalyses}</p>
          <p className="text-[#8C7E6A] text-[13px] mt-2 group-hover:text-[#5C4F3D] transition-colors">Analysen</p>
        </Link>
        <Link to="/library?filter=favorites" className="group py-6 px-8 border-l border-[#E8E0D4]">
          <p className="font-mono text-[36px] md:text-[44px] font-extralight text-[#2C2418] tracking-tight">{stats.favorites}</p>
          <p className="text-[#8C7E6A] text-[13px] mt-2 group-hover:text-[#5C4F3D] transition-colors">Favoriten</p>
        </Link>
        <Link to="/analyze" className="group py-6 pl-8 border-l border-[#E8E0D4]">
          <p className="text-[36px] md:text-[44px] font-extralight text-[#B5A68C] group-hover:text-[#7C8B6F] transition-colors tracking-tight">+</p>
          <p className="text-[#8C7E6A] text-[13px] mt-2 group-hover:text-[#5C4F3D] transition-colors">Neue Analyse</p>
        </Link>
      </div>

      {/* Profile CTA */}
      {!isInvestorProfileComplete && (
        <Link to="/profile" className="block mb-16 group fade-in fade-in-delay-2">
          <div className="bg-white border border-[#E8E0D4] rounded-[16px] p-6 hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#2C2418] text-[15px] font-medium mb-1">Investoren-Profil einrichten</p>
                <p className="text-[#8C7E6A] text-[13px]">Personalisierte Bewertungen erhalten</p>
              </div>
              <span className="text-[#B5A68C] group-hover:text-[#7C8B6F] text-[20px] transition-colors">&rsaquo;</span>
            </div>
          </div>
        </Link>
      )}

      {isInvestorProfileComplete && (
        <div className="mb-16 flex items-center gap-3 fade-in fade-in-delay-2">
          <span className="text-[13px] text-[#5C4F3D] bg-[#F5F0E8] border border-[#E8E0D4] px-3 py-1.5 rounded-full">{INVESTMENT_GOALS[investorProfile.goal]?.label}</span>
          <Link to="/profile" className="text-[#8C7E6A] hover:text-[#7C8B6F] text-[12px] transition-colors">Aendern</Link>
        </div>
      )}

      {/* Best */}
      {stats.bestAnalysis && stats.bestAnalysis.gesamtscore >= 60 && (
        <Link to={`/library/${stats.bestAnalysis.id}`} className="block mb-16 group fade-in fade-in-delay-2">
          <div className="bg-white border border-[#E8E0D4] rounded-[16px] p-6 hover:shadow-card-hover transition-all">
            <p className="text-[#8C7E6A] text-[11px] tracking-[0.1em] uppercase font-medium mb-4">Beste Analyse</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="font-mono text-[32px] font-light text-[#7C8B6F]">{Math.round(stats.bestAnalysis.gesamtscore)}</span>
                <div>
                  <p className="text-[#2C2418] text-[15px] font-medium">{stats.bestAnalysis.title || stats.bestAnalysis.stadt}</p>
                  <p className="text-[#8C7E6A] text-[13px]">{formatCurrency(stats.bestAnalysis.kaufpreis)}</p>
                </div>
              </div>
              <span className="text-[#B5A68C] group-hover:text-[#7C8B6F] text-[20px] transition-colors">&rsaquo;</span>
            </div>
          </div>
        </Link>
      )}

      {/* Tools */}
      <div className="mb-16 fade-in fade-in-delay-3">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-semibold text-[#2C2418] tracking-tight">Tools</h2>
          <Link to="/tools" className="text-[#8C7E6A] hover:text-[#7C8B6F] text-[13px] transition-colors">Alle anzeigen</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['AI Berater', 'Projektion', 'Szenarien', 'Fairer Preis'].map(t => (
            <Link key={t} to="/tools" className="group bg-white border border-[#E8E0D4] rounded-[12px] p-4 hover:shadow-card-hover transition-all">
              <p className="text-[#5C4F3D] text-[14px] font-medium group-hover:text-[#7C8B6F] transition-colors">{t}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div className="fade-in fade-in-delay-3">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-semibold text-[#2C2418] tracking-tight">Zuletzt</h2>
          <Link to="/library" className="text-[#8C7E6A] hover:text-[#7C8B6F] text-[13px] transition-colors">Alle anzeigen</Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 spinner-neon rounded-full" /></div>
        ) : stats.recentAnalyses.length === 0 ? (
          <div className="bg-white border border-[#E8E0D4] rounded-[16px] p-12 text-center">
            <p className="text-[#8C7E6A] text-[14px] mb-5">Noch keine Analysen vorhanden</p>
            <Link to="/analyze" className="inline-block px-6 py-3 bg-[#7C8B6F] text-white text-[14px] font-semibold rounded-full hover:bg-[#6B7A5E] transition-all active:scale-[0.98]">
              Erste Analyse starten
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E0D4] rounded-[16px] overflow-hidden">
            {stats.recentAnalyses.map((a, i) => (
              <Link
                key={a.id}
                to={`/library/${a.id}`}
                className={`flex items-center justify-between px-5 py-4 hover:bg-[#FAF7F2] transition-all group ${
                  i > 0 ? 'border-t border-[#E8E0D4]' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-[14px] text-[#7C8B6F] w-7 text-right flex-shrink-0">{Math.round(a.gesamtscore || 0)}</span>
                  <div className="min-w-0">
                    <p className="text-[#2C2418] text-[14px] font-medium truncate group-hover:text-[#5C4F3D] transition-colors">{a.title || a.stadt || '\u2014'}</p>
                    <p className="text-[#8C7E6A] text-[12px]">{formatCurrency(a.kaufpreis)}</p>
                  </div>
                </div>
                <span className="text-[#C4B89E] group-hover:text-[#7C8B6F] text-[18px] transition-colors flex-shrink-0 ml-4">&rsaquo;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
