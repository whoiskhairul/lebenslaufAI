import React, { useState } from 'react';
import {
  GraduationCap, Plus, Trash, ArrowUp, ArrowDown, Sparkles, MapPin, Calendar,
  ChevronDown, ChevronUp
} from 'lucide-react';
import styles from '../../../EditorNew.module.css';

export interface EducationItem {
  id: string;
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  bullets?: string[];
}

export interface EducationEditorProps {
  sectionName: string;
  onRenameSection: (newName: string) => void;
  educations: EducationItem[];
  setEducations: React.Dispatch<React.SetStateAction<EducationItem[]>>;
  onAddEducation: () => void;
  onPolishBullet?: (bulletText: string, onAccept: (newText: string) => void) => void;
}

export const EducationEditor: React.FC<EducationEditorProps> = ({
  sectionName,
  onRenameSection,
  educations,
  setEducations,
  onAddEducation,
  onPolishBullet
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (educations.length > 0) {
      initial[educations[0].id || 'edu_0'] = true;
    }
    return initial;
  });

  const toggleExpand = (cardKey: string) => {
    setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    educations.forEach((edu, idx) => {
      all[edu.id || `edu_${idx}`] = true;
    });
    setExpandedCards(all);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  const handleUpdateEdu = (index: number, updates: Partial<EducationItem>) => {
    setEducations(prev => prev.map((edu, i) => i === index ? { ...edu, ...updates } : edu));
  };

  const handleDeleteEdu = (index: number) => {
    if (window.confirm('Delete this education entry?')) {
      setEducations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMoveEdu = (index: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= educations.length) return;
    setEducations(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleAddBullet = (eduIndex: number) => {
    setEducations(prev => prev.map((edu, i) => {
      if (i !== eduIndex) return edu;
      const bullets = Array.isArray(edu.bullets) ? [...edu.bullets] : [];
      bullets.push('Graduated with Honors (Top 5% of class) • Relevant Coursework: Algorithms & AI Systems.');
      return { ...edu, bullets };
    }));
  };

  const handleUpdateBullet = (eduIndex: number, bulletIndex: number, newText: string) => {
    setEducations(prev => prev.map((edu, i) => {
      if (i !== eduIndex) return edu;
      const bullets = Array.isArray(edu.bullets) ? [...edu.bullets] : [];
      bullets[bulletIndex] = newText;
      return { ...edu, bullets };
    }));
  };

  const handleDeleteBullet = (eduIndex: number, bulletIndex: number) => {
    setEducations(prev => prev.map((edu, i) => {
      if (i !== eduIndex) return edu;
      const bullets = Array.isArray(edu.bullets) ? [...edu.bullets] : [];
      bullets.splice(bulletIndex, 1);
      return { ...edu, bullets };
    }));
  };

  const handleMoveBullet = (eduIndex: number, bulletIndex: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? bulletIndex - 1 : bulletIndex + 1;
    setEducations(prev => prev.map((edu, i) => {
      if (i !== eduIndex) return edu;
      const bullets = Array.isArray(edu.bullets) ? [...edu.bullets] : [];
      if (targetIdx < 0 || targetIdx >= bullets.length) return edu;
      const temp = bullets[bulletIndex];
      bullets[bulletIndex] = bullets[targetIdx];
      bullets[targetIdx] = temp;
      return { ...edu, bullets };
    }));
  };

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>🎓</span>
        <div>
          <h4 className={styles.sideEditorTitle}>Education & Academic Background</h4>
          <p className={styles.sideEditorSubtitle}>
            Detail your university degrees, institutions, graduation dates, GPA, and special academic honors.
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
            placeholder="e.g. Education / Ausbildung"
            onChange={(e) => onRenameSection(e.target.value)}
          />
        </div>
      </div>

      {/* Action Header: Add & Bulk Expand */}
      <div className={styles.sideListActionBar}>
        <button
          type="button"
          className={styles.sidePrimaryAddBtn}
          onClick={onAddEducation}
        >
          <Plus size={13} /> Add Education
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

      {/* Educations List */}
      <div className={styles.sideCardsContainer}>
        {educations.map((edu, eIdx) => {
          const cardKey = edu.id || `edu_${eIdx}`;
          const isExpanded = !!expandedCards[cardKey];
          const isOngoing = !edu.end_date ||
            edu.end_date.toLowerCase().trim() === 'present' ||
            edu.end_date.toLowerCase().trim() === 'heute' ||
            edu.end_date.toLowerCase().trim() === 'current';
          const bullets = Array.isArray(edu.bullets) ? edu.bullets : [];

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
                      {edu.degree || edu.field_of_study || `Education #${eIdx + 1}`}
                    </div>
                    <div className={styles.sideCardSecondaryTitle}>
                      {edu.institution || 'Institution'} {edu.location ? `• ${edu.location}` : ''}
                    </div>
                  </div>
                </div>

                <div className={styles.sideCardHeaderActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={eIdx === 0}
                    onClick={() => handleMoveEdu(eIdx, 'up')}
                    className={styles.sideIconBtn}
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={eIdx === educations.length - 1}
                    onClick={() => handleMoveEdu(eIdx, 'down')}
                    className={styles.sideIconBtn}
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEdu(eIdx)}
                    className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                    title="Delete Education"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>

              {/* Collapsible Card Body */}
              {isExpanded && (
                <div className={styles.sideCardBody}>
                  {/* Institution Name */}
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>Institution / University Name</label>
                    <input
                      type="text"
                      className={styles.sideTextInput}
                      placeholder="e.g. Technical University of Munich"
                      value={edu.institution || ''}
                      onChange={(e) => handleUpdateEdu(eIdx, { institution: e.target.value })}
                    />
                  </div>

                  {/* Degree & Field of Study */}
                  <div className={styles.sideTwinGrid}>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Degree</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        placeholder="e.g. Master of Science (M.Sc.)"
                        value={edu.degree || ''}
                        onChange={(e) => handleUpdateEdu(eIdx, { degree: e.target.value })}
                      />
                    </div>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Field of Study</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        placeholder="e.g. Computer Science"
                        value={edu.field_of_study || ''}
                        onChange={(e) => handleUpdateEdu(eIdx, { field_of_study: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      <MapPin size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Location
                    </label>
                    <input
                      type="text"
                      className={styles.sideTextInput}
                      placeholder="e.g. Munich, Germany"
                      value={edu.location || ''}
                      onChange={(e) => handleUpdateEdu(eIdx, { location: e.target.value })}
                    />
                  </div>

                  {/* Dates */}
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
                          placeholder="e.g. 10/2018"
                          value={edu.start_date || ''}
                          onChange={(e) => handleUpdateEdu(eIdx, { start_date: e.target.value })}
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
                          placeholder={isOngoing ? 'Present' : 'e.g. 09/2021'}
                          disabled={isOngoing}
                          value={isOngoing ? 'Present' : (edu.end_date || '')}
                          onChange={(e) => handleUpdateEdu(eIdx, { end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className={styles.sideDateOptionRow}>
                      <label className={styles.sideCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={isOngoing}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleUpdateEdu(eIdx, { end_date: 'Present' });
                            } else {
                              handleUpdateEdu(eIdx, { end_date: '' });
                            }
                          }}
                        />
                        <span>Currently enrolled / ongoing</span>
                      </label>
                    </div>
                  </div>

                  {/* Bullet Points / Honors / Coursework */}
                  <div className={styles.sideBulletsSection}>
                    <div className={styles.sideFieldLabelRow} style={{ marginBottom: '6px' }}>
                      <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
                        Honors, GPA & Key Coursework ({bullets.length})
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
                        <div key={`edu_${eIdx}_b_${bIdx}`} className={styles.sideBulletRow}>
                          <span className={styles.sideBulletHandle}>•</span>
                          <textarea
                            className={styles.sideBulletTextarea}
                            rows={2}
                            value={bullet}
                            placeholder="e.g. Thesis: Optimization Algorithms for Distributed Systems..."
                            onChange={(e) => handleUpdateBullet(eIdx, bIdx, e.target.value)}
                          />
                          <div className={styles.sideBulletActions}>
                            {onPolishBullet && (
                              <button
                                type="button"
                                className={styles.sideIconBtn}
                                onClick={() => onPolishBullet(bullet, (newTxt) => handleUpdateBullet(eIdx, bIdx, newTxt))}
                                title="AI Polish this bullet"
                              >
                                <Sparkles size={11} style={{ color: 'var(--primary, #6366f1)' }} />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={bIdx === 0}
                              onClick={() => handleMoveBullet(eIdx, bIdx, 'up')}
                              className={styles.sideIconBtn}
                              title="Move Up"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={bIdx === bullets.length - 1}
                              onClick={() => handleMoveBullet(eIdx, bIdx, 'down')}
                              className={styles.sideIconBtn}
                              title="Move Down"
                            >
                              <ArrowDown size={11} />
                            </button>
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
                        No coursework or honors listed. Click "+ Add Bullet" to add achievements.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {educations.length === 0 && (
        <div className={styles.sideEmptyState}>
          <GraduationCap size={28} className={styles.sideEmptyStateIcon} />
          <p>No education entries added yet.</p>
          <button
            type="button"
            className={styles.sidePrimaryAddBtn}
            onClick={onAddEducation}
          >
            <Plus size={13} /> Add First Education
          </button>
        </div>
      )}
    </div>
  );
};
