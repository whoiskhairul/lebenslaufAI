import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users as UsersIcon, FileText, Mail, Briefcase, ShieldCheck, Search,
  ChevronLeft, ChevronRight, RefreshCw, Activity, TrendingUp, X,
  Ban, CheckCircle2, Star, Lock, LogIn, AlertTriangle, Eye
} from 'lucide-react';
import styles from './AdminPanel.module.css';
import { CvViewerModal } from './AdminCvPreview';

interface SeriesPoint { date: string; count: number }
interface TemplateCount { template: string; count: number }
interface TopUser { id: string; email: string; full_name?: string; resume_count: number }
interface RecentEvent { id: string; user_email?: string | null; event_type: string; ip_address?: string; timestamp: string }

interface Metrics {
  totals: { users: number; active_users: number; staff: number; resumes: number; cover_letters: number; applications: number; active_sessions: number };
  growth: { new_users_7d: number; new_users_30d: number; new_resumes_7d: number; new_resumes_30d: number; logins_7d: number; failed_logins_7d: number };
  engagement: { avg_ats_score: number; avg_resumes_per_user: number; verified_pct: number; locked_accounts: number };
  applications_by_status: Record<string, number>;
  templates: TemplateCount[];
  signup_series: SeriesPoint[];
  resume_series: SeriesPoint[];
  login_series: SeriesPoint[];
  top_users: TopUser[];
  recent_events: RecentEvent[];
}

interface Pagination { page: number; page_size: number; total: number; total_pages: number }

interface AdminUser {
  id: string; email: string; full_name?: string; is_active: boolean; is_staff: boolean;
  is_superuser: boolean; email_verified: boolean; two_factor_enabled: boolean;
  last_login?: string | null; last_login_ip?: string | null; date_joined: string;
  resume_count: number; cover_letter_count: number; application_count: number;
}

interface UserDetail {
  user: AdminUser & { account_locked_until?: string | null };
  stats: { resumes: number; cover_letters: number; applications: number; sessions: number };
  recent_resumes: AdminResume[];
  recent_audit_logs: RecentEvent[];
}

interface AdminResume {
  id: string; user_email: string; title: string; target_company: string;
  target_role: string; ats_score: number; template: string; created_at: string;
}

interface AdminApplication {
  id: string; user_email: string; company: string; position: string;
  status: string; location?: string; resume_count: number; created_at: string;
}

interface AuditLog extends RecentEvent { user_agent?: string; details?: Record<string, unknown> }

interface SessionRow {
  id: string; user_email: string; ip_address?: string; user_agent?: string;
  device_info?: string; created_at: string; last_activity: string;
}

type TabId = 'overview' | 'users' | 'resumes' | 'applications' | 'security';

const PAGE_SIZE = 15;

const TEMPLATE_LABELS: Record<string, string> = {
  modern_minimalist: 'Modern Minimalist',
  executive_professional: 'Executive Professional',
  creative_tech: 'Creative Tech',
  pixel_perfect_pdf: 'Pixel Perfect PDF',
  german_style_cv: 'German Style',
};

const STATUS_COLORS: Record<string, string> = {
  wishlist: 'text-muted bg-mutedlight',
  preparing: 'text-warning bg-warning/10',
  applied: 'text-primary bg-primary/10',
  interview: 'text-secondary bg-secondary/10',
  offer: 'text-success bg-success/10',
  rejected: 'text-danger bg-danger/10',
};

const EVENT_ICONS: Record<string, typeof LogIn> = {
  REGISTER: Star,
  LOGIN_SUCCESS: LogIn,
  LOGIN_FAILED: AlertTriangle,
  LOCKOUT: Lock,
  LOGOUT: LogIn,
  SOCIAL_LOGIN: LogIn,
  PASSWORD_RESET_REQ: AlertTriangle,
  PASSWORD_RESET_CONF: AlertTriangle,
  PASSWORD_CHANGE: ShieldCheck,
};

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const StatCard: React.FC<{
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

const BarChart: React.FC<{ data: SeriesPoint[]; color: string; label: string }> = ({ data, color, label }) => {
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

const Badge: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone || 'text-muted bg-mutedlight'}`}>
    {children}
  </span>
);

const PaginationBar: React.FC<{ pagination: Pagination; onPage: (page: number) => void }> = ({ pagination, onPage }) => (
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

const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
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

const Select: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
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

const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th className={`text-left text-[11px] font-bold uppercase tracking-wider text-muted pb-2 px-3 ${className || ''}`}>{children}</th>
);

const Td: React.FC<{ children?: React.ReactNode; className?: string; label?: string }> = ({ children, className, label }) => (
  <td
    className={`py-2.5 px-3 text-sm text-foreground ${className || ''}`}
    {...(label ? { 'data-label': label } : {})}
  >
    {children}
  </td>
);

export const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<TabId>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [viewCvId, setViewCvId] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    setError(null);
    try {
      const res = await api.get('/admin/metrics');
      setMetrics(res.data);
    } catch {
      setError('Failed to load admin metrics.');
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const openUserDetail = async (userId: string) => {
    setSelectedUser(null);
    setTab('users');
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUser(res.data);
    } catch {
      setSelectedUser(null);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'resumes', label: 'CVs' },
    { id: 'applications', label: 'Applications' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="min-h-full overflow-y-auto thin-scrollbar p-4 md:p-6 space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-header text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck size={22} className="text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted mt-0.5">Platform usage metrics, generated CVs and user management.</p>
        </div>
        <button
          onClick={fetchMetrics}
          className={styles.refreshBtn}
        >
          <RefreshCw size={14} className={loadingMetrics ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          metrics={metrics}
          loading={loadingMetrics}
          onOpenUser={openUserDetail}
        />
      )}
      {tab === 'users' && (
        <UsersTab
          onOpenUser={openUserDetail}
          selectedUser={selectedUser}
          onCloseUser={() => setSelectedUser(null)}
          onSelectUser={setSelectedUser}
        />
      )}
      {tab === 'resumes' && <ResumesTab onViewCv={setViewCvId} />}
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'security' && <SecurityTab />}

      <CvViewerModal resumeId={viewCvId} onClose={() => setViewCvId(null)} />
    </div>
  );
};

const OverviewTab: React.FC<{ metrics: Metrics | null; loading: boolean; onOpenUser: (id: string) => void }> = ({
  metrics, loading, onOpenUser,
}) => {
  if (loading && !metrics) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-24 bg-card border border-cardline rounded-xl animate-pulse" />
    ))}</div>;
  }
  if (!metrics) return null;

  const t = metrics.totals;
  const g = metrics.growth;
  const e = metrics.engagement;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={UsersIcon} label="Total Users" value={t.users} hint={`+${g.new_users_7d} this week · ${t.active_users} active`} accent="text-primary bg-primary/10" />
        <StatCard icon={FileText} label="CVs Generated" value={t.resumes} hint={`+${g.new_resumes_7d} this week`} accent="text-secondary bg-secondary/10" />
        <StatCard icon={Mail} label="Cover Letters" value={t.cover_letters} hint={`${t.applications} job applications tracked`} accent="text-success bg-success/10" />
        <StatCard icon={Activity} label="Active Sessions" value={t.active_sessions} hint={`${g.logins_7d} logins in 7 days`} accent="text-warning bg-warning/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="New Users (30d)" value={g.new_users_30d} hint={`${e.verified_pct}% email verified`} accent="text-primary bg-primary/10" />
        <StatCard icon={Star} label="Avg ATS Score" value={e.avg_ats_score} hint={`${e.avg_resumes_per_user} CVs per user avg.`} accent="text-secondary bg-secondary/10" />
        <StatCard icon={ShieldCheck} label="Staff Accounts" value={t.staff} hint={`${e.locked_accounts} currently locked`} accent="text-success bg-success/10" />
        <StatCard icon={AlertTriangle} label="Failed Logins (7d)" value={g.failed_logins_7d} hint="Potential brute-force activity" accent="text-danger bg-danger/10" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <BarChart data={metrics.signup_series} color="var(--primary)" label="Signups" />
        <BarChart data={metrics.resume_series} color="var(--secondary)" label="CVs Generated" />
        <BarChart data={metrics.login_series} color="var(--success)" label="Logins" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="bg-card border border-cardline rounded-xl p-4 space-y-3">
          <h3 className="font-header font-semibold text-sm text-foreground">Template Usage</h3>
          {metrics.templates.length === 0 && <p className="text-xs text-muted">No CVs yet.</p>}
          {metrics.templates.map((tpl) => {
            const pct = t.resumes ? Math.round((tpl.count * 100) / t.resumes) : 0;
            return (
              <div key={tpl.template}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">{TEMPLATE_LABELS[tpl.template] || tpl.template}</span>
                  <span className="text-muted">{tpl.count} · {pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-mutedlight overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-cardline rounded-xl p-4 space-y-2">
          <h3 className="font-header font-semibold text-sm text-foreground mb-2">Applications by Status</h3>
          {Object.keys(metrics.applications_by_status).length === 0 && <p className="text-xs text-muted">No applications yet.</p>}
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.applications_by_status).map(([statusName, count]) => (
              <div key={statusName} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${STATUS_COLORS[statusName] || 'text-muted bg-mutedlight'}`}>
                {statusName}: {count}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-cardline rounded-xl p-4">
          <h3 className="font-header font-semibold text-sm text-foreground mb-2">Most Active Users</h3>
          <ul className="divide-y divide-cardline">
            {metrics.top_users.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => onOpenUser(u.id)}
                  className="w-full flex items-center justify-between py-2 text-left group"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground truncate group-hover:text-primary">{u.full_name || u.email}</span>
                    <span className="block text-xs text-muted truncate">{u.email}</span>
                  </span>
                  <Badge tone="text-primary bg-primary/10">{u.resume_count} CVs</Badge>
                </button>
              </li>
            ))}
            {metrics.top_users.length === 0 && <li className="text-xs text-muted py-2">No data.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-card border border-cardline rounded-xl p-4">
        <h3 className="font-header font-semibold text-sm text-foreground mb-2">Recent Security Events</h3>
        <ul className="divide-y divide-cardline">
          {metrics.recent_events.map((ev) => {
            const Icon = EVENT_ICONS[ev.event_type] || Activity;
            return (
              <li key={ev.id} className="flex items-center gap-3 py-2">
                <Icon size={14} className="text-muted shrink-0" />
                <Badge tone={ev.event_type.includes('FAILED') || ev.event_type === 'LOCKOUT' ? 'text-danger bg-danger/10' : 'text-muted bg-mutedlight'}>
                  {ev.event_type.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                <span className="text-xs text-foreground truncate flex-1">{ev.user_email || 'Unknown user'}</span>
                <span className="text-xs text-muted shrink-0 hidden sm:block">{ev.ip_address}</span>
                <span className="text-xs text-muted shrink-0">{fmtDateTime(ev.timestamp)}</span>
              </li>
            );
          })}
          {metrics.recent_events.length === 0 && <li className="text-xs text-muted py-2">No events recorded.</li>}
        </ul>
      </div>
    </div>
  );
};

const usePaginatedFetch = <T,>(
  url: string,
  params: Record<string, string>,
  reloadKey?: number,
): { rows: T[]; pagination: Pagination | null; loading: boolean; error: boolean } => {
  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const qs = new URLSearchParams({ page_size: String(PAGE_SIZE), ...params }).toString();
    api.get(`${url}?${qs}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.results);
        setPagination(res.data.pagination);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [url, JSON.stringify(params), reloadKey]);

  return { rows, pagination, loading, error };
};

const ListSkeleton: React.FC<{ cols: number; rows?: number }> = ({ cols, rows = 6 }) => (
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

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-10 text-sm text-muted">{message}</div>
);

const UsersTab: React.FC<{
  onOpenUser: (id: string) => void;
  selectedUser: UserDetail | null;
  onCloseUser: () => void;
  onSelectUser: (detail: UserDetail | null) => void;
}> = ({ onOpenUser, selectedUser, onCloseUser, onSelectUser }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [flag, setFlag] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params: Record<string, string> = { page: String(page) };
  if (debouncedSearch) params.search = debouncedSearch;
  if (flag) params.flag = flag;

  useEffect(() => { setPage(1); }, [flag]);

  const { rows, pagination, loading } = usePaginatedFetch<AdminUser>('/admin/users', params, reloadKey);

  const handleToggle = async (userId: string, field: 'is_active' | 'is_staff') => {
    setActionBusy(true);
    try {
      if (selectedUser && selectedUser.user.id === userId) {
        await api.patch(`/admin/users/${userId}`, { [field]: !selectedUser.user[field] });
        const res = await api.get(`/admin/users/${userId}`);
        onSelectUser(res.data);
      }
      setReloadKey((k) => k + 1);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
        <Select
          value={flag}
          onChange={(v) => { setFlag(v); }}
          options={[
            ['', 'All users'],
            ['staff', 'Staff only'],
            ['inactive', 'Inactive'],
            ['unverified', 'Unverified'],
          ]}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={`w-full md:min-w-[760px] ${styles.responsiveTable}`}>
          <thead><tr className="border-b border-cardline">
            <Th>User</Th><Th>Status</Th><Th>Usage</Th><Th>Last Login</Th><Th>Joined</Th><Th />
          </tr></thead>
          {loading && <ListSkeleton cols={6} />}
          {!loading && rows.length === 0 && (
            <tbody><tr><Td className="!text-muted"><EmptyState message="No users found." /></Td></tr></tbody>
          )}
          {!loading && rows.length > 0 && (
            <tbody className="divide-y divide-cardline">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-mutedlight/50">
                  <Td>
                    <button onClick={() => onOpenUser(u.id)} className="text-left group">
                      <span className="block font-medium group-hover:text-primary">{u.full_name || u.email}</span>
                      <span className="block text-xs text-muted">{u.email}</span>
                    </button>
                  </Td>
                  <Td label="Status">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {u.is_active
                        ? <Badge tone="text-success bg-success/10"><CheckCircle2 size={10} /> Active</Badge>
                        : <Badge tone="text-danger bg-danger/10"><Ban size={10} /> Inactive</Badge>}
                      {(u.is_staff || u.is_superuser) && <Badge tone="text-warning bg-warning/10"><ShieldCheck size={10} /> Staff</Badge>}
                      {!u.email_verified && <Badge tone="text-muted bg-mutedlight">Unverified</Badge>}
                    </div>
                  </Td>
                  <Td label="Usage">
                    <span className="text-xs text-muted">
                      <span className="text-foreground font-semibold">{u.resume_count}</span> CVs ·{' '}
                      <span className="text-foreground font-semibold">{u.cover_letter_count}</span> letters ·{' '}
                      <span className="text-foreground font-semibold">{u.application_count}</span> apps
                    </span>
                  </Td>
                  <Td label="Last login"><span className="text-xs text-muted">{fmtDateTime(u.last_login)}</span></Td>
                  <Td label="Joined"><span className="text-xs text-muted">{fmtDate(u.date_joined)}</span></Td>
                  <Td><button onClick={() => onOpenUser(u.id)} className={styles.viewBtn}>Manage</button></Td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {pagination && <PaginationBar pagination={pagination} onPage={(p) => setPage(p)} />}
      </div>

      {selectedUser && (
        <UserDetailModal detail={selectedUser} onClose={onCloseUser} busy={actionBusy} onToggle={handleToggle} />
      )}
    </div>
  );
};

const UserDetailModal: React.FC<{
  detail: UserDetail;
  onClose: () => void;
  busy: boolean;
  onToggle: (userId: string, field: 'is_active' | 'is_staff') => void;
}> = ({ detail, onClose, busy, onToggle }) => {
  const u = detail.user;
  const s = detail.stats;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.sheet} space-y-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-header font-bold flex items-center justify-center">
              {(u.full_name || u.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-header font-bold text-lg text-foreground leading-tight">{u.full_name || u.email}</h2>
              <p className="text-xs text-muted">{u.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-mutedlight">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {u.is_active ? <Badge tone="text-success bg-success/10">Active</Badge> : <Badge tone="text-danger bg-danger/10">Disabled</Badge>}
          {u.is_staff && <Badge tone="text-warning bg-warning/10">Staff</Badge>}
          {u.is_superuser && <Badge tone="text-danger bg-danger/10">Superuser</Badge>}
          {u.two_factor_enabled && <Badge tone="text-success bg-success/10">2FA</Badge>}
          <Badge>{fmtDate(u.date_joined)}</Badge>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            ['CVs', s.resumes], ['Letters', s.cover_letters], ['Applications', s.applications], ['Sessions', s.sessions],
          ].map(([label, val]) => (
            <div key={String(label)} className="bg-background border border-cardline rounded-lg p-2 text-center">
              <p className="font-header font-bold text-lg text-foreground">{val}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Last login</span><span className="text-foreground">{fmtDateTime(u.last_login)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Last IP</span><span className="text-foreground font-mono text-xs">{u.last_login_ip || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted">Locked until</span><span className="text-foreground">{u.account_locked_until ? fmtDateTime(u.account_locked_until) : '—'}</span></div>
        </div>

        {detail.recent_resumes.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Recent CVs</h3>
            <ul className="divide-y divide-cardline">
              {detail.recent_resumes.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="truncate text-foreground">{r.title || r.target_company}</span>
                  <Badge tone={r.ats_score >= 70 ? 'text-success bg-success/10' : r.ats_score >= 40 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'}>
                    ATS {r.ats_score}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={`${styles.modalActions} pt-2 border-t border-cardline`}>
          <button
            disabled={busy}
            onClick={() => onToggle(u.id, 'is_active')}
            className={`${styles.modalActionBtn} ${u.is_active ? styles.dangerBtn : styles.successBtn}`}
          >
            {u.is_active ? <><Ban size={14} /> Deactivate</> : <><CheckCircle2 size={14} /> Activate</>}
          </button>
          <button
            disabled={busy}
            onClick={() => onToggle(u.id, 'is_staff')}
            className={`${styles.modalActionBtn} ${styles.neutralBtn}`}
          >
            <ShieldCheck size={14} /> {u.is_staff ? 'Revoke Staff' : 'Make Staff'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ResumesTab: React.FC<{ onViewCv: (id: string) => void }> = ({ onViewCv }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [template, setTemplate] = useState('');
  const [ordering, setOrdering] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params: Record<string, string> = { page: String(page) };
  if (debouncedSearch) params.search = debouncedSearch;
  if (template) params.template = template;
  if (ordering) params.ordering = ordering;

  useEffect(() => { setPage(1); }, [template, ordering]);

  const { rows, pagination, loading } = usePaginatedFetch<AdminResume>('/admin/resumes', params);

  return (
    <div className="space-y-3">
      <div className={styles.filterRow}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by title, company or owner…" />
        <Select
          value={template}
          onChange={(v) => setTemplate(v)}
          options={[['', 'All templates'], ...Object.entries(TEMPLATE_LABELS) as [string, string][]]}
        />
        <Select
          value={ordering}
          onChange={(v) => setOrdering(v)}
          options={[['', 'Newest first'], ['-ats', 'Highest ATS'], ['ats', 'Lowest ATS']]}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={`w-full md:min-w-[720px] ${styles.responsiveTable}`}>
          <thead><tr className="border-b border-cardline">
            <Th>Title</Th><Th>Owner</Th><Th>Target</Th><Th>Template</Th><Th>ATS</Th><Th>Created</Th><Th />
          </tr></thead>
          {loading && <ListSkeleton cols={7} />}
          {!loading && rows.length === 0 && (
            <tbody><tr><Td className="!text-muted"><EmptyState message="No CVs generated yet." /></Td></tr></tbody>
          )}
          {!loading && rows.length > 0 && (
            <tbody className="divide-y divide-cardline">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-mutedlight/50 cursor-pointer"
                  onClick={() => onViewCv(r.id)}
                >
                  <Td><span className="font-medium">{r.title || 'Untitled'}</span></Td>
                  <Td label="Owner"><span className="text-xs text-muted">{r.user_email}</span></Td>
                  <Td label="Target">
                    <span className="block text-xs text-foreground font-medium">{r.target_company}</span>
                    <span className="block text-xs text-muted">{r.target_role}</span>
                  </Td>
                  <Td label="Template"><Badge>{TEMPLATE_LABELS[r.template] || r.template}</Badge></Td>
                  <Td label="ATS">
                    <Badge tone={r.ats_score >= 70 ? 'text-success bg-success/10' : r.ats_score >= 40 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'}>
                      {r.ats_score}
                    </Badge>
                  </Td>
                  <Td label="Created"><span className="text-xs text-muted">{fmtDate(r.created_at)}</span></Td>
                  <Td>
                    <button
                      className={`${styles.viewBtn} inline-flex items-center gap-1`}
                      onClick={(e) => { e.stopPropagation(); onViewCv(r.id); }}
                    >
                      <Eye size={13} /> View
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {pagination && <PaginationBar pagination={pagination} onPage={(p) => setPage(p)} />}
      </div>
    </div>
  );
};

const ApplicationsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params: Record<string, string> = { page: String(page) };
  if (debouncedSearch) params.search = debouncedSearch;
  if (statusFilter) params.status = statusFilter;

  useEffect(() => { setPage(1); }, [statusFilter]);

  const { rows, pagination, loading } = usePaginatedFetch<AdminApplication>('/admin/applications', params);

  return (
    <div className="space-y-3">
      <div className={styles.filterRow}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by company, position or owner…" />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          options={[
            ['', 'All statuses'], ['wishlist', 'Wishlist'], ['preparing', 'Preparing'],
            ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected'],
          ]}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={`w-full md:min-w-[720px] ${styles.responsiveTable}`}>
          <thead><tr className="border-b border-cardline">
            <Th>Position</Th><Th>Owner</Th><Th>Status</Th><Th>Location</Th><Th>Tailored CVs</Th><Th>Updated</Th>
          </tr></thead>
          {loading && <ListSkeleton cols={6} />}
          {!loading && rows.length === 0 && (
            <tbody><tr><Td className="!text-muted"><EmptyState message="No applications found." /></Td></tr></tbody>
          )}
          {!loading && rows.length > 0 && (
            <tbody className="divide-y divide-cardline">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-mutedlight/50">
                  <Td>
                    <span className="block font-medium">{a.position}</span>
                    <span className="block text-xs text-muted">{a.company}</span>
                  </Td>
                  <Td label="Owner"><span className="text-xs text-muted">{a.user_email}</span></Td>
                  <Td label="Status"><Badge tone={STATUS_COLORS[a.status]}><span className="capitalize">{a.status}</span></Badge></Td>
                  <Td label="Location"><span className="text-xs text-muted">{a.location || '—'}</span></Td>
                  <Td label="CVs"><Badge tone="text-primary bg-primary/10">{a.resume_count}</Badge></Td>
                  <Td label="Updated"><span className="text-xs text-muted">{fmtDate(a.created_at)}</span></Td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {pagination && <PaginationBar pagination={pagination} onPage={(p) => setPage(p)} />}
      </div>
    </div>
  );
};

const SecurityTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'logs' | 'sessions'>('logs');
  const [eventType, setEventType] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);

  useEffect(() => { setLogPage(1); }, [eventType]);

  const logParams: Record<string, string> = { page: String(logPage) };
  if (eventType) logParams.event_type = eventType;

  const logs = usePaginatedFetch<AuditLog>('/admin/audit-logs', logParams);
  const sessions = usePaginatedFetch<SessionRow>('/admin/sessions', { page: String(sessionPage) });

  return (
    <div className="space-y-3">
      <div className={styles.filterRow}>
        <div className="flex bg-card border border-cardline rounded-lg overflow-hidden shrink-0">
          {(['logs', 'sessions'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSubTab(st)}
              className={`px-4 py-2 text-sm font-semibold ${subTab === st ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'}`}
            >
              {st === 'logs' ? 'Audit Logs' : 'Sessions'}
            </button>
          ))}
        </div>
        {subTab === 'logs' && (
          <Select
            value={eventType}
            onChange={(v) => setEventType(v)}
            options={[
              ['', 'All event types'],
              ['REGISTER', 'Register'], ['LOGIN_SUCCESS', 'Login success'], ['LOGIN_FAILED', 'Login failed'],
              ['LOCKOUT', 'Lockout'], ['LOGOUT', 'Logout'], ['PASSWORD_RESET_REQ', 'Password reset request'],
              ['PASSWORD_RESET_CONF', 'Password reset confirm'], ['PASSWORD_CHANGE', 'Password change'],
              ['2FA_ENABLED', '2FA enabled'], ['2FA_DISABLED', '2FA disabled'], ['SOCIAL_LOGIN', 'Social login'],
              ['SESSION_REVOKED', 'Session revoked'],
            ]}
          />
        )}
      </div>

      {subTab === 'logs' && (
        <div className={styles.tableWrap}>
          <table className={`w-full md:min-w-[680px] ${styles.responsiveTable}`}>
            <thead><tr className="border-b border-cardline">
              <Th>Event</Th><Th>User</Th><Th>IP Address</Th><Th>Details</Th><Th>Time</Th>
            </tr></thead>
            {logs.loading && <ListSkeleton cols={5} />}
            {!logs.loading && logs.rows.length === 0 && (
              <tbody><tr><Td className="!text-muted"><EmptyState message="No audit events found." /></Td></tr></tbody>
            )}
            {!logs.loading && logs.rows.length > 0 && (
              <tbody className="divide-y divide-cardline">
                {logs.rows.map((log) => {
                  const Icon = EVENT_ICONS[log.event_type] || Activity;
                  return (
                    <tr key={log.id} className="hover:bg-mutedlight/50">
                      <Td>
                        <span className="flex items-center gap-2">
                          <Icon size={13} className={log.event_type.includes('FAILED') || log.event_type === 'LOCKOUT' ? 'text-danger' : 'text-muted'} />
                          <span className="text-xs font-medium">{log.event_type.replace(/_/g, ' ').toLowerCase()}</span>
                        </span>
                      </Td>
                      <Td label="User"><span className="text-xs">{log.user_email || 'Unknown'}</span></Td>
                      <Td label="IP"><span className="text-xs font-mono text-muted break-all">{log.ip_address || '—'}</span></Td>
                      <Td label="Details">
                        <span className="text-xs text-muted block truncate max-w-[220px] md:max-w-none">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </span>
                      </Td>
                      <Td label="Time"><span className="text-xs text-muted">{fmtDateTime(log.timestamp)}</span></Td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
          {logs.pagination && <PaginationBar pagination={logs.pagination} onPage={(p) => setLogPage(p)} />}
        </div>
      )}

      {subTab === 'sessions' && (
        <div className={styles.tableWrap}>
          <table className={`w-full md:min-w-[680px] ${styles.responsiveTable}`}>
            <thead><tr className="border-b border-cardline">
              <Th>User</Th><Th>IP Address</Th><Th>Device / Agent</Th><Th>Started</Th><Th>Last Activity</Th>
            </tr></thead>
            {sessions.loading && <ListSkeleton cols={5} />}
            {!sessions.loading && sessions.rows.length === 0 && (
              <tbody><tr><Td className="!text-muted"><EmptyState message="No active sessions." /></Td></tr></tbody>
            )}
            {!sessions.loading && sessions.rows.length > 0 && (
              <tbody className="divide-y divide-cardline">
                {sessions.rows.map((sess) => (
                  <tr key={sess.id} className="hover:bg-mutedlight/50">
                    <Td><span className="text-xs">{sess.user_email}</span></Td>
                    <Td label="IP"><span className="text-xs font-mono text-muted break-all">{sess.ip_address || '—'}</span></Td>
                    <Td label="Device">
                      <span className="block text-xs text-foreground max-w-[260px] truncate md:max-w-none">{sess.device_info || sess.user_agent || 'Unknown device'}</span>
                    </Td>
                    <Td label="Started"><span className="text-xs text-muted">{fmtDateTime(sess.created_at)}</span></Td>
                    <Td label="Last activity"><span className="text-xs text-muted">{fmtDateTime(sess.last_activity)}</span></Td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {sessions.pagination && <PaginationBar pagination={sessions.pagination} onPage={(p) => setSessionPage(p)} />}
        </div>
      )}
    </div>
  );
};
