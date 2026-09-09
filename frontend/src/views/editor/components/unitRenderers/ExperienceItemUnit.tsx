import React from 'react';
import { X } from 'lucide-react';
import styles from '../../../../views/editorStyles';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';
import { formatDisplayDateRange } from './helpers';

export const ExperienceItemUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit, isMeasuring, targetLanguage,
    setEditableExperiences,
    hoveredSectionId, setHoveredSectionId,
    handleMouseEnterSuggestion, handleMouseLeaveSuggestion,
    reviewedActions, renderHoverAiControls, isRephrasing,
    handleRemoveExperienceBullet, handleBulletKeyDown
  } = p;
  const { isPP, isGerman, mergedStyles, handleContainerClickToFocus } = ctx;

  if (unit.type !== 'experience-item') return null;
  const exp = unit.itemData;
  const expIdx = unit.itemIndex!;
  const hasAIChange = !reviewedActions[exp.id];
  const isSectionHovered = hoveredSectionId === unit.sectionId;

  return (
    <div
      className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)} ${isSectionHovered ? styles.sectionHoverActive : ''}`}
      style={{ ...mergedStyles, position: 'relative' }}
      onMouseEnter={() => { handleMouseEnterSuggestion(exp.id); setHoveredSectionId(unit.sectionId || null); }}
      onMouseLeave={() => { handleMouseLeaveSuggestion(); setHoveredSectionId(null); }}
    >
      {isPP || isGerman ? (
        <>
          <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
            <span className={isPP ? styles.ppDateRange : styles.germanDateRange}>
              <AutoSizeTextarea
                value={formatDisplayDateRange(exp.start_date, exp.end_date, targetLanguage)}
                onChange={(val) => {
                  const parts = val.split(' - ');
                  setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                }}
              />
            </span>
          </div>
          <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
            <h4 className={isPP ? styles.ppJobTitle : styles.germanJobTitle}>
              <AutoSizeTextarea
                value={exp.position || ''}
                onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: val } : e))}
              />
            </h4>
            <div className={isPP ? styles.ppJobMeta : styles.germanJobMeta} style={{ width: '100%' }}>
              <span className={isPP ? styles.ppCompany : styles.germanCompany} style={{ display: 'block', width: '100%' }}>
                <AutoSizeTextarea
                  value={`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`}
                  placeholder="Company Name, Location"
                  onChange={(val) => {
                    const commaIndex = val.indexOf(',');
                    let newComp = val;
                    let newLoc = '';
                    if (commaIndex !== -1) {
                      newComp = val.substring(0, commaIndex).trim();
                      newLoc = val.substring(commaIndex + 1).trim();
                    } else {
                      newComp = val;
                    }
                    setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, company: newComp, location: newLoc } : e));
                  }}
                />
              </span>
            </div>

            <div
              className={`${hasAIChange ? styles.aiHighlighted : ''}`}
              onMouseEnter={() => handleMouseEnterSuggestion(exp.id)}
              onMouseLeave={handleMouseLeaveSuggestion}
              style={{ width: '100%' }}
            >
              <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
                {exp.bullets.map((bullet: string, bulletIdx: number) => {
                  const inputId = `bullet-input-experience-${exp.id}-${bulletIdx}`;
                  const key = `exp-bullet-${expIdx}-${bulletIdx}`;
                  return (
                    <li key={bulletIdx} onClick={handleContainerClickToFocus} className={`${isPP ? styles.ppBulletItem : styles.germanBulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                      <span className={styles.bulletDot}>•</span>
                      {renderHoverAiControls(key, bullet, [
                        { label: "Action Verbs", prompt: "Make it punchier starting with strong active verbs" },
                        { label: "Metrics & ROI", prompt: "Highlight quantifiable metrics, percentage gains, or ROI" },
                        { label: "ATS Tech", prompt: "Inject relevant technical tools and framework details" }
                      ])}
                      {!isMeasuring && (
                        <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveExperienceBullet(expIdx, bulletIdx)}
                            className={styles.deleteBulletBtn}
                            title="Delete bullet"
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
                            onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                              ...e,
                              bullets: e.bullets.map((b: string, bI: number) => bI === bulletIdx ? val : b)
                            } : e))}
                            onKeyDown={(e) => handleBulletKeyDown(e, 'experience', exp.id, expIdx, bulletIdx, exp.bullets)}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div style={{ width: '100%' }}>
          <div className={styles.itemMeta}>
            <strong style={{ color: '#3d7ee6', fontSize: 'calc(var(--base-font-size, 13px) * 0.92)' }}>
              <AutoSizeTextarea
                value={exp.position || ''}
                onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: val } : e))}
              />
            </strong>
            <span style={{ fontSize: 'calc(var(--base-font-size, 13px) * 0.92)' }}>
              <AutoSizeTextarea
                value={formatDisplayDateRange(exp.start_date, exp.end_date, targetLanguage)}
                onChange={(val) => {
                  const parts = val.split(' - ');
                  setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                }}
              />
            </span>
          </div>
          <div className={styles.itemCompany} style={{ width: '100%' }}>
            <AutoSizeTextarea
              value={`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`}
              placeholder="Company Name, Location"
              onChange={(val) => {
                const commaIndex = val.indexOf(',');
                let newComp = val;
                let newLoc = '';
                if (commaIndex !== -1) {
                  newComp = val.substring(0, commaIndex).trim();
                  newLoc = val.substring(commaIndex + 1).trim();
                } else {
                  newComp = val;
                }
                setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, company: newComp, location: newLoc } : e));
              }}
            />
          </div>

          <div
            className={`${hasAIChange ? styles.aiHighlighted : ''}`}
            onMouseEnter={() => handleMouseEnterSuggestion(exp.id)}
            onMouseLeave={handleMouseLeaveSuggestion}
            style={{ width: '100%' }}
          >
            <ul className={styles.bulletsList}>
              {exp.bullets.map((bullet: string, bulletIdx: number) => {
                const inputId = `bullet-input-experience-${exp.id}-${bulletIdx}`;
                const key = `exp-bullet-${expIdx}-${bulletIdx}`;
                return (
                  <li key={bulletIdx} className={`${styles.bulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                    <span className={styles.bulletDot}>•</span>
                    {renderHoverAiControls(key, bullet, [
                      { label: "Action Verbs", prompt: "Make it punchier starting with strong active verbs" },
                      { label: "Metrics & ROI", prompt: "Highlight quantifiable metrics, percentage gains, or ROI" },
                      { label: "ATS Tech", prompt: "Inject relevant technical tools and framework details" }
                    ])}
                    {!isMeasuring && (
                      <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperienceBullet(expIdx, bulletIdx)}
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
                          onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                            ...e,
                            bullets: e.bullets.map((b: string, bI: number) => bI === bulletIdx ? val : b)
                          } : e))}
                          onKeyDown={(e) => handleBulletKeyDown(e, 'experience', exp.id, expIdx, bulletIdx, exp.bullets)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
