import type { Handler } from '@netlify/functions';

interface OrderFields {
  orderID: string;
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
  'AWB Number'?: string;
  'Tracking ID'?: string;
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
  total: number;
  deliveryCharge: number;
  codCharge: number;
}

function generateOrderId(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `RL-${ymd}-${rand}`;
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
  if (!username || !password) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${INNOFULFILL_BASE}/auth/login`, {
    method: 'POST',
    headers: innofulfillHeaders(),
    body: JSON.stringify({ username, password, signinType: 'EMAIL' }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Innofulfill auth failed (HTTP ${res.status}): ${detail}`);
  }
  const json: any = await res.json();
  const token = json?.id_token as string | undefined;
  if (!token) throw new Error('Innofulfill auth: no id_token in response');
  cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

function cleanPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').replace(/^91/, '').slice(-10).padStart(10, '0');
}

async function updateInnofulfillError(baseId: string, table: string, token: string, recordId: string, errorMsg: string): Promise<void> {
  let fields: Record<string, unknown> = { 'Innofulfill Error': errorMsg };
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

async function createInnofulfillOrder(
  token: string,
  orderId: string,
  customer: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string },
  cartItems: CartLineItem[],
  total: number,
  deliveryCharge: number,
  codCharge: number,
  paymentMethod: 'prepay' | 'cod',
): Promise<{ innofulfillOrderId?: string; awbNumber?: string }> {
  const phone = cleanPhone(customer.phone);
  const pickupName = process.env.INNOFULFILL_PICKUP_NAME || 'RetraLabs';
  const pickupPhone = process.env.INNOFULFILL_PICKUP_PHONE || '9000000000';
  const pickupZip = process.env.INNOFULFILL_PICKUP_ZIP || '560001';
  const pickupCity = process.env.INNOFULFILL_PICKUP_CITY || 'Bengaluru';
  const pickupState = process.env.INNOFULFILL_PICKUP_STATE || 'Karnataka';
  const pickupAddress = process.env.INNOFULFILL_PICKUP_ADDRESS || 'RetraLabs Warehouse, Bengaluru, Karnataka 560001';
  const carrierId = process.env.INNOFULFILL_CARRIER_ID || '';
  const carrierName = process.env.INNOFULFILL_CARRIER_NAME || 'innofulfill_ecomm';

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
    deliveryMode: 'SURFACE',
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
    carrierName,
    payment: {
      type: isCod ? 'COD' : 'PREPAID',
      currency: 'INR',
      paymentMethod: isCod ? 'CASH' : 'ONLINE',
    },
  };

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
    throw new Error(`Innofulfill: ${detail}`);
  }

  const data = json?.data || json;
  return {
    innofulfillOrderId: String(data?.orderId ?? data?.id ?? ''),
    awbNumber: data?.shipments?.[0]?.awbNumber ? String(data.shipments[0].awbNumber) : undefined,
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

    const orderId = generateOrderId();
    const fieldsWithId: Record<string, unknown> = { ...body.fields, orderID: orderId };

    // 1. Create the Airtable record (retry dropping unknown fields)
    let recordId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const createRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fieldsWithId, typecast: true }),
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
        delete fieldsWithId[unknownMatch[1]];
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

    // 3. Create order in Innofulfill (all orders — COD and prepaid)
    let innofulfillWarning: string | null = null;
    let innofulfillOrderId: string | undefined;
    let awbNumber: string | undefined;

    if (!body.cartItems?.length) {
      innofulfillWarning = 'Skipped: no cartItems received by the function';
    } else {
      try {
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          const inno = await createInnofulfillOrder(
            innoToken,
            orderId,
            body.customer,
            body.cartItems,
            body.total,
            body.deliveryCharge,
            body.codCharge,
            body.paymentMethod,
          );
          innofulfillOrderId = inno.innofulfillOrderId;
          awbNumber = inno.awbNumber;

          // 4. Update Airtable with Innofulfill IDs and status (retry dropping unknown fields)
          let updateFields: Record<string, unknown> = {
            Status: 'Created in Innofulfill',
          };
          if (innofulfillOrderId) updateFields['Innofulfill Order ID'] = innofulfillOrderId;
          if (awbNumber) {
            updateFields['AWB Number'] = awbNumber;
            updateFields['Tracking ID'] = awbNumber;
          }
          updateFields['Innofulfill Error'] = '';

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
        awbNumber: awbNumber || null,
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
