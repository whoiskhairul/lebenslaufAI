import React from 'react';
import { navigateTo } from '../utils/navigation';
import { useAuthStore } from '../store/authStore';
import { Logo } from '../components/Logo';
import styles from './NotFound.module.css';

export const NotFound: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleBack = () => {
    navigateTo(isAuthenticated ? '/dashboard' : '/');
  };

  return (
    <main className={`${styles.container} ${isAuthenticated ? '' : styles.standalone}`}>
      <div className={styles.inner}>
        <Logo size={72} className={styles.logo} />

        <h1 className={styles.row}>
          <span className={styles.code}>404</span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.message}>This page could not be found.</span>
        </h1>

        <button type="button" onClick={handleBack} className={styles.backBtn}>
          {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
        </button>
      </div>
    </main>
  );
};
