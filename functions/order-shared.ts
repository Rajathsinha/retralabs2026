import { generateAwbAssignedEmail } from './email-template';

export const PAYMENT_SESSION_SECONDS = 300;

export const PAYMENT_STATUS = {
  PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'PAYMENT_CONFIRMED',
  PROOF_SUBMITTED: 'PAYMENT_PROOF_SUBMITTED',
  EXPIRED: 'PAYMENT_EXPIRED',
  FAILED: 'PAYMENT_FAILED',
} as const;

export const SHIPMENT_STATUS = {
  NOT_CREATED: 'NOT_CREATED',
  PROCESSING: 'INNOFULFILL_PROCESSING',
  CREATED: 'INNOFULFILL_CREATED',
  AWB_PENDING: 'AWB_PENDING',
  AWB_ASSIGNED: 'AWB_ASSIGNED',
  FAILED: 'FAILED',
} as const;

export interface OrderFields {
  orderID?: string;
  Name: string;
  Email: string;
  Phone: string;
  Address: string;
  Items: string;
  'Total (₹)': number;
  Payment: string;
  Delivery: string;
  Referral: string;
  Status: string;
  Created: string;
  Transaction?: string;
  'Payment Status'?: string;
  'Payment Session Started At'?: string;
  'Payment Session Expires At'?: string;
  'Payment Proof Submitted At'?: string;
  'Innofulfill Order ID'?: string;
  'Innofulfill Internal ID'?: string;
  'AWB Number'?: string;
  'Tracking ID'?: string;
  'Tracking URL'?: string;
  'Carrier Name'?: string;
  'Carrier Display Name'?: string;
  Courier?: string;
  'Courier Provider'?: string;
  'Shipment Status'?: string;
  'Shipment Created At'?: string;
  'Innofulfill Error'?: string;
  'AWB Email Sent'?: string;
}

export interface CartLineItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function getAirtableConfig() {
  const token = (process.env.VITE_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN || '').trim();
  const baseId = (process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID || '').trim();
  const table = (process.env.VITE_AIRTABLE_TABLE || process.env.AIRTABLE_TABLE || 'Orders').trim();
  return { token, baseId, table };
}

/** Legacy locally generated fake AWB pattern — never treat as a real courier AWB. */
export function isFakeAwb(awb: string | null | undefined): boolean {
  if (!awb) return false;
  const value = awb.trim();
  return /^RETRA-\d{8}-\d{4}$/i.test(value);
}

export function sanitizeAwb(awb: string | null | undefined): string | undefined {
  if (!awb) return undefined;
  const value = awb.trim();
  if (!value || isFakeAwb(value)) return undefined;
  return value;
}

/**
 * Whether a stored order record represents a paid order.
 *
 * The Orders table has no "Payment Status" column, and patchAirtableRecord
 * drops writes to fields that don't exist — so every write of it has gone
 * nowhere and every read came back empty, which made `confirmed` permanently
 * false and left paying customers stuck on "we haven't had confirmation".
 *
 * Payment state really lives in `Status`. Fulfilment later overwrites that
 * with "Created in <carrier>", which only ever happens after payment is
 * confirmed, so those count as paid too.
 */
export function recordIsPaid(fields: Record<string, unknown>): boolean {
  const paymentStatus = String(fields['Payment Status'] ?? '').toUpperCase();
  if (paymentStatus === PAYMENT_STATUS.CONFIRMED) return true;
  if (paymentStatus === PAYMENT_STATUS.FAILED) return false;

  const status = String(fields.Status ?? '').toUpperCase();
  if (status === 'PAYMENT_FAILED') return false;
  return status === 'PAYMENT_CONFIRMED' || status.startsWith('CREATED IN');
}

/** True only when the record is explicitly marked failed. */
export function recordIsFailed(fields: Record<string, unknown>): boolean {
  const paymentStatus = String(fields['Payment Status'] ?? '').toUpperCase();
  if (paymentStatus === PAYMENT_STATUS.FAILED) return true;
  return String(fields.Status ?? '').toUpperCase() === 'PAYMENT_FAILED';
}

export function isPaymentConfirmed(paymentStatus: string | null | undefined, paymentMethod?: string): boolean {
  const status = (paymentStatus || '').toUpperCase();
  if (status === PAYMENT_STATUS.CONFIRMED) return true;
  if ((paymentMethod || '').toUpperCase().includes('COD')) return true;
  return false;
}

export function paymentSessionExpiresAt(startedAtIso: string): number {
  return new Date(startedAtIso).getTime() + PAYMENT_SESSION_SECONDS * 1000;
}

/**
 * Format today's date in Indian Standard Time (Asia/Kolkata) as YYYYMMDD.
 */
export function getIndiaDatePrefix(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replace(/-/g, ''); // e.g. "20260907"
}

/**
 * Generate internal document number: 20260907001
 * Uses today's date in India (YYYYMMDD) + 3-digit order count for that day (001, 002, etc.).
 */
export async function generateOrderId(
  baseId: string,
  table: string,
  token: string,
  offset: number = 0,
): Promise<string> {
  const datePrefix = getIndiaDatePrefix();
  let maxNum = 0;

  try {
    const filter = encodeURIComponent(`FIND("${datePrefix}", {orderID})`);
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${filter}&pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const json: { records?: Array<{ fields?: { orderID?: string } }> } = await res.json();
      const regex = new RegExp(`^${datePrefix}(\\d{3,})$`);
      for (const rec of json?.records || []) {
        const id = String(rec?.fields?.orderID ?? '').trim();
        const match = id.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!Number.isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
  } catch (err) {
    console.error('[Order ID] Error determining sequence:', err);
  }

  const nextNum = maxNum + 1 + offset;
  return `${datePrefix}${String(nextNum).padStart(3, '0')}`;
}

export async function patchAirtableRecord(
  baseId: string,
  table: string,
  token: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  /*
   * Airtable rejects a write naming a column the table doesn't have, and only
   * ever names one such column per response — so dropping them costs one round
   * trip each. The cap used to be 5, which is fewer than the number of columns
   * some writes carry that this base has never had (the shipment patch alone
   * carries eight). Those writes ran out of attempts and saved nothing at all,
   * silently: booked shipments never got their AWB or carrier stored, so the
   * admin table and order tracking both stayed empty.
   *
   * The cap is now above any payload we send, and dropped columns get logged
   * rather than vanishing.
   */
  const dropped: string[] = [];

  for (let attempt = 0; attempt < 20; attempt++) {
    if (Object.keys(fields).length === 0) break;

    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, typecast: true }),
      },
    );
    if (res.ok) {
      if (dropped.length) {
        console.warn(`[Airtable] Saved ${recordId} without missing columns: ${dropped.join(', ')}`);
      }
      return true;
    }
    const json: { error?: string | { message?: string } } = await res.json().catch(() => ({}));
    const detail = typeof json?.error === 'string' ? json.error : json?.error?.message || `HTTP ${res.status}`;
    const unknownMatch = detail.match(/Unknown field name: ["']?([^"')]+)["']?/i);
    if (unknownMatch) {
      dropped.push(unknownMatch[1]);
      delete fields[unknownMatch[1]];
      continue;
    }
    console.error('[Airtable] PATCH failed:', detail);
    return false;
  }
  console.error(`[Airtable] Gave up patching ${recordId}; dropped: ${dropped.join(', ')}`);
  return false;
}

export function cleanPhone(phone: string): string {
  // Keep only the last 10 digits — this alone strips any country-code prefix
  // (+91, 0091, a leading 0, any length), so a separate "strip leading 91"
  // step must never run first: a real 10-digit Indian mobile number can
  // legitimately start with 91 (e.g. 9105497005), and stripping it there
  // corrupted the number into "00" + the remaining 8 digits.
  return (phone || '').replace(/\D/g, '').slice(-10).padStart(10, '0');
}

export function getInnofulfillBase(): string {
  const envVal = (process.env.INNOFULFILL_ENV || process.env.INNOFULFILL_SANDBOX || '').trim();
  return ['sandbox', 'test', 'true'].includes(envVal.toLowerCase())
    ? 'https://sandbox.apis.innofulfill.com'
    : 'https://apis.innofulfill.com';
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function innofulfillHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tenantId = process.env.INNOFULFILL_TENANT_ID;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function getInnofulfillToken(): Promise<string | null> {
  const username = process.env.INNOFULFILL_USERNAME;
  const password = process.env.INNOFULFILL_PASSWORD;
  if (!username || !password) {
    console.log('[Innofulfill] Skipped: credentials not set');
    return null;
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const innoBase = getInnofulfillBase();
  const res = await fetch(`${innoBase}/auth/login`, {
    method: 'POST',
    headers: innofulfillHeaders(),
    body: JSON.stringify({ username, password, signinType: 'EMAIL' }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Innofulfill auth failed (HTTP ${res.status}): ${detail}`);
  }
  const json: { id_token?: string } = await res.json();
  const token = json?.id_token;
  if (!token) throw new Error('Innofulfill auth: no id_token in response');
  cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

export function parseInnofulfillShipment(data: Record<string, unknown> | null | undefined) {
  const shipment = (data?.shipments as Array<Record<string, unknown>> | undefined)?.[0] || data || {};
  const rawAwb =
    shipment?.awbNumber ||
    data?.awbNumber ||
    shipment?.trackingNumber ||
    shipment?.awb;
  const awbNumber = sanitizeAwb(typeof rawAwb === 'string' ? rawAwb : rawAwb != null ? String(rawAwb) : undefined);
  const carrierName =
    (typeof shipment?.carrierName === 'string' && shipment.carrierName) ||
    (typeof data?.carrierName === 'string' && data.carrierName) ||
    undefined;
  const carrierDisplayName =
    (typeof shipment?.carrierDisplayName === 'string' && shipment.carrierDisplayName) ||
    (typeof data?.carrierDisplayName === 'string' && data.carrierDisplayName) ||
    carrierName ||
    'Innofulfill';
  const trackingUrl =
    (typeof shipment?.trackingUrl === 'string' && shipment.trackingUrl) ||
    (typeof data?.trackingUrl === 'string' && data.trackingUrl) ||
    undefined;
  const shipmentStatus = awbNumber ? SHIPMENT_STATUS.AWB_ASSIGNED : SHIPMENT_STATUS.AWB_PENDING;
  return { awbNumber, carrierName, carrierDisplayName, trackingUrl, shipmentStatus };
}

export interface InnofulfillResult {
  innofulfillOrderId?: string;
  innofulfillInternalId?: string;
  carrierName?: string;
  carrierDisplayName?: string;
  awbNumber?: string;
  trackingUrl?: string;
  shipmentStatus: string;
  shipmentCreatedAt: string;
}

export async function createInnofulfillOrder(
  token: string,
  orderId: string,
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string },
  cartItems: CartLineItem[],
  total: number,
  paymentMethod: 'prepay' | 'cod',
  deliveryMode: 'AIR' | 'SURFACE',
): Promise<InnofulfillResult> {
  const phone = cleanPhone(customer.phone);
  const pickupName = process.env.INNOFULFILL_PICKUP_NAME || 'RetraLabs';
  const pickupPhone = process.env.INNOFULFILL_PICKUP_PHONE || '6360489397';
  const pickupZip = process.env.INNOFULFILL_PICKUP_ZIP || '560016';
  const pickupCity = process.env.INNOFULFILL_PICKUP_CITY || 'Bengaluru';
  const pickupState = process.env.INNOFULFILL_PICKUP_STATE || 'Karnataka';
  const pickupAddress = process.env.INNOFULFILL_PICKUP_ADDRESS || 'Rajareddy layout 1st cross, shanti layout 8th cross, ramamurthy nagar, Bengaluru, Karnataka 560016';
  const carrierId = process.env.INNOFULFILL_CARRIER_ID || '';
  const carrierNameEnv = process.env.INNOFULFILL_CARRIER_NAME || 'innofulfill_ecomm';

  const isCod = paymentMethod === 'cod';
  let declaredTotal = total;
  if (!isCod) declaredTotal = total >= 10000 ? 3000 : 1000;

  const items = [{
    name: 'Cosmetic Research use',
    quantity: 1,
    unitPrice: declaredTotal,
    sku: 'RETRA-CR-01',
  }];

  const payload = {
    referenceId: orderId,
    orderDate: new Date().toISOString(),
    orderType: 'FORWARD',
    orderStatus: 'CONFIRMED',
    parcelCategory: 'ECOMM',
    deliveryPromise: 'ECOMM',
    deliveryMode,
    autoManifest: true,
    addresses: [
      { type: 'PICKUP', zip: pickupZip, name: pickupName, phone: pickupPhone, email: 'orders@retralabs.in', street: pickupAddress, city: pickupCity, state: pickupState, country: 'India' },
      { type: 'DELIVERY', zip: customer.pincode || '', name: customer.name.slice(0, 70), phone, email: customer.email || 'orders@retralabs.in', street: customer.address || '', city: customer.city || 'Bengaluru', state: customer.state || 'Karnataka', country: 'India' },
      { type: 'BILLING', zip: customer.pincode || '', name: customer.name.slice(0, 70), phone, email: customer.email || 'orders@retralabs.in', street: customer.address || '', city: customer.city || 'Bengaluru', state: customer.state || 'Karnataka', country: 'India' },
      { type: 'RETURN', zip: pickupZip, name: pickupName, phone: pickupPhone, email: 'orders@retralabs.in', street: pickupAddress, city: pickupCity, state: pickupState, country: 'India' },
    ],
    shipments: [{ dimensions: { length: 10, width: 10, height: 5 }, shipmentStatus: 'CONFIRMED', physicalWeight: 0.5, physicalWeightUnit: 'KG', volumetricWeight: 0.1, items }],
    carrierId,
    carrierName: carrierNameEnv,
    payment: { type: isCod ? 'COD' : 'PREPAID', currency: 'INR', paymentMethod: isCod ? 'CASH' : 'ONLINE' },
  };

  console.log(`[Innofulfill] Creating shipment for ${orderId}`);
  const innoBase = getInnofulfillBase();
  const res = await fetch(`${innoBase}/gateway/booking-service/orders`, {
    method: 'POST',
    headers: innofulfillHeaders(token),
    body: JSON.stringify(payload),
  });

  const json: { data?: Record<string, unknown>; error?: string | { message?: string }; message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof json?.error === 'string' ? json.error : (json?.error as { message?: string })?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`Innofulfill: ${detail}`);
  }

  const data = (json?.data || json) as Record<string, unknown>;
  const innofulfillOrderId = data?.orderId || data?.id ? String(data.orderId || data.id) : '';
  if (!innofulfillOrderId || (typeof json?.message === 'string' && json.message.toLowerCase().includes('no serviceable'))) {
    throw new Error(`Innofulfill: ${json?.message || 'No serviceable carrier found for pincode'}`);
  }

  const parsed = parseInnofulfillShipment(data);
  const innofulfillInternalId = data?.id ? String(data.id) : undefined;

  if (parsed.awbNumber) {
    console.log(`[Innofulfill] Real AWB assigned: ${parsed.awbNumber}`);
  } else {
    console.log(`[Innofulfill] Order created (${innofulfillOrderId}); AWB awaiting assignment`);
  }

  return {
    innofulfillOrderId,
    innofulfillInternalId,
    carrierName: parsed.carrierName || carrierNameEnv,
    carrierDisplayName: parsed.carrierDisplayName,
    awbNumber: parsed.awbNumber,
    trackingUrl: parsed.trackingUrl,
    shipmentStatus: parsed.shipmentStatus,
    shipmentCreatedAt: new Date().toISOString(),
  };
}

let cachedShiprocketToken: { token: string; expiresAt: number } | null = null;

export async function getShiprocketToken(): Promise<string | null> {
  const email = (process.env.SHIPROCKET_EMAIL || process.env.VITE_SHIPROCKET_EMAIL || '').trim();
  const password = (process.env.SHIPROCKET_PASSWORD || process.env.VITE_SHIPROCKET_PASSWORD || '').trim();
  if (!email || !password) return null;
  if (cachedShiprocketToken && Date.now() < cachedShiprocketToken.expiresAt) return cachedShiprocketToken.token;

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json: { token?: string; message?: string; errors?: unknown } = await res.json().catch(() => ({}));
  if (!res.ok || !json?.token) {
    const detail = json?.message || (json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`);
    throw new Error(`Shiprocket auth failed: ${detail}`);
  }
  cachedShiprocketToken = { token: json.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return json.token;
}

export interface ShiprocketResult {
  provider: 'Shiprocket';
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  courierName?: string;
  awbNumber?: string;
  shipmentStatus: string;
  shipmentCreatedAt: string;
}

async function createShiprocketOrder(
  token: string,
  orderId: string,
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string },
  cartItems: CartLineItem[],
  total: number,
  paymentMethod: 'prepay' | 'cod',
): Promise<ShiprocketResult> {
  const phone = cleanPhone(customer.phone);
  let pickupLocation = (process.env.SHIPROCKET_PICKUP_LOCATION || process.env.VITE_SHIPROCKET_PICKUP_LOCATION || 'Rajath').trim();
  if (!pickupLocation || pickupLocation.toLowerCase() === 'primary') pickupLocation = 'Rajath';

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const nameParts = (customer.name || 'Valued Customer').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Valued';
  const lastName = nameParts.slice(1).join(' ') || 'Customer';
  let declaredTotal = total;
  if (paymentMethod !== 'cod') declaredTotal = total >= 10000 ? 3000 : 1000;

  const payload = {
    order_id: orderId,
    order_date: orderDate,
    pickup_location: pickupLocation,
    channel_id: '',
    comment: 'RetraLabs Order',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: customer.address || 'Address Line 1',
    billing_city: customer.city || 'Bengaluru',
    billing_pincode: customer.pincode || '560001',
    billing_state: customer.state || 'Karnataka',
    billing_country: 'India',
    billing_email: customer.email || 'orders@retralabs.in',
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: [{ name: 'Cosmetic Research use', sku: 'RETRA-CR-01', units: 1, selling_price: declaredTotal, discount: 0, tax: 0 }],
    payment_method: paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: declaredTotal,
    length: 10,
    breadth: 10,
    height: 5,
    weight: 0.5,
  };

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json: { data?: Record<string, unknown>; awb_code?: string; message?: string; status_code?: number } = await res.json().catch(() => ({}));
  const data = json?.data || json;
  const srOrderId = String(data?.order_id ?? json?.order_id ?? json?.id ?? '');
  const srShipmentId = String(data?.shipment_id ?? json?.shipment_id ?? '');
  if (!res.ok || json?.status_code === 0 || !srOrderId) {
    throw new Error(`Shiprocket: ${json?.message || `HTTP ${res.status}`}`);
  }

  const rawAwb = json?.awb_code || data?.awb_code;
  const awbNumber = sanitizeAwb(rawAwb ? String(rawAwb) : undefined);
  const courierName = (json as Record<string, unknown>)?.courier_name || data?.courier_name ? String((json as Record<string, unknown>)?.courier_name || data?.courier_name) : 'Shiprocket';

  return {
    provider: 'Shiprocket',
    shiprocketOrderId: srOrderId,
    shiprocketShipmentId: srShipmentId,
    courierName,
    awbNumber,
    shipmentStatus: awbNumber ? SHIPMENT_STATUS.AWB_ASSIGNED : SHIPMENT_STATUS.AWB_PENDING,
    shipmentCreatedAt: new Date().toISOString(),
  };
}

export interface LogisticsResult {
  innofulfillOrderId?: string;
  innofulfillInternalId?: string;
  carrierName?: string;
  carrierDisplayName?: string;
  awbNumber?: string;
  trackingUrl?: string;
  shipmentStatus: string;
  shipmentProvider: 'Innofulfill' | 'Shiprocket';
  warning?: string | null;
}

export async function processLogistics(
  baseId: string,
  table: string,
  token: string,
  recordId: string,
  orderId: string,
  body: {
    cartItems: CartLineItem[];
    customer: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string };
    paymentMethod: 'prepay' | 'cod';
    deliveryOption?: 'normal' | 'fast';
    total: number;
    deliveryCharge: number;
    codCharge: number;
  },
): Promise<LogisticsResult> {
  const existingRes = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const existingJson: { fields?: Record<string, string> } = await existingRes.json().catch(() => ({}));
  const existingInnoId = existingJson?.fields?.['Innofulfill Order ID'];
  const existingAwb = sanitizeAwb(existingJson?.fields?.['AWB Number']);
  const existingProvider = existingJson?.fields?.['Courier Provider'] as 'Innofulfill' | 'Shiprocket' | undefined;

  if (existingInnoId) {
    console.log(`[Logistics] Idempotent: order ${orderId} already has booking ${existingInnoId}`);
    return {
      innofulfillOrderId: String(existingInnoId),
      awbNumber: existingAwb,
      shipmentStatus: existingAwb ? SHIPMENT_STATUS.AWB_ASSIGNED : SHIPMENT_STATUS.AWB_PENDING,
      shipmentProvider: existingProvider || 'Innofulfill',
      warning: null,
    };
  }

  let warning: string | null = null;
  let result: LogisticsResult = {
    shipmentStatus: SHIPMENT_STATUS.NOT_CREATED,
    shipmentProvider: 'Innofulfill',
    warning: null,
  };

  // Ask Innofulfill whether it serves this PIN before trying to book with it.
  // Previously we always attempted Innofulfill and only reached Shiprocket if
  // the call threw, so PINs Innofulfill simply does not cover could end up
  // with neither carrier. Routing is now decided up front.
  let routing: { expressAvailable: boolean; provider: 'Innofulfill' | 'Shiprocket'; indeterminate: boolean; reason?: string };
  let deliveryMode: 'AIR' | 'SURFACE' = 'AIR';
  try {
    // Dynamic import: delivery-shared imports getInnofulfillToken from this
    // module, so a static import here would be circular.
    const { routeShipment, resolveDeliveryMode } = await import('./delivery-shared');
    routing = await routeShipment(body.customer?.pincode || '', body.paymentMethod);
    deliveryMode = resolveDeliveryMode(body.deliveryOption, body.customer?.state);
  } catch (routeErr) {
    console.warn('[Logistics] Routing check failed, will try Innofulfill first:', routeErr);
    routing = { expressAvailable: true, provider: 'Innofulfill', indeterminate: true };
  }

  if (routing.provider === 'Shiprocket' && !routing.indeterminate) {
    console.log(`[Logistics] ${orderId}: Innofulfill does not serve ${body.customer?.pincode} — routing to Shiprocket`);
    warning = routing.reason ? `Innofulfill unserviceable: ${routing.reason}` : 'Innofulfill does not serve this PIN code';
  }

  try {
    const innoToken = routing.provider === 'Innofulfill' ? await getInnofulfillToken() : null;
    if (innoToken) {
      const inno = await createInnofulfillOrder(
        innoToken,
        orderId,
        body.customer,
        body.cartItems,
        body.total,
        body.paymentMethod,
        deliveryMode,
      );
      result = {
        innofulfillOrderId: inno.innofulfillOrderId,
        innofulfillInternalId: inno.innofulfillInternalId,
        carrierName: inno.carrierName,
        carrierDisplayName: inno.carrierDisplayName,
        awbNumber: inno.awbNumber,
        trackingUrl: inno.trackingUrl,
        shipmentStatus: inno.shipmentStatus,
        shipmentProvider: 'Innofulfill',
        warning: null,
      };
      await applyLogisticsPatch(baseId, table, token, recordId, result, 'Innofulfill');
      if (result.awbNumber && !existingJson?.fields?.['AWB Email Sent']) {
        await sendAwbAssignedEmail(
          baseId, table, token, recordId,
          body.customer, orderId, result.awbNumber,
          result.carrierDisplayName || result.carrierName || 'Innofulfill',
          result.trackingUrl,
        );
      }
      return result;
    }
    if (routing.provider === 'Innofulfill') warning = 'Innofulfill credentials not configured';
  } catch (innoErr) {
    warning = innoErr instanceof Error ? innoErr.message : String(innoErr);
    console.warn(`[Logistics] Innofulfill failed for ${orderId}: ${warning}`);
  }

  try {
    const srToken = await getShiprocketToken();
    if (srToken) {
      const sr = await createShiprocketOrder(srToken, orderId, body.customer, body.cartItems, body.total, body.paymentMethod);
      // Shiprocket adhoc orders land in the Shiprocket dashboard; an AWB is
      // assigned there, not returned here. Absence of an AWB is expected and
      // is not an error.
      result = {
        innofulfillOrderId: sr.shiprocketOrderId,
        innofulfillInternalId: sr.shiprocketShipmentId,
        carrierName: sr.courierName,
        carrierDisplayName: sr.awbNumber ? `Shiprocket (${sr.courierName || 'Partner'})` : 'Shiprocket',
        awbNumber: sr.awbNumber,
        shipmentStatus: sr.shipmentStatus,
        shipmentProvider: 'Shiprocket',
        warning,
      };
      await applyLogisticsPatch(baseId, table, token, recordId, result, 'Shiprocket');
      if (result.awbNumber && !existingJson?.fields?.['AWB Email Sent']) {
        await sendAwbAssignedEmail(
          baseId, table, token, recordId,
          body.customer, orderId, result.awbNumber,
          result.carrierDisplayName || result.carrierName || 'Shiprocket',
          result.trackingUrl,
        );
      }
      return result;
    }
    warning = `${warning || 'Innofulfill failed'}; Shiprocket not configured`;
  } catch (srErr) {
    const srMsg = srErr instanceof Error ? srErr.message : String(srErr);
    warning = `${warning || 'Innofulfill failed'}; Shiprocket failed: ${srMsg}`;
    console.error(`[Logistics] Shiprocket fallback failed: ${srMsg}`);
  }

  await patchAirtableRecord(baseId, table, token, recordId, {
    Status: 'Logistics Failed',
    'Shipment Status': SHIPMENT_STATUS.FAILED,
    'Innofulfill Error': warning || 'Logistics Failed',
  });
  result.warning = warning;
  result.shipmentStatus = SHIPMENT_STATUS.FAILED;
  return result;
}

/**
 * Confirms a payment gateway (Cashfree) success and books the shipment, using
 * only what is already stored on the Airtable record — there is no browser
 * session to re-supply cart items when a webhook or a post-redirect status
 * check runs, so this reconstructs a single declared-value line item the same
 * way the manual "push to Innofulfill/Shiprocket" admin action already does.
 * Idempotent: a record already CONFIRMED is left untouched.
 */
export async function confirmPaymentAndFulfill(
  baseId: string,
  table: string,
  token: string,
  recordId: string,
  orderId: string,
  fields: Record<string, unknown>,
  paymentReference?: string,
  /**
   * Hands the shipment booking off to run after the response is sent
   * (Cloudflare's ctx.waitUntil). Booking a carrier means an auth call, a
   * serviceability check and a create call — tens of seconds — and a customer
   * waiting to be told their payment went through must never sit behind that.
   * Omit it on server-to-server paths, where blocking costs nobody anything.
   */
  runInBackground?: (work: Promise<unknown>) => void,
): Promise<{ alreadyConfirmed: boolean }> {
  if (recordIsPaid(fields)) {
    return { alreadyConfirmed: true };
  }

  // Payment state first and on its own, so the customer's "am I confirmed?"
  // poll can be answered the moment this lands, whatever fulfilment does next.
  await patchAirtableRecord(baseId, table, token, recordId, {
    'Payment Status': PAYMENT_STATUS.CONFIRMED,
    Status: 'PAYMENT_CONFIRMED',
    ...(paymentReference ? { Transaction: paymentReference } : {}),
  });

  const total = Number(fields['Total (₹)'] || 0);
  const address = String(fields.Address || '');
  // Dynamic import: delivery-shared imports getInnofulfillToken from this
  // module, so a static import here would be circular (see processLogistics).
  const { extractPincodeFromAddress } = await import('./delivery-shared');
  const pincode = extractPincodeFromAddress(address) || '';

  if (!pincode) {
    console.warn(`[Cashfree] ${orderId}: no PIN code found in stored address — skipping auto logistics, needs a manual push`);
    return { alreadyConfirmed: false };
  }

  const isExpress = String(fields.Delivery || '').toLowerCase().includes('express');
  const customer = {
    name: String(fields.Name || 'Customer'),
    email: String(fields.Email || 'orders@retralabs.in'),
    phone: String(fields.Phone || ''),
    address,
    city: String(fields.City || '').trim() || 'Bengaluru',
    state: String(fields.State || '').trim() || 'Karnataka',
    pincode,
  };
  const declaredTotal = total >= 10000 ? 3000 : 1000;
  const cartItems: CartLineItem[] = [{ name: 'Cosmetic Research use', variant: 'ONLINE', quantity: 1, unitPrice: declaredTotal }];

  const booking = processLogistics(baseId, table, token, recordId, orderId, {
    cartItems,
    customer,
    paymentMethod: 'prepay',
    deliveryOption: isExpress ? 'fast' : 'normal',
    total,
    deliveryCharge: 0,
    codCharge: 0,
  });

  if (runInBackground) {
    // Failures still land on the record via processLogistics' own error
    // handling; catch here only so an unhandled rejection can't take the
    // worker down after the response has gone.
    runInBackground(booking.catch(err => console.error(`[Fulfil] ${orderId}:`, err)));
  } else {
    await booking;
  }

  return { alreadyConfirmed: false };
}

async function applyLogisticsPatch(
  baseId: string,
  table: string,
  token: string,
  recordId: string,
  result: LogisticsResult,
  provider: 'Innofulfill' | 'Shiprocket',
) {
  const updateFields: Record<string, unknown> = {
    Status: `Created in ${provider}`,
    'Shipment Status': result.shipmentStatus,
    'Courier Provider': provider,
    'Innofulfill Error': '',
    'Shipment Created At': new Date().toISOString(),
  };
  if (result.innofulfillOrderId) updateFields['Innofulfill Order ID'] = result.innofulfillOrderId;
  if (result.innofulfillInternalId) updateFields['Innofulfill Internal ID'] = result.innofulfillInternalId;
  if (result.carrierName) updateFields['Carrier Name'] = result.carrierName;
  if (result.carrierDisplayName) {
    updateFields['Carrier Display Name'] = result.carrierDisplayName;
    updateFields.Courier = result.carrierDisplayName;
  }
  if (result.awbNumber) {
    updateFields['AWB Number'] = result.awbNumber;
    updateFields['Tracking ID'] = result.awbNumber;
  } else {
    updateFields['AWB Number'] = '';
    updateFields['Tracking ID'] = '';
  }
  if (result.trackingUrl) updateFields['Tracking URL'] = result.trackingUrl;
  await patchAirtableRecord(baseId, table, token, recordId, updateFields);
}

/**
 * Emails the customer their AWB/tracking number once one has actually been
 * assigned. Never throws — a failed notification email must never break
 * order or logistics processing, so failures are logged and swallowed.
 * Callers are responsible for the "already sent" guard (an 'AWB Email Sent'
 * field on the record) so this never fires twice for the same order.
 */
export async function sendAwbAssignedEmail(
  baseId: string,
  table: string,
  token: string,
  recordId: string,
  customer: { name: string; email: string },
  orderId: string,
  awbNumber: string,
  courierName: string,
  trackingUrl?: string | null,
): Promise<void> {
  try {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey || !customer.email) return;

    const htmlContent = generateAwbAssignedEmail({
      orderId,
      name: customer.name || 'Customer',
      awbNumber,
      courierName: courierName || 'Courier',
      trackingUrl,
    });

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { name: 'RetraLabs', email: 'orders@retralabs.in' },
        to: [{ email: customer.email, name: customer.name || 'Customer' }],
        subject: `Your RetraLabs order #${orderId} has shipped — AWB ${awbNumber}`,
        htmlContent,
      }),
    });

    if (!res.ok) {
      console.error(`[AwbEmail] Brevo send failed for ${orderId}: HTTP ${res.status}`);
      return;
    }

    await patchAirtableRecord(baseId, table, token, recordId, {
      'AWB Email Sent': new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[AwbEmail] Failed to send for ${orderId}:`, err);
  }
}
