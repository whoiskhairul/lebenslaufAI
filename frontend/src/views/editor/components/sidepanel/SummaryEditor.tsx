import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import styles from '../../../EditorNew.module.css';

export interface SummaryEditorProps {
  sectionName: string;
  onRenameSection: (newName: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  onOpenAiPolish: () => void;
}

export const SummaryEditor: React.FC<SummaryEditorProps> = ({
  sectionName,
  onRenameSection,
  summary,
  setSummary,
  onOpenAiPolish
}) => {
  const charCount = summary ? summary.length : 0;
  const wordCount = summary ? summary.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>📝</span>
        <div>
          <h4 className={styles.sideEditorTitle}>Professional Summary</h4>
          <p className={styles.sideEditorSubtitle}>
            Craft a compelling executive pitch highlighting your key strengths, years of experience, and specialized domains.
          </p>
        </div>
      </div>

      {/* Section Title Customizer */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>Section Heading</label>
          <input
            type="text"
            className={styles.sideTextInput}
            value={sectionName}
            placeholder="e.g. Professional Summary / Über mich"
            onChange={(e) => onRenameSection(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Content Body */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldLabelRow} style={{ marginBottom: '8px' }}>
          <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
            <FileText size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Summary Text
          </label>
          <button
            type="button"
            className={styles.sideInlineAiBtn}
            onClick={onOpenAiPolish}
            title="AI Polish Summary"
          >
            <Sparkles size={12} /> AI Polish
          </button>
        </div>

        <textarea
          className={styles.sideTextAreaInput}
          rows={7}
          placeholder="Write a brief overview of your background, core specializations, and career achievements..."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        <div className={styles.sideCounterBar}>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
      </div>
    </div>
  );
};
