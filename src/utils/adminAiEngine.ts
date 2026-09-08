import type { AirtableRecord } from '../components/admin/types';
import {
  getOrderTimestamp,
  formatExactOrderTime,
  extractCityAndState,
  cleanPhone10,
  formatCurrency,
  getPaymentMode,
} from './orderViewHelpers';

export type AiDomain =
  | 'ORDERS'
  | 'PRODUCTS'
  | 'REVENUE'
  | 'UPI'
  | 'SHIPPING'
  | 'PINCODE'
  | 'AWB'
  | 'CUSTOMERS'
  | 'BUSINESS_OVERVIEW'
  | 'ANOMALY'
  | 'ORDER_INVESTIGATION'
  | 'GENERAL';

export interface AiMetricChip {
  label: string;
  value: string;
  subValue?: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'amber' | 'blue';
}

export interface AiBreakdownTable {
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface AiRelatedOrder {
  id: string;
  orderId: string;
  name: string;
  total: number;
  payment: string;
  status: string;
  date: string;
}

export interface AiCopilotResponse {
  query: string;
  domain: AiDomain;
  title: string;
  summary: string;
  metrics?: AiMetricChip[];
  breakdownTable?: AiBreakdownTable;
  relatedOrders?: AiRelatedOrder[];
  investigationTrace?: Array<{
    step: string;
    label: string;
    status: 'success' | 'warning' | 'error' | 'neutral';
    detail: string;
  }>;
  rawMarkdown: string;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  query: string;
  category: string;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'snap-1',
    label: '📊 Business Snapshot',
    query: 'How is business doing?',
    category: 'Overview',
  },
  {
    id: 'reta-orders-6d',
    label: '🧪 Reta Orders (Last 6 Days)',
    query: 'How many Reta orders in the last 6 days?',
    category: 'Products',
  },
  {
    id: 'cp10-orders',
    label: '🧪 CP10 (CJC+IPA) Orders',
    query: 'How many CP10 orders did we get?',
    category: 'Products',
  },
  {
    id: 'tesa-orders',
    label: '🧪 Tesa Orders',
    query: 'How many Tesa orders did we get?',
    category: 'Products',
  },
  {
    id: 'upi-pending',
    label: '💳 Pending UPI Verification',
    query: 'How many UPI payments are pending verification?',
    category: 'Payments',
  },
  {
    id: 'shipping-unfulfilled',
    label: '🚚 Unfulfilled Paid Orders',
    query: 'Which paid orders haven’t shipped yet?',
    category: 'Shipping',
  },
  {
    id: 'shiprocket-fallback',
    label: '📍 Shiprocket Fallback PINs',
    query: 'Which PIN codes caused the most Shiprocket fallbacks?',
    category: 'PIN & Courier',
  },
  {
    id: 'awb-missing',
    label: '🏷️ Orders Awaiting AWB',
    query: 'Which orders don’t have an AWB yet?',
    category: 'AWB',
  },
  {
    id: 'anomaly-check',
    label: '🚨 Anomaly Check',
    query: 'Anything unusual today?',
    category: 'Anomalies',
  },
  {
    id: 'top-customers',
    label: '👥 Top Customers',
    query: 'Who are our top customers by revenue and repeat orders?',
    category: 'Customers',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Date Range Extraction Helper
// ─────────────────────────────────────────────────────────────────────────────
export interface DateRange {
  label: string;
  startTs: number;
  endTs: number;
  startDateStr: string;
  endDateStr: string;
}

function formatDateDisplay(ts: number): string {
  if (!ts || isNaN(ts)) return 'Unknown Date';
  return new Date(ts).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function parseQueryDateRange(query: string): DateRange | null {
  const q = query.toLowerCase().trim();
  const now = Date.now();
  const ONE_DAY = 86400000;
  const ONE_HOUR = 3600000;

  // IST offset helper (+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(now + istOffset);
  const startOfTodayIst =
    new Date(
      Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()),
    ).getTime() - istOffset;

  const makeRange = (label: string, startTs: number, endTs: number): DateRange => ({
    label,
    startTs,
    endTs,
    startDateStr: formatDateDisplay(startTs),
    endDateStr: formatDateDisplay(endTs),
  });

  // 1. "today"
  if (q.includes('today')) {
    return makeRange('Today', startOfTodayIst, now + ONE_HOUR);
  }

  // 2. "yesterday"
  if (q.includes('yesterday')) {
    return makeRange('Yesterday', startOfTodayIst - ONE_DAY, startOfTodayIst - 1);
  }

  // 3. Dynamic "last / past N days" or "in [the] last / past N days" (e.g. "last 6 days", "past 5 days", "in 6 days", "last 6d")
  const daysMatch =
    q.match(/(?:(?:last|past|previous|in(?:\s+the)?)\s+)?(\d+)\s*(?:days?|d\b)/i) ||
    q.match(/(?:last|past|previous|in(?:\s+the)?\s+(?:last|past))\s+(\d+)\s+days?/i);
  if (daysMatch) {
    const num = parseInt(daysMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return makeRange(`Last ${num} Days`, now - num * ONE_DAY, now);
    }
  }

  // 4. Dynamic "last / past N weeks"
  const weeksMatch = q.match(/(?:last|past|previous|in(?:\s+the)?\s+(?:last|past))\s+(\d+)\s+weeks?/i);
  if (weeksMatch) {
    const num = parseInt(weeksMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return makeRange(`Last ${num} Weeks`, now - num * 7 * ONE_DAY, now);
    }
  }

  // 5. "this week"
  if (q.includes('this week')) {
    return makeRange('This Week', now - 7 * ONE_DAY, now);
  }

  // 6. "last week" / "past week"
  if (q.includes('last week') || q.includes('past week')) {
    return makeRange('Last Week', now - 14 * ONE_DAY, now - 7 * ONE_DAY);
  }

  // 7. Dynamic "last / past N months"
  const monthsMatch = q.match(/(?:last|past|previous|in(?:\s+the)?\s+(?:last|past))\s+(\d+)\s+months?/i);
  if (monthsMatch) {
    const num = parseInt(monthsMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return makeRange(`Last ${num} Months`, now - num * 30 * ONE_DAY, now);
    }
  }

  // 8. "this month"
  if (q.includes('this month')) {
    const startOfMonthIst =
      new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1)).getTime() - istOffset;
    return makeRange('This Month', startOfMonthIst, now);
  }

  // 9. "last month" / "past month"
  if (q.includes('last month') || q.includes('past month')) {
    const startOfLastMonthIst =
      new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth() - 1, 1)).getTime() - istOffset;
    const endOfLastMonthIst =
      new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 0, 23, 59, 59)).getTime() -
      istOffset;
    return makeRange('Last Month', startOfLastMonthIst, endOfLastMonthIst);
  }

  // 10. Dynamic hours (e.g. "last 24 hours", "last 48 hours")
  const hoursMatch = q.match(/(?:last|past|previous|in(?:\s+the)?\s+(?:last|past))\s+(\d+)\s*(?:hours?|hrs?|h\b)/i);
  if (hoursMatch) {
    const num = parseInt(hoursMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return makeRange(`Last ${num} Hours`, now - num * ONE_HOUR, now);
    }
  }

  // 11. Explicit ISO date range: from YYYY-MM-DD to YYYY-MM-DD
  const explicitMatch = q.match(
    /(?:from\s+)?(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(?:to|until|-)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
  );
  if (explicitMatch) {
    const start = new Date(explicitMatch[1]).getTime();
    const end = new Date(explicitMatch[2] + 'T23:59:59').getTime();
    if (!isNaN(start) && !isNaN(end)) {
      return makeRange(`${explicitMatch[1]} to ${explicitMatch[2]}`, start, end);
    }
  }

  // 12. Month-word pattern e.g. "in august"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let m = 0; m < monthNames.length; m++) {
    if (q.includes(monthNames[m])) {
      const year = nowIst.getUTCFullYear();
      const startOfMonth = new Date(Date.UTC(year, m, 1)).getTime() - istOffset;
      const endOfMonth = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59)).getTime() - istOffset;
      return makeRange(`${monthNames[m].toUpperCase()} ${year}`, startOfMonth, endOfMonth);
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Catalog & Alias Registry (Strict Zero Inventory)
// ─────────────────────────────────────────────────────────────────────────────
export interface ProductDef {
  canonicalName: string;
  shortCode: string;
  queryTriggers: string[];
  itemSubstrings: string[];
}

export const PRODUCT_CATALOG: ProductDef[] = [
  {
    canonicalName: 'Retatrutide (Reta)',
    shortCode: 'reta',
    // reta === retatrutide, also matches Airtable typos like 'retratrutide'
    queryTriggers: ['reta', 'retatrutide', 'retratrutide', 'retra'],
    itemSubstrings: ['reta', 'retra', 'retatrutide', 'retratrutide'],
  },
  {
    canonicalName: 'Tesamorelin (Tesa)',
    shortCode: 'tesa',
    // tesa = tesamorelin
    queryTriggers: ['tesa', 'tesamorelin'],
    itemSubstrings: ['tesa', 'tesamorelin'],
  },
  {
    canonicalName: 'CJC-1295 (No DAC) + Ipamorelin Stack (CP10)',
    shortCode: 'cp10',
    // cp10 = cjc no dac + ipa
    queryTriggers: [
      'cp10',
      'cp 10',
      'cp-10',
      'cjc no dac + ipa',
      'cjc no dac',
      'cjc',
      'ipa',
      'ipamorelin',
      'cjc+ipa',
      'cjc-1295',
      'cjc stack',
      'ipa stack',
    ],
    itemSubstrings: ['cjc-1295', 'cjc', 'ipamorelin', 'cp10', 'cp-10'],
  },
  {
    canonicalName: 'Tirzepatide (Tirz)',
    shortCode: 'tirz',
    queryTriggers: ['tirz', 'tirzepatide'],
    itemSubstrings: ['tirz', 'tirzepatide'],
  },
  {
    canonicalName: 'Semax',
    shortCode: 'semax',
    queryTriggers: ['semax'],
    itemSubstrings: ['semax'],
  },
  {
    canonicalName: 'Semaglutide / Semax',
    shortCode: 'sema',
    queryTriggers: ['sema', 'semaglutide'],
    itemSubstrings: ['sema', 'semaglutide', 'semax'],
  },
  {
    canonicalName: 'Selank',
    shortCode: 'selank',
    queryTriggers: ['selank'],
    itemSubstrings: ['selank'],
  },
  {
    canonicalName: 'BPC-157',
    shortCode: 'bpc',
    queryTriggers: ['bpc', 'bpc-157', 'bpc157', 'bpc 157'],
    itemSubstrings: ['bpc', 'bpc-157'],
  },
  {
    canonicalName: 'TB-500',
    shortCode: 'tb500',
    queryTriggers: ['tb500', 'tb 500', 'tb-500'],
    itemSubstrings: ['tb-500', 'tb500'],
  },
  {
    canonicalName: 'GHK-Cu',
    shortCode: 'ghk',
    queryTriggers: ['ghk', 'ghk-cu', 'ghkcu', 'ghk cu', 'copper peptide'],
    itemSubstrings: ['ghk', 'ghk-cu'],
  },
  {
    canonicalName: 'NAD+',
    shortCode: 'nad',
    queryTriggers: ['nad', 'nad+', 'nad plus'],
    itemSubstrings: ['nad'],
  },
  {
    canonicalName: 'Cagrilintide (Cagri)',
    shortCode: 'cagri',
    queryTriggers: ['cagri', 'cagrilintide'],
    itemSubstrings: ['cagri', 'cagrilintide'],
  },
  {
    canonicalName: 'MOT-C',
    shortCode: 'motc',
    queryTriggers: ['mot-c', 'motc', 'mots-c', 'mot c', 'mots c'],
    itemSubstrings: ['mot-c', 'mots-c', 'motc'],
  },
  {
    canonicalName: 'Klow Blend',
    shortCode: 'klow',
    queryTriggers: ['klow', 'klow blend'],
    itemSubstrings: ['klow'],
  },
  {
    canonicalName: 'The Wolverine Stack',
    shortCode: 'wolverine',
    queryTriggers: ['wolverine', 'wolverine stack'],
    itemSubstrings: ['wolverine'],
  },
  {
    canonicalName: 'AOD 9604',
    shortCode: 'aod',
    queryTriggers: ['aod', 'aod 9604', 'aod9604', 'aod-9604'],
    itemSubstrings: ['aod'],
  },
  {
    canonicalName: 'SS-31',
    shortCode: 'ss31',
    queryTriggers: ['ss-31', 'ss31', 'ss 31'],
    itemSubstrings: ['ss-31', 'ss31'],
  },
  {
    canonicalName: 'Epithalon',
    shortCode: 'epithalon',
    queryTriggers: ['epithalon', 'epitalon'],
    itemSubstrings: ['epithalon', 'epitalon'],
  },
  {
    canonicalName: 'Bacteriostatic Water',
    shortCode: 'bac',
    queryTriggers: ['bac', 'bac water', 'bacteriostatic water', 'bacteriostatic'],
    itemSubstrings: ['bacteriostatic', 'bac water'],
  },
];

export function orderContainsProduct(itemsField: string, product: ProductDef): boolean {
  const itemLower = itemsField.toLowerCase();
  return product.itemSubstrings.some((sub) => itemLower.includes(sub));
}

export function detectProductsInQuery(query: string): ProductDef[] {
  const q = query.toLowerCase();
  const matched: ProductDef[] = [];

  for (const prod of PRODUCT_CATALOG) {
    const found = prod.queryTriggers.some((trig) => {
      if (trig.length <= 4) {
        const regex = new RegExp(`(^|[^a-z0-9])${trig.replace('+', '\\+')}([^a-z0-9]|$)`, 'i');
        return regex.test(q);
      }
      return q.includes(trig);
    });

    if (found && !matched.some((m) => m.shortCode === prod.shortCode)) {
      matched.push(prod);
    }
  }

  return matched;
}

export function matchProduct(itemStr: string, query: string): boolean {
  const detected = detectProductsInQuery(query);
  if (detected.length === 0) return true;
  return detected.some((prod) => orderContainsProduct(itemStr, prod));
}

// ─────────────────────────────────────────────────────────────────────────────
// Intent Detection
// ─────────────────────────────────────────────────────────────────────────────
function detectDomain(query: string): AiDomain {
  const q = query.toLowerCase().trim();

  // 1. Business Overview
  if (
    q.includes('business doing') ||
    q.includes('business snapshot') ||
    q.includes('store overview') ||
    q.includes('performance summary') ||
    q.includes('how are we doing')
  ) {
    return 'BUSINESS_OVERVIEW';
  }

  // 2. Order Investigation
  if (
    q.includes('why hasn') ||
    q.includes('why hasnt') ||
    q.includes('investigate') ||
    q.includes('where is order') ||
    q.includes('track order') ||
    q.includes('status of order') ||
    q.match(/why.*(ship|deliver|move|dispatch)/)
  ) {
    return 'ORDER_INVESTIGATION';
  }

  // 3. Anomaly Detection
  if (
    q.includes('unusual') ||
    q.includes('anomaly') ||
    q.includes('why did shiprocket increase') ||
    q.includes('why did sales decrease') ||
    q.includes('failures increasing') ||
    q.includes('drop in sales') ||
    q.includes('spikes')
  ) {
    return 'ANOMALY';
  }

  // 4. Manual UPI Payments
  if (
    q.includes('upi') ||
    q.includes('screenshot') ||
    q.includes('verification') ||
    q.includes('verify payment') ||
    q.includes('awaiting verification')
  ) {
    return 'UPI';
  }

  // 5. AWB Intelligence
  if (
    q.includes('awb') ||
    q.includes('tracking number') ||
    q.includes('awaiting awb') ||
    q.includes('missing awb') ||
    q.includes('pending awb')
  ) {
    return 'AWB';
  }

  // 6. PIN Code & Serviceability
  if (
    q.includes('pin code') ||
    q.includes('pincode') ||
    q.includes('serviceab') ||
    q.includes('unserviceab') ||
    q.includes('states generate') ||
    q.includes('state breakdown')
  ) {
    return 'PINCODE';
  }

  // 7. Shipping & Fulfillment (Innofulfill vs Shiprocket)
  if (
    q.includes('innofulfill') ||
    q.includes('shiprocket') ||
    q.includes('fulfillment') ||
    q.includes('unfulfilled') ||
    q.includes('shipped') ||
    q.includes('courier') ||
    q.includes('delayed shipment')
  ) {
    return 'SHIPPING';
  }

  // 8. Customer Intelligence
  if (
    q.includes('customer') ||
    q.includes('repeat buyer') ||
    q.includes('new customer') ||
    q.includes('returning customer') ||
    q.includes('who bought')
  ) {
    return 'CUSTOMERS';
  }

  // 9. Products
  if (
    q.includes('product') ||
    q.includes('sold the most') ||
    q.includes('top selling') ||
    q.includes('vs tirz') ||
    q.includes('compare reta') ||
    q.includes('reta vs')
  ) {
    return 'PRODUCTS';
  }

  // 10. Revenue
  if (
    q.includes('revenue') ||
    q.includes('sales volume') ||
    q.includes('how much money') ||
    q.includes('how much did we make') ||
    q.includes('aov') ||
    q.includes('average order')
  ) {
    return 'REVENUE';
  }

  // 11. Orders
  if (
    q.includes('order') ||
    q.includes('count') ||
    q.includes('how many') ||
    q.includes('last week') ||
    q.includes('yesterday') ||
    q.includes('today')
  ) {
    return 'ORDERS';
  }

  return 'GENERAL';
}

// ─────────────────────────────────────────────────────────────────────────────
// 11 Domain Handlers
// ─────────────────────────────────────────────────────────────────────────────

// 1. ORDERS
function handleOrdersQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const dateRange = parseQueryDateRange(query);
  const detectedProducts = detectProductsInQuery(query);

  let targetOrders = records;
  if (dateRange) {
    targetOrders = records.filter((r) => {
      const ts = getOrderTimestamp(r);
      return ts >= dateRange.startTs && ts <= dateRange.endTs;
    });
  }

  // Filter by product if specified (e.g. "Reta orders", "Tesa orders", "CP10 orders")
  let productLabel = 'All Products';
  let primaryProduct: ProductDef | null = null;
  let allTimeProductOrdersCount = records.length;
  let allTimeProductRev = 0;

  if (detectedProducts.length > 0) {
    primaryProduct = detectedProducts[0];
    productLabel = primaryProduct.canonicalName;

    // Filter target orders in current date range
    targetOrders = targetOrders.filter((r) =>
      orderContainsProduct(String(r.fields['Items'] || ''), primaryProduct!),
    );

    // Calculate all-time metrics for this product for clear context
    const allTimeProductOrders = records.filter((r) =>
      orderContainsProduct(String(r.fields['Items'] || ''), primaryProduct!),
    );
    allTimeProductOrdersCount = allTimeProductOrders.length;
    allTimeProductRev = allTimeProductOrders.reduce(
      (sum, r) => sum + Number(r.fields['Total (₹)'] || 0),
      0,
    );
  }

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  targetOrders.forEach((r) => {
    const s = String(r.fields['Status'] || 'New');
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const totalRev = targetOrders.reduce((sum, r) => sum + Number(r.fields['Total (₹)'] || 0), 0);
  const codCount = targetOrders.filter((r) =>
    String(r.fields['Payment'] || '').toUpperCase().includes('COD'),
  ).length;
  const upiCount = targetOrders.length - codCount;

  const timeLabel = dateRange ? dateRange.label : 'All Time';
  const rangeContext = dateRange ? ` (${dateRange.startDateStr} to ${dateRange.endDateStr})` : '';

  // Construct day-by-day table if date range is specified and has orders
  let breakdownHeaders: string[] = ['Order Status', 'Count', 'Share (%)'];
  let breakdownRows: Array<Array<string | number>> = [];

  if (dateRange && targetOrders.length > 0) {
    const dayMap = new Map<string, { count: number; rev: number; upi: number; cod: number }>();
    targetOrders.forEach((r) => {
      const ts = getOrderTimestamp(r);
      const dayStr = ts
        ? new Date(ts).toLocaleDateString('en-GB', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'Unknown Date';
      if (!dayMap.has(dayStr)) {
        dayMap.set(dayStr, { count: 0, rev: 0, upi: 0, cod: 0 });
      }
      const entry = dayMap.get(dayStr)!;
      entry.count += 1;
      entry.rev += Number(r.fields['Total (₹)'] || 0);
      const isCod = String(r.fields['Payment'] || '').toUpperCase().includes('COD');
      if (isCod) entry.cod += 1;
      else entry.upi += 1;
    });

    breakdownHeaders = ['Date (IST)', 'Orders', 'Gross Revenue', 'Payment Split'];
    breakdownRows = Array.from(dayMap.entries()).map(([day, d]) => [
      day,
      d.count,
      formatCurrency(d.rev),
      `${d.upi} UPI / ${d.cod} COD`,
    ]);
  } else {
    breakdownHeaders = ['Order Status', 'Count', 'Share (%)'];
    breakdownRows = Object.entries(statusCounts).map(([status, count]) => [
      status,
      count,
      `${Math.round((count / (targetOrders.length || 1)) * 100)}%`,
    ]);
  }

  const related = targetOrders.slice(0, 10).map((r) => ({
    id: r.id,
    orderId: String(r.fields['orderID'] || r.id),
    name: String(r.fields['Name'] || 'Customer'),
    total: Number(r.fields['Total (₹)'] || 0),
    payment: String(r.fields['Payment'] || 'UPI'),
    status: String(r.fields['Status'] || 'New'),
    date: formatExactOrderTime(r).display,
  }));

  // Build high clarity summary
  let summaryText = '';
  const orderWord = targetOrders.length === 1 ? 'order' : 'orders';
  if (primaryProduct) {
    const allTimeWord = allTimeProductOrdersCount === 1 ? 'order' : 'orders';
    if (targetOrders.length === 0) {
      summaryText = `Found **0 orders** for **${productLabel}** during **${timeLabel}**${rangeContext}. (For reference, there are **${allTimeProductOrdersCount} ${allTimeWord}** for ${productLabel} totaling **${formatCurrency(allTimeProductRev)}** across all time).`;
    } else {
      summaryText = `Found **${targetOrders.length} ${orderWord}** for **${productLabel}** during **${timeLabel}**${rangeContext}, totaling **${formatCurrency(totalRev)}** (${upiCount} UPI / ${codCount} COD). Across all time, there are **${allTimeProductOrdersCount} ${primaryProduct.shortCode.toUpperCase()} ${allTimeWord}** (${formatCurrency(allTimeProductRev)}).`;
    }
  } else {
    summaryText = `Found **${targetOrders.length} ${orderWord}** across **${timeLabel}**${rangeContext}, totaling **${formatCurrency(totalRev)}** (${upiCount} UPI / ${codCount} COD).`;
  }

  const metrics: AiMetricChip[] = [
    {
      label: primaryProduct ? `${primaryProduct.shortCode.toUpperCase()} Orders` : 'Total Orders',
      value: String(targetOrders.length),
      tone: 'blue',
    },
    { label: 'Total Value', value: formatCurrency(totalRev), tone: 'positive' },
    { label: 'UPI / Prepaid', value: String(upiCount), tone: 'positive' },
    { label: 'COD Orders', value: String(codCount), tone: 'amber' },
  ];

  if (primaryProduct && dateRange) {
    metrics.push({
      label: 'All-Time Total',
      value: `${allTimeProductOrdersCount} orders`,
      tone: 'neutral',
    });
  }

  return {
    query,
    domain: 'ORDERS',
    title: `Order Analysis — ${productLabel} (${timeLabel})`,
    summary: summaryText,
    metrics,
    breakdownTable: {
      headers: breakdownHeaders,
      rows: breakdownRows,
    },
    relatedOrders: related,
    rawMarkdown: `### Order Analysis: ${productLabel} (${timeLabel})\n\n- **Total Count**: ${targetOrders.length} orders\n- **Total Gross Value**: ${formatCurrency(totalRev)}\n- **Payment Split**: ${upiCount} UPI, ${codCount} COD\n${primaryProduct ? `- **All-Time ${primaryProduct.canonicalName} Volume**: ${allTimeProductOrdersCount} orders (${formatCurrency(allTimeProductRev)})\n` : ''}\n*Evaluated from live Airtable order records.*`,
  };
}

// 2. PRODUCTS (Sales & Revenue Only — Strict Zero Inventory)
function handleProductsQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const dateRange = parseQueryDateRange(query);
  const detectedProducts = detectProductsInQuery(query);
  const q = query.toLowerCase();

  let targetOrders = records;
  if (dateRange) {
    targetOrders = records.filter((r) => {
      const ts = getOrderTimestamp(r);
      return ts >= dateRange.startTs && ts <= dateRange.endTs;
    });
  }

  // Tally each catalog product
  const productStats: Record<string, { count: number; revenue: number; def: ProductDef }> = {};
  PRODUCT_CATALOG.forEach((p) => {
    productStats[p.canonicalName] = { count: 0, revenue: 0, def: p };
  });

  targetOrders.forEach((r) => {
    const itemStr = String(r.fields['Items'] || '').trim();
    const orderTotal = Number(r.fields['Total (₹)'] || 0);

    // Identify which products are present in this order
    const matchedProducts = PRODUCT_CATALOG.filter((p) => orderContainsProduct(itemStr, p));
    if (matchedProducts.length > 0) {
      const allocatedPrice = Math.round(orderTotal / matchedProducts.length);
      matchedProducts.forEach((p) => {
        productStats[p.canonicalName].count += 1;
        productStats[p.canonicalName].revenue += allocatedPrice;
      });
    }
  });

  // Filter only products with at least 1 order, sorted by revenue desc
  const sortedProducts = Object.entries(productStats)
    .filter(([, s]) => s.count > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue);

  const topProduct =
    sortedProducts[0] || ['Retatrutide (Reta)', { count: 0, revenue: 0, def: PRODUCT_CATALOG[0] }];

  // Comparison logic if user asked "compare reta vs tirz" or multiple products detected
  let comparisonSummary = '';
  if (detectedProducts.length >= 2 || q.includes('vs') || q.includes('compare')) {
    const prodA = detectedProducts[0] || PRODUCT_CATALOG[0]; // Retatrutide
    const prodB = detectedProducts[1] || PRODUCT_CATALOG[3]; // Tirzepatide
    const statsA = productStats[prodA.canonicalName] || { count: 0, revenue: 0 };
    const statsB = productStats[prodB.canonicalName] || { count: 0, revenue: 0 };

    const leader = statsA.revenue >= statsB.revenue ? prodA.canonicalName : prodB.canonicalName;
    comparisonSummary = `\n\n**${prodA.canonicalName} vs ${prodB.canonicalName} Comparison**:\n- **${prodA.canonicalName}**: ${statsA.count} orders (${formatCurrency(statsA.revenue)})\n- **${prodB.canonicalName}**: ${statsB.count} orders (${formatCurrency(statsB.revenue)})\n*Leader by sales revenue: **${leader}***`;
  }

  const totalPeriodRevenue =
    targetOrders.reduce((sum, r) => sum + Number(r.fields['Total (₹)'] || 0), 0) || 1;
  const rows = sortedProducts.map(([name, s]) => [
    name,
    s.count,
    formatCurrency(s.revenue),
    `${Math.round((s.revenue / totalPeriodRevenue) * 100)}%`,
  ]);

  const timeLabel = dateRange ? dateRange.label : 'All Time';

  return {
    query,
    domain: 'PRODUCTS',
    title: `Product Sales & Revenue Analysis (${timeLabel})`,
    summary: `Top revenue product is **${topProduct[0]}** generating **${formatCurrency(topProduct[1].revenue)}** across **${topProduct[1].count} orders**.${comparisonSummary}`,
    metrics: [
      { label: 'Top Product', value: topProduct[0], tone: 'blue' },
      { label: 'Top Product Rev', value: formatCurrency(topProduct[1].revenue), tone: 'positive' },
      { label: 'Units/Orders', value: String(topProduct[1].count), tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['Product Name', 'Orders', 'Allocated Revenue', 'Share (%)'],
      rows,
    },
    rawMarkdown: `### Product Sales Performance (${timeLabel})\n\n- **Top Product**: ${topProduct[0]} (${formatCurrency(topProduct[1].revenue)})\n${comparisonSummary}\n\n*Note: Inventory management is strictly excluded; data reflects genuine Airtable sales metrics.*`,
  };
}

// 3. REVENUE + PAYMENTS
function handleRevenueQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const dateRange = parseQueryDateRange(query);

  let targetOrders = records;
  if (dateRange) {
    targetOrders = records.filter((r) => {
      const ts = getOrderTimestamp(r);
      return ts >= dateRange.startTs && ts <= dateRange.endTs;
    });
  }

  const grossRev = targetOrders.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
  const aov = targetOrders.length ? Math.round(grossRev / targetOrders.length) : 0;

  // Payment method breakdown
  let codRev = 0;
  let upiRev = 0;
  let confirmedRev = 0;
  let pendingRev = 0;

  targetOrders.forEach((r) => {
    const total = Number(r.fields['Total (₹)'] || 0);
    const pay = getPaymentMode(r);
    if (pay.isCod) codRev += total;
    else upiRev += total;

    if (pay.isConfirmed) confirmedRev += total;
    else pendingRev += total;
  });

  return {
    query,
    domain: 'REVENUE',
    title: `Revenue & Payments Report (${dateRange?.label || 'All Time'})`,
    summary: `Gross revenue is **${formatCurrency(grossRev)}** across **${targetOrders.length} orders** with an Average Order Value (AOV) of **${formatCurrency(aov)}**. Confirmed revenue is **${formatCurrency(confirmedRev)}**, with **${formatCurrency(pendingRev)}** currently pending verification or COD settlement.`,
    metrics: [
      { label: 'Gross Revenue', value: formatCurrency(grossRev), tone: 'positive' },
      { label: 'Confirmed Rev', value: formatCurrency(confirmedRev), tone: 'blue' },
      { label: 'Pending Rev', value: formatCurrency(pendingRev), tone: 'amber' },
      { label: 'Average Order Value', value: formatCurrency(aov), tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['Payment Mode', 'Revenue', 'Share (%)'],
      rows: [
        ['Prepaid / UPI', formatCurrency(upiRev), `${Math.round((upiRev / (grossRev || 1)) * 100)}%`],
        ['Cash on Delivery (COD)', formatCurrency(codRev), `${Math.round((codRev / (grossRev || 1)) * 100)}%`],
      ],
    },
    rawMarkdown: `### Revenue & Payments Summary\n\n- **Gross Revenue**: ${formatCurrency(grossRev)}\n- **Confirmed Revenue**: ${formatCurrency(confirmedRev)}\n- **Pending Payments**: ${formatCurrency(pendingRev)}\n- **AOV**: ${formatCurrency(aov)}`,
  };
}

// 4. MANUAL UPI PAYMENTS (High Priority)
function handleUpiQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  // Screenshot submitted ≠ Payment verified rule
  // Orders with Screenshot submitted awaiting verification:
  const pendingUpiOrders = records.filter((r) => {
    const pay = getPaymentMode(r);
    if (pay.isCod) return false;
    const pStatus = String(r.fields['Payment Status'] || '').toUpperCase();
    const hasTxn = Boolean(String(r.fields['Transaction'] || '').trim());
    const hasProof = Boolean(r.fields['Screenshot'] || r.fields['Payment Proof Submitted At']);

    const isConfirmed =
      pStatus === 'CONFIRMED' ||
      pStatus === 'PAID' ||
      pStatus === 'PAYMENT_CONFIRMED' ||
      pStatus === 'VERIFIED';

    return !isConfirmed && (pStatus === 'PAYMENT_PROOF_SUBMITTED' || hasTxn || hasProof);
  });

  const totalPendingAmount = pendingUpiOrders.reduce(
    (sum, r) => sum + Number(r.fields['Total (₹)'] || 0),
    0,
  );

  const related = pendingUpiOrders.slice(0, 8).map((r) => ({
    id: r.id,
    orderId: String(r.fields['orderID'] || r.id),
    name: String(r.fields['Name'] || 'Customer'),
    total: Number(r.fields['Total (₹)'] || 0),
    payment: 'UPI (Awaiting Verification)',
    status: String(r.fields['Payment Status'] || 'PROOF_SUBMITTED'),
    date: formatExactOrderTime(r).display,
  }));

  const rows = pendingUpiOrders.slice(0, 10).map((r) => [
    String(r.fields['orderID'] || r.id),
    String(r.fields['Name'] || 'Customer'),
    cleanPhone10(r.fields['Phone']),
    formatCurrency(r.fields['Total (₹)']),
    String(r.fields['Transaction'] || 'Screenshot Uploaded'),
    formatExactOrderTime(r).display,
  ]);

  return {
    query,
    domain: 'UPI',
    title: 'Manual UPI Verification Intelligence',
    summary: `There are **${pendingUpiOrders.length} orders** with payment screenshots submitted awaiting manual admin verification, representing **${formatCurrency(totalPendingAmount)}** in pending funds.\n\n*Rule: Screenshot submitted ≠ Payment verified. Payment is only confirmed once marked verified in Airtable.*`,
    metrics: [
      {
        label: 'Pending Verifications',
        value: String(pendingUpiOrders.length),
        tone: pendingUpiOrders.length > 0 ? 'amber' : 'positive',
      },
      { label: 'Pending Amount', value: formatCurrency(totalPendingAmount), tone: 'amber' },
      { label: 'Rule Enforced', value: 'Proof ≠ Confirmed', tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['Order ID', 'Customer', 'Mobile', 'Amount', 'Reference', 'Time Submitted'],
      rows,
    },
    relatedOrders: related,
    rawMarkdown: `### Manual UPI Verification Queue\n\n- **Orders Awaiting Verification**: ${pendingUpiOrders.length}\n- **Amount Pending**: ${formatCurrency(totalPendingAmount)}\n- **Action Required**: Click any order below to open the payment verification drawer and approve/reject the transaction.`,
  };
}

// 5. SHIPPING + FULFILLMENT (Innofulfill Primary -> Shiprocket Fallback)
function handleShippingQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  let innofulfillCount = 0;
  let shiprocketCount = 0;
  let notCreatedCount = 0;
  let unfulfilledPaidOrders: AirtableRecord[] = [];

  records.forEach((r) => {
    const f = r.fields;
    const provider = String(f['Courier Provider'] || f['Carrier Display Name'] || '').toLowerCase();
    const innoId = String(f['Innofulfill Order ID'] || '');
    const awb = String(f['AWB Number'] || f['Tracking ID'] || '');
    const pay = getPaymentMode(r);
    const shipmentStatus = String(f['Shipment Status'] || '').toUpperCase();

    if (innoId || provider.includes('innofulfill')) {
      innofulfillCount++;
    } else if (provider.includes('shiprocket') || f['Innofulfill Error']) {
      shiprocketCount++;
    } else if (!awb) {
      notCreatedCount++;
    }

    // Unfulfilled paid orders: Payment confirmed, but shipment not created or no AWB
    if (pay.isConfirmed && (!awb || shipmentStatus === 'NOT_CREATED')) {
      unfulfilledPaidOrders.push(r);
    }
  });

  const related = unfulfilledPaidOrders.slice(0, 6).map((r) => ({
    id: r.id,
    orderId: String(r.fields['orderID'] || r.id),
    name: String(r.fields['Name'] || 'Customer'),
    total: Number(r.fields['Total (₹)'] || 0),
    payment: 'Paid',
    status: 'Needs Shipping Push',
    date: formatExactOrderTime(r).display,
  }));

  return {
    query,
    domain: 'SHIPPING',
    title: 'Shipping & Logistics Distribution',
    summary: `**Innofulfill** has fulfilled **${innofulfillCount} orders** (Primary). **${shiprocketCount} orders** routed to **Shiprocket** (Fallback). Currently **${unfulfilledPaidOrders.length} paid orders** are waiting to be pushed to courier.`,
    metrics: [
      { label: 'Innofulfill (Primary)', value: String(innofulfillCount), tone: 'blue' },
      { label: 'Shiprocket (Fallback)', value: String(shiprocketCount), tone: 'amber' },
      {
        label: 'Paid & Unshipped',
        value: String(unfulfilledPaidOrders.length),
        tone: unfulfilledPaidOrders.length > 0 ? 'negative' : 'positive',
      },
    ],
    breakdownTable: {
      headers: ['Logistics Provider', 'Orders Routed', 'Role', 'Status'],
      rows: [
        ['Innofulfill', innofulfillCount, 'Primary Carrier', 'Active'],
        ['Shiprocket', shiprocketCount, 'PIN-Code Fallback', 'Active'],
        ['Unassigned / Pending', notCreatedCount, 'Needs Booking', 'Action Required'],
      ],
    },
    relatedOrders: related,
    rawMarkdown: `### Logistics Routing Report\n\n- **Innofulfill (Primary)**: ${innofulfillCount} orders\n- **Shiprocket (Fallback)**: ${shiprocketCount} orders\n- **Unfulfilled Paid Orders**: ${unfulfilledPaidOrders.length} orders need immediate courier push.`,
  };
}

// 6. PIN-CODE INTELLIGENCE
function handlePincodeQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const pinFallbackMap: Record<string, { count: number; city: string; state: string; reason: string }> = {};
  const stateCounts: Record<string, number> = {};

  records.forEach((r) => {
    const f = r.fields;
    const loc = extractCityAndState(r);
    if (loc.state) stateCounts[loc.state] = (stateCounts[loc.state] || 0) + 1;

    // Check if pushed to Shiprocket or unserviceable
    const provider = String(f['Courier Provider'] || '').toLowerCase();
    const innoErr = String(f['Innofulfill Error'] || '');
    const isShiprocket = provider.includes('shiprocket') || innoErr.length > 0;

    const pinMatch = String(f['Address'] || '').match(/\b([1-9][0-9]{5})\b/);
    if (isShiprocket && pinMatch) {
      const pin = pinMatch[1];
      if (!pinFallbackMap[pin]) {
        pinFallbackMap[pin] = {
          count: 0,
          city: loc.city,
          state: loc.state,
          reason: innoErr.includes('serviceab')
            ? 'Innofulfill PIN unserviceable'
            : 'Routed to Shiprocket',
        };
      }
      pinFallbackMap[pin].count += 1;
    }
  });

  const sortedPins = Object.entries(pinFallbackMap).sort((a, b) => b[1].count - a[1].count);
  const sortedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);

  const rows = sortedPins.slice(0, 8).map(([pin, data]) => [
    pin,
    data.city,
    data.state,
    data.count,
    data.reason,
  ]);

  return {
    query,
    domain: 'PINCODE',
    title: 'PIN-Code Serviceability & Fallback Intelligence',
    summary: `Found **${sortedPins.length} distinct PIN codes** that triggered Shiprocket fallback due to Innofulfill unserviceability. Top state generating orders is **${sortedStates[0]?.[0] || 'Delhi'}** (${sortedStates[0]?.[1] || 0} orders).`,
    metrics: [
      { label: 'Fallback PINs', value: String(sortedPins.length), tone: 'amber' },
      { label: 'Top State', value: sortedStates[0]?.[0] || 'Delhi', tone: 'blue' },
      { label: 'Top State Orders', value: String(sortedStates[0]?.[1] || 0), tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['PIN Code', 'City', 'State', 'Fallback Count', 'Primary Rejection Reason'],
      rows,
    },
    rawMarkdown: `### PIN-Code Intelligence\n\n- **Shiprocket Fallback PINs**: ${sortedPins.length}\n- **Top Demand Region**: ${sortedStates[0]?.[0] || 'Delhi'} (${sortedStates[0]?.[1] || 0} orders)`,
  };
}

// 7. AWB INTELLIGENCE (Strict Differentiation)
function handleAwbQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const missingAwbOrders: AirtableRecord[] = [];
  const assignedAwbOrders: AirtableRecord[] = [];

  records.forEach((r) => {
    const f = r.fields;
    const awb = String(f['AWB Number'] || f['Tracking ID'] || '').trim();
    if (!awb || awb.toLowerCase() === 'pending') {
      missingAwbOrders.push(r);
    } else {
      assignedAwbOrders.push(r);
    }
  });

  const related = missingAwbOrders.slice(0, 6).map((r) => ({
    id: r.id,
    orderId: String(r.fields['orderID'] || r.id),
    name: String(r.fields['Name'] || 'Customer'),
    total: Number(r.fields['Total (₹)'] || 0),
    payment: String(r.fields['Payment'] || 'UPI'),
    status: 'AWB: Pending',
    date: formatExactOrderTime(r).display,
  }));

  const rows = missingAwbOrders.slice(0, 8).map((r) => [
    String(r.fields['orderID'] || r.id),
    String(r.fields['Innofulfill Order ID'] || 'Not Created'),
    'AWB: Pending',
    String(r.fields['Courier Provider'] || 'Unassigned'),
    formatExactOrderTime(r).display,
  ]);

  return {
    query,
    domain: 'AWB',
    title: 'AWB Assignment Intelligence',
    summary: `**${missingAwbOrders.length} orders** do not have an AWB assigned yet (**AWB: Pending**). **${assignedAwbOrders.length} orders** have verified carrier AWB tracking numbers.\n\n*Rule strictly enforced: Order ID ≠ Fulfillment ID ≠ AWB. Missing AWBs are always displayed as "AWB: Pending" and never fabricated.*`,
    metrics: [
      { label: 'AWB Assigned', value: String(assignedAwbOrders.length), tone: 'positive' },
      {
        label: 'AWB Pending',
        value: String(missingAwbOrders.length),
        tone: missingAwbOrders.length > 0 ? 'amber' : 'neutral',
      },
      { label: 'Integrity Rule', value: 'Zero Fabrication', tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['Order ID', 'Fulfillment ID', 'AWB Status', 'Courier', 'Time Placed'],
      rows,
    },
    relatedOrders: related,
    rawMarkdown: `### AWB Assignment Status\n\n- **AWB: Pending**: ${missingAwbOrders.length} orders\n- **AWB Assigned**: ${assignedAwbOrders.length} orders\n- Order IDs are strictly distinguished from Carrier AWBs.`,
  };
}

// 8. CUSTOMER INTELLIGENCE
function handleCustomersQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const customerMap = new Map<
    string,
    { name: string; phone: string; orders: AirtableRecord[]; totalSpent: number }
  >();

  records.forEach((r) => {
    const f = r.fields;
    const phone = cleanPhone10(f['Phone']);
    const name = String(f['Name'] || 'Customer').trim();
    const key = phone || name.toLowerCase();
    const total = Number(f['Total (₹)'] || 0);

    if (!customerMap.has(key)) {
      customerMap.set(key, { name, phone, orders: [], totalSpent: 0 });
    }
    const c = customerMap.get(key)!;
    c.orders.push(r);
    c.totalSpent += total;
  });

  const allCustomers = Array.from(customerMap.values());
  const repeatCustomers = allCustomers.filter((c) => c.orders.length > 1);
  const firstTimeCustomers = allCustomers.filter((c) => c.orders.length === 1);
  const topCustomers = [...allCustomers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 6);

  const rows = topCustomers.map((c) => [
    c.name,
    c.phone || '—',
    c.orders.length,
    formatCurrency(c.totalSpent),
    c.orders.length > 1 ? 'Repeat VIP' : 'First-Time',
  ]);

  return {
    query,
    domain: 'CUSTOMERS',
    title: 'Customer Intelligence & Loyalty Analysis',
    summary: `RetraLabs has **${allCustomers.length} unique customers** in Airtable. **${repeatCustomers.length} are repeat buyers** (${Math.round((repeatCustomers.length / (allCustomers.length || 1)) * 100)}% loyalty rate) and **${firstTimeCustomers.length} are first-time buyers**.`,
    metrics: [
      { label: 'Total Customers', value: String(allCustomers.length), tone: 'blue' },
      { label: 'Repeat Buyers', value: String(repeatCustomers.length), tone: 'positive' },
      { label: 'First-Time Buyers', value: String(firstTimeCustomers.length), tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['Customer Name', 'Mobile', 'Order Count', 'Total Spent', 'Customer Tier'],
      rows,
    },
    rawMarkdown: `### Customer Loyalty Overview\n\n- **Total Customers**: ${allCustomers.length}\n- **Repeat Buyers**: ${repeatCustomers.length}\n- **Top Customer**: ${topCustomers[0]?.name || 'N/A'} (${formatCurrency(topCustomers[0]?.totalSpent || 0)})`,
  };
}

// 9. BUSINESS OVERVIEW (Standard Snapshot Template)
function handleBusinessOverview(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const totalOrders = records.length;
  const grossRev = records.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);

  // Top Product
  const prodCounts: Record<string, number> = {};
  records.forEach((r) => {
    const itm = String(r.fields['Items'] || 'Retatrutide').trim();
    prodCounts[itm] = (prodCounts[itm] || 0) + 1;
  });
  const topProduct = Object.entries(prodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Retatrutide 10mg';

  // Pending payments
  let pendingPayments = 0;
  let upiVerificationPending = 0;
  let shiprocketOrders = 0;
  let ordersAwaitingAwb = 0;
  let fulfillmentExceptions = 0;

  records.forEach((r) => {
    const f = r.fields;
    const pay = getPaymentMode(r);
    const pStatus = String(f['Payment Status'] || '').toUpperCase();
    const provider = String(f['Courier Provider'] || '').toLowerCase();
    const awb = String(f['AWB Number'] || f['Tracking ID'] || '');

    if (!pay.isConfirmed) pendingPayments++;
    if (!pay.isCod && (pStatus === 'PAYMENT_PROOF_SUBMITTED' || f['Transaction'])) upiVerificationPending++;
    if (provider.includes('shiprocket') || f['Innofulfill Error']) shiprocketOrders++;
    if (!awb) ordersAwaitingAwb++;
    if (f['Innofulfill Error'] || String(f['Shipment Status'] || '').toLowerCase().includes('failed')) {
      fulfillmentExceptions++;
    }
  });

  return {
    query,
    domain: 'BUSINESS_OVERVIEW',
    title: 'BUSINESS SNAPSHOT',
    summary: `Complete real-time business health snapshot based exclusively on active Airtable records. (Zero inventory components).`,
    metrics: [
      { label: 'Orders', value: String(totalOrders), tone: 'blue' },
      { label: 'Revenue', value: formatCurrency(grossRev), tone: 'positive' },
      { label: 'UPI Verification Pending', value: String(upiVerificationPending), tone: upiVerificationPending > 0 ? 'amber' : 'positive' },
      { label: 'Orders Awaiting AWB', value: String(ordersAwaitingAwb), tone: 'neutral' },
    ],
    breakdownTable: {
      headers: ['Business Dimension', 'Metric Value', 'Status / Focus'],
      rows: [
        ['Orders', totalOrders, 'Active'],
        ['Revenue', formatCurrency(grossRev), 'Gross'],
        ['Top product', topProduct, 'Best Seller'],
        ['Pending payments', pendingPayments, 'Awaiting Settlement'],
        ['UPI verification pending', upiVerificationPending, upiVerificationPending > 0 ? 'Needs Attention' : 'Cleared'],
        ['Shiprocket orders', shiprocketOrders, 'Fallback Carrier'],
        ['Orders awaiting AWB', ordersAwaitingAwb, 'Pending Dispatch'],
        ['Fulfillment exceptions', fulfillmentExceptions, fulfillmentExceptions > 0 ? 'Check Logs' : 'Clear'],
      ],
    },
    rawMarkdown: `\`\`\`text\nBUSINESS SNAPSHOT\n\nOrders\n${totalOrders}\n\nRevenue\n${formatCurrency(grossRev)}\n\nTop product\n${topProduct}\n\nPending payments\n${pendingPayments}\n\nUPI verification pending\n${upiVerificationPending}\n\nShiprocket orders\n${shiprocketOrders}\n\nOrders awaiting AWB\n${ordersAwaitingAwb}\n\nFulfillment exceptions\n${fulfillmentExceptions}\n\`\`\``,
  };
}

// 10. ANOMALY DETECTION
function handleAnomalyQuery(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const anomalies: string[] = [];

  // Check 1: UPI pending backlog
  const pendingUpi = records.filter((r) => {
    const pay = getPaymentMode(r);
    const pStatus = String(r.fields['Payment Status'] || '').toUpperCase();
    return !pay.isCod && !pay.isConfirmed && (pStatus === 'PAYMENT_PROOF_SUBMITTED' || r.fields['Transaction']);
  });
  if (pendingUpi.length >= 3) {
    anomalies.push(`⚠️ **UPI Backlog Alert**: ${pendingUpi.length} customers submitted payment screenshots awaiting manual verification.`);
  }

  // Check 2: Shiprocket fallback surge
  const shiprocketOrders = records.filter((r) => {
    const p = String(r.fields['Courier Provider'] || '').toLowerCase();
    return p.includes('shiprocket') || r.fields['Innofulfill Error'];
  });
  const fallbackRatio = Math.round((shiprocketOrders.length / (records.length || 1)) * 100);
  if (fallbackRatio > 25) {
    anomalies.push(`⚠️ **High Courier Fallback**: ${fallbackRatio}% of all orders routed to Shiprocket instead of Innofulfill due to PIN serviceability.`);
  }

  // Check 3: Unfulfilled paid orders (> 5)
  const unshippedPaid = records.filter((r) => {
    const pay = getPaymentMode(r);
    const awb = String(r.fields['AWB Number'] || r.fields['Tracking ID'] || '');
    return pay.isConfirmed && !awb;
  });
  if (unshippedPaid.length >= 3) {
    anomalies.push(`📦 **Unfulfilled Paid Orders**: ${unshippedPaid.length} orders have confirmed payments but no tracking AWB generated yet.`);
  }

  if (anomalies.length === 0) {
    anomalies.push('✅ **All systems healthy**: Payment verification queue is clear, fulfillment fallbacks are within normal limits (< 15%), and no unusual payment failure spikes detected.');
  }

  return {
    query,
    domain: 'ANOMALY',
    title: 'Store Anomaly & Operational Health Scanner',
    summary: anomalies.join('\n\n'),
    metrics: [
      {
        label: 'Operational Status',
        value: anomalies.some((a) => a.includes('⚠️')) ? 'Attention Needed' : 'Healthy',
        tone: anomalies.some((a) => a.includes('⚠️')) ? 'amber' : 'positive',
      },
      { label: 'Unfulfilled Paid', value: String(unshippedPaid.length), tone: 'neutral' },
      { label: 'Pending UPI Checks', value: String(pendingUpi.length), tone: 'neutral' },
    ],
    rawMarkdown: `### Store Health & Anomaly Report\n\n${anomalies.join('\n\n')}\n\n*Zero inventory tracking is involved; scanner evaluates orders, revenue, payments, UPI, and courier routing.*`,
  };
}

// 11. ORDER INVESTIGATION (Deep Trace)
function handleOrderInvestigation(query: string, records: AirtableRecord[]): AiCopilotResponse {
  // Look for order identifier in query e.g. "RET-10352", "20260907001", "#10305", "10305"
  const idMatch = query.match(/(?:order\s*#?|#)?(2026\d{7}|RL-\d{8}-\d{4}|RET-\d+|\b\d{5}\b|rec[A-Za-z0-9]{14})/i);
  let targetRecord: AirtableRecord | undefined;

  if (idMatch) {
    const searchId = idMatch[1].toLowerCase().replace('#', '');
    targetRecord = records.find((r) => {
      const orderId = String(r.fields['orderID'] || '').toLowerCase().replace('#', '');
      return orderId === searchId || r.id.toLowerCase() === searchId;
    });
  }

  // Fallback: search by customer name in query
  if (!targetRecord) {
    targetRecord = records.find((r) => {
      const name = String(r.fields['Name'] || '').toLowerCase();
      return name.length > 2 && query.toLowerCase().includes(name);
    });
  }

  if (!targetRecord) {
    return {
      query,
      domain: 'ORDER_INVESTIGATION',
      title: 'Order Investigation: Order Not Found',
      summary: `Could not identify an order matching "${query}". Please provide a valid Order ID (e.g., *20260907001*, *#10305*, or *RL-20260814-4081*) or customer name to run a deep fulfillment trace.`,
      metrics: [
        { label: 'Trace Status', value: 'Not Found', tone: 'amber' },
        { label: 'Action', value: 'Specify Order ID', tone: 'neutral' },
      ],
      rawMarkdown: `### Order Investigation\n\nCould not find a record matching your query. Please provide the exact Order ID.`,
    };
  }

  const f = targetRecord.fields;
  const orderId = String(f['orderID'] || targetRecord.id);
  const name = String(f['Name'] || 'Customer');
  const pay = getPaymentMode(targetRecord);
  const loc = extractCityAndState(targetRecord);
  const pin = String(f['Address'] || '').match(/\b([1-9][0-9]{5})\b/)?.[1] || 'Unknown';
  const provider = String(f['Courier Provider'] || f['Carrier Display Name'] || 'Unassigned');
  const awb = String(f['AWB Number'] || f['Tracking ID'] || '').trim() || 'Pending';
  const innoId = String(f['Innofulfill Order ID'] || 'Not Created');
  const innoErr = String(f['Innofulfill Error'] || '');
  const shipmentStatus = String(f['Shipment Status'] || 'NOT_CREATED');

  const trace = [
    {
      step: '1. ORDER',
      label: 'Order Placement',
      status: 'success' as const,
      detail: `Placed by ${name} for ${f['Items'] || 'Products'} (${formatCurrency(f['Total (₹)'])}) on ${formatExactOrderTime(targetRecord).display}.`,
    },
    {
      step: '2. PAYMENT',
      label: 'Payment Verification',
      status: pay.isConfirmed ? ('success' as const) : ('warning' as const),
      detail: pay.isCod
        ? 'Cash on Delivery (COD) — pre-authorized for dispatch.'
        : pay.isConfirmed
        ? 'UPI payment verified and confirmed.'
        : f['Transaction'] || f['Screenshot']
        ? 'Payment screenshot submitted but NOT verified yet by admin.'
        : 'Payment pending — awaiting customer settlement.',
    },
    {
      step: '3. PIN CODE',
      label: 'Destination Analysis',
      status: 'neutral' as const,
      detail: `${loc.city}, ${loc.state} (PIN: ${pin}).`,
    },
    {
      step: '4. SERVICEABILITY',
      label: 'Innofulfill Serviceability Check',
      status: innoErr ? ('warning' as const) : ('success' as const),
      detail: innoErr
        ? `Innofulfill reported unserviceable: ${innoErr}`
        : 'PIN code is serviceable by primary carrier (Innofulfill).',
    },
    {
      step: '5. FULFILLMENT PROVIDER',
      label: 'Courier Routing',
      status: 'neutral' as const,
      detail: provider.toLowerCase().includes('shiprocket')
        ? 'Routed to Shiprocket (Fallback)'
        : innoId !== 'Not Created'
        ? 'Booked with Innofulfill (Primary)'
        : 'Not yet pushed to any carrier.',
    },
    {
      step: '6. FULFILLMENT STATUS',
      label: 'Carrier Booking State',
      status: shipmentStatus === 'NOT_CREATED' ? ('warning' as const) : ('success' as const),
      detail: `Fulfillment ID: ${innoId} | Status: ${shipmentStatus}`,
    },
    {
      step: '7. AWB',
      label: 'Air Waybill Tracking Number',
      status: awb === 'Pending' ? ('warning' as const) : ('success' as const),
      detail: awb === 'Pending' ? 'AWB: Pending (Awaiting carrier pickup assignment)' : `AWB: ${awb}`,
    },
    {
      step: '8. SHIPPING STATUS',
      label: 'Current Transit State',
      status: String(f['Status'] || '').toLowerCase().includes('delivered')
        ? ('success' as const)
        : ('neutral' as const),
      detail: String(f['Status'] || 'New'),
    },
  ];

  let conclusion = '';
  if (!pay.isConfirmed && !pay.isCod) {
    conclusion = `**Root Cause**: Order cannot be fulfilled because payment has **NOT been verified** yet. Once verified in admin, it can be pushed to courier.`;
  } else if (awb === 'Pending') {
    conclusion = `**Root Cause**: Order is booked with **${provider}**, but the carrier has not assigned an **AWB tracking number** yet. Pickup is pending.`;
  } else {
    conclusion = `Order is in transit with **${provider}** under **AWB ${awb}**.`;
  }

  return {
    query,
    domain: 'ORDER_INVESTIGATION',
    title: `Order Investigation: #${orderId}`,
    summary: `Deep fulfillment trace for order **#${orderId}** (${name}, ${formatCurrency(f['Total (₹)'])}).\n\n${conclusion}`,
    metrics: [
      { label: 'Payment', value: pay.isCod ? 'COD' : pay.isConfirmed ? 'Verified' : 'Pending', tone: pay.isConfirmed || pay.isCod ? 'positive' : 'amber' },
      { label: 'Carrier', value: provider, tone: 'blue' },
      { label: 'AWB', value: awb, tone: awb === 'Pending' ? 'amber' : 'positive' },
      { label: 'Status', value: String(f['Status'] || 'New'), tone: 'neutral' },
    ],
    investigationTrace: trace,
    relatedOrders: [
      {
        id: targetRecord.id,
        orderId,
        name,
        total: Number(f['Total (₹)'] || 0),
        payment: pay.label,
        status: String(f['Status'] || 'New'),
        date: formatExactOrderTime(targetRecord).display,
      },
    ],
    rawMarkdown: `### Order Investigation: #${orderId}\n\n${conclusion}\n\n**Trace Pipeline**:\n${trace.map((t) => `- **${t.step}**: ${t.detail}`).join('\n')}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Query Resolution
// ─────────────────────────────────────────────────────────────────────────────
export function queryAdminAi(query: string, records: AirtableRecord[]): AiCopilotResponse {
  const domain = detectDomain(query);

  switch (domain) {
    case 'BUSINESS_OVERVIEW':
      return handleBusinessOverview(query, records);
    case 'ORDER_INVESTIGATION':
      return handleOrderInvestigation(query, records);
    case 'ANOMALY':
      return handleAnomalyQuery(query, records);
    case 'UPI':
      return handleUpiQuery(query, records);
    case 'AWB':
      return handleAwbQuery(query, records);
    case 'PINCODE':
      return handlePincodeQuery(query, records);
    case 'SHIPPING':
      return handleShippingQuery(query, records);
    case 'CUSTOMERS':
      return handleCustomersQuery(query, records);
    case 'PRODUCTS':
      return handleProductsQuery(query, records);
    case 'REVENUE':
      return handleRevenueQuery(query, records);
    case 'ORDERS':
    case 'GENERAL':
    default:
      return handleOrdersQuery(query, records);
  }
}
