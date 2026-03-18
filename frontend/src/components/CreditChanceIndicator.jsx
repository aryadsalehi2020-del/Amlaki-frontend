import React, { useMemo } from 'react';

function CreditChanceIndicator({ profile, kaufpreis }) {
  const { chance, faktoren, tipps } = useMemo(() => {
    if (!profile || !kaufpreis) return { chance: 0, faktoren: [], tipps: [] };

    let basisChance = 50;
    const faktoren = [];
    const tipps = [];

    const eigenkapital = parseFloat(profile.eigenkapital) || 0;
    const ekQuote = (eigenkapital / kaufpreis) * 100;

    if (ekQuote >= 30) { basisChance += 20; faktoren.push({ text: 'Sehr gute EK-Quote (30%+)', effekt: +20, typ: 'positiv' }); }
    else if (ekQuote >= 20) { basisChance += 15; faktoren.push({ text: 'Gute EK-Quote (20%+)', effekt: +15, typ: 'positiv' }); }
    else if (ekQuote >= 10) { basisChance += 5; faktoren.push({ text: 'EK-Quote 10-20%', effekt: +5, typ: 'neutral' }); }
    else if (ekQuote > 0) { basisChance -= 5; faktoren.push({ text: 'Niedrige EK-Quote (<10%)', effekt: -5, typ: 'negativ' }); tipps.push({ titel: 'Eigenkapital erhohen', text: 'Mit bestehendem Vermogen konnen Sie Ihr EK aufstocken' }); }
    else { basisChance -= 15; faktoren.push({ text: 'Kein Eigenkapital', effekt: -15, typ: 'negativ' }); tipps.push({ titel: '100% Finanzierung moglich', text: 'Einige Banken finanzieren 100% bei guter Bonitat. KfW-Kredit als EK-Ersatz prufen!' }); }

    if (profile.beruf === 'beamte') { basisChance += 15; faktoren.push({ text: 'Beamtenstatus (beste Bonitat)', effekt: +15, typ: 'positiv' }); }
    else if (profile.beruf === 'angestellt') { basisChance += 10; faktoren.push({ text: 'Unbefristete Anstellung', effekt: +10, typ: 'positiv' }); }
    else if (profile.beruf === 'selbststaendig') { basisChance -= 5; faktoren.push({ text: 'Selbststandig (3 Jahre Steuerbescheide notig)', effekt: -5, typ: 'neutral' }); tipps.push({ titel: 'Selbststandigen-freundliche Banken', text: 'ING, Sparda-Banken und KfW haben keine Aufschlage!' }); }
    else if (profile.beruf === 'befristet') { basisChance -= 10; faktoren.push({ text: 'Befristete Anstellung', effekt: -10, typ: 'negativ' }); tipps.push({ titel: 'Entfristung anstreben', text: 'Nach Entfristung steigen Ihre Chancen erheblich.' }); }

    if (profile.probezeit) { basisChance -= 20; faktoren.push({ text: 'In der Probezeit', effekt: -20, typ: 'negativ' }); tipps.push({ titel: 'Nach Probezeit warten', text: 'Die meisten Banken lehnen wahrend der Probezeit ab.' }); }

    if (profile.schufa === 'sehr-gut') { basisChance += 10; faktoren.push({ text: 'Sehr guter SCHUFA-Score', effekt: +10, typ: 'positiv' }); }
    else if (profile.schufa === 'gut') { basisChance += 5; faktoren.push({ text: 'Guter SCHUFA-Score', effekt: +5, typ: 'positiv' }); }
    else if (profile.schufa === 'mittel') { basisChance -= 10; faktoren.push({ text: 'Mittlerer SCHUFA-Score', effekt: -10, typ: 'negativ' }); tipps.push({ titel: 'SCHUFA bereinigen', text: 'Nicht mehr genutzte Konten kundigen, Selbstauskunft prufen' }); }
    else if (profile.schufa === 'schlecht') { basisChance -= 25; faktoren.push({ text: 'Problematischer SCHUFA-Score', effekt: -25, typ: 'negativ' }); tipps.push({ titel: 'SCHUFA verbessern', text: 'Alte Eintrage loschen lassen. Von Essen Bank akzeptiert auch schwache SCHUFA.' }); }

    const bestehendeKredite = parseFloat(profile.bestehendeKredite) || 0;
    const einkommen = parseFloat(profile.jahreseinkommen) || 0;
    const monatlichesNetto = einkommen * 0.6 / 12;
    if (bestehendeKredite > 0 && monatlichesNetto > 0) {
      const kreditBelastung = (bestehendeKredite / monatlichesNetto) * 100;
      if (kreditBelastung > 20) { basisChance -= 15; faktoren.push({ text: 'Hohe bestehende Kreditbelastung', effekt: -15, typ: 'negativ' }); tipps.push({ titel: 'Kredite ablosen', text: 'Bestehende Kredite vor Immobilienkauf ablosen.' }); }
      else if (kreditBelastung > 10) { basisChance -= 5; faktoren.push({ text: 'Moderate bestehende Kredite', effekt: -5, typ: 'neutral' }); }
    }

    if (profile.hatDepot && profile.depotWert) { basisChance += 5; faktoren.push({ text: 'Wertpapierdepot als Sicherheit', effekt: +5, typ: 'positiv' }); }
    if (profile.hatLebensversicherung && profile.lvRueckkaufswert) { basisChance += 5; faktoren.push({ text: 'Lebensversicherung als Sicherheit', effekt: +5, typ: 'positiv' }); }
    if (profile.hatRiester && profile.riesterGuthaben) { basisChance += 3; faktoren.push({ text: 'Wohn-Riester verfugbar', effekt: +3, typ: 'positiv' }); }
    if (profile.hatBausparvertrag && profile.bausparGuthaben) { basisChance += 5; faktoren.push({ text: 'Bausparvertrag vorhanden', effekt: +5, typ: 'positiv' }); }

    const kinder = parseInt(profile.kinder) || 0;
    if (kinder > 0 && einkommen > 0) {
      const kfwGrenze = 90000 + (kinder * 10000);
      if (einkommen <= kfwGrenze) { basisChance += 10; faktoren.push({ text: `KfW-Forderung moglich (${kinder} Kind${kinder > 1 ? 'er' : ''})`, effekt: +10, typ: 'positiv' }); tipps.push({ titel: 'KfW 300 "Wohneigentum fur Familien"', text: `Sie erfullen die Voraussetzungen! Kredit bis ${170000 + (Math.min(kinder, 5) * 20000)} zu nur 1,12% Zins!` }); }
    }

    if (profile.verheiratet) { basisChance += 5; faktoren.push({ text: 'Zwei Kreditnehmer moglich', effekt: +5, typ: 'positiv' }); }

    const finalChance = Math.max(0, Math.min(100, basisChance));
    if (finalChance < 50) { tipps.push({ titel: 'Vermittler einschalten', text: 'Interhyp, Dr. Klein oder Baufi24 haben 500+ Bankpartner.' }); }

    return { chance: finalChance, faktoren, tipps };
  }, [profile, kaufpreis]);

  return (
    <div className="bg-white rounded-[16px] p-6 border border-[#E8E0D4]">
      <h3 className="text-[18px] font-semibold text-[#2C2418] mb-6">Kredit-Chancen-Analyse</h3>

      {/* Main Display */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="#E8E0D4" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="40" stroke="#7C8B6F" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${chance * 2.51} 251`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[40px] font-bold text-[#2C2418]">{chance}%</span>
            <span className="text-[#8C7E6A] text-[13px] mt-1">{chance >= 70 ? 'Sehr gut' : chance >= 50 ? 'Gut' : chance >= 30 ? 'Schwierig' : 'Kritisch'}</span>
          </div>
        </div>
      </div>

      {/* Rating Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-[12px] text-[#8C7E6A] mb-2">
          <span>Kritisch</span><span>Schwierig</span><span>Gut</span><span>Sehr gut</span>
        </div>
        <div className="h-2 bg-[#E8E0D4] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#B5A68C]/40" style={{ width: '25%' }}></div>
          <div className="h-full bg-[#B5A68C]/60" style={{ width: '25%' }}></div>
          <div className="h-full bg-[#7C8B6F]/50" style={{ width: '25%' }}></div>
          <div className="h-full bg-[#7C8B6F]" style={{ width: '25%' }}></div>
        </div>
        <div className="w-3 h-3 bg-[#2C2418] rounded-full -mt-2.5 transition-all duration-500" style={{ marginLeft: `calc(${chance}% - 6px)` }} />
      </div>

      {/* Factors */}
      <div className="space-y-2 mb-6">
        <h4 className="text-[12px] font-semibold text-[#8C7E6A] uppercase tracking-wider">Einflussfaktoren</h4>
        {faktoren.map((faktor, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-[10px]">
            <span className="text-[#5C4F3D] text-[13px]">{faktor.text}</span>
            <span className={`font-semibold text-[13px] ${faktor.typ === 'positiv' ? 'text-[#7C8B6F]' : faktor.typ === 'negativ' ? 'text-[#B85C5C]' : 'text-[#B5A68C]'}`}>
              {faktor.effekt > 0 ? '+' : ''}{faktor.effekt}%
            </span>
          </div>
        ))}
      </div>

      {/* Tips */}
      {tipps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-semibold text-[#8C7E6A] uppercase tracking-wider">
            {chance < 50 ? 'Profi-Tipps zur Verbesserung' : 'Optimierungstipps'}
          </h4>
          {tipps.map((tipp, idx) => (
            <div key={idx} className="p-4 rounded-[10px] border bg-[#F5F0E8] border-[#E8E0D4]">
              <p className="font-semibold text-[#5C4F3D] text-[14px]">{tipp.titel}</p>
              <p className="text-[#8C7E6A] text-[13px] mt-1">{tipp.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CreditChanceIndicator;
