import React, { useState, useEffect } from 'react';
import {
  Code, Globe, Plus, Trash, ArrowUp, ArrowDown, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import styles from '../../../EditorNew.module.css';

export interface SkillItem {
  id: string;
  name: string;
  category: string;
}

export interface SkillsEditorProps {
  sectionName: string;
  onRenameSection: (newName: string) => void;
  skills: SkillItem[];
  setSkills: React.Dispatch<React.SetStateAction<SkillItem[]>>;
  categoryOrder: string[];
  onMoveSkillCategory?: (catName: string, dir: 'up' | 'down') => void;
  getLocalizedCategoryName: (cat: string) => string;
  languagesTitle: string;
  setLanguagesTitle: (val: string) => void;
  targetLanguage: 'en' | 'de';
}

interface SkillCategoryItemProps {
  catKey: string;
  catIdx: number;
  categorySkills: SkillItem[];
  originalCategory: string;
  displayHeader: string;
  isExpanded: boolean;
  totalCats: number;
  activeAddCat: string | null;
  quickAddInput: string;
  onToggleExpand: (catKey: string) => void;
  onMoveCategory?: (catKey: string, dir: 'up' | 'down') => void;
  onDeleteCategory: (catKey: string, displayName: string) => void;
  onRenameCategory: (oldCatKey: string, newCatName: string) => void;
  onUpdateSkillName: (skillId: string, newName: string) => void;
  onDeleteSkill: (skillId: string) => void;
  onMoveSkill: (catSkills: SkillItem[], skillId: string, dir: 'left' | 'right') => void;
  onOpenQuickAdd: (catKey: string) => void;
  onCloseQuickAdd: () => void;
  onQuickAddInputChange: (val: string) => void;
  onCommitQuickAdd: (targetCat: string) => void;
}

const SkillCategoryItem: React.FC<SkillCategoryItemProps> = ({
  catKey,
  catIdx,
  categorySkills,
  originalCategory,
  displayHeader,
  isExpanded,
  totalCats,
  activeAddCat,
  quickAddInput,
  onToggleExpand,
  onMoveCategory,
  onDeleteCategory,
  onRenameCategory,
  onUpdateSkillName,
  onDeleteSkill,
  onMoveSkill,
  onOpenQuickAdd,
  onCloseQuickAdd,
  onQuickAddInputChange,
  onCommitQuickAdd
}) => {
  const [localTitle, setLocalTitle] = useState(displayHeader);

  useEffect(() => {
    setLocalTitle(displayHeader);
  }, [displayHeader]);

  const handleBlurOrEnter = () => {
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== displayHeader && trimmed !== originalCategory) {
      onRenameCategory(catKey, trimmed);
    } else if (!trimmed) {
      setLocalTitle(displayHeader);
    }
  };

  return (
    <div className={`${styles.sideItemCard} ${isExpanded ? styles.sideItemCardExpanded : ''}`}>
      {/* Category Header */}
      <div
        className={styles.sideCardHeader}
        onClick={() => onToggleExpand(catKey)}
      >
        <div className={styles.sideCardHeaderTitleArea}>
          <span className={styles.sideCardExpandIcon}>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
          <div className={styles.sideCardMainTitles}>
            <div className={styles.sideCardPrimaryTitle}>
              {displayHeader} <span className={styles.sideCountPill}>{categorySkills.length}</span>
            </div>
          </div>
        </div>

        <div className={styles.sideCardHeaderActions} onClick={(e) => e.stopPropagation()}>
          {onMoveCategory && (
            <>
              <button
                type="button"
                disabled={catIdx === 0}
                onClick={() => onMoveCategory(catKey, 'up')}
                className={styles.sideIconBtn}
                title="Move Category Up"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                disabled={catIdx === totalCats - 1}
                onClick={() => onMoveCategory(catKey, 'down')}
                className={styles.sideIconBtn}
                title="Move Category Down"
              >
                <ArrowDown size={12} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onDeleteCategory(catKey, displayHeader)}
            className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
            title="Delete Category"
          >
            <Trash size={12} />
          </button>
        </div>
      </div>

      {/* Category Body */}
      {isExpanded && (
        <div className={styles.sideCardBody}>
          {/* Category Rename Input */}
          <div className={styles.sideFieldRow} style={{ marginBottom: '10px' }}>
            <label className={styles.sideFieldLabel}>Category Name</label>
            <input
              type="text"
              className={styles.sideTextInput}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleBlurOrEnter}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
            />
          </div>

          {/* Horizontal Skills Tag Chips Grid */}
          <div className={styles.sideSkillsWrapGrid}>
            {categorySkills.map((sk, skIdx) => (
              <div key={sk.id || skIdx} className={styles.skillTagChip}>
                <input
                  type="text"
                  className={styles.skillTagInput}
                  value={sk.name}
                  style={{ width: `${Math.max(sk.name.length * 8, 38)}px` }}
                  onChange={(e) => onUpdateSkillName(sk.id, e.target.value)}
                />
                <div className={styles.skillTagActionGroup}>
                  <button
                    type="button"
                    disabled={skIdx === 0}
                    onClick={() => onMoveSkill(categorySkills, sk.id, 'left')}
                    className={styles.skillTagReorderBtn}
                    title="Move to Front (Left)"
                  >
                    <ChevronLeft size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    disabled={skIdx === categorySkills.length - 1}
                    onClick={() => onMoveSkill(categorySkills, sk.id, 'right')}
                    className={styles.skillTagReorderBtn}
                    title="Move to Back (Right)"
                  >
                    <ChevronRight size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSkill(sk.id)}
                    className={styles.skillTagDeleteBtn}
                    title="Remove Skill"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}

            {/* Inline Quick-Add Chip */}
            {activeAddCat === catKey ? (
              <div className={styles.skillTagAddActiveChip}>
                <input
                  type="text"
                  className={styles.skillTagAddInput}
                  placeholder="Type & press Enter..."
                  autoFocus
                  value={quickAddInput}
                  onChange={(e) => onQuickAddInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      onCommitQuickAdd(originalCategory);
                    } else if (e.key === 'Escape') {
                      onCloseQuickAdd();
                    }
                  }}
                  onBlur={() => {
                    if (quickAddInput.trim()) {
                      onCommitQuickAdd(originalCategory);
                    } else {
                      onCloseQuickAdd();
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className={styles.skillTagAddBtn}
                onClick={() => onOpenQuickAdd(catKey)}
                title={`Add skill to ${displayHeader}`}
              >
                <Plus size={12} /> Add
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SkillsEditor: React.FC<SkillsEditorProps> = ({
  sectionName,
  onRenameSection,
  skills,
  setSkills,
  categoryOrder,
  onMoveSkillCategory,
  getLocalizedCategoryName,
  languagesTitle,
  setLanguagesTitle,
  targetLanguage
}) => {
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    languages: true
  });
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [activeAddCat, setActiveAddCat] = useState<string | null>(null);
  const [quickAddInput, setQuickAddInput] = useState('');

  const toggleCat = (catKey: string) => {
    setExpandedCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  // Separate non-language IT skills and language skills
  const itSkills = skills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
  const languageSkills = skills.filter(s => (s.category || '').toLowerCase().trim() === 'languages');

  // Compute unique categories in proper order
  const uniqueCats = Array.from(new Set(itSkills.map(s => (s.category || 'technical').toLowerCase().trim())));
  const normalizedOrder = categoryOrder.map(c => c.toLowerCase().trim());
  const orderedCats = normalizedOrder.filter(c => uniqueCats.includes(c));
  const remainingCats = uniqueCats.filter(c => !orderedCats.includes(c));
  const finalCats = [...orderedCats, ...remainingCats];

  if (categoryOrder.length === 0) {
    const defaultOrder = ['programming languages', 'frameworks & libraries', 'databases', 'cloud & devops', 'development tools', 'testing'];
    finalCats.sort((a, b) => {
      const idxA = defaultOrder.indexOf(a);
      const idxB = defaultOrder.indexOf(b);
      return (idxA !== -1 ? idxA : 100) - (idxB !== -1 ? idxB : 100);
    });
  }

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    setSkills(prev => [...prev, {
      id: `sk_${Date.now()}`,
      name: 'New Skill',
      category: trimmed
    }]);
    setExpandedCats(prev => ({ ...prev, [trimmed.toLowerCase()]: true }));
    setNewCatInput('');
    setIsAddingCat(false);
  };

  const handleRenameCategory = (oldCatKey: string, newCatName: string) => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const newCatKey = trimmed.toLowerCase();
    setExpandedCats(prev => {
      const next = { ...prev };
      if (next[oldCatKey] !== undefined) {
        next[newCatKey] = next[oldCatKey];
        delete next[oldCatKey];
      }
      return next;
    });
    setSkills(prev => prev.map(s => (s.category || 'technical').toLowerCase().trim() === oldCatKey ? { ...s, category: trimmed } : s));
  };

  const handleDeleteCategory = (catKey: string, displayName: string) => {
    if (window.confirm(`Delete category "${displayName}" and all its skills?`)) {
      setSkills(prev => prev.filter(s => (s.category || 'technical').toLowerCase().trim() !== catKey));
    }
  };

  const handleCommitQuickAdd = (targetCat: string) => {
    const trimmed = quickAddInput.trim().replace(/^,|,$/g, '');
    if (!trimmed) {
      setActiveAddCat(null);
      return;
    }
    const newItems = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    if (newItems.length > 0) {
      setSkills(prev => [
        ...prev,
        ...newItems.map((name, i) => ({
          id: `${targetCat === 'languages' ? 'lang' : 'sk'}_${Date.now()}_${i}`,
          name,
          category: targetCat
        }))
      ]);
    }
    setQuickAddInput('');
  };

  const handleUpdateSkillName = (skillId: string, newName: string) => {
    setSkills(prev => prev.map(s => s.id === skillId ? { ...s, name: newName } : s));
  };

  const handleDeleteSkill = (skillId: string) => {
    setSkills(prev => prev.filter(s => s.id !== skillId));
  };

  const handleMoveSkillInCat = (catSkills: SkillItem[], skillId: string, dir: 'left' | 'right') => {
    const idx = catSkills.findIndex(s => s.id === skillId);
    if (idx === -1) return;
    const targetIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= catSkills.length) return;

    const targetItem = catSkills[targetIdx];
    const currentItem = catSkills[idx];

    // Reconstruct list
    const updatedCatList = [...catSkills];
    updatedCatList[idx] = targetItem;
    updatedCatList[targetIdx] = currentItem;

    setSkills(prev => {
      const remaining = prev.filter(s => !catSkills.some(cs => cs.id === s.id));
      return [...remaining, ...updatedCatList];
    });
  };

  const displayLangTitle = languagesTitle || (targetLanguage === 'de' ? 'Sprachen' : 'Languages');

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>⚡</span>
        <div>
          <h4 className={styles.sideEditorTitle}>Skills & Competencies</h4>
          <p className={styles.sideEditorSubtitle}>
            Organize your technical competencies and spoken languages horizontally with interactive tag chips.
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
            placeholder="e.g. Technical Skills / Kenntnisse"
            onChange={(e) => onRenameSection(e.target.value)}
          />
        </div>
      </div>

      {/* Section 1: IT Skills Categories */}
      <div className={styles.sideSkillsSectionHeader}>
        <span className={styles.sideSkillsSectionLabel}>
          <Code size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Technical Categories ({finalCats.length})
        </span>
        <button
          type="button"
          className={styles.sideInlineAddBtn}
          onClick={() => setIsAddingCat(true)}
        >
          <Plus size={11} /> New Category
        </button>
      </div>

      {isAddingCat && (
        <div className={styles.sideInlineAddBox}>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="Category Name (e.g. Cloud & DevOps, Testing)..."
            autoFocus
            value={newCatInput}
            onChange={(e) => setNewCatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory();
              if (e.key === 'Escape') setIsAddingCat(false);
            }}
          />
          <div className={styles.sideInlineAddBoxActions}>
            <button
              type="button"
              className={styles.sidePrimarySaveBtn}
              onClick={handleAddCategory}
            >
              Add
            </button>
            <button
              type="button"
              className={styles.sideTextActionBtn}
              onClick={() => setIsAddingCat(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories Cards */}
      <div className={styles.sideCardsContainer}>
        {finalCats.map((catKey, catIdx) => {
          const categorySkills = itSkills.filter(s => (s.category || 'technical').toLowerCase().trim() === catKey);
          const originalCategory = categorySkills[0]?.category || catKey;
          const displayHeader = getLocalizedCategoryName(originalCategory);
          const isExpanded = !!expandedCats[catKey];

          return (
            <SkillCategoryItem
              key={`cat_${catKey}_${catIdx}`}
              catKey={catKey}
              catIdx={catIdx}
              categorySkills={categorySkills}
              originalCategory={originalCategory}
              displayHeader={displayHeader}
              isExpanded={isExpanded}
              totalCats={finalCats.length}
              activeAddCat={activeAddCat}
              quickAddInput={quickAddInput}
              onToggleExpand={toggleCat}
              onMoveCategory={onMoveSkillCategory}
              onDeleteCategory={handleDeleteCategory}
              onRenameCategory={handleRenameCategory}
              onUpdateSkillName={handleUpdateSkillName}
              onDeleteSkill={handleDeleteSkill}
              onMoveSkill={handleMoveSkillInCat}
              onOpenQuickAdd={(key) => {
                setActiveAddCat(key);
                setQuickAddInput('');
              }}
              onCloseQuickAdd={() => {
                setActiveAddCat(null);
                setQuickAddInput('');
              }}
              onQuickAddInputChange={setQuickAddInput}
              onCommitQuickAdd={handleCommitQuickAdd}
            />
          );
        })}
      </div>

      {/* Section 2: Dedicated Languages Subsection */}
      <div className={styles.sideSkillsSectionHeader} style={{ marginTop: '16px' }}>
        <span className={styles.sideSkillsSectionLabel}>
          <Globe size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Languages ({languageSkills.length})
        </span>
      </div>

      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldRow} style={{ marginBottom: '10px' }}>
          <label className={styles.sideFieldLabel}>Languages Heading</label>
          <input
            type="text"
            className={styles.sideTextInput}
            value={displayLangTitle}
            onChange={(e) => setLanguagesTitle(e.target.value)}
          />
        </div>

        {/* Horizontal Languages Tag Chips Grid */}
        <div className={styles.sideSkillsWrapGrid}>
          {languageSkills.map((sk, skIdx) => (
            <div key={sk.id || skIdx} className={styles.skillTagChip}>
              <input
                type="text"
                className={styles.skillTagInput}
                value={sk.name}
                placeholder="e.g. German (Native)"
                style={{ width: `${Math.max(sk.name.length * 8, 45)}px` }}
                onChange={(e) => handleUpdateSkillName(sk.id, e.target.value)}
              />
              <div className={styles.skillTagActionGroup}>
                <button
                  type="button"
                  disabled={skIdx === 0}
                  onClick={() => handleMoveSkillInCat(languageSkills, sk.id, 'left')}
                  className={styles.skillTagReorderBtn}
                  title="Move to Front (Left)"
                >
                  <ChevronLeft size={13} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  disabled={skIdx === languageSkills.length - 1}
                  onClick={() => handleMoveSkillInCat(languageSkills, sk.id, 'right')}
                  className={styles.skillTagReorderBtn}
                  title="Move to Back (Right)"
                >
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSkill(sk.id)}
                  className={styles.skillTagDeleteBtn}
                  title="Remove Language"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}

          {/* Inline Quick-Add Chip for Languages */}
          {activeAddCat === 'languages' ? (
            <div className={styles.skillTagAddActiveChip}>
              <input
                type="text"
                className={styles.skillTagAddInput}
                placeholder="e.g. French (B2)..."
                autoFocus
                value={quickAddInput}
                onChange={(e) => setQuickAddInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleCommitQuickAdd('languages');
                  } else if (e.key === 'Escape') {
                    setActiveAddCat(null);
                    setQuickAddInput('');
                  }
                }}
                onBlur={() => {
                  if (quickAddInput.trim()) {
                    handleCommitQuickAdd('languages');
                  } else {
                    setActiveAddCat(null);
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className={styles.skillTagAddBtn}
              onClick={() => {
                setActiveAddCat('languages');
                setQuickAddInput('');
              }}
              title="Add language"
            >
              <Plus size={12} /> Add Language
            </button>
          )}
        </div>

        {languageSkills.length === 0 && activeAddCat !== 'languages' && (
          <div className={styles.sideEmptyListHint} style={{ marginTop: '8px' }}>
            No languages added. Click "+ Add Language" above.
          </div>
        )}
      </div>
    </div>
  );
};
