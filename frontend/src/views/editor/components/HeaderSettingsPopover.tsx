import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from '../../EditorNew.module.css';

export interface HeaderSettingsPopoverProps {
  popoverPosition: { top: number; left: number } | null;
  headerStyles: any;
  setHeaderStyles: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  editablePersonalInfo: any;
  setEditablePersonalInfo: React.Dispatch<React.SetStateAction<any>>;
}

export const HeaderSettingsPopover: React.FC<HeaderSettingsPopoverProps> = ({
  popoverPosition,
  headerStyles,
  setHeaderStyles,
  onClose,
  editablePersonalInfo,
  setEditablePersonalInfo
}) => {
  const updateHeaderStyle = (key: string, value: any) => {
    setHeaderStyles((prev: any) => ({ ...prev, [key]: value }));
    window.dispatchEvent(new Event('cv-style-change'));
  };

  const topPos = popoverPosition ? Math.max(60, Math.min(window.innerHeight - 480, popoverPosition.top - 10)) : 100;
  const leftPos = popoverPosition ? Math.max(16, popoverPosition.left - 305) : 100;

  return createPortal(
    <div
      className={`${styles.portalPopoverCard} glass-card no-print`}
      style={{
        position: 'fixed',
        top: `${topPos}px`,
        left: `${leftPos}px`,
        width: '290px',
        zIndex: 999999
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.popoverHeader}>
        <h4>Header Customizer</h4>
        <button type="button" onClick={onClose} className={styles.popoverCloseBtn}>
          <X size={12} />
        </button>
      </div>

      <div className={styles.popoverBody}>
        <div className={styles.popoverControlGroup}>
          <label><span>Name Size</span><strong>{headerStyles.nameSize || 23}px</strong></label>
          <input
            type="range"
            min="14"
            max="36"
            step="0.5"
            value={headerStyles.nameSize || 20}
            onChange={(e) => updateHeaderStyle('nameSize', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Title Size</span><strong>{headerStyles.titleSize || 13}px</strong></label>
          <input
            type="range"
            min="10"
            max="24"
            step="0.5"
            value={headerStyles.titleSize || 13}
            onChange={(e) => updateHeaderStyle('titleSize', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Contacts Size</span><strong>{headerStyles.contactsSize || 11}px</strong></label>
          <input
            type="range"
            min="8"
            max="16"
            step="0.5"
            value={headerStyles.contactsSize || 11}
            onChange={(e) => updateHeaderStyle('contactsSize', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Contacts Gap</span><strong>{headerStyles.contactsGap || 8}px</strong></label>
          <input
            type="range"
            min="2"
            max="20"
            step="0.5"
            value={headerStyles.contactsGap || 8}
            onChange={(e) => updateHeaderStyle('contactsGap', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Personal Details Top Offset</span><strong>{headerStyles.contactsMarginTop !== undefined ? headerStyles.contactsMarginTop : 16}px</strong></label>
          <input
            type="range"
            min="0"
            max="80"
            step="0.5"
            value={headerStyles.contactsMarginTop !== undefined ? headerStyles.contactsMarginTop : 16}
            onChange={(e) => updateHeaderStyle('contactsMarginTop', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverControlGroup}>
          <label><span>Header Margin Bottom</span><strong>{headerStyles.spacing || 20}px</strong></label>
          <input
            type="range"
            min="5"
            max="60"
            step="0.5"
            value={headerStyles.spacing || 20}
            onChange={(e) => updateHeaderStyle('spacing', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.popoverInlinePickers}>
          <div className={styles.popoverControlGroup}>
            <label>Name Color</label>
            <input
              type="color"
              value={headerStyles.nameColor || '#0f172a'}
              onChange={(e) => updateHeaderStyle('nameColor', e.target.value)}
            />
          </div>
          <div className={styles.popoverControlGroup}>
            <label>Title Color</label>
            <input
              type="color"
              value={headerStyles.titleColor || '#3d7ee6'}
              onChange={(e) => updateHeaderStyle('titleColor', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.popoverToggles}>
          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${headerStyles.nameWeight === 'normal' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateHeaderStyle('nameWeight', headerStyles.nameWeight === 'normal' ? 'bold' : 'normal')}
            title="Toggle Bold Name"
          >
            <strong>N-Bold</strong>
          </button>
          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${headerStyles.nameStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateHeaderStyle('nameStyle', headerStyles.nameStyle === 'italic' ? 'normal' : 'italic')}
            title="Toggle Italic Name"
          >
            <em>N-Italic</em>
          </button>
          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${headerStyles.titleWeight === 'bold' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateHeaderStyle('titleWeight', headerStyles.titleWeight === 'bold' ? 'normal' : 'bold')}
            title="Toggle Bold Title"
          >
            <strong>T-Bold</strong>
          </button>
          <button
            type="button"
            className={`${styles.popoverToggleBtn} ${headerStyles.titleStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
            onClick={() => updateHeaderStyle('titleStyle', headerStyles.titleStyle === 'italic' ? 'normal' : 'italic')}
            title="Toggle Italic Title"
          >
            <em>T-Italic</em>
          </button>
        </div>

        <div className={styles.popoverControlGroup} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Profile Photo</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setEditablePersonalInfo((prev: any) => ({ ...prev, image_url: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{ fontSize: '11px', width: '180px' }}
            />
            {editablePersonalInfo.image_url && (
              <button
                type="button"
                onClick={() => setEditablePersonalInfo((prev: any) => ({ ...prev, image_url: '' }))}
                style={{ fontSize: '11px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
