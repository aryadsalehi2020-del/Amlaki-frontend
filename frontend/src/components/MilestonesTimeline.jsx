import React from 'react';

function MilestonesTimeline({ meilensteine }) {
  if (!meilensteine) {
    return (
      <div className="p-6 bg-slate/5 rounded-xl">
        <p className="text-slate/60">Keine Meilenstein-Daten verfügbar</p>
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

  const milestoneConfig = [
    {
      key: 'erster_positiver_cashflow',
      label: 'Erster positiver Cashflow',
      icon: '💚',
      color: 'green'
    },
    {
      key: 'kredit_25_prozent_getilgt',
      label: '25% Kredit getilgt',
      icon: '🔵',
      color: 'blue'
    },
    {
      key: 'eigenkapital_verdoppelt',
      label: 'Eigenkapital verdoppelt',
      icon: '',
      color: 'amber'
    },
    {
      key: 'vermögen_100k_erreicht',
      label: '100.000€ Vermögen',
      icon: '',
      color: 'purple'
    },
    {
      key: 'kredit_50_prozent_getilgt',
      label: '50% Kredit getilgt',
      icon: '🔵',
      color: 'blue'
    },
    {
      key: 'vermögen_250k_erreicht',
      label: '250.000€ Vermögen',
      icon: '',
      color: 'purple'
    },
    {
      key: 'kredit_75_prozent_getilgt',
      label: '75% Kredit getilgt',
      icon: '🔵',
      color: 'blue'
    },
    {
      key: 'vermögen_500k_erreicht',
      label: '500.000€ Vermögen',
      icon: '',
      color: 'amber'
    },
    {
      key: 'kredit_komplett_getilgt',
      label: 'Kredit abbezahlt!',
      icon: '',
      color: 'green'
    }
  ];

  const colorClasses = {
    green: 'bg-[#7C8B6F]/10 border-[#7C8B6F]/30 text-[#7C8B6F]',
    blue: 'bg-[#B5A68C]/10 border-[#B5A68C]/30 text-[#8C7E6A]',
    amber: 'bg-[#E8E0D4]/50 border-[#E8E0D4] text-[#5C4F3D]',
    purple: 'bg-[#FAF7F2] border-[#E8E0D4] text-[#5C4F3D]'
  };

  const activeMilestones = milestoneConfig
    .filter(m => meilensteine[m.key] !== null)
    .sort((a, b) => meilensteine[a.key] - meilensteine[b.key]);
  const futureMilestones = milestoneConfig.filter(m => meilensteine[m.key] === null);

  return (
    <div className="p-6 bg-white rounded-2xl border border-[#E8E0D4]">
      <h4 className="text-lg font-bold text-[#2C2418] mb-2">Deine Investment-Meilensteine</h4>
      <p className="text-sm text-[#8C7E6A] mb-6">Wann erreichst du welche Ziele?</p>

      <div className="space-y-3">
        {activeMilestones.map((milestone) => {
          const jahr = meilensteine[milestone.key];
          return (
            <div key={milestone.key} className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E0D4]">
              <span className="text-[14px] font-medium text-[#2C2418]">{milestone.label}</span>
              <span className="text-[16px] font-bold text-[#2C2418]">Jahr {jahr}</span>
            </div>
          );
        })}

        {futureMilestones.length > 0 && (
          <div className="pt-3 mt-2">
            <p className="text-[12px] text-[#B5A68C] mb-2">Nicht innerhalb von 40 Jahren erreicht:</p>
            <div className="flex flex-wrap gap-2">
              {futureMilestones.map((milestone) => (
                <span key={milestone.key} className="px-3 py-1 bg-[#FAF7F2] text-[#B5A68C] rounded-full text-[12px] border border-[#E8E0D4]">
                  {milestone.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="p-3 bg-[#7C8B6F]/10 rounded-xl text-center border border-[#7C8B6F]/20">
          <p className="text-xs text-[#7C8B6F]">Cashflow positiv ab</p>
          <p className="text-xl font-bold text-[#2C2418]">
            {meilensteine.erster_positiver_cashflow
              ? `Jahr ${meilensteine.erster_positiver_cashflow}`
              : 'Sofort'
            }
          </p>
        </div>
        <div className="p-3 bg-[#FAF7F2] rounded-xl text-center border border-[#E8E0D4]">
          <p className="text-xs text-[#8C7E6A]">50% getilgt in</p>
          <p className="text-xl font-bold text-[#2C2418]">
            {meilensteine.kredit_50_prozent_getilgt
              ? `Jahr ${meilensteine.kredit_50_prozent_getilgt}`
              : '40+ Jahre'
            }
          </p>
        </div>
        <div className="p-3 bg-[#FAF7F2] rounded-xl text-center border border-[#E8E0D4]">
          <p className="text-xs text-[#8C7E6A]">Schuldenfrei in</p>
          <p className="text-xl font-bold text-[#2C2418]">
            {meilensteine.kredit_komplett_getilgt
              ? `Jahr ${meilensteine.kredit_komplett_getilgt}`
              : '40+ Jahre'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default MilestonesTimeline;
