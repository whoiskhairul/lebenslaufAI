export const ensureAbsoluteUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const formatDisplayDateRange = (startDate?: string, endDate?: string, lang?: 'en' | 'de') => {
  const formatSingle = (d?: string) => {
    if (!d) return '';
    const trimmed = d.trim();
    if (trimmed.toLowerCase() === 'present') {
      return lang === 'de' ? 'Heute' : 'Present';
    }
    if (lang === 'de') {
      let formatted = trimmed;
      const replacements: Record<string, string> = {
        'march': 'März', 'mar': 'Mär',
        'may': 'Mai',
        'october': 'Oktober', 'oct': 'Okt',
        'december': 'Dezember', 'dec': 'Dez'
      };
      for (const [eng, ger] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        formatted = formatted.replace(regex, ger);
      }
      return formatted;
    }
    return d;
  };

  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return formatSingle(startDate);
  if (!startDate && endDate) return formatSingle(endDate);
  return `${formatSingle(startDate)} - ${formatSingle(endDate)}`;
};
