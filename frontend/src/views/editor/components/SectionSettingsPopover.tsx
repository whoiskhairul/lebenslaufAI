import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from '../../EditorNew.module.css';

export interface SectionSettingsPopoverProps {
  sectionId: string;
  sec: any;
  popoverPosition: { top: number; left: number } | null;
  setSections: React.Dispatch<React.SetStateAction<any[]>>;
  onClose: () => void;
  setEditableExperiences: React.Dispatch<React.SetStateAction<any[]>>;
  setEditableProjects: React.Dispatch<React.SetStateAction<any[]>>;
  setEditableEducations: React.Dispatch<React.SetStateAction<any[]>>;
  openSectionAiModal: (sectionId: string) => void;
}

export const SectionSettingsPopover: React.FC<SectionSettingsPopoverProps> = ({
  sectionId,
  sec,
  popoverPosition,
  setSections,
  onClose,
  setEditableExperiences,
  setEditableProjects,
  setEditableEducations,
  openSectionAiModal
}) => {
  const localStyles = sec?.customStyles || {};

  const updateStyle = (key: string, value: any) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      customStyles: { ...s.customStyles, [key]: value }
    } : s));
    window.dispatchEvent(new Event('cv-style-change'));
  };

  const topPos = popoverPosition ? Math.max(60, Math.min(window.innerHeight - 520, popoverPosition.top - 10)) : 100;
  const leftPos = popoverPosition ? Math.max(16, popoverPosition.left - 305) : 100;

  return createPortal(
    <div
      className={`${styles.portalPopoverCard} glass-card no-print`}
      style={{
        position: 'fixed',
        top: `${topPos}px`,
        left: `${leftPos}px`,
        width: '290px',
        zIndex: 999999
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.popoverHeader}>
        <h4>Customize {sec?.name}</h4>
        <button type="button" onClick={onClose} className={styles.popoverCloseBtn}>
          <X size={12} />
        </button>
      </div>

      <div className={styles.popoverBody}>
        <div className={styles.popoverControlGroup}>
          <label><span>Heading Size</span><strong>{localStyles.headingSize || 16}px</strong></label>
          <input
            type="range"
            min="12"
            max="32"
            step="0.5"
            value={localStyles.headingSize || 16}
            onChange={(e) => updateStyle('headingSize', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Text Size</span><strong>{localStyles.fontSize || 13}px</strong></label>
          <input
            type="range"
            min="10"
            max="24"
            step="0.5"
            value={localStyles.fontSize || 13}
            onChange={(e) => updateStyle('fontSize', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Line Height</span><strong>{localStyles.lineHeight || 1.4}</strong></label>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.05"
            value={localStyles.lineHeight || 1.4}
            onChange={(e) => updateStyle('lineHeight', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Section Spacing</span><strong>{localStyles.spacing || 20}px</strong></label>
          <input
            type="range"
            min="5"
            max="60"
            step="0.5"
            value={localStyles.spacing || 20}
            onChange={(e) => updateStyle('spacing', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Item Gap</span><strong>{localStyles.itemGap || 12}px</strong></label>
          <input
            type="range"
            min="0"
            max="40"
            step="0.5"
            value={localStyles.itemGap || 12}
            onChange={(e) => updateStyle('itemGap', parseFloat(e.target.value))}
          />
        </div>

        {sec?.type !== 'summary' && sec?.type !== 'skills' && (
          <div className={styles.popoverControlGroup}>
            <label><span>Bullet Spacing</span><strong>{localStyles.bulletSpacing || 4}px</strong></label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={localStyles.bulletSpacing || 4}
              onChange={(e) => updateStyle('bulletSpacing', parseFloat(e.target.value))}
            />
          </div>
        )}

        <div className={styles.popoverInlinePickers}>
          <div className={styles.popoverControlGroup}>
            <label>Text Color</label>
            <input
              type="color"
              value={localStyles.textColor || '#334155'}
              onChange={(e) => updateStyle('textColor', e.target.value)}
            />
          </div>
          <div className={styles.popoverControlGroup}>
            <label>Heading Color</label>
            <input
              type="color"
              value={localStyles.headingColor || '#0f172a'}
              onChange={(e) => updateStyle('headingColor', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.popoverToggles}>
          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${localStyles.fontWeight === 'bold' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateStyle('fontWeight', localStyles.fontWeight === 'bold' ? 'normal' : 'bold')}
            title="Toggle Bold Body Text"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${localStyles.fontStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateStyle('fontStyle', localStyles.fontStyle === 'italic' ? 'normal' : 'italic')}
            title="Toggle Italic Body Text"
          >
            <em>I</em>
          </button>

          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${localStyles.headingWeight === 'normal' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateStyle('headingWeight', localStyles.headingWeight === 'normal' ? 'bold' : 'normal')}
            title="Toggle Bold Heading"
          >
            <strong>H-B</strong>
          </button>

          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${localStyles.headingStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateStyle('headingStyle', localStyles.headingStyle === 'italic' ? 'normal' : 'italic')}
            title="Toggle Italic Heading"
          >
            <em>H-I</em>
          </button>
        </div>

        {sec?.type === 'custom' && (
          <div className={styles.popoverControlGroup}>
            <label><span>Format</span></label>
            <select
              value={sec.customFormat || 'bullets'}
              onChange={(e) => {
                const val = e.target.value as 'bullets' | 'keyvalue';
                setSections(prev => prev.map(s => s.id === sectionId ? {
                  ...s,
                  customFormat: val,
                  keyValuePairs: val === 'keyvalue' ? (s.keyValuePairs || [{ key: 'Label', value: 'Description' }]) : undefined
                } : s));
              }}
              className={styles.popoverSelect}
            >
              <option value="bullets">Multi-bullet list</option>
              <option value="keyvalue">Key-Value list</option>
            </select>
          </div>
        )}

        <div className={styles.popoverActionsRow}>
          {sec?.type === 'experience' && (
            <button
              type="button"
              onClick={() => {
                setEditableExperiences(prev => [...prev, {
                  id: `exp_${Date.now()}`,
                  company: 'Company Name',
                  position: 'Job Title',
                  location: 'City, Country',
                  start_date: 'Start Date',
                  end_date: 'End Date',
                  bullets: ['Add key achievement or responsibility...']
                }]);
              }}
              className={styles.popoverAddBtn}
            >
              + Add Experience
            </button>
          )}

          {sec?.type === 'projects' && (
            <button
              type="button"
              onClick={() => {
                setEditableProjects(prev => [...prev, {
                  id: `proj_${Date.now()}`,
                  title: 'Project Title',
                  role: 'Role',
                  date: 'Date',
                  technologies: ['Tech 1', 'Tech 2'],
                  bullets: ['Add key project accomplishment...']
                }]);
              }}
              className={styles.popoverAddBtn}
            >
              + Add Project
            </button>
          )}

          {sec?.type === 'education' && (
            <button
              type="button"
              onClick={() => {
                setEditableEducations(prev => [...prev, {
                  id: `edu_${Date.now()}`,
                  institution: 'University / Institute Name',
                  degree: 'Degree',
                  field_of_study: 'Field of Study',
                  start_date: 'Start Year',
                  end_date: 'End Year',
                  location: 'City, Country'
                }]);
              }}
              className={styles.popoverAddBtn}
            >
              + Add Education
            </button>
          )}

          <button
            type="button"
            onClick={() => openSectionAiModal(sectionId)}
            className={styles.popoverAiBtn}
          >
            ✨ AI Section Polish
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
