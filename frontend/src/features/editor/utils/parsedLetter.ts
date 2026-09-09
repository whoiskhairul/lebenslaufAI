export interface ParsedLetter {
  sender_name: string;
  sender_address: string;
  sender_phone: string;
  sender_email: string;
  recipient_contact: string;
  recipient_company: string;
  recipient_department: string;
  recipient_address: string;
  location: string;
  date: string;
  subject: string;
  salutation: string;
  body: string;
  closing_salutation: string;
  candidate_name: string;
  verification_notes?: {
    requirements_emphasized?: string[];
    resume_evidence_used?: string[];
    placeholders?: string[];
    confirmation_needed?: string[];
  };
  is_json: boolean;
}

export const getTodayLetterDate = (): string =>
  new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * AI models frequently emit a stale training-date in the letter's date field.
 * Force it to today's date right after generation; the user can still edit it
 * afterwards because manual edits are written back into the stored content.
 */
export const normalizeLetterDate = (content: string): string => {
  if (!content) return content;
  const today = getTodayLetterDate();
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.date !== today) {
        parsed.date = today;
        return JSON.stringify(parsed);
      }
      return content;
    }
  } catch {
    // Not JSON — fall through
  }

  // Legacy plain-text letters: replace a standalone date-ish first line if present
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    if (/\b\d{1,2}\.\s*(Januar|Februar|M\u00e4rz|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*\d{4}\b/i.test(lines[i])) {
      lines[i] = today;
      return lines.join('\n');
    }
    if (/\b(January|February|March|April|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(lines[i])) {
      lines[i] = today;
      return lines.join('\n');
    }
  }
  return content;
};

export const getParsedLetter = (content: string, editablePersonalInfo: any): ParsedLetter => {
  if (!content) {
    return {
      sender_name: editablePersonalInfo.full_name || '',
      sender_address: editablePersonalInfo.location || '',
      sender_phone: editablePersonalInfo.phone || '',
      sender_email: editablePersonalInfo.email || '',
      recipient_contact: '',
      recipient_company: '',
      recipient_department: '',
      recipient_address: '',
      location: editablePersonalInfo.location?.split(',')?.[0]?.trim() || '',
      date: getTodayLetterDate(),
      subject: '',
      salutation: '',
      body: '',
      closing_salutation: 'Mit freundlichen Grüßen',
      candidate_name: editablePersonalInfo.full_name || '',
      is_json: false
    };
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return {
        sender_name: parsed.sender_name || '',
        sender_address: parsed.sender_address || '',
        sender_phone: parsed.sender_phone || '',
        sender_email: parsed.sender_email || '',
        recipient_contact: parsed.recipient_contact || '',
        recipient_company: parsed.recipient_company || '',
        recipient_department: parsed.recipient_department || '',
        recipient_address: parsed.recipient_address || '',
        location: parsed.location || '',
        date: parsed.date || '',
        subject: parsed.subject || '',
        salutation: parsed.salutation || '',
        body: parsed.body || '',
        closing_salutation: parsed.closing_salutation || '',
        candidate_name: parsed.candidate_name || '',
        verification_notes: parsed.verification_notes,
        is_json: true
      };
    }
  } catch (e) {
    // Not JSON
  }

  // Legacy plain text parser fallback
  const lines = content.split('\n');
  let closingIndex = -1;
  const triggers = [
    'mit freundlichen',
    'sincerely',
    'best regards',
    'kind regards',
    'viele grüße',
    'freundliche grüße',
    'hochachtungsvoll',
    'yours truly',
    'mit besten',
    'grüße'
  ];
  for (let i = lines.length - 1; i >= 0; i--) {
    const lineLower = lines[i].toLowerCase().trim();
    if (triggers.some(t => lineLower.includes(t))) {
      closingIndex = i;
      break;
    }
  }

  let bodyText = '';
  let closingText = '';
  let nameText = '';

  if (closingIndex !== -1) {
    bodyText = lines.slice(0, closingIndex).join('\n');
    closingText = lines[closingIndex];
    nameText = lines.slice(closingIndex + 1).join('\n');
  } else if (lines.length > 2) {
    bodyText = lines.slice(0, lines.length - 2).join('\n');
    closingText = lines[lines.length - 2];
    nameText = lines[lines.length - 1];
  } else {
    bodyText = content;
  }

  return {
    sender_name: editablePersonalInfo.full_name || '',
    sender_address: editablePersonalInfo.location || '',
    sender_phone: editablePersonalInfo.phone || '',
    sender_email: editablePersonalInfo.email || '',
    recipient_contact: '',
    recipient_company: '',
    recipient_department: '',
    recipient_address: '',
    location: editablePersonalInfo.location?.split(',')?.[0]?.trim() || '',
    date: new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }),
    subject: '',
    salutation: '',
    body: bodyText,
    closing_salutation: closingText || 'Mit freundlichen Grüßen',
    candidate_name: nameText || editablePersonalInfo.full_name || '',
    is_json: false
  };
};
