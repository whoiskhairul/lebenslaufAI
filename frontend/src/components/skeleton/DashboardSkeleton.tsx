import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './DashboardSkeleton.module.css';

export const KanbanCardSkeleton: React.FC = () => {
  return (
    <div className={styles.kanbanCard}>
      <div className={styles.cardHeader}>
        <Skeleton variant="avatar" width={38} height={38} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
      </div>

      <div className={styles.cardMeta}>
        <Skeleton variant="rect" width={75} height={22} style={{ borderRadius: '4px' }} />
        <Skeleton variant="rect" width={85} height={22} style={{ borderRadius: '4px' }} />
      </div>

      <div className={styles.cardFooter}>
        <Skeleton variant="text" width={90} height={14} />
        <Skeleton variant="rect" width={55} height={20} style={{ borderRadius: '999px' }} />
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  const columnConfigs = [
    { titleWidth: 70, count: 2 },
    { titleWidth: 80, count: 2 },
    { titleWidth: 65, count: 3 },
    { titleWidth: 85, count: 2 },
    { titleWidth: 55, count: 1 },
    { titleWidth: 70, count: 1 },
  ];

  return (
    <div className={styles.container}>
      {/* Top Bar Skeleton */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Skeleton variant="text" width={180} height={32} />
          <Skeleton variant="rect" width={220} height={38} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton variant="rect" width={130} height={38} />
          <Skeleton variant="rect" width={150} height={38} />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className={styles.statsGrid}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.statCard}>
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="40%" height={28} />
          </div>
        ))}
      </div>

      {/* Kanban Board Skeleton */}
      <div className={styles.kanbanBoard}>
        {columnConfigs.map((col, idx) => (
          <div key={idx} className={styles.kanbanColumn}>
            <div className={styles.columnHeader}>
              <Skeleton variant="text" width={col.titleWidth} height={20} />
              <Skeleton variant="avatar" width={22} height={22} />
            </div>

            {Array.from({ length: col.count }).map((_, cIdx) => (
              <KanbanCardSkeleton key={cIdx} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
