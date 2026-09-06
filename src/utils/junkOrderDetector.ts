import type { AirtableRecord } from '../components/admin/types';

export type JunkIssueType =
  | 'DUPLICATE_ORDER'
  | 'BUNK_PHONE'
  | 'FAKE_ADDRESS'
  | 'DUMMY_NAME'
  | 'ZERO_AMOUNT';

export interface JunkIssue {
  type: JunkIssueType;
  label: string;
  detail: string;
  severity: 'high' | 'medium';
}

export interface FlaggedOrder {
  record: AirtableRecord;
  issues: JunkIssue[];
  score: number; // 0 to 100 confidence
  duplicateOfRecordId?: string;
  duplicateOfOrderId?: string;
}

const SEQUENTIAL_PATTERNS = [
  '1234567890',
  '0123456789',
  '9876543210',
  '8765432109',
  '2345678901',
  '0987654321',
];

const GIBBERISH_PHRASES = [
  'asdf',
  'qwerty',
  'zxcv',
  'test address',
  'fake address',
  'dummy address',
  'sample address',
  'house no 1',
  'house 1',
  'na na',
  'none none',
  'testing',
  '123 fake',
];

const DUMMY_NAMES = [
  'test',
  'test test',
  'demo',
  'dummy',
  'sample',
  'admin',
  'user',
  'asdf',
  'qwerty',
  'xyz',
  'abc',
  'none',
  'customer',
  'first last',
];

function field(record: AirtableRecord, key: string): string {
  return String(record.fields[key] ?? '').trim();
}

/** Extracts clean 10-digit Indian phone number if possible */
function extract10DigitPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function detectJunkOrders(records: AirtableRecord[]): FlaggedOrder[] {
  const flaggedMap = new Map<string, FlaggedOrder>();

  // ── Step 1: Detect Duplicate Orders ────────────────────────────────────────
  // Group orders by normalized customer key
  const customerGroupMap = new Map<string, AirtableRecord[]>();
  records.forEach((r) => {
    const rawPhone = field(r, 'Phone');
    const phone10 = extract10DigitPhone(rawPhone);
    const rawName = field(r, 'Name').toLowerCase().replace(/\s+/g, '');
    const key = phone10.length === 10 ? `phone:${phone10}` : `name:${rawName}`;
    if (key.length > 5) {
      const list = customerGroupMap.get(key) || [];
      list.push(r);
      customerGroupMap.set(key, list);
    }
  });

  customerGroupMap.forEach((group) => {
    if (group.length <= 1) return;

    // Sort by Created date/time ascending (first placed is original)
    const sorted = [...group].sort((a, b) => {
      const dA = String(a.fields['Created'] ?? '');
      const dB = String(b.fields['Created'] ?? '');
      return dA.localeCompare(dB);
    });

    const original = sorted[0];
    const origOrderId = field(original, 'orderID') || original.id.slice(-6);

    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i];
      const itemsMatch = field(dup, 'Items') === field(original, 'Items');
      const totalMatch = Number(dup.fields['Total (₹)']) === Number(original.fields['Total (₹)']);

      let detail = `Repeat identical submission from same customer (matches order #${origOrderId})`;
      if (itemsMatch && totalMatch) {
        detail = `Exact duplicate items & total of order #${origOrderId}`;
      }

      const existing = flaggedMap.get(dup.id) || {
        record: dup,
        issues: [],
        score: 0,
        duplicateOfRecordId: original.id,
        duplicateOfOrderId: origOrderId,
      };

      existing.issues.push({
        type: 'DUPLICATE_ORDER',
        label: 'Duplicate / Spam Order',
        detail,
        severity: 'high',
      });
      existing.score += 45;
      flaggedMap.set(dup.id, existing);
    }
  });

  // ── Step 2: Analyze Individual Field Bunk / Fake Patterns ──────────────────
  records.forEach((r) => {
    const rawPhone = field(r, 'Phone');
    const rawName = field(r, 'Name');
    const rawAddress = field(r, 'Address');
    const total = Number(r.fields['Total (₹)'] || 0);

    const flagged: FlaggedOrder = flaggedMap.get(r.id) || {
      record: r,
      issues: [],
      score: 0,
    };

    // ── Check Bunk Phone ──
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const phone10 = extract10DigitPhone(rawPhone);
    const hasLetters = /[a-zA-Z]/.test(rawPhone);

    if (hasLetters) {
      flagged.issues.push({
        type: 'BUNK_PHONE',
        label: 'Fake Phone Number',
        detail: `Contains letters in mobile field: "${rawPhone}"`,
        severity: 'high',
      });
      flagged.score += 40;
    } else if (digitsOnly.length > 0) {
      // Check sequential patterns
      if (SEQUENTIAL_PATTERNS.some((p) => digitsOnly.includes(p))) {
        flagged.issues.push({
          type: 'BUNK_PHONE',
          label: 'Fake Phone Number',
          detail: `Sequential dummy digits: "${digitsOnly}"`,
          severity: 'high',
        });
        flagged.score += 45;
      }
      // Check 7+ repeated digits (e.g. 0000000000, 9999999999)
      else if (/(\d)\1{6,}/.test(digitsOnly)) {
        flagged.issues.push({
          type: 'BUNK_PHONE',
          label: 'Fake Phone Number',
          detail: `Repeated digits: "${digitsOnly}"`,
          severity: 'high',
        });
        flagged.score += 45;
      }
      // Check invalid length
      else if (phone10.length !== 10) {
        flagged.issues.push({
          type: 'BUNK_PHONE',
          label: 'Invalid Mobile Number',
          detail: `Invalid digit length (${phone10.length} digits instead of 10)`,
          severity: 'medium',
        });
        flagged.score += 25;
      }
      // Check Indian mobile starting digit (must be 6, 7, 8, 9)
      else if (!/^[6-9]/.test(phone10)) {
        flagged.issues.push({
          type: 'BUNK_PHONE',
          label: 'Fake Mobile Prefix',
          detail: `Invalid mobile starting prefix: "${phone10.slice(0, 2)}…" (must start with 6, 7, 8, 9)`,
          severity: 'high',
        });
        flagged.score += 35;
      }
      // Check very low entropy (e.g. 9898989898)
      else if (new Set(phone10.split('')).size <= 2) {
        flagged.issues.push({
          type: 'BUNK_PHONE',
          label: 'Fake Phone Pattern',
          detail: `Only ${new Set(phone10.split('')).size} unique digits in mobile number`,
          severity: 'high',
        });
        flagged.score += 35;
      }
    } else if (!rawPhone) {
      flagged.issues.push({
        type: 'BUNK_PHONE',
        label: 'Missing Phone',
        detail: 'No phone number provided',
        severity: 'medium',
      });
      flagged.score += 20;
    }

    // ── Check Fake / Gibberish Address ──
    const addrLower = rawAddress.toLowerCase().trim();
    if (!addrLower || addrLower.length < 8) {
      flagged.issues.push({
        type: 'FAKE_ADDRESS',
        label: 'Incomplete / Bunk Address',
        detail: `Address is too short (${addrLower.length} chars) to be deliverable`,
        severity: 'high',
      });
      flagged.score += 35;
    } else {
      // Check known placeholder phrases
      const matchedPhrase = GIBBERISH_PHRASES.find((p) => addrLower.includes(p));
      if (matchedPhrase) {
        flagged.issues.push({
          type: 'FAKE_ADDRESS',
          label: 'Fake Address Keyword',
          detail: `Contains dummy test keyword "${matchedPhrase}"`,
          severity: 'high',
        });
        flagged.score += 40;
      }
      // Check repetitive characters (e.g. aaaaa, bbbbb)
      else if (/([a-zA-Z])\1{4,}/.test(addrLower)) {
        flagged.issues.push({
          type: 'FAKE_ADDRESS',
          label: 'Gibberish Address',
          detail: 'Contains repetitive character keyboard mash',
          severity: 'high',
        });
        flagged.score += 35;
      }
      // Check if address has zero vowels in long words
      else {
        const words = addrLower.split(/\s+/).filter((w) => w.length >= 6);
        const vowelLessWords = words.filter((w) => !/[aeiou]/.test(w) && !/^\d+$/.test(w));
        if (vowelLessWords.length > 0) {
          flagged.issues.push({
            type: 'FAKE_ADDRESS',
            label: 'Keyboard Mash Address',
            detail: `Gibberish word without vowels: "${vowelLessWords[0]}"`,
            severity: 'high',
          });
          flagged.score += 35;
        }
      }
    }

    // ── Check Dummy Name ──
    const nameLower = rawName.toLowerCase().trim();
    if (!nameLower || nameLower.length <= 1) {
      flagged.issues.push({
        type: 'DUMMY_NAME',
        label: 'Missing / Invalid Name',
        detail: 'Name is empty or single character',
        severity: 'medium',
      });
      flagged.score += 20;
    } else if (DUMMY_NAMES.includes(nameLower)) {
      flagged.issues.push({
        type: 'DUMMY_NAME',
        label: 'Test / Dummy Name',
        detail: `Matches common test name "${nameLower}"`,
        severity: 'high',
      });
      flagged.score += 30;
    } else if (/^\d+$/.test(nameLower)) {
      flagged.issues.push({
        type: 'DUMMY_NAME',
        label: 'Numeric Name',
        detail: 'Name contains only digits',
        severity: 'high',
      });
      flagged.score += 30;
    }

    // ── Check Zero Amount ──
    if (total <= 1) {
      flagged.issues.push({
        type: 'ZERO_AMOUNT',
        label: 'Zero / ₹1 Test Order',
        detail: `Total value is ₹${total} (test transaction)`,
        severity: 'high',
      });
      flagged.score += 40;
    }

    // Save if any issues were detected
    if (flagged.issues.length > 0) {
      flagged.score = Math.min(100, flagged.score);
      flaggedMap.set(r.id, flagged);
    }
  });

  return Array.from(flaggedMap.values()).sort((a, b) => b.score - a.score);
}
