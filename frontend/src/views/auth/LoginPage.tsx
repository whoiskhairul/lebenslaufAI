import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { apiClient } from '../../api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { navigateTo } from '../../utils/navigation';
import styles from './AuthPages.module.css';

export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [totpCode, setTotpCode] = useState('');

  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');
    const sessionKey = params.get('session_key');
    const err = params.get('error');

    if (err) {
      setError('Social authentication failed or was cancelled.');
    } else if (access && refresh) {
      useAuthStore.getState().setTokens(access, refresh);
      apiClient.get('/auth/account/profile')
        .then((res) => {
          setAuth(access, refresh, res.data.user, sessionKey || undefined);
          navigateTo('/dashboard');
        })
        .catch(() => {
          setError('Failed to load user profile after social login.');
        });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/auth/login', {
        email,
        password,
        remember_me: rememberMe,
        totp_code: totpCode || undefined,
      });

      if (response.data.two_factor_required) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      setAuth(
        response.data.access,
        response.data.refresh,
        response.data.user,
        response.data.session_key
      );

      navigateTo('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
      setError('Google login failed to authenticate with backend.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google sign-in popup was cancelled or failed.'),
  });

  const handleSocialClick = (provider: string) => {
    if (provider === 'google') {
      loginWithGoogle();
    } else {
      // Open GitHub/LinkedIn OAuth in popup window to prevent leaving React app
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

  return (
    <div style={{ background: '#0f0f12', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className={styles.authContainer} style={{ flex: 1, padding: '7rem 1rem 4rem' }}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1>Sign In</h1>
            <p>{requires2FA ? 'Enter Two-Factor Authenticator Code' : 'Welcome back to Lebenslauf AI'}</p>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {!requires2FA ? (
            <form onSubmit={handleLogin}>
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember this device
                </label>
                <a href="/reset-password" onClick={(e) => navigateTo('/reset-password', e)} style={{ color: '#818cf8', textDecoration: 'none' }}>
                  Forgot Password?
                </a>
              </div>

              <button type="submit" className={styles.primaryBtn} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label>6-Digit Authenticator Code</label>
                <div className={styles.inputWrapper}>
                  <ShieldCheck className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="123456"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className={styles.primaryBtn} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {!requires2FA && (
            <>
              <div className={styles.divider}>
                <span>OR CONTINUE WITH</span>
              </div>

              <div className={styles.socialGrid}>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('google')}>
                  Google
                </button>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('linkedin')}>
                  LinkedIn
                </button>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('github')}>
                  GitHub
                </button>
              </div>
            </>
          )}

          <div className={styles.authFooter}>
            Don't have an account?{' '}
            <a href="/register" onClick={(e) => navigateTo('/register', e)}>
              Sign up
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
