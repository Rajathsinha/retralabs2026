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
 * Generate internal document number: RETR0000000035
 * Scans Airtable for the highest existing RETR sequence.
 */
export async function generateOrderId(baseId: string, table: string, token: string): Promise<string> {
  const prefix = 'RETR';
  let maxNum = 0;

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=100&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const json: { records?: Array<{ fields?: { orderID?: string } }> } = await res.json();
      const regex = /^RETR0*(\d+)$/i;
      for (const rec of json?.records || []) {
        const id = rec?.fields?.orderID;
        if (!id) continue;
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

  return `${prefix}${String(maxNum + 1).padStart(10, '0')}`;
}

export async function patchAirtableRecord(
  baseId: string,
  table: string,
  token: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, typecast: true }),
      },
    );
    if (res.ok) return true;
    const json: { error?: string | { message?: string } } = await res.json().catch(() => ({}));
    const detail = typeof json?.error === 'string' ? json.error : json?.error?.message || `HTTP ${res.status}`;
    const unknownMatch = detail.match(/Unknown field name: ["']?([^"')]+)["']?/i);
    if (unknownMatch) {
      delete fields[unknownMatch[1]];
      continue;
    }
    console.error('[Airtable] PATCH failed:', detail);
    return false;
  }
  return false;
}

export function cleanPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').replace(/^91/, '').slice(-10).padStart(10, '0');
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
  deliveryOption?: 'normal' | 'fast',
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
    name: cartItems.map(i => i.name).join(', ').slice(0, 50),
    quantity: 1,
    unitPrice: declaredTotal,
    sku: 'RETRA-PRODUCTS',
  }];

  const payload = {
    referenceId: orderId,
    orderDate: new Date().toISOString(),
    orderType: 'FORWARD',
    orderStatus: 'CONFIRMED',
    parcelCategory: 'ECOMM',
    deliveryPromise: 'ECOMM',
    deliveryMode: deliveryOption === 'fast' ? 'AIR' : 'SURFACE',
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

async function getShiprocketToken(): Promise<string | null> {
  const email = (process.env.SHIPROCKET_EMAIL || process.env.VITE_SHIPROCKET_EMAIL || '').trim();
  const password = (process.env.SHIPROCKET_PASSWORD || process.env.VITE_SHIPROCKET_PASSWORD || '').trim();
  if (!email || !password) return null;
  if (cachedShiprocketToken && Date.now() < cachedShiprocketToken.expiresAt) return cachedShiprocketToken.token;

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Shiprocket auth failed: HTTP ${res.status}`);
  const json: { token?: string } = await res.json().catch(() => ({}));
  if (!json?.token) return null;
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
    order_items: [{ name: cartItems.map(i => i.name).join(', ').slice(0, 50), sku: 'RETRA-PRODUCTS', units: 1, selling_price: declaredTotal, discount: 0, tax: 0 }],
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
  try {
    // Dynamic import: delivery-shared imports getInnofulfillToken from this
    // module, so a static import here would be circular.
    const { routeShipment } = await import('./delivery-shared');
    routing = await routeShipment(body.customer?.pincode || '', body.paymentMethod);
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
        body.deliveryOption,
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
