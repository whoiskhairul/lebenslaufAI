import React, { useState } from 'react';
import { Brain, CheckCircle2, AlertTriangle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';

interface AiEngineTabProps {
  cls: Record<string, string>;
}

export const AiEngineTab: React.FC<AiEngineTabProps> = ({ cls }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  const [aiProvider, setAiProvider] = useState<'deepseek' | 'gemini'>(() =>
    localStorage.getItem('ai_provider') === 'gemini' ? 'gemini' : 'deepseek'
  );
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('ai_model') || '');
  const [showKey, setShowKey] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('deepseek_api_key', apiKey.trim());
      localStorage.setItem('ai_provider', aiProvider);
      localStorage.setItem('ai_model', aiModel.trim());
      setMsg({ type: 'success', text: 'AI credentials saved. Tailoring and parsing will use them from now on.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Could not save credentials in this browser.' });
    }
  };

  return (
    <div className={cls.listItem}>
      <div className={cls.sectionHeader}>
        <h3>AI Engine Credentials</h3>
      </div>
      <p className={cls.subtext} style={{ marginBottom: '12px' }}>
        Your personal LLM key powers CV parsing, AI tailoring, and cover letters. It stays in this browser and is sent with each AI request.
      </p>

      {msg.text && (
        <div
          className={msg.type === 'success' ? cls.successBanner : cls.errorBanner}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
        >
          <span style={{ flexShrink: 0, marginTop: '1px' }}>
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </span>
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className={cls.form}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <InputField
              label="LLM API Key"
              id="aiEngineApiKey"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? 'Hide Key' : 'Show Key'}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        </div>

        <div className={cls.selectGroup}>
          <label htmlFor="aiEngineProvider">LLM Provider</label>
          <select
            id="aiEngineProvider"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value === 'gemini' ? 'gemini' : 'deepseek')}
          >
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        <InputField
          label="Model (optional)"
          id="aiEngineModel"
          type="text"
          placeholder={aiProvider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat'}
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
        />

        <p className={cls.subtext}>
          <Sparkles size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          The key must match the selected provider. Leave the model empty to use the default
          ({aiProvider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat'}).
          Without a key, AI features are unavailable.
        </p>

        <Button type="submit" className={cls.saveBtn}>
          Save AI Credentials
        </Button>
      </form>
    </div>
  );
};
