import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

function InvestmentComparison({ vergleich }) {
  if (!vergleich) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Vergleichsdaten verfügbar</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasEigenkapital = vergleich.etf_nur_eigenkapital.eingesetztes_kapital > 0;

  const chartData = [
    {
      name: 'Immobilie',
      endvermoegen: vergleich.immobilie.endvermoegen,
      color: '#10b981'
    },
    ...(hasEigenkapital ? [{
      name: 'ETF (nur EK)',
      endvermoegen: vergleich.etf_nur_eigenkapital.endvermoegen,
      color: '#3b82f6'
    }] : []),
    {
      name: 'ETF (mit Sparrate)',
      endvermoegen: vergleich.etf_mit_sparrate.endvermoegen,
      color: '#8b5cf6'
    }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate/20">
          <p className="font-bold text-primary">{payload[0].payload.name}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const immoBesser = vergleich.vergleich.immobilie_besser_als_etf;

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
        <span className="text-2xl"></span>
        Investment-Vergleich: Immobilie vs. ETF
      </h4>
      <p className="text-sm text-slate/60 mb-6">Endvermögen nach 30 Jahren</p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="endvermoegen" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Comparison Result */}
      <div className={`mt-6 p-4 rounded-xl ${immoBesser ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{immoBesser ? '' : ''}</span>
          <div>
            <p className={`font-bold ${immoBesser ? 'text-green-700' : 'text-amber-700'}`}>
              {immoBesser
                ? `Immobilie schlägt ETF um ${formatCurrency(vergleich.vergleich.immobilie_vs_etf_sparrate)}`
                : `ETF wäre ${formatCurrency(Math.abs(vergleich.vergleich.immobilie_vs_etf_sparrate))} besser`
              }
            </p>
            <p className="text-sm text-slate/70">
              {immoBesser
                ? 'Die Immobilie ist die bessere Anlage bei diesen Annahmen'
                : 'Bei diesen Annahmen wäre ein ETF-Sparplan rentabler'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className={`grid ${hasEigenkapital ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mt-6`}>
        {/* Immobilie */}
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-green-700">Immobilie</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate/60">Endvermögen:</span>
              <span className="font-bold text-green-600">{formatCurrency(vergleich.immobilie.endvermoegen)}</span>
            </div>
            {vergleich.immobilie.immobilien_equity != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate/50">davon Equity Wohnung:</span>
                <span>{formatCurrency(vergleich.immobilie.immobilien_equity)}</span>
              </div>
            )}
            {vergleich.immobilie.side_etf_netto != null && vergleich.immobilie.side_etf_netto > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate/50">davon Side-ETF:</span>
                <span>{formatCurrency(vergleich.immobilie.side_etf_netto)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate/60">Eingesetztes Kapital:</span>
              <span>{formatCurrency(vergleich.immobilie.eingesetztes_kapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Zuzahlung Jahr 1:</span>
              <span>{formatCurrency(vergleich.immobilie.monatliche_zuzahlung_jahr_1 ?? vergleich.immobilie.monatliche_zuzahlung)}/Mo</span>
            </div>
            {vergleich.immobilie.cashflow_jahr_letztes_monat != null && (
              <div className="flex justify-between">
                <span className="text-slate/60">Cashflow Jahr {vergleich.cashflow_pro_jahr?.length || 30}:</span>
                <span className={vergleich.immobilie.cashflow_jahr_letztes_monat >= 0 ? 'text-green-600 font-medium' : 'text-amber-600'}>
                  {vergleich.immobilie.cashflow_jahr_letztes_monat >= 0 ? '+' : ''}{formatCurrency(vergleich.immobilie.cashflow_jahr_letztes_monat)}/Mo
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate/60">Faktor:</span>
              <span className="font-bold">{vergleich.immobilie.rendite_faktor}x</span>
            </div>
          </div>
        </div>

        {/* ETF nur EK - only show when eigenkapital > 0 */}
        {hasEigenkapital && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-blue-700">ETF (nur EK)</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate/60">Endvermögen:</span>
              <span className="font-bold text-blue-600">{formatCurrency(vergleich.etf_nur_eigenkapital.endvermoegen)}</span>
            </div>
            {vergleich.etf_nur_eigenkapital.endvermoegen_brutto != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate/50">vor Steuer:</span>
                <span>{formatCurrency(vergleich.etf_nur_eigenkapital.endvermoegen_brutto)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate/60">Investiert:</span>
              <span>{formatCurrency(vergleich.etf_nur_eigenkapital.eingesetztes_kapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Rendite p.a.:</span>
              <span>{vergleich.etf_nur_eigenkapital.angenommene_rendite}%</span>
            </div>
          </div>
        </div>
        )}

        {/* ETF mit Sparrate */}
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-purple-700">ETF + Sparrate</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate/60">Endvermögen:</span>
              <span className="font-bold text-purple-600">{formatCurrency(vergleich.etf_mit_sparrate.endvermoegen)}</span>
            </div>
            {vergleich.etf_mit_sparrate.endvermoegen_brutto != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate/50">vor Steuer:</span>
                <span>{formatCurrency(vergleich.etf_mit_sparrate.endvermoegen_brutto)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate/60">Sparrate Jahr 1:</span>
              <span>{formatCurrency(vergleich.etf_mit_sparrate.monatliche_sparrate_jahr_1 ?? vergleich.etf_mit_sparrate.monatliche_sparrate)}/Mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate/60">Gesamt investiert:</span>
              <span>{formatCurrency(vergleich.etf_mit_sparrate.gesamtinvestition)}</span>
            </div>
          </div>
        </div>
      </div>

      {vergleich.annahmen && (
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700 mb-1">Annahmen für diesen Vergleich</p>
          <p>Wertsteigerung Immobilie: {vergleich.annahmen.wertsteigerung_pa}% p.a. · Mietsteigerung: {vergleich.annahmen.mietsteigerung_pa}% p.a. · ETF brutto: {vergleich.annahmen.etf_rendite_pa}% p.a.</p>
          <p>Steuer Immobilie: AfA {(vergleich.annahmen.afa_satz * 100).toFixed(0)}% + Zinsabzug bei {(vergleich.annahmen.grenzsteuersatz * 100).toFixed(0)}% Grenzsteuersatz. Verkauf nach 10+ Jahren steuerfrei.</p>
          <p>Steuer ETF: KESt + Soli abzgl. 30% Teilfreistellung Aktienfonds = {(vergleich.annahmen.etf_steuer_auf_gewinn * 100).toFixed(2)}% effektiv auf Gewinn.</p>
          <p>Beide Szenarien committen denselben Cash-Stream. Positive Cashflows der Immobilie fließen in einen Side-ETF (gleiche 7% Rendite).</p>
        </div>
      )}

      <p className="text-xs text-slate/50 mt-3 text-center">
        Modellrechnung mit historischen Durchschnittsannahmen. Tatsächliche Ergebnisse können erheblich abweichen.
      </p>
    </div>
  );
}

export default InvestmentComparison;
