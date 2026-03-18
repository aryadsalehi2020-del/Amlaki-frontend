import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Search, BookOpen, Calculator, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ICON_MAP = { MessageSquare, Search, BookOpen, Calculator, Settings };

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const items = [
    { to: '/chat', label: 'Chat', icon: 'MessageSquare' },
    { to: '/analyze', label: 'Analyse', icon: 'Search' },
    { to: '/library', label: 'Bibliothek', icon: 'BookOpen' },
    { to: '/tools', label: 'Rechner', icon: 'Calculator' },
    { to: '/settings', label: 'Einstellungen', icon: 'Settings' },
  ];

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-10 pb-8">
        <NavLink to="/chat">
          <span className="text-[17px] font-bold tracking-tight">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4">
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
              `block px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-300 mt-6 ${
                isActive ? 'text-[#2C2418] bg-[#7C8B6F]/[0.12]' : 'text-[#B5A68C] hover:text-[#5C4F3D]'
              }`
            }>Admin</NavLink>
          )}
        </div>
      </nav>

      {/* User */}
      <div className="px-4 pb-8">
        <div className="px-3 mb-4">
          <p className="text-[13px] text-[#5C4F3D] font-medium truncate">{user?.username}</p>
          <p className="text-[11px] text-[#8C7E6A] truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full px-3 py-2 text-[13px] text-[#8C7E6A] hover:text-[#5C4F3D] transition-colors rounded-[10px] hover:bg-[#F5F0E8] text-left"
        >
          Abmelden
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between border-b border-[#E8E0D4]">
        <NavLink to="/chat">
          <span className="text-[15px] font-bold">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </span>
        </NavLink>
        <button onClick={() => setIsOpen(!isOpen)} className="text-[#8C7E6A] hover:text-[#2C2418] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 8h16M4 16h16"} />
          </svg>
        </button>
      </div>

      {isOpen && <div className="md:hidden fixed inset-0 bg-[#2C2418]/20 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />}

      <div className={`md:hidden fixed top-0 left-0 bottom-0 w-[260px] bg-[#FAF7F2] border-r border-[#E8E0D4] z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Content />
      </div>

      {/* Desktop */}
      <div className="hidden md:block w-[200px] h-screen sticky top-0 bg-[#F5F0E8] border-r border-[#E8E0D4]">
        <Content />
      </div>
    </>
  );
}

export default Sidebar;
