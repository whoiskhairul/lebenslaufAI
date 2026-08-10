import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './LandingSkeleton.module.css';

export const LandingSkeleton: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Navbar Skeleton */}
      <header className={styles.navbar}>
        <div className={styles.navGroup}>
          <Skeleton variant="avatar" width={36} height={36} />
          <Skeleton variant="text" width={140} height={24} />
        </div>
        <div className={styles.navGroup}>
          <Skeleton variant="text" width={70} height={18} />
          <Skeleton variant="text" width={80} height={18} />
          <Skeleton variant="text" width={60} height={18} />
          <Skeleton variant="rect" width={110} height={38} />
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <Skeleton variant="rect" width={160} height={28} style={{ borderRadius: '999px' }} />
          <Skeleton variant="text" width="85%" height={48} />
          <Skeleton variant="text" width="65%" height={48} />
          <Skeleton variant="text" width="75%" height={20} style={{ marginTop: '0.5rem' }} />
          <Skeleton variant="text" width="55%" height={20} />

          <div className={styles.heroButtons}>
            <Skeleton variant="rect" width={160} height={46} />
            <Skeleton variant="rect" width={140} height={46} />
          </div>
        </div>

        <Skeleton variant="rect" className={styles.heroBanner} />
      </main>

      {/* Features Grid Skeleton */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Skeleton variant="text" width={220} height={32} />
          <Skeleton variant="text" width={380} height={18} />
        </div>

        <div className={styles.grid3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.featureCard}>
              <Skeleton variant="avatar" width={44} height={44} />
              <Skeleton variant="text" width="60%" height={22} />
              <Skeleton variant="text" width="100%" height={16} />
              <Skeleton variant="text" width="85%" height={16} />
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section Skeleton */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Skeleton variant="text" width={180} height={32} />
          <Skeleton variant="text" width={340} height={18} />
        </div>

        <div className={styles.pricingGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.pricingCard}>
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="text" width="60%" height={36} />
              <Skeleton variant="text" width="100%" height={16} />
              <Skeleton variant="text" width="90%" height={16} />
              <Skeleton variant="text" width="80%" height={16} />
              <Skeleton variant="rect" width="100%" height={44} style={{ marginTop: 'auto' }} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer Skeleton */}
      <footer className={styles.footer}>
        <Skeleton variant="text" width={160} height={20} />
        <Skeleton variant="text" width={280} height={16} />
      </footer>
    </div>
  );
};
