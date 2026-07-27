import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, ArrowRight } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (url: string, e: React.MouseEvent) => {
    setMobileMenuOpen(false);
    navigateTo(url, e);
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <a href="/" onClick={(e) => handleNav('/', e)} className={styles.logo}>
          <div className={styles.logoIcon}>
            <Sparkles style={{ width: '20px', height: '20px' }} />
          </div>
          <span>Lebenslauf AI</span>
        </a>

        <ul className={styles.navLinks}>
          <li><a href="#features" onClick={(e) => handleNav('#features', e)}>Features</a></li>
          <li><a href="#how-it-works" onClick={(e) => handleNav('#how-it-works', e)}>How It Works</a></li>
          <li><a href="#demo" onClick={(e) => handleNav('#demo', e)}>Live Demo</a></li>
          <li><a href="#pricing" onClick={(e) => handleNav('#pricing', e)}>Pricing</a></li>
        </ul>

        <div className={styles.navActions}>
          <a href="/login" onClick={(e) => handleNav('/login', e)} className={styles.signInLink}>Sign In</a>
          <a href="/register" onClick={(e) => handleNav('/register', e)} className={styles.primaryPillBtn}>
            <span>Get Started</span>
            <ArrowRight style={{ width: '15px', height: '15px' }} />
          </a>
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <a href="#features" onClick={(e) => handleNav('#features', e)}>Features</a>
          <a href="#how-it-works" onClick={(e) => handleNav('#how-it-works', e)}>How It Works</a>
          <a href="#demo" onClick={(e) => handleNav('#demo', e)}>Live Demo</a>
          <a href="#pricing" onClick={(e) => handleNav('#pricing', e)}>Pricing</a>
          <a href="/login" onClick={(e) => handleNav('/login', e)}>Sign In</a>
          <a href="/register" className={styles.primaryPillBtn} onClick={(e) => handleNav('/register', e)}>Get Started Free</a>
        </div>
      )}
    </nav>
  );
};
