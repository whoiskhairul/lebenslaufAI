import React from 'react';
import { RenderableUnit } from '../types/editor.types';
import { renderFormattedTitle } from '../utils/titleUtils';
import { renderFormattedLanguageList } from '../utils/languageUtils';
import { formatPhoneNumber } from '../utils/phoneUtils';
import { AutoSizeTextarea } from './AutoSizeTextarea';
import { HeaderSettingsPopover } from './HeaderSettingsPopover';
import { SectionSettingsPopover } from './SectionSettingsPopover';
import {
  Settings, ChevronUp, ChevronDown, Plus, Sparkles, X, ArrowUp, ArrowDown, Trash, EyeOff
} from 'lucide-react';
import styles from '../../EditorNew.module.css';

const ensureAbsoluteUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const formatDisplayDateRange = (startDate?: string, endDate?: string, lang?: 'en' | 'de') => {
  const formatSingle = (d?: string) => {
    if (!d) return '';
    const trimmed = d.trim();
    if (trimmed.toLowerCase() === 'present') {
      return lang === 'de' ? 'Heute' : 'Present';
    }
    if (lang === 'de') {
      let formatted = trimmed;
      const replacements: Record<string, string> = {
        'march': 'März', 'mar': 'Mär',
        'may': 'Mai',
        'october': 'Oktober', 'oct': 'Okt',
        'december': 'Dezember', 'dec': 'Dez'
      };
      for (const [eng, ger] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        formatted = formatted.replace(regex, ger);
      }
      return formatted;
    }
    return d;
  };

  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return formatSingle(startDate);
  if (!startDate && endDate) return formatSingle(endDate);
  return `${formatSingle(startDate)} - ${formatSingle(endDate)}`;
};

export interface UnitRendererProps {
  unit: RenderableUnit;
  isMeasuring?: boolean;
  template: string;
  sections: any[];
  customStyles: any;
  headerStyles: any;
  editablePersonalInfo: any;
  setEditablePersonalInfo: React.Dispatch<React.SetStateAction<any>>;
  editableExperiences: any[];
  setEditableExperiences: React.Dispatch<React.SetStateAction<any[]>>;
  editableProjects: any[];
  setEditableProjects: React.Dispatch<React.SetStateAction<any[]>>;
  editableEducations: any[];
  setEditableEducations: React.Dispatch<React.SetStateAction<any[]>>;
  editableSkills: any[];
  setEditableSkills: React.Dispatch<React.SetStateAction<any[]>>;
  editableSummary: string;
  setEditableSummary: (val: string) => void;
  activeSectionSettings: string | null;
  setActiveSectionSettings: (val: string | null) => void;
  popoverPosition: { top: number; left: number } | null;
  setPopoverPosition: (pos: { top: number; left: number } | null) => void;
  setHeaderStyles: React.Dispatch<React.SetStateAction<any>>;
  setSections: React.Dispatch<React.SetStateAction<any[]>>;
  editingSectionTitleId: string | null;
  setEditingSectionTitleId: (id: string | null) => void;
  editingLanguagesId: string | null;
  setEditingLanguagesId: (id: string | null) => void;
  hoveredSectionId: string | null;
  setHoveredSectionId: (id: string | null) => void;
  handleMoveSection: (id: string, dir: 'up' | 'down') => void;
  handleQuickAddSectionItem: (id: string) => void;
  setOpenSectionAiModalId: (id: string | null) => void;
  handleMouseEnterSuggestion: (id: string) => void;
  handleMouseLeaveSuggestion: () => void;
  reviewedActions: Record<string, string>;
  renderHoverAiControls: (key: string, text: string, presets: any[]) => React.ReactNode;
  isRephrasing: Record<string, boolean>;
  handleMoveExperience: (idx: number, dir: 'up' | 'down') => void;
  handleAddExperienceBullet: (idx: number) => void;
  handleRemoveExperienceBullet: (expIdx: number, bulletIdx: number) => void;
  handleBulletKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, type: 'experience' | 'education' | 'custom' | 'project', itemId: string, itemIdx: number, bulletIdx: number, bullets: string[]) => void;
  handleMoveProject: (idx: number, dir: 'up' | 'down') => void;
  handleAddProjectBullet: (idx: number) => void;
  handleRemoveProjectBullet: (projIdx: number, bulletIdx: number) => void;
  handleMoveEducation: (idx: number, dir: 'up' | 'down') => void;
  handleAddEducationBullet: (idx: number) => void;
  handleRemoveEducationBullet: (eduIdx: number, bulletIdx: number) => void;
  languagesFirst: boolean;
  setLanguagesFirst: (val: boolean) => void;
  languagesTitle: string;
  setLanguagesTitle: (val: string) => void;
  targetLanguage: 'en' | 'de';
  categoryOrder: string[];
  handleMoveSkillCategory?: (catName: string, dir: 'up' | 'down') => void;
  getLocalizedCategoryName: (cat: string) => string;
  getAlertsFor: (section: string) => any[];
}

export const UnitRenderer: React.FC<UnitRendererProps> = ({
  unit,
  isMeasuring = false,
  template,
  sections,
  customStyles,
  headerStyles,
  editablePersonalInfo,
  setEditablePersonalInfo,
  editableExperiences,
  setEditableExperiences,
  editableProjects,
  setEditableProjects,
  editableEducations,
  setEditableEducations,
  editableSkills,
  setEditableSkills,
  editableSummary,
  setEditableSummary,
  activeSectionSettings,
  setActiveSectionSettings,
  popoverPosition,
  setPopoverPosition,
  setHeaderStyles,
  setSections,
  editingSectionTitleId,
  setEditingSectionTitleId,
  editingLanguagesId,
  setEditingLanguagesId,
  hoveredSectionId,
  setHoveredSectionId,
  handleMoveSection,
  handleQuickAddSectionItem,
  setOpenSectionAiModalId,
  handleMouseEnterSuggestion,
  handleMouseLeaveSuggestion,
  reviewedActions,
  renderHoverAiControls,
  isRephrasing,
  handleMoveExperience,
  handleAddExperienceBullet,
  handleRemoveExperienceBullet,
  handleBulletKeyDown,
  handleMoveProject,
  handleAddProjectBullet,
  handleRemoveProjectBullet,
  handleMoveEducation,
  handleAddEducationBullet,
  handleRemoveEducationBullet,
  languagesFirst,
  setLanguagesFirst,
  languagesTitle,
  setLanguagesTitle,
  targetLanguage,
  categoryOrder,
  handleMoveSkillCategory,
  getLocalizedCategoryName,
  getAlertsFor
}) => {
  const isPP = template === 'pixel_perfect_pdf';
  const isGerman = template === 'german_style_cv';

  const sec = sections.find(s => s.id === unit.sectionId);
  const localStyles = sec?.customStyles || {};

  let spacingStyle: React.CSSProperties = {};
  if (unit.sectionId) {
    const isLastItem = (() => {
      if (sec?.type === 'summary') return unit.type === 'summary';
      if (sec?.type === 'custom') return true;
      if (sec?.type === 'experience') {
        return unit.type === 'experience-item' && unit.itemData?.id === editableExperiences[editableExperiences.length - 1]?.id;
      }
      if (sec?.type === 'projects') {
        return unit.type === 'project-item' && unit.itemData?.id === editableProjects[editableProjects.length - 1]?.id;
      }
      if (sec?.type === 'education') {
        return unit.type === 'education-item' && unit.itemData?.id === editableEducations[editableEducations.length - 1]?.id;
      }
      if (sec?.type === 'skills') {
        const langSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() === 'languages');
        const itSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() !== 'languages');
        const uniqueCats = Array.from(new Set(itSkills.map(sk => (sk.category || 'technical').toLowerCase().trim())));
        const normalizedOrder = categoryOrder.map(c => c.toLowerCase().trim());
        const itCategories = normalizedOrder.filter(c => uniqueCats.includes(c));
        const extraCats = uniqueCats.filter(c => !itCategories.includes(c));
        const finalCategories = [...itCategories, ...extraCats];

        if (categoryOrder.length === 0) {
          finalCategories.sort((a, b) => {
            const getCategoryOrderScore = (cat: string) => {
              const order = ['programming languages', 'frameworks & libraries', 'databases', 'cloud & devops', 'development tools', 'testing'];
              const idx = order.indexOf(cat.toLowerCase().trim());
              if (idx !== -1) return idx;
              if (cat.toLowerCase().trim() === 'languages') return 999;
              return 100;
            };
            return getCategoryOrderScore(a) - getCategoryOrderScore(b);
          });
        }

        const lastCat = languagesFirst
          ? (finalCategories.length > 0 ? finalCategories[finalCategories.length - 1] : 'languages')
          : (langSkills.length > 0 ? 'languages' : finalCategories[finalCategories.length - 1]);

        if (unit.type === 'skills-languages') return lastCat === 'languages';
        if (unit.type === 'skills-category') return lastCat === unit.category;
      }
      return false;
    })();

    if (isLastItem) {
      const spacingVal = localStyles.spacing !== undefined ? localStyles.spacing : 4;
      spacingStyle = { marginBottom: `${spacingVal}px` };
    } else {
      if (localStyles.itemGap !== undefined) {
        spacingStyle = { marginBottom: `${localStyles.itemGap}px` };
      }
    }
  }

  const handleContainerClickToFocus = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    const focusable = e.currentTarget.querySelector('textarea, input') as HTMLTextAreaElement | HTMLInputElement | null;
    if (focusable) {
      focusable.focus();
    }
  };

  const mergedStyles = {
    '--section-font-size': localStyles.fontSize ? `${localStyles.fontSize}px` : undefined,
    '--section-spacing': localStyles.spacing ? `${localStyles.spacing}px` : undefined,
    '--section-alignment': localStyles.alignment || undefined,

    fontSize: localStyles.fontSize ? `${localStyles.fontSize}px` : undefined,
    lineHeight: localStyles.lineHeight ? `${localStyles.lineHeight}` : undefined,
    color: localStyles.textColor ? localStyles.textColor : undefined,
    textAlign: localStyles.alignment ? localStyles.alignment : undefined,
    fontStyle: localStyles.fontStyle ? localStyles.fontStyle : undefined,
    fontWeight: localStyles.fontWeight ? localStyles.fontWeight : undefined,
    '--bullet-spacing': localStyles.bulletSpacing !== undefined ? `${localStyles.bulletSpacing}px` : undefined,
    ...spacingStyle,
  } as React.CSSProperties;

  const titleClass = isPP ? styles.ppSectionTitle : (isGerman ? styles.germanSectionTitle : styles.resumeSectionTitle);

  // 1. Header Block Layouts
  if (unit.type === 'header') {
    const isHeaderSettingsOpen = activeSectionSettings === 'header';

    const headerControls = !isMeasuring && (
      <div className={`${styles.sectionControls} no-print`} style={{ top: '4px', left: '-36px', right: 'auto' }}>
        <button
          type="button"
          className={styles.itemSortBtn}
          title="Customize Header Styles"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setPopoverPosition({ top: rect.top, left: rect.left });
            setActiveSectionSettings(isHeaderSettingsOpen ? null : 'header');
          }}
        >
          <Settings size={13} />
        </button>
      </div>
    );

    const nameStyleOverride = {
      fontSize: headerStyles.nameSize ? `${headerStyles.nameSize}px` : undefined,
      fontWeight: headerStyles.nameWeight ? headerStyles.nameWeight : undefined,
      fontStyle: headerStyles.nameStyle ? headerStyles.nameStyle : undefined,
      color: headerStyles.nameColor ? headerStyles.nameColor : undefined,
    };

    const titleStyleOverride = {
      fontSize: headerStyles.titleSize ? `${headerStyles.titleSize}px` : undefined,
      fontWeight: headerStyles.titleWeight ? headerStyles.titleWeight : undefined,
      fontStyle: headerStyles.titleStyle ? headerStyles.titleStyle : undefined,
      color: headerStyles.titleColor ? headerStyles.titleColor : '#3d7ee6',
    };

    const contactsStyleOverride = {
      fontSize: headerStyles.contactsSize ? `${headerStyles.contactsSize}px` : undefined,
      color: headerStyles.contactsColor ? headerStyles.contactsColor : undefined,
      gap: headerStyles.contactsGap ? `${headerStyles.contactsGap}px` : undefined,
      marginTop: headerStyles.contactsMarginTop !== undefined ? `${headerStyles.contactsMarginTop}px` : undefined,
    };

    const headerContainerStyle = {
      ...mergedStyles,
      marginBottom: headerStyles.spacing !== undefined ? `${headerStyles.spacing}px` : undefined,
      position: 'relative' as const,
    };

    if (isPP) {
      return (
        <div className={styles.ppHeader} style={headerContainerStyle}>
          {headerControls}
          {!isMeasuring && isHeaderSettingsOpen && (
            <HeaderSettingsPopover
              popoverPosition={popoverPosition}
              headerStyles={headerStyles}
              setHeaderStyles={setHeaderStyles}
              onClose={() => setActiveSectionSettings(null)}
              editablePersonalInfo={editablePersonalInfo}
              setEditablePersonalInfo={setEditablePersonalInfo}
            />
          )}
          <div className={styles.ppHeaderLeft}>
            <h1 className={styles.ppName} style={nameStyleOverride}>
              <AutoSizeTextarea
                style={nameStyleOverride}
                value={editablePersonalInfo.full_name}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, full_name: val }))}
              />
            </h1>
            <h2 className={styles.ppTitle} style={titleStyleOverride}>
              <AutoSizeTextarea
                style={titleStyleOverride}
                value={editablePersonalInfo.title}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, title: val }))}
              />
            </h2>
            <div className={styles.ppContactGrid} style={contactsStyleOverride}>
              <div className={styles.ppContactCol}>
                {!!editablePersonalInfo.location?.trim() && (
                  <div className={styles.ppContactItem}>
                    <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'Adresse:' : 'Address:'}</span>
                    <span className={styles.ppContactVal}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.location}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, location: val }))}
                      />
                    </span>
                  </div>
                )}
                {!!editablePersonalInfo.email?.trim() && (
                  <div className={styles.ppContactItem}>
                    <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'E-Mail:' : 'Email:'}</span>
                    <span className={styles.ppContactVal}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.email}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, email: val }))}
                      />
                    </span>
                  </div>
                )}
                {!!editablePersonalInfo.website?.trim() && (
                  <div className={styles.ppContactItem}>
                    <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'Website:' : 'Website:'}</span>
                    <span className={styles.ppContactVal}>
                      <a href={ensureAbsoluteUrl(editablePersonalInfo.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.website}
                          onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, website: val }))}
                        />
                      </a>
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.ppContactCol}>
                {!!editablePersonalInfo.phone?.trim() && (
                  <div className={styles.ppContactItem}>
                    <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'Handy:' : 'Phone:'}</span>
                    <span className={styles.ppContactVal}>
                      <AutoSizeTextarea
                        value={formatPhoneNumber(editablePersonalInfo.phone)}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, phone: val }))}
                        onBlur={() => setEditablePersonalInfo((p: any) => ({ ...p, phone: formatPhoneNumber(p.phone) }))}
                      />
                    </span>
                  </div>
                )}
                {!!editablePersonalInfo.linkedin?.trim() && (
                  <div className={styles.ppContactItem}>
                    <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'LinkedIn:' : 'LinkedIn:'}</span>
                    <span className={styles.ppContactVal}>
                      <a href={ensureAbsoluteUrl(editablePersonalInfo.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.linkedin}
                          onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, linkedin: val }))}
                        />
                      </a>
                    </span>
                  </div>
                )}
                {!!editablePersonalInfo.github?.trim() && (
                  <div className={styles.ppContactItem}>
                    <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'GitHub:' : 'GitHub:'}</span>
                    <span className={styles.ppContactVal}>
                      <a href={ensureAbsoluteUrl(editablePersonalInfo.github)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.github}
                          onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, github: val }))}
                        />
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {editablePersonalInfo.image_url ? (
            <div className={styles.ppHeaderRight}>
              <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.ppAvatar} />
            </div>
          ) : null}
        </div>
      );
    }

    if (isGerman) {
      return (
        <div className={styles.germanHeader} style={headerContainerStyle}>
          {headerControls}
          {!isMeasuring && isHeaderSettingsOpen && (
            <HeaderSettingsPopover
              popoverPosition={popoverPosition}
              headerStyles={headerStyles}
              setHeaderStyles={setHeaderStyles}
              onClose={() => setActiveSectionSettings(null)}
              editablePersonalInfo={editablePersonalInfo}
              setEditablePersonalInfo={setEditablePersonalInfo}
            />
          )}
          <div className={styles.germanHeaderLeft}>
            <h1 className={styles.germanName} style={nameStyleOverride}>
              <AutoSizeTextarea
                style={nameStyleOverride}
                value={editablePersonalInfo.full_name}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, full_name: val }))}
              />
            </h1>
            <h2 className={styles.germanTitle} style={titleStyleOverride}>
              <AutoSizeTextarea
                style={titleStyleOverride}
                value={editablePersonalInfo.title}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, title: val }))}
              />
            </h2>
            <div className={styles.germanContactGrid} style={contactsStyleOverride}>
              <div className={styles.germanContactCol}>
                {editablePersonalInfo.location && (
                  <div className={styles.germanContactItem}>
                    <span className={styles.germanContactLabel}>Anschrift:</span>
                    <span className={styles.germanContactVal}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.location}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, location: val }))}
                      />
                    </span>
                  </div>
                )}
                {editablePersonalInfo.email && (
                  <div className={styles.germanContactItem}>
                    <span className={styles.germanContactLabel}>E-Mail:</span>
                    <span className={styles.germanContactVal}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.email}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, email: val }))}
                      />
                    </span>
                  </div>
                )}
                {editablePersonalInfo.website && (
                  <div className={styles.germanContactItem}>
                    <span className={styles.germanContactLabel}>Website:</span>
                    <span className={styles.germanContactVal}>
                      <a href={ensureAbsoluteUrl(editablePersonalInfo.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.website}
                          onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, website: val }))}
                        />
                      </a>
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.germanContactCol}>
                {editablePersonalInfo.phone && (
                  <div className={styles.germanContactItem}>
                    <span className={styles.germanContactLabel}>Handy:</span>
                    <span className={styles.germanContactVal}>
                      <AutoSizeTextarea
                        value={formatPhoneNumber(editablePersonalInfo.phone)}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, phone: val }))}
                        onBlur={() => setEditablePersonalInfo((p: any) => ({ ...p, phone: formatPhoneNumber(p.phone) }))}
                      />
                    </span>
                  </div>
                )}
                {editablePersonalInfo.linkedin && (
                  <div className={styles.germanContactItem}>
                    <span className={styles.germanContactLabel}>LinkedIn:</span>
                    <span className={styles.germanContactVal}>
                      <a href={ensureAbsoluteUrl(editablePersonalInfo.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.linkedin}
                          onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, linkedin: val }))}
                        />
                      </a>
                    </span>
                  </div>
                )}
                {editablePersonalInfo.github && (
                  <div className={styles.germanContactItem}>
                    <span className={styles.germanContactLabel}>GitHub:</span>
                    <span className={styles.germanContactVal}>
                      <a href={ensureAbsoluteUrl(editablePersonalInfo.github)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.github}
                          onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, github: val }))}
                        />
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {editablePersonalInfo.image_url ? (
            <div className={styles.germanHeaderRight}>
              <img src={editablePersonalInfo.image_url} alt="Profilbild" className={styles.germanAvatar} />
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className={styles.resumeHeader} style={headerContainerStyle}>
        {headerControls}
        {!isMeasuring && isHeaderSettingsOpen && (
          <HeaderSettingsPopover
            popoverPosition={popoverPosition}
            headerStyles={headerStyles}
            setHeaderStyles={setHeaderStyles}
            onClose={() => setActiveSectionSettings(null)}
            editablePersonalInfo={editablePersonalInfo}
            setEditablePersonalInfo={setEditablePersonalInfo}
          />
        )}
        <div className={styles.headerMain}>
          {editablePersonalInfo.image_url && (
            <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.profileAvatar} />
          )}
          <div className={styles.headerText}>
            <h2 style={nameStyleOverride}>
              <AutoSizeTextarea
                style={nameStyleOverride}
                value={editablePersonalInfo.full_name}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, full_name: val }))}
              />
            </h2>
            <p className={styles.resumeTitle} style={titleStyleOverride}>
              <AutoSizeTextarea
                style={titleStyleOverride}
                value={editablePersonalInfo.title}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, title: val }))}
              />
            </p>
          </div>
        </div>
        <div className={styles.resumeContacts} style={contactsStyleOverride}>
          {editablePersonalInfo.location && (
            <AutoSizeTextarea
              singleLine
              value={editablePersonalInfo.location}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, location: val }))}
            />
          )}
          {editablePersonalInfo.email && (
            <>
              {editablePersonalInfo.location && <span>•</span>}
              <a href={`mailto:${editablePersonalInfo.email}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
                <AutoSizeTextarea
                  singleLine
                  value={editablePersonalInfo.email}
                  onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, email: val }))}
                />
              </a>
            </>
          )}
          {editablePersonalInfo.website && (
            <>
              {(editablePersonalInfo.location || editablePersonalInfo.email) && <span>•</span>}
              <a href={ensureAbsoluteUrl(editablePersonalInfo.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
                <AutoSizeTextarea
                  singleLine
                  value={editablePersonalInfo.website}
                  onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, website: val }))}
                />
              </a>
            </>
          )}
          {editablePersonalInfo.phone && (
            <>
              {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website) && <span>•</span>}
              <a href={`tel:${editablePersonalInfo.phone}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
                <AutoSizeTextarea
                  singleLine
                  value={formatPhoneNumber(editablePersonalInfo.phone)}
                  onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, phone: val }))}
                  onBlur={() => setEditablePersonalInfo((p: any) => ({ ...p, phone: formatPhoneNumber(p.phone) }))}
                />
              </a>
            </>
          )}
          {editablePersonalInfo.linkedin && (
            <>
              {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website || editablePersonalInfo.phone) && <span>•</span>}
              <a href={ensureAbsoluteUrl(editablePersonalInfo.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
                <AutoSizeTextarea
                  singleLine
                  value={editablePersonalInfo.linkedin}
                  onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, linkedin: val }))}
                />
              </a>
            </>
          )}
          {editablePersonalInfo.github && (
            <>
              {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website || editablePersonalInfo.phone || editablePersonalInfo.linkedin) && <span>•</span>}
              <a href={ensureAbsoluteUrl(editablePersonalInfo.github)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
                <AutoSizeTextarea
                  singleLine
                  value={editablePersonalInfo.github}
                  onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, github: val }))}
                />
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2. Section Title
  if (unit.type === 'section-title') {
    const isSettingsOpen = activeSectionSettings === unit.sectionId;
    const secIdx = sections.findIndex(s => s.id === unit.sectionId);
    const isFirst = secIdx <= 0;
    const isLast = secIdx >= sections.length - 1 || secIdx === -1;
    const isSectionHovered = hoveredSectionId === unit.sectionId || activeSectionSettings === unit.sectionId;

    return (
      <div
        className={`${styles.sectionHeaderWrapper} ${isSectionHovered ? styles.sectionHoverActive : ''}`}
        style={mergedStyles}
        onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        {!isMeasuring && (
          <div className={`${styles.sectionControls} ${isSectionHovered ? styles.sectionControlsShow : ''} no-print`}>
            <button
              type="button"
              className={styles.moveSecBtn}
              title="Move Section Up"
              disabled={isFirst}
              onClick={(e) => {
                e.stopPropagation();
                handleMoveSection(unit.sectionId!, 'up');
              }}
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              className={styles.moveSecBtn}
              title="Move Section Down"
              disabled={isLast}
              onClick={(e) => {
                e.stopPropagation();
                handleMoveSection(unit.sectionId!, 'down');
              }}
            >
              <ChevronDown size={12} />
            </button>
            <button
              type="button"
              className={styles.quickAddBtn}
              title="Quick Add Entry to Section"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAddSectionItem(unit.sectionId!);
              }}
            >
              <Plus size={12} />
            </button>
            <button
              type="button"
              className={styles.deleteBlockBtn}
              title="Hide Section"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Hide section "${unit.titleText}"? You can re-enable it in the sidebar.`)) {
                  setSections(prev => prev.map(s => s.id === unit.sectionId ? { ...s, visible: false } : s));
                }
              }}
            >
              <EyeOff size={12} />
            </button>
            <button
              type="button"
              className={styles.aiSectionBtn}
              title="AI Polish & Section Tailor"
              onClick={(e) => {
                e.stopPropagation();
                setOpenSectionAiModalId(unit.sectionId!);
              }}
            >
              <Sparkles size={12} />
            </button>
            <button
              type="button"
              className={styles.itemSortBtn}
              title="Customize Section Styles"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setPopoverPosition({ top: rect.top, left: rect.left });
                setActiveSectionSettings(isSettingsOpen ? null : unit.sectionId!);
              }}
            >
              <Settings size={12} />
            </button>
          </div>
        )}
        {(() => {
          const formattedTitleNode = renderFormattedTitle(
            sec?.name || unit.titleText || '',
            localStyles.headingColor || customStyles.accentColor,
            localStyles.headingSecondaryColor || customStyles.headingSecondaryColor || '#3d7ee6'
          );
          return (
            <h3 className={titleClass} style={{
              textTransform: 'uppercase',
              fontSize: localStyles.headingSize ? `${localStyles.headingSize}px` : undefined,
              color: localStyles.headingColor ? localStyles.headingColor : undefined,
              fontWeight: localStyles.headingWeight ? localStyles.headingWeight : undefined,
              fontStyle: localStyles.headingStyle ? localStyles.headingStyle : undefined,
              textAlign: localStyles.headingAlignment ? localStyles.headingAlignment : undefined,
            } as React.CSSProperties}>
              {formattedTitleNode && editingSectionTitleId !== unit.sectionId ? (
                <span onClick={() => setEditingSectionTitleId(unit.sectionId!)} style={{ cursor: 'pointer', display: 'inline-block', width: '100%' }}>
                  {formattedTitleNode}
                </span>
              ) : (
                <AutoSizeTextarea
                  autoFocus
                  value={unit.titleText || ''}
                  onChange={(val) => setSections(prev => prev.map(s => s.id === unit.sectionId ? { ...s, name: val } : s))}
                  onBlur={() => setEditingSectionTitleId(null)}
                />
              )}
            </h3>
          );
        })()}

        {!isMeasuring && isSettingsOpen && (
          <SectionSettingsPopover
            sectionId={unit.sectionId!}
            sec={sec}
            popoverPosition={popoverPosition}
            setSections={setSections}
            onClose={() => setActiveSectionSettings(null)}
            setEditableExperiences={setEditableExperiences}
            setEditableProjects={setEditableProjects}
            setEditableEducations={setEditableEducations}
            openSectionAiModal={(id) => setOpenSectionAiModalId(id)}
          />
        )}
      </div>
    );
  }

  // 3. Summary Content
  if (unit.type === 'summary') {
    const isSectionHovered = hoveredSectionId === unit.sectionId;
    return (
      <div
        onClick={handleContainerClickToFocus}
        className={`${styles.summaryBox} ${styles.canvasHoverBlock} ${isSectionHovered ? styles.sectionHoverActive : ''} ${!reviewedActions['summary'] ? styles.aiHighlighted : ''}`}
        style={mergedStyles}
        onMouseEnter={() => { handleMouseEnterSuggestion('summary'); setHoveredSectionId(unit.sectionId || null); }}
        onMouseLeave={() => { handleMouseLeaveSuggestion(); setHoveredSectionId(null); }}
      >
        {renderHoverAiControls('summary', editableSummary, [
          { label: "Punchier", prompt: "Make concise and punchier with strong executive tone" },
          { label: "Leadership", prompt: "Highlight leadership, technical strategy, and architecture" },
          { label: "Metrics & Impact", prompt: "Focus on quantifiable business metrics and project ROI" }
        ])}

        {isRephrasing['summary'] ? (
          <div className={styles.canvasSkeletonBlock}>
            <div className={styles.skeletonLine} style={{ width: '96%' }} />
            <div className={styles.skeletonLine} style={{ width: '90%' }} />
            <div className={styles.skeletonLine} style={{ width: '72%' }} />
          </div>
        ) : (
          <AutoSizeTextarea
            value={editableSummary}
            onChange={(val) => setEditableSummary(val)}
          />
        )}
      </div>
    );
  }

  // 4. Experience Card Item
  if (unit.type === 'experience-item') {
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
        {!isMeasuring && (
          <div className={`${styles.itemControls} no-print`}>
            <button
              type="button"
              disabled={expIdx === 0}
              onClick={() => handleMoveExperience(expIdx, 'up')}
              className={styles.itemSortBtn}
              title="Move Up"
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              disabled={expIdx === editableExperiences.length - 1}
              onClick={() => handleMoveExperience(expIdx, 'down')}
              className={styles.itemSortBtn}
              title="Move Down"
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleAddExperienceBullet(expIdx)}
              className={styles.itemSortBtn}
              title="Add Bullet Point"
            >
              <Plus size={10} />
            </button>
            <button
              type="button"
              onClick={() => setEditableExperiences(prev => prev.filter(e => e.id !== exp.id))}
              className={styles.deleteBlockBtn}
              title="Exclude item"
            >
              <Trash size={12} />
            </button>
          </div>
        )}

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
  }

  // 5. Project Card Item
  if (unit.type === 'project-item') {
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
        {!isMeasuring && (
          <div className={`${styles.itemControls} no-print`}>
            <button
              type="button"
              disabled={projIdx === 0}
              onClick={() => handleMoveProject(projIdx, 'up')}
              className={styles.itemSortBtn}
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              disabled={projIdx === editableProjects.length - 1}
              onClick={() => handleMoveProject(projIdx, 'down')}
              className={styles.itemSortBtn}
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleAddProjectBullet(projIdx)}
              className={styles.itemSortBtn}
            >
              <Plus size={10} />
            </button>
            <button
              type="button"
              onClick={() => setEditableProjects(prev => prev.filter(p => p.id !== proj.id))}
              className={styles.deleteBlockBtn}
            >
              <Trash size={12} />
            </button>
          </div>
        )}

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
                      <span className={styles.bulletDot}>•</span>
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
                    <span className={styles.bulletDot}>•</span>
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
  }

  // 6. Education Card Item
  if (unit.type === 'education-item') {
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
        {!isMeasuring && (
          <div className={`${styles.itemControls} no-print`}>
            <button
              type="button"
              disabled={eduIdx === 0}
              onClick={() => handleMoveEducation(eduIdx, 'up')}
              className={styles.itemSortBtn}
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              disabled={eduIdx === editableEducations.length - 1}
              onClick={() => handleMoveEducation(eduIdx, 'down')}
              className={styles.itemSortBtn}
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleAddEducationBullet(eduIdx)}
              className={styles.itemSortBtn}
              title="Add Bullet Point"
            >
              <Plus size={10} />
            </button>
            <button
              type="button"
              onClick={() => setEditableEducations(prev => prev.filter(e => e.id !== edu.id))}
              className={styles.deleteBlockBtn}
            >
              <Trash size={12} />
            </button>
          </div>
        )}

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
                      <span className={styles.bulletDot}>•</span>
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
                    <span className={styles.bulletDot}>•</span>
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
  }

  // 7. Languages Block
  if (unit.type === 'skills-languages') {
    const skillsList = unit.skills || [];
    const isSectionHovered = hoveredSectionId === unit.sectionId;

    return (
      <div
        className={isSectionHovered ? styles.sectionHoverActive : ''}
        style={{ ...mergedStyles, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', marginTop: '6px', marginBottom: '8px' }}
        onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        {!isMeasuring && (
          <div className={`${styles.itemControls} no-print`} style={{ left: '-48px' }}>
            <button type="button" disabled={languagesFirst} onClick={() => setLanguagesFirst(true)} className={styles.itemSortBtn} title="Move Up"><ArrowUp size={12} /></button>
            <button type="button" disabled={!languagesFirst} onClick={() => setLanguagesFirst(false)} className={styles.itemSortBtn} title="Move Down"><ArrowDown size={12} /></button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete languages?")) {
                  setEditableSkills(prev => prev.filter(s => (s.category || '').toLowerCase().trim() !== 'languages'));
                }
              }}
              className={styles.deleteBlockBtn}
              title="Delete languages"
            >
              <Trash size={12} />
            </button>
          </div>
        )}

        <div style={{ fontWeight: 700, fontSize: '1.05em', color: 'var(--accent-color, #0f172a)', marginBottom: '4px' }}>
          <AutoSizeTextarea
            value={languagesTitle || (targetLanguage === 'de' ? 'Sprachen' : 'Languages')}
            onChange={(val) => setLanguagesTitle(val)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '24px', width: '100%' }}>
          <span className={styles.bulletDot}>•</span>
          <div style={{ flex: 1 }}>
            {(() => {
              const rawLangs = skillsList.map(s => s.name).join(', ');
              const formattedNode = renderFormattedLanguageList(rawLangs);
              return formattedNode && editingLanguagesId !== unit.id ? (
                <div onClick={() => setEditingLanguagesId(unit.id!)} style={{ cursor: 'pointer', minHeight: '1.2em' }}>
                  {formattedNode}
                </div>
              ) : (
                <AutoSizeTextarea
                  value={rawLangs}
                  onChange={(val) => {
                    const names = val.split(',').map(n => n.trim()).filter(Boolean);
                    setEditableSkills(prev => {
                      const nonLang = prev.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
                      const updatedLangs = names.map((name, i) => ({
                        id: `lang_${i}_${Date.now()}`,
                        name,
                        category: 'languages'
                      }));
                      return [...nonLang, ...updatedLangs];
                    });
                  }}
                  onBlur={() => setEditingLanguagesId(null)}
                />
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // 8. Skills Category Block
  if (unit.type === 'skills-category') {
    const skillsList = unit.skills || [];
    const cat = unit.category!;
    const catLabel = getLocalizedCategoryName(cat);
    const isSectionHovered = hoveredSectionId === unit.sectionId;

    return (
      <div
        className={isSectionHovered ? styles.sectionHoverActive : ''}
        style={{ ...mergedStyles, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', marginBottom: '8px' }}
        onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
        onMouseLeave={() => setHoveredSectionId(null)}
      >
        {!isMeasuring && (
          <div className={`${styles.itemControls} no-print`} style={{ left: '-82px' }}>
            {handleMoveSkillCategory && (
              <>
                <button
                  type="button"
                  onClick={() => handleMoveSkillCategory(cat, 'up')}
                  className={styles.moveItemBtn}
                  title="Move Category Up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveSkillCategory(cat, 'down')}
                  className={styles.moveItemBtn}
                  title="Move Category Down"
                >
                  <ArrowDown size={12} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete skills category "${catLabel}"?`)) {
                  setEditableSkills(prev => prev.filter(s => (s.category || 'technical').toLowerCase().trim() !== cat.toLowerCase().trim()));
                }
              }}
              className={styles.deleteBlockBtn}
              title={`Delete ${catLabel}`}
            >
              <Trash size={12} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '24px', width: '100%' }}>
          <span className={styles.bulletDot}>•</span>
          <strong style={{ fontWeight: 700, marginRight: '5px', color: 'var(--text-color, #1e293b)' }}>
            {catLabel}:
          </strong>
          <div style={{ flex: 1 }}>
            <AutoSizeTextarea
              value={skillsList.map(s => s.name).join(', ')}
              onChange={(val) => {
                const names = val.split(',').map(n => n.trim()).filter(Boolean);
                setEditableSkills(prev => {
                  const otherSkills = prev.filter(s => s.category.toLowerCase() !== cat.toLowerCase() && (s.category || '').toLowerCase().trim() !== 'languages');
                  const updatedSkills = names.map((name, i) => ({
                    id: `skill_${cat}_${i}_${Date.now()}`,
                    name,
                    category: cat.toLowerCase()
                  }));
                  const finalLangs = prev.filter(s => (s.category || '').toLowerCase().trim() === 'languages');
                  return [...finalLangs, ...otherSkills, ...updatedSkills];
                });
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 9. Custom Section Items
  if (unit.type === 'custom-content') {
    const isSectionHovered = hoveredSectionId === unit.sectionId;

    if (sec?.customFormat === 'keyvalue') {
      const pairs = sec.keyValuePairs || [{ key: 'Label', value: 'Detail Description' }];
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
              {!isMeasuring && (
                <div className={`${styles.bulletControls} no-print`} style={{ left: '-40px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSections(prev => prev.map(s => {
                        if (s.id === unit.sectionId) {
                          const newPairs = [...(s.keyValuePairs || [])];
                          newPairs.splice(pIdx, 1);
                          return { ...s, keyValuePairs: newPairs };
                        }
                        return s;
                      }));
                    }}
                    className={styles.deleteBulletBtn}
                  >
                    <Trash size={12} />
                  </button>
                  <button
                    type="button"
                    style={{ color: 'var(--primary)' }}
                    onClick={() => {
                      setSections(prev => prev.map(s => {
                        if (s.id === unit.sectionId) {
                          const newPairs = [...(s.keyValuePairs || [])];
                          newPairs.splice(pIdx + 1, 0, { key: 'Key Label', value: 'Text Value' });
                          return { ...s, keyValuePairs: newPairs };
                        }
                        return s;
                      }));
                    }}
                    className={styles.deleteBulletBtn}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
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
  }

  return null;
};
