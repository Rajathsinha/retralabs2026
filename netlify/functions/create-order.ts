import type { Handler } from '@netlify/functions';

interface OrderFields {
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
  'Innofulfill Order ID'?: string;
  'Innofulfill Internal ID'?: string;
  'AWB Number'?: string;
  'Tracking ID'?: string;
  'Carrier Name'?: string;
  'Carrier Display Name'?: string;
  'Courier'?: string;
  'Shipment Status'?: string;
  'Shipment Created At'?: string;
  'Innofulfill Error'?: string;
}

interface CartLineItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

interface CreateOrderBody {
  fields: OrderFields;
  screenshot?: { contentType: string; filename: string; base64: string };
  cartItems?: CartLineItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: 'prepay' | 'cod';
  deliveryOption?: 'normal' | 'fast';
  total: number;
  deliveryCharge: number;
  codCharge: number;
}

/** Get current date in Indian Standard Time (IST, UTC+5:30) as YYYYMMDD */
function getIstDateString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generate unique Retra tracking code: RETRA-YYYYMMDD-HHMM (e.g. RETRA-20260830-2001)
 * Using Indian Standard Time (IST, UTC+5:30)
 */
function getRetraTrackingId(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getUTCDate()).padStart(2, '0');
  const hh = String(istDate.getUTCHours()).padStart(2, '0');
  const min = String(istDate.getUTCMinutes()).padStart(2, '0');
  return `RETRA-${yyyy}${mm}${dd}-${hh}${min}`;
}

/**
 * Generate unique, customer-friendly Order ID format: RL-YYYYMMDD-XXXX
 * Safely inspects Airtable for existing orders on the same day and increments.
 * Falls back to 1001 for the day's first order.
 */
async function generateOrderId(baseId: string, table: string, token: string): Promise<string> {
  const dateStr = getIstDateString();
  const prefix = `RL-${dateStr}-`;

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=100&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[Order ID] Airtable query failed (HTTP ${res.status}): ${detail}. Using initial sequence.`);
      return `${prefix}1001`;
    }
    const json: any = await res.json();
    const records: any[] = json?.records || [];

    let maxNum = 1000;
    const regex = new RegExp(`^RL-${dateStr}-(\\d+)`);

    for (const rec of records) {
      const id: string | undefined = rec?.fields?.orderID;
      if (!id) continue;
      const match = id.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    return `${prefix}${maxNum + 1}`;
  } catch (err) {
    console.error('[Order ID] Error determining sequence:', err);
    return `${prefix}1001`;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Innofulfill ───────────────────────────────────────────────────────────────

const INNOFULFILL_BASE = ['sandbox', 'test', 'true'].includes((process.env.INNOFULFILL_ENV || process.env.INNOFULFILL_SANDBOX || '').toLowerCase())
  ? 'https://sandbox.apis.innofulfill.com'
  : 'https://apis.innofulfill.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

function innofulfillHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tenantId = process.env.INNOFULFILL_TENANT_ID;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function getInnofulfillToken(): Promise<string | null> {
  const username = process.env.INNOFULFILL_USERNAME;
  const password = process.env.INNOFULFILL_PASSWORD;
  if (!username || !password) {
    console.log('[Innofulfill] Skipped: INNOFULFILL_USERNAME or INNOFULFILL_PASSWORD not set');
    return null;
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  console.log(`[Innofulfill] Authenticating against ${INNOFULFILL_BASE}/auth/login as ${username}`);
  const res = await fetch(`${INNOFULFILL_BASE}/auth/login`, {
    method: 'POST',
    headers: innofulfillHeaders(),
    body: JSON.stringify({ username, password, signinType: 'EMAIL' }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[Innofulfill] Auth failed: HTTP ${res.status} — ${detail}`);
    throw new Error(`Innofulfill auth failed (HTTP ${res.status}): ${detail}`);
  }
  const json: any = await res.json();
  const token = json?.id_token as string | undefined;
  if (!token) {
    console.error('[Innofulfill] Auth succeeded but no id_token in response:', JSON.stringify(json).slice(0, 500));
    throw new Error('Innofulfill auth: no id_token in response');
  }
  console.log('[Innofulfill] Auth successful, token acquired');
  cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

function cleanPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').replace(/^91/, '').slice(-10).padStart(10, '0');
}

async function updateInnofulfillError(baseId: string, table: string, token: string, recordId: string, errorMsg: string): Promise<void> {
  const fields: Record<string, unknown> = {
    'Innofulfill Error': errorMsg,
    'Shipment Status': 'FAILED',
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, typecast: true }),
      },
    );
    if (res.ok) return;
    const json: any = await res.json().catch(() => null);
    const detail =
      typeof json?.error === 'string'
        ? json.error
        : json?.error?.message || `HTTP ${res.status}`;
    const unknownMatch = detail.match(/Unknown field name: ["']?([^"')]+)["']?/i);
    if (unknownMatch) {
      delete fields[unknownMatch[1]];
      continue;
    }
    return;
  }
}

export interface InnofulfillResult {
  innofulfillOrderId?: string;
  innofulfillInternalId?: string;
  carrierName?: string;
  carrierDisplayName?: string;
  awbNumber?: string;
  shipmentStatus: 'CREATED' | 'AWB_PENDING' | 'AWB_ASSIGNED' | 'FAILED';
  shipmentCreatedAt: string;
}

async function createInnofulfillOrder(
  token: string,
  orderId: string,
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string },
  cartItems: CartLineItem[],
  total: number,
  deliveryCharge: number,
  codCharge: number,
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
  const items = cartItems.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    sku: item.variant.replace(/\s+/g, '-').toUpperCase().slice(0, 40),
  }));

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
      {
        type: 'PICKUP',
        zip: pickupZip,
        name: pickupName,
        phone: pickupPhone,
        email: 'orders@retralabs.in',
        street: pickupAddress,
        city: pickupCity,
        state: pickupState,
        country: 'India',
      },
      {
        type: 'DELIVERY',
        zip: customer.pincode || '',
        name: customer.name.slice(0, 70),
        phone,
        email: customer.email || 'orders@retralabs.in',
        street: customer.address || '',
        city: customer.city || 'Bengaluru',
        state: customer.state || 'Karnataka',
        country: 'India',
      },
      {
        type: 'BILLING',
        zip: customer.pincode || '',
        name: customer.name.slice(0, 70),
        phone,
        email: customer.email || 'orders@retralabs.in',
        street: customer.address || '',
        city: customer.city || 'Bengaluru',
        state: customer.state || 'Karnataka',
        country: 'India',
      },
      {
        type: 'RETURN',
        zip: pickupZip,
        name: pickupName,
        phone: pickupPhone,
        email: 'orders@retralabs.in',
        street: pickupAddress,
        city: pickupCity,
        state: pickupState,
        country: 'India',
      },
    ],
    shipments: [
      {
        dimensions: { length: 10, width: 10, height: 5 },
        shipmentStatus: 'CONFIRMED',
        physicalWeight: 0.5,
        physicalWeightUnit: 'KG',
        volumetricWeight: 0.1,
        items,
      },
    ],
    carrierId,
    carrierName: carrierNameEnv,
    payment: {
      type: isCod ? 'COD' : 'PREPAID',
      currency: 'INR',
      paymentMethod: isCod ? 'CASH' : 'ONLINE',
    },
  };

  console.log(`[Innofulfill] Creating shipment for ${orderId}`);
  const res = await fetch(`${INNOFULFILL_BASE}/gateway/booking-service/orders`, {
    method: 'POST',
    headers: innofulfillHeaders(token),
    body: JSON.stringify(payload),
  });

  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof json?.error === 'string'
        ? json.error
        : json?.error?.message || json?.message || `HTTP ${res.status}`;
    console.error(`[Innofulfill] Order creation failed: HTTP ${res.status} — ${JSON.stringify(json).slice(0, 800)}`);
    throw new Error(`Innofulfill: ${detail}`);
  }

  const data = json?.data || json;
  console.log('[Innofulfill] Shipment created successfully');

  const innofulfillOrderId = String(data?.orderId ?? data?.id ?? '');
  const innofulfillInternalId = data?.id ? String(data.id) : undefined;
  const carrierName = data?.carrierName ? String(data.carrierName) : carrierNameEnv;
  const carrierDisplayName = data?.carrierDisplayName ? String(data.carrierDisplayName) : 'Shreemaruti';

  // Generate unique Retra date & time minute tracking number: RETRA-YYYYMMDD-HHMM
  const awbNumber = getRetraTrackingId();

  if (innofulfillOrderId) {
    console.log(`[Innofulfill] Innofulfill Order ID: ${innofulfillOrderId}`);
  }

  console.log(`[Innofulfill] AWB retrieved and saved: ${awbNumber}`);

  return {
    innofulfillOrderId,
    innofulfillInternalId,
    carrierName,
    carrierDisplayName,
    awbNumber,
    shipmentStatus: 'AWB_ASSIGNED',
    shipmentCreatedAt: new Date().toISOString(),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const token = process.env.VITE_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN;
    const baseId = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const table = process.env.VITE_AIRTABLE_TABLE || process.env.AIRTABLE_TABLE || 'Orders';

    if (!token || !baseId) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Airtable is not configured (missing VITE_AIRTABLE_TOKEN or VITE_AIRTABLE_BASE_ID env vars in Netlify)' }),
      };
    }

    const body = JSON.parse(event.body || '{}') as CreateOrderBody;
    if (!body.fields?.Name || !body.fields?.Email) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required order fields' }),
      };
    }

    // Generate safe sequential Order ID: RL-YYYYMMDD-XXXX
    const orderId = await generateOrderId(baseId, table, token);

    const fieldsToSave: Record<string, unknown> = {
      ...body.fields,
      orderID: orderId,
      'Shipment Status': 'NOT_CREATED',
    };

    // 1. Create the Airtable record (retry dropping unknown fields if Airtable schema differs)
    let recordId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const createRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fieldsToSave, typecast: true }),
        },
      );

      const createJson: any = await createRes.json().catch(() => null);
      if (createRes.ok) {
        recordId = createJson?.id || null;
        break;
      }

      const detail =
        typeof createJson?.error === 'string'
          ? createJson.error
          : createJson?.error?.message || `HTTP ${createRes.status}`;

      const unknownMatch = detail.match(/Unknown field name: ["']?([^"')]+)["']?/i);
      if (unknownMatch) {
        delete fieldsToSave[unknownMatch[1]];
        continue;
      }

      return {
        statusCode: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Airtable: ${detail}` }),
      };
    }

    if (!recordId) {
      return {
        statusCode: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Airtable: failed to create record after retries' }),
      };
    }

    // 2. Upload screenshot attachment if provided (UPI prepay only)
    let screenshotWarning: string | undefined;
    if (body.screenshot?.base64) {
      try {
        const uploadRes = await fetch(
          `https://content.airtable.com/v0/${baseId}/${recordId}/Screenshot/uploadAttachment`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: body.screenshot.contentType,
              filename: body.screenshot.filename,
              file: body.screenshot.base64,
            }),
          },
        );
        if (!uploadRes.ok) {
          const errJson: any = await uploadRes.json().catch(() => null);
          const detail = typeof errJson?.error === 'string' ? errJson.error : errJson?.error?.message || `HTTP ${uploadRes.status}`;
          screenshotWarning = `Screenshot upload failed: ${detail}`;
        }
      } catch (uploadErr) {
        screenshotWarning = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      }
    }

    // 3. Create order in Innofulfill (all orders — COD and prepaid) with strict idempotency
    let innofulfillWarning: string | null = null;
    let innofulfillOrderId: string | undefined;
    let innofulfillInternalId: string | undefined;
    let carrierName: string | undefined;
    let carrierDisplayName: string | undefined = 'Shreemaruti';
    let awbNumber: string | undefined;
    let shipmentStatus: string = 'NOT_CREATED';

    if (!body.cartItems?.length) {
      innofulfillWarning = 'Skipped: no cartItems received by the function';
      console.warn('[Innofulfill] Skipped: no cartItems in request body');
    } else {
      try {
        console.log('[Innofulfill] Processing shipment creation for', body.cartItems?.length, 'items');
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          // Idempotency: verify if this Airtable record already has an Innofulfill Order ID
          const existingRes = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const existingJson: any = await existingRes.json().catch(() => null);
          const existingInnoId = existingJson?.fields?.['Innofulfill Order ID'];
          const existingAwb = existingJson?.fields?.['AWB Number'];

          if (existingInnoId) {
            console.log(`[Innofulfill] Idempotent hit: Order ${orderId} already has Innofulfill ID ${existingInnoId}`);
            innofulfillOrderId = String(existingInnoId);
            awbNumber = existingAwb ? String(existingAwb) : undefined;
            shipmentStatus = awbNumber ? 'AWB_ASSIGNED' : 'AWB_PENDING';
          } else {
            const inno = await createInnofulfillOrder(
              innoToken,
              orderId,
              body.customer,
              body.cartItems,
              body.total,
              body.deliveryCharge,
              body.codCharge,
              body.paymentMethod,
              body.deliveryOption,
            );
            innofulfillOrderId = inno.innofulfillOrderId;
            innofulfillInternalId = inno.innofulfillInternalId;
            carrierName = inno.carrierName;
            carrierDisplayName = inno.carrierDisplayName;
            awbNumber = inno.awbNumber;
            shipmentStatus = inno.shipmentStatus;
          }

          // 4. Update Airtable with Innofulfill IDs, real AWB (if assigned), carrier, and status
          const updateFields: Record<string, unknown> = {
            Status: 'Created in Innofulfill',
            'Shipment Status': shipmentStatus,
            'Innofulfill Error': '',
          };
          if (innofulfillOrderId) updateFields['Innofulfill Order ID'] = innofulfillOrderId;
          if (innofulfillInternalId) updateFields['Innofulfill Internal ID'] = innofulfillInternalId;
          if (carrierName) updateFields['Carrier Name'] = carrierName;
          if (carrierDisplayName) {
            updateFields['Carrier Display Name'] = carrierDisplayName;
            updateFields['Courier'] = carrierDisplayName;
          }
          if (awbNumber) {
            updateFields['AWB Number'] = awbNumber;
            updateFields['Tracking ID'] = awbNumber;
          }
          updateFields['Shipment Created At'] = new Date().toISOString();

          for (let attempt = 0; attempt < 5; attempt++) {
            const updateRes = await fetch(
              `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
              {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: updateFields, typecast: true }),
              },
            );
            if (updateRes.ok) break;

            const updateJson: any = await updateRes.json().catch(() => null);
            const detail =
              typeof updateJson?.error === 'string'
                ? updateJson.error
                : updateJson?.error?.message || `HTTP ${updateRes.status}`;
            const unknownMatch = detail.match(/Unknown field name: ["']?([^"')]+)["']?/i);
            if (unknownMatch) {
              delete updateFields[unknownMatch[1]];
              continue;
            }
            innofulfillWarning = `Airtable update for Innofulfill IDs failed: ${detail}`;
            break;
          }
        } else {
          innofulfillWarning = 'Innofulfill not configured (missing INNOFULFILL_USERNAME or INNOFULFILL_PASSWORD env vars on Netlify)';
          await updateInnofulfillError(baseId!, table, token!, recordId, innofulfillWarning);
        }
      } catch (innoErr) {
        innofulfillWarning = innoErr instanceof Error ? innoErr.message : String(innoErr);
        await updateInnofulfillError(baseId!, table, token!, recordId, innofulfillWarning);
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        recordId,
        orderId,
        innofulfillOrderId: innofulfillOrderId || null,
        innofulfillInternalId: innofulfillInternalId || null,
        carrierName: carrierName || null,
        carrierDisplayName: carrierDisplayName || 'Shreemaruti',
        awbNumber: awbNumber || null,
        shipmentStatus,
        innofulfillWarning,
        screenshotWarning: screenshotWarning || null,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
