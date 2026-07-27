import React, { useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import styles from './TestimonialsSection.module.css';

export const TestimonialsSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      quote: "“Lebenslauf AI took my generic engineering resume and tailored it for 4 specific senior developer roles. I landed 3 initial interviews within the first week.”",
      name: "Marcus Thorne",
      title: "Senior Backend Engineer",
      company: "CloudScale Inc.",
      initials: "MT",
    },
    {
      quote: "“The ATS score ring and keyword audit showed me exactly why my old resume was getting silently rejected. Fixing those gaps doubled my response rate.”",
      name: "Elena Rostova",
      title: "Product Manager",
      company: "FinTech Solutions",
      initials: "ER",
    },
    {
      quote: "“Having a single Master Profile while generating tailored versions per job application saves hours of manual copy-pasting. Highly recommended!”",
      name: "David Chen",
      title: "Data Platform Architect",
      company: "Nexus AI",
      initials: "DC",
    },
  ];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let interval: ReturnType<typeof setInterval>;

    const startAutoScroll = () => {
      interval = setInterval(() => {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }, 4000);
    };

    startAutoScroll();

    const handleMouseEnter = () => clearInterval(interval);
    const handleMouseLeave = () => startAutoScroll();

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(interval);
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <section className={styles.testiSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Loved By Professionals</h2>
          <p className={styles.subtitle}>
            See how job seekers accelerate their career progression with Lebenslauf AI.
          </p>
        </div>

        <div className={styles.carouselContainer} ref={scrollRef}>
          {testimonials.map((t, idx) => (
            <div key={idx} className={styles.card}>
              <div>
                <div style={{ display: 'flex', gap: '0.25rem', color: '#fbbf24', marginBottom: '1rem' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} style={{ width: '16px', height: '16px', fill: '#fbbf24' }} />
                  ))}
                </div>
                <p className={styles.quote}>{t.quote}</p>
              </div>

              <div className={styles.authorBox}>
                <div className={styles.avatarInitials}>{t.initials}</div>
                <div>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorTitle}>{t.title} • {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
