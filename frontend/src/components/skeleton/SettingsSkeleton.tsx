import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './SettingsSkeleton.module.css';

export const SettingsSkeleton: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton variant="text" width={220} height={32} />
        <Skeleton variant="text" width={340} height={18} />
      </div>

      <div className={styles.tabsRow}>
        <Skeleton variant="rect" width={110} height={36} />
        <Skeleton variant="rect" width={100} height={36} />
        <Skeleton variant="rect" width={130} height={36} />
        <Skeleton variant="rect" width={120} height={36} />
      </div>

      <div className={styles.card}>
        <Skeleton variant="text" width={180} height={22} />
        <Skeleton variant="text" width={280} height={14} />

        <div className={styles.fieldGroup}>
          <Skeleton variant="text" width={100} height={16} />
          <Skeleton variant="rect" width="100%" height={40} />
        </div>

        <div className={styles.fieldGroup}>
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="rect" width="100%" height={40} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Skeleton variant="rect" width={140} height={42} />
        </div>
      </div>
    </div>
  );
};
