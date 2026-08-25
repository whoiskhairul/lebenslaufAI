import React from 'react';
import styles from '../../../EditorNew.module.css';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';

export const SummaryUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit, editableSummary, setEditableSummary,
    hoveredSectionId, setHoveredSectionId,
    handleMouseEnterSuggestion, handleMouseLeaveSuggestion,
    reviewedActions, renderHoverAiControls, isRephrasing
  } = p;
  const { mergedStyles, handleContainerClickToFocus } = ctx;

  if (unit.type !== 'summary') return null;
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
};
