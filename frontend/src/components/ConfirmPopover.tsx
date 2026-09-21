import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import styles from './ConfirmPopover.module.css';

export interface ConfirmPopoverProps {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button (deletes). Set false for neutral confirms like "Leave". */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared replacement for window.confirm().
 * Portal overlay matching the app's modal styling (light + dark via theme
 * variables). Overlay click / Escape cancels; Enter confirms.
 */
export const ConfirmPopover: React.FC<ConfirmPopoverProps> = ({
  message,
  title = 'Are you sure?',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, onConfirm]);

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span className={styles.icon}>
            <AlertTriangle size={16} />
          </span>
          <h4 className={styles.title}>{title}</h4>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
