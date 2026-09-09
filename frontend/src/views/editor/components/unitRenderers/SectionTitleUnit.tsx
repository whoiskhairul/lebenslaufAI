import React from 'react';
import { ChevronUp, ChevronDown, Plus, Sparkles, EyeOff, RotateCcw, Settings } from 'lucide-react';
import styles from '../../../../views/editorStyles';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import { SectionSettingsPopover } from '../SectionSettingsPopover';
import { renderFormattedTitle } from '../../utils/titleUtils';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';

export const SectionTitleUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit, isMeasuring, sections, customStyles,
    activeSectionSettings, setActiveSectionSettings, popoverPosition, setPopoverPosition,
    setSections, editingSectionTitleId, setEditingSectionTitleId,
    hoveredSectionId, setHoveredSectionId,
    handleMoveSection, handleQuickAddSectionItem, setOpenSectionAiModalId,
    setEditableExperiences, setEditableProjects, setEditableEducations,
    toggleSectionVisibility, onResetToMasterProfile
  } = p;
  const { sec, localStyles, mergedStyles, titleClass } = ctx;

  if (unit.type !== 'section-title') return null;
  const isSettingsOpen = activeSectionSettings === unit.sectionId;
  const secIdx = sections.findIndex(s => s.id === unit.sectionId);
  const isFirst = secIdx <= 0;
  const isLast = secIdx >= sections.length - 1 || secIdx === -1;
  const isSectionHovered = hoveredSectionId === unit.sectionId || activeSectionSettings === unit.sectionId;

  return (
    <div
      className={`${styles.sectionHeaderWrapper} ${isSectionHovered ? styles.sectionHoverActive : ''}`}
      style={mergedStyles}
      data-section-id={unit.sectionId}
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
              if (toggleSectionVisibility) {
                toggleSectionVisibility(unit.sectionId!);
              } else {
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
          {onResetToMasterProfile && (
            <button
              type="button"
              className={styles.deleteBlockBtn}
              title="Revert Section to Master Profile Original"
              onClick={(e) => {
                e.stopPropagation();
                onResetToMasterProfile(unit.sectionId!);
              }}
            >
              <RotateCcw size={12} />
            </button>
          )}
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
        />
      )}
    </div>
  );
};
