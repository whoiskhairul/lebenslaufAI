import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

// Brand mark: a solid page in exact A4 proportion (1:√2) with a folded
// corner. Its content — two text lines and a four-point AI spark — is
// knocked out in white, so the mark reads as a solid logo at any size.
// Page fill follows the brand color (var(--primary)).
export const Logo: React.FC<LogoProps> = ({ size = 20, className, title = 'LebenslaufAI' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 34 34"
    fill="none"
    className={className}
    role="img"
    aria-label={title}
  >
    <title>{title}</title>
    {/* Page silhouette with cut top-right corner */}
    <path
      d="M11.2 5.3H19.7L25.2 10.8V26.1Q25.2 28.6 22.7 28.6H11.2Q8.7 28.6 8.7 26.1V7.8Q8.7 5.3 11.2 5.3Z"
      fill="var(--primary, #6366F1)"
    />
    {/* Folded-over flap */}
    <path
      d="M19.7 5.3V8.8Q19.7 10.8 21.7 10.8H25.2Z"
      fill="#A5B4FC"
    />
    {/* Knocked-out content: two lines + AI spark */}
    <path
      d="M12.4 12.6H21.5M12.4 16.6H18.4"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M16.6 17.9Q16.6 22.3 21 22.3Q16.6 22.3 16.6 26.7Q16.6 22.3 12.2 22.3Q16.6 22.3 16.6 17.9Z"
      fill="#FFFFFF"
    />
  </svg>
);
