import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './EditorSkeleton.module.css';

export const EditorSkeleton: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Top Toolbar Skeleton */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarGroup}>
          <Skeleton variant="avatar" width={32} height={32} />
          <Skeleton variant="text" width={220} height={24} />
          <Skeleton variant="rect" width={110} height={26} style={{ borderRadius: '999px' }} />
        </div>
        
        <div className={styles.toolbarGroup}>
          <Skeleton variant="rect" width={100} height={36} />
          <Skeleton variant="rect" width={120} height={36} />
          <Skeleton variant="rect" width={140} height={36} />
        </div>
      </header>

      {/* Main Layout Skeleton */}
      <div className={styles.mainLayout}>
        {/* Left Form Panel Skeleton */}
        <aside className={styles.leftSidebar}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Skeleton variant="rect" width={120} height={36} />
            <Skeleton variant="rect" width={120} height={36} />
            <Skeleton variant="rect" width={100} height={36} />
          </div>

          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.sectionItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="avatar" width={24} height={24} />
              </div>
              <Skeleton variant="rect" width="100%" height={40} />
              <Skeleton variant="rect" width="100%" height={40} />
              <Skeleton variant="rect" width="100%" height={80} />
            </div>
          ))}
        </aside>

        {/* Right Live Preview Canvas Skeleton */}
        <main className={styles.previewCanvas}>
          <div className={styles.paper}>
            {/* Paper Header Skeleton */}
            <div className={styles.paperHeader}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <Skeleton variant="text" width={240} height={32} style={{ background: '#e2e8f0' }} />
                <Skeleton variant="text" width={160} height={18} style={{ background: '#e2e8f0' }} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                  <Skeleton variant="text" width={110} height={14} style={{ background: '#e2e8f0' }} />
                  <Skeleton variant="text" width={130} height={14} style={{ background: '#e2e8f0' }} />
                </div>
              </div>
              <Skeleton variant="rect" width={90} height={110} style={{ borderRadius: '6px', background: '#cbd5e1' }} />
            </div>

            {/* Paper Summary Skeleton */}
            <div className={styles.paperSection}>
              <Skeleton variant="text" width={140} height={20} style={{ background: '#cbd5e1' }} />
              <Skeleton variant="text" width="100%" height={14} style={{ background: '#e2e8f0' }} />
              <Skeleton variant="text" width="95%" height={14} style={{ background: '#e2e8f0' }} />
              <Skeleton variant="text" width="80%" height={14} style={{ background: '#e2e8f0' }} />
            </div>

            {/* Paper Work Experience Skeleton */}
            <div className={styles.paperSection}>
              <Skeleton variant="text" width={180} height={20} style={{ background: '#cbd5e1' }} />
              
              {[1, 2].map((idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width={200} height={16} style={{ background: '#cbd5e1' }} />
                    <Skeleton variant="text" width={100} height={14} style={{ background: '#e2e8f0' }} />
                  </div>
                  <Skeleton variant="text" width={140} height={14} style={{ background: '#e2e8f0' }} />
                  <Skeleton variant="text" width="98%" height={12} style={{ background: '#f1f5f9' }} />
                  <Skeleton variant="text" width="92%" height={12} style={{ background: '#f1f5f9' }} />
                </div>
              ))}
            </div>

            {/* Paper Skills Skeleton */}
            <div className={styles.paperSection}>
              <Skeleton variant="text" width={120} height={20} style={{ background: '#cbd5e1' }} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[70, 90, 80, 100, 65, 85].map((w, i) => (
                  <Skeleton key={i} variant="rect" width={w} height={24} style={{ borderRadius: '4px', background: '#e2e8f0' }} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
