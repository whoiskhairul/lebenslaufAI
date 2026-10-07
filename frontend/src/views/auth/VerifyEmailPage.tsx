import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { navigateTo } from '../../utils/navigation';
import styles from './AuthPages.module.css';

export const VerifyEmailPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(params.get('email') || '');
  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  React.useEffect(() => {
    if (!cooldownUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const verify = async (verifyEmail: string, token: string | null) => {
    if (!verifyEmail || !token) {
      setStatus('error');
      setMessage('This verification link is incomplete. Request a new one below.');
      return;
    }
    setStatus('working');
    setMessage(null);
    try {
      const res = await apiClient.post('/auth/auth/verify-email', { email: verifyEmail, token });
      setStatus('success');
      setMessage(res.data?.message || 'Email verified successfully. You can now log in.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
    }
  };

  React.useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    const mail = new URLSearchParams(window.location.search).get('email');
    if (token && mail) {
      setEmail(mail);
      verify(mail, token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResending(true);
    setMessage(null);
    try {
      const res = await apiClient.post('/auth/auth/resend-verification', { email });
      setMessage(res.data?.message || 'Verification email sent. Check your inbox.');
      setCooldownUntil(Date.now() + 60000);
      setNow(Date.now());
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Could not resend the verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className={styles.authContainer} style={{ flex: 1, padding: '7rem 1rem 4rem' }}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1>Verify Email</h1>
            <p>Confirm your email address to activate your account</p>
          </div>

          {status === 'working' && <p className={styles.hintText}>Verifying...</p>}
          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 style={{ width: '48px', height: '48px', color: '#16a34a', margin: '0 auto 1rem' }} />
              <div className={styles.successBanner}>{message}</div>
              <a href="/login" onClick={(e) => navigateTo('/login', e)} className={styles.primaryBtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
                Proceed to Sign In
              </a>
            </div>
          )}
          {status === 'error' && message && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={17} className={styles.bannerIcon} />
              <span>{message}</span>
            </div>
          )}
          {status === 'idle' && message && (
            <p className={styles.hintText}>{message}</p>
          )}

          {status !== 'success' && status !== 'working' && (
            <form onSubmit={handleResend} style={{ marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} />
                  <input
                    type="email"
                    className={styles.authInput}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className={styles.primaryBtn} disabled={resending || cooldownLeft > 0} style={{ width: '100%' }}>
                {resending ? 'Sending...' : cooldownLeft > 0 ? `Resend available in ${cooldownLeft}s` : 'Resend Verification Email'}
              </button>
            </form>
          )}

          <div className={styles.authFooter}>
            <a href="/login" onClick={(e) => navigateTo('/login', e)}>
              Back to Sign in
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
