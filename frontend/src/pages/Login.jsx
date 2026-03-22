import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); navigate('/chat'); }
    catch (err) { setError(err.message || 'Login fehlgeschlagen'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAF7F2]">
      <div className="w-full max-w-[320px]">
        {/* Logo */}
        <div className="text-center mb-12 fade-in">
          <h1 className="text-[32px] font-bold tracking-tight mb-1 cursor-pointer" onClick={() => navigate('/')}>
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </h1>
          <p className="text-[13px] text-[#8C7E6A]">Immobilien Intelligence</p>
        </div>

        {/* Form */}
        <div className="fade-in fade-in-delay-1">
          <h2 className="text-[22px] font-semibold text-[#2C2418] text-center mb-8 tracking-tight">Anmelden</h2>

          {error && (
            <div className="mb-6 px-4 py-3 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[13px]">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" autoCapitalize="none" placeholder="E-Mail"
              className="w-full px-4 py-3.5 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password" placeholder="Passwort"
              className="w-full px-4 py-3.5 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
            />
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#7C8B6F] text-white text-[15px] font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all disabled:opacity-30 active:scale-[0.98]"
            >
              {loading ? 'Laden...' : 'Fortfahren'}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link to="/forgot-password" className="text-[13px] text-[#B5A68C] hover:text-[#7C8B6F] transition-colors">
              Passwort vergessen?
            </Link>
          </p>

          <p className="mt-4 text-center text-[13px] text-[#8C7E6A]">
            Neu hier?{' '}
            <Link to="/register" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium transition-colors">
              Account erstellen
            </Link>
          </p>

          <p className="mt-3 text-center">
            <Link to="/" className="text-[12px] text-[#B5A68C] hover:text-[#7C8B6F] transition-colors">
              Zur Startseite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
