export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  // If already formatted like "+49 1575 3600466", clean up extra spaces and return
  const hasPlus = trimmed.startsWith('+');
  const cleanDigits = trimmed.replace(/\D/g, '');

  if (!cleanDigits) return trimmed;

  // German +49 phone number handling (e.g. +4915753600466 or +49 1575 3600466)
  if (hasPlus && cleanDigits.startsWith('49')) {
    const rest = cleanDigits.slice(2);
    if (rest.length >= 9) {
      const prefix = rest.slice(0, 4);
      const mainNum = rest.slice(4);
      return `+49 ${prefix} ${mainNum}`;
    } else if (rest.length >= 6) {
      const prefix = rest.slice(0, 3);
      const mainNum = rest.slice(3);
      return `+49 ${prefix} ${mainNum}`;
    }
    return `+49 ${rest}`;
  } 
  
  // Local German numbers (e.g. 015753600466 or 01575 3600466)
  if (!hasPlus && cleanDigits.startsWith('0')) {
    const rest = cleanDigits.slice(1);
    if (rest.length >= 9) {
      const prefix = rest.slice(0, 4);
      const mainNum = rest.slice(4);
      return `+49 ${prefix} ${mainNum}`;
    } else if (rest.length >= 6) {
      const prefix = rest.slice(0, 3);
      const mainNum = rest.slice(3);
      return `+49 ${prefix} ${mainNum}`;
    }
  }

  // Generic international fallback
  if (hasPlus) {
    if (cleanDigits.length >= 10) {
      const cc = cleanDigits.slice(0, 2);
      const area = cleanDigits.slice(2, 6);
      const num = cleanDigits.slice(6);
      return `+${cc} ${area} ${num}`;
    }
    return `+${cleanDigits}`;
  }

  return trimmed;
}
