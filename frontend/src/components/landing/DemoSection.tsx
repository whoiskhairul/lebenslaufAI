import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import styles from './DemoSection.module.css';

export const DemoSection: React.FC = () => {
  return (
    <section id="demo" className={styles.demoSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Interactive Live Studio Preview</h2>
          <p className={styles.subtitle}>
            Experience real-time AI bullet tailoring alongside instant ATS keyword feedback.
          </p>
        </div>

        <div className={styles.mockWindow}>
          <div className={styles.windowBar}>
            <div className={styles.dots}>
              <span className={`${styles.dot} ${styles.dotRed}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGreen}`} />
            </div>
            <div className={styles.windowTitle}>Lebenslauf AI — Editor & ATS Studio</div>
            <div style={{ width: '40px' }} />
          </div>

          <div className={styles.splitScreen}>
            {/* Left: CV Editor Mock Paper */}
            <div className={styles.editorSide}>
              <div className={styles.docPaper}>
                <div className={styles.docName}>Alex Vance</div>
                <div className={styles.docTitle}>Senior Full-Stack Engineer</div>

                <div className={styles.docSectionHeader}>Professional Experience</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Lead Software Architect — CloudTech (2022 – Present)
                </div>
                <ul className={styles.bulletList}>
                  <li>Architected high-throughput microservices handling 4M+ daily active sessions.</li>
                  <li className={styles.highlightedBullet}>
                    ✨ <strong>Tailored:</strong> Integrated Django & React state pipelines resulting in 35% improvement in API response latency.
                  </li>
                  <li>Spearheaded CI/CD migration reducing deployment window from 45 min to 8 min.</li>
                </ul>
              </div>
            </div>

            {/* Right: ATS Audit Panel Mock */}
            <div className={styles.atsSide}>
              <div className={styles.atsCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>Target Job Match</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>94%</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                  Senior Full-Stack Engineer at TechCorp
                </div>
              </div>

              <div className={styles.atsCard}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} /> Matched Keywords (12/14)
                </div>
                <div className={styles.tagGroup}>
                  <span className={styles.tagFound}>Django</span>
                  <span className={styles.tagFound}>React.js</span>
                  <span className={styles.tagFound}>TypeScript</span>
                  <span className={styles.tagFound}>REST APIs</span>
                  <span className={styles.tagFound}>PostgreSQL</span>
                  <span className={styles.tagFound}>Microservices</span>
                </div>
              </div>

              <div className={styles.atsCard}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle style={{ width: '16px', height: '16px' }} /> Missing Skills Audit
                </div>
                <div className={styles.tagGroup}>
                  <span className={styles.tagMissing}>Docker K8s</span>
                  <span className={styles.tagMissing}>GraphQL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.ctaWrapper}>
          <a href="/register" onClick={(e) => navigateTo('/register', e)} className={styles.tryBtn}>
            <span>Try It Yourself Now</span>
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </a>
        </div>
      </div>
    </section>
  );
};

