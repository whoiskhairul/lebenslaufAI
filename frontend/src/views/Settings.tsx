import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { SettingsSkeleton } from '../components/skeleton/SettingsSkeleton';
import {
  User as UserIcon, Shield, Key, Moon, Sun, Eye, EyeOff, Sparkles, CheckCircle2, AlertTriangle, Lock, LogOut, Laptop, Check, Image, Trash2, Link
} from 'lucide-react';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const { user, setUser, theme, setTheme } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Security Form states (Password Change)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  // Preferences (AI Key) states
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [prefMsg, setPrefMsg] = useState({ type: '', text: '' });

  // Sessions list
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const key = localStorage.getItem('deepseek_api_key') || '';
      setApiKey(key);
      await fetchSessions();
      setIsLoading(false);
    };
    init();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/auth/sessions');
      if (res.data && Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await api.patch('/auth/user/', {
        full_name: fullName,
        username: username,
        avatar: avatarUrl
      });
      if (res.data && res.data.user) {
        setUser(res.data.user);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err: any) {
      const errorText = err?.response?.data?.error || 'Failed to update profile.';
      setProfileMsg({ type: 'error', text: errorText });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg({ type: '', text: '' });

    if (newPassword.length < 8) {
      setPassMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.post('/auth/password/change/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      setPassMsg({ type: 'success', text: res.data?.message || 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errorText = err?.response?.data?.error || err?.response?.data?.old_password?.[0] || 'Failed to change password.';
      setPassMsg({ type: 'error', text: errorText });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('deepseek_api_key', apiKey.trim());
      setPrefMsg({ type: 'success', text: 'Preferences updated successfully!' });
    } catch (err) {
      setPrefMsg({ type: 'error', text: 'Failed to save preferences.' });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.post(`/auth/sessions/${sessionId}/revoke`);
      fetchSessions();
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Account & Security Command Center</h2>
          <p className={styles.subtitle}>Manage your profile identity, security credentials, 2FA, and system preferences.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <UserIcon size={18} />
          <span>Profile Details</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={18} />
          <span>Account Security</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Sparkles size={18} />
          <span>Preferences & AI Keys</span>
        </button>
      </div>

      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <>
          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div className={`${styles.card} glass-card`}>
              <div className={styles.sectionHeader}>
                <UserIcon size={22} className={styles.headerIcon} />
                <div>
                  <h3>Personal Identity & Avatar</h3>
                  <p className={styles.sectionDesc}>Customize your profile picture, display name, and contact settings.</p>
                </div>
              </div>

              {profileMsg.text && (
                <div className={profileMsg.type === 'success' ? styles.successBanner : styles.errorBanner}>
                  {profileMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className={styles.form}>
                {/* Avatar Row */}
                <div className={styles.avatarSection}>
                  <div className={styles.avatarPreviewContainer}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="User Avatar" className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
                      </div>
                    )}
                  </div>
                  <div className={styles.avatarInputs}>
                    <InputField
                      label="Profile Picture URL / Social Avatar"
                      id="avatarUrl"
                      type="url"
                      placeholder="https://images.unsplash.com/... or Google profile pic URL"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                    <div className={styles.avatarActions}>
                      {avatarUrl && (
                        <Button variant="ghost" type="button" onClick={() => setAvatarUrl('')} className={styles.removeAvatarBtn}>
                          <Trash2 size={14} /> Remove Avatar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.grid2Col}>
                  <InputField
                    label="Full Name"
                    id="fullName"
                    type="text"
                    placeholder="e.g. Marcus Thorne"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />

                  <InputField
                    label="Username"
                    id="username"
                    type="text"
                    placeholder="e.g. marcusthorne"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className={styles.grid2Col}>
                  <div>
                    <label className={styles.inputLabel}>Email Address</label>
                    <div className={styles.emailBadgeRow}>
                      <InputField
                        label=""
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        readOnly
                      />
                      {user?.email_verified && (
                        <span className={styles.verifiedBadge} title="Email Verified">
                          <Check size={14} /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={styles.inputLabel}>Account Provider</label>
                    <div className={styles.providerBadge}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span>Authenticated via SimpleJWT & Social OAuth</span>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isUpdatingProfile} className={styles.saveBtn}>
                  {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* TAB 2: ACCOUNT SECURITY */}
          {activeTab === 'security' && (
            <div className={styles.securityStack}>
              {/* Password Change Card */}
              <div className={`${styles.card} glass-card`}>
                <div className={styles.sectionHeader}>
                  <Key size={22} className={styles.headerIcon} />
                  <div>
                    <h3>Change Account Password</h3>
                    <p className={styles.sectionDesc}>Ensure your account is using a long, strong, and unique password.</p>
                  </div>
                </div>

                {passMsg.text && (
                  <div className={passMsg.type === 'success' ? styles.successBanner : styles.errorBanner}>
                    {passMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{passMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className={styles.form}>
                  <div className={styles.inputWrapper}>
                    <InputField
                      label="Current Password"
                      id="oldPassword"
                      type={showOldPass ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowOldPass(!showOldPass)}
                      title={showOldPass ? 'Hide Password' : 'Show Password'}
                    >
                      {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className={styles.grid2Col}>
                    <div className={styles.inputWrapper}>
                      <InputField
                        label="New Password"
                        id="newPassword"
                        type={showNewPass ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowNewPass(!showNewPass)}
                        title={showNewPass ? 'Hide Password' : 'Show Password'}
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <InputField
                      label="Confirm New Password"
                      id="confirmPassword"
                      type={showNewPass ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isChangingPass} className={styles.saveBtn}>
                    {isChangingPass ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </form>
              </div>

              {/* Active Login Sessions Card */}
              <div className={`${styles.card} glass-card`}>
                <div className={styles.sectionHeader}>
                  <Laptop size={22} className={styles.headerIcon} />
                  <div>
                    <h3>Active Device Sessions</h3>
                    <p className={styles.sectionDesc}>Review devices currently logged into your Lebenslauf AI account.</p>
                  </div>
                </div>

                <div className={styles.sessionList}>
                  {sessions.length > 0 ? (
                    sessions.map((sess) => (
                      <div key={sess.id} className={styles.sessionItem}>
                        <div className={styles.sessionInfo}>
                          <Laptop size={20} className={styles.deviceIcon} />
                          <div>
                            <h4 className={styles.deviceTitle}>{sess.device_info || 'Web Browser'}</h4>
                            <p className={styles.deviceSub}>
                              IP: <code>{sess.ip_address}</code> • Last Active: {new Date(sess.last_active).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {sess.is_active && (
                          <Button variant="ghost" onClick={() => handleRevokeSession(sess.id)} className={styles.revokeBtn}>
                            <LogOut size={14} /> Revoke Session
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={styles.noSessionsText}>Your current session is active and secure.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES & AI KEYS */}
          {activeTab === 'preferences' && (
            <div className={styles.prefStack}>
              {/* Appearance Preference */}
              <div className={`${styles.card} glass-card`}>
                <div className={styles.sectionHeader}>
                  <Moon size={22} className={styles.headerIcon} />
                  <div>
                    <h3>Appearance Preference</h3>
                    <p className={styles.sectionDesc}>Toggle between dark mode and light mode themes.</p>
                  </div>
                </div>

                <div className={styles.themeToggleRow}>
                  <span>Current Interface Theme: <strong style={{ textTransform: 'capitalize' }}>{theme} Mode</strong></span>
                  <Button variant="secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                  </Button>
                </div>
              </div>

              {/* AI Credentials */}
              <div className={`${styles.card} glass-card`}>
                <div className={styles.sectionHeader}>
                  <Shield size={22} className={styles.headerIcon} />
                  <div>
                    <h3>AI Engine Credentials</h3>
                    <p className={styles.sectionDesc}>Configure your personal DeepSeek API key for live AI tailoring.</p>
                  </div>
                </div>

                {prefMsg.text && (
                  <div className={prefMsg.type === 'success' ? styles.successBanner : styles.errorBanner}>
                    {prefMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{prefMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSavePreferences} className={styles.form}>
                  <div className={styles.inputWrapper}>
                    <InputField
                      label="DeepSeek API Key"
                      id="settingsApiKey"
                      type={showKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? 'Hide Key' : 'Show Key'}
                    >
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className={styles.infoBox}>
                    <Sparkles size={16} className={styles.infoIcon} />
                    <p>
                      If no API key is specified, ResumeAI falls back to our realistic local AI Engine mock mode.
                    </p>
                  </div>

                  <Button type="submit" className={styles.saveBtn}>
                    Save AI Credentials
                  </Button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
