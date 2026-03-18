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
    green: 'bg-green-100 border-green-300 text-green-700',
    blue: 'bg-blue-100 border-blue-300 text-blue-700',
    amber: 'bg-amber-100 border-amber-300 text-amber-700',
    purple: 'bg-purple-100 border-purple-300 text-purple-700'
  };

  const activeMilestones = milestoneConfig.filter(m => meilensteine[m.key] !== null);
  const futureMilestones = milestoneConfig.filter(m => meilensteine[m.key] === null);

  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate/20">
      <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
        <span className="text-2xl"></span>
        Ihre Investment-Meilensteine
      </h4>
      <p className="text-sm text-slate/60 mb-6">Wann erreichen Sie welche Ziele?</p>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate/20"></div>

        <div className="space-y-4">
          {activeMilestones.map((milestone, index) => {
            const jahr = meilensteine[milestone.key];
            return (
              <div key={milestone.key} className="relative flex items-center gap-4 pl-2">
                {/* Circle on timeline */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${colorClasses[milestone.color]}`}>
                  <span className="text-lg">{milestone.icon}</span>
                </div>

                {/* Content */}
                <div className={`flex-1 p-3 rounded-xl border ${colorClasses[milestone.color]}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{milestone.label}</span>
                    <span className="font-bold text-lg">Jahr {jahr}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Future milestones (not reached within projection) */}
          {futureMilestones.length > 0 && (
            <div className="pt-4 border-t border-dashed border-slate/30 mt-4">
              <p className="text-sm text-slate/50 mb-3 pl-14">Nicht innerhalb von 40 Jahren erreicht:</p>
              <div className="flex flex-wrap gap-2 pl-14">
                {futureMilestones.map((milestone) => (
                  <span
                    key={milestone.key}
                    className="px-3 py-1 bg-slate/10 text-slate/50 rounded-full text-xs"
                  >
                    {milestone.icon} {milestone.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="p-3 bg-green-50 rounded-xl text-center">
          <p className="text-xs text-green-600">Cashflow positiv ab</p>
          <p className="text-xl font-bold text-green-700">
            {meilensteine.erster_positiver_cashflow
              ? `Jahr ${meilensteine.erster_positiver_cashflow}`
              : 'Sofort ✓'
            }
          </p>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl text-center">
          <p className="text-xs text-blue-600">50% getilgt in</p>
          <p className="text-xl font-bold text-blue-700">
            {meilensteine.kredit_50_prozent_getilgt
              ? `Jahr ${meilensteine.kredit_50_prozent_getilgt}`
              : '40+ Jahre'
            }
          </p>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl text-center">
          <p className="text-xs text-purple-600">Schuldenfrei in</p>
          <p className="text-xl font-bold text-purple-700">
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
