import React, { useEffect, useRef, useState } from 'react';
import { fetchCompanySuggestions, type CompanySuggestion } from '../services/companyApi';
import styles from './InputField.module.css';

interface CompanyAutocompleteProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  /** Currently captured domain (empty string = custom entry without domain). */
  domain: string;
  onCompanyChange: (name: string) => void;
  onDomainChange: (domain: string) => void;
}

/**
 * Company name input with Clearbit autocomplete dropdown.
 * Selecting a suggestion captures the official website domain;
 * free-typing clears the domain so the card saves without one.
 */
export const CompanyAutocomplete: React.FC<CompanyAutocompleteProps> = ({
  id = 'companyAutocomplete',
  label = 'Company Name *',
  placeholder = 'e.g. Google',
  value,
  domain,
  onCompanyChange,
  onDomainChange,
}) => {
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const runSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const results = await fetchCompanySuggestions(trimmed, ctrl.signal);
      setSuggestions(results);
      setOpen(results.length > 0);
      setHighlight(results.length > 0 ? 0 : -1);
      setLoading(false);
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onCompanyChange(text);
    // Manual edits invalidate a previously selected domain.
    if (domain) onDomainChange('');
    runSearch(text);
  };

  const pick = (s: CompanySuggestion) => {
    onCompanyChange(s.name);
    onDomainChange(s.domain);
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0 && highlight < suggestions.length) {
      // Let the parent form submit normally when nothing highlighted;
      // when highlighted, pick the suggestion instead.
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={styles.group} style={{ position: 'relative' }}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onBlur={() => {
          // Delay close so click events on suggestions still fire.
          if (blurTimer.current) clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {domain && (
        <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'left' }}>
          {domain}
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            margin: '4px 0 0 0',
            padding: 4,
            listStyle: 'none',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {loading && (
            <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--muted)' }}>Searching…</li>
          )}
          {suggestions.map((s, i) => (
            <li key={`${s.domain}-${i}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: i === highlight ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: 'var(--foreground)',
                }}
              >
                <img
                  src={s.logo}
                  alt=""
                  width={24}
                  height={24}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const fallback = `https://icons.duckduckgo.com/ip3/${s.domain}.ico`;
                    if (img.src !== fallback) {
                      img.src = fallback;
                    } else {
                      img.style.display = 'none';
                    }
                  }}
                  style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', flexShrink: 0 }}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{s.domain}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
