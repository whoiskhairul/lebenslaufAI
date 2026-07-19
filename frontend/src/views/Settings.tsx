import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import { Shield, Eye, EyeOff, Sparkles, Moon, Sun } from 'lucide-react';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useAuthStore();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const key = localStorage.getItem('deepseek_api_key') || '';
    setApiKey(key);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('deepseek_api_key', apiKey.trim());
      setMsg({ type: 'success', text: 'API Settings updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>System Settings</h2>
          <p className={styles.subtitle}>Configure AI provider keys, dark mode configurations, and accessibility features.</p>
        </div>
      </div>

      <div className={`${styles.card} glass-card`}>
        <div className={styles.sectionTitle}>
          <Moon size={20} className={styles.icon} />
          <h3>Appearance Preference</h3>
        </div>
        <p className={styles.sectionDesc}>Customize the look and feel of your Career Command Center.</p>
        
        <div className={styles.themeToggleContainer}>
          <span>Current Theme: <strong style={{ textTransform: 'capitalize' }}>{theme} Mode</strong></span>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </Button>
        </div>
      </div>

      <div className={`${styles.card} glass-card`}>
        <div className={styles.sectionTitle}>
          <Shield size={20} className={styles.icon} />
          <h3>AI Engine Credentials</h3>
        </div>
        <p className={styles.sectionDesc}>
          Enter your DeepSeek credentials to trigger live resume tailoring. 
          Your key remains stored locally in your browser and is only sent to execute API tasks.
        </p>

        {msg.text && (
          <div className={msg.type === 'success' ? styles.successBanner : styles.errorBanner}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} className={styles.form}>
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
              If no API key is specified, ResumeAI falls back to a realistic local Mock AI Engine. 
              This lets you inspect dashboard changes, tailoring tooltips, and exports without running up costs!
            </p>
          </div>

          <Button type="submit" className={styles.saveBtn}>
            Save API Settings
          </Button>
        </form>
      </div>
    </div>
  );
};
