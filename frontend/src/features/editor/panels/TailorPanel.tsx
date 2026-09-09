import React from 'react';
import { Wand2, Sparkles, ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/Button';
import { InputField } from '../../../components/InputField';
import ed from '../../../views/editorStyles';
import { getParsedLetter } from '../utils/parsedLetter';

const styles = ed;

interface TailorPanelProps {
  editorTabIsResume: boolean;
  company: string;
  setCompany: (v: string) => void;
  position: string;
  setPosition: (v: string) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  template: string;
  setTemplate: (v: string) => void;
  targetLanguage: 'en' | 'de';
  setTargetLanguage: (v: 'en' | 'de') => void;
  aggressiveMode: boolean;
  setAggressiveMode: (v: boolean) => void;
  masterProjects: Array<{ id: string; title: string; role?: string }>;
  selectedProjectIds: string[];
  setSelectedProjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  isProjectsCollapsed: boolean;
  setIsProjectsCollapsed: (v: boolean) => void;
  masterProfileInfo: any;
  editablePersonalInfo: any;
  currentVersion: any;
  saveAutomatically: boolean;
  setSaveAutomatically: (v: boolean) => void;
  isLoading: boolean;
  applicationTracked: boolean;
  isTrackingLoading: boolean;
  onTailor: (e: React.FormEvent) => void;
  onTrackApplication: () => void;
  letterTone: string;
  setLetterTone: (v: string) => void;
  letterLanguage: string;
  setLetterLanguage: (v: string) => void;
  isLetterLoading: boolean;
  letterContent: string;
  onGenerateLetter: (company: string, position: string) => void;
}

export const TailorPanel: React.FC<TailorPanelProps> = (p) => (
  p.editorTabIsResume ? (
    // CV Tailoring UI
    <>
      <form onSubmit={p.onTailor} className={`${styles.form} glass-card`}>
        <h3>Job Listing Details</h3>
        <div className={styles.formGrid}>
          <InputField
            label="Company Name"
            id="editorCompany"
            placeholder="e.g. Stripe"
            value={p.company}
            onChange={(e) => p.setCompany(e.target.value)}
          />
          <InputField
            label="Target Position"
            id="editorRole"
            placeholder="e.g. Lead Frontend Engineer"
            value={p.position}
            onChange={(e) => p.setPosition(e.target.value)}
          />
        </div>
        <InputField
          label="Job Description Text *"
          id="editorDesc"
          type="textarea"
          placeholder="Paste responsibilities and key requirements..."
          value={p.jobDescription}
          onChange={(e) => p.setJobDescription(e.target.value)}
          required
        />

        <div className={styles.selectGroup}>
          <label htmlFor="editorTemplate">Layout Template</label>
          <select id="editorTemplate" value={p.template} onChange={(e) => p.setTemplate(e.target.value)}>
            <option value="pixel_perfect_pdf">German Styled Template </option>
            <option value="modern_minimalist" disabled>More templates Coming soon</option>
          </select>

          {/* 1. Language & ATS Strategy Options */}
          <div className={styles.selectGroup} style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #1e293b)', marginBottom: '6px', display: 'block' }}>
              Target Output Language
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => p.setTargetLanguage('en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: p.targetLanguage === 'en' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: p.targetLanguage === 'en' ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
                  fontWeight: p.targetLanguage === 'en' ? 700 : 500,
                  color: p.targetLanguage === 'en' ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🇬🇧 English</span>
              </button>
              <button
                type="button"
                onClick={() => p.setTargetLanguage('de')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: p.targetLanguage === 'de' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: p.targetLanguage === 'de' ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
                  fontWeight: p.targetLanguage === 'de' ? 700 : 500,
                  color: p.targetLanguage === 'de' ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🇩🇪 Deutsch</span>
              </button>
            </div>

            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #1e293b)', marginBottom: '6px', display: 'block' }}>
              ATS Keyword Strategy
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => p.setAggressiveMode(false)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: !p.aggressiveMode ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: !p.aggressiveMode ? 'rgba(99, 102, 241, 0.08)' : '#ffffff',
                  color: !p.aggressiveMode ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '12px' }}>🛡️ Standard</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>Strict Profile Match</span>
              </button>
              <button
                type="button"
                onClick={() => p.setAggressiveMode(true)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: p.aggressiveMode ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: p.aggressiveMode ? 'rgba(99, 102, 241, 0.12)' : '#ffffff',
                  color: p.aggressiveMode ? '#6d28d9' : '#475569',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '12px' }}>⚡ Aggressive</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>High ATS Optimization</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Selective Projects List in Side Panel */}
        <div style={{ marginBottom: '16px', background: 'rgba(248, 250, 252, 0.8)', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
          <div
            onClick={() => p.setIsProjectsCollapsed(!p.isProjectsCollapsed)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Include Projects ({p.masterProjects.length > 0 ? `${p.selectedProjectIds.length} of ${p.masterProjects.length} selected` : 'None added in profile'})</span>
            </div>
            <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
              {p.isProjectsCollapsed ? 'Expand ▼' : 'Collapse ▲'}
            </span>
          </div>

          {!p.isProjectsCollapsed && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {p.masterProjects.length > 0 ? (
                p.masterProjects.map(proj => {
                  const isChecked = p.selectedProjectIds.includes(proj.id);
                  return (
                    <label
                      key={proj.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isChecked ? '#ffffff' : 'transparent',
                        border: isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            p.setSelectedProjectIds(prev => [...prev, proj.id]);
                          } else {
                            p.setSelectedProjectIds(prev => prev.filter(id => id !== proj.id));
                          }
                        }}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#1e293b', display: 'block', lineHeight: '1.2' }}>{proj.title}</strong>
                        {proj.role && <span style={{ fontSize: '10.5px', color: '#64748b' }}>{proj.role}</span>}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '6px 4px', fontStyle: 'italic' }}>
                  No projects found in Master Profile. Add projects in your profile settings to filter them here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Missing Profile Details Diagnostic Widget in Side Panel */}
        {(() => {
          const infoToCheck = p.currentVersion ? p.editablePersonalInfo : (p.masterProfileInfo || {});
          const missing: { field: string; label: string; icon: string }[] = [];
          if (!infoToCheck.linkedin) missing.push({ field: 'linkedin', label: 'LinkedIn Profile URL', icon: '🔗' });
          if (!infoToCheck.github) missing.push({ field: 'github', label: 'GitHub Profile URL', icon: '💻' });
          if (!infoToCheck.phone) missing.push({ field: 'phone', label: 'Phone Number', icon: '📞' });
          if (!infoToCheck.location) missing.push({ field: 'location', label: 'Location / City', icon: '📍' });
          if (!infoToCheck.email) missing.push({ field: 'email', label: 'Email Address', icon: '✉️' });

          if (missing.length === 0) return null;

          return (
            <div style={{ marginBottom: '16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#d48806', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShieldAlert size={14} />
                <span>Missing Profile Details ({missing.length})</span>
              </div>
              <p style={{ fontSize: '11px', color: '#8c6b00', marginBottom: '8px', lineHeight: '1.4' }}>
                {p.currentVersion
                  ? "The following optional details are missing from your active canvas and won't appear on your CV:"
                  : "The following optional details are missing from your Master Profile:"}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {missing.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '10.5px',
                      background: '#fff',
                      border: '1px solid #ffe58f',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      color: '#ad6800',
                      fontWeight: 500
                    }}
                  >
                    {item.icon} {item.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <input
            type="checkbox"
            id="saveAutomatically"
            checked={p.saveAutomatically}
            onChange={(e) => p.setSaveAutomatically(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="saveAutomatically" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: 'var(--text-main, #1e293b)' }}>
            Save tailored copy automatically
          </label>
        </div>

        <Button type="submit" isLoading={p.isLoading} className={styles.tailorBtn}>
          <Wand2 size={16} />
          <span>Analyze & Tailor</span>
        </Button>
      </form>

      {p.currentVersion && (
        <div className={styles.trackingSection} style={{ marginTop: '16px', padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>
              {p.applicationTracked ? '✓ Tracking this Application' : 'Track this job application?'}
            </div>
          </div>
          {!p.applicationTracked ? (
            <Button onClick={p.onTrackApplication} isLoading={p.isTrackingLoading} style={{ width: '100%' }}>
              Add to Application Tracking
            </Button>
          ) : (
            <div style={{ fontSize: '12px', color: '#475569' }}>
              This CV is linked to an active job tracking card.
            </div>
          )}
        </div>
      )}
    </>
  ) : (
    // Cover Letter Tailoring UI
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          p.onGenerateLetter(p.company, p.position);
        }}
        className={`${styles.form} glass-card`}
      >
        <h3>Cover Letter Tailoring</h3>
        <div className={styles.formGrid}>
          <InputField
            label="Company Name"
            id="letterCompany"
            placeholder="e.g. Stripe"
            value={p.company}
            onChange={(e) => p.setCompany(e.target.value)}
          />
          <InputField
            label="Target Position"
            id="letterRole"
            placeholder="e.g. Lead Frontend Engineer"
            value={p.position}
            onChange={(e) => p.setPosition(e.target.value)}
          />
        </div>
        <InputField
          label="Job Description Text *"
          id="letterDesc"
          type="textarea"
          placeholder="Paste job details to tailor your cover letter..."
          value={p.jobDescription}
          onChange={(e) => p.setJobDescription(e.target.value)}
          required
        />

        <div className={styles.formGrid} style={{ marginBottom: '16px' }}>
          <div className={styles.selectGroup}>
            <label htmlFor="letterTone">Writing Tone</label>
            <select
              id="letterTone"
              value={p.letterTone}
              onChange={(e) => p.setLetterTone(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--card-border, #cbd5e1)',
                background: 'white',
                fontSize: '13px',
                outline: 'none',
                color: 'var(--text-main, #1e293b)'
              }}
            >
              <option value="professional">Professional & Direct (Recommended)</option>
              <option value="enthusiastic">Enthusiastic & Passionate</option>
              <option value="creative">Creative & Narrative</option>
              <option value="executive">Executive & Formal</option>
              <option value="direct">Short & Conversational</option>
            </select>
          </div>

          <div className={styles.selectGroup}>
            <label htmlFor="letterLanguageSelect">Cover Letter Language</label>
            <select
              id="letterLanguageSelect"
              value={p.letterLanguage}
              onChange={(e) => p.setLetterLanguage(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--card-border, #cbd5e1)',
                background: 'white',
                fontSize: '13px',
                outline: 'none',
                color: 'var(--text-main, #1e293b)'
              }}
            >
              <option value="auto">Auto (Match Resume Language)</option>
              <option value="en">English</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>

        <Button type="submit" isLoading={p.isLetterLoading} className={styles.tailorBtn}>
          <Sparkles size={16} />
          <span>Generate & Tailor Cover Letter</span>
        </Button>
      </form>

      <div className={`${styles.atsCard} glass-card`}>
        <h3>Cover Letter Guidelines</h3>
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--muted, #64748b)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <p>
            <strong>1. Premium Structure:</strong> A cover letter should be kept to a single, impactful page. It includes contact details, greeting, hook opening, value body paragraphs, and professional closing.
          </p>
          <p>
            <strong>2. Adaptive Tone:</strong> Startups value enthusiastic/conversational tones, whereas traditional businesses require a professional/executive tone. Match the writing tone above accordingly.
          </p>
        </div>
      </div>

      {(() => {
        const letter = getParsedLetter(p.letterContent, p.editablePersonalInfo);
        const notes = letter.verification_notes;
        if (!notes || (!notes.requirements_emphasized?.length && !notes.resume_evidence_used?.length && !notes.placeholders?.length && !notes.confirmation_needed?.length)) {
          return null;
        }
        return (
          <div className={`${styles.atsCard} glass-card`} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                <Sparkles size={16} style={{ color: '#6366f1' }} />
                AI Generation Audit
              </h3>
              <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>Active Audit</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.requirements_emphasized && notes.requirements_emphasized.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '3.5px solid #6366f1', border: '1px solid #e2e8f0', borderLeftWidth: '3.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>🎯</span>
                    <strong style={{ fontSize: '12px', color: '#1e293b' }}>Emphasized Requirements</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {notes.requirements_emphasized.map((req, idx) => (
                      <li key={idx} style={{ lineHeight: '1.4' }}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notes.resume_evidence_used && notes.resume_evidence_used.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '3.5px solid #10b981', border: '1px solid #e2e8f0', borderLeftWidth: '3.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>📄</span>
                    <strong style={{ fontSize: '12px', color: '#1e293b' }}>Evidence Used from CV</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {notes.resume_evidence_used.map((ev, idx) => (
                      <li key={idx} style={{ lineHeight: '1.4' }}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notes.placeholders && notes.placeholders.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fffbeb', borderLeft: '3.5px solid #f59e0b', border: '1px solid #fef3c7', borderLeftWidth: '3.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>⚠️</span>
                    <strong style={{ fontSize: '12px', color: '#b45309' }}>Missing Facts / Placeholders</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {notes.placeholders.map((pl, idx) => (
                      <li key={idx} style={{ lineHeight: '1.4' }}>{pl}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notes.confirmation_needed && notes.confirmation_needed.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', borderLeft: '3.5px solid #ef4444', border: '1px solid #fee2e2', borderLeftWidth: '3.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>🔍</span>
                    <strong style={{ fontSize: '12px', color: '#b91c1c' }}>Confirmation Required</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#991b1b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {notes.confirmation_needed.map((conf, idx) => (
                      <li key={idx} style={{ lineHeight: '1.4' }}>{conf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  )
);
