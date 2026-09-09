import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../AdminPanel.module.css';
import { Pagination, SeriesPoint } from '../types';

export const StatCard: React.FC<{
  icon: React.ElementType; label: string; value: React.ReactNode;
  hint?: string; accent: string;
}> = ({ icon: Icon, label, value, hint, accent }) => (
  <div className="bg-card border border-cardline rounded-xl p-4 flex flex-col gap-1 animate-cardSlideIn">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</span>
      <span className={`p-2 rounded-lg ${accent}`}><Icon size={16} /></span>
    </div>
    <span className="font-header text-2xl font-bold text-foreground">{value}</span>
    {hint && <span className="text-xs text-muted">{hint}</span>}
  </div>
);

export const BarChart: React.FC<{ data: SeriesPoint[]; color: string; label: string }> = ({ data, color, label }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  const days = 30;
  const byDate = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  const points: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    points.push({ date: key, count: byDate.get(key) || 0 });
  }
  return (
    <div className="bg-card border border-cardline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-header font-semibold text-sm text-foreground">{label}</h3>
        <span className="text-xs text-muted">last 30 days</span>
      </div>
      <div className="flex items-end gap-[2px] h-28">
        {points.map((p) => (
          <div
            key={p.date}
            title={`${p.date}: ${p.count}`}
            className="flex-1 rounded-t-sm min-h-[3px] transition-all hover:opacity-80"
            style={{ height: `${Math.max(4, (p.count / max) * 100)}%`, backgroundColor: color, opacity: p.count ? 0.9 : 0.25 }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone || 'text-muted bg-mutedlight'}`}>
    {children}
  </span>
);

export const PaginationBar: React.FC<{ pagination: Pagination; onPage: (page: number) => void }> = ({ pagination, onPage }) => (
  <div className="flex items-center justify-between flex-wrap gap-2 px-1 pt-3">
    <span className="text-xs text-muted">
      {pagination.total} result{pagination.total === 1 ? '' : 's'} · page {pagination.page} of {pagination.total_pages}
    </span>
    <div className="flex gap-1">
      <button
        disabled={pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
        className={styles.pageBtn}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        disabled={pagination.page >= pagination.total_pages}
        onClick={() => onPage(pagination.page + 1)}
        className={styles.pageBtn}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
);

export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div className={styles.searchBox}>
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={styles.searchInput}
    />
  </div>
);

export const Select: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={styles.filterSelect}
  >
    {options.map(([val, lab]) => (
      <option key={val} value={val}>{lab}</option>
    ))}
  </select>
);

export const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th className={`text-left text-[11px] font-bold uppercase tracking-wider text-muted pb-2 px-3 ${className || ''}`}>{children}</th>
);

export const Td: React.FC<{ children?: React.ReactNode; className?: string; label?: string }> = ({ children, className, label }) => (
  <td
    className={`py-2.5 px-3 text-sm text-foreground ${className || ''}`}
    {...(label ? { 'data-label': label } : {})}
  >
    {children}
  </td>
);

export const ListSkeleton: React.FC<{ cols: number; rows?: number }> = ({ cols, rows = 6 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="py-2.5 px-3"><div className="h-4 rounded bg-mutedlight animate-pulse" /></td>
        ))}
      </tr>
    ))}
  </tbody>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-10 text-sm text-muted">{message}</div>
);
