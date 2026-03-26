import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({ email: '', username: '', fullName: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowServer, setSlowServer] = useState(false);
  const slowTimer = useRef(null);
  const navigate = useNavigate();
  const { register } = useAuth();

  useEffect(() => () => clearTimeout(slowTimer.current), []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passw\u00f6rter stimmen nicht \u00fcberein'); return; }
    if (formData.password.length < 8) { setError('Passwort muss mindestens 8 Zeichen lang sein'); return; }
    if (!/[0-9]/.test(formData.password)) { setError('Passwort muss mindestens eine Zahl enthalten'); return; }
    if (formData.username.length < 3) { setError('Benutzername muss mindestens 3 Zeichen lang sein'); return; }
    setLoading(true);
    setSlowServer(false);
    slowTimer.current = setTimeout(() => setSlowServer(true), 5000);
    try { await register(formData.email, formData.username, formData.password, formData.fullName); navigate('/chat'); }
    catch (err) { setError(err.message || 'Fehler'); }
    finally { setLoading(false); setSlowServer(false); clearTimeout(slowTimer.current); }
  };

  const fields = [
    { name: 'email', type: 'email', ph: 'E-Mail', auto: 'email' },
    { name: 'username', type: 'text', ph: 'Benutzername', auto: 'username' },
    { name: 'fullName', type: 'text', ph: 'Name (optional)', auto: 'name', req: false },
    { name: 'password', type: 'password', ph: 'Passwort (min. 8 Zeichen + Zahl)', auto: 'new-password' },
    { name: 'confirmPassword', type: 'password', ph: 'Passwort best\u00e4tigen', auto: 'new-password' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#FAF7F2]">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-[32px] font-bold tracking-tight mb-1">
            <span className="font-extrabold text-[#7C8B6F]">A</span>
            <span className="text-[#2C2418]">mlak</span>
            <span className="font-extrabold text-[#7C8B6F]">I</span>
          </h1>
          <p className="text-[14px] text-[#8C7E6A] mt-2">Dein KI-Immobilienberater</p>
        </div>

        <div className="fade-in fade-in-delay-1">
          {/* Value Prop */}
          <div className="mb-6 p-4 bg-[#7C8B6F]/[0.06] border border-[#7C8B6F]/15 rounded-[14px]">
            <p className="text-[13px] font-medium text-[#2C2418] mb-2">Kostenlos starten:</p>
            <ul className="space-y-1.5">
              {['1 vollstaendige Immobilienanalyse gratis', 'Unbegrenzter KI-Chat', 'Keine Kreditkarte erforderlich'].map(item => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-[#5C4F3D]">
                  <svg className="w-3.5 h-3.5 text-[#7C8B6F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {error && <div className="mb-5 px-4 py-3 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[13px]">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(f => {
              const isPassword = f.name === 'password';
              const isConfirm = f.name === 'confirmPassword';
              const showPw = isPassword ? showPassword : isConfirm ? showConfirm : false;
              const togglePw = isPassword ? () => setShowPassword(!showPassword) : isConfirm ? () => setShowConfirm(!showConfirm) : null;

              const input = (
                <input
                  key={f.name} type={(isPassword || isConfirm) ? (showPw ? 'text' : 'password') : f.type}
                  name={f.name} value={formData[f.name]}
                  onChange={handleChange} required={f.req !== false} autoComplete={f.auto} autoCapitalize="none"
                  placeholder={f.ph}
                  className={`w-full px-4 py-3.5 ${(isPassword || isConfirm) ? 'pr-12' : ''} bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all`}
                />
              );

              if (isPassword || isConfirm) {
                return (
                  <div key={f.name} className="relative">
                    {input}
                    <button
                      type="button" onClick={togglePw} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#B5A68C] hover:text-[#7C8B6F] transition-colors"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                );
              }

              return input;
            })}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#7C8B6F] text-white text-[15px] font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all disabled:opacity-30 active:scale-[0.98]">
              {loading ? (slowServer ? 'Server startet...' : 'Laden...') : 'Kostenlos registrieren'}
            </button>
          </form>

          {slowServer && (
            <p className="mt-3 text-center text-[12px] text-[#B5A68C] animate-pulse">
              Einen Moment bitte - der Server wird gerade hochgefahren...
            </p>
          )}

          <p className="mt-6 text-center text-[13px] text-[#8C7E6A]">
            Bereits registriert?{' '}
            <Link to="/login" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium transition-colors">Anmelden</Link>
          </p>

          <p className="mt-4 text-center text-[11px] text-[#B5A68C]">
            Mit der Registrierung akzeptierst du unsere{' '}
            <Link to="/datenschutz" className="underline">Datenschutzerklaerung</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
