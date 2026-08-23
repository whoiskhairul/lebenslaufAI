import React from 'react';
import { ArrowRight, Github, Linkedin, Twitter, Sparkles } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Large Bottom Sign-Up Banner */}
        <div className={styles.topBanner}>
          <h2 className={styles.bannerTitle}>Start Building Your Tailored CV Today</h2>
          <p className={styles.bannerSub}>
            Join thousands of job seekers landing interviews with ATS-verified resumes.
          </p>
          <a href="/register" onClick={(e) => navigateTo('/register', e)} className={styles.bannerBtn}>
            <span>Create Free Account</span>
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </a>
        </div>

        {/* 4-Column Layout */}
        <div className={styles.footerGrid}>
          <div className={styles.brandCol}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Sparkles style={{ width: '16px', height: '16px' }} />
              </div>
              <h3 style={{ margin: 0 }}>Lebenslauf AI</h3>
            </div>
            <p className={styles.brandDesc}>
              Production-grade AI resume tailoring platform grounded in your immutable Master Profile history.
            </p>
            <div className={styles.socialIcons}>
              <a href="https://github.com" target="_blank" rel="noreferrer" className={styles.socialIcon} aria-label="GitHub">
                <Github style={{ width: '18px', height: '18px' }} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={styles.socialIcon} aria-label="LinkedIn">
                <Linkedin style={{ width: '18px', height: '18px' }} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className={styles.socialIcon} aria-label="Twitter">
                <Twitter style={{ width: '18px', height: '18px' }} />
              </a>
            </div>
          </div>

          <div>
            <div className={styles.colHeader}>Product</div>
            <ul className={styles.linkList}>
              <li><a href="#features" onClick={(e) => navigateTo('#features', e)}>Features</a></li>
              <li><a href="#how-it-works" onClick={(e) => navigateTo('#how-it-works', e)}>How It Works</a></li>
              <li><a href="#demo" onClick={(e) => navigateTo('#demo', e)}>Live Studio Demo</a></li>
              <li><a href="#pricing" onClick={(e) => navigateTo('#pricing', e)}>Pricing Plans</a></li>
            </ul>
          </div>

          <div>
            <div className={styles.colHeader}>Account & Auth</div>
            <ul className={styles.linkList}>
              <li><a href="/login" onClick={(e) => navigateTo('/login', e)}>Sign In</a></li>
              <li><a href="/register" onClick={(e) => navigateTo('/register', e)}>Sign Up Free</a></li>
              <li><a href="/security" onClick={(e) => navigateTo('/security', e)}>Account Security</a></li>
            </ul>

          </div>

          <div>
            <div className={styles.colHeader}>Legal & Privacy</div>
            <ul className={styles.linkList}>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Security Standards</a></li>
              <li><a href="#">GDPR Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div>Â© {new Date().getFullYear()} Lebenslauf AI Inc. All rights reserved.</div>
          <div>Crafted with precision for modern job seekers.</div>
        </div>
      </div>
    </footer>
  );
};
