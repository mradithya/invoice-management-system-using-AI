import React from 'react';

const SummaryCard = ({ title, value, trend, trendType = 'neutral', icon }) => {
  const trendColor = {
    up: 'text-emerald-400',
    down: 'text-rose-400',
    neutral: 'text-slate-400'
  }[trendType] || 'text-slate-400';

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 shadow-lg shadow-black/20 transition-all duration-300 hover:border-blue-500/60 hover:shadow-blue-500/10">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">{title}</p>
        <span className="rounded-lg bg-slate-700/80 p-2 text-slate-200">{icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className={`mt-2 text-xs font-semibold ${trendColor}`}>{trend}</p>
    </div>
  );
};

export default SummaryCard;
