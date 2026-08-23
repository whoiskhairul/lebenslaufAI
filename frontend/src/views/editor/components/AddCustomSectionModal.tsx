import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import styles from '../../EditorNew.module.css';

export type CustomSectionFormat = 'bullets' | 'keyvalue' | 'entries' | 'paragraph';

export interface AddCustomSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSection: (title: string, format: CustomSectionFormat) => void;
}

interface LayoutOption {
  id: CustomSectionFormat;
  title: string;
  description: string;
  wireframe: React.ReactNode;
}

// Minimalist schematic SVG wireframe diagrams
const WIREFRAME_BULLETS = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="4" cy="6" r="1.5" fill="currentColor" />
    <line x1="9" y1="6" x2="20" y2="6" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    <line x1="9" y1="18" x2="16" y2="18" />
  </svg>
);

const WIREFRAME_KEYVALUE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="9" y2="6" strokeWidth="2.5" />
    <line x1="12" y1="6" x2="21" y2="6" strokeDasharray="1 1" />
    <line x1="3" y1="12" x2="8" y2="12" strokeWidth="2.5" />
    <line x1="11" y1="12" x2="21" y2="12" strokeDasharray="1 1" />
    <line x1="3" y1="18" x2="10" y2="18" strokeWidth="2.5" />
    <line x1="13" y1="18" x2="19" y2="18" strokeDasharray="1 1" />
  </svg>
);

const WIREFRAME_ENTRIES = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="5" x2="13" y2="5" strokeWidth="2.5" />
    <line x1="16" y1="5" x2="21" y2="5" />
    <line x1="3" y1="9" x2="11" y2="9" strokeWidth="1.5" strokeOpacity="0.7" />
    <circle cx="5" cy="14" r="1" fill="currentColor" />
    <line x1="8" y1="14" x2="21" y2="14" strokeWidth="1.5" />
    <circle cx="5" cy="18" r="1" fill="currentColor" />
    <line x1="8" y1="18" x2="17" y2="18" strokeWidth="1.5" />
  </svg>
);

const WIREFRAME_PARAGRAPH = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="5" x2="21" y2="5" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="13" x2="21" y2="13" />
    <line x1="3" y1="17" x2="14" y2="17" />
  </svg>
);

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'bullets',
    title: 'Bullet Points',
    description: 'For credentials, honors, accomplishments',
    wireframe: WIREFRAME_BULLETS
  },
  {
    id: 'keyvalue',
    title: 'Key-Value Pairs',
    description: 'For proficiencies, tools, categories',
    wireframe: WIREFRAME_KEYVALUE
  },
  {
    id: 'entries',
    title: 'Structured Entries',
    description: 'For leadership, roles with dates/places',
    wireframe: WIREFRAME_ENTRIES
  },
  {
    id: 'paragraph',
    title: 'Narrative Paragraph',
    description: 'For continuous executive statement or bio',
    wireframe: WIREFRAME_PARAGRAPH
  }
];

export const AddCustomSectionModal: React.FC<AddCustomSectionModalProps> = ({
  isOpen,
  onClose,
  onCreateSection
}) => {
  const [sectionTitle, setSectionTitle] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<CustomSectionFormat>('bullets');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSectionTitle('');
      setSelectedFormat('bullets');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = sectionTitle.trim();
    if (!cleanTitle) {
      setErrorMsg('Please enter a title for your custom section.');
      inputRef.current?.focus();
      return;
    }

    onCreateSection(cleanTitle, selectedFormat);
    onClose();
  };

  const displayTitle = sectionTitle.trim() || 'YOUR SECTION TITLE';

  return (
    <div className={styles.sectionAiModalOverlay} onClick={onClose}>
      <div
        className={styles.addCustomSectionModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={styles.sectionAiModalHeader}>
          <div className={styles.sectionAiModalTitle}>
            <Sparkles size={16} style={{ color: 'var(--primary, #6366f1)' }} />
            <span>Add Custom Section</span>
          </div>
          <button
            type="button"
            className={styles.popoverClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className={styles.addCustomSingleBody}>
          {/* Section Title Input */}
          <div className={styles.addCustomFieldGroup}>
            <label className={styles.addCustomLabel}>
              Section Title <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              className={`${styles.addCustomTitleInput} ${errorMsg ? styles.addCustomInputError : ''}`}
              placeholder="Enter section name (e.g. Certifications, Leadership, Projects)..."
              value={sectionTitle}
              onChange={(e) => {
                setSectionTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
            />
            {errorMsg && <span className={styles.addCustomErrorText}>{errorMsg}</span>}
          </div>

          {/* Layout Options Grid */}
          <div className={styles.addCustomLayoutSection}>
            <label className={styles.addCustomLabel}>Select Content Format</label>
            <div className={styles.addCustomLayoutGrid}>
              {LAYOUT_OPTIONS.map((opt) => {
                const isSelected = selectedFormat === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`${styles.addCustomLayoutCard} ${isSelected ? styles.addCustomLayoutCardActive : ''}`}
                    onClick={() => setSelectedFormat(opt.id)}
                  >
                    <div className={styles.addCustomWireframeBox}>
                      {opt.wireframe}
                    </div>
                    <div className={styles.addCustomLayoutCardInfo}>
                      <div className={styles.addCustomLayoutCardTitle}>{opt.title}</div>
                    </div>
                    <div className={`${styles.addCustomRadioCircle} ${isSelected ? styles.addCustomRadioCircleActive : ''}`}>
                      {isSelected && <Check size={10} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Section Preview Card below layout choices */}
          <div className={styles.addCustomLivePaper}>
            <div className={styles.addCustomPreviewHeader}>
              <span className={styles.addCustomPresetLabel}>Live Canvas Preview</span>
              <span className={styles.addCustomPreviewBadge}>Resume Layout</span>
            </div>

            <div className={styles.addCustomPreviewSection}>
              <div className={styles.addCustomPreviewHeading}>
                <span>{displayTitle}</span>
              </div>

              <div className={styles.addCustomPreviewContent}>
                {selectedFormat === 'bullets' && (
                  <>
                    <div className={styles.addCustomPreviewBulletRow}>
                      <span className={styles.addCustomPreviewBulletDot}>•</span>
                      <span>AWS Certified Solutions Architect – Associate (2024)</span>
                    </div>
                    <div className={styles.addCustomPreviewBulletRow}>
                      <span className={styles.addCustomPreviewBulletDot}>•</span>
                      <span>First Place Winner, Global FinTech Hackathon</span>
                    </div>
                  </>
                )}

                {selectedFormat === 'keyvalue' && (
                  <>
                    <div className={styles.addCustomPreviewKvRow}>
                      <span className={styles.addCustomPreviewKvKey}>Core Stack:</span>
                      <span className={styles.addCustomPreviewKvVal}>TypeScript, React, Python, PostgreSQL</span>
                    </div>
                    <div className={styles.addCustomPreviewKvRow}>
                      <span className={styles.addCustomPreviewKvKey}>Methods:</span>
                      <span className={styles.addCustomPreviewKvVal}>Agile / Scrum, System Architecture</span>
                    </div>
                  </>
                )}

                {selectedFormat === 'entries' && (
                  <>
                    <div className={styles.addCustomPreviewEntryHeader}>
                      <span className={styles.addCustomPreviewEntryTitle}>Lead Contributor / Role</span>
                      <span className={styles.addCustomPreviewEntryDate}>2023 – Present</span>
                    </div>
                    <div className={styles.addCustomPreviewEntrySub}>
                      Open Source Initiative, Berlin, Germany
                    </div>
                    <div className={styles.addCustomPreviewBulletRow} style={{ marginTop: '2px' }}>
                      <span className={styles.addCustomPreviewBulletDot}>•</span>
                      <span>Architected high-throughput data streaming pipeline with Kafka.</span>
                    </div>
                  </>
                )}

                {selectedFormat === 'paragraph' && (
                  <p className={styles.addCustomPreviewParagraph}>
                    Dedicated engineering leader with 7+ years of experience spearheading distributed systems architecture, leading agile squads, and delivering mission-critical software solutions.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className={styles.addCustomModalFooter}>
            <button
              type="button"
              className={styles.cancelCustomModalBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createCustomSectionBtn}
            >
              <Sparkles size={14} />
              <span>Create Section</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
