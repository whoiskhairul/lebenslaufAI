import React, { useState } from 'react';
import {
  ArrowLeft, Settings, Sliders, ChevronDown, ChevronUp, Sparkles, RotateCcw,
  User, FileText, Briefcase, Code, GraduationCap, Globe, Layers, Eye, EyeOff
} from 'lucide-react';
import styles from '../../../EditorNew.module.css';

import { HeaderEditor } from './HeaderEditor';
import { SummaryEditor } from './SummaryEditor';
import { ExperienceEditor } from './ExperienceEditor';
import { ProjectsEditor } from './ProjectsEditor';
import { EducationEditor } from './EducationEditor';
import { SkillsEditor } from './SkillsEditor';
import { CustomSectionEditor } from './CustomSectionEditor';

export interface SectionDetailEditorProps {
  sectionId: string;
  sections: Array<{
    id: string;
    name: string;
    visible: boolean;
    type: string;
    bullets?: string[];
    customStyles?: any;
    customFormat?: 'bullets' | 'keyvalue' | 'entries' | 'paragraph';
    keyValuePairs?: Array<{ key: string; value: string }>;
    originalSnapshot?: any;
    aiSnapshot?: any;
    activeVersion?: 'original' | 'ai';
  }>;
  setSections: React.Dispatch<React.SetStateAction<any[]>>;
  onBack: () => void;
  onSelectSection: (id: string) => void;

  // Personal Info
  personalInfo: any;
  setPersonalInfo: React.Dispatch<React.SetStateAction<any>>;

  // Summary
  summary: string;
  setSummary: (val: string) => void;

  // Experience
  experiences: any[];
  setExperiences: React.Dispatch<React.SetStateAction<any[]>>;
  onAddExperience: () => void;

  // Projects
  projects: any[];
  setProjects: React.Dispatch<React.SetStateAction<any[]>>;
  onAddProject: () => void;

  // Education
  educations: any[];
  setEducations: React.Dispatch<React.SetStateAction<any[]>>;
  onAddEducation: () => void;

  // Skills
  skills: any[];
  setSkills: React.Dispatch<React.SetStateAction<any[]>>;
  categoryOrder: string[];
  onMoveSkillCategory?: (catName: string, dir: 'up' | 'down') => void;
  getLocalizedCategoryName: (cat: string) => string;
  languagesTitle: string;
  setLanguagesTitle: (val: string) => void;
  targetLanguage: 'en' | 'de';

  // AI & Global Callbacks
  onOpenAiPolishModal: (sectionId: string) => void;
  onPolishBullet?: (bulletText: string, onAccept: (newText: string) => void) => void;
  toggleSectionVisibility?: (sectionId: string) => void;
  animatingHideSectionId?: string | null;
  onToggleSectionVersion?: (sectionId: string) => void;
  onResetToMasterProfile?: (sectionId: string) => void;
}

export const SectionDetailEditor: React.FC<SectionDetailEditorProps> = ({
  sectionId,
  sections,
  setSections,
  onBack,
  onSelectSection,
  personalInfo,
  setPersonalInfo,
  summary,
  setSummary,
  experiences,
  setExperiences,
  onAddExperience,
  projects,
  setProjects,
  onAddProject,
  educations,
  setEducations,
  onAddEducation,
  skills,
  setSkills,
  categoryOrder,
  onMoveSkillCategory,
  getLocalizedCategoryName,
  languagesTitle,
  setLanguagesTitle,
  targetLanguage,
  onOpenAiPolishModal,
  onPolishBullet,
  toggleSectionVisibility,
  animatingHideSectionId,
  onToggleSectionVersion,
  onResetToMasterProfile
}) => {
  const [showStyleOverrides, setShowStyleOverrides] = useState(false);

  const activeSection = sections.find(s => s.id === sectionId);
  const isHeader = sectionId === 'header';

  // Helpers to rename section
  const handleRenameSection = (newName: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));
  };

  // Helper to update custom section
  const handleUpdateCustomSection = (updates: any) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  };

  // Helper to delete custom section
  const handleDeleteCustomSection = () => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    onBack();
  };

  // Section style update
  const localStyles = activeSection?.customStyles || {};
  const handleUpdateStyle = (key: string, value: any) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      customStyles: { ...s.customStyles, [key]: value }
    } : s));
    window.dispatchEvent(new Event('cv-style-change'));
  };

  const getSectionIcon = (id: string, type?: string) => {
    if (id === 'header') return <User size={15} />;
    if (id === 'summary' || type === 'summary') return <FileText size={15} />;
    if (id === 'experience' || type === 'experience') return <Briefcase size={15} />;
    if (id === 'projects' || type === 'projects') return <Code size={15} />;
    if (id === 'education' || type === 'education') return <GraduationCap size={15} />;
    if (id === 'skills' || type === 'skills') return <Globe size={15} />;
    return <Layers size={15} />;
  };

  return (
    <div className={styles.sectionDetailContainer}>
      {/* Master-Detail Top Navigation Bar */}
      <div className={styles.detailHeaderBar}>
        <button
          type="button"
          className={styles.detailBackBtn}
          onClick={onBack}
          title="Back to Section Matrix"
        >
          <ArrowLeft size={14} />
          <span>All Sections</span>
        </button>

        {/* Quick Section Switcher Dropdown */}
        <div className={styles.detailSectionSwitcher}>
          <select
            value={sectionId}
            onChange={(e) => onSelectSection(e.target.value)}
            className={styles.detailSectionDropdown}
          >
            <option value="header">👤 Personal Info & Header</option>
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>
                {sec.name} {!sec.visible ? '(Hidden)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Section Visibility Toggle in Header Bar */}
        {!isHeader && activeSection && (
          <button
            type="button"
            className={`${styles.sideIconBtn} ${activeSection.visible && animatingHideSectionId !== activeSection.id ? styles.sideIconBtnActive : ''}`}
            onClick={() => {
              if (toggleSectionVisibility) {
                toggleSectionVisibility(activeSection.id);
              } else {
                setSections(prev => prev.map(s => s.id === sectionId ? { ...s, visible: !s.visible } : s));
              }
            }}
            title={activeSection.visible && animatingHideSectionId !== activeSection.id ? 'Section Visible (Click to Hide)' : 'Section Hidden (Click to Show)'}
          >
            {activeSection.visible && animatingHideSectionId !== activeSection.id ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}

        {/* Reset to Master Profile Button */}
        {!isHeader && onResetToMasterProfile && (
          <button
            type="button"
            className={styles.sideIconBtn}
            onClick={() => onResetToMasterProfile(sectionId)}
            title="Restore Original Data from Master Profile"
          >
            <RotateCcw size={13} />
          </button>
        )}

        {/* Section AI Polish in Header Bar */}
        {!isHeader && (
          <button
            type="button"
            className={`${styles.sideIconBtn} ${styles.sideAiPolishBtn}`}
            onClick={() => onOpenAiPolishModal(sectionId)}
            title="AI Polish Section"
          >
            <Sparkles size={13} />
          </button>
        )}
      </div>

      {/* Main Section Content Area */}
      <div className={styles.detailBodyContainer}>
        {/* Version Switcher Banner (Original vs AI) */}
        {!isHeader && activeSection && activeSection.originalSnapshot && onToggleSectionVersion && (
          <div className={styles.sectionVersionBanner}>
            <div className={styles.versionBadgeRow}>
              {activeSection.activeVersion === 'original' ? (
                <span className={styles.versionBadgeOriginal}>📝 Original Pre-AI Text</span>
              ) : (
                <span className={styles.versionBadgeAi}>✨ AI Tailored Version</span>
              )}
            </div>
            <button
              type="button"
              className={styles.versionToggleBtn}
              onClick={() => onToggleSectionVersion(activeSection.id)}
              title={activeSection.activeVersion === 'original' ? 'Switch to AI Tailored Version' : 'Restore Pre-AI Original Text'}
            >
              {activeSection.activeVersion === 'original' ? (
                <>
                  <Sparkles size={13} style={{ color: '#6366f1' }} />
                  <span>Switch to AI Version</span>
                </>
              ) : (
                <>
                  <RotateCcw size={13} />
                  <span>Restore Original Text</span>
                </>
              )}
            </button>
          </div>
        )}
        {isHeader && (
          <HeaderEditor
            personalInfo={personalInfo}
            setPersonalInfo={setPersonalInfo}
            onPolishField={(fieldName, text) => {
              if (onPolishBullet) {
                onPolishBullet(text, (newText) => {
                  if (fieldName === 'Job Title') setPersonalInfo((prev: any) => ({ ...prev, title: newText }));
                });
              }
            }}
          />
        )}

        {activeSection && activeSection.type === 'summary' && (
          <SummaryEditor
            sectionName={activeSection.name}
            onRenameSection={handleRenameSection}
            summary={summary}
            setSummary={setSummary}
            onOpenAiPolish={() => onOpenAiPolishModal(sectionId)}
          />
        )}

        {activeSection && activeSection.type === 'experience' && (
          <ExperienceEditor
            sectionName={activeSection.name}
            onRenameSection={handleRenameSection}
            experiences={experiences}
            setExperiences={setExperiences}
            onAddExperience={onAddExperience}
            onPolishBullet={onPolishBullet}
          />
        )}

        {activeSection && activeSection.type === 'projects' && (
          <ProjectsEditor
            sectionName={activeSection.name}
            onRenameSection={handleRenameSection}
            projects={projects}
            setProjects={setProjects}
            onAddProject={onAddProject}
            onPolishBullet={onPolishBullet}
          />
        )}

        {activeSection && activeSection.type === 'education' && (
          <EducationEditor
            sectionName={activeSection.name}
            onRenameSection={handleRenameSection}
            educations={educations}
            setEducations={setEducations}
            onAddEducation={onAddEducation}
            onPolishBullet={onPolishBullet}
          />
        )}

        {activeSection && activeSection.type === 'skills' && (
          <SkillsEditor
            sectionName={activeSection.name}
            onRenameSection={handleRenameSection}
            skills={skills}
            setSkills={setSkills}
            categoryOrder={categoryOrder}
            onMoveSkillCategory={onMoveSkillCategory}
            getLocalizedCategoryName={getLocalizedCategoryName}
            languagesTitle={languagesTitle}
            setLanguagesTitle={setLanguagesTitle}
            targetLanguage={targetLanguage}
          />
        )}

        {activeSection && (activeSection.type === 'custom' || !['summary', 'experience', 'projects', 'education', 'skills'].includes(activeSection.type)) && (
          <CustomSectionEditor
            section={activeSection as any}
            onUpdateSection={handleUpdateCustomSection}
            onDeleteSection={handleDeleteCustomSection}
            onPolishBullet={onPolishBullet}
          />
        )}

        {/* Section Style Overrides Collapsible Drawer */}
        {!isHeader && (
          <div className={styles.sideStyleOverridesCard}>
            <div
              className={styles.sideStyleOverridesHeader}
              onClick={() => setShowStyleOverrides(!showStyleOverrides)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} style={{ color: 'var(--primary, #6366f1)' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  Section Style & Typography Overrides
                </span>
              </div>
              <span className={styles.sideExpandText}>
                {showStyleOverrides ? 'Collapse ▲' : 'Customize ▼'}
              </span>
            </div>

            {showStyleOverrides && (
              <div className={styles.sideStyleOverridesBody}>
                <div className={styles.sideTwinGrid}>
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      Heading Size: <strong>{localStyles.headingSize || 16}px</strong>
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      step="0.5"
                      value={localStyles.headingSize || 16}
                      onChange={(e) => handleUpdateStyle('headingSize', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      Text Font Size: <strong>{localStyles.fontSize || 13}px</strong>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="22"
                      step="0.5"
                      value={localStyles.fontSize || 13}
                      onChange={(e) => handleUpdateStyle('fontSize', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className={styles.sideTwinGrid}>
                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      Line Height: <strong>{localStyles.lineHeight || 1.4}</strong>
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="2.4"
                      step="0.05"
                      value={localStyles.lineHeight || 1.4}
                      onChange={(e) => handleUpdateStyle('lineHeight', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className={styles.sideFieldRow}>
                    <label className={styles.sideFieldLabel}>
                      Section Spacing: <strong>{localStyles.spacing || 20}px</strong>
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="50"
                      step="1"
                      value={localStyles.spacing || 20}
                      onChange={(e) => handleUpdateStyle('spacing', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {localStyles && Object.keys(localStyles).length > 0 && (
                  <button
                    type="button"
                    className={styles.sideResetStyleBtn}
                    onClick={() => {
                      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, customStyles: undefined } : s));
                      window.dispatchEvent(new Event('cv-style-change'));
                    }}
                  >
                    Reset to Global Theme Styles
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
