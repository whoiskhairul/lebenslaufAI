import React, { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone, Laptop, Trash2, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useAuthStore, UserSession } from '../../store/authStore';
import styles from './AuthPages.module.css';

export const AccountSecurityPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [twoFactorData, setTwoFactorData] = useState<{ secret: string; qr_code: string; recovery_codes: string[] } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await apiClient.get('/auth/security/sessions');
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleInit2FA = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/auth/security/2fa/setup');
      setTwoFactorData(res.data);
    } catch (err: any) {
      setError('Failed to initialize 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/security/2fa/verify', { code: totpCode });
      setMsg('Two-Factor Authentication enabled successfully!');
      if (user) setUser({ ...user, two_factor_enabled: true });
      setTwoFactorData(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/security/2fa/disable', { password: disablePassword });
      setMsg('Two-Factor Authentication disabled.');
      if (user) setUser({ ...user, two_factor_enabled: false });
      setDisablePassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await apiClient.post(`/auth/security/sessions/${sessionId}/revoke`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError('Failed to revoke session.');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', color: '#f8fafc' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #60a5fa, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Account Security
      </h1>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {msg && <div className={styles.successBanner}>{msg}</div>}

      {/* 2FA Section */}
      <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck style={{ color: user?.two_factor_enabled ? '#22c55e' : '#94a3b8' }} /> Two-Factor Authentication (TOTP)
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Add an extra layer of security using an authenticator app (Google Authenticator, Authy, 1Password).
            </p>
          </div>
          {user?.two_factor_enabled ? (
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#86efac', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
              ENABLED
            </span>
          ) : (
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
              DISABLED
            </span>
          )}
        </div>

        {!user?.two_factor_enabled ? (
          <div>
            {!twoFactorData ? (
              <button className={styles.primaryBtn} onClick={handleInit2FA} disabled={loading}>
                {loading ? 'Initializing...' : 'Enable Two-Factor Authentication'}
              </button>
            ) : (
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Scan this QR code with your authenticator app:</p>
                <img src={twoFactorData.qr_code} alt="2FA QR Code" style={{ borderRadius: '0.5rem', marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  Secret Key: <code>{twoFactorData.secret}</code>
                </p>

                <div className={styles.formGroup} style={{ maxWidth: '300px' }}>
                  <label>Enter 6-Digit Code to Confirm</label>
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                  />
                </div>
                <button className={styles.primaryBtn} onClick={handleVerify2FA} disabled={loading} style={{ maxWidth: '300px' }}>
                  Verify & Activate 2FA
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '1rem' }}>Enter your password to disable 2FA:</p>
            <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '400px' }}>
              <input
                type="password"
                className={styles.authInput}
                placeholder="Current password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
              <button onClick={handleDisable2FA} className={styles.primaryBtn} style={{ background: '#ef4444' }}>
                Disable
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Laptop /> Active Sessions & Devices
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                  {s.device_info || 'Web Session'} {s.is_current && <span style={{ color: '#60a5fa', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Current Device)</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  IP: {s.ip_address || '127.0.0.1'} • Last active: {new Date(s.last_activity).toLocaleString()}
                </div>
              </div>
              {!s.is_current && (
                <button onClick={() => handleRevokeSession(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem' }}>
                  <Trash2 style={{ width: '18px', height: '18px' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
