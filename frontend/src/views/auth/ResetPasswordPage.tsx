import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2, AlertCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { navigateTo } from '../../utils/navigation';
import styles from './AuthPages.module.css';

export const ResetPasswordPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const hasToken = Boolean(params.get('uid') && params.get('token'));

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkCaps = (e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'));
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post('/auth/auth/password-reset', { email });
      setSuccess(res.data?.message || 'If an account exists, reset instructions were sent.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not send reset instructions.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const query = new URLSearchParams(window.location.search);
      const res = await apiClient.post('/auth/auth/password-reset-confirm', {
        uid: query.get('uid'),
        token: query.get('token'),
        new_password: newPassword,
      });
      setSuccess(res.data?.message || 'Password reset successfully. You can now log in.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const data = err?.response?.data || {};
      setError(
        data?.error ||
        data?.new_password?.[0] ||
        data?.token?.[0] ||
        'Reset failed. The link may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0f0f12', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className={styles.authContainer} style={{ flex: 1, padding: '7rem 1rem 4rem' }}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1>Reset Password</h1>
            <p>{hasToken ? 'Choose a new password' : 'We will email you a reset link'}</p>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={17} className={styles.bannerIcon} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 style={{ width: '48px', height: '48px', color: '#22c55e', margin: '0 auto 1rem' }} />
              <div className={styles.successBanner}>{success}</div>
              <a href="/login" onClick={(e) => navigateTo('/login', e)} className={styles.primaryBtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
                Proceed to Sign In
              </a>
            </div>
          )}

          {!success && !hasToken && (
            <form onSubmit={handleRequest}>
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
              <button type="submit" className={styles.primaryBtn} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!success && hasToken && (
            <form onSubmit={handleConfirm}>
              <div className={styles.formGroup}>
                <label htmlFor="resetNew">New Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} />
                  <input
                    id="resetNew"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.authInput} ${styles.authInputWithEye}`}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyUp={checkCaps}
                    onBlur={() => setCapsOn(false)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {capsOn && (
                  <p className={styles.capsHint}>
                    <AlertTriangle size={13} /> Caps Lock is on
                  </p>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="resetConfirm">Confirm New Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} />
                  <input
                    id="resetConfirm"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.authInput} ${styles.authInputWithEye}`}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyUp={checkCaps}
                    onBlur={() => setCapsOn(false)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button type="submit" className={styles.primaryBtn} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Saving...' : 'Set New Password'}
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
