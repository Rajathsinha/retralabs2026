import { canonicalRegion, ALL_REGION_NAMES } from '../data/indianStates';

export interface ParsedManualOrder {
  id: string;
  rawText: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  item: string;
  price: number;
  paymentMethod: 'prepay' | 'cod';
  deliveryOption: 'normal' | 'fast';
  email: string;
  isValid: boolean;
  validationErrors: string[];
}

export interface ParserDefaults {
  defaultPrice?: number;
  defaultItem?: string;
  defaultPaymentMethod?: 'prepay' | 'cod';
  defaultDeliveryOption?: 'normal' | 'fast';
}

const PINCODE_REGEX = /\b([1-9][0-9]{5})\b/;
const PHONE_REGEX = /(?:(?:\+|0{0,2})91[\s-]?)?([6-9]\d{9})\b/;

const isChatBoilerplate = (line: string): boolean => {
  const l = line.toLowerCase().trim();
  return (
    l.startsWith('hi') ||
    l.startsWith('hello') ||
    l.startsWith('hey') ||
    l.startsWith('dear') ||
    l.includes('just placed an order') ||
    l.includes('just made this order') ||
    l.includes('please help') ||
    l.includes('need support') ||
    l.includes('order support') ||
    l.includes('track my order') ||
    l.includes('thank you') ||
    l.includes('thanks') ||
    l.includes('regards') ||
    l.includes('support team')
  );
};

function formatNameTitleCase(raw: string): string {
  return raw
    .trim()
    .replace(/^[,\s*]+|[,\s*]+$/g, '')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Splits raw multi-block text into individual order text blocks.
 * Supports splitting by:
 * 1. "TO," / "TO:" / "To," / "To:" markers (when repeated)
 * 2. Explicit horizontal rules ("---", "===")
 * 3. Multiple WhatsApp "*Name:*" blocks
 * 4. Double blank lines
 */
export function splitBulkText(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  // If text contains explicit delimiter lines (--- or ===)
  if (/\n\s*[-=_]{3,}\s*\n/.test(normalized)) {
    return normalized
      .split(/\n\s*[-=_]{3,}\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // If text has multiple "TO," or "TO:" prefixes
  const toCount = (normalized.match(/\bTO[,:]/gi) || []).length;
  if (toCount > 1) {
    const chunks = normalized.split(/(?=(?:^|\n)\s*TO[,:])/i);
    const result = chunks.map((c) => c.trim()).filter(Boolean);
    if (result.length > 1) {
      return result;
    }
  }

  // If text has multiple "*Name:*" or "Name:" blocks (e.g. multiple WhatsApp messages)
  const nameCount = (normalized.match(/(?:^|\n)\s*\*?(?:Name|Customer)\*?\s*[:=-]/gi) || []).length;
  if (nameCount > 1) {
    const chunks = normalized.split(/(?=(?:^|\n)\s*\*?(?:Name|Customer)\*?\s*[:=-])/i);
    const result = chunks.map((c) => c.trim()).filter(Boolean);
    if (result.length > 1) {
      return result;
    }
  }

  // If text looks like a single labeled order message (e.g. WhatsApp message with only 1 Name),
  // do NOT split by blank lines:
  if (nameCount === 1 || toCount === 1) {
    return [normalized];
  }

  // Fall back to splitting on 2 or more consecutive blank lines
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 0) {
    return paragraphs;
  }

  return [normalized];
}

/**
 * Parses an individual block of pasted text into structured order data.
 */
export function parseAddressBlock(
  rawBlock: string,
  defaults?: ParserDefaults,
  index: number = 0,
): ParsedManualOrder {
  const lines = rawBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let name = '';
  let phone = '';
  let pincode = '';
  let item = defaults?.defaultItem || 'Retratrutide Starter Kit';
  let price = defaults?.defaultPrice ?? 1000;
  let paymentMethod: 'prepay' | 'cod' = defaults?.defaultPaymentMethod || 'prepay';
  let deliveryOption: 'normal' | 'fast' = defaults?.defaultDeliveryOption || 'normal';
  let email = 'orders@retralabs.in';
  let state = '';
  let city = '';

  const addressLines: string[] = [];
  const errors: string[] = [];

  // First pass: extract labeled fields if present (e.g. Name:, Phone:, Item:, Price:, etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isChatBoilerplate(line)) continue;

    // Clean WhatsApp bold formatting (*Field:* Value or *Field*: Value)
    const cleanLine = line
      .replace(/^\*+([^*]+)\*+/, '$1')
      .replace(/^([^*:]+)\*+/, '$1')
      .trim();

    // Item / Items / Product
    const itemMatch = cleanLine.match(/^(?:Item|Items|Product|Products|Goods|SKU|Ordered\s*Items?)\s*[:=-]\s*(.+)$/i);
    if (itemMatch) {
      item = itemMatch[1].replace(/^[*\s]+|[*\s]+$/g, '').trim();
      continue;
    }

    // Price / Total / Amount (support comma thousands separator like ₹8,600)
    const priceMatch = cleanLine.match(/^(?:Price|Total|Amount|Grand\s*Total|₹|Rs\.?)\s*[:=-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
    if (priceMatch) {
      const parsedVal = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedVal) && parsedVal > 0) price = parsedVal;
      continue;
    }

    // Payment Method
    const payMatch = cleanLine.match(/^(?:Payment|Pay\s*Method|Payment\s*Mode)\s*[:=-]\s*(.+)$/i);
    if (payMatch) {
      const pVal = payMatch[1].toUpperCase();
      if (pVal.includes('COD') || pVal.includes('CASH')) paymentMethod = 'cod';
      else paymentMethod = 'prepay';
      continue;
    }

    // Delivery mode
    const delivMatch = cleanLine.match(/^(?:Delivery|Shipping|Mode)\s*[:=-]\s*(.+)$/i);
    if (delivMatch) {
      if (delivMatch[1].toLowerCase().includes('fast') || delivMatch[1].toLowerCase().includes('express')) {
        deliveryOption = 'fast';
      }
      continue;
    }

    // Email
    const emailMatch = cleanLine.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) {
      email = emailMatch[1].toLowerCase();
      continue;
    }

    // Explicit Address line
    const addrMatch = cleanLine.match(/^(?:Address|Addr|Shipping\s*Address|Delivery\s*Address|Full\s*Address)\s*[:=-]\s*(.+)$/i);
    if (addrMatch) {
      const addrVal = addrMatch[1].replace(/^[*\s]+|[*\s]+$/g, '').trim();
      const pinInAddr = addrVal.match(/(?:PIN|PINCODE|ZIP)[\s:]*([1-9][0-9]{5})/i) || addrVal.match(PINCODE_REGEX);
      if (pinInAddr && !pincode) {
        pincode = pinInAddr[1];
      }
      addressLines.push(addrVal);
      continue;
    }

    // Explicit Phone line
    const explicitPhoneMatch = cleanLine.match(/^(?:Phone|Ph|Mob|Mobile|Contact|Tel|Cell)\s*[:=-]?\s*(.+)$/i);
    if (explicitPhoneMatch) {
      const numMatch = explicitPhoneMatch[1].match(PHONE_REGEX);
      if (numMatch) {
        phone = numMatch[1];
        continue;
      }
    }

    // Explicit Name line
    const explicitNameMatch = cleanLine.match(/^(?:Name|Customer|Customer\s*Name)\s*[:=-]\s*(.+)$/i);
    if (explicitNameMatch) {
      name = formatNameTitleCase(explicitNameMatch[1]);
      continue;
    }

    // Explicit PIN line
    const explicitPinMatch = cleanLine.match(/^(?:Pincode|Pin\s*Code|Pin|Zip|Zipcode)\s*[:=-]?\s*([1-9][0-9]{5})/i);
    if (explicitPinMatch) {
      pincode = explicitPinMatch[1];
      continue;
    }

    // Explicit City / State line
    const stateMatch = cleanLine.match(/^(?:State)\s*[:=-]\s*(.+)$/i);
    if (stateMatch) {
      const resolved = canonicalRegion(stateMatch[1]);
      if (resolved) state = resolved;
      continue;
    }

    const cityMatch = cleanLine.match(/^(?:City)\s*[:=-]\s*(.+)$/i);
    if (cityMatch) {
      city = cityMatch[1].trim();
      continue;
    }

    // Check if line is purely "TO," or "TO:"
    if (/^TO\s*[,:]?$/i.test(cleanLine)) {
      continue;
    }

    // Check if line starts with "TO, Name" or "TO: Name"
    const toInlineMatch = cleanLine.match(/^TO\s*[,:]\s*(.+)$/i);
    if (toInlineMatch && !name) {
      name = formatNameTitleCase(toInlineMatch[1]);
      continue;
    }

    // Check for phone number in unstructured line
    if (!phone) {
      const pMatch = cleanLine.match(PHONE_REGEX);
      // Only treat line as phone if phone number dominates or is at end
      if (pMatch && cleanLine.replace(/\D/g, '').length >= 10 && cleanLine.replace(/\D/g, '').length <= 13) {
        phone = pMatch[1];
        continue;
      }
    }

    // Unassigned line: part of address or name
    addressLines.push(cleanLine);
  }

  // Second pass: if Name is still missing, take the first non-address-like line
  if (!name && addressLines.length > 0) {
    const candidate = addressLines[0].replace(/^TO\s*[,:]\s*/i, '').replace(/^[,\s]+|[,\s]+$/g, '').trim();
    if (candidate.length >= 2 && !candidate.match(PINCODE_REGEX) && !candidate.includes(',')) {
      name = formatNameTitleCase(addressLines.shift()!);
    }
  }

  // If Phone is still not found, search through all lines
  if (!phone) {
    const fullText = rawBlock;
    const pMatch = fullText.match(PHONE_REGEX);
    if (pMatch) {
      phone = pMatch[1];
    }
  }

  // Find Pincode in remaining address lines if not already extracted
  if (!pincode) {
    const fullAddr = addressLines.join(' ');
    const pinMatch = fullAddr.match(PINCODE_REGEX);
    if (pinMatch) {
      pincode = pinMatch[1];
    } else {
      const fullText = rawBlock;
      const anyPin = fullText.match(PINCODE_REGEX);
      if (anyPin) pincode = anyPin[1];
    }
  }

  // Extract State by matching known Indian states in address lines
  const combinedAddr = addressLines.join(', ');
  if (!state) {
    for (const regionName of ALL_REGION_NAMES) {
      const regex = new RegExp(`\\b${regionName}\\b`, 'i');
      if (regex.test(combinedAddr) || regex.test(rawBlock)) {
        state = regionName;
        break;
      }
    }
  }

  // Clean address: remove trailing/leading commas, strip redundant TO/Phone lines
  const cleanedAddress = addressLines
    .map((l) => l.replace(/^TO\s*[,:]\s*/i, '').trim())
    .filter((l) => {
      // Filter out lines that are only phone numbers or empty
      const digitsOnly = l.replace(/\D/g, '');
      if (digitsOnly.length >= 10 && digitsOnly === phone) return false;
      return Boolean(l);
    })
    .join(', ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^[,\s]+|[,\s]+$/g, '');

  // Extract City heuristic if city not set
  if (!city && cleanedAddress) {
    const addrLower = cleanedAddress.toLowerCase();
    if (addrLower.includes('new delhi')) city = 'New Delhi';
    else if (addrLower.includes('delhi')) city = 'Delhi';
    else if (addrLower.includes('bengaluru') || addrLower.includes('bangalore')) city = 'Bengaluru';
    else if (addrLower.includes('mumbai') || addrLower.includes('bombay')) city = 'Mumbai';
    else if (addrLower.includes('gurgaon') || addrLower.includes('gurugram')) city = 'Gurugram';
    else if (addrLower.includes('noida')) city = 'Noida';
    else if (addrLower.includes('chennai')) city = 'Chennai';
    else if (addrLower.includes('hyderabad')) city = 'Hyderabad';
    else if (addrLower.includes('kolkata')) city = 'Kolkata';
    else if (addrLower.includes('pune')) city = 'Pune';
    else if (addrLower.includes('ahmedabad')) city = 'Ahmedabad';
    else if (addrLower.includes('jaipur')) city = 'Jaipur';
    else {
      const parts = cleanedAddress.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const secondLast = parts[parts.length - 2];
        if (state && lastPart.toLowerCase().includes(state.toLowerCase())) {
          city = secondLast.replace(/\d+/g, '').trim();
        } else {
          city = lastPart.replace(/\d+/g, '').replace(new RegExp(state, 'i'), '').trim();
        }
      }
      if (!city && parts.length > 0) {
        city = parts[0];
      }
    }
  }

  // Validate fields
  if (!name || name.length < 2) errors.push('Customer Name is missing or too short.');
  if (!phone || phone.length !== 10) errors.push('10-digit Indian phone number is required.');
  if (!pincode || !PINCODE_REGEX.test(pincode)) errors.push('Valid 6-digit PIN code is required.');
  if (!cleanedAddress || cleanedAddress.length < 5) errors.push('Address is required.');

  return {
    id: `manual-${index + 1}-${Date.now()}`,
    rawText: rawBlock,
    name,
    phone,
    address: cleanedAddress || rawBlock,
    city: city || 'City',
    state: state || 'Karnataka',
    pincode: pincode || '',
    item,
    price,
    paymentMethod,
    deliveryOption,
    email,
    isValid: errors.length === 0,
    validationErrors: errors,
  };
}

/**
 * Parses a bulk text string containing one or more orders.
 */
export function parseBulkAddressText(
  text: string,
  defaults?: ParserDefaults,
): ParsedManualOrder[] {
  const blocks = splitBulkText(text);
  return blocks.map((block, idx) => parseAddressBlock(block, defaults, idx));
}
