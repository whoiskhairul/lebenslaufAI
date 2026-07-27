import React, { useState } from 'react';
import zxcvbn from 'zxcvbn';
import { Mail, Lock, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { navigateTo } from '../../utils/navigation';
import styles from './AuthPages.module.css';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pwdScore = password ? zxcvbn(password).score : 0;
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'];
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (pwdScore < 2) {
      setError('Password is too weak. Please include numbers, symbols, or uppercase letters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await apiClient.post('/auth/auth/register', {
        email,
        password,
        full_name: fullName,
      });

      setSuccessMsg(response.data.message || 'Account created successfully! Please check your email to verify.');
    } catch (err: any) {
      const msg = err.response?.data?.password?.[0] || err.response?.data?.email?.[0] || err.response?.data?.error || 'Registration failed.';
      setError(msg);
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
            <h1>Create Account</h1>
            <p>Join Lebenslauf AI to generate ATS-optimized resumes</p>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}
          {successMsg && <div className={styles.successBanner}>{successMsg}</div>}

          {!successMsg ? (
            <form onSubmit={handleRegister}>
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <div className={styles.inputWrapper}>
                  <UserIcon className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

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

              <div className={styles.formGroup}>
                <label>Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} />
                  <input
                    type="password"
                    className={styles.authInput}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {password && (
                  <div className={styles.strengthMeter}>
                    <div className={styles.strengthBarTrack}>
                      <div
                        className={styles.strengthBarFill}
                        style={{
                          width: `${((pwdScore + 1) / 5) * 100}%`,
                          backgroundColor: strengthColors[pwdScore],
                        }}
                      />
                    </div>
                    <span className={styles.strengthLabel} style={{ color: strengthColors[pwdScore] }}>
                      Strength: {strengthLabels[pwdScore]}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Confirm Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} />
                  <input
                    type="password"
                    className={styles.authInput}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.primaryBtn} disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Free Account'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 style={{ width: '48px', height: '48px', color: '#22c55e', margin: '0 auto 1rem' }} />
              <a href="/login" onClick={(e) => navigateTo('/login', e)} className={styles.primaryBtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
                Proceed to Sign In
              </a>
            </div>
          )}

          <div className={styles.authFooter}>
            Already have an account?{' '}
            <a href="/login" onClick={(e) => navigateTo('/login', e)}>
              Sign in
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
