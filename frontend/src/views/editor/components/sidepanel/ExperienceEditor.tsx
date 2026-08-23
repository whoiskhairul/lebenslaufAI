import React, { useState } from 'react';
import {
  Briefcase, Plus, Trash, ArrowUp, ArrowDown, Sparkles, MapPin, Calendar, Check,
  ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { parseDate } from '../../utils/dateUtils';
import styles from '../../../EditorNew.module.css';

export interface ExperienceItem {
  id: string;
  company?: string;
  position?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

export interface ExperienceEditorProps {
  sectionName: string;
  onRenameSection: (newName: string) => void;
  experiences: ExperienceItem[];
  setExperiences: React.Dispatch<React.SetStateAction<ExperienceItem[]>>;
  onAddExperience: () => void;
  onPolishBullet?: (bulletText: string, onAccept: (newText: string) => void) => void;
}

export const ExperienceEditor: React.FC<ExperienceEditorProps> = ({
  sectionName,
  onRenameSection,
  experiences,
  setExperiences,
  onAddExperience,
  onPolishBullet
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (experiences.length > 0) {
      initial[experiences[0].id || 'exp_0'] = true;
    }
    return initial;
  });

  const toggleExpand = (cardKey: string) => {
    setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    experiences.forEach((exp, idx) => {
      all[exp.id || `exp_${idx}`] = true;
    });
    setExpandedCards(all);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  const handleUpdateExp = (index: number, updates: Partial<ExperienceItem>) => {
    setExperiences(prev => prev.map((exp, i) => i === index ? { ...exp, ...updates } : exp));
  };

  const handleDeleteExp = (index: number) => {
    if (window.confirm('Delete this experience entry?')) {
      setExperiences(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMoveExp = (index: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= experiences.length) return;
    setExperiences(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleAddBullet = (expIndex: number) => {
    setExperiences(prev => prev.map((exp, i) => {
      if (i !== expIndex) return exp;
      const bullets = Array.isArray(exp.bullets) ? [...exp.bullets] : [];
      bullets.push('Spearheaded key initiatives to improve system scalability and performance.');
      return { ...exp, bullets };
    }));
  };

  const handleUpdateBullet = (expIndex: number, bulletIndex: number, newText: string) => {
    setExperiences(prev => prev.map((exp, i) => {
      if (i !== expIndex) return exp;
      const bullets = Array.isArray(exp.bullets) ? [...exp.bullets] : [];
      bullets[bulletIndex] = newText;
      return { ...exp, bullets };
    }));
  };

  const handleDeleteBullet = (expIndex: number, bulletIndex: number) => {
    setExperiences(prev => prev.map((exp, i) => {
      if (i !== expIndex) return exp;
      const bullets = Array.isArray(exp.bullets) ? [...exp.bullets] : [];
      bullets.splice(bulletIndex, 1);
      return { ...exp, bullets };
    }));
  };

  const handleMoveBullet = (expIndex: number, bulletIndex: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? bulletIndex - 1 : bulletIndex + 1;
    setExperiences(prev => prev.map((exp, i) => {
      if (i !== expIndex) return exp;
      const bullets = Array.isArray(exp.bullets) ? [...exp.bullets] : [];
      if (targetIdx < 0 || targetIdx >= bullets.length) return exp;
      const temp = bullets[bulletIndex];
      bullets[bulletIndex] = bullets[targetIdx];
      bullets[targetIdx] = temp;
      return { ...exp, bullets };
    }));
  };

  // Duration Calculator helper
  const calculateDuration = (startStr?: string, endStr?: string) => {
    if (!startStr) return null;
    const start = parseDate(startStr);
    if (!start || typeof start === 'string') return null;

    const isPresent = !endStr || endStr.toLowerCase().trim() === 'present' || endStr.toLowerCase().trim() === 'heute' || endStr.toLowerCase().trim() === 'current';
    const end = isPresent ? 'Present' : parseDate(endStr);

    const now = new Date();
    const endYear = (typeof end === 'string' || !end) ? now.getFullYear() : end.year;
    const endMonth = (typeof end === 'string' || !end) ? (now.getMonth() + 1) : (end.month || 12);

    const startYear = start.year;
    const startMonth = start.month || 1;

    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (totalMonths <= 0) return null;

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`);
    return parts.join(' ');
  };

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>💼</span>
        <div>
          <h4 className={styles.sideEditorTitle}>Work Experience</h4>
          <p className={styles.sideEditorSubtitle}>
            Manage your employment history, job titles, achievements, and impact metrics.
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
            placeholder="e.g. Work Experience / Beruflicher Werdegang"
            onChange={(e) => onRenameSection(e.target.value)}
          />
        </div>
      </div>

      {/* Action Header: Add & Bulk Expand */}
      <div className={styles.sideListActionBar}>
        <button
          type="button"
          className={styles.sidePrimaryAddBtn}
          onClick={onAddExperience}
        >
          <Plus size={13} /> Add Position
        </button>
        <div className={styles.sideListActionControls}>
          <button
            type="button"
            className={styles.sideTextActionBtn}
            onClick={expandAll}
          >
            Expand All
          </button>
          <span className={styles.sideDividerDot}>•</span>
          <button
            type="button"
            className={styles.sideTextActionBtn}
            onClick={collapseAll}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Experiences List */}
      <div className={styles.sideCardsContainer}>
        {experiences.map((exp, eIdx) => {
          const cardKey = exp.id || `exp_${eIdx}`;
          const isExpanded = !!expandedCards[cardKey];
          const isPresent = !exp.end_date ||
            exp.end_date.toLowerCase().trim() === 'present' ||
            exp.end_date.toLowerCase().trim() === 'heute' ||
            exp.end_date.toLowerCase().trim() === 'current';
          const duration = calculateDuration(exp.start_date, exp.end_date);
          const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];

          return (
            <div key={cardKey} className={`${styles.sideItemCard} ${isExpanded ? styles.sideItemCardExpanded : ''}`}>
              {/* Header Bar */}
              <div
                className={styles.sideCardHeader}
                onClick={() => toggleExpand(cardKey)}
              >
                <div className={styles.sideCardHeaderTitleArea}>
                  <span className={styles.sideCardExpandIcon}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                  <div className={styles.sideCardMainTitles}>
                    <div className={styles.sideCardPrimaryTitle}>
                      {exp.position || `Position #${eIdx + 1}`}
                    </div>
                    <div className={styles.sideCardSecondaryTitle}>
                      {exp.company || 'Company'} {exp.location ? `• ${exp.location}` : ''}
                    </div>
                  </div>
                </div>

                <div className={styles.sideCardHeaderActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={eIdx === 0}
                    onClick={() => handleMoveExp(eIdx, 'up')}
                    className={styles.sideIconBtn}
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={eIdx === experiences.length - 1}
                    onClick={() => handleMoveExp(eIdx, 'down')}
                    className={styles.sideIconBtn}
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExp(eIdx)}
                    className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                    title="Delete Position"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>

              {/* Collapsible Card Body */}
              {isExpanded && (
                <div className={styles.sideCardBody}>
                  {/* Job Title */}
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>Job Title / Role</label>
                    <input
                      type="text"
                      className={styles.sideTextInput}
                      placeholder="e.g. Senior Software Engineer"
                      value={exp.position || ''}
                      onChange={(e) => handleUpdateExp(eIdx, { position: e.target.value })}
                    />
                  </div>

                  {/* Company & Location Grid */}
                  <div className={styles.sideTwinGrid}>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Company Name</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        placeholder="e.g. Acme Corp"
                        value={exp.company || ''}
                        onChange={(e) => handleUpdateExp(eIdx, { company: e.target.value })}
                      />
                    </div>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Location</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        placeholder="e.g. Munich, Germany"
                        value={exp.location || ''}
                        onChange={(e) => handleUpdateExp(eIdx, { location: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Dates & Duration */}
                  <div className={styles.sideFieldGroupCard} style={{ margin: '8px 0', padding: '10px' }}>
                    <div className={styles.sideTwinGrid}>
                      <div className={styles.sideFieldRow}>
                        <label className={styles.sideFieldLabel}>
                          <Calendar size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Start Date
                        </label>
                        <input
                          type="text"
                          className={styles.sideTextInput}
                          placeholder="e.g. 03/2021"
                          value={exp.start_date || ''}
                          onChange={(e) => handleUpdateExp(eIdx, { start_date: e.target.value })}
                        />
                      </div>

                      <div className={styles.sideFieldRow}>
                        <label className={styles.sideFieldLabel}>
                          <Calendar size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          End Date
                        </label>
                        <input
                          type="text"
                          className={styles.sideTextInput}
                          placeholder={isPresent ? 'Present' : 'e.g. 08/2024'}
                          disabled={isPresent}
                          value={isPresent ? 'Present' : (exp.end_date || '')}
                          onChange={(e) => handleUpdateExp(eIdx, { end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className={styles.sideDateOptionRow}>
                      <label className={styles.sideCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleUpdateExp(eIdx, { end_date: 'Present' });
                            } else {
                              handleUpdateExp(eIdx, { end_date: '' });
                            }
                          }}
                        />
                        <span>Currently working here (Present)</span>
                      </label>
                      {duration && (
                        <span className={styles.sideDurationBadge}>
                          ⏱ {duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bullet Points Manager */}
                  <div className={styles.sideBulletsSection}>
                    <div className={styles.sideFieldLabelRow} style={{ marginBottom: '6px' }}>
                      <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
                        Key Responsibilities & Achievements ({bullets.length})
                      </label>
                      <button
                        type="button"
                        className={styles.sideInlineAddBtn}
                        onClick={() => handleAddBullet(eIdx)}
                      >
                        <Plus size={11} /> Add Bullet
                      </button>
                    </div>

                    <div className={styles.sideBulletsList}>
                      {bullets.map((bullet, bIdx) => (
                        <div key={`exp_${eIdx}_b_${bIdx}`} className={styles.sideBulletRow}>
                          <span className={styles.sideBulletHandle}>•</span>
                          <textarea
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            className={styles.sideBulletTextarea}
                            value={bullet}
                            placeholder="Describe your achievement with metrics..."
                            onChange={(e) => handleUpdateBullet(eIdx, bIdx, e.target.value)}
                            style={{ resize: 'none', overflowY: 'hidden' }}
                          />
                          <div className={styles.sideBulletActions}>
                            <button
                              type="button"
                              onClick={() => handleDeleteBullet(eIdx, bIdx)}
                              className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                              title="Delete Bullet"
                            >
                              <Trash size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {bullets.length === 0 && (
                      <div className={styles.sideEmptyListHint}>
                        No bullet points yet. Click "+ Add Bullet" to describe your work.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {experiences.length === 0 && (
        <div className={styles.sideEmptyState}>
          <Briefcase size={28} className={styles.sideEmptyStateIcon} />
          <p>No work experience entries added.</p>
          <button
            type="button"
            className={styles.sidePrimaryAddBtn}
            onClick={onAddExperience}
          >
            <Plus size={13} /> Add First Experience
          </button>
        </div>
      )}
    </div>
  );
};
