export const parseDate = (str: string) => {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  if (s === 'present' || s === 'current' || s === 'heute' || s === 'jetzt' || s === 'laufend') {
    return 'Present';
  }

  // Try to match MM/YYYY or M/YYYY or YYYY-MM or YYYY.MM
  let match = s.match(/^(\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    return { month: parseInt(match[1]), year: parseInt(match[2]) };
  }

  match = s.match(/^(\d{4})[\/\-\.](\d{1,2})$/);
  if (match) {
    return { month: parseInt(match[2]), year: parseInt(match[1]) };
  }

  // Match Month Name YYYY (e.g. "May 2022", "Jan. 2020", "März 2021")
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const germanMonths = ['jan', 'feb', 'mär', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];

  const yearMatch = s.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    for (let i = 0; i < 12; i++) {
      if (s.includes(months[i]) || s.includes(germanMonths[i])) {
        return { month: i + 1, year };
      }
    }
    return { month: null, year };
  }

  // Raw Year only
  const rawYearMatch = s.match(/^(\d{4})$/);
  if (rawYearMatch) {
    return { month: null, year: parseInt(rawYearMatch[1]) };
  }

  return null;
};

export const formatDate = (dateStr: string, format: 'MM/YYYY' | 'MMM YYYY' | 'YYYY') => {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr;
  if (parsed === 'Present') return 'Present';

  const { month, year } = parsed;
  if (format === 'YYYY' || !month) {
    return `${year}`;
  }

  if (format === 'MM/YYYY') {
    return `${month.toString().padStart(2, '0')}/${year}`;
  }

  if (format === 'MMM YYYY') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
  }

  return dateStr;
};
