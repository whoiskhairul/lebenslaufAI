import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import styles from './AdminPanel.module.css';
import { CvViewerModal } from './cv/CvViewerModal';
import { OverviewTab } from './tabs/OverviewTab';
import { UsersTab } from './tabs/UsersTab';
import { ResumesTab } from './tabs/ResumesTab';
import { ApplicationsTab } from './tabs/ApplicationsTab';
import { SecurityTab } from './tabs/SecurityTab';
import { Metrics, TabId, UserDetail } from './types';

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
