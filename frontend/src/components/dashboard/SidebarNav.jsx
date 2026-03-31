import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const SidebarNav = ({ items, onNavigate, mobile = false }) => {
  const location = useLocation();

  return (
    <aside
      className={[
        'h-full w-72 shrink-0 border-r border-slate-800 bg-slate-900/95 px-4 py-6',
        mobile ? 'w-full border-r-0' : ''
      ].join(' ')}
    >
      <div className="mb-8 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Fintech SaaS</p>
        <h1 className="mt-2 text-lg font-bold text-white">Financial Analyzer</h1>
      </div>

      <nav className="space-y-1.5">
        {items.map((item) => {
          const active = Boolean(item.path)
            && (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));

          const navClasses = [
            'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            active
              ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          ].join(' ');

          const content = (
            <>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </>
          );

          if (typeof item.onClick === 'function') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick();
                  onNavigate?.();
                }}
                className={navClasses}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              className={navClasses}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default SidebarNav;
