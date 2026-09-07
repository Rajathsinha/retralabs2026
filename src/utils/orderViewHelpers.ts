import type { AirtableRecord } from '../components/admin/types';
import { ALL_REGION_NAMES } from '../data/indianStates';

export type AdminSortOption =
  | 'time_desc'
  | 'time_asc'
  | 'price_desc'
  | 'price_asc'
  | 'name_asc'
  | 'name_desc'
  | 'city_asc'
  | 'order_id_desc';

export const SORT_OPTIONS: { id: AdminSortOption; label: string; icon?: string }[] = [
  { id: 'time_desc', label: 'Time (Latest First)' },
  { id: 'time_asc', label: 'Time (Oldest First)' },
  { id: 'price_desc', label: 'Total: High to Low' },
  { id: 'price_asc', label: 'Total: Low to High' },
  { id: 'name_asc', label: 'Customer: A → Z' },
  { id: 'name_desc', label: 'Customer: Z → A' },
  { id: 'city_asc', label: 'City: A → Z' },
  { id: 'order_id_desc', label: 'Order ID: Newest' },
];

const TOP_CITIES = [
  'New Delhi', 'Delhi', 'Bengaluru', 'Bangalore', 'Mumbai', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Gurgaon', 'Gurugram', 'Noida', 'Greater Noida', 'Kanpur', 'Lucknow',
  'Chandigarh', 'Surat', 'Indore', 'Bhopal', 'Patna', 'Nagpur', 'Thane', 'Visakhapatnam',
  'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Varanasi', 'Srinagar', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Prayagraj', 'Howrah',
  'Ranchi', 'Gwalior', 'Jabalpur', 'Coimbatore', 'Vijayawada', 'Jodhpur', 'Madurai',
  'Raipur', 'Kota', 'Guwahati', 'Bulandshahr', 'Alirajpur', 'Manesar', 'Dehradun', 'Panipat',
  'Udaipur', 'Kochi', 'Trivandrum', 'Mysuru', 'Mangaluru', 'Shimla', 'Jammu', 'Bhubaneswar'
];

/**
 * Extract exact epoch milliseconds when order was placed.
 * Priority: Time > createdTime > Created At > Payment Session Started At > Created
 */
export function getOrderTimestamp(record: AirtableRecord): number {
  const f = record.fields;
  const candidate =
    f['Time'] ||
    record.createdTime ||
    f['Created At'] ||
    f['Payment Session Started At'] ||
    f['Created'];
  if (!candidate || (typeof candidate !== 'string' && typeof candidate !== 'number')) return 0;
  const t = new Date(candidate).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Formats order placement time cleanly in Indian Standard Time (IST).
 */
export function formatExactOrderTime(record: AirtableRecord): {
  display: string;
  relative: string;
  fullIst: string;
  isToday: boolean;
  isYesterday: boolean;
} {
  const ts = getOrderTimestamp(record);
  if (!ts) {
    return {
      display: '—',
      relative: '',
      fullIst: 'Unknown time',
      isToday: false,
      isYesterday: false,
    };
  }

  const now = Date.now();
  const diffMs = now - ts;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative = '';
  if (diffMinutes < 1) relative = 'Just now';
  else if (diffMinutes < 60) relative = `${diffMinutes}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays === 1) relative = '1 day ago';
  else if (diffDays < 30) relative = `${diffDays}d ago`;
  else relative = `${Math.floor(diffDays / 30)}mo ago`;

  const orderDate = new Date(ts);
  const nowDate = new Date();

  // Compare calendar days in IST
  const toIstDateString = (d: Date) =>
    d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const orderDateIst = toIstDateString(orderDate);
  const nowDateIst = toIstDateString(nowDate);

  const yesterdayDate = new Date(now - 86400000);
  const yesterdayDateIst = toIstDateString(yesterdayDate);

  const isToday = orderDateIst === nowDateIst;
  const isYesterday = orderDateIst === yesterdayDateIst;

  const timeStr = orderDate.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let display = '';
  if (isToday) {
    display = `Today, ${timeStr}`;
  } else if (isYesterday) {
    display = `Yesterday, ${timeStr}`;
  } else {
    const dayMonth = orderDate.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    });
    display = `${dayMonth}, ${timeStr}`;
  }

  const fullIst = orderDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' IST';

  return { display, relative, fullIst, isToday, isYesterday };
}

/**
 * Extracts clean 10-digit Indian phone number.
 */
export function cleanPhone10(rawPhone?: unknown): string {
  if (!rawPhone) return '';
  const str = String(rawPhone).replace(/\D/g, '');
  if (str.length === 10) return str;
  if (str.length === 12 && str.startsWith('91')) return str.slice(2);
  if (str.length === 11 && str.startsWith('0')) return str.slice(1);
  if (str.length > 10) return str.slice(-10);
  return str;
}

/**
 * Extracts City & State accurately from record fields or address.
 */
export function extractCityAndState(record: AirtableRecord): { city: string; state: string } {
  const f = record.fields;
  const explicitCity = String(f['City'] || '').trim();
  const explicitState = String(f['State'] || '').trim();
  const address = String(f['Address'] || '').trim();

  let state = explicitState;
  let city = explicitCity;

  // 1. Detect State from address if missing
  if (!state && address) {
    for (const region of ALL_REGION_NAMES) {
      const reg = new RegExp(`\\b${region}\\b`, 'i');
      if (reg.test(address)) {
        state = region;
        break;
      }
    }
  }

  // 2. Detect City from known top cities if missing
  if (!city && address) {
    const lower = address.toLowerCase();
    for (const c of TOP_CITIES) {
      const regex = new RegExp(`\\b${c.toLowerCase()}\\b`, 'i');
      if (regex.test(lower)) {
        city = c === 'Bangalore' ? 'Bengaluru' : c === 'Gurugram' ? 'Gurgaon' : c;
        break;
      }
    }
  }

  // 3. Heuristic fallback parsing if still missing
  if (!city && address) {
    // Strip PIN code
    const cleaned = address.replace(/PIN[:\s]*\d{6}/i, '').replace(/\b\d{6}\b/, '').trim();
    const parts = cleaned.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);

    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i];
      // Skip if it's the state name or country or too long
      if (
        candidate.length >= 2 &&
        candidate.length <= 25 &&
        !/^\d+$/.test(candidate) &&
        (!state || !candidate.toLowerCase().includes(state.toLowerCase())) &&
        !candidate.toLowerCase().includes('india')
      ) {
        city = candidate;
        break;
      }
    }
  }

  return {
    city: city || '—',
    state: state || '',
  };
}

/**
 * Formats total amount into Indian Rupee format e.g. ₹8,600
 */
export function formatCurrency(amount: unknown): string {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Returns payment mode: COD vs UPI / Prepaid
 */
export function getPaymentMode(record: AirtableRecord): {
  isCod: boolean;
  label: 'COD' | 'UPI';
  subLabel: string;
  isConfirmed: boolean;
} {
  const f = record.fields;
  const paymentStr = String(f['Payment'] || '').toUpperCase();
  const paymentStatus = String(f['Payment Status'] || '').toUpperCase();
  const isCod = paymentStr.includes('COD');

  const isConfirmed =
    paymentStatus === 'PAYMENT_CONFIRMED' ||
    paymentStatus === 'CONFIRMED' ||
    paymentStatus === 'PAID' ||
    paymentStatus === 'VERIFIED';

  return {
    isCod,
    label: isCod ? 'COD' : 'UPI',
    subLabel: isCod ? 'Cash on Delivery' : 'Prepaid (UPI / Netbanking)',
    isConfirmed,
  };
}

/**
 * Comprehensive order sorter.
 */
export function sortOrders(
  records: AirtableRecord[],
  sortOption: AdminSortOption,
): AirtableRecord[] {
  const arr = [...records];
  return arr.sort((a, b) => {
    switch (sortOption) {
      case 'time_desc': {
        const diff = getOrderTimestamp(b) - getOrderTimestamp(a);
        if (diff !== 0) return diff;
        // Secondary fallback: orderID descending
        return String(b.fields['orderID'] || '').localeCompare(String(a.fields['orderID'] || ''));
      }
      case 'time_asc': {
        const diff = getOrderTimestamp(a) - getOrderTimestamp(b);
        if (diff !== 0) return diff;
        return String(a.fields['orderID'] || '').localeCompare(String(b.fields['orderID'] || ''));
      }
      case 'price_desc': {
        const pa = Number(a.fields['Total (₹)'] || 0);
        const pb = Number(b.fields['Total (₹)'] || 0);
        return pb - pa;
      }
      case 'price_asc': {
        const pa = Number(a.fields['Total (₹)'] || 0);
        const pb = Number(b.fields['Total (₹)'] || 0);
        return pa - pb;
      }
      case 'name_asc': {
        const na = String(a.fields['Name'] || '').trim();
        const nb = String(b.fields['Name'] || '').trim();
        return na.localeCompare(nb);
      }
      case 'name_desc': {
        const na = String(a.fields['Name'] || '').trim();
        const nb = String(b.fields['Name'] || '').trim();
        return nb.localeCompare(na);
      }
      case 'city_asc': {
        const ca = extractCityAndState(a).city;
        const cb = extractCityAndState(b).city;
        return ca.localeCompare(cb);
      }
      case 'order_id_desc': {
        const ida = String(a.fields['orderID'] || a.id);
        const idb = String(b.fields['orderID'] || b.id);
        return idb.localeCompare(ida, undefined, { numeric: true });
      }
      default:
        return 0;
    }
  });
}
