import { useEffect, useState, RefObject } from 'react';
import { RenderableUnit } from '../../../views/editor/types/editor.types';

export interface CvPaginationInput {
  template: string;
  sections: any[];
  editableExperiences: any[];
  editableProjects: any[];
  editableEducations: any[];
  editableSkills: any[];
  customStyles: any;
  languagesFirst: boolean;
  categoryOrder: string[];
}

/**
 * "Virtual Page Matrix" partitioning system.
 *
 * Measures the natural height of every `[data-measuring-id]` unit inside the
 * hidden off-screen canvas, then greedily distributes the flat unit stream
 * across A4 pages (1123px tall) with section-atomicity logic — a whole
 * section moves to the next page if it fits on a blank page but not in the
 * remaining space. Handles the creative_tech split grid (sidebar vs main
 * column) via independent column height budgets.
 */
export function useCvPagination(
  hiddenCanvasRef: RefObject<HTMLDivElement | null>,
  input: CvPaginationInput,
  recomputeKeys: unknown[]
) {
  const {
    template, sections, editableExperiences, editableProjects,
    editableEducations, editableSkills, customStyles,
    languagesFirst, categoryOrder,
  } = input;

  const [pages, setPages] = useState<RenderableUnit[][]>([[]]);

  useEffect(() => {
    const measureAndLayout = () => {
      if (!hiddenCanvasRef.current) return;
      // Defer measurement while the canvas pane is hidden (mobile Editor mode) — zero-height reads would corrupt pagination
      if (hiddenCanvasRef.current.getBoundingClientRect().width === 0) return;

      // Create flat elements stream based on sections order and visible elements
      const unitsList: RenderableUnit[] = [];

      unitsList.push({ type: 'header', id: 'header' });

      // Creative tech sidebar contacts static layout
      if (template === 'creative_tech') {
        unitsList.push({ type: 'contacts-static', id: 'contacts-static' });
      }

      sections.forEach((sec) => {
        if (!sec.visible) return;

        if (sec.type === 'summary') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          unitsList.push({ type: 'summary', id: `summary-content`, sectionId: sec.id });
        } else if (sec.type === 'experience') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          editableExperiences.forEach((exp, idx) => {
            unitsList.push({
              type: 'experience-item',
              id: `exp-item-${exp.id}`,
              sectionId: sec.id,
              itemIndex: idx,
              itemData: exp
            });
          });
        } else if (sec.type === 'projects') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          editableProjects.forEach((proj, idx) => {
            unitsList.push({
              type: 'project-item',
              id: `proj-item-${proj.id}`,
              sectionId: sec.id,
              itemIndex: idx,
              itemData: proj
            });
          });
        } else if (sec.type === 'education') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          editableEducations.forEach((edu, idx) => {
            unitsList.push({
              type: 'education-item',
              id: `edu-item-${edu.id}`,
              sectionId: sec.id,
              itemIndex: idx,
              itemData: edu
            });
          });
        } else if (sec.type === 'skills') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });

          const langSkills = editableSkills.filter((s) => (s.category || '').toLowerCase().trim() === 'languages');
          const itSkills = editableSkills.filter((s) => (s.category || '').toLowerCase().trim() !== 'languages');
          const uniqueCats = Array.from(new Set(itSkills.map((s) => (s.category || 'technical').toLowerCase().trim())));

          const normalizedOrder = categoryOrder.map((c) => c.toLowerCase().trim());
          const itCategories = normalizedOrder.filter((c) => uniqueCats.includes(c));
          const extraCats = uniqueCats.filter((c) => !itCategories.includes(c));
          const finalCategories = [...itCategories, ...extraCats];

          if (categoryOrder.length === 0) {
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
                unitsList.push({
                  type: 'skills-category',
                  id: `skills-category-${cat}`,
                  sectionId: sec.id,
                  category: cat,
                  skills: catSkills
                });
              }
            });
          };

          if (languagesFirst) {
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

      // Retrieve actual DOM client dimensions of elements inside hidden canvas
      const measured: Record<string, number> = {};
      const childElements = hiddenCanvasRef.current.querySelectorAll('[data-measuring-id]');
      childElements.forEach((el: any) => {
        const id = el.getAttribute('data-measuring-id');
        if (id) {
          const compStyle = window.getComputedStyle(el);
          const marginTop = parseFloat(compStyle.marginTop) || 0;
          const marginBottom = parseFloat(compStyle.marginBottom) || 0;
          measured[id] = el.getBoundingClientRect().height + marginTop + marginBottom;
        }
      });

      // Distribute stream across isolated pages
      const pageHeight = 1123;
      const pageMargin = customStyles.pageMargin || 48;

      // Usable inner content height for allowedPageContentHeight zone (exact top/bottom margin bounds)
      const printableContentHeight = pageHeight - 2 * pageMargin;
      const activeColumnLimit = printableContentHeight;

      // Helper to compute unit effective height directly from true measured DOM height
      const getUnitEffectiveHeight = (u: RenderableUnit): number => {
        const baseHeight = measured[u.id] || 0;
        const unitGap = u.type === 'section-title' ? (customStyles.sectionSpacing || 14) : 4;
        return baseHeight + unitGap;
      };

      const newPages: RenderableUnit[][] = [[]];

      // Layout heights tracking (handles split grid column constraints in Creative Tech)
      let currentMainHeight = 0;
      let currentSidebarHeight = 0;

      for (let i = 0; i < unitsList.length; i++) {
        const unit = unitsList[i];
        const effHeight = getUnitEffectiveHeight(unit);

        // Header resides exclusively on page 1 top bounds
        if (unit.type === 'header') {
          newPages[0].push(unit);
          currentMainHeight += effHeight;
          currentSidebarHeight += effHeight;
          continue;
        }

        // Determine columns division mapping
        const isSidebarColumn = template === 'creative_tech' && (unit.sectionId === 'skills' || unit.type === 'contacts-static');

        let shouldPushPage = false;

        // Strict Section Atomicity Page Partitioning:
        // When encountering a section-title, calculate the height of this title PLUS ALL ITS SUBSEQUENT ITEMS in unitsList.
        if (unit.type === 'section-title') {
          // Find all units belonging to this section starting from this title
          let remainingSectionHeight = 0;
          for (let j = i; j < unitsList.length && unitsList[j].sectionId === unit.sectionId; j++) {
            remainingSectionHeight += getUnitEffectiveHeight(unitsList[j]);
          }

          const currentHeight = isSidebarColumn ? currentSidebarHeight : currentMainHeight;

          // If the entire section can fit on a clean blank page (remainingSectionHeight <= activeColumnLimit),
          // but DOES NOT fit in the current page's remaining space, push the ENTIRE section to the next page!
          if (remainingSectionHeight <= activeColumnLimit) {
            if (currentHeight + remainingSectionHeight > activeColumnLimit && currentHeight > 0) {
              shouldPushPage = true;
            }
          } else {
            // Section itself is larger than 1 full page:
            // At least ensure title + first content item fit on the current page, otherwise push title to next page.
            const firstContentUnit = unitsList[i + 1] && unitsList[i + 1].sectionId === unit.sectionId ? unitsList[i + 1] : null;
            const minHeaderGroupHeight = effHeight + (firstContentUnit ? getUnitEffectiveHeight(firstContentUnit) : 0);
            if (currentHeight + minHeaderGroupHeight > activeColumnLimit && currentHeight > 0) {
              shouldPushPage = true;
            }
          }
        } else {
          // Individual item overflow check
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

        // Allocate unit into current page stack
        newPages[newPages.length - 1].push(unit);
        if (isSidebarColumn) {
          currentSidebarHeight += effHeight;
        } else {
          currentMainHeight += effHeight;
        }
      }

      setPages(newPages);
    };

    measureAndLayout();
    const timer = setTimeout(measureAndLayout, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...recomputeKeys]);

  return pages;
}
