import React from 'react';

function BreakEvenCalculator({ breakeven, aktuellesEigenkapital, kaufpreis }) {
  if (!breakeven) return null;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const benoetigtesEK = breakeven.benoetigtes_eigenkapital;
  const differenz = benoetigtesEK - aktuellesEigenkapital;
  const istPositiverCashflow = benoetigtesEK <= 0;
  const istBreakEvenErreicht = aktuellesEigenkapital >= benoetigtesEK;

  // Positive cashflow without any equity — best case
  if (istPositiverCashflow) {
    return (
      <div className="bg-white rounded-[20px] border border-[#E8E0D4] p-5 md:p-8">
        <h4 className="text-[16px] md:text-[18px] font-bold text-[#2C2418] mb-4">
          Ab wann trägt sich die Immobilie selbst?
        </h4>
        <div className="flex items-center gap-3 p-4 bg-[#7C8B6F]/[0.08] border border-[#7C8B6F]/20 rounded-[14px]">
          <div className="w-10 h-10 bg-[#7C8B6F] rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#2C2418]">Sofort cashflow-neutral</p>
            <p className="text-[13px] text-[#5C4F3D]">Diese Immobilie trägt sich auch bei 100% Finanzierung selbst.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] border border-[#E8E0D4] p-5 md:p-8">
      <h4 className="text-[16px] md:text-[18px] font-bold text-[#2C2418] mb-1">
        Ab wann trägt sich die Immobilie selbst?
      </h4>
      <p className="text-[13px] text-[#8C7E6A] mb-5">
        So viel Eigenkapital brauchst du, damit Mieteinnahmen alle Kosten decken.
      </p>

      {/* Main numbers */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E8E0D4]">
          <p className="text-[11px] font-medium text-[#8C7E6A] mb-1">Dein Eigenkapital</p>
          <p className="text-[20px] font-bold text-[#2C2418]">{formatCurrency(aktuellesEigenkapital)}</p>
          <p className="text-[11px] text-[#B5A68C]">
            {((aktuellesEigenkapital / kaufpreis) * 100).toFixed(1)}% vom Kaufpreis
          </p>
        </div>
        <div className="p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E8E0D4]">
          <p className="text-[11px] font-medium text-[#8C7E6A] mb-1">Nötig für Cashflow = 0</p>
          <p className="text-[20px] font-bold text-[#2C2418]">{formatCurrency(benoetigtesEK)}</p>
          <p className="text-[11px] text-[#B5A68C]">
            {breakeven.eigenkapital_quote_prozent.toFixed(1)}% vom Kaufpreis
          </p>
        </div>
      </div>

      {/* Status */}
      {istBreakEvenErreicht ? (
        <div className="flex items-center gap-3 p-4 bg-[#7C8B6F]/[0.08] border border-[#7C8B6F]/20 rounded-[14px]">
          <div className="w-9 h-9 bg-[#7C8B6F] rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#2C2418]">Immobilie trägt sich selbst</p>
            <p className="text-[12px] text-[#5C4F3D]">
              Du hast {formatCurrency(Math.abs(differenz))} mehr als nötig.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-[#C4A35A]/[0.08] border border-[#C4A35A]/20 rounded-[14px]">
          <div className="w-9 h-9 bg-[#C4A35A] rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#2C2418]">
              Dir fehlen noch {formatCurrency(differenz)}
            </p>
            <p className="text-[12px] text-[#5C4F3D]">
              Mit diesem Betrag als Eigenkapital wäre die Immobilie selbsttragend.
            </p>
          </div>
        </div>
      )}

      {/* Hint */}
      {breakeven.hinweis && (
        <p className="text-[11px] text-[#8C7E6A] mt-4">
          {breakeven.hinweis}
        </p>
      )}
    </div>
  );
}

export default BreakEvenCalculator;
