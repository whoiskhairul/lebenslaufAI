import React, { useEffect, useMemo, useState } from 'react';
import { logoUrlsForDomain } from '../services/companyApi';

interface CompanyLogoProps {
  company: string;
  domain?: string | null;
  size?: number;
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function colorFor(name: string): string {
  // Deterministic pastel background from company name hash.
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 45% 88%)`;
}

function fgFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 45% 28%)`;
}

/**
 * Dynamic logo via domain lookup (unavatar.io primary,
 * DuckDuckGo favicons secondary).
 * Falls back to an initials avatar when no domain exists
 * or all logo sources fail to load.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({ company, domain, size = 28 }) => {
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const urls = useMemo(() => logoUrlsForDomain(domain), [domain]);

  useEffect(() => {
    setSrcIndex(0);
    setFailed(false);
  }, [domain, company]);

  const handleError = () => {
    if (srcIndex + 1 < urls.length) {
      setSrcIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    flexShrink: 0,
  };

  if (urls.length === 0 || failed) {
    return (
      <span
        aria-label={`${company} logo fallback`}
        title={company}
        style={{
          ...common,
          background: colorFor(company || '?'),
          color: fgFor(company || '?'),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(10, Math.round(size * 0.38)),
          fontWeight: 800,
          border: '1px solid var(--card-border)',
          userSelect: 'none',
        }}
      >
        {initialsFor(company || '?')}
      </span>
    );
  }

  return (
    <img
      src={urls[srcIndex]}
      alt={`${company} logo`}
      title={company}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
      style={{ ...common, objectFit: 'contain', background: '#fff', border: '1px solid var(--card-border)', padding: 2 }}
    />
  );
};
