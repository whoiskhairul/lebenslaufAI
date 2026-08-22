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
}

export const SectionSettingsPopover: React.FC<SectionSettingsPopoverProps> = ({
  sectionId,
  sec,
  popoverPosition,
  setSections,
  onClose,
  setEditableExperiences,
  setEditableProjects,
  setEditableEducations
}) => {
  const localStyles = sec?.customStyles || {};

  const updateStyle = (key: string, value: any) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      customStyles: { ...s.customStyles, [key]: value }
    } : s));
    window.dispatchEvent(new Event('cv-style-change'));
  };

  const popoverWidth = 290;
  const popoverHeight = 440;
  const leftPos = popoverPosition
    ? Math.min(Math.max(340, popoverPosition.left + 35), (typeof window !== 'undefined' ? window.innerWidth : 1200) - popoverWidth - 16)
    : 340;
  const topPos = popoverPosition
    ? Math.min(Math.max(60, popoverPosition.top - 10), (typeof window !== 'undefined' ? window.innerHeight : 800) - popoverHeight - 16)
    : 100;

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

        <div className={styles.popoverActionsRow} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {sec?.type === 'experience' && (
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setEditableExperiences(prev => [...prev, {
                    id: `exp_${Date.now()}`,
                    company: 'Company Name',
                    position: 'Job Title',
                    location: 'City, Country',
                    start_date: '01/2026',
                    end_date: 'Present',
                    bullets: ['Describe your major contribution...']
                  }]);
                }}
                className={styles.popoverAddBtn}
                style={{ flex: 1 }}
              >
                + Add Experience
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditableExperiences(prev => {
                    if (prev.length === 0) {
                      return [{
                        id: `exp_${Date.now()}`,
                        company: 'Company Name',
                        position: 'Job Title',
                        location: 'City, Country',
                        start_date: '01/2026',
                        end_date: 'Present',
                        bullets: ['New key accomplishment...']
                      }];
                    }
                    const lastIdx = prev.length - 1;
                    return prev.map((exp, idx) => idx === lastIdx ? { ...exp, bullets: [...exp.bullets, 'New key accomplishment...'] } : exp);
                  });
                }}
                className={styles.popoverAddBtn}
                style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px dashed #6366f1' }}
                title="Append bullet to last experience item"
              >
                + Append Bullet
              </button>
            </div>
          )}

          {sec?.type === 'projects' && (
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setEditableProjects(prev => [...prev, {
                    id: `proj_${Date.now()}`,
                    title: 'Project Title',
                    role: 'Your Role / Contributions',
                    date: '2026',
                    link: 'https://github.com/username/repository',
                    technologies: ['React', 'TypeScript', 'Node.js'],
                    bullets: ['Describe project deliverables & technical output...']
                  }]);
                }}
                className={styles.popoverAddBtn}
                style={{ flex: 1 }}
              >
                + Add Project
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditableProjects(prev => {
                    if (prev.length === 0) {
                      return [{
                        id: `proj_${Date.now()}`,
                        title: 'Project Title',
                        role: 'Your Role',
                        date: '2026',
                        link: 'https://github.com/username/repository',
                        technologies: ['React', 'TypeScript'],
                        bullets: ['New project accomplishment...']
                      }];
                    }
                    const lastIdx = prev.length - 1;
                    return prev.map((proj, idx) => idx === lastIdx ? { ...proj, bullets: [...proj.bullets, 'New project accomplishment...'] } : proj);
                  });
                }}
                className={styles.popoverAddBtn}
                style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px dashed #6366f1' }}
                title="Append bullet to last project item"
              >
                + Append Bullet
              </button>
            </div>
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
                  start_date: '2022',
                  end_date: '2026',
                  location: 'City, Country'
                }]);
              }}
              className={styles.popoverAddBtn}
            >
              + Add Education
            </button>
          )}

          {sec?.type === 'custom' && (
            <button
              type="button"
              onClick={() => {
                setSections(prev => prev.map(s => {
                  if (s.id === sectionId) {
                    return { ...s, bullets: [...(s.bullets || []), 'New custom section point...'] };
                  }
                  return s;
                }));
              }}
              className={styles.popoverAddBtn}
            >
              + Append Bullet Point
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
