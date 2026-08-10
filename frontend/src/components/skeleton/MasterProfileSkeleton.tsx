import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './MasterProfileSkeleton.module.css';

export const MasterProfileSkeleton: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Profile Header Banner Skeleton */}
      <div className={styles.profileBanner}>
        <Skeleton variant="avatar" width={100} height={100} />

        <div className={styles.bannerInfo}>
          <Skeleton variant="text" width={260} height={32} />
          <Skeleton variant="text" width={180} height={20} />

          <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width={140} height={16} />
            <Skeleton variant="text" width={110} height={16} />
          </div>

          <div className={styles.targetRolesRow}>
            <Skeleton variant="rect" width={90} height={26} style={{ borderRadius: '999px' }} />
            <Skeleton variant="rect" width={110} height={26} style={{ borderRadius: '999px' }} />
            <Skeleton variant="rect" width={100} height={26} style={{ borderRadius: '999px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
          <Skeleton variant="text" width={140} height={14} />
          <Skeleton variant="rect" width="100%" height={10} style={{ borderRadius: '999px' }} />
        </div>
      </div>

      {/* Navigation Tabs Skeleton */}
      <div className={styles.tabsRow}>
        <Skeleton variant="rect" width={140} height={36} />
        <Skeleton variant="rect" width={120} height={36} />
        <Skeleton variant="rect" width={100} height={36} />
        <Skeleton variant="rect" width={110} height={36} />
        <Skeleton variant="rect" width={120} height={36} />
      </div>

      {/* Section 1: Work Experience Skeleton */}
      <div>
        <div className={styles.sectionHeader}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="rect" width={120} height={36} />
        </div>

        {[1, 2].map((i) => (
          <div key={i} className={styles.experienceCard}>
            <div className={styles.expHeader}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <Skeleton variant="text" width="40%" height={22} />
                <Skeleton variant="text" width="30%" height={16} />
              </div>
              <Skeleton variant="text" width={120} height={16} />
            </div>

            <div className={styles.expBullets}>
              <div className={styles.bulletItem}>
                <Skeleton variant="avatar" width={8} height={8} />
                <Skeleton variant="text" width="92%" height={16} />
              </div>
              <div className={styles.bulletItem}>
                <Skeleton variant="avatar" width={8} height={8} />
                <Skeleton variant="text" width="88%" height={16} />
              </div>
              <div className={styles.bulletItem}>
                <Skeleton variant="avatar" width={8} height={8} />
                <Skeleton variant="text" width="75%" height={16} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2: Skills Skeleton */}
      <div>
        <div className={styles.sectionHeader}>
          <Skeleton variant="text" width={140} height={24} />
          <Skeleton variant="rect" width={100} height={36} />
        </div>

        <div className={styles.skillsGrid}>
          {[80, 110, 95, 120, 85, 105, 90, 115, 75].map((w, idx) => (
            <Skeleton key={idx} variant="rect" width={w} height={32} style={{ borderRadius: '999px' }} />
          ))}
        </div>
      </div>
    </div>
  );
};
