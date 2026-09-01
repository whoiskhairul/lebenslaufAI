import React from 'react';
import {
  Layers, Sliders, LayoutGrid, Minimize2, Check, User, FileText,
  Briefcase, Code, GraduationCap, Globe, Eye, EyeOff, Sparkles,
  RotateCcw, Settings, Plus, Trash
} from 'lucide-react';
import ed from '../../../views/editorStyles';
import { SectionDetailEditor } from '../../../views/editor/components/sidepanel/SectionDetailEditor';
import { useCvDocumentStore } from '../state/cvDocumentStore';

interface StyleControlsPanelProps {
  activeStyleSubTab: 'theme' | 'sections';
  setActiveStyleSubTab: (tab: 'theme' | 'sections') => void;
  activeDetailSectionId: string | null;
  targetLanguage: 'en' | 'de';
  animatingHideSectionId: string | null;
  onOpenSectionDetail: (sectionId: string) => void;
  onAddExperience: () => void;
  onAddProject: () => void;
  onAddEducation: () => void;
  onMoveSkillCategory: (catName: string, dir: 'up' | 'down') => void;
  getLocalizedCategoryName: (cat: string) => string;
  onPolishBullet: (...args: any[]) => any;
  onToggleSectionVersion: (...args: any[]) => any;
  onResetToMasterProfile: (sectionId: string) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  onOpenAiModal: (sectionId: string | null) => void;
  onOpenAddCustomSection: () => void;
  onCloseSectionDetail: () => void;
}

export const StyleControlsPanel: React.FC<StyleControlsPanelProps> = ({
  activeStyleSubTab,
  setActiveStyleSubTab,
  activeDetailSectionId,
  targetLanguage,
  animatingHideSectionId,
  onOpenSectionDetail,
  onAddExperience,
  onAddProject,
  onAddEducation,
  onMoveSkillCategory,
  getLocalizedCategoryName,
  onPolishBullet,
  onToggleSectionVersion,
  onResetToMasterProfile,
  toggleSectionVisibility,
  onOpenAiModal,
  onOpenAddCustomSection,
  onCloseSectionDetail
}) => {
  const styles = ed;
  const {
    sections, setSections,
    customStyles, setCustomStyles,
    editableSummary, setEditableSummary,
    editablePersonalInfo, setEditablePersonalInfo,
    editableExperiences, setEditableExperiences,
    editableProjects, setEditableProjects,
    editableEducations, setEditableEducations,
    editableSkills, setEditableSkills,
    categoryOrder,
    languagesTitle, setLanguagesTitle
  } = useCvDocumentStore();

  return (
    <div className={`${styles.styleControlsForm} glass-card`}>
      {/* Sub-Tab Navigation Bar: Theme vs Sections */}
      <div className={styles.subTabContainer}>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeStyleSubTab === 'sections' ? styles.activeSubTab : ''}`}
          onClick={() => setActiveStyleSubTab('sections')}
        >
          <Layers size={13} />
          <span>Sections & Content</span>
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeStyleSubTab === 'theme' ? styles.activeSubTab : ''}`}
          onClick={() => setActiveStyleSubTab('theme')}
        >
          <Sliders size={13} />
          <span>Theme & Typography</span>
        </button>
      </div>

      {/* Sub-Tab 1: Theme & Typography */}
      {activeStyleSubTab === 'theme' && (
        <>
          <h3>Typography & Layout Presets</h3>

          <div className={styles.presetCard}>
            <div className={styles.presetHeader}>
              <label className={styles.presetLabel}>
                <Sliders size={16} style={{ color: 'var(--primary, #6366f1)' }} />
                <span>Quick Spacing & Density Presets</span>
              </label>
            </div>
            <div className={styles.presetGrid}>
              {[
                {
                  id: 'standard',
                  title: 'Standard',
                  subtitle: 'Default balance',
                  icon: LayoutGrid,
                  config: { fontSize: 13, headingSize: 1.4, lineHeight: 1.4, sectionSpacing: 20, bulletSpacing: 4 }
                },
                {
                  id: 'tight',
                  title: 'Tight',
                  subtitle: 'Fit ~15% more',
                  icon: Minimize2,
                  config: { fontSize: 12, headingSize: 1.3, lineHeight: 1.3, sectionSpacing: 14, bulletSpacing: 3 }
                },
                {
                  id: 'ultra',
                  title: 'Ultra Tight',
                  subtitle: 'Max density',
                  icon: Layers,
                  config: { fontSize: 11, headingSize: 1.2, lineHeight: 1.2, sectionSpacing: 10, bulletSpacing: 2 }
                }
              ].map(preset => {
                const IconComponent = preset.icon;
                const isActive =
                  customStyles.fontSize === preset.config.fontSize &&
                  customStyles.sectionSpacing === preset.config.sectionSpacing;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetTile} ${isActive ? styles.presetTileActive : ''}`}
                    onClick={() => setCustomStyles(s => ({ ...s, ...preset.config }))}
                  >
                    <div className={styles.presetTileTop}>
                      <IconComponent size={14} className={styles.presetIcon} />
                      {isActive && (
                        <span className={styles.presetCheck}>
                          <Check size={10} />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className={styles.presetTitle}>{preset.title}</div>
                      <div className={styles.presetSubtitle}>{preset.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.slidersTwinGrid}>
            <div className={styles.sliderGroup}>
              <label>Base Font Size: <strong>{customStyles.fontSize}px</strong></label>
              <input
                type="range"
                min="10"
                max="18"
                step="0.1"
                value={customStyles.fontSize}
                onChange={(e) => setCustomStyles(s => ({ ...s, fontSize: parseFloat(e.target.value) }))}
              />
            </div>

            <div className={styles.sliderGroup}>
              <label>Heading Multiplier: <strong>x{customStyles.headingSize}</strong></label>
              <input
                type="range"
                min="1.0"
                max="2.2"
                step="0.05"
                value={customStyles.headingSize}
                onChange={(e) => setCustomStyles(s => ({ ...s, headingSize: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div className={styles.slidersTwinGrid}>
            <div className={styles.sliderGroup}>
              <label>Line Height: <strong>{customStyles.lineHeight}</strong></label>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={customStyles.lineHeight}
                onChange={(e) => setCustomStyles(s => ({ ...s, lineHeight: parseFloat(e.target.value) }))}
              />
            </div>

            <div className={styles.sliderGroup}>
              <label>Section Spacing: <strong>{customStyles.sectionSpacing}px</strong></label>
              <input
                type="range"
                min="10"
                max="45"
                step="0.5"
                value={customStyles.sectionSpacing}
                onChange={(e) => setCustomStyles(s => ({ ...s, sectionSpacing: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div className={styles.slidersTwinGrid}>
            <div className={styles.sliderGroup}>
              <label>Bullet Point Spacing: <strong>{customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4}px</strong></label>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4}
                onChange={(e) => setCustomStyles(s => ({ ...s, bulletSpacing: parseFloat(e.target.value) }))}
              />
            </div>

            <div className={styles.sliderGroup}>
              <label>Page Margin: <strong>{customStyles.pageMargin || 48}px</strong></label>
              <input
                type="range"
                min="15"
                max="90"
                step="0.5"
                value={customStyles.pageMargin || 48}
                onChange={(e) => setCustomStyles(s => ({ ...s, pageMargin: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div className={styles.colorPickers}>
            <div className={styles.colorPickerGroup}>
              <label>Accent Color</label>
              <input
                type="color"
                value={customStyles.accentColor}
                onChange={(e) => setCustomStyles(s => ({ ...s, accentColor: e.target.value }))}
              />
            </div>
            <div className={styles.colorPickerGroup}>
              <label>Title 2nd Word Color</label>
              <input
                type="color"
                value={customStyles.headingSecondaryColor || '#3d7ee6'}
                onChange={(e) => setCustomStyles(s => ({ ...s, headingSecondaryColor: e.target.value }))}
              />
            </div>
            <div className={styles.colorPickerGroup}>
              <label>Text Color</label>
              <input
                type="color"
                value={customStyles.textColor}
                onChange={(e) => setCustomStyles(s => ({ ...s, textColor: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.selectGroup} style={{ marginTop: '12px' }}>
            <label htmlFor="globalFontFamily">Font Family</label>
            <select
              id="globalFontFamily"
              value={customStyles.fontFamily || ''}
              onChange={(e) => setCustomStyles(s => ({ ...s, fontFamily: e.target.value }))}
              style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
            >
              <option value="">Template Default</option>
              <option value="'Aptos', 'Calibri', sans-serif">Aptos</option>
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Calibri', 'Segoe UI', sans-serif">Calibri</option>
              <option value="'Helvetica Neue', 'Helvetica', 'Arial', sans-serif">Helvetica</option>
              <option value="'Source Sans 3', 'Source Sans Pro', sans-serif">Source Sans 3</option>
              <option value="'IBM Plex Sans', sans-serif">IBM Plex Sans</option>
              <option value="'Arial', sans-serif">Arial</option>
            </select>
          </div>
        </>
      )}

      {/* Sub-Tab 2: Sections & Content */}
      {activeStyleSubTab === 'sections' && (
        activeDetailSectionId ? (
          /* Master-Detail Full Section Editor */
          <SectionDetailEditor
            sectionId={activeDetailSectionId}
            sections={sections}
            setSections={setSections}
            onBack={onCloseSectionDetail}
            onSelectSection={(newSecId) => onOpenSectionDetail(newSecId)}
            personalInfo={editablePersonalInfo}
            setPersonalInfo={setEditablePersonalInfo}
            summary={editableSummary}
            setSummary={setEditableSummary}
            experiences={editableExperiences}
            setExperiences={setEditableExperiences}
            onAddExperience={onAddExperience}
            projects={editableProjects}
            setProjects={setEditableProjects}
            onAddProject={onAddProject}
            educations={editableEducations}
            setEducations={setEditableEducations}
            onAddEducation={onAddEducation}
            skills={editableSkills}
            setSkills={setEditableSkills}
            categoryOrder={categoryOrder}
            onMoveSkillCategory={onMoveSkillCategory}
            getLocalizedCategoryName={getLocalizedCategoryName}
            languagesTitle={languagesTitle}
            setLanguagesTitle={setLanguagesTitle}
            targetLanguage={targetLanguage}
            onOpenAiPolishModal={(secId) => onOpenAiModal(secId)}
            onPolishBullet={onPolishBullet}
            toggleSectionVisibility={toggleSectionVisibility}
            animatingHideSectionId={animatingHideSectionId}
            onToggleSectionVersion={onToggleSectionVersion}
            onResetToMasterProfile={onResetToMasterProfile}
          />
        ) : (
          /* Section Control Overview Matrix */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>Sections Control Panel</h3>
              <span style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                {sections.filter(s => s.visible).length} visible / {sections.length + 1} total
              </span>
            </div>

            {/* Header / Personal Info Card */}
            <div className={`${styles.sectionCardItem} ${styles.sectionCardHeaderItem}`} style={{ marginBottom: '8px' }}>
              <div
                className={styles.sectionCardLeft}
                onClick={() => onOpenSectionDetail('header')}
              >
                <div
                  className={styles.sectionIconBadge}
                  style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' }}
                >
                  <User size={16} />
                </div>
                <div className={styles.sectionCardInfo}>
                  <div className={styles.sectionCardTitle}>
                    <span>Personal Info & Header</span>
                  </div>
                  <div className={styles.sectionCardSubtitle}>
                    {editablePersonalInfo.full_name || 'Your name'} • {editablePersonalInfo.title || 'Headline & Contact'}
                  </div>
                </div>
              </div>

              <div className={styles.sectionCardRight}>
                <button
                  type="button"
                  className={styles.sectionAiCardBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetToMasterProfile('header');
                  }}
                  title="Reset Personal Info & Header to Master Profile Original"
                  style={{ marginRight: '4px' }}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  className={styles.sectionEditCardBtn}
                  onClick={() => onOpenSectionDetail('header')}
                  title="Edit Personal Information"
                >
                  <span>Edit</span>
                  <Settings size={12} />
                </button>
              </div>
            </div>

            {/* Dynamic CV Sections Cards */}
            <div className={styles.sectionsList}>
              {sections.map((secItem, idx) => {
                const meta = (() => {
                  if (secItem.type === 'summary' || secItem.id === 'summary') {
                    const words = editableSummary ? editableSummary.trim().split(/\s+/).filter(Boolean).length : 0;
                    return {
                      icon: <FileText size={16} />,
                      iconBg: 'rgba(99, 102, 241, 0.12)',
                      iconColor: '#6366f1',
                      subtitle: words > 0 ? `${words} words pitch` : 'Summary not set'
                    };
                  }
                  if (secItem.type === 'experience' || secItem.id === 'experience') {
                    return {
                      icon: <Briefcase size={16} />,
                      iconBg: 'rgba(59, 130, 246, 0.12)',
                      iconColor: '#3b82f6',
                      subtitle: `${editableExperiences.length} position${editableExperiences.length === 1 ? '' : 's'}`
                    };
                  }
                  if (secItem.type === 'projects' || secItem.id === 'projects') {
                    return {
                      icon: <Code size={16} />,
                      iconBg: 'rgba(16, 185, 129, 0.12)',
                      iconColor: '#10b981',
                      subtitle: `${editableProjects.length} project${editableProjects.length === 1 ? '' : 's'}`
                    };
                  }
                  if (secItem.type === 'education' || secItem.id === 'education') {
                    return {
                      icon: <GraduationCap size={16} />,
                      iconBg: 'rgba(245, 158, 11, 0.12)',
                      iconColor: '#f59e0b',
                      subtitle: `${editableEducations.length} degree${editableEducations.length === 1 ? '' : 's'}`
                    };
                  }
                  if (secItem.type === 'skills' || secItem.id === 'skills') {
                    const langCount = editableSkills.filter(s => (s.category || '').toLowerCase().trim() === 'languages').length;
                    const itCount = editableSkills.length - langCount;
                    return {
                      icon: <Globe size={16} />,
                      iconBg: 'rgba(236, 72, 153, 0.12)',
                      iconColor: '#ec4899',
                      subtitle: `${itCount} skills • ${langCount} languages`
                    };
                  }
                  const count = secItem.customFormat === 'keyvalue' ? (secItem.keyValuePairs?.length || 0) : (secItem.bullets?.length || 0);
                  return {
                    icon: <Layers size={16} />,
                    iconBg: 'rgba(99, 102, 241, 0.12)',
                    iconColor: '#6366f1',
                    subtitle: `${count} custom item${count === 1 ? '' : 's'}`
                  };
                })();

                return (
                <div
                  key={secItem.id}
                  className={`${styles.sectionCardItem} ${!secItem.visible ? styles.sectionCardDisabled : ''}`}
                >
                  <div
                    className={styles.sectionCardLeft}
                    onClick={() => onOpenSectionDetail(secItem.id)}
                  >
                    <div
                      className={styles.sectionIconBadge}
                      style={{ background: meta.iconBg, color: meta.iconColor }}
                    >
                      {meta.icon}
                    </div>
                    <div className={styles.sectionCardInfo}>
                      <div className={styles.sectionCardTitle}>
                        <span>{secItem.name}</span>
                        {!secItem.visible && (
                          <span className={styles.sectionHiddenBadge}>Hidden</span>
                        )}
                      </div>
                      <div className={styles.sectionCardSubtitle}>
                        {meta.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className={styles.sectionCardRight}>
                    <button
                      type="button"
                      className={`${styles.sectionVisibilityBtn} ${secItem.visible && animatingHideSectionId !== secItem.id ? styles.sectionVisibilityBtnActive : ''}`}
                      onClick={() => toggleSectionVisibility(secItem.id)}
                      title={secItem.visible && animatingHideSectionId !== secItem.id ? 'Hide section from CV' : 'Show section on CV'}
                    >
                      {secItem.visible && animatingHideSectionId !== secItem.id ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>

                    <button
                      type="button"
                      className={styles.sectionAiCardBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAiModal(secItem.id);
                      }}
                      title={`AI Polish & Tailor ${secItem.name}`}
                    >
                      <Sparkles size={13} />
                    </button>

                    <button
                      type="button"
                      className={styles.sectionAiCardBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onResetToMasterProfile(secItem.id);
                      }}
                      title={`Reset ${secItem.name} to Master Profile Original`}
                    >
                      <RotateCcw size={13} />
                    </button>

                    <button
                      type="button"
                      className={styles.sectionEditCardBtn}
                      onClick={() => onOpenSectionDetail(secItem.id)}
                      title={`Edit ${secItem.name}`}
                    >
                      <span>Edit</span>
                      <Settings size={11} />
                    </button>

                    {secItem.id.startsWith('custom_') && (
                      <button
                        type="button"
                        className={styles.sectionDeleteBtn}
                        onClick={() => {
                          if (window.confirm(`Delete section "${secItem.name}"?`)) {
                            setSections(prev => prev.filter(s => s.id !== secItem.id));
                          }
                        }}
                        title="Delete Custom Section"
                      >
                        <Trash size={12} />
                      </button>
                    )}

                    <div className={styles.sectionSortGroup}>
                      <button
                        type="button"
                        className={styles.sectionSortBtn}
                        disabled={idx === 0}
                        onClick={() => {
                          const reordered = [...sections];
                          const temp = reordered[idx];
                          reordered[idx] = reordered[idx - 1];
                          reordered[idx - 1] = temp;
                          setSections(reordered);
                        }}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className={styles.sectionSortBtn}
                        disabled={idx === sections.length - 1}
                        onClick={() => {
                          const reordered = [...sections];
                          const temp = reordered[idx];
                          reordered[idx] = reordered[idx + 1];
                          reordered[idx + 1] = temp;
                          setSections(reordered);
                        }}
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.addCustomSectionCard}
              onClick={onOpenAddCustomSection}
            >
              <Plus size={15} />
              <span>Add Custom Section (Certifications, Awards, etc.)</span>
            </button>
          </>
        )
      )}
    </div>
  );
};
