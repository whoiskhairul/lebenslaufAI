import React from 'react';
import { Wand2, Sparkles, ShieldAlert, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { InputField } from '../../../components/InputField';
import { CompanyAutocomplete } from '../../../components/CompanyAutocomplete';
import ed from '../../../views/editorStyles';
import panel from './TailorPanel.module.css';
import { getParsedLetter } from '../utils/parsedLetter';

const styles = ed;

interface TailorPanelProps {
  editorTabIsResume: boolean;
  company: string;
  setCompany: (v: string) => void;
  companyDomain: string;
  setCompanyDomain: (v: string) => void;
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
  letterError?: string | null;
  onClearLetterError?: () => void;
  onGenerateLetter: (company: string, position: string) => void;
}

const LetterErrorBanner: React.FC<{ message: string; onRetry: () => void; onDismiss?: () => void }> = ({
  message,
  onRetry,
  onDismiss,
}) => (
  <div className={panel.errorBanner} role="alert" aria-live="assertive">
    <AlertTriangle size={16} className={panel.errorIcon} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <strong>Cover letter could not be generated</strong>
      <span>{message}</span>
      <div className={panel.errorActions}>
        <button type="button" className={panel.retryBtn} onClick={onRetry}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={13} /> Try again
          </span>
        </button>
        {onDismiss && (
          <button type="button" className={panel.dismissBtn} onClick={onDismiss}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <X size={13} /> Dismiss
            </span>
          </button>
        )}
      </div>
    </div>
  </div>
);

export const TailorPanel: React.FC<TailorPanelProps> = (p) => (
  <div className={panel.panel}>
  {p.editorTabIsResume ? (
    // CV Tailoring UI
    <>
      <form onSubmit={p.onTailor} className={`${styles.form} ${panel.card}`}>
        <h3 className={panel.title}>Job Listing Details</h3>
        <div className={panel.grid2}>
          <CompanyAutocomplete
            id="editorCompany"
            label="Company Name"
            placeholder="e.g. Stripe"
            value={p.company}
            domain={p.companyDomain}
            onCompanyChange={p.setCompany}
            onDomainChange={p.setCompanyDomain}
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
          <div className={panel.fieldGroup} style={{ marginTop: '12px' }}>
            <label className={panel.fieldLabel}>
              Target Output Language
            </label>
            <div className={panel.optionGrid}>
              <button
                type="button"
                onClick={() => p.setTargetLanguage('en')}
                aria-pressed={p.targetLanguage === 'en'}
                className={`${panel.optionBtn} ${p.targetLanguage === 'en' ? panel.optionBtnActive : ''}`}
              >
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => p.setTargetLanguage('de')}
                aria-pressed={p.targetLanguage === 'de'}
                className={`${panel.optionBtn} ${p.targetLanguage === 'de' ? panel.optionBtnActive : ''}`}
              >
                <span>Deutsch</span>
              </button>
            </div>

            <label className={panel.fieldLabel}>
              ATS Keyword Strategy
            </label>
            <div className={panel.optionGrid}>
              <button
                type="button"
                onClick={() => p.setAggressiveMode(false)}
                aria-pressed={!p.aggressiveMode}
                className={`${panel.optionBtn} ${panel.optionBtnStack} ${!p.aggressiveMode ? panel.optionBtnActive : ''}`}
              >
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Standard</span>
                <span className={panel.optionSub}>Strict Profile Match</span>
              </button>
              <button
                type="button"
                onClick={() => p.setAggressiveMode(true)}
                aria-pressed={p.aggressiveMode}
                className={`${panel.optionBtn} ${panel.optionBtnStack} ${p.aggressiveMode ? panel.optionBtnActive : ''}`}
              >
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Aggressive</span>
                <span className={panel.optionSub}>High ATS Optimization</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Selective Projects List in Side Panel */}
        <div className={panel.projectsCard}>
          <div
            onClick={() => p.setIsProjectsCollapsed(!p.isProjectsCollapsed)}
            className={panel.projectsHeader}
            role="button"
            tabIndex={0}
            aria-expanded={!p.isProjectsCollapsed}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                p.setIsProjectsCollapsed(!p.isProjectsCollapsed);
              }
            }}
          >
            <div className={panel.projectsTitle}>
              <span>Include Projects ({p.masterProjects.length > 0 ? `${p.selectedProjectIds.length} of ${p.masterProjects.length} selected` : 'None added in profile'})</span>
            </div>
            <button
              type="button"
              tabIndex={-1}
              className={panel.projectsToggle}
              onClick={(e) => {
                e.stopPropagation();
                p.setIsProjectsCollapsed(!p.isProjectsCollapsed);
              }}
            >
              {p.isProjectsCollapsed ? 'Expand ▼' : 'Collapse ▲'}
            </button>
          </div>

          {!p.isProjectsCollapsed && (
            <div className={panel.projectsList}>
              {p.masterProjects.length > 0 ? (
                p.masterProjects.map(proj => {
                  const isChecked = p.selectedProjectIds.includes(proj.id);
                  return (
                    <label
                      key={proj.id}
                      className={`${panel.projectRow} ${isChecked ? panel.projectRowChecked : ''}`}
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
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <div className={panel.projectMeta}>
                        <strong style={{ display: 'block', lineHeight: '1.2' }}>{proj.title}</strong>
                        {proj.role && <span className={panel.projectRole}>{proj.role}</span>}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className={panel.projectsEmpty}>
                  No projects found in Master Profile. Add projects in your profile settings to filter them here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Missing Profile Details Diagnostic Widget in Side Panel */}
        {(() => {
          const infoToCheck = p.currentVersion ? p.editablePersonalInfo : (p.masterProfileInfo || {});
          const missing: { field: string; label: string }[] = [];
          if (!infoToCheck.linkedin) missing.push({ field: 'linkedin', label: 'LinkedIn Profile URL' });
          if (!infoToCheck.github) missing.push({ field: 'github', label: 'GitHub Profile URL' });
          if (!infoToCheck.phone) missing.push({ field: 'phone', label: 'Phone Number' });
          if (!infoToCheck.location) missing.push({ field: 'location', label: 'Location / City' });
          if (!infoToCheck.email) missing.push({ field: 'email', label: 'Email Address' });

          if (missing.length === 0) return null;

          return (
            <div className={panel.missingCard}>
              <div className={panel.missingTitle}>
                <ShieldAlert size={14} />
                <span>Missing Profile Details ({missing.length})</span>
              </div>
              <p className={panel.missingText}>
                {p.currentVersion
                  ? "The following optional details are missing from your active canvas and won't appear on your CV:"
                  : "The following optional details are missing from your Master Profile:"}
              </p>
              <div className={panel.missingChips}>
                {missing.map((item, idx) => (
                  <span key={idx} className={panel.missingChip}>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <div className={panel.checkRow}>
          <input
            type="checkbox"
            id="saveAutomatically"
            checked={p.saveAutomatically}
            onChange={(e) => p.setSaveAutomatically(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
          <label htmlFor="saveAutomatically" className={panel.checkLabel}>
            Save tailored copy automatically
          </label>
        </div>

        <Button type="submit" isLoading={p.isLoading} className={`${styles.tailorBtn} ${panel.fullWidthBtn}`}>
          <Wand2 size={16} />
          <span>Analyze & Tailor</span>
        </Button>
      </form>

      {p.currentVersion && (
        <div className={`${panel.card} ${panel.trackingCard}`}>
          <div className={panel.trackingTitle}>
            {p.applicationTracked ? '✓ Tracking this Application' : 'Track this job application?'}
          </div>
          {!p.applicationTracked ? (
            <Button onClick={p.onTrackApplication} isLoading={p.isTrackingLoading} className={panel.fullWidthBtn}>
              Add to Application Tracking
            </Button>
          ) : (
            <div className={panel.trackingHint}>
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
        className={`${styles.form} ${panel.card}`}
      >
        <h3 className={panel.title}>Cover Letter Tailoring</h3>
        <div className={panel.grid2}>
          <CompanyAutocomplete
            id="letterCompany"
            label="Company Name"
            placeholder="e.g. Stripe"
            value={p.company}
            domain={p.companyDomain}
            onCompanyChange={p.setCompany}
            onDomainChange={p.setCompanyDomain}
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

        {p.letterError && (
          <LetterErrorBanner
            message={p.letterError}
            onRetry={() => p.onGenerateLetter(p.company, p.position)}
            onDismiss={p.onClearLetterError}
          />
        )}

        <div className={panel.grid2}>
          <div className={styles.selectGroup}>
            <label htmlFor="letterTone">Writing Tone</label>
            <select
              id="letterTone"
              value={p.letterTone}
              onChange={(e) => p.setLetterTone(e.target.value)}
              className={panel.select}
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
              className={panel.select}
            >
              <option value="auto">Auto (Match Resume Language)</option>
              <option value="en">English</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>

        <Button type="submit" isLoading={p.isLetterLoading} className={`${styles.tailorBtn} ${panel.fullWidthBtn}`}>
          <Sparkles size={16} />
          <span>Generate & Tailor Cover Letter</span>
        </Button>
      </form>

      <div className={`${styles.atsCard} ${panel.card}`}>
        <h3 className={panel.title}>Cover Letter Guidelines</h3>
        <div className={panel.guidelines}>
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
          <div className={`${styles.atsCard} ${panel.card} ${panel.auditCard}`}>
            <div className={panel.auditHeader}>
              <h3 className={panel.auditTitle}>
                <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                AI Generation Audit
              </h3>
              <span className={panel.auditBadge}>Active Audit</span>
            </div>

            <div className={panel.auditStack}>
              {notes.requirements_emphasized && notes.requirements_emphasized.length > 0 && (
                <div className={panel.auditBlock} style={{ borderLeft: '3.5px solid var(--primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px' }}>Emphasized Requirements</strong>
                  </div>
                  <ul>
                    {notes.requirements_emphasized.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notes.resume_evidence_used && notes.resume_evidence_used.length > 0 && (
                <div className={panel.auditBlock} style={{ borderLeft: '3.5px solid var(--success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px' }}>Evidence Used from CV</strong>
                  </div>
                  <ul>
                    {notes.resume_evidence_used.map((ev, idx) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notes.placeholders && notes.placeholders.length > 0 && (
                <div className={panel.auditBlock} style={{ borderLeft: '3.5px solid var(--warning)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px' }}>Missing Facts / Placeholders</strong>
                  </div>
                  <ul>
                    {notes.placeholders.map((pl, idx) => (
                      <li key={idx}>{pl}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notes.confirmation_needed && notes.confirmation_needed.length > 0 && (
                <div className={panel.auditBlock} style={{ borderLeft: '3.5px solid var(--danger)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px' }}>Confirmation Required</strong>
                  </div>
                  <ul>
                    {notes.confirmation_needed.map((conf, idx) => (
                      <li key={idx}>{conf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  )}
  </div>
);
