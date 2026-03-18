import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Register() {
  const [formData, setFormData] = useState({ email: '', username: '', fullName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwoerter stimmen nicht ueberein'); return; }
    if (formData.password.length < 6) { setError('Mind. 6 Zeichen'); return; }
    setLoading(true);
    try { await register(formData.email, formData.username, formData.password, formData.fullName); navigate('/dashboard'); }
    catch (err) { setError(err.message || 'Fehler'); }
    finally { setLoading(false); }
  };

  const fields = [
    { name: 'email', type: 'email', ph: 'E-Mail', auto: 'email' },
    { name: 'username', type: 'text', ph: 'Benutzername', auto: 'username' },
    { name: 'fullName', type: 'text', ph: 'Name (optional)', auto: 'name', req: false },
    { name: 'password', type: 'password', ph: 'Passwort', auto: 'new-password' },
    { name: 'confirmPassword', type: 'password', ph: 'Passwort bestaetigen', auto: 'new-password' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#FAF7F2]">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-10 fade-in">
          <h1 className="text-[32px] font-bold tracking-tight mb-1">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </h1>
        </div>

        <div className="fade-in fade-in-delay-1">
          <h2 className="text-[22px] font-semibold text-[#2C2418] text-center mb-8 tracking-tight">Account erstellen</h2>

          {error && <div className="mb-5 px-4 py-3 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[13px]">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(f => (
              <input
                key={f.name} type={f.type} name={f.name} value={formData[f.name]}
                onChange={handleChange} required={f.req !== false} autoComplete={f.auto} autoCapitalize="none"
                placeholder={f.ph}
                className="w-full px-4 py-3.5 bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all"
              />
            ))}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#7C8B6F] text-white text-[15px] font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all disabled:opacity-30 active:scale-[0.98]">
              {loading ? 'Laden...' : 'Registrieren'}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-[#8C7E6A]">
            Bereits registriert?{' '}
            <Link to="/login" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium transition-colors">Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
