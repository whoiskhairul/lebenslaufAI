import React from 'react';
import { navigateTo } from '../../utils/navigation';
import styles from './Footer.module.css';

// Shared footer for the standalone auth pages. Mirrors the landing footer:
// wordmark, languages line, account links. No fabricated claims.
export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>LebenslaufAI</span>
        <span>German · English · A4</span>
        <span className={styles.links}>
          <a href="/login" onClick={(e) => navigateTo('/login', e)}>Sign in</a>
          <a href="/register" onClick={(e) => navigateTo('/register', e)}>Start</a>
        </span>
      </div>
    </footer>
  );
};
