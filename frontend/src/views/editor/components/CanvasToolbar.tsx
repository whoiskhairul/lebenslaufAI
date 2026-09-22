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

export const CanvasToolbar: React.FC<CanvasToolbarProps> = (p) => {
  const [addOpen, setAddOpen] = useState(false);
  const [addPos, setAddPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || addMenuRef.current?.contains(t)) return;
      setAddOpen(false);
    };
    const onDismiss = () => setAddOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onDismiss);
    // Toolbar scroll / page scroll would detach the fixed menu from its button.
    window.addEventListener('scroll', onDismiss, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('scroll', onDismiss, true);
    };
  }, [addOpen]);

  const toggleAdd = () => {
    if (addOpen) {
      setAddOpen(false);
      return;
    }
    // Anchor the menu to the button at open time so it never gets clipped
    // by the toolbar's scroll container (notably on mobile, where the
    // toolbar scrolls horizontally and would cut an in-flow dropdown off).
    const r = addBtnRef.current?.getBoundingClientRect();
    if (r) {
      const menuWidth = 200;
      const menuHeight = 190;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8));
      const openUp = r.bottom + menuHeight + 8 > window.innerHeight;
      const top = openUp ? Math.max(8, r.top - menuHeight - 6) : r.bottom + 6;
      setAddPos({ top, left });
    }
    setAddOpen(true);
  };

  const closeAdd = () => setAddOpen(false);

  const disabled = !p.hasVersion;
  const atsColor =
    p.atsScore == null
      ? undefined
      : p.atsScore >= 80
        ? 'var(--success, #10b981)'
        : p.atsScore >= 60
          ? 'var(--warning, #f59e0b)'
          : 'var(--danger, #ef4444)';

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
            <select
              className={styles.toolbarSelect}
              value={p.densityId}
              onChange={(e) => p.onDensityChange(e.target.value as 'standard' | 'tight' | 'ultra')}
              disabled={disabled}
              title="Spacing density preset"
              style={{ maxWidth: '104px' }}
            >
              <option value="standard">Standard</option>
              <option value="tight">Tight</option>
              <option value="ultra">Ultra-tight</option>
              <option value="custom" disabled>
                Custom
              </option>
            </select>
            <select
              className={styles.toolbarSelect}
              value={p.template}
              onChange={(e) => p.onTemplateChange(e.target.value)}
              disabled={disabled}
              title="Layout template"
            >
              <option value="pixel_perfect_pdf">German Styled</option>
              <option value="modern_minimalist" disabled>
                More templates soon
              </option>
            </select>
          </>
        )}
        <select
          className={styles.toolbarSelect}
          value={p.fontFamily}
          onChange={(e) => p.onFontFamilyChange(e.target.value)}
          disabled={disabled}
          title="Font family"
          style={{ maxWidth: '112px' }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {p.editorTab === 'resume' && (
          <div className={styles.toolbarMenuWrap}>
            <button
              ref={addBtnRef}
              type="button"
              className={styles.toolbarBtn}
              onClick={toggleAdd}
              disabled={disabled}
              title="Add experience, project, education or custom section"
              aria-haspopup="menu"
              aria-expanded={addOpen}
            >
              <Plus size={14} />
              <span>Add</span>
              <ChevronDown size={12} />
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

      {/* Add menu renders in a body portal with fixed positioning so no
          scroll container (mobile toolbar, canvas viewport) can clip it. */}
      {addOpen && addPos && createPortal(
        <div
          ref={addMenuRef}
          className={styles.toolbarMenu}
          role="menu"
          style={{
            position: 'fixed',
            top: addPos.top,
            left: addPos.left,
            zIndex: 500,
            minWidth: '190px',
          }}
        >
          <button type="button" className={styles.toolbarMenuItem} onClick={() => { closeAdd(); p.onAddExperience(); }}>
            <Briefcase size={14} />
            <span>Experience</span>
          </button>
          <button type="button" className={styles.toolbarMenuItem} onClick={() => { closeAdd(); p.onAddProject(); }}>
            <Code size={14} />
            <span>Project</span>
          </button>
          <button type="button" className={styles.toolbarMenuItem} onClick={() => { closeAdd(); p.onAddEducation(); }}>
            <GraduationCap size={14} />
            <span>Education</span>
          </button>
          <button type="button" className={styles.toolbarMenuItem} onClick={() => { closeAdd(); p.onAddCustom(); }}>
            <FolderPlus size={14} />
            <span>Custom section…</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
