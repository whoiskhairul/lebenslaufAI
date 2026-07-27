import React from 'react';
import { UserCheck, FileText, CheckCircle } from 'lucide-react';
import styles from './HowItWorksSection.module.css';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: 1,
      icon: <UserCheck style={{ width: '28px', height: '28px' }} />,
      title: 'Upload Your Master Profile',
      desc: 'Import your complete career history, achievements, and technical credentials into one central source of truth.',
    },
    {
      num: 2,
      icon: <FileText style={{ width: '28px', height: '28px' }} />,
      title: 'Paste Job Description',
      desc: 'Simply paste the target job posting URL or text. Our AI extracts required skills, keywords, and qualifications.',
    },
    {
      num: 3,
      icon: <CheckCircle style={{ width: '28px', height: '28px' }} />,
      title: 'Get Your Tailored CV',
      desc: 'Receive a high-scoring ATS optimized resume instantly, complete with keyword audit reports and score metrics.',
    },
  ];

  return (
    <section id="how-it-works" className={styles.howSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>3 Simple Steps To Land More Interviews</h2>
          <p className={styles.subtitle}>
            From raw job posting to ATS-verified resume in under 60 seconds.
          </p>
        </div>

        <div className={styles.timeline}>
          {steps.map((step) => (
            <div key={step.num} className={styles.stepCard}>
              <div className={styles.stepBadge}>{step.num}</div>
              <div className={styles.iconBox}>{step.icon}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
