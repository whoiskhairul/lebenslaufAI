import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Play, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import styles from './HeroSection.module.css';


export const HeroSection: React.FC = () => {
  const [score, setScore] = useState(0);
  const targetScore = 94;
  const circumference = 2 * Math.PI * 74; // radius 74

  useEffect(() => {
    const timer = setTimeout(() => {
      setScore(targetScore);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <section className={styles.heroSection}>
      <div className={styles.particlesBg} />

      <div className={styles.container}>
        {/* Left Column: Asymmetric Content */}
        <div>
          <div className={styles.badge}>
            <Sparkles style={{ width: '16px', height: '16px' }} />
            <span>AI-POWERED CV & ATS MATCH PLATFORM</span>
          </div>

          <h1 className={styles.headline}>
            Get The Interview. <br />
            <span className={styles.highlightGradient}>Every Time.</span>
          </h1>

          <p className={styles.subheadline}>
            Lebenslauf AI maps your master career record directly against job postings, computes real-time ATS match scores, and generates tailored CVs proven to bypass applicant tracking systems.
          </p>

          <div className={styles.ctaGroup}>
            <a href="/register" onClick={(e) => navigateTo('/register', e)} className={styles.primaryCta}>
              <span>Get Started Free</span>
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </a>
            <a href="#how-it-works" onClick={(e) => navigateTo('#how-it-works', e)} className={styles.secondaryCta}>
              <Play style={{ width: '16px', height: '16px' }} />
              <span>See How It Works</span>
            </a>
          </div>

        </div>

        {/* Right Column: Live ATS Score Ring Demo */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetHeader}>
            <div className={styles.widgetTitle}>Live ATS Audit Match</div>
            <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 600 }}>
              PASSED
            </span>
          </div>

          <div className={styles.scoreRingContainer}>
            <svg className={styles.circleSvg} viewBox="0 0 180 180">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <circle className={styles.circleBg} cx="90" cy="90" r="74" />
              <circle
                className={styles.circleProgress}
                cx="90"
                cy="90"
                r="74"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.scoreValue}>
              <span className={styles.scoreNumber}>{score}%</span>
              <span className={styles.scoreLabel}>ATS MATCH SCORE</span>
            </div>
          </div>

          <div className={styles.metricsList}>
            <div className={styles.metricItem}>
              <span className={styles.metricName}>Keyword Match Rate</span>
              <span className={styles.metricStatus}>98% High</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricName}>Skill Taxonomy Alignment</span>
              <span className={styles.metricStatus}>100% Exact</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricName}>Formatting Compliance</span>
              <span className={styles.metricStatus}>Verified PDF</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
