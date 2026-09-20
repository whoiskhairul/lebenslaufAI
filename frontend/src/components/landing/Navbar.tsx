import React from 'react';
import { navigateTo } from '../../utils/navigation';
import { Logo } from '../Logo';
import styles from './Navbar.module.css';

// Shared header for the standalone auth pages. Content mirrors the landing
// header: wordmark, sign-in link, start button. No marketing links.
export const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <a href="/" onClick={(e) => navigateTo('/', e)} className={styles.logo}>
          <Logo size={20} />
          LebenslaufAI
        </a>
        <div className={styles.actions}>
          <a href="/login" onClick={(e) => navigateTo('/login', e)} className={styles.signIn}>
            Sign in
          </a>
          <a href="/register" onClick={(e) => navigateTo('/register', e)} className={styles.start}>
            Start
          </a>
        </div>
      </div>
    </nav>
  );
};
