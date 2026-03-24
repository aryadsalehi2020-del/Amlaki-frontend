import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Fehler');
      }
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAF7F2]">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-10 fade-in">
          <h1 className="text-[32px] font-bold tracking-tight mb-1">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </h1>
        </div>

        <div className="fade-in fade-in-delay-1">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-[#7C8B6F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#7C8B6F]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-[20px] font-semibold text-[#2C2418] mb-2">E-Mail gesendet</h2>
              <p className="text-[14px] text-[#8C7E6A] mb-6">
                Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Reset-Link gesendet. Pr&uuml;fe auch deinen Spam-Ordner.
              </p>
              <Link to="/login" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium text-[14px] transition-colors">
                Zur&uuml;ck zum Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-semibold text-[#2C2418] text-center mb-2">Passwort vergessen?</h2>
              <p className="text-[13px] text-[#8C7E6A] text-center mb-6">
                Gib deine E-Mail ein und wir senden dir einen Link zum Zur&uuml;cksetzen.
              </p>

              {error && <div className="mb-5 px-4 py-3 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[13px]">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="E-Mail"
                  className="w-full px-4 py-3.5 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
                />
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-[#7C8B6F] text-white text-[15px] font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all disabled:opacity-30">
                  {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-[#8C7E6A]">
                <Link to="/login" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium transition-colors">Zur&uuml;ck zum Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
