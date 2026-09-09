import React from 'react';
import {
  Users as UsersIcon, FileText, Mail, ShieldCheck, Activity,
  TrendingUp, Star, AlertTriangle
} from 'lucide-react';
import { Badge, BarChart, StatCard } from '../components/AdminUi';
import { EVENT_ICONS, STATUS_COLORS, TEMPLATE_LABELS, fmtDateTime } from '../constants';
import { Metrics } from '../types';

interface OverviewTabProps {
  metrics: Metrics | null;
  loading: boolean;
  onOpenUser: (id: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ metrics, loading, onOpenUser }) => {
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
