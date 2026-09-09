import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import {
  Ban, CheckCircle2, ShieldCheck, X
} from 'lucide-react';
import { Badge, EmptyState, ListSkeleton, PaginationBar, SearchInput, Select, Td, Th } from '../components/AdminUi';
import { fmtDate, fmtDateTime } from '../constants';
import { usePaginatedFetch } from '../hooks/usePaginatedFetch';
import styles from '../AdminPanel.module.css';
import { AdminUser, UserDetail } from '../types';

interface UsersTabProps {
  onOpenUser: (id: string) => void;
  selectedUser: UserDetail | null;
  onCloseUser: () => void;
  onSelectUser: (detail: UserDetail | null) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({ onOpenUser, selectedUser, onCloseUser, onSelectUser }) => {
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
