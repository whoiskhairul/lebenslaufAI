import React, { useState } from 'react';
import zxcvbn from 'zxcvbn';
import { Mail, Lock, User as UserIcon, CheckCircle2, Github } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/apiClient';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { navigateTo } from '../../utils/navigation';
import styles from './AuthPages.module.css';

export const RegisterPage: React.FC = () => {
  const { setAuth } = useAuthStore();
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

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/auth/social-login', {
        provider: 'google',
        access_token: tokenResponse.access_token,
      });

      setAuth(
        response.data.access,
        response.data.refresh,
        response.data.user,
        response.data.session_key
      );

      navigateTo('/dashboard');
    } catch (err: any) {
      setError('Google registration failed to authenticate with backend.');
    } finally {
      setLoading(false);
    }
  };


  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google sign-up popup was cancelled or failed.'),
  });

  const handleSocialClick = (provider: string) => {
    if (provider === 'google') {
      loginWithGoogle();
    } else {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      window.open(
        `http://localhost:8000/api/v1/auth/auth/social-${provider}`,
        `OAuth_${provider}`,
        `width=${width},height=${height},top=${top},left=${left}`
      );
    }
  };

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
            <>
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

              <div className={styles.divider}>
                <span>OR CONTINUE WITH</span>
              </div>

              <div className={styles.socialGrid}>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('google')}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('github')}>
                  <Github size={18} />
                  <span>GitHub</span>
                </button>
              </div>
            </>
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
