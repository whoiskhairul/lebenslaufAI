import React from 'react';
import { X } from 'lucide-react';
import styles from '../../../EditorNew.module.css';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';
import { formatDisplayDateRange } from './helpers';

export const EducationItemUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit, isMeasuring, targetLanguage,
    setEditableEducations,
    hoveredSectionId, setHoveredSectionId,
    renderHoverAiControls, isRephrasing,
    handleRemoveEducationBullet, handleBulletKeyDown
  } = p;
  const { isPP, isGerman, mergedStyles } = ctx;

  if (unit.type !== 'education-item') return null;
  const edu = unit.itemData;
  const eduIdx = unit.itemIndex!;
  const isSectionHovered = hoveredSectionId === unit.sectionId;

  return (
    <div
      className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)} ${isSectionHovered ? styles.sectionHoverActive : ''}`}
      style={{ ...mergedStyles, position: 'relative' }}
      onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
      onMouseLeave={() => setHoveredSectionId(null)}
    >
      {isPP || isGerman ? (
        <>
          <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
            <span className={isPP ? styles.ppDateRange : styles.germanDateRange}>
              <AutoSizeTextarea
                value={formatDisplayDateRange(edu.start_date, edu.end_date, targetLanguage)}
                onChange={(val) => {
                  const parts = val.split(' - ');
                  setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                }}
              />
            </span>
          </div>
          <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
            <h4 className={isPP ? styles.ppDegree : styles.germanDegree} style={{ color: '#3d7ee6' }}>
              <AutoSizeTextarea
                value={`${edu.degree || ''}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}`}
                onChange={(val) => {
                  const index = val.toLowerCase().indexOf(' in ');
                  let newDegree = val;
                  let newField = '';
                  if (index !== -1) {
                    newDegree = val.substring(0, index).trim();
                    newField = val.substring(index + 4).trim();
                  }
                  setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, degree: newDegree, field_of_study: newField } : e));
                }}
              />
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className={isPP ? styles.ppCompany : styles.germanCompany} style={{ fontWeight: 600 }}>
                <AutoSizeTextarea
                  value={edu.institution || ''}
                  onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, institution: val } : e))}
                />
              </div>
              <div className={isPP ? styles.ppLocation : styles.germanLocation} style={{ fontWeight: 400, opacity: 0.8 }}>
                <AutoSizeTextarea
                  value={edu.location || ''}
                  onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, location: val } : e))}
                />
              </div>
            </div>

            <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
              {(edu.bullets || []).map((bullet: string, bulletIdx: number) => {
                const inputId = `bullet-input-education-${edu.id}-${bulletIdx}`;
                const key = `edu-bullet-${eduIdx}-${bulletIdx}`;
                return (
                  <li key={bulletIdx} className={`${isPP ? styles.ppBulletItem : styles.germanBulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                    <span className={styles.bulletDot}>â€¢</span>
                    {renderHoverAiControls(key, bullet, [
                      { label: "Concise", prompt: "Make concise and academic" },
                      { label: "Coursework", prompt: "Highlight key relevant technical coursework & projects" },
                      { label: "Honors", prompt: "Emphasize honors, GPA, or academic distinctions" }
                    ])}
                    {!isMeasuring && (
                      <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveEducationBullet(eduIdx, bulletIdx)}
                          className={styles.deleteBulletBtn}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}

                    <div className={styles.bulletContent}>
                      {isRephrasing[key] ? (
                        <div className={styles.canvasSkeletonBlock}>
                          <div className={styles.skeletonLine} style={{ width: '92%' }} />
                        </div>
                      ) : (
                        <AutoSizeTextarea
                          id={inputId}
                          value={bullet}
                          onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? {
                            ...e,
                            bullets: (e.bullets || []).map((b: string, bI: number) => bI === bulletIdx ? val : b)
                          } : e))}
                          onKeyDown={(e) => handleBulletKeyDown(e, 'education', edu.id, eduIdx, bulletIdx, edu.bullets || [])}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : (
        <div style={{ width: '100%' }}>
          <div className={styles.itemMeta}>
            <strong style={{ color: '#3d7ee6' }}>
              <AutoSizeTextarea
                value={`${edu.degree || ''}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}`}
                onChange={(val) => {
                  const index = val.toLowerCase().indexOf(' in ');
                  let newDegree = val;
                  let newField = '';
                  if (index !== -1) {
                    newDegree = val.substring(0, index).trim();
                    newField = val.substring(index + 4).trim();
                  }
                  setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, degree: newDegree, field_of_study: newField } : e));
                }}
              />
            </strong>
            <span>
              <AutoSizeTextarea
                value={formatDisplayDateRange(edu.start_date, edu.end_date, targetLanguage)}
                onChange={(val) => {
                  const parts = val.split(' - ');
                  setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                }}
              />
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            <div className={styles.itemCompany} style={{ fontWeight: 600 }}>
              <AutoSizeTextarea
                value={edu.institution || ''}
                onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, institution: val } : e))}
              />
            </div>
            <div style={{ fontSize: '0.85em', color: '#64748b', fontWeight: 400, opacity: 0.8 }}>
              <AutoSizeTextarea
                value={edu.location || ''}
                onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, location: val } : e))}
              />
            </div>
          </div>

          <ul className={styles.bulletsList}>
            {(edu.bullets || []).map((bullet: string, bulletIdx: number) => {
              const inputId = `bullet-input-education-${edu.id}-${bulletIdx}`;
              const key = `edu-bullet-${eduIdx}-${bulletIdx}`;
              return (
                <li key={bulletIdx} className={`${styles.bulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                  <span className={styles.bulletDot}>â€¢</span>
                  {renderHoverAiControls(key, bullet, [
                    { label: "Concise", prompt: "Make concise and academic" },
                    { label: "Coursework", prompt: "Highlight key relevant technical coursework & projects" },
                    { label: "Honors", prompt: "Emphasize honors, GPA, or academic distinctions" }
                  ])}
                  {!isMeasuring && (
                    <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveEducationBullet(eduIdx, bulletIdx)}
                        className={styles.deleteBulletBtn}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  <div className={styles.bulletContent}>
                    {isRephrasing[key] ? (
                      <div className={styles.canvasSkeletonBlock}>
                        <div className={styles.skeletonLine} style={{ width: '92%' }} />
                      </div>
                    ) : (
                      <AutoSizeTextarea
                        id={inputId}
                        value={bullet}
                        onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? {
                          ...e,
                          bullets: (e.bullets || []).map((b: string, bI: number) => bI === bulletIdx ? val : b)
                        } : e))}
                        onKeyDown={(e) => handleBulletKeyDown(e, 'education', edu.id, eduIdx, bulletIdx, edu.bullets || [])}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
