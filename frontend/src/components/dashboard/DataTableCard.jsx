import React from 'react';

const DataTableCard = ({ title, columns, rows }) => {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 shadow-lg shadow-black/20">
      <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] text-left text-sm sm:min-w-full">
          <thead>
            <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={[
                  'border-b border-slate-800 text-slate-200',
                  rowIndex % 2 === 0 ? 'bg-slate-900/10' : 'bg-slate-900/40'
                ].join(' ')}
              >
                {row.values.map((value, valueIndex) => (
                  <td key={`${rowIndex}-${valueIndex}`} className="px-3 py-2.5">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DataTableCard;
