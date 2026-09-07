import type { AirtableRecord } from '../components/admin/types';

export interface FormattedFieldResult {
  current: string;
  formatted: string;
  changed: boolean;
  notes?: string;
}

export interface FormattedOrderResult {
  record: AirtableRecord;
  name: FormattedFieldResult;
  phone: FormattedFieldResult;
  address: FormattedFieldResult;
  hasChanges: boolean;
  changeSummary: string[];
}

/**
 * Standardizes any Indian phone number format to strictly 10 digits:
 * Examples:
 * +91 98451 23984  -> 9845123984
 * +91-98451-23984  -> 9845123984
 * 919845123984     -> 9845123984
 * +919845123984    -> 9845123984
 * 09845123984      -> 9845123984
 * 98451 23984      -> 9845123984
 */
export function formatPhoneNumber(raw: string): FormattedFieldResult {
  const current = String(raw ?? '').trim();
  if (!current) {
    return { current: '', formatted: '', changed: false };
  }

  // Remove all non-digit characters
  const digits = current.replace(/\D/g, '');
  let formatted = digits;

  // 13 digits starting with 091: e.g. 0919845123984
  if (digits.length === 13 && digits.startsWith('091')) {
    formatted = digits.slice(3);
  }
  // 12 digits starting with 91: e.g. 919845123984
  else if (digits.length === 12 && digits.startsWith('91')) {
    formatted = digits.slice(2);
  }
  // 11 digits starting with 0: e.g. 09845123984
  else if (digits.length === 11 && digits.startsWith('0')) {
    formatted = digits.slice(1);
  }
  // 10 digits: e.g. 9845123984
  else if (digits.length === 10) {
    formatted = digits;
  }
  // Over 10 digits where last 10 digits form a valid Indian mobile (starts with 6-9)
  else if (digits.length > 10 && /^[6-9]\d{9}$/.test(digits.slice(-10))) {
    formatted = digits.slice(-10);
  }

  const changed = formatted !== current && formatted.length === 10;
  let notes = '';
  if (changed) {
    notes = current.includes('+91') || current.startsWith('91')
      ? 'Removed +91 country prefix & spaces'
      : current.startsWith('0')
      ? 'Removed leading 0'
      : 'Normalized to clean 10 digits';
  }

  return {
    current,
    formatted: formatted.length === 10 ? formatted : current,
    changed,
    notes,
  };
}

const HONORIFICS: Record<string, string> = {
  dr: 'Dr.',
  'dr.': 'Dr.',
  mr: 'Mr.',
  'mr.': 'Mr.',
  mrs: 'Mrs.',
  'mrs.': 'Mrs.',
  ms: 'Ms.',
  'ms.': 'Ms.',
  prof: 'Prof.',
  'prof.': 'Prof.',
};

/**
 * Normalizes customer names into clean Title Case and cleans punctuation:
 * Examples:
 * vikramaditya sharma -> Vikramaditya Sharma
 * DR. ANANYA ROY -> Dr. Ananya Roy
 * rohit khandelwal -> Rohit Khandelwal
 */
export function formatCustomerName(raw: string): FormattedFieldResult {
  const current = String(raw ?? '').trim();
  if (!current) {
    return { current: '', formatted: '', changed: false };
  }

  // Remove phone numbers or emails if accidentally included in name
  let cleaned = current
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}/g, '')
    .replace(/[^\w\s.,'-]/g, '')
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { current, formatted: current, changed: false };
  }

  const formattedWords = words.map((w, idx) => {
    const lower = w.toLowerCase();
    // Check honorifics on first word
    if (idx === 0 && HONORIFICS[lower]) {
      return HONORIFICS[lower];
    }
    // Single initials like 'A.' or 'A'
    if (/^[a-zA-Z]\.?$/.test(w)) {
      return w.toUpperCase().replace(/\.?$/, '.');
    }
    // Compound hyphens: e.g. "Roy-Chowdhury"
    if (w.includes('-')) {
      return w
        .split('-')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : ''))
        .join('-');
    }
    // Standard word capitalization
    return w[0].toUpperCase() + w.slice(1).toLowerCase();
  });

  const formatted = formattedWords.join(' ');
  const changed = formatted !== current;

  return {
    current,
    formatted,
    changed,
    notes: changed ? 'Formatted to proper Title Case' : undefined,
  };
}

const ADDRESS_TERMS: Record<string, string> = {
  hno: 'House No.',
  'h.no': 'House No.',
  'h.no.': 'House No.',
  houseno: 'House No.',
  'house no': 'House No.',
  'house no.': 'House No.',
  flt: 'Flat',
  'flat no': 'Flat No.',
  'flat no.': 'Flat No.',
  apt: 'Apt.',
  'apt.': 'Apt.',
  bldg: 'Bldg.',
  'bldg.': 'Bldg.',
  opp: 'Opp.',
  'opp.': 'Opp.',
  opposite: 'Opp.',
  nr: 'Near',
  'nr.': 'Near',
  near: 'Near',
  rd: 'Road',
  'rd.': 'Road',
  road: 'Road',
  st: 'Street',
  'st.': 'Street',
  street: 'Street',
  sec: 'Sector',
  'sec.': 'Sector',
  sector: 'Sector',
  flr: 'Floor',
  'flr.': 'Floor',
  floor: 'Floor',
  cross: 'Cross',
  main: 'Main',
  layout: 'Layout',
  nagar: 'Nagar',
  colony: 'Colony',
  society: 'Society',
  phase: 'Phase',
  block: 'Block',
};

const PROPER_CITIES_STATES: Record<string, string> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  mumbai: 'Mumbai',
  delhi: 'Delhi',
  'new delhi': 'New Delhi',
  pune: 'Pune',
  chennai: 'Chennai',
  hyderabad: 'Hyderabad',
  kolkata: 'Kolkata',
  gurugram: 'Gurugram',
  gurgaon: 'Gurugram',
  noida: 'Noida',
  ahmedabad: 'Ahmedabad',
  jaipur: 'Jaipur',
  chandigarh: 'Chandigarh',
  lucknow: 'Lucknow',
  kochi: 'Kochi',
  cochin: 'Kochi',
  karnataka: 'Karnataka',
  maharashtra: 'Maharashtra',
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'uttar pradesh': 'Uttar Pradesh',
  haryana: 'Haryana',
  kerala: 'Kerala',
  gujarat: 'Gujarat',
  rajasthan: 'Rajasthan',
  telangana: 'Telangana',
  'west bengal': 'West Bengal',
};

/**
 * Standardizes address formatting, commas, spacing, and pincode structure:
 * Examples:
 * flat 402, prestige tower, indiranagar 100ft road, bengaluru, karnataka 560038
 * -> Flat 402, Prestige Tower, Indiranagar 100ft Road, Bengaluru, Karnataka 560038
 */
export function formatAddress(raw: string): FormattedFieldResult {
  const current = String(raw ?? '').trim();
  if (!current) {
    return { current: '', formatted: '', changed: false };
  }

  // 1. Clean repetitive punctuation & redundant whitespace
  let clean = current
    .replace(/[\t\r\n]+/g, ', ')
    .replace(/[,;]{2,}/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  // 2. Normalize PIN code keyword
  clean = clean
    .replace(/\b(?:PIN|PINCODE|PIN CODE|Pin code|Postal Code)\s*:?\s*(\d{6})\b/gi, '$1')
    .replace(/,\s*,/g, ',')
    .trim();

  // 3. Format address segments (separated by commas)
  const segments = clean.split(',').map((s) => s.trim()).filter(Boolean);

  const formattedSegments = segments.map((seg) => {
    // Check if segment is just a 6-digit pincode
    if (/^\d{6}$/.test(seg)) {
      return seg;
    }

    const words = seg.split(/\s+/).filter(Boolean);
    const titleWords = words.map((word) => {
      const lower = word.toLowerCase().replace(/[,.:]$/, '');
      const punctuation = word.slice(lower.length);

      // Check standard address abbreviations
      if (ADDRESS_TERMS[lower]) {
        return ADDRESS_TERMS[lower] + (punctuation.includes(',') ? ',' : '');
      }

      // Check known proper cities/states
      if (PROPER_CITIES_STATES[lower]) {
        return PROPER_CITIES_STATES[lower] + (punctuation.includes(',') ? ',' : '');
      }

      // If word is alphanumeric with numbers (like 100ft, 4th, 402, B-14), keep casing
      if (/\d/.test(word)) {
        return word;
      }

      // Standard title case
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    });

    return titleWords.join(' ');
  });

  let formatted = formattedSegments.join(', ');

  // Clean trailing commas or double dots
  formatted = formatted.replace(/,\s*$/, '').replace(/\.{2,}/g, '.');

  const changed = formatted !== current;

  return {
    current,
    formatted,
    changed,
    notes: changed ? 'Cleaned punctuation, spacing, and standardized casing' : undefined,
  };
}

/**
 * Checks and prepares formatted data for a single Airtable record.
 */
export function formatOrderRecord(record: AirtableRecord): FormattedOrderResult {
  const f = record.fields;
  const nameRes = formatCustomerName(String(f['Name'] ?? ''));
  const phoneRes = formatPhoneNumber(String(f['Phone'] ?? ''));
  const addressRes = formatAddress(String(f['Address'] ?? ''));

  const changeSummary: string[] = [];
  if (phoneRes.changed) changeSummary.push('Mobile (+91 -> 10 digits)');
  if (nameRes.changed) changeSummary.push('Customer Name (Title Case)');
  if (addressRes.changed) changeSummary.push('Address (Standardized)');

  return {
    record,
    name: nameRes,
    phone: phoneRes,
    address: addressRes,
    hasChanges: changeSummary.length > 0,
    changeSummary,
  };
}
