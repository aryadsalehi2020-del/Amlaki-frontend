import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../config';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAF7F2]">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold text-[#2C2418] mb-2">Ungueltiger Link</h2>
          <p className="text-[14px] text-[#8C7E6A] mb-4">Dieser Reset-Link ist ungueltig oder abgelaufen.</p>
          <Link to="/forgot-password" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium text-[14px]">Neuen Link anfordern</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwoerter stimmen nicht ueberein'); return; }
    if (password.length < 8) { setError('Mindestens 8 Zeichen'); return; }
    if (!/[0-9]/.test(password)) { setError('Mindestens eine Zahl erforderlich'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Fehler');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAF7F2]">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold tracking-tight mb-1">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </h1>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-[#7C8B6F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#7C8B6F]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-[20px] font-semibold text-[#2C2418] mb-2">Passwort geaendert</h2>
            <p className="text-[14px] text-[#8C7E6A] mb-6">Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
            <Link to="/login" className="px-6 py-3 bg-[#7C8B6F] text-white font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all text-[14px]">
              Zum Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-[22px] font-semibold text-[#2C2418] text-center mb-6">Neues Passwort setzen</h2>

            {error && <div className="mb-5 px-4 py-3 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[13px]">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="Neues Passwort (min. 8 Zeichen + Zahl)"
                className="w-full px-4 py-3.5 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
              />
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required placeholder="Passwort bestaetigen"
                className="w-full px-4 py-3.5 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
              />
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#7C8B6F] text-white text-[15px] font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all disabled:opacity-30">
                {loading ? 'Wird gespeichert...' : 'Passwort aendern'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
