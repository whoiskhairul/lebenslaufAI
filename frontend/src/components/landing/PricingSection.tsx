import React from 'react';
import { Check } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import styles from './PricingSection.module.css';

export const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className={styles.pricingSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Simple, Transparent Pricing</h2>
          <p className={styles.subtitle}>
            Start for free. Upgrade when you need unlimited tailored CVs and advanced ATS analytics.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Free Tier */}
          <div className={styles.card}>
            <div>
              <h3 className={styles.tierName}>Free Plan</h3>
              <p className={styles.tierDesc}>Perfect for building your initial Master Profile and testing ATS optimization.</p>

              <div className={styles.priceBox}>
                <span className={styles.price}>$0</span>
                <span className={styles.period}>/ month</span>
              </div>

              <ul className={styles.featureList}>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Single Source Master Profile
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> 3 Tailored Resume Generations
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Basic ATS Score Calculation
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> PDF Export
                </li>
              </ul>
            </div>

            <a href="/register" onClick={(e) => navigateTo('/register', e)} className={`${styles.btn} ${styles.btnOutline}`}>
              Get Started Free
            </a>
          </div>

          {/* Pro Tier */}
          <div className={`${styles.card} ${styles.highlightCard}`}>
            <div className={styles.popularBadge}>MOST POPULAR</div>

            <div>
              <h3 className={styles.tierName}>Pro Unlimited</h3>
              <p className={styles.tierDesc}>For active job seekers who want maximum interview conversion rates.</p>

              <div className={styles.priceBox}>
                <span className={styles.price}>$19</span>
                <span className={styles.period}>/ month</span>
              </div>

              <ul className={styles.featureList}>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Unlimited Master Profiles
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Unlimited Tailored Resume Copies
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Real-Time ATS Gap Audit & Missing Skills Report
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Version History & 1-Click Snapshot Restore
                </li>
                <li className={styles.featureItem}>
                  <Check className={styles.checkIcon} /> Priority AI Processing Speed
                </li>
              </ul>
            </div>

            <a href="/register" onClick={(e) => navigateTo('/register', e)} className={`${styles.btn} ${styles.btnPrimary}`}>
              Start 14-Day Free Trial
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

