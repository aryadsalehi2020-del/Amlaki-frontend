import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';

function Register() {
  const [formData, setFormData] = useState({ email: '', password: '', password_confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const getRedirectPath = () => {
    if (redirectTarget === 'analyze') return '/analyze';
    return '/chat';
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (formData.password.length < 8) { setError('Passwort muss mindestens 8 Zeichen lang sein'); return; }
    if (!/[0-9]/.test(formData.password)) { setError('Passwort muss mindestens eine Zahl enthalten'); return; }
    if (!/[A-Z]/.test(formData.password)) { setError('Passwort muss mindestens einen Großbuchstaben enthalten'); return; }
    if (formData.password !== formData.password_confirm) { setError('Passwörter stimmen nicht überein'); return; }
    // Auto-generate username from email prefix
    const username = formData.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 30);
    if (username.length < 3) { setError('E-Mail-Adresse ist zu kurz'); return; }
    setLoading(true);
    try { await register(formData.email, username, formData.password, ''); navigate(getRedirectPath()); }
    catch (err) { setError(err.message || 'Fehler'); }
    finally { setLoading(false); }
  };

  const fields = [
    { name: 'email', type: 'email', ph: 'E-Mail', auto: 'email' },
    { name: 'password', type: 'password', ph: 'Passwort (min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl)', auto: 'new-password' },
    { name: 'password_confirm', type: 'password', ph: 'Passwort wiederholen', auto: 'new-password' },
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
          <p className="text-[14px] text-[#8C7E6A] mt-2">Dein KI-Immobilienassistent</p>
        </div>

        <div className="fade-in fade-in-delay-1">
          {/* Value Prop */}
          <div className="mb-6 p-4 bg-[#7C8B6F]/[0.06] border border-[#7C8B6F]/15 rounded-[14px]">
            <p className="text-[13px] font-medium text-[#2C2418] mb-2">Kostenlos starten:</p>
            <ul className="space-y-1.5">
              {['1 vollständige Immobilienanalyse gratis', 'Unbegrenzter KI-Chat', 'Keine Kreditkarte erforderlich'].map(item => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-[#5C4F3D]">
                  <svg className="w-3.5 h-3.5 text-[#7C8B6F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {error && <div className="mb-5 px-4 py-3 bg-[#B85C5C]/[0.08] border border-[#B85C5C]/[0.2] rounded-[12px] text-[#B85C5C] text-[13px]">{error}</div>}

          <GoogleLoginButton
            onSuccess={async (credential) => {
              setError(''); setLoading(true);
              try { await googleLogin(credential); navigate(getRedirectPath()); }
              catch (err) { setError(err.message || 'Google Login fehlgeschlagen'); }
              finally { setLoading(false); }
            }}
            onError={(msg) => setError(msg)}
            text="signup_with"
          />

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#E8E0D4]" />
            <span className="text-[12px] text-[#B5A68C]">oder</span>
            <div className="flex-1 h-px bg-[#E8E0D4]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(f => {
              const isPassword = f.type === 'password';

              const input = (
                <input
                  key={f.name} type={isPassword ? (showPassword ? 'text' : 'password') : f.type}
                  name={f.name} value={formData[f.name]}
                  onChange={handleChange} required autoComplete={f.auto} autoCapitalize="none"
                  placeholder={f.ph}
                  className={`w-full px-4 py-3.5 ${isPassword ? 'pr-12' : ''} bg-white border border-[#E8E0D4] rounded-[12px] text-[#2C2418] text-[15px] placeholder:text-[#B5A68C] focus:outline-none focus:border-[#7C8B6F] focus:ring-4 focus:ring-[#7C8B6F]/[0.1] transition-all`}
                />
              );

              if (isPassword) {
                return (
                  <div key={f.name} className="relative">
                    {input}
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#B5A68C] hover:text-[#7C8B6F] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                );
              }

              return input;
            })}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#7C8B6F] text-white text-[15px] font-semibold rounded-[12px] hover:bg-[#6B7A5E] transition-all disabled:opacity-50 active:scale-[0.98]">
              {loading ? 'Wird erstellt...' : 'Erste Analyse starten'}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-[#8C7E6A]">
            Bereits registriert?{' '}
            <Link to="/login" className="text-[#7C8B6F] hover:text-[#6B7A5E] font-medium transition-colors">Anmelden</Link>
          </p>

          <p className="mt-4 text-center text-[11px] text-[#B5A68C]">
            Mit der Registrierung akzeptierst du unsere{' '}
            <Link to="/datenschutz" className="underline">Datenschutzerklärung</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
