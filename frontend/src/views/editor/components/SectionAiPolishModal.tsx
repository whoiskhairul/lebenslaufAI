import React from 'react';
import { Sparkles, X, RefreshCw, Wand2 } from 'lucide-react';
import styles from '../../EditorNew.module.css';

export interface SectionAiPolishModalProps {
  openSectionAiModalId: string;
  onClose: () => void;
  sectionAiScope: string;
  setSectionAiScope: (scope: string) => void;
  sectionAiPrompt: string;
  setSectionAiPrompt: (prompt: string) => void;
  isGeneratingSectionAi: boolean;
  sectionAiProposal: {
    sectionId: string;
    originalText: string;
    proposedText: string;
    payload: any;
  } | null;
  setSectionAiProposal: (proposal: any) => void;
  getSectionAiScopeOptions: (sectionId: string) => Array<{ id: string; label: string }>;
  handleGenerateSectionAi: (sectionId: string, customPrompt?: string) => void;
  handleAcceptSectionAiProposal: () => void;
}

export const SectionAiPolishModal: React.FC<SectionAiPolishModalProps> = ({
  openSectionAiModalId,
  onClose,
  sectionAiScope,
  setSectionAiScope,
  sectionAiPrompt,
  setSectionAiPrompt,
  isGeneratingSectionAi,
  sectionAiProposal,
  setSectionAiProposal,
  getSectionAiScopeOptions,
  handleGenerateSectionAi,
  handleAcceptSectionAiProposal
}) => {
  return (
    <div className={styles.sectionAiModalOverlay} onClick={onClose}>
      <div className={styles.sectionAiModalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sectionAiModalHeader}>
          <div className={styles.sectionAiModalTitle}>
            <Sparkles size={16} className={styles.sparkleIconGlow} />
            <span>AI Section Polish & Job Tailor</span>
          </div>
          <button type="button" className={styles.popoverClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className={styles.sectionAiModalBody}>
          <div className={styles.sectionAiPromptSection}>
            <div className={styles.sectionAiScopeRow}>
              <label>Select Target Scope:</label>
              <select
                className={styles.sectionAiScopeSelect}
                value={sectionAiScope}
                onChange={(e) => {
                  setSectionAiScope(e.target.value);
                  setSectionAiProposal(null);
                }}
              >
                {getSectionAiScopeOptions(openSectionAiModalId).map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label>Choose AI Optimization Objective or type custom prompt:</label>
            <div className={styles.sectionAiPresetChips}>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Tailor to target job description with high-impact keywords")}>
                🎯 Tailor to Job
              </button>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Highlight quantifiable metrics and technical results")}>
                📊 Metrics & Impact
              </button>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Optimize key industry terminology for ATS screening")}>
                🔍 ATS Polish
              </button>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Make concise with strong action verbs")}>
                💥 Punchier
              </button>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Enhance action verbs and quantify achievements")}>
                ⚡ Strong Action Verbs
              </button>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Fix grammar, spelling, and executive professional tone")}>
                ✨ Polish Grammar & Tone
              </button>
              <button type="button" onClick={() => handleGenerateSectionAi(openSectionAiModalId, "Make concise, punchy, and remove filler words")}>
                📉 Condense Section
              </button>
            </div>
            <div className={styles.sectionAiInputRow}>
              <input
                type="text"
                placeholder="e.g. Focus on technical leadership and cloud infrastructure..."
                value={sectionAiPrompt}
                onChange={(e) => setSectionAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sectionAiPrompt.trim()) {
                    handleGenerateSectionAi(openSectionAiModalId, sectionAiPrompt);
                  }
                }}
              />
              <button
                type="button"
                className={styles.sectionAiSubmitBtn}
                disabled={isGeneratingSectionAi}
                onClick={() => handleGenerateSectionAi(openSectionAiModalId, sectionAiPrompt)}
              >
                {isGeneratingSectionAi ? <RefreshCw size={14} className={styles.spinIcon} /> : <Wand2 size={14} />}
                {isGeneratingSectionAi ? 'Generating...' : 'Generate AI Proposal'}
              </button>
            </div>
          </div>

          {sectionAiProposal && (
            <div className={styles.diffComparisonContainer}>
              <div className={styles.diffHeaderRow}>
                <span className={styles.diffOriginalBadge}>Current Section Content</span>
                <span className={styles.diffProposedBadge}>✨ AI Enhanced Proposal</span>
              </div>
              <div className={styles.diffGrid}>
                <div className={styles.diffBoxOriginal}>
                  <pre>{sectionAiProposal.originalText || '(Section currently empty)'}</pre>
                </div>
                <div className={styles.diffBoxProposed}>
                  <pre>{sectionAiProposal.proposedText}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sectionAiModalFooter}>
          <button type="button" className={styles.cancelAiBtn} onClick={onClose}>
            Cancel
          </button>
          {sectionAiProposal && (
            <button type="button" className={styles.acceptAiBtn} onClick={handleAcceptSectionAiProposal}>
              Accept & Apply AI Polish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
