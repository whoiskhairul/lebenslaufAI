import React from 'react';
import styles from './InputField.module.css';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  type?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  type = 'text',
  id,
  ...props
}) => {
  const isTextarea = type === 'textarea';
  return (
    <div className={`${styles.group} ${error ? styles.error : ''}`}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {isTextarea ? (
        <textarea
          id={id}
          className={styles.textarea}
          {...(props as any)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={styles.input}
          {...(props as any)}
        />
      )}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
};
