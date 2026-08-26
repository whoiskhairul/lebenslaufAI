import React from 'react';
import { X } from 'lucide-react';
import styles from '../../../../views/editorStyles';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';

export const ProjectItemUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit, isMeasuring,
    setEditableProjects,
    hoveredSectionId, setHoveredSectionId,
    renderHoverAiControls, isRephrasing,
    handleRemoveProjectBullet, handleBulletKeyDown
  } = p;
  const { isPP, isGerman, mergedStyles, handleContainerClickToFocus } = ctx;

  if (unit.type !== 'project-item') return null;
  const proj = unit.itemData;
  const projIdx = unit.itemIndex!;
  const hasRole = Boolean(proj.role && proj.role.trim());
  const techString = Array.isArray(proj.technologies)
    ? proj.technologies.join(', ')
    : (proj.technologies || '');
  const hasTech = Boolean(techString && techString.trim());
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
            <h4 className={isPP ? styles.ppProjectTitle : styles.germanDegree}>
              <AutoSizeTextarea
                value={proj.title || ''}
                onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, title: val } : p))}
              />
            </h4>
            {proj.date && (
              <div style={{ fontSize: '0.82em', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>
                <AutoSizeTextarea
                  singleLine
                  value={proj.date || ''}
                  placeholder="Project Date..."
                  onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, date: val } : p))}
                />
              </div>
            )}
          </div>
          <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
            {(() => {
              const activeNodes = [];
              if (hasRole) {
                activeNodes.push(
                  <div key="role" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'text', fontSize: '0.88em', color: '#1e293b', fontWeight: 500 }}>
                    <AutoSizeTextarea
                      singleLine
                      style={{ fontSize: '1em', fontWeight: 500, color: '#1e293b' }}
                      value={proj.role || ''}
                      placeholder="Your Role / Contributions..."
                      onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, role: val } : p))}
                    />
                  </div>
                );
              }
              if (hasTech) {
                activeNodes.push(
                  <div key="tech" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'text', fontSize: '0.88em', color: '#334155', fontWeight: 400 }}>
                    <AutoSizeTextarea
                      singleLine
                      style={{ fontSize: '1em', fontWeight: 400, color: '#334155', fontStyle: 'italic' }}
                      value={techString}
                      placeholder="Technologies used..."
                      onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? {
                        ...p,
                        technologies: val.includes(',') ? val.split(',').map(t => t.trim()) : (val ? [val] : [])
                      } : p))}
                    />
                  </div>
                );
              }

              const linkVal = proj.link || proj.github_url || proj.demo_url || '';
              const hasLink = Boolean(linkVal && linkVal.trim());
              if (hasLink) {
                activeNodes.push(
                  <div key="link" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.88em', fontWeight: 500, color: '#1e293b' }}>
                    <a
                      href={linkVal.startsWith('http') ? linkVal : `https://${linkVal}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1e293b', textDecoration: 'underline', textDecorationColor: 'rgba(30, 41, 59, 0.4)', fontWeight: 500, fontSize: '1em', overflow: 'hidden' }}
                    >
                      <AutoSizeTextarea
                        singleLine
                        style={{ fontSize: '1em', fontWeight: 500, color: '#1e293b' }}
                        value={linkVal}
                        placeholder="GitHub / Live Demo Link..."
                        onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, link: val } : p))}
                      />
                    </a>
                  </div>
                );
              }

              if (activeNodes.length === 0) return null;

              return (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%', maxWidth: '100%', marginBottom: '4px' }}>
                  {activeNodes.reduce((acc: React.ReactNode[], node, idx) => {
                    if (idx > 0) {
                      acc.push(
                        <span key={`sep-${idx}`} style={{ color: '#94a3b8', fontSize: '0.85em', userSelect: 'none' }}>|</span>
                      );
                    }
                    acc.push(node);
                    return acc;
                  }, [])}
                </div>
              );
            })()}
            <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
              {proj.bullets.map((bullet: string, bulletIdx: number) => {
                const inputId = `bullet-input-project-${proj.id}-${bulletIdx}`;
                const key = `proj-bullet-${projIdx}-${bulletIdx}`;
                return (
                  <li key={bulletIdx} className={`${isPP ? styles.ppBulletItem : styles.germanBulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                    <span className={styles.bulletDot}>â€¢</span>
                    {renderHoverAiControls(key, bullet, [
                      { label: "Action Verbs", prompt: "Make it punchier with strong active verbs" },
                      { label: "Tech Stack", prompt: "Highlight modern tech stack & system architecture" },
                      { label: "Deliverables", prompt: "Focus on technical deliverables, scope, and results" }
                    ])}
                    {!isMeasuring && (
                      <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveProjectBullet(projIdx, bulletIdx)}
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
                          onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? {
                            ...p,
                            bullets: p.bullets.map((b: string, bI: number) => bI === bulletIdx ? val : b)
                          } : p))}
                          onKeyDown={(e) => handleBulletKeyDown(e, 'project', proj.id, projIdx, bulletIdx, proj.bullets)}
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
            <strong>
              <AutoSizeTextarea
                value={proj.title || ''}
                onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, title: val } : p))}
              />
            </strong>
          </div>
          {proj.date && (
            <div style={{ fontSize: '0.85em', fontWeight: 500, color: '#64748b', margin: '1px 0 3px 0' }}>
              <AutoSizeTextarea
                singleLine
                value={proj.date || ''}
                placeholder="Project Date..."
                onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, date: val } : p))}
              />
            </div>
          )}
          {(() => {
            const activeNodes = [];
            if (hasRole) {
              activeNodes.push(
                <div key="role" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'text', fontSize: '0.88em', color: '#1e293b', fontWeight: 500 }}>
                  <AutoSizeTextarea
                    singleLine
                    style={{ fontSize: '1em', fontWeight: 500, color: '#1e293b' }}
                    value={proj.role || ''}
                    placeholder="Your Role / Contributions..."
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, role: val } : p))}
                  />
                </div>
              );
            }
            if (hasTech) {
              activeNodes.push(
                <div key="tech" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'text', fontSize: '0.88em', color: '#334155', fontWeight: 400 }}>
                  <AutoSizeTextarea
                    singleLine
                    style={{ fontSize: '1em', fontWeight: 400, color: '#334155', fontStyle: 'italic' }}
                    value={techString}
                    placeholder="Technologies used..."
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? {
                      ...p,
                      technologies: val.includes(',') ? val.split(',').map(t => t.trim()) : (val ? [val] : [])
                    } : p))}
                  />
                </div>
              );
            }

            const linkVal = proj.link || proj.github_url || proj.demo_url || '';
            const hasLink = Boolean(linkVal && linkVal.trim());
            if (hasLink) {
              activeNodes.push(
                <div key="link" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.88em', fontWeight: 500, color: '#1e293b' }}>
                  <a
                    href={linkVal.startsWith('http') ? linkVal : `https://${linkVal}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1e293b', textDecoration: 'underline', textDecorationColor: 'rgba(30, 41, 59, 0.4)', fontWeight: 500, fontSize: '1em', overflow: 'hidden' }}
                  >
                    <AutoSizeTextarea
                      singleLine
                      style={{ fontSize: '1em', fontWeight: 500, color: '#1e293b' }}
                      value={linkVal}
                      placeholder="GitHub / Live Demo Link..."
                      onChange={(val) => setEditableProjects(prev => prev.map((p, i) => ((p.id && proj.id && p.id === proj.id) || i === projIdx) ? { ...p, link: val } : p))}
                    />
                  </a>
                </div>
              );
            }

            if (activeNodes.length === 0) return null;

            return (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                {activeNodes.reduce((acc: React.ReactNode[], node, idx) => {
                  if (idx > 0) {
                    acc.push(
                      <span key={`sep-${idx}`} style={{ color: '#94a3b8', fontSize: '0.85em', userSelect: 'none' }}>|</span>
                    );
                  }
                  acc.push(node);
                  return acc;
                }, [])}
              </div>
            );
          })()}
          <ul className={styles.bulletsList}>
            {proj.bullets.map((bullet: string, bulletIdx: number) => {
              const inputId = `bullet-input-project-${proj.id}-${bulletIdx}`;
              const key = `proj-bullet-${projIdx}-${bulletIdx}`;
              return (
                <li key={bulletIdx} onClick={handleContainerClickToFocus} className={`${styles.bulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                  <span className={styles.bulletDot}>â€¢</span>
                  {renderHoverAiControls(key, bullet, [
                    { label: "Action Verbs", prompt: "Make it punchier with strong active verbs" },
                    { label: "Tech Stack", prompt: "Highlight modern tech stack & system architecture" },
                    { label: "Deliverables", prompt: "Focus on technical deliverables, scope, and results" }
                  ])}
                  {!isMeasuring && (
                    <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveProjectBullet(projIdx, bulletIdx)}
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
                        onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                          ...p,
                          bullets: p.bullets.map((b: string, bI: number) => bI === bulletIdx ? val : b)
                        } : p))}
                        onKeyDown={(e) => handleBulletKeyDown(e, 'project', proj.id, projIdx, bulletIdx, proj.bullets)}
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
