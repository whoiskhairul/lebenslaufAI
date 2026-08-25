import React, { useEffect, useRef, useState } from 'react';
import { RenderableUnit } from '../../../views/editor/types/editor.types';
import { formatPhoneNumber } from '../../../views/editor/utils/phoneUtils';
import { AutoSizeTextarea, MeasuringContext } from '../../../views/editor/components/AutoSizeTextarea';
import { UnitRenderer } from '../../../views/editor/components/UnitRenderer';
import ed from '../../../views/EditorNew.module.css';
import { DEFAULT_CUSTOM_STYLES } from '../../editor/state/cvDocumentStore';
import { DEFAULT_SECTIONS } from '../../editor/hooks/cvDocumentDefaults';

const templateClassMap: { [key: string]: string } = {
  pixel_perfect_pdf: 'pixelPerfectLayout',
  german_style_cv: 'germanLayout',
  modern_minimalist: 'modern_minimalist',
  executive_professional: 'executive_professional',
  creative_tech: 'creative_tech'
};

export interface CvDocData {
  template: string;
  sections: any[];
  customStyles: any;
  headerStyles: any;
  personalInfo: any;
  experiences: any[];
  projects: any[];
  educations: any[];
  skills: any[];
  summary: string;
  languagesFirst: boolean;
  languagesTitle: string;
  categoryOrder: string[];
}

export function prepareCvData(ver: any): CvDocData {
  const td = ver.tailored_details || {};
  const profile = td.original_profile || {};
  const customData = td.customization;

  let sections = DEFAULT_SECTIONS;
  let customStyles: any = {
    ...DEFAULT_CUSTOM_STYLES,
    accentColor:
      ver.template === 'executive_professional'
        ? '#1e3a8a'
        : ver.template === 'creative_tech'
        ? '#10b981'
        : '#0f172a'
  };
  let headerStyles: any = {};
  let categoryOrder: string[] = [];
  let languagesFirst = false;
  let languagesTitle = 'Languages';

  if (customData) {
    if (customData.sections) sections = customData.sections;
    if (customData.customStyles) {
      customStyles = {
        ...customStyles,
        ...customData.customStyles,
        pageSize: customData.customStyles?.pageSize || 'A4'
      };
    }
    if (customData.headerStyles) headerStyles = customData.headerStyles;
    if (customData.categoryOrder) categoryOrder = customData.categoryOrder;
    if (typeof customData.languagesFirst === 'boolean') languagesFirst = customData.languagesFirst;
    if (customData.languagesTitle) languagesTitle = customData.languagesTitle;
  }

  const tailoredPI = td.personal_info || {};
  const pi = profile.personal_info || {};
  const personalInfo = {
    id: pi.id,
    full_name: pi.full_name || '',
    title: tailoredPI.title || pi.title || '',
    email: pi.email || '',
    phone: formatPhoneNumber(pi.phone || ''),
    location: tailoredPI.location || pi.location || '',
    date_of_birth: pi.date_of_birth || '',
    nationality: pi.nationality || '',
    linkedin: pi.linkedin || '',
    github: pi.github || '',
    website: pi.website || '',
    image_url: pi.image_url || '',
    signature_image: pi.signature_image || ''
  };

  const rawExps = td.experiences || [];
  const experiences = (profile.work_experiences || []).map((exp: any) => {
    const tailored = rawExps.find((e: any) => e.id === exp.id);
    return {
      id: exp.id,
      company: exp.company || '',
      position: tailored?.position || exp.position || '',
      location: tailored?.location || exp.location || '',
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      bullets: tailored ? tailored.bullets : exp.bullets
    };
  });

  const rawSkills = td.skills || profile.skills || [];
  const COMMON_TECH_WORDS = [
    'typescript', 'javascript', 'js', 'ts', 'python', 'java', 'c++', 'c#', 'php', 'ruby',
    'golang', 'html', 'css', 'sql', 'react', 'vue', 'angular', 'node', 'django', 'postgresql',
    'mysql', 'mongodb', 'docker', 'kubernetes', 'aws', 'git', 'flutter', 'dart', 'kotlin', 'swift'
  ];
  const skills = rawSkills.map((s: any) => {
    const isTech = COMMON_TECH_WORDS.includes((s.name || '').toLowerCase().trim());
    if (isTech && (s.category || '').toLowerCase().trim() === 'languages') {
      return { ...s, category: 'programming languages' };
    }
    return s;
  });

  const detailsAny = td as any;
  const tailoredProjects = detailsAny.tailored_projects || detailsAny.projects || profile.projects || [];
  const projects = (profile.projects || tailoredProjects).map((p: any) => {
    const tailoredP = (detailsAny.tailored_projects || []).find((tp: any) => tp.id === p.id);
    return {
      id: p.id || `proj_${Math.random()}`,
      bullets: tailoredP?.bullets || p.bullets || [],
      title: tailoredP?.title || p.title || '',
      role: tailoredP?.role || p.role || '',
      technologies: p.technologies || p.tech_stack || tailoredP?.technologies || [],
      date: p.date || '',
      link: p.link || tailoredP?.link || ''
    };
  });

  const rawEdus = td.educations || [];
  const educations = (profile.educations || []).map((edu: any) => {
    const tailored = rawEdus.find((e: any) => e.id === edu.id);
    return {
      id: edu.id,
      institution: edu.institution || '',
      degree: tailored?.degree || edu.degree || '',
      field_of_study: tailored?.field_of_study || edu.field_of_study || '',
      location: tailored?.location || edu.location || '',
      start_date: edu.start_date || '',
      end_date: edu.end_date || ''
    };
  });

  return {
    template: ver.template,
    sections,
    customStyles,
    headerStyles,
    personalInfo,
    experiences,
    projects,
    educations,
    skills,
    summary: ver.tailored_summary || '',
    languagesFirst,
    languagesTitle,
    categoryOrder
  };
}

const localizedCategoryName = (catName: string): string =>
  catName.charAt(0).toUpperCase() + catName.slice(1).replace(/_/g, ' ');

const noop = () => {};

const readOnlyRendererProps = {
  setEditablePersonalInfo: noop,
  setEditableExperiences: noop,
  setEditableProjects: noop,
  setEditableEducations: noop,
  setEditableSkills: noop,
  setEditableSummary: noop,
  setActiveSectionSettings: noop,
  setPopoverPosition: noop,
  setHeaderStyles: noop,
  setSections: noop,
  setEditingSectionTitleId: noop,
  setEditingLanguagesId: noop,
  setHoveredSectionId: noop,
  handleMoveSection: noop,
  handleQuickAddSectionItem: noop,
  setOpenSectionAiModalId: noop,
  handleMouseEnterSuggestion: noop,
  handleMouseLeaveSuggestion: noop,
  reviewedActions: {} as Record<string, string>,
  renderHoverAiControls: (): React.ReactNode => null,
  isRephrasing: {} as Record<string, boolean>,
  handleMoveExperience: noop,
  handleAddExperienceBullet: noop,
  handleRemoveExperienceBullet: noop,
  handleBulletKeyDown: noop,
  handleMoveProject: noop,
  handleAddProjectBullet: noop,
  handleRemoveProjectBullet: noop,
  handleMoveEducation: noop,
  handleAddEducationBullet: noop,
  handleRemoveEducationBullet: noop,
  setLanguagesFirst: noop,
  setLanguagesTitle: noop,
  targetLanguage: 'en' as 'en' | 'de',
  getLocalizedCategoryName: localizedCategoryName,
  getAlertsFor: (): any[] => []
};

function buildUnits(d: CvDocData): RenderableUnit[] {
  const unitsList: RenderableUnit[] = [];
  unitsList.push({ type: 'header', id: 'header' });

  if (d.template === 'creative_tech') {
    unitsList.push({ type: 'contacts-static', id: 'contacts-static' });
  }

  d.sections.forEach((sec) => {
    if (!sec.visible) return;

    if (sec.type === 'summary') {
      unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
      unitsList.push({ type: 'summary', id: 'summary-content', sectionId: sec.id });
    } else if (sec.type === 'experience') {
      unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
      d.experiences.forEach((exp, idx) => {
        unitsList.push({ type: 'experience-item', id: `exp-item-${exp.id}`, sectionId: sec.id, itemIndex: idx, itemData: exp });
      });
    } else if (sec.type === 'projects') {
      unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
      d.projects.forEach((proj, idx) => {
        unitsList.push({ type: 'project-item', id: `proj-item-${proj.id}`, sectionId: sec.id, itemIndex: idx, itemData: proj });
      });
    } else if (sec.type === 'education') {
      unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
      d.educations.forEach((edu, idx) => {
        unitsList.push({ type: 'education-item', id: `edu-item-${edu.id}`, sectionId: sec.id, itemIndex: idx, itemData: edu });
      });
    } else if (sec.type === 'skills') {
      unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });

      const langSkills = d.skills.filter((s) => (s.category || '').toLowerCase().trim() === 'languages');
      const itSkills = d.skills.filter((s) => (s.category || '').toLowerCase().trim() !== 'languages');
      const uniqueCats = Array.from(new Set(itSkills.map((s) => (s.category || 'technical').toLowerCase().trim())));

      const normalizedOrder = d.categoryOrder.map((c) => c.toLowerCase().trim());
      const itCategories = normalizedOrder.filter((c) => uniqueCats.includes(c));
      const extraCats = uniqueCats.filter((c) => !itCategories.includes(c));
      const finalCategories = [...itCategories, ...extraCats];

      if (d.categoryOrder.length === 0) {
        finalCategories.sort((a, b) => {
          const getCategoryOrderScore = (cat: string) => {
            const order = [
              'programming languages',
              'frameworks & libraries',
              'databases',
              'cloud & devops',
              'development tools',
              'testing'
            ];
            const idx = order.indexOf(cat.toLowerCase().trim());
            if (idx !== -1) return idx;
            if (cat.toLowerCase().trim() === 'languages') return 999;
            return 100;
          };
          return getCategoryOrderScore(a) - getCategoryOrderScore(b);
        });
      }

      const addLanguagesUnit = () => {
        if (langSkills.length > 0) {
          unitsList.push({ type: 'skills-languages', id: 'skills-languages', sectionId: sec.id, skills: langSkills });
        }
      };
      const addITSkillsUnits = () => {
        finalCategories.forEach((cat) => {
          const catSkills = itSkills.filter((s) => (s.category || 'technical').toLowerCase().trim() === cat);
          if (catSkills.length > 0) {
            unitsList.push({ type: 'skills-category', id: `skills-category-${cat}`, sectionId: sec.id, category: cat, skills: catSkills });
          }
        });
      };

      if (d.languagesFirst) {
        addLanguagesUnit();
        addITSkillsUnits();
      } else {
        addITSkillsUnits();
        addLanguagesUnit();
      }
    } else if (sec.type === 'custom') {
      unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
      unitsList.push({
        type: 'custom-content',
        id: `custom-content-${sec.id}`,
        sectionId: sec.id,
        bullets: sec.bullets || [],
        itemData: sec
      });
    }
  });

  return unitsList;
}

function paginate(
  unitsList: RenderableUnit[],
  measured: Record<string, number>,
  d: CvDocData
): RenderableUnit[][] {
  const pageHeight = 1123;
  const pageMargin = d.customStyles.pageMargin || 48;
  const printableContentHeight = pageHeight - 2 * pageMargin;
  const activeColumnLimit = printableContentHeight;

  const getUnitEffectiveHeight = (u: RenderableUnit): number => {
    const baseHeight = measured[u.id] || 0;
    const unitGap = u.type === 'section-title' ? (d.customStyles.sectionSpacing || 14) : 4;
    return baseHeight + unitGap;
  };

  const newPages: RenderableUnit[][] = [[]];
  let currentMainHeight = 0;
  let currentSidebarHeight = 0;

  for (let i = 0; i < unitsList.length; i++) {
    const unit = unitsList[i];
    const effHeight = getUnitEffectiveHeight(unit);

    if (unit.type === 'header') {
      newPages[0].push(unit);
      currentMainHeight += effHeight;
      currentSidebarHeight += effHeight;
      continue;
    }

    const isSidebarColumn =
      d.template === 'creative_tech' && (unit.sectionId === 'skills' || unit.type === 'contacts-static');

    let shouldPushPage = false;

    if (unit.type === 'section-title') {
      let remainingSectionHeight = 0;
      for (let j = i; j < unitsList.length && unitsList[j].sectionId === unit.sectionId; j++) {
        remainingSectionHeight += getUnitEffectiveHeight(unitsList[j]);
      }

      const currentHeight = isSidebarColumn ? currentSidebarHeight : currentMainHeight;

      if (remainingSectionHeight <= activeColumnLimit) {
        if (currentHeight + remainingSectionHeight > activeColumnLimit && currentHeight > 0) {
          shouldPushPage = true;
        }
      } else {
        const firstContentUnit =
          unitsList[i + 1] && unitsList[i + 1].sectionId === unit.sectionId ? unitsList[i + 1] : null;
        const minHeaderGroupHeight = effHeight + (firstContentUnit ? getUnitEffectiveHeight(firstContentUnit) : 0);
        if (currentHeight + minHeaderGroupHeight > activeColumnLimit && currentHeight > 0) {
          shouldPushPage = true;
        }
      }
    } else {
      const currentHeight = isSidebarColumn ? currentSidebarHeight : currentMainHeight;
      if (currentHeight + effHeight > activeColumnLimit && currentHeight > 0) {
        shouldPushPage = true;
      }
    }

    if (shouldPushPage) {
      newPages.push([]);
      currentMainHeight = 0;
      currentSidebarHeight = 0;
    }

    newPages[newPages.length - 1].push(unit);
    if (isSidebarColumn) {
      currentSidebarHeight += effHeight;
    } else {
      currentMainHeight += effHeight;
    }
  }

  return newPages;
}

interface AdminCvDocumentProps {
  data: CvDocData | null;
}

export const AdminCvDocument: React.FC<AdminCvDocumentProps> = ({ data }) => {
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<RenderableUnit[][]>([]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setPages([]);
  }, [data]);

  useEffect(() => {
    if (!data || !hiddenCanvasRef.current) return;

    const measureAndLayout = () => {
      const canvas = hiddenCanvasRef.current;
      if (!canvas) return;
      if (canvas.getBoundingClientRect().width === 0) return;

      const measured: Record<string, number> = {};
      canvas.querySelectorAll('[data-measuring-id]').forEach((el: any) => {
        const id = el.getAttribute('data-measuring-id');
        if (id) {
          const compStyle = window.getComputedStyle(el);
          const marginTop = parseFloat(compStyle.marginTop) || 0;
          const marginBottom = parseFloat(compStyle.marginBottom) || 0;
          measured[id] = el.getBoundingClientRect().height + marginTop + marginBottom;
        }
      });

      setPages(paginate(buildUnits(data), measured, data));
    };

    measureAndLayout();
    const t1 = setTimeout(measureAndLayout, 60);
    const t2 = setTimeout(measureAndLayout, 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data]);

  useEffect(() => {
    const update = () => {
      const el = viewportRef.current;
      if (!el) return;
      const vw = el.clientWidth - 40;
      if (vw <= 0) return;
      setScale(Math.min(1, vw / 794));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [data]);

  if (!data) return null;

  const d = data;
  const tplClass = ed[templateClassMap[d.template] || d.template] || '';
  const pageMargin = d.customStyles.pageMargin || 48;

  const pageVars = {
    width: '210mm',
    '--print-page-width': '210mm',
    '--print-page-height': '297mm',
    '--print-page-margin': `${pageMargin}px`,
    boxSizing: 'border-box' as const,
    fontSize: `${d.customStyles.fontSize}px`,
    lineHeight: d.customStyles.lineHeight,
    '--base-font-size': `${d.customStyles.fontSize}px`,
    '--heading-size-mult': d.customStyles.headingSize,
    '--line-height-mult': d.customStyles.lineHeight,
    '--section-spacing': `${d.customStyles.sectionSpacing}px`,
    '--bullet-spacing': `${d.customStyles.bulletSpacing || 4}px`,
    '--accent-color': d.customStyles.accentColor,
    '--text-color': d.customStyles.textColor,
    '--text-alignment': d.customStyles.alignment,
    '--font-override': d.customStyles.fontFamily || undefined
  };

  const renderUnit = (unit: RenderableUnit, isMeasuring: boolean = false) => (
    <UnitRenderer
      unit={unit}
      isMeasuring={isMeasuring}
      template={d.template}
      sections={d.sections}
      customStyles={d.customStyles}
      headerStyles={d.headerStyles}
      editablePersonalInfo={d.personalInfo}
      editableExperiences={d.experiences}
      editableProjects={d.projects}
      editableEducations={d.educations}
      editableSkills={d.skills}
      editableSummary={d.summary}
      editingSectionTitleId={null}
      editingLanguagesId={null}
      hoveredSectionId={null}
      activeSectionSettings={null}
      popoverPosition={null}
      languagesFirst={d.languagesFirst}
      languagesTitle={d.languagesTitle}
      categoryOrder={d.categoryOrder}
      {...(readOnlyRendererProps as any)}
    />
  );

  const renderSectionMeasuringUnits = (s: any) => {
    const items: React.ReactNode[] = [];
    if (s.type === 'summary') {
      items.push(
        <div key="summary-content" data-measuring-id="summary-content" style={{ width: '100%' }}>
          {renderUnit({ type: 'summary', id: 'summary-content', sectionId: s.id }, true)}
        </div>
      );
    } else if (s.type === 'experience') {
      d.experiences.forEach((exp) => {
        items.push(
          <div key={`exp-item-${exp.id}`} data-measuring-id={`exp-item-${exp.id}`} style={{ width: '100%' }}>
            {renderUnit({ type: 'experience-item', id: `exp-item-${exp.id}`, sectionId: s.id, itemData: exp }, true)}
          </div>
        );
      });
    } else if (s.type === 'projects') {
      d.projects.forEach((proj) => {
        items.push(
          <div key={`proj-item-${proj.id}`} data-measuring-id={`proj-item-${proj.id}`} style={{ width: '100%' }}>
            {renderUnit({ type: 'project-item', id: `proj-item-${proj.id}`, sectionId: s.id, itemData: proj }, true)}
          </div>
        );
      });
    } else if (s.type === 'education') {
      d.educations.forEach((edu) => {
        items.push(
          <div key={`edu-item-${edu.id}`} data-measuring-id={`edu-item-${edu.id}`} style={{ width: '100%' }}>
            {renderUnit({ type: 'education-item', id: `edu-item-${edu.id}`, sectionId: s.id, itemData: edu }, true)}
          </div>
        );
      });
    } else if (s.type === 'custom') {
      items.push(
        <div key={`custom-content-${s.id}`} data-measuring-id={`custom-content-${s.id}`} style={{ width: '100%' }}>
          {renderUnit({ type: 'custom-content', id: `custom-content-${s.id}`, sectionId: s.id, bullets: s.bullets || [] }, true)}
        </div>
      );
    }
    return <React.Fragment key={s.id}>{items}</React.Fragment>;
  };

  const renderSkillsMeasuringUnits = (s: any) => {
    const items: React.ReactNode[] = [];
    const langSkills = d.skills.filter((sk) => (sk.category || '').toLowerCase().trim() === 'languages');
    const itSkills = d.skills.filter((sk) => (sk.category || '').toLowerCase().trim() !== 'languages');
    const uniqueCats = Array.from(new Set(itSkills.map((sk) => (sk.category || 'technical').toLowerCase().trim())));

    const normalizedOrder = d.categoryOrder.map((c) => c.toLowerCase().trim());
    const itCategories = normalizedOrder.filter((c) => uniqueCats.includes(c));
    const extraCats = uniqueCats.filter((c) => !itCategories.includes(c));
    const finalCategories = [...itCategories, ...extraCats];

    if (d.categoryOrder.length === 0) {
      finalCategories.sort((a, b) => {
        const getCategoryOrderScore = (cat: string) => {
          const order = [
            'programming languages',
            'frameworks & libraries',
            'databases',
            'cloud & devops',
            'development tools',
            'testing'
          ];
          const idx = order.indexOf(cat.toLowerCase().trim());
          if (idx !== -1) return idx;
          if (cat.toLowerCase().trim() === 'languages') return 999;
          return 100;
        };
        return getCategoryOrderScore(a) - getCategoryOrderScore(b);
      });
    }

    const pushLang = () => {
      if (langSkills.length > 0) {
        items.push(
          <div key="skills-languages" data-measuring-id="skills-languages" style={{ width: '100%' }}>
            {renderUnit({ type: 'skills-languages', id: 'skills-languages', sectionId: s.id, skills: langSkills }, true)}
          </div>
        );
      }
    };
    const pushIT = () => {
      finalCategories.forEach((cat) => {
        const catSkills = itSkills.filter((sk) => (sk.category || 'technical').toLowerCase().trim() === cat);
        if (catSkills.length > 0) {
          items.push(
            <div key={`skills-category-${cat}`} data-measuring-id={`skills-category-${cat}`} style={{ width: '100%' }}>
              {renderUnit({ type: 'skills-category', id: `skills-category-${cat}`, sectionId: s.id, category: cat, skills: catSkills }, true)}
            </div>
          );
        }
      });
    };

    if (d.languagesFirst) {
      pushLang();
      pushIT();
    } else {
      pushIT();
      pushLang();
    }
    return <React.Fragment key={s.id}>{items}</React.Fragment>;
  };

  const isCreative = d.template === 'creative_tech';

  return (
    <>
      {/* Hidden off-screen unscaled layout for DOM measurements */}
      <MeasuringContext.Provider value={true}>
        <div
          ref={hiddenCanvasRef}
          className={`${ed.pageContainer} ${tplClass} no-print`}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            height: 'auto',
            visibility: 'hidden',
            pointerEvents: 'none',
            padding: `${pageMargin}px`,
            ...(pageVars as React.CSSProperties)
          }}
        >
          {isCreative ? (
            <>
              <div data-measuring-id="header" style={{ width: '100%' }}>
                {renderUnit({ type: 'header', id: 'header' }, true)}
              </div>
              <div className={ed.gridContainer}>
                <div className={ed.sidebarColumn}>
                  <div data-measuring-id="contacts-static" style={{ width: '100%' }}>
                    {renderUnit({ type: 'contacts-static', id: 'contacts-static' }, true)}
                  </div>
                  {d.sections.filter((s) => s.id === 'skills').map((s) =>
                    s.visible ? (
                      <React.Fragment key={s.id}>
                        <div data-measuring-id={`title-${s.id}`} style={{ width: '100%' }}>
                          {renderUnit({ type: 'section-title', id: `title-${s.id}`, sectionId: s.id, titleText: s.name }, true)}
                        </div>
                        {renderSkillsMeasuringUnits(s)}
                      </React.Fragment>
                    ) : null
                  )}
                </div>
                <div className={ed.mainColumn}>
                  {d.sections.filter((s) => s.id !== 'skills').map((s) =>
                    s.visible ? (
                      <React.Fragment key={s.id}>
                        <div data-measuring-id={`title-${s.id}`} style={{ width: '100%' }}>
                          {renderUnit({ type: 'section-title', id: `title-${s.id}`, sectionId: s.id, titleText: s.name }, true)}
                        </div>
                        {renderSectionMeasuringUnits(s)}
                      </React.Fragment>
                    ) : null
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div data-measuring-id="header" style={{ width: '100%' }}>
                {renderUnit({ type: 'header', id: 'header' }, true)}
              </div>
              {d.sections.map((s) =>
                s.visible ? (
                  <React.Fragment key={s.id}>
                    <div data-measuring-id={`title-${s.id}`} style={{ width: '100%' }}>
                      {renderUnit({ type: 'section-title', id: `title-${s.id}`, sectionId: s.id, titleText: s.name }, true)}
                    </div>
                    {s.id === 'skills' ? renderSkillsMeasuringUnits(s) : renderSectionMeasuringUnits(s)}
                  </React.Fragment>
                ) : null
              )}
            </>
          )}
        </div>
      </MeasuringContext.Provider>

      {/* Scaled A4 pages */}
      <MeasuringContext.Provider value={false}>
        <div ref={viewportRef} className="w-full">
          {pages.length > 0 && (() => {
            const totalUnscaled = pages.length * 1123 + Math.max(0, pages.length - 1) * 24;
            return (
              <div
                className={ed.pagesScaledWrapper}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  width: '210mm',
                  marginBottom: `-${totalUnscaled * (1 - scale)}px`
                }}
              >
              {pages.map((pageUnits, pageIdx) => {
                const headerUnit = pageUnits.find((u) => u.type === 'header');
                const sidebarUnits = pageUnits.filter(
                  (u) => isCreative && (u.sectionId === 'skills' || u.type === 'contacts-static')
                );
                const mainUnits = pageUnits.filter(
                  (u) => !headerUnit && (!isCreative || (u.sectionId !== 'skills' && u.type !== 'contacts-static'))
                );

                return (
                  <div
                    key={pageIdx}
                    className={`${ed.pageContainer} ${tplClass}`}
                    style={{
                      ...pageVars,
                      height: '297mm',
                      padding: `${pageMargin}px`
                    } as React.CSSProperties}
                  >
                    {isCreative ? (
                      <>
                        {headerUnit && <div>{renderUnit(headerUnit)}</div>}
                        <div className={ed.gridContainer}>
                          <div className={ed.sidebarColumn}>
                            {sidebarUnits.map((unit) => (
                              <div key={unit.id}>{renderUnit(unit)}</div>
                            ))}
                          </div>
                          <div className={ed.mainColumn}>
                            {mainUnits.map((unit) => (
                              <div key={unit.id}>{renderUnit(unit)}</div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                        {pageUnits.map((unit) => (
                          <div key={unit.id}>{renderUnit(unit)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            );
          })()}
        </div>
      </MeasuringContext.Provider>
    </>
  );
};
