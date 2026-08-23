import React, { useState } from 'react';
import { Code, Plus, Trash, ArrowUp, ArrowDown, ExternalLink, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import styles from '../../../EditorNew.module.css';

export interface ProjectItem {
  id: string;
  title?: string;
  role?: string;
  technologies?: string[] | string;
  date?: string;
  link?: string;
  github_url?: string;
  demo_url?: string;
  bullets: string[];
}

export interface ProjectsEditorProps {
  sectionName: string;
  onRenameSection: (newName: string) => void;
  projects: ProjectItem[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  onAddProject: () => void;
  onPolishBullet?: (bulletText: string, onAccept: (newText: string) => void) => void;
}

export const ProjectsEditor: React.FC<ProjectsEditorProps> = ({
  sectionName,
  onRenameSection,
  projects,
  setProjects,
  onAddProject,
  onPolishBullet
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (projects.length > 0) {
      initial[projects[0].id || 'proj_0'] = true;
    }
    return initial;
  });

  const toggleExpand = (cardKey: string) => {
    setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    projects.forEach((proj, idx) => {
      all[proj.id || `proj_${idx}`] = true;
    });
    setExpandedCards(all);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  const handleUpdateProj = (index: number, updates: Partial<ProjectItem>) => {
    setProjects(prev => prev.map((proj, i) => i === index ? { ...proj, ...updates } : proj));
  };

  const handleDeleteProj = (index: number) => {
    if (window.confirm('Delete this project entry?')) {
      setProjects(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMoveProj = (index: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= projects.length) return;
    setProjects(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleAddBullet = (projIndex: number) => {
    setProjects(prev => prev.map((proj, i) => {
      if (i !== projIndex) return proj;
      const bullets = Array.isArray(proj.bullets) ? [...proj.bullets] : [];
      bullets.push('Architected resilient microservices handling high transaction throughput.');
      return { ...proj, bullets };
    }));
  };

  const handleUpdateBullet = (projIndex: number, bulletIndex: number, newText: string) => {
    setProjects(prev => prev.map((proj, i) => {
      if (i !== projIndex) return proj;
      const bullets = Array.isArray(proj.bullets) ? [...proj.bullets] : [];
      bullets[bulletIndex] = newText;
      return { ...proj, bullets };
    }));
  };

  const handleDeleteBullet = (projIndex: number, bulletIndex: number) => {
    setProjects(prev => prev.map((proj, i) => {
      if (i !== projIndex) return proj;
      const bullets = Array.isArray(proj.bullets) ? [...proj.bullets] : [];
      bullets.splice(bulletIndex, 1);
      return { ...proj, bullets };
    }));
  };

  const handleMoveBullet = (projIndex: number, bulletIndex: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? bulletIndex - 1 : bulletIndex + 1;
    setProjects(prev => prev.map((proj, i) => {
      if (i !== projIndex) return proj;
      const bullets = Array.isArray(proj.bullets) ? [...proj.bullets] : [];
      if (targetIdx < 0 || targetIdx >= bullets.length) return proj;
      const temp = bullets[bulletIndex];
      bullets[bulletIndex] = bullets[targetIdx];
      bullets[targetIdx] = temp;
      return { ...proj, bullets };
    }));
  };

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>🚀</span>
        <div>
          <h4 className={styles.sideEditorTitle}>Projects & Portfolio</h4>
          <p className={styles.sideEditorSubtitle}>
            Highlight standout open-source, commercial, and technical projects with live links and tech stacks.
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
            placeholder="e.g. Key Projects / Projekte"
            onChange={(e) => onRenameSection(e.target.value)}
          />
        </div>
      </div>

      {/* Action Header: Add & Bulk Expand */}
      <div className={styles.sideListActionBar}>
        <button
          type="button"
          className={styles.sidePrimaryAddBtn}
          onClick={onAddProject}
        >
          <Plus size={13} /> Add Project
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

      {/* Projects List */}
      <div className={styles.sideCardsContainer}>
        {projects.map((proj, pIdx) => {
          const cardKey = proj.id || `proj_${pIdx}`;
          const isExpanded = !!expandedCards[cardKey];
          const techStr = Array.isArray(proj.technologies)
            ? proj.technologies.join(', ')
            : (proj.technologies || '');
          const linkVal = proj.link || proj.github_url || proj.demo_url || '';
          const bullets = Array.isArray(proj.bullets) ? proj.bullets : [];

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
                      {proj.title || `Project #${pIdx + 1}`}
                    </div>
                    <div className={styles.sideCardSecondaryTitle}>
                      {proj.role || 'Role'} {proj.date ? `• ${proj.date}` : ''}
                    </div>
                  </div>
                </div>

                <div className={styles.sideCardHeaderActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={pIdx === 0}
                    onClick={() => handleMoveProj(pIdx, 'up')}
                    className={styles.sideIconBtn}
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={pIdx === projects.length - 1}
                    onClick={() => handleMoveProj(pIdx, 'down')}
                    className={styles.sideIconBtn}
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProj(pIdx)}
                    className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                    title="Delete Project"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>

              {/* Collapsible Card Body */}
              {isExpanded && (
                <div className={styles.sideCardBody}>
                  {/* Project Title */}
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>Project Title</label>
                    <input
                      type="text"
                      className={styles.sideTextInput}
                      placeholder="e.g. Distributed Analytics Engine"
                      value={proj.title || ''}
                      onChange={(e) => handleUpdateProj(pIdx, { title: e.target.value })}
                    />
                  </div>

                  {/* Role & Date */}
                  <div className={styles.sideTwinGrid}>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Role / Scope</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        placeholder="e.g. Lead Developer / Creator"
                        value={proj.role || ''}
                        onChange={(e) => handleUpdateProj(pIdx, { role: e.target.value })}
                      />
                    </div>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Date / Period
                      </label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        placeholder="e.g. 2023 - Present"
                        value={proj.date || ''}
                        onChange={(e) => handleUpdateProj(pIdx, { date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Tech Stack & Link */}
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      <Code size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Technologies Used (comma-separated)
                    </label>
                    <input
                      type="text"
                      className={styles.sideTextInput}
                      placeholder="e.g. React, TypeScript, Rust, Docker, AWS"
                      value={techStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateProj(pIdx, {
                          technologies: val.includes(',') ? val.split(',').map(t => t.trim()) : (val ? [val] : [])
                        });
                      }}
                    />
                  </div>

                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      <ExternalLink size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Live URL / Repository Link
                    </label>
                    <input
                      type="text"
                      className={styles.sideTextInput}
                      placeholder="e.g. https://github.com/user/project"
                      value={linkVal}
                      onChange={(e) => handleUpdateProj(pIdx, { link: e.target.value })}
                    />
                  </div>

                  {/* Bullet Points Manager */}
                  <div className={styles.sideBulletsSection}>
                    <div className={styles.sideFieldLabelRow} style={{ marginBottom: '6px' }}>
                      <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
                        Key Highlights & Metrics ({bullets.length})
                      </label>
                      <button
                        type="button"
                        className={styles.sideInlineAddBtn}
                        onClick={() => handleAddBullet(pIdx)}
                      >
                        <Plus size={11} /> Add Bullet
                      </button>
                    </div>

                    <div className={styles.sideBulletsList}>
                      {bullets.map((bullet, bIdx) => (
                        <div key={`proj_${pIdx}_b_${bIdx}`} className={styles.sideBulletRow}>
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
                            placeholder="Detail key architectural decisions and metrics..."
                            onChange={(e) => handleUpdateBullet(pIdx, bIdx, e.target.value)}
                            style={{ resize: 'none', overflowY: 'hidden' }}
                          />
                          <div className={styles.sideBulletActions}>
                            <button
                              type="button"
                              onClick={() => handleDeleteBullet(pIdx, bIdx)}
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
                        No bullet points yet. Click "+ Add Bullet" to list project details.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className={styles.sideEmptyState}>
          <Code size={28} className={styles.sideEmptyStateIcon} />
          <p>No projects added yet.</p>
          <button
            type="button"
            className={styles.sidePrimaryAddBtn}
            onClick={onAddProject}
          >
            <Plus size={13} /> Add First Project
          </button>
        </div>
      )}
    </div>
  );
};
