import React from 'react';
import styles from './InputField.module.css';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  helper?: string;
  type?: string;
  rows?: number;
  minHeight?: number | string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  helper,
  type = 'text',
  id,
  rows,
  minHeight,
  required,
  ...props
}) => {
  const isTextarea = type === 'textarea';
  const errorId = error && id ? `${id}-error` : undefined;
  const helperId = helper && !error && id ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`${styles.group} ${error ? styles.error : ''}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span aria-hidden="true" className={styles.required}>
            {' '}*
          </span>
        )}
      </label>
      {isTextarea ? (
        <textarea
          id={id}
          rows={rows ?? 4}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={required}
          required={required}
          className={styles.textarea}
          style={minHeight ? { minHeight } : undefined}
          {...(props as any)}
        />
      ) : (
        <input
          id={id}
          type={type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={required}
          required={required}
          className={styles.input}
          {...(props as any)}
        />
      )}
      {error && (
        <span id={errorId} role="alert" className={styles.errorMsg}>
          {error}
        </span>
      )}
      {!error && helper && (
        <span id={helperId} className={styles.helper}>
          {helper}
        </span>
      )}
    </div>
  );
};
