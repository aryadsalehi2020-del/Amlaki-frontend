import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';
import { CheckCircle2, Zap, TrendingUp, Crown } from 'lucide-react';

function Pricing() {
  const { token, user } = useAuth();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/credits`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
        }
      } catch (err) { /* ignore */ }
    };
    fetchCredits();
  }, [token]);

  const handlePurchase = async (packageId) => {
    setLoading(packageId);
    try {
      const res = await fetch(`${API_BASE}/payments/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ package: packageId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || 'Fehler beim Erstellen der Zahlung');
        setLoading(null);
        return;
      }
      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch (err) {
      alert('Verbindungsfehler. Bitte versuche es erneut.');
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      period: '',
      description: 'Zum Kennenlernen',
      icon: Zap,
      features: [
        'Grundlegende Immobilienanalyse',
        'Score und Bewertung',
        'Cashflow-Berechnung',
        'Unbegrenzter KI-Chat',
        'Investoren-Profil',
      ],
      cta: credits !== null && credits > 0 ? 'Aktueller Plan' : 'Aufgebraucht',
      disabled: true,
      highlight: false,
    },
    {
      id: 'single',
      name: 'Einzelanalyse',
      price: '4,99',
      period: 'einmalig',
      description: 'Eine vollstaendige Analyse',
      icon: TrendingUp,
      features: [
        'Alles aus Free',
        'Szenarien-Vergleich (Best/Worst Case)',
        'Sensitivitaetsanalyse',
        'Fairer Preis Berechnung',
        'Foerderungen und AfA',
        'Verbesserungsvorschlaege',
        'Finanzierungsoptionen',
      ],
      cta: 'Analyse kaufen',
      disabled: false,
      highlight: false,
    },
    {
      id: 'pack5',
      name: 'Starter',
      price: '19,99',
      period: '5 Analysen',
      pricePerUnit: '3,99 pro Analyse',
      description: 'Fuer ernsthafte Kaeufer',
      icon: Crown,
      badge: 'Beliebt',
      features: [
        'Alles aus Einzelanalyse',
        '5 vollstaendige Analysen',
        '20% Mengenrabatt',
        'Ideal zum Vergleichen',
        'Objekte gegeneinander abwaegen',
      ],
      cta: 'Paket kaufen',
      disabled: false,
      highlight: true,
    },
    {
      id: 'pack10',
      name: 'Investor',
      price: '29,99',
      period: '10 Analysen',
      pricePerUnit: '2,99 pro Analyse',
      description: 'Fuer Portfolio-Aufbau',
      icon: Crown,
      features: [
        'Alles aus Starter',
        '10 vollstaendige Analysen',
        '40% Mengenrabatt',
        'Bester Preis pro Analyse',
        'Fuer aktive Investoren',
      ],
      cta: 'Paket kaufen',
      disabled: false,
      highlight: false,
    },
  ];

  return (
    <div className="px-4 md:px-8 lg:px-16 py-10 md:py-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10 md:mb-14">
        <h1 className="text-[28px] md:text-[36px] font-bold text-[#2C2418] tracking-tight mb-3">
          Analyse-Credits
        </h1>
        <p className="text-[15px] text-[#8C7E6A] max-w-md mx-auto">
          Schalte die vollstaendige Immobilienanalyse frei -- mit Szenarien, Foerderungen und Verhandlungstipps.
        </p>

        {/* Current credits */}
        {credits !== null && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#7C8B6F]/10 border border-[#7C8B6F]/20 rounded-full">
            <span className="text-[14px] font-medium text-[#7C8B6F]">
              {credits} {credits === 1 ? 'Credit' : 'Credits'} verfuegbar
            </span>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`rounded-[20px] p-6 flex flex-col relative transition-shadow duration-300 ${
                plan.highlight
                  ? 'bg-white border-2 border-[#7C8B6F] shadow-lg'
                  : 'bg-white border border-[#E8E0D4]'
              }`}
              style={plan.highlight ? { boxShadow: '0 8px 30px rgba(124,139,111,0.12)' } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#7C8B6F] text-white text-[11px] font-semibold rounded-full uppercase tracking-wide">
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#7C8B6F]/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#7C8B6F]" />
                </div>
                <h3 className="text-[18px] font-bold text-[#2C2418]">{plan.name}</h3>
                <p className="text-[12px] text-[#8C7E6A] mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-1">
                <span className="text-[32px] font-bold text-[#2C2418]">{plan.price}</span>
                {plan.price !== '0' && <span className="text-[15px] font-medium text-[#2C2418]"> EUR</span>}
              </div>
              <p className="text-[13px] text-[#8C7E6A] mb-1">{plan.period}</p>
              {plan.pricePerUnit && (
                <p className="text-[12px] text-[#7C8B6F] font-medium mb-4">{plan.pricePerUnit}</p>
              )}
              {!plan.pricePerUnit && <div className="mb-4" />}

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#5C4F3D]">
                    <CheckCircle2 className="w-4 h-4 text-[#7C8B6F] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !plan.disabled && handlePurchase(plan.id)}
                disabled={plan.disabled || loading !== null}
                className={`w-full py-3 rounded-[12px] font-semibold text-[14px] transition-all duration-200 ${
                  plan.disabled
                    ? 'bg-[#F5F0E8] text-[#B5A68C] cursor-default'
                    : plan.highlight
                    ? 'bg-[#7C8B6F] text-white hover:bg-[#6B7A5E] active:scale-[0.98]'
                    : 'bg-white text-[#7C8B6F] border-2 border-[#7C8B6F] hover:bg-[#7C8B6F]/5 active:scale-[0.98]'
                } ${loading === plan.id ? 'opacity-60' : ''}`}
              >
                {loading === plan.id ? 'Weiterleitung...' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust footer */}
      <div className="mt-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 text-[12px] text-[#B5A68C]">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Sichere Zahlung via Stripe
          </span>
          <span>Keine Abos</span>
          <span>Keine versteckten Kosten</span>
          <span>Sofort verfuegbar</span>
        </div>
        <p className="text-[11px] text-[#B5A68C] mt-3">
          Zum Vergleich: Ein Immobiliengutachter kostet 500-2.000 EUR pro Bewertung.
        </p>
      </div>
    </div>
  );
}

export default Pricing;
