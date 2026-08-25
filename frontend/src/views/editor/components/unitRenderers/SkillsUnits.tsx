import React from 'react';
import styles from '../../../EditorNew.module.css';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import { renderFormattedLanguageList } from '../../utils/languageUtils';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';

export const SkillsLanguagesUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit,
    editableSkills, setEditableSkills,
    hoveredSectionId, setHoveredSectionId,
    setEditingLanguagesId, editingLanguagesId,
    languagesTitle, setLanguagesTitle, targetLanguage
  } = p;
  const { mergedStyles } = ctx;

  if (unit.type !== 'skills-languages') return null;
  const skillsList = unit.skills || [];
  const isSectionHovered = hoveredSectionId === unit.sectionId;

  return (
    <div
      className={isSectionHovered ? styles.sectionHoverActive : ''}
      style={{ ...mergedStyles, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', marginTop: '6px', marginBottom: '8px' }}
      onMouseEnter={() => setHoveredSectionId(unit.sectionId || null)}
      onMouseLeave={() => setHoveredSectionId(null)}
    >
      <div style={{ fontWeight: 700, fontSize: '1.05em', color: 'var(--accent-color, #0f172a)', marginBottom: '4px' }}>
        <AutoSizeTextarea
          value={languagesTitle || (targetLanguage === 'de' ? 'Sprachen' : 'Languages')}
          onChange={(val) => setLanguagesTitle(val)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '24px', width: '100%' }}>
        <span className={styles.bulletDot}>â€¢</span>
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
};

export const SkillsCategoryUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit,
    setEditableSkills,
    hoveredSectionId, setHoveredSectionId,
    getLocalizedCategoryName
  } = p;
  const { mergedStyles } = ctx;

  if (unit.type !== 'skills-category') return null;
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
      <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '24px', width: '100%' }}>
        <span className={styles.bulletDot}>â€¢</span>
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
};
