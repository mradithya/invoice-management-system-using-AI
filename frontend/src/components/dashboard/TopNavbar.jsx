import React from 'react';

const TopNavbar = ({ projectTitle, userName }) => {
  return (
    <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-700/80 bg-slate-800/75 px-4 py-4 shadow-lg shadow-black/25 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 sm:text-lg">{projectTitle}</h2>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">AI-Powered Smart Financial Health Analyzer & Billing System</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-white">{userName || 'User'}</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
