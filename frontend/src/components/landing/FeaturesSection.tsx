import React from 'react';
import { Cpu, Target, Sliders, History } from 'lucide-react';
import styles from './FeaturesSection.module.css';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Cpu style={{ width: '24px', height: '24px' }} />,
      title: 'AI-Powered Tailoring',
      desc: 'Extracted key metrics and requirements from target job listings to generate bespoke resume bullets grounded in facts.',
    },
    {
      icon: <Target style={{ width: '24px', height: '24px' }} />,
      title: 'Real-Time ATS Score',
      desc: 'Get immediate compliance feedback with exact keyword match calculations, gap detection, and formatting audits.',
    },
    {
      icon: <Sliders style={{ width: '24px', height: '24px' }} />,
      title: 'Job-Specific Optimization',
      desc: 'Fine-tune tone, industry terminology, and technical skills specifically tailored for each target application.',
    },
    {
      icon: <History style={{ width: '24px', height: '24px' }} />,
      title: 'Version History & Revert',
      desc: 'Maintain a single Master Profile. Store unlimited tailored CV snapshots with 1-click restore capability.',
    },
  ];

  return (
    <section id="features" className={styles.featuresSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Engineered For Maximum Impact</h2>
          <p className={styles.subtitle}>
            Everything you need to bypass ATS filters and impress hiring managers with factual, tailored resumes.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((item, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.iconWrapper}>{item.icon}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
