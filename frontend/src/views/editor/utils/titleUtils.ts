import React from 'react';

export const renderFormattedTitle = (title: string, primaryColor?: string, secondaryColor?: string) => {
  if (!title) return null;
  const upperTitle = title.toUpperCase();

  // 1. Color tag syntax e.g. <color:#3b82f6>Summary</color>
  if (upperTitle.includes('<COLOR:')) {
    const parts: React.ReactNode[] = [];
    const regex = /<COLOR:(#[0-9A-FA-F]{3,8}|[a-zA-Z]+)>(.*?)<\/COLOR>/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(upperTitle)) !== null) {
      if (match.index > lastIdx) {
        parts.push(upperTitle.substring(lastIdx, match.index));
      }
      parts.push(
        React.createElement('span', { key: match.index, style: { color: match[1] } }, match[2])
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < upperTitle.length) {
      parts.push(upperTitle.substring(lastIdx));
    }
    return React.createElement(React.Fragment, null, parts);
  }

  // 2. Dual-color split mode (1st word vs rest of title)
  if (secondaryColor) {
    const words = upperTitle.trim().split(/\s+/);
    if (words.length > 1) {
      const firstWord = words[0];
      const rest = words.slice(1).join(' ');
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('span', { style: { color: primaryColor } }, firstWord + ' '),
        React.createElement('span', { style: { color: secondaryColor } }, rest)
      );
    }
  }

  return upperTitle;
};
