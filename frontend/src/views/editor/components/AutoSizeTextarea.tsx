import React, { useState, useEffect, useLayoutEffect, useRef, createContext, useContext } from 'react';
import styles from '../../EditorNew.module.css';

export const MeasuringContext = createContext(false);

export interface AutoSizeTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  id?: string;
  singleLine?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

export const AutoSizeTextarea: React.FC<AutoSizeTextareaProps> = ({
  value, onChange, onKeyDown, onBlur, className, placeholder, id, singleLine, autoFocus = false, style
}) => {
  const isMeasuring = useContext(MeasuringContext);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [localVal, setLocalVal] = useState(value);
  const selectionRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isMeasuring) {
    return (
      <div
        className={className}
        style={{
          whiteSpace: singleLine ? 'nowrap' : 'pre-wrap',
          wordBreak: singleLine ? 'keep-all' : 'break-word',
          width: '100%',
          display: 'block',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          padding: '2px 0',
          minHeight: '1.2em',
          boxSizing: 'border-box',
          ...style
        }}
      >
        {value || placeholder || ' '}
      </div>
    );
  }

  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalVal(value);
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      if (singleLine) {
        textareaRef.current.style.width = 'auto';
        const hasVal = Boolean(localVal || value);
        const minW = hasVal ? 5 : 30;
        textareaRef.current.style.width = `${Math.max(minW, textareaRef.current.scrollWidth + 1)}px`;
      }
    }
  };

  useLayoutEffect(() => {
    adjustHeight();
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      const { start, end } = selectionRef.current;
      if (start !== null && end !== null) {
        try {
          textareaRef.current.setSelectionRange(start, end);
        } catch (_) { }
      }
    }
  }, [localVal, value, style?.fontSize, style?.lineHeight, style?.fontWeight, (style as any)?.headingSizeMult]);

  useEffect(() => {
    const handleResizeOrStyle = () => {
      adjustHeight();
      requestAnimationFrame(adjustHeight);
    };
    window.addEventListener('resize', handleResizeOrStyle);
    window.addEventListener('cv-style-change', handleResizeOrStyle);
    return () => {
      window.removeEventListener('resize', handleResizeOrStyle);
      window.removeEventListener('cv-style-change', handleResizeOrStyle);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isTypingRef.current = true;
    const newVal = e.target.value;
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    selectionRef.current = { start, end };

    setLocalVal(newVal);
    onChange(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 400);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    selectionRef.current = { start: target.selectionStart, end: target.selectionEnd };
  };

  const handleWrapperClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div
      onClick={handleWrapperClick}
      style={{
        display: singleLine ? 'inline-flex' : 'block',
        width: singleLine ? 'auto' : '100%',
        maxWidth: '100%',
        cursor: 'text',
        minHeight: '1.2em',
        verticalAlign: 'middle'
      }}
    >
      <textarea
        id={id}
        ref={textareaRef}
        value={localVal}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`${className || ''} ${styles.canvasFieldEdit}`}
        placeholder={placeholder}
        rows={1}
        style={{
          overflow: 'hidden',
          resize: 'none',
          width: singleLine ? 'auto' : '100%',
          maxWidth: '100%',
          display: singleLine ? 'inline-block' : 'block',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          padding: 0,
          margin: 0,
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          lineHeight: 'inherit',
          textAlign: 'inherit',
          whiteSpace: singleLine ? 'nowrap' : undefined,
          wordBreak: singleLine ? 'keep-all' : undefined,
          ...style
        }}
      />
    </div>
  );
};
