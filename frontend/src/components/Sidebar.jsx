import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Search, BookOpen, Calculator, Settings, CreditCard, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';
import ConfirmDialog from './ConfirmDialog';

const ICON_MAP = { MessageSquare, Search, BookOpen, Calculator, Settings, CreditCard };

function Sidebar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [credits, setCredits] = useState(null);

  const isOnChat = location.pathname.startsWith('/chat');

  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Fetch credits
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/payments/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setCredits(d.credits); }).catch(() => {});
  }, [token, location.pathname]);

  // Fetch conversations when on chat page
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : data.conversations || []);
      }
    } catch (err) { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (isOnChat) fetchConversations();
  }, [isOnChat, fetchConversations]);

  // Listen for conversation updates from Chat.jsx
  useEffect(() => {
    const handler = () => fetchConversations();
    window.addEventListener('conversations-updated', handler);
    return () => window.removeEventListener('conversations-updated', handler);
  }, [fetchConversations]);

  const handleDeleteConversation = async (id) => {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (location.pathname === `/chat/${id}`) {
        navigate('/chat');
      }
    } catch (err) { /* ignore */ }
  };

  const items = [
    { to: '/chat', label: 'Chat', icon: 'MessageSquare' },
    { to: '/analyze', label: 'Analyse', icon: 'Search' },
    { to: '/library', label: 'Bibliothek', icon: 'BookOpen' },
    { to: '/tools', label: 'Rechner', icon: 'Calculator' },
    { to: '/pricing', label: 'Credits', icon: 'CreditCard' },
    { to: '/settings', label: 'Einstellungen', icon: 'Settings' },
  ];

  const analysisChats = conversations.filter(c => c.analysis_id);
  const generalChats = conversations.filter(c => !c.analysis_id);

  const ConvItem = ({ conv }) => {
    const [hovering, setHovering] = useState(false);
    const isActive = location.pathname === `/chat/${conv.id}`;
    return (
      <div
        onClick={() => navigate(`/chat/${conv.id}`)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`w-full text-left px-3 py-2 rounded-[10px] transition-all duration-200 relative cursor-pointer ${
          isActive ? 'bg-[#7C8B6F]/[0.12] text-[#2C2418]' : 'text-[#5C4F3D] hover:bg-[#F5F0E8]'
        }`}
      >
        <p className="text-[12px] font-medium truncate pr-5">
          {conv.title || 'Neue Unterhaltung'}
        </p>
        {hovering && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
            className="absolute right-2 top-2 text-[#B5A68C] hover:text-[#5C4F3D] transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-10 pb-4">
        <NavLink to="/chat">
          <span className="text-[17px] font-bold tracking-tight">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="px-4">
        <div className="space-y-1">
          {items.map(item => {
            const Icon = ICON_MAP[item.icon];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-[#2C2418] bg-[#7C8B6F]/[0.12]'
                      : 'text-[#8C7E6A] hover:text-[#5C4F3D] hover:bg-[#F5F0E8]'
                  }`
                }
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </NavLink>
            );
          })}
          {user?.is_superuser && (
            <NavLink to="/admin" className={({ isActive }) =>
              `block px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-300 mt-4 ${
                isActive ? 'text-[#2C2418] bg-[#7C8B6F]/[0.12]' : 'text-[#B5A68C] hover:text-[#5C4F3D]'
              }`
            }>Admin</NavLink>
          )}
        </div>
      </nav>

      {/* Conversations (only on chat pages, desktop) */}
      {isOnChat && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 mt-4 border-t border-[#E8E0D4] pt-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] font-semibold text-[#8C7E6A] uppercase tracking-wider">Verlauf</p>
            <button
              onClick={() => navigate('/chat')}
              className="text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors"
              title="Neue Unterhaltung"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {analysisChats.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-[#B5A68C] uppercase tracking-wider px-3 mb-1">Objekte</p>
              <div className="space-y-0.5">
                {analysisChats.map(conv => <ConvItem key={conv.id} conv={conv} />)}
              </div>
            </div>
          )}

          {generalChats.length > 0 && (
            <div>
              {analysisChats.length > 0 && (
                <p className="text-[10px] font-semibold text-[#B5A68C] uppercase tracking-wider px-3 mb-1">Allgemein</p>
              )}
              <div className="space-y-0.5">
                {generalChats.map(conv => <ConvItem key={conv.id} conv={conv} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spacer when no conversations */}
      {(!isOnChat || conversations.length === 0) && <div className="flex-1" />}

      {/* User */}
      <div className="px-4 pb-8">
        <div className="px-3 mb-4">
          <p className="text-[13px] text-[#5C4F3D] font-medium truncate">{user?.username}</p>
        </div>
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="w-full px-3 py-2 text-[13px] text-[#8C7E6A] hover:text-[#5C4F3D] transition-colors rounded-[10px] hover:bg-[#F5F0E8] text-left"
        >
          Abmelden
        </button>
      </div>

      <ConfirmDialog isOpen={showLogoutDialog} onClose={() => setShowLogoutDialog(false)}
        onConfirm={() => { logout(); navigate('/login'); }} title="Abmelden?"
        message="Möchtest du dich wirklich abmelden?" confirmText="Abmelden" cancelText="Abbrechen" variant="warning" />
    </div>
  );

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-xl px-4 py-4 flex items-center border-b border-[#E8E0D4]">
        <button onClick={() => setIsOpen(!isOpen)} className="text-[#8C7E6A] hover:text-[#2C2418] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 8h16M4 16h16"} />
          </svg>
        </button>
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => navigate('/pricing')}
            className="px-3 py-1 bg-[#7C8B6F]/10 border border-[#7C8B6F]/20 rounded-full text-[12px] font-medium text-[#7C8B6F]"
          >
            {credits !== null ? `${credits} Credits` : '...'}
          </button>
        </div>
        <button onClick={() => navigate('/settings')} className="text-[#8C7E6A] hover:text-[#2C2418] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </button>
      </div>

      {isOpen && <div className="md:hidden fixed inset-0 bg-[#2C2418]/20 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />}

      <div className={`md:hidden fixed top-0 left-0 bottom-0 w-[260px] bg-[#FAF7F2] border-r border-[#E8E0D4] z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Content />
      </div>

      {/* Desktop */}
      <div className="hidden md:block w-[220px] h-screen sticky top-0 bg-[#F5F0E8] border-r border-[#E8E0D4]">
        <Content />
      </div>
    </>
  );
}

export default Sidebar;
