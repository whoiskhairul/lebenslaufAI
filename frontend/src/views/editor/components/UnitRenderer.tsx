import React from 'react';
import type { RenderableUnit } from '../types/editor.types';
import styles from '../../EditorNew.module.css';
import { formatPhoneNumber } from '../utils/phoneUtils';
import type { UnitRendererProps } from './UnitRendererProps';
import { UnitContext } from './unitRenderers/shared';
import { HeaderUnit } from './unitRenderers/HeaderUnit';
import { SectionTitleUnit } from './unitRenderers/SectionTitleUnit';
import { SummaryUnit } from './unitRenderers/SummaryUnit';
import { ExperienceItemUnit } from './unitRenderers/ExperienceItemUnit';
import { ProjectItemUnit } from './unitRenderers/ProjectItemUnit';
import { EducationItemUnit } from './unitRenderers/EducationItemUnit';
import { SkillsLanguagesUnit, SkillsCategoryUnit } from './unitRenderers/SkillsUnits';
import { CustomContentUnit } from './unitRenderers/CustomContentUnit';

export type { UnitRendererProps } from './UnitRendererProps';

/**
 * Dispatcher: computes per-unit shared context (template flags, section
 * lookup, merged inline styles, spacing) once, then delegates rendering to
 * the branch component for the unit type.
 */
export const UnitRenderer: React.FC<UnitRendererProps> = (p) => {
  const {
    unit,
    isMeasuring = false,
    template,
    sections,
    customStyles,
    editableExperiences,
    editableProjects,
    editableEducations,
    editableSkills,
    languagesFirst,
    categoryOrder
  } = p;

  const isPP = template === 'pixel_perfect_pdf';
  const isGerman = template === 'german_style_cv';

  const sec = sections.find(s => s.id === unit.sectionId);
  if (!isMeasuring && sec && !sec.visible) return null;
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

  void formatPhoneNumber;

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

  const ctx: UnitContext = {
    isPP,
    isGerman,
    sec,
    localStyles,
    mergedStyles,
    titleClass,
    handleContainerClickToFocus
  };

  switch (unit.type) {
    case 'header':
      return <HeaderUnit p={p} ctx={ctx} />;
    case 'section-title':
      return <SectionTitleUnit p={p} ctx={ctx} />;
    case 'summary':
      return <SummaryUnit p={p} ctx={ctx} />;
    case 'experience-item':
      return <ExperienceItemUnit p={p} ctx={ctx} />;
    case 'project-item':
      return <ProjectItemUnit p={p} ctx={ctx} />;
    case 'education-item':
      return <EducationItemUnit p={p} ctx={ctx} />;
    case 'skills-languages':
      return <SkillsLanguagesUnit p={p} ctx={ctx} />;
    case 'skills-category':
      return <SkillsCategoryUnit p={p} ctx={ctx} />;
    case 'custom-content':
      return <CustomContentUnit p={p} ctx={ctx} />;
    case 'contacts-static':
      // Rendered by EditorNew's creative_tech sidebar; no standalone unit markup.
      return null;
    default:
      return null;
  }
};

export type { RenderableUnit };
