import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, Laptop, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import api from '../../services/api';
import { useAuthStore, UserSession } from '../../store/authStore';

interface AccountTabProps {
  cls: Record<string, string>;
}

const Banner: React.FC<{ cls: Record<string, string>; type: string; text: string }> = ({ cls, type, text }) => {
  if (!text) return null;
  return (
    <div
      className={type === 'success' ? cls.successBanner : cls.errorBanner}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
    >
      <span style={{ flexShrink: 0, marginTop: '1px' }}>
        {type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      </span>
      <span>{text}</span>
    </div>
  );
};

const IdentitySection: React.FC<{ cls: Record<string, string> }> = ({ cls }) => {
  const { user, setUser } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setAvatarUrl(user?.avatar || '');
  }, [user?.avatar]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.patch('/auth/account/profile', { avatar: avatarUrl });
      if (res.data?.user) {
        setUser(res.data.user);
        setMsg({ type: 'success', text: 'Profile picture updated.' });
      } else {
        setMsg({ type: 'error', text: 'Unexpected server response.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Could not update profile picture.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cls.listItem}>
      <div className={cls.sectionHeader}>
        <h3>Account Identity</h3>
      </div>
      <Banner cls={cls} type={msg.type} text={msg.text} />
      <form onSubmit={handleSave} className={cls.form}>
        <InputField
          label="Email Address"
          id="accountEmail"
          type="email"
          value={user?.email || ''}
          disabled
          readOnly
        />
        <InputField
          label="Profile Picture URL"
          id="accountAvatar"
          type="url"
          placeholder="https://... or your social profile picture URL"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
        <Button type="submit" disabled={saving} className={cls.saveBtn}>
          {saving ? 'Saving...' : 'Save Identity'}
        </Button>
      </form>
    </div>
  );
};

const PasswordSection: React.FC<{ cls: Record<string, string> }> = ({ cls }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changing, setChanging] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (newPassword.length < 8) {
      setMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setChanging(true);
    try {
      const res = await api.post('/auth/password-change', {
        old_password: oldPassword,
        new_password: newPassword
      });
      setMsg({ type: 'success', text: res.data?.message || 'Password changed. Other devices were signed out.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.error || err?.response?.data?.old_password?.[0] || 'Could not change password.' });
    } finally {
      setChanging(false);
    }
  };

  const pwdType = showPasswords ? 'text' : 'password';

  return (
    <div className={cls.listItem}>
      <div className={cls.sectionHeader}>
        <h3>Change Password</h3>
        <Button variant="ghost" type="button" onClick={() => setShowPasswords(!showPasswords)} aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}>
          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
      </div>
      <Banner cls={cls} type={msg.type} text={msg.text} />
      <form onSubmit={handleSubmit} className={cls.form}>
        <InputField
          label="Current Password"
          id="accountOldPassword"
          type={pwdType}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <div className={cls.formGrid}>
          <InputField
            label="New Password"
            id="accountNewPassword"
            type={pwdType}
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <InputField
            label="Confirm New Password"
            id="accountConfirmPassword"
            type={pwdType}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={changing} className={cls.saveBtn}>
          {changing ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </div>
  );
};

const SessionsSection: React.FC<{ cls: Record<string, string> }> = ({ cls }) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchSessions = async () => {
    try {
      const res = await api.get('/security/sessions');
      if (Array.isArray(res.data)) setSessions(res.data);
    } catch (err) {
      setMsg({ type: 'error', text: 'Could not load active sessions.' });
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    try {
      await api.post(`/security/sessions/${sessionId}/revoke`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setMsg({ type: 'error', text: 'Could not revoke that session.' });
    }
  };

  return (
    <div className={cls.listItem}>
      <div className={cls.sectionHeader}>
        <h3>Active Sessions</h3>
      </div>
      <p className={cls.subtext} style={{ marginBottom: '12px' }}>
        Devices currently signed in to your account. Revoking signs that device out.
      </p>
      <Banner cls={cls} type={msg.type} text={msg.text} />
      <div>
        {sessions.length === 0 && (
          <p className={cls.subtext}>No other active sessions.</p>
        )}
        {sessions.map((sess) => (
          <div key={sess.id} className={cls.reviewItem} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Laptop size={20} style={{ flexShrink: 0, color: 'var(--muted)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--foreground)' }}>
                {sess.device_info || 'Web Browser'}
                {sess.is_current && <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--primary)' }}>(This device)</span>}
              </p>
              <p className={cls.subtext} style={{ margin: 0 }}>
                IP {sess.ip_address || 'unknown'} · Last active {sess.last_activity ? new Date(sess.last_activity).toLocaleString() : 'unknown'}
              </p>
            </div>
            {!sess.is_current && (
              <Button variant="ghost" type="button" onClick={() => handleRevoke(sess.id)} aria-label={`Revoke session ${sess.device_info || sess.id}`}>
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const TwoFactorSection: React.FC<{ cls: Record<string, string> }> = ({ cls }) => {
  const { user, setUser } = useAuthStore();
  const [setup, setSetup] = useState<{ secret: string; qr_code: string; recovery_codes: string[] } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleInit = async () => {
    setWorking(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.get('/auth/security/2fa/setup');
      setSetup(res.data);
    } catch (err) {
      setMsg({ type: 'error', text: 'Could not start 2FA setup.' });
    } finally {
      setWorking(false);
    }
  };

  const handleVerify = async () => {
    setWorking(true);
    setMsg({ type: '', text: '' });
    try {
      await api.post('/auth/security/2fa/verify', { code: totpCode });
      setMsg({ type: 'success', text: 'Two-factor authentication is now enabled.' });
      if (user) setUser({ ...user, two_factor_enabled: true });
      setSetup(null);
      setTotpCode('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Invalid code. Try again.' });
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) return;
    setWorking(true);
    setMsg({ type: '', text: '' });
    try {
      await api.post('/auth/security/2fa/disable', { password: disablePassword });
      setMsg({ type: 'success', text: 'Two-factor authentication disabled.' });
      if (user) setUser({ ...user, two_factor_enabled: false });
      setDisablePassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Could not disable 2FA.' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className={cls.listItem}>
      <div className={cls.sectionHeader}>
        <h3>Two-Factor Authentication</h3>
        <span className={user?.two_factor_enabled ? cls.tagDone : cls.tagMissing}>
          {user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <p className={cls.subtext} style={{ marginBottom: '12px' }}>
        Extra protection via an authenticator app (Google Authenticator, Authy, 1Password).
      </p>
      <Banner cls={cls} type={msg.type} text={msg.text} />
      {!user?.two_factor_enabled ? (
        !setup ? (
          <Button onClick={handleInit} disabled={working} className={cls.saveBtn}>
            <ShieldCheck size={16} /> {working ? 'Preparing...' : 'Enable Two-Factor Authentication'}
          </Button>
        ) : (
          <div className={cls.form}>
            <p className={cls.subtext}>Scan this code with your authenticator app, then enter the 6-digit code:</p>
            <img src={setup.qr_code} alt="2FA setup QR code" style={{ borderRadius: '8px', maxWidth: '200px' }} />
            <p className={cls.subtext}>Manual key: <code>{setup.secret}</code></p>
            <InputField
              label="6-Digit Code"
              id="accountTotp"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <Button onClick={handleVerify} disabled={working} className={cls.saveBtn}>
              {working ? 'Verifying...' : 'Verify and Activate'}
            </Button>
          </div>
        )
      ) : (
        <div className={cls.form}>
          <InputField
            label="Current Password (to disable 2FA)"
            id="accountDisable2fa"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          <Button variant="secondary" onClick={handleDisable} disabled={working || !disablePassword} className={cls.saveBtn}>
            {working ? 'Working...' : 'Disable 2FA'}
          </Button>
        </div>
      )}
    </div>
  );
};

export const AccountTab: React.FC<AccountTabProps> = ({ cls }) => {
  return (
    <div className={cls.listSection}>
      <IdentitySection cls={cls} />
      <PasswordSection cls={cls} />
      <TwoFactorSection cls={cls} />
      <SessionsSection cls={cls} />
    </div>
  );
};
