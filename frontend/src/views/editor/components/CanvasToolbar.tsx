import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Undo2,
  Redo2,
  Gauge,
  ZoomIn,
  ZoomOut,
  Maximize,
  Expand,
  Plus,
  ChevronDown,
  Check,
  Sliders,
  LayoutGrid,
  Type,
  Briefcase,
  Code,
  GraduationCap,
  FolderPlus,
} from 'lucide-react';
import styles from '../../EditorNew.module.css';

interface CanvasToolbarProps {
  editorTab: 'resume' | 'letter';
  hasVersion: boolean;
  // History
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // ATS
  atsScore: number | null;
  isAtsChecking: boolean;
  onCheckAts: () => void;
  // Resume formatting
  template: string;
  onTemplateChange: (v: string) => void;
  fontSize: number;
  onFontSizeStep: (delta: number) => void;
  densityId: 'standard' | 'tight' | 'ultra' | 'custom';
  onDensityChange: (id: 'standard' | 'tight' | 'ultra') => void;
  // Font family (resume: global override, letter: letter font)
  fontFamily: string;
  onFontFamilyChange: (v: string) => void;
  // View
  zoomPct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  // Structure (resume only)
  onAddExperience: () => void;
  onAddProject: () => void;
  onAddEducation: () => void;
  onAddCustom: () => void;
}

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Default font' },
  { value: "'Aptos', 'Calibri', sans-serif", label: 'Aptos' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Calibri', 'Segoe UI', sans-serif", label: 'Calibri' },
  { value: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", label: 'Helvetica' },
  { value: "'Source Sans 3', 'Source Sans Pro', sans-serif", label: 'Source Sans' },
  { value: "'IBM Plex Sans', sans-serif", label: 'IBM Plex' },
  { value: "'Arial', sans-serif", label: 'Arial' },
];

const DENSITY_OPTIONS: Array<{ id: 'standard' | 'tight' | 'ultra' | 'custom'; label: string; disabled?: boolean }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'tight', label: 'Tight' },
  { id: 'ultra', label: 'Ultra-tight' },
  { id: 'custom', label: 'Custom', disabled: true },
];

const TEMPLATE_OPTIONS: Array<{ value: string; label: string; disabled?: boolean }> = [
  { value: 'pixel_perfect_pdf', label: 'German Styled' },
  { value: 'modern_minimalist', label: 'More templates soon', disabled: true },
];

type ToolbarDropdownId = 'density' | 'template' | 'font' | 'add';

export const CanvasToolbar: React.FC<CanvasToolbarProps> = (p) => {
  const [activeDropdown, setActiveDropdown] = useState<ToolbarDropdownId | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const densityBtnRef = useRef<HTMLButtonElement>(null);
  const templateBtnRef = useRef<HTMLButtonElement>(null);
  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeDropdown) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setActiveDropdown(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    const onDismiss = () => setActiveDropdown(null);

    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onDismiss);
    // Toolbar scroll / page scroll would detach the fixed menu from its button.
    window.addEventListener('scroll', onDismiss, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('scroll', onDismiss, true);
    };
  }, [activeDropdown]);

  const toggleDropdown = (
    id: ToolbarDropdownId,
    btnRef: React.RefObject<HTMLButtonElement | null>,
    menuWidth: number,
    menuHeight: number
  ) => {
    if (activeDropdown === id) {
      setActiveDropdown(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8));
      const openUp = r.bottom + menuHeight + 8 > window.innerHeight;
      const top = openUp ? Math.max(8, r.top - menuHeight - 6) : r.bottom + 6;
      setMenuPos({ top, left });
    }
    setActiveDropdown(id);
  };

  const closeDropdown = () => setActiveDropdown(null);

  const disabled = !p.hasVersion;
  const atsColor =
    p.atsScore == null
      ? undefined
      : p.atsScore >= 80
        ? 'var(--success, #10b981)'
        : p.atsScore >= 60
          ? 'var(--warning, #f59e0b)'
          : 'var(--danger, #ef4444)';

  const currentDensityLabel = DENSITY_OPTIONS.find((d) => d.id === p.densityId)?.label || 'Density';
  const currentTemplateLabel = TEMPLATE_OPTIONS.find((t) => t.value === p.template)?.label || 'German Styled';
  const currentFontLabel = FONT_OPTIONS.find((f) => f.value === p.fontFamily)?.label || 'Font';

  return (
    <div ref={rootRef} className={`${styles.canvasToolbar} no-print`} role="toolbar" aria-label="Editor canvas toolbar">
      {/* Edit cluster: history + zoom + font size */}
      <div className={styles.toolbarGroup} aria-label="Edit">
        <button
          type="button"
          className={styles.toolbarIconBtn}
          onClick={p.onUndo}
          disabled={!p.canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          className={styles.toolbarIconBtn}
          onClick={p.onRedo}
          disabled={!p.canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </button>
        <div className={styles.toolbarSeg} aria-label="Zoom">
          <button type="button" className={styles.toolbarIconBtn} onClick={p.onZoomOut} title="Zoom out" aria-label="Zoom out">
            <ZoomOut size={14} />
          </button>
          <button type="button" className={styles.toolbarZoomLabel} onClick={p.onZoomFit} title="Reset zoom to fit">
            {p.zoomPct}%
          </button>
          <button type="button" className={styles.toolbarIconBtn} onClick={p.onZoomIn} title="Zoom in" aria-label="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button type="button" className={styles.toolbarIconBtn} onClick={p.onZoomFit} title="Fit to width" aria-label="Fit to width">
            <Maximize size={14} />
          </button>
          <button
            type="button"
            className={`${styles.toolbarIconBtn} ${p.isFullscreen ? styles.toolbarIconBtnActive : ''}`}
            onClick={p.onToggleFullscreen}
            title={p.isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen preview'}
            aria-label="Toggle fullscreen preview"
            aria-pressed={p.isFullscreen}
          >
            <Expand size={14} />
          </button>
        </div>
        <div className={styles.toolbarStepper} title="Base font size">
          <button
            type="button"
            className={styles.toolbarIconBtn}
            disabled={disabled}
            onClick={() => p.onFontSizeStep(-0.5)}
            aria-label="Decrease font size"
          >
            A−
          </button>
          <span className={styles.toolbarStepperValue}>{Number(p.fontSize.toFixed(1))}</span>
          <button
            type="button"
            className={styles.toolbarIconBtn}
            disabled={disabled}
            onClick={() => p.onFontSizeStep(0.5)}
            aria-label="Increase font size"
          >
            A+
          </button>
        </div>
      </div>

      <div className={styles.toolbarDivider} />

      {/* Document cluster: density + template + font + add (font only on letter tab) */}
      <div className={styles.toolbarGroup} aria-label="Document">
        {p.editorTab === 'resume' && (
          <>
            <div className={styles.toolbarMenuWrap}>
              <button
                ref={densityBtnRef}
                type="button"
                className={`${styles.toolbarBtn} ${activeDropdown === 'density' ? styles.toolbarBtnActive : ''}`}
                onClick={() => toggleDropdown('density', densityBtnRef, 160, 160)}
                disabled={disabled}
                title="Spacing density preset"
                aria-haspopup="menu"
                aria-expanded={activeDropdown === 'density'}
              >
                <Sliders size={13} />
                <span>{currentDensityLabel}</span>
                <ChevronDown size={12} className={`${styles.toolbarChevron} ${activeDropdown === 'density' ? styles.toolbarChevronOpen : ''}`} />
              </button>
            </div>
            <div className={styles.toolbarMenuWrap}>
              <button
                ref={templateBtnRef}
                type="button"
                className={`${styles.toolbarBtn} ${activeDropdown === 'template' ? styles.toolbarBtnActive : ''}`}
                onClick={() => toggleDropdown('template', templateBtnRef, 180, 100)}
                disabled={disabled}
                title="Layout template"
                aria-haspopup="menu"
                aria-expanded={activeDropdown === 'template'}
              >
                <LayoutGrid size={13} />
                <span>{currentTemplateLabel}</span>
                <ChevronDown size={12} className={`${styles.toolbarChevron} ${activeDropdown === 'template' ? styles.toolbarChevronOpen : ''}`} />
              </button>
            </div>
          </>
        )}
        <div className={styles.toolbarMenuWrap}>
          <button
            ref={fontBtnRef}
            type="button"
            className={`${styles.toolbarBtn} ${activeDropdown === 'font' ? styles.toolbarBtnActive : ''}`}
            onClick={() => toggleDropdown('font', fontBtnRef, 180, 270)}
            disabled={disabled}
            title="Font family"
            aria-haspopup="menu"
            aria-expanded={activeDropdown === 'font'}
          >
            <Type size={13} />
            <span>{currentFontLabel}</span>
            <ChevronDown size={12} className={`${styles.toolbarChevron} ${activeDropdown === 'font' ? styles.toolbarChevronOpen : ''}`} />
          </button>
        </div>
        {p.editorTab === 'resume' && (
          <div className={styles.toolbarMenuWrap}>
            <button
              ref={addBtnRef}
              type="button"
              className={`${styles.toolbarBtn} ${activeDropdown === 'add' ? styles.toolbarBtnActive : ''}`}
              onClick={() => toggleDropdown('add', addBtnRef, 190, 180)}
              disabled={disabled}
              title="Add experience, project, education or custom section"
              aria-haspopup="menu"
              aria-expanded={activeDropdown === 'add'}
            >
              <Plus size={13} />
              <span>Add</span>
              <ChevronDown size={12} className={`${styles.toolbarChevron} ${activeDropdown === 'add' ? styles.toolbarChevronOpen : ''}`} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.toolbarSpacer} />

      {/* ATS pinned right */}
      <div className={styles.toolbarGroup} aria-label="ATS">
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={p.onCheckAts}
          disabled={disabled || p.isAtsChecking}
          title="Re-check ATS score against the job description"
        >
          <Gauge size={14} />
          <span>{p.isAtsChecking ? 'Checking…' : 'ATS'}</span>
          {p.atsScore != null && (
            <span className={styles.toolbarBadge} style={atsColor ? { color: atsColor, borderColor: atsColor } : undefined}>
              {Math.round(p.atsScore)}%
            </span>
          )}
        </button>
      </div>

      {/* Unified dropdown menu renders in a body portal with fixed positioning so no
          scroll container (mobile toolbar, canvas viewport) can clip it. */}
      {activeDropdown && menuPos && createPortal(
        <div
          ref={menuRef}
          className={styles.toolbarMenu}
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 1000,
            minWidth:
              activeDropdown === 'font'
                ? '180px'
                : activeDropdown === 'template'
                  ? '180px'
                  : activeDropdown === 'density'
                    ? '160px'
                    : '190px',
          }}
        >
          {activeDropdown === 'density' &&
            DENSITY_OPTIONS.map((d) => {
              const isSelected = p.densityId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`${styles.toolbarMenuItem} ${isSelected ? styles.toolbarMenuItemActive : ''}`}
                  disabled={d.disabled}
                  onClick={() => {
                    if (d.disabled) return;
                    p.onDensityChange(d.id as 'standard' | 'tight' | 'ultra');
                    closeDropdown();
                  }}
                >
                  <span>{d.label}</span>
                  {isSelected && <Check size={13} className={styles.toolbarCheckIcon} />}
                </button>
              );
            })}

          {activeDropdown === 'template' &&
            TEMPLATE_OPTIONS.map((t) => {
              const isSelected = p.template === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.toolbarMenuItem} ${isSelected ? styles.toolbarMenuItemActive : ''}`}
                  disabled={t.disabled}
                  onClick={() => {
                    if (t.disabled) return;
                    p.onTemplateChange(t.value);
                    closeDropdown();
                  }}
                >
                  <span>{t.label}</span>
                  {isSelected && <Check size={13} className={styles.toolbarCheckIcon} />}
                </button>
              );
            })}

          {activeDropdown === 'font' &&
            FONT_OPTIONS.map((f) => {
              const isSelected = p.fontFamily === f.value;
              return (
                <button
                  key={f.label}
                  type="button"
                  className={`${styles.toolbarMenuItem} ${isSelected ? styles.toolbarMenuItemActive : ''}`}
                  style={f.value ? { fontFamily: f.value } : undefined}
                  onClick={() => {
                    p.onFontFamilyChange(f.value);
                    closeDropdown();
                  }}
                >
                  <span>{f.label}</span>
                  {isSelected && <Check size={13} className={styles.toolbarCheckIcon} />}
                </button>
              );
            })}

          {activeDropdown === 'add' && (
            <>
              <button
                type="button"
                className={styles.toolbarMenuItem}
                onClick={() => {
                  closeDropdown();
                  p.onAddExperience();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={14} />
                  <span>Experience</span>
                </div>
              </button>
              <button
                type="button"
                className={styles.toolbarMenuItem}
                onClick={() => {
                  closeDropdown();
                  p.onAddProject();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={14} />
                  <span>Project</span>
                </div>
              </button>
              <button
                type="button"
                className={styles.toolbarMenuItem}
                onClick={() => {
                  closeDropdown();
                  p.onAddEducation();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={14} />
                  <span>Education</span>
                </div>
              </button>
              <button
                type="button"
                className={styles.toolbarMenuItem}
                onClick={() => {
                  closeDropdown();
                  p.onAddCustom();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderPlus size={14} />
                  <span>Custom section…</span>
                </div>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
