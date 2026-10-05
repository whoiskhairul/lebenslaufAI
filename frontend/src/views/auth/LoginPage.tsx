import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, AlertCircle, AlertTriangle, Github, Linkedin } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { apiClient } from '../../api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { navigateTo } from '../../utils/navigation';
import styles from './AuthPages.module.css';

/**
 * Where to send the user after a successful login. Honors the ?next=
 * parameter set by the App router when a logged-out user hits a protected
 * page (e.g. /editor?appId=…); falls back to /dashboard. Only same-origin
 * relative paths are accepted (open-redirect guard).
 */
const getPostLoginRedirect = (): string => {
  try {
    const next = new URLSearchParams(window.location.search).get('next');
    if (
      next && next.startsWith('/') && !next.startsWith('//')
      && next !== '/login' && !next.startsWith('/login?')
      && next !== '/register' && !next.startsWith('/register?')
    ) return next;
  } catch {
    // ignore malformed query strings
  }
  return '/dashboard';
};

export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [totpCode, setTotpCode] = useState('');

  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const autoSubmitRef = React.useRef(false);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  React.useEffect(() => {
    if (!cooldownUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const checkCaps = (e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'));
    }
  };

  React.useEffect(() => {
    // Tokens arrive in the URL fragment (never the query string) so they
    // stay out of server logs. Strip them the moment they are read.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const access = hashParams.get('access') || queryParams.get('access');
    const refresh = hashParams.get('refresh') || queryParams.get('refresh');
    const sessionKey = hashParams.get('session_key') || queryParams.get('session_key');
    const err = queryParams.get('error');
    window.history.replaceState({}, '', window.location.pathname);

    if (err) {
      setError('Social authentication failed or was cancelled.');
    } else if (access && refresh) {
      useAuthStore.getState().setTokens(access, refresh);
      apiClient.get('/auth/account/profile')
        .then((res) => {
          setAuth(access, refresh, res.data.user, sessionKey || undefined, true);
          navigateTo(getPostLoginRedirect());
        })
        .catch(() => {
          setError('Failed to load user profile after social login.');
        });
    }
  }, []);

  const handleResendVerification = async () => {
    if (!email) {
      setResendMsg('Enter your email address above first.');
      return;
    }
    setResending(true);
    setResendMsg(null);
    try {
      const res = await apiClient.post('/auth/auth/resend-verification', { email });
      setResendMsg(res.data?.message || 'Verification email sent. Check your inbox.');
      setCooldownUntil(Date.now() + 60000);
      setNow(Date.now());
    } catch (err: any) {
      setResendMsg(err?.response?.data?.error || 'Could not resend the verification email.');
    } finally {
      setResending(false);
    }
  };

  const submitLogin = async (codeOverride?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/auth/login', {
        email,
        password,
        remember_me: rememberMe,
        totp_code: codeOverride ?? totpCode ?? undefined,
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
        response.data.session_key,
        rememberMe
      );

      navigateTo(getPostLoginRedirect());
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(msg);
      setNeedsVerification(code === 'email_not_verified');
      autoSubmitRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    autoSubmitRef.current = false;
    void submitLogin();
  };

  const handleTotpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setTotpCode(digits);
    if (/^\d{6}$/.test(digits) && !loading && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      void submitLogin(digits);
    } else if (!/^\d{6}$/.test(digits)) {
      autoSubmitRef.current = false;
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
        response.data.session_key,
        true
      );

      navigateTo(getPostLoginRedirect());
    } catch (err: any) {
      const code = err.response?.data?.code;
      setError(err.response?.data?.error || 'Google login failed to authenticate with backend.');
      setNeedsVerification(code === 'email_not_verified' || code === 'account_exists');
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
        `${apiBase}/auth/auth/social-${provider}`,
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

          {error && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={17} className={styles.bannerIcon} />
              <span>{error}</span>
            </div>
          )}

          {needsVerification && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={resending || cooldownLeft > 0}
                onClick={handleResendVerification}
              >
                {resending ? 'Sending...' : cooldownLeft > 0 ? `Resend available in ${cooldownLeft}s` : 'Resend Verification Email'}
              </button>
              {resendMsg && <p className={styles.hintText}>{resendMsg}</p>}
            </div>
          )}

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
                <label htmlFor="loginPassword">Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} />
                  <input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.authInput} ${styles.authInputWithEye}`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={checkCaps}
                    onBlur={() => setCapsOn(false)}
                    required
                    autoComplete="current-password"
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#64748B' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember this device
                </label>
                <a href="/reset-password" onClick={(e) => navigateTo('/reset-password', e)} style={{ color: '#4F46E5', textDecoration: 'none' }}>
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
                <span className={styles.stepTag}>Step 2 of 2</span>
                <label htmlFor="loginTotp">Authenticator code or recovery code</label>
                <div className={styles.inputWrapper}>
                  <ShieldCheck className={styles.inputIcon} />
                  <input
                    id="loginTotp"
                    type="text"
                    className={`${styles.authInput} ${styles.codeInput}`}
                    placeholder="123456"
                    maxLength={10}
                    value={totpCode}
                    onChange={(e) => handleTotpChange(e.target.value)}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                </div>
                <p className={styles.hintText}>6-digit codes verify automatically. Recovery codes are 8 characters.</p>
              </div>

              <button type="submit" className={styles.primaryBtn} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {!requires2FA && (
            <>
              <div className={styles.divider}>
                <span>Or continue with</span>
              </div>

              <div className={styles.socialGrid}>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('google')} aria-label="Continue with Google">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('linkedin')} aria-label="Continue with LinkedIn">
                  <Linkedin size={18} />
                  <span>LinkedIn</span>
                </button>
                <button type="button" className={styles.socialBtn} onClick={() => handleSocialClick('github')} aria-label="Continue with GitHub">
                  <Github size={18} />
                  <span>GitHub</span>
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
