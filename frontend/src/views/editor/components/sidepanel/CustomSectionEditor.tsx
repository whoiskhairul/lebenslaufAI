import React from 'react';
import { Plus, Trash, ArrowUp, ArrowDown, Sparkles, List, Columns2, Briefcase, AlignLeft } from 'lucide-react';
import styles from '../../../EditorNew.module.css';

export interface CustomSectionEntry {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  bullets?: string[];
}

export interface CustomSectionItem {
  id: string;
  name: string;
  visible: boolean;
  type: string;
  bullets?: string[];
  customFormat?: 'bullets' | 'keyvalue' | 'entries' | 'paragraph';
  keyValuePairs?: Array<{ key: string; value: string }>;
  entries?: CustomSectionEntry[];
  paragraphText?: string;
}

export interface CustomSectionEditorProps {
  section: CustomSectionItem;
  onUpdateSection: (updates: Partial<CustomSectionItem>) => void;
  onDeleteSection: () => void;
  onPolishBullet?: (bulletText: string, onAccept: (newText: string) => void) => void;
}

export const CustomSectionEditor: React.FC<CustomSectionEditorProps> = ({
  section,
  onUpdateSection,
  onDeleteSection,
  onPolishBullet
}) => {
  const format = section.customFormat || 'bullets';
  const bullets = Array.isArray(section.bullets) ? section.bullets : ['Earned industry credential / achievement with distinction.'];
  const keyValuePairs = Array.isArray(section.keyValuePairs) ? section.keyValuePairs : [
    { key: 'Category / Key', value: 'Tools, proficiencies, or relevant details' }
  ];
  const entries = Array.isArray(section.entries) ? section.entries : [
    {
      id: `entry_${Date.now()}`,
      title: 'Role / Position Title',
      subtitle: 'Organization or Project',
      date: '2023 - Present',
      location: 'City, Country',
      bullets: ['Key contribution or responsibility accomplishment detail...']
    }
  ];
  const paragraphText = section.paragraphText ?? (bullets.length > 0 ? bullets.join(' ') : 'Experienced professional committed to delivering high-impact solutions, optimizing scalability, and driving core product reliability.');

  const handleFormatChange = (newFormat: 'bullets' | 'keyvalue' | 'entries' | 'paragraph') => {
    onUpdateSection({
      customFormat: newFormat,
      keyValuePairs: newFormat === 'keyvalue' ? (section.keyValuePairs || [{ key: 'Category / Skill Area', value: 'Proficiencies, tools, or relevant details' }]) : section.keyValuePairs,
      bullets: newFormat === 'bullets' ? (section.bullets || ['Earned industry credential / achievement with distinction.']) : section.bullets,
      entries: newFormat === 'entries' ? (section.entries || entries) : section.entries,
      paragraphText: newFormat === 'paragraph' ? (section.paragraphText || paragraphText) : section.paragraphText
    });
  };

  // Bullet Handlers
  const handleAddBullet = () => {
    const next = [...bullets, 'Demonstrated specialized expertise and delivered measurable results.'];
    onUpdateSection({ bullets: next });
  };

  const handleUpdateBullet = (idx: number, val: string) => {
    const next = [...bullets];
    next[idx] = val;
    onUpdateSection({ bullets: next });
  };

  const handleDeleteBullet = (idx: number) => {
    const next = bullets.filter((_, i) => i !== idx);
    onUpdateSection({ bullets: next });
  };

  const handleMoveBullet = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= bullets.length) return;
    const next = [...bullets];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    onUpdateSection({ bullets: next });
  };

  // Key-Value Handlers
  const handleAddPair = () => {
    const next = [...keyValuePairs, { key: 'Category / Skill Area', value: 'Tools, proficiencies, or relevant details' }];
    onUpdateSection({ keyValuePairs: next });
  };

  const handleUpdatePair = (idx: number, keyVal: { key?: string; value?: string }) => {
    const next = keyValuePairs.map((p, i) => i === idx ? { ...p, ...keyVal } : p);
    onUpdateSection({ keyValuePairs: next });
  };

  const handleDeletePair = (idx: number) => {
    const next = keyValuePairs.filter((_, i) => i !== idx);
    onUpdateSection({ keyValuePairs: next });
  };

  const handleMovePair = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= keyValuePairs.length) return;
    const next = [...keyValuePairs];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    onUpdateSection({ keyValuePairs: next });
  };

  // Structured Entries Handlers
  const handleAddEntry = () => {
    const newEntry: CustomSectionEntry = {
      id: `entry_${Date.now()}`,
      title: 'Role / Position Title',
      subtitle: 'Organization or Project',
      date: '2023 - Present',
      location: 'City, Country',
      bullets: ['Key contribution or responsibility accomplishment detail...']
    };
    onUpdateSection({ entries: [...entries, newEntry] });
  };

  const handleUpdateEntry = (eIdx: number, updates: Partial<CustomSectionEntry>) => {
    const next = entries.map((item, i) => i === eIdx ? { ...item, ...updates } : item);
    onUpdateSection({ entries: next });
  };

  const handleDeleteEntry = (eIdx: number) => {
    const next = entries.filter((_, i) => i !== eIdx);
    onUpdateSection({ entries: next });
  };

  const handleMoveEntry = (eIdx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? eIdx - 1 : eIdx + 1;
    if (targetIdx < 0 || targetIdx >= entries.length) return;
    const next = [...entries];
    const temp = next[eIdx];
    next[eIdx] = next[targetIdx];
    next[targetIdx] = temp;
    onUpdateSection({ entries: next });
  };

  const handleAddEntryBullet = (eIdx: number) => {
    const entry = entries[eIdx];
    const updatedBullets = [...(entry.bullets || []), 'Delivered measurable outcome and enhanced system performance.'];
    handleUpdateEntry(eIdx, { bullets: updatedBullets });
  };

  const handleUpdateEntryBullet = (eIdx: number, bIdx: number, val: string) => {
    const entry = entries[eIdx];
    const updatedBullets = [...(entry.bullets || [])];
    updatedBullets[bIdx] = val;
    handleUpdateEntry(eIdx, { bullets: updatedBullets });
  };

  const handleDeleteEntryBullet = (eIdx: number, bIdx: number) => {
    const entry = entries[eIdx];
    const updatedBullets = (entry.bullets || []).filter((_, i) => i !== bIdx);
    handleUpdateEntry(eIdx, { bullets: updatedBullets });
  };

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>📋</span>
        <div>
          <h4 className={styles.sideEditorTitle}>{section.name || 'Custom Section'}</h4>
          <p className={styles.sideEditorSubtitle}>
            Configure section layout, manage items, and tailor content to your resume.
          </p>
        </div>
      </div>

      {/* Section Title & Format Switcher */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>Section Heading</label>
          <input
            type="text"
            className={styles.sideTextInput}
            value={section.name || ''}
            placeholder="e.g. Certifications, Publications, Volunteering"
            onChange={(e) => onUpdateSection({ name: e.target.value })}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>Layout & Content Format</label>
          <div className={styles.sideFormatToggleGrid4}>
            <button
              type="button"
              className={`${styles.sideFormatToggleBtn} ${format === 'bullets' ? styles.sideFormatToggleBtnActive : ''}`}
              onClick={() => handleFormatChange('bullets')}
              title="Bullet Points"
            >
              <List size={13} />
              <span>Bullets</span>
            </button>
            <button
              type="button"
              className={`${styles.sideFormatToggleBtn} ${format === 'keyvalue' ? styles.sideFormatToggleBtnActive : ''}`}
              onClick={() => handleFormatChange('keyvalue')}
              title="Two-Column Key-Value"
            >
              <Columns2 size={13} />
              <span>Key-Value</span>
            </button>
            <button
              type="button"
              className={`${styles.sideFormatToggleBtn} ${format === 'entries' ? styles.sideFormatToggleBtnActive : ''}`}
              onClick={() => handleFormatChange('entries')}
              title="Structured Entries"
            >
              <Briefcase size={13} />
              <span>Entries</span>
            </button>
            <button
              type="button"
              className={`${styles.sideFormatToggleBtn} ${format === 'paragraph' ? styles.sideFormatToggleBtnActive : ''}`}
              onClick={() => handleFormatChange('paragraph')}
              title="Narrative Paragraph"
            >
              <AlignLeft size={13} />
              <span>Paragraph</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Format: Bullets */}
      {format === 'bullets' && (
        <div className={styles.sideFieldGroupCard}>
          <div className={styles.sideFieldLabelRow} style={{ marginBottom: '6px' }}>
            <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
              Bullet Points ({bullets.length})
            </label>
            <button
              type="button"
              className={styles.sideInlineAddBtn}
              onClick={handleAddBullet}
            >
              <Plus size={11} /> Add Bullet
            </button>
          </div>

          <div className={styles.sideBulletsList}>
            {bullets.map((bullet, bIdx) => (
              <div key={`custom_b_${bIdx}`} className={styles.sideBulletRow}>
                <span className={styles.sideBulletHandle}>•</span>
                <textarea
                  className={styles.sideBulletTextarea}
                  rows={2}
                  value={bullet}
                  placeholder="Enter detail..."
                  onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                />
                <div className={styles.sideBulletActions}>
                  {onPolishBullet && (
                    <button
                      type="button"
                      className={styles.sideIconBtn}
                      onClick={() => onPolishBullet(bullet, (newTxt) => handleUpdateBullet(bIdx, newTxt))}
                      title="AI Polish this bullet"
                    >
                      <Sparkles size={11} style={{ color: 'var(--primary, #6366f1)' }} />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={bIdx === 0}
                    onClick={() => handleMoveBullet(bIdx, 'up')}
                    className={styles.sideIconBtn}
                    title="Move Up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    disabled={bIdx === bullets.length - 1}
                    onClick={() => handleMoveBullet(bIdx, 'down')}
                    className={styles.sideIconBtn}
                    title="Move Down"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBullet(bIdx)}
                    className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                    title="Delete Bullet"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {bullets.length === 0 && (
            <div className={styles.sideEmptyListHint}>
              No bullet points. Click "+ Add Bullet" to create one.
            </div>
          )}
        </div>
      )}

      {/* 2. Format: Key-Value */}
      {format === 'keyvalue' && (
        <div className={styles.sideFieldGroupCard}>
          <div className={styles.sideFieldLabelRow} style={{ marginBottom: '6px' }}>
            <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
              Key-Value Pairs ({keyValuePairs.length})
            </label>
            <button
              type="button"
              className={styles.sideInlineAddBtn}
              onClick={handleAddPair}
            >
              <Plus size={11} /> Add Item
            </button>
          </div>

          <div className={styles.sideKeyValueList}>
            {keyValuePairs.map((pair, pIdx) => (
              <div key={`kv_${pIdx}`} className={styles.sideKeyValueRow}>
                <div className={styles.sideKeyValueInputs}>
                  <input
                    type="text"
                    className={styles.sideKeyInput}
                    placeholder="Key (e.g. AWS)"
                    value={pair.key}
                    onChange={(e) => handleUpdatePair(pIdx, { key: e.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.sideValueInput}
                    placeholder="Value (e.g. Certified Architect)"
                    value={pair.value}
                    onChange={(e) => handleUpdatePair(pIdx, { value: e.target.value })}
                  />
                </div>
                <div className={styles.sideKeyValueActions}>
                  <button
                    type="button"
                    disabled={pIdx === 0}
                    onClick={() => handleMovePair(pIdx, 'up')}
                    className={styles.sideIconBtn}
                    title="Move Up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    disabled={pIdx === keyValuePairs.length - 1}
                    onClick={() => handleMovePair(pIdx, 'down')}
                    className={styles.sideIconBtn}
                    title="Move Down"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePair(pIdx)}
                    className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                    title="Delete Item"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {keyValuePairs.length === 0 && (
            <div className={styles.sideEmptyListHint}>
              No key-value pairs. Click "+ Add Item" to create one.
            </div>
          )}
        </div>
      )}

      {/* 3. Format: Structured Entries */}
      {format === 'entries' && (
        <div className={styles.sideFieldGroupCard}>
          <div className={styles.sideFieldLabelRow} style={{ marginBottom: '8px' }}>
            <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
              Entries ({entries.length})
            </label>
            <button
              type="button"
              className={styles.sideInlineAddBtn}
              onClick={handleAddEntry}
            >
              <Plus size={11} /> Add Entry
            </button>
          </div>

          <div className={styles.sideCardsContainer}>
            {entries.map((entry, eIdx) => (
              <div key={entry.id || eIdx} className={styles.sideItemAccordionCard}>
                <div className={styles.sideItemAccordionHeader}>
                  <span className={styles.sideItemTitle}>
                    {entry.title || 'Untitled Entry'} {entry.subtitle ? `• ${entry.subtitle}` : ''}
                  </span>
                  <div className={styles.sideItemActions}>
                    <button
                      type="button"
                      disabled={eIdx === 0}
                      onClick={() => handleMoveEntry(eIdx, 'up')}
                      className={styles.sideIconBtn}
                      title="Move Up"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={eIdx === entries.length - 1}
                      onClick={() => handleMoveEntry(eIdx, 'down')}
                      className={styles.sideIconBtn}
                      title="Move Down"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(eIdx)}
                      className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                      title="Delete Entry"
                    >
                      <Trash size={11} />
                    </button>
                  </div>
                </div>

                <div className={styles.sideItemAccordionBody}>
                  {/* Row 1: Title / Role & Date / Duration */}
                  <div className={styles.sideTwinGrid}>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Title / Role</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        value={entry.title || ''}
                        placeholder="e.g. Lead Researcher / Consultant"
                        onChange={(e) => handleUpdateEntry(eIdx, { title: e.target.value })}
                      />
                    </div>
                    <div className={styles.sideFieldRow}>
                      <label className={styles.sideFieldLabel}>Date / Duration</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        value={entry.date || ''}
                        placeholder="e.g. 2023 - Present"
                        onChange={(e) => handleUpdateEntry(eIdx, { date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 2: Organization or Project & City, Country on ONE single line */}
                  <div className={styles.sideInlineOrgLocationRow} style={{ marginTop: '8px' }}>
                    <div className={styles.sideFieldRow} style={{ flex: 1.6 }}>
                      <label className={styles.sideFieldLabel}>Organization or Project</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        value={entry.subtitle || ''}
                        placeholder="e.g. Open Source Initiative / AI Lab"
                        onChange={(e) => handleUpdateEntry(eIdx, { subtitle: e.target.value })}
                      />
                    </div>
                    <div className={styles.sideFieldRow} style={{ flex: 1.1 }}>
                      <label className={styles.sideFieldLabel}>City, Country</label>
                      <input
                        type="text"
                        className={styles.sideTextInput}
                        value={entry.location || ''}
                        placeholder="e.g. Berlin, Germany / Remote"
                        onChange={(e) => handleUpdateEntry(eIdx, { location: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Entry Bullets */}
                  <div style={{ marginTop: '10px' }}>
                    <div className={styles.sideFieldLabelRow}>
                      <label className={styles.sideFieldLabel} style={{ fontSize: '11px' }}>
                        Bullet Points ({entry.bullets?.length || 0})
                      </label>
                      <button
                        type="button"
                        className={styles.sideInlineAddBtn}
                        onClick={() => handleAddEntryBullet(eIdx)}
                      >
                        <Plus size={10} /> Add
                      </button>
                    </div>

                    <div className={styles.sideBulletsList}>
                      {(entry.bullets || []).map((b, bIdx) => (
                        <div key={bIdx} className={styles.sideBulletRow}>
                          <span className={styles.sideBulletHandle}>•</span>
                          <textarea
                            className={styles.sideBulletTextarea}
                            rows={2}
                            value={b}
                            placeholder="Enter achievement detail..."
                            onChange={(e) => handleUpdateEntryBullet(eIdx, bIdx, e.target.value)}
                          />
                          <div className={styles.sideBulletActions}>
                            {onPolishBullet && (
                              <button
                                type="button"
                                className={styles.sideIconBtn}
                                onClick={() => onPolishBullet(b, (newTxt) => handleUpdateEntryBullet(eIdx, bIdx, newTxt))}
                                title="AI Polish"
                              >
                                <Sparkles size={11} style={{ color: 'var(--primary, #6366f1)' }} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEntryBullet(eIdx, bIdx)}
                              className={`${styles.sideIconBtn} ${styles.sideIconBtnDanger}`}
                              title="Delete Bullet"
                            >
                              <Trash size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {entries.length === 0 && (
            <div className={styles.sideEmptyListHint}>
              No structured entries. Click "+ Add Entry" to create one.
            </div>
          )}
        </div>
      )}

      {/* 4. Format: Paragraph Text */}
      {format === 'paragraph' && (
        <div className={styles.sideFieldGroupCard}>
          <div className={styles.sideFieldLabelRow} style={{ marginBottom: '6px' }}>
            <label className={styles.sideFieldLabel} style={{ marginBottom: 0 }}>
              Narrative Statement
            </label>
            {onPolishBullet && (
              <button
                type="button"
                className={styles.sideInlineAiBtn}
                onClick={() => onPolishBullet(paragraphText, (newTxt) => onUpdateSection({ paragraphText: newTxt }))}
              >
                <Sparkles size={11} /> Polish Narrative
              </button>
            )}
          </div>

          <textarea
            className={styles.sideTextAreaInput}
            rows={5}
            value={paragraphText}
            placeholder="Enter continuous text or executive statement..."
            onChange={(e) => onUpdateSection({ paragraphText: e.target.value })}
          />

          <div className={styles.sideCounterBar}>
            <span>{paragraphText ? paragraphText.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
            <span>{paragraphText.length} characters</span>
          </div>
        </div>
      )}

      {/* Delete Custom Section */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className={styles.sideDeleteSectionBtn}
          onClick={() => {
            if (window.confirm(`Are you sure you want to permanently delete section "${section.name}"?`)) {
              onDeleteSection();
            }
          }}
        >
          <Trash size={13} /> Delete This Section
        </button>
      </div>
    </div>
  );
};
