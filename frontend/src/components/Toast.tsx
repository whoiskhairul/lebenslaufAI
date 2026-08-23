import React, { useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const Icon = type === 'success' ? Check : type === 'error' ? X : AlertCircle;

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.iconContainer}>
        <Icon size={16} />
      </div>
      <span className={styles.message}>{message}</span>
      <button className={styles.closeBtn} onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
};
