import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { DemoSection } from '../components/landing/DemoSection';
import { TestimonialsSection } from '../components/landing/TestimonialsSection';
import { PricingSection } from '../components/landing/PricingSection';
import { Footer } from '../components/landing/Footer';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
  return (
    <div className={styles.landingPage}>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DemoSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};
