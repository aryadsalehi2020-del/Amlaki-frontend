import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';
import { CheckCircle2, Zap, TrendingUp, Crown } from 'lucide-react';

function Pricing() {
  const { token, user } = useAuth();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');

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
        setPurchaseError(d.detail || 'Fehler beim Erstellen der Zahlung');
        setLoading(null);
        return;
      }
      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch (err) {
      setPurchaseError('Verbindungsfehler. Bitte versuche es erneut.');
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'single',
      name: 'Basic',
      price: '9',
      period: '1 Analyse',
      pricePerUnit: '9€/Analyse',
      description: '1 vollständige Analyse',
      icon: TrendingUp,
      features: [
        'Vollständige Analyse',
        'Szenarien-Vergleich',
        'Fairer Preis',
        'Förderungen und AfA',
        'Verbesserungsvorschläge',
      ],
      cta: '1 Credit',
      disabled: false,
      highlight: false,
    },
    {
      id: 'pack5',
      name: 'Plus',
      price: '35',
      period: '5 Analysen',
      pricePerUnit: '7€/Analyse',
      description: 'Mehrere Objekte vergleichen',
      icon: Crown,
      badge: 'Beliebt',
      features: [
        'Alles aus Basic',
        '5 vollständige Analysen',
        '22% Mengenrabatt',
        'Ideal zum Vergleichen',
        'Objekte gegeneinander abwägen',
      ],
      cta: '5 Credits',
      disabled: false,
      highlight: true,
    },
    {
      id: 'pack10',
      name: 'Pro',
      price: '50',
      period: '10 Analysen',
      pricePerUnit: '5€/Analyse',
      description: 'Für aktive Immobilienkäufer',
      icon: Crown,
      features: [
        'Alles aus Plus',
        '10 vollständige Analysen',
        '40% Mengenrabatt',
        'Bester Preis pro Analyse',
        'Unbegrenzt analysieren',
      ],
      cta: '10 Credits',
      disabled: false,
      highlight: false,
    },
  ];

  const packs = [
    { id: 'single', credits: 1, price: 9, perUnit: 9, save: null },
    { id: 'pack5', credits: 5, price: 35, perUnit: 7, save: 22, popular: true },
    { id: 'pack10', credits: 10, price: 50, perUnit: 5, save: 44, best: true },
  ];

  return (
    <div className="px-4 md:px-8 lg:px-16 py-6 md:py-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-[20px] md:text-[30px] font-bold text-[#2C2418] tracking-tight mb-0.5">
          Credits kaufen
        </h1>
        {credits !== null && (
          <p className="text-[12px] text-[#7C8B6F] font-medium">
            {credits} {credits === 1 ? 'Credit' : 'Credits'} verf&uuml;gbar
          </p>
        )}
        <p className="text-[11px] text-[#8C7E6A] mt-1">1 Credit = 1 vollst&auml;ndige Immobilienanalyse</p>
      </div>

      {/* Error message */}
      {purchaseError && (
        <div className="mb-3 p-3 bg-[#B85C5C]/10 border border-[#B85C5C]/20 rounded-[12px] text-center">
          <p className="text-[#B85C5C] text-[13px]">{purchaseError}</p>
          <button onClick={() => setPurchaseError('')} className="text-[11px] text-[#8C7E6A] mt-1 hover:text-[#5C4F3D] transition-colors">Schlie&szlig;en</button>
        </div>
      )}

      {/* Credit Packs */}
      <div className="space-y-2 mb-4">
        {packs.map((pack) => (
          <button
            key={pack.id}
            onClick={() => handlePurchase(pack.id)}
            disabled={loading !== null}
            className={`w-full p-3 rounded-[12px] border-2 text-left transition-all flex items-center gap-3 relative ${
              pack.popular
                ? 'border-[#7C8B6F] bg-[#7C8B6F]/[0.04]'
                : 'border-[#E8E0D4] hover:border-[#B5A68C]'
            } ${loading === pack.id ? 'opacity-60' : 'active:scale-[0.99]'}`}
          >
            {pack.popular && (
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-[#7C8B6F] text-white text-[9px] font-semibold rounded-full uppercase tracking-wide">
                Beliebt
              </div>
            )}

            {/* Credit count circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              pack.popular ? 'bg-[#7C8B6F] text-white' : 'bg-[#F5F0E8] text-[#2C2418]'
            }`}>
              <span className="text-[16px] font-bold">{pack.credits}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#2C2418]">
                  {pack.credits} {pack.credits === 1 ? 'Credit' : 'Credits'}
                </span>
                {pack.save && (
                  <span className="text-[11px] font-medium bg-[#7C8B6F]/10 text-[#7C8B6F] px-1.5 py-0.5 rounded">
                    -{pack.save}%
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#8C7E6A]">{pack.perUnit}&euro;/Credit</span>
            </div>

            {/* Price */}
            <div className="text-right shrink-0">
              <span className="text-[18px] font-bold text-[#2C2418]">{pack.price}&euro;</span>
            </div>
          </button>
        ))}
      </div>

      {/* What's included */}
      <div className="bg-white rounded-[12px] p-3 border border-[#E8E0D4] mb-4">
        <p className="text-[10px] font-semibold text-[#8C7E6A] uppercase tracking-wider mb-2">Jede Analyse enth&auml;lt</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            'Marktwert-Berechnung',
            'Cashflow und Rendite',
            'Best/Worst Case',
            'KfW und Steuervorteile',
            'Verhandlungs-Argumente',
            'Besichtigungs-Checkliste',
            'Notar-Checkliste',
          ].map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-[11px] text-[#5C4F3D]">
              <CheckCircle2 className="w-3 h-3 text-[#7C8B6F] shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Trust footer */}
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#B5A68C]">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Stripe
          </span>
          <span>Keine Abos</span>
          <span>Sofort verf&uuml;gbar</span>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
