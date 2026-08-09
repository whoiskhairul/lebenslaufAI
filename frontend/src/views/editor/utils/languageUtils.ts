import React from 'react';

export const renderFormattedLanguageList = (text: string) => {
  if (!text) return null;
  const items = text.split(',').map(s => s.trim()).filter(Boolean);
  return React.createElement(
    React.Fragment,
    null,
    items.map((item, idx) => {
      const parenIdx = item.indexOf('(');
      if (parenIdx !== -1) {
        const langName = item.substring(0, parenIdx).trim();
        const rest = item.substring(parenIdx);
        return React.createElement(
          'span',
          { key: idx },
          React.createElement('strong', { style: { fontWeight: 700 } }, langName),
          ' ',
          React.createElement('span', { style: { fontWeight: 400 } }, rest),
          idx < items.length - 1 ? ', ' : ''
        );
      } else {
        return React.createElement(
          'span',
          { key: idx },
          React.createElement('strong', { style: { fontWeight: 700 } }, item),
          idx < items.length - 1 ? ', ' : ''
        );
      }
    })
  );
};
