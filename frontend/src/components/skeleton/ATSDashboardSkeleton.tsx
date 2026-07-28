import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './ATSDashboardSkeleton.module.css';

export const ATSDashboardSkeleton: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton variant="text" width={180} height={24} />
        <Skeleton variant="rect" width={100} height={32} />
      </div>

      <div className={styles.topMetrics}>
        <div className={styles.dialWrapper}>
          <Skeleton variant="avatar" width={110} height={110} />
          <Skeleton variant="text" width={90} height={16} />
        </div>

        <div className={styles.barsList}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.barRow}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton variant="text" width={130} height={16} />
                <Skeleton variant="text" width={40} height={16} />
              </div>
              <Skeleton variant="rect" width="100%" height={10} style={{ borderRadius: '999px' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        <Skeleton variant="text" width={160} height={20} />
        <Skeleton variant="rect" width="100%" height={44} style={{ borderRadius: '6px' }} />
        <Skeleton variant="rect" width="100%" height={44} style={{ borderRadius: '6px' }} />
      </div>
    </div>
  );
};
