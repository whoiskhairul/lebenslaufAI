import React from 'react';
import styles from '../../../../views/editorStyles';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';

export const CustomContentUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit,
    sections, setSections,
    hoveredSectionId, setHoveredSectionId
  } = p;
  const { isPP, isGerman, sec, mergedStyles } = ctx;

  if (unit.type !== 'custom-content') return null;
  const isSectionHovered = hoveredSectionId === unit.sectionId;
  const format = sec?.customFormat || 'bullets';

  // Key-Value Layout
  if (format === 'keyvalue') {
    const pairs = sec?.keyValuePairs || [{ key: 'Label', value: 'Detail Description' }];
    return (
      <div
        className={isSectionHovered ? styles.sectionHoverActive : ''}
        style={mergedStyles}
        onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        {pairs.map((pair: any, pIdx: number) => (
          <div
            key={pIdx}
            className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}`}
            style={{ position: 'relative', display: isPP || isGerman ? undefined : 'flex', marginBottom: '6px' }}
          >
            <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
              <strong style={{ color: 'var(--accent-color, #0f172a)' }}>
                <AutoSizeTextarea
                  value={pair.key}
                  onChange={(val) => {
                    setSections(prev => prev.map(s => {
                      if (s.id === unit.sectionId) {
                        const newPairs = [...(s.keyValuePairs || [])];
                        newPairs[pIdx] = { ...newPairs[pIdx], key: val };
                        return { ...s, keyValuePairs: newPairs };
                      }
                      return s;
                    }));
                  }}
                />
              </strong>
            </div>
            <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
              <AutoSizeTextarea
                value={pair.value}
                onChange={(val) => {
                  setSections(prev => prev.map(s => {
                    if (s.id === unit.sectionId) {
                      const newPairs = [...(s.keyValuePairs || [])];
                      newPairs[pIdx] = { ...newPairs[pIdx], value: val };
                      return { ...s, keyValuePairs: newPairs };
                    }
                    return s;
                  }));
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Structured Entries Layout
  if (format === 'entries') {
    const entries = sec?.entries || [
      { id: 'entry_1', title: 'Position or Project', subtitle: 'Organization', date: '2024', location: 'Location', bullets: ['Accomplishment detail...'] }
    ];
    return (
      <div
        className={isSectionHovered ? styles.sectionHoverActive : ''}
        style={mergedStyles}
        onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        {entries.map((entry: any, eIdx: number) => (
          <div
            key={entry.id || eIdx}
            className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}`}
            style={{ position: 'relative', marginBottom: '10px' }}
          >
            {isPP || isGerman ? (
              <>
                <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                  <h4 className={isPP ? styles.ppRoleTitle : styles.germanRole}>
                    <AutoSizeTextarea
                      value={entry.title || ''}
                      onChange={(val) => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, title: val } : ent);
                            return { ...s, entries: nextEntries };
                          }
                          return s;
                        }));
                      }}
                    />
                  </h4>
                  <span className={isPP ? styles.ppDateRange : styles.germanDateRange}>
                    <AutoSizeTextarea
                      value={entry.date || ''}
                      onChange={(val) => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, date: val } : ent);
                            return { ...s, entries: nextEntries };
                          }
                          return s;
                        }));
                      }}
                    />
                  </span>
                </div>
                <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <div className={isPP ? styles.ppCompany : styles.germanCompany}>
                      <AutoSizeTextarea
                        value={entry.subtitle || ''}
                        onChange={(val) => {
                          setSections(prev => prev.map(s => {
                            if (s.id === unit.sectionId) {
                              const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, subtitle: val } : ent);
                              return { ...s, entries: nextEntries };
                            }
                            return s;
                          }));
                        }}
                      />
                    </div>
                    {entry.subtitle && entry.location && <span style={{ color: '#475569', fontSize: '0.9em' }}>, </span>}
                    <div style={{ fontSize: '0.85em', color: '#64748b', opacity: 0.85 }}>
                      <AutoSizeTextarea
                        value={entry.location || ''}
                        onChange={(val) => {
                          setSections(prev => prev.map(s => {
                            if (s.id === unit.sectionId) {
                              const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, location: val } : ent);
                              return { ...s, entries: nextEntries };
                            }
                            return s;
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <ul className={styles.bulletsList}>
                    {(entry.bullets || []).map((bullet: string, bIdx: number) => (
                      <li key={bIdx} className={styles.bulletItem}>
                        <span className={styles.bulletDot}>â€¢</span>
                        <div className={styles.bulletContent}>
                          <AutoSizeTextarea
                            value={bullet}
                            onChange={(val) => {
                              setSections(prev => prev.map(s => {
                                if (s.id === unit.sectionId) {
                                  const nextEntries = (s.entries || []).map((ent: any, i: number) => {
                                    if (i !== eIdx) return ent;
                                    const nextBullets = (ent.bullets || []).map((b: string, bi: number) => bi === bIdx ? val : b);
                                    return { ...ent, bullets: nextBullets };
                                  });
                                  return { ...s, entries: nextEntries };
                                }
                                return s;
                              }));
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1em', color: 'var(--accent-color, #0f172a)' }}>
                    <AutoSizeTextarea
                      value={entry.title || ''}
                      onChange={(val) => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, title: val } : ent);
                            return { ...s, entries: nextEntries };
                          }
                          return s;
                        }));
                      }}
                    />
                  </h4>
                  <span style={{ fontSize: '0.85em', color: '#64748b' }}>
                    <AutoSizeTextarea
                      value={entry.date || ''}
                      onChange={(val) => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, date: val } : ent);
                            return { ...s, entries: nextEntries };
                          }
                          return s;
                        }));
                      }}
                    />
                  </span>
                </div>
                {(entry.subtitle || entry.location) && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontStyle: 'italic', fontSize: '0.9em', color: '#475569', marginBottom: '4px' }}>
                    {entry.subtitle && (
                      <AutoSizeTextarea
                        value={entry.subtitle || ''}
                        onChange={(val) => {
                          setSections(prev => prev.map(s => {
                            if (s.id === unit.sectionId) {
                              const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, subtitle: val } : ent);
                              return { ...s, entries: nextEntries };
                            }
                            return s;
                          }));
                        }}
                      />
                    )}
                    {entry.subtitle && entry.location && <span>, </span>}
                    {entry.location && (
                      <div style={{ fontSize: '0.95em', color: '#64748b' }}>
                        <AutoSizeTextarea
                          value={entry.location || ''}
                          onChange={(val) => {
                            setSections(prev => prev.map(s => {
                              if (s.id === unit.sectionId) {
                                const nextEntries = (s.entries || []).map((ent: any, i: number) => i === eIdx ? { ...ent, location: val } : ent);
                                return { ...s, entries: nextEntries };
                              }
                              return s;
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <ul className={styles.bulletsList}>
                  {(entry.bullets || []).map((bullet: string, bIdx: number) => (
                    <li key={bIdx} className={styles.bulletItem}>
                      <span className={styles.bulletDot}>â€¢</span>
                      <div className={styles.bulletContent}>
                        <AutoSizeTextarea
                          value={bullet}
                          onChange={(val) => {
                            setSections(prev => prev.map(s => {
                              if (s.id === unit.sectionId) {
                                const nextEntries = (s.entries || []).map((ent: any, i: number) => {
                                  if (i !== eIdx) return ent;
                                  const nextBullets = (ent.bullets || []).map((b: string, bi: number) => bi === bIdx ? val : b);
                                  return { ...ent, bullets: nextBullets };
                                });
                                return { ...s, entries: nextEntries };
                              }
                              return s;
                            }));
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Paragraph Narrative Layout
  if (format === 'paragraph') {
    const pText = sec?.paragraphText ?? ((sec?.bullets || []).join(' ') || 'Add continuous narrative statement...');
    return (
      <div
        className={isSectionHovered ? styles.sectionHoverActive : ''}
        style={{ ...mergedStyles, width: '100%', paddingLeft: isPP || isGerman ? '0' : '8px' }}
        onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        <AutoSizeTextarea
          value={pText}
          onChange={(val) => {
            setSections(prev => prev.map(s => s.id === unit.sectionId ? { ...s, paragraphText: val } : s));
          }}
        />
      </div>
    );
  }

  // Default Bullet Points List
  const bullets = sec?.bullets || unit.bullets || ['Add detail or credential...'];
  return (
    <div
      className={isSectionHovered ? styles.sectionHoverActive : ''}
      style={mergedStyles}
      onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
      onMouseLeave={() => setHoveredSectionId(null)}
    >
      <ul className={styles.bulletsList}>
        {bullets.map((bullet: string, bulletIdx: number) => (
          <li key={bulletIdx} className={styles.bulletItem} style={{ position: 'relative' }}>
            <span className={styles.bulletDot}>â€¢</span>
            <div className={styles.bulletContent}>
              <AutoSizeTextarea
                value={bullet}
                onChange={(val) => {
                  setSections(prev => prev.map(s => {
                    if (s.id === unit.sectionId) {
                      const updated = [...(s.bullets || [])];
                      updated[bulletIdx] = val;
                      return { ...s, bullets: updated };
                    }
                    return s;
                  }));
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
