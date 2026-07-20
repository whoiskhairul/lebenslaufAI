import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';
import api from '../services/api';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
  const loginAction = useAuthStore((state) => state.login);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !fullName)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        // Register API Call
        const registerRes = await api.post('/auth/register', {
          email,
          password,
          fullName
        });
        
        if (registerRes.data.success) {
          // Auto login after registration
          const loginRes = await api.post('/auth/login', { email, password });
          const { access, userId, email: loggedEmail, fullName: loggedName } = loginRes.data;
          loginAction(access, { userId, email: loggedEmail, fullName: loggedName });
        }
      } else {
        // Login API Call
        const loginRes = await api.post('/auth/login', { email, password });
        const { access, userId, email: loggedEmail, fullName: loggedName } = loginRes.data;
        loginAction(access, { userId, email: loggedEmail, fullName: loggedName });
      }
    } catch (err: any) {
      console.error(err);
      let errorText = '';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorText = data;
        } else if (data.detail) {
          errorText = data.detail;
        } else if (data.non_field_errors) {
          errorText = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors);
        } else if (typeof data === 'object') {
          const messages = Object.entries(data).map(([field, errs]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
            const fieldErrMsg = Array.isArray(errs) ? errs.join(' ') : String(errs);
            return `${fieldName}: ${fieldErrMsg}`;
          });
          errorText = messages.join(' ');
        }
      }
      if (!errorText) {
        errorText = err.message || 'An error occurred. Please verify your credentials and check backend connection.';
      }
      setErrorMsg(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <div className={styles.badge}>Next-Gen Career Canvas</div>
        <h1 className={styles.heroTitle}>
          Craft the Perfect <span className={styles.gradientText}>Tailored Resume</span> in Seconds.
        </h1>
        <p className={styles.heroSubtitle}>
          ResumeAI analyzes job listings, maps your master credentials, computes ATS match scores, 
          and suggests precision edits without compromising factual truth.
        </p>
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🎯</span>
            <div>
              <h3>Single Source of Truth</h3>
              <p>Maintain an immutable Master Profile. AI tailors copies, never touching your original history.</p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🔍</span>
            <div>
              <h3>ATS Scorer & Gap Auditor</h3>
              <p>Get keyword optimization reports and missing skill tags before applying.</p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🛡️</span>
            <div>
              <h3>Explainable, Anti-Hallucination AI</h3>
              <p>Every suggestion includes a confidence score, target requirement, and evidence link.</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.authSection}>
        <div className={`${styles.authCard} glass`}>
          <div className={styles.authHeader}>
            <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <p>{isRegister ? 'Get started by building your career registry.' : 'Sign in to access your dashboard.'}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && <div className={styles.formError}>{errorMsg}</div>}
            
            {isRegister && (
              <InputField 
                label="Full Name" 
                id="fullName"
                type="text" 
                placeholder="Jane Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}

            <InputField 
              label="Email Address" 
              id="email"
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField 
              label="Password" 
              id="password"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
              {isRegister ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className={styles.authFooter}>
            <button 
              className={styles.toggleBtn} 
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg('');
              }}
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
