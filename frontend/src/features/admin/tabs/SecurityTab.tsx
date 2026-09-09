import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { EmptyState, ListSkeleton, PaginationBar, Select, Td, Th } from '../components/AdminUi';
import { EVENT_ICONS, fmtDateTime } from '../constants';
import { usePaginatedFetch } from '../hooks/usePaginatedFetch';
import styles from '../AdminPanel.module.css';
import { AuditLog, SessionRow } from '../types';

export const SecurityTab: React.FC = () => {
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
