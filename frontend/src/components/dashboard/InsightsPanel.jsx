import React from 'react';

const InsightsPanel = ({ insights }) => {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 shadow-lg shadow-black/20">
      <h3 className="mb-4 text-base font-semibold text-white">AI Insights</h3>
      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className={[
              'rounded-xl border px-4 py-3 text-sm',
              item.type === 'good'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
            ].join(' ')}
          >
            {item.message}
          </div>
        ))}
      </div>
    </section>
  );
};

export default InsightsPanel;
