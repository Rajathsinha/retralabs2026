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
  'Shiprocket Order ID'?: string;
  'Shiprocket Shipment ID'?: string;
  'Tracking ID'?: string;
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

// ── Shiprocket ────────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getShiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Shiprocket auth failed (HTTP ${res.status}): ${detail}`);
  }
  const json: any = await res.json();
  const token = json?.token as string | undefined;
  if (!token) throw new Error('Shiprocket auth: no token in response');
  cachedToken = { token, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
  return token;
}

function splitAddress(address: string): { address: string; city: string; state: string; pincode: string } {
  const pinMatch = address.match(/\b(\d{6})\b/);
  const pincode = pinMatch ? pinMatch[1] : '';
  const withoutPin = address.replace(/,?\s*PIN:?\s*\d{6}\b/i, '').replace(/\b\d{6}\b/, '').trim().replace(/,\s*$/, '');
  return { address: withoutPin || address, city: '', state: '', pincode };
}

async function createShiprocketOrder(
  token: string,
  orderId: string,
  customer: { name: string; email: string; phone: string; address: string; pincode: string },
  cartItems: CartLineItem[],
  total: number,
  deliveryCharge: number,
  codCharge: number,
  paymentMethod: 'prepay' | 'cod',
): Promise<{ shiprocketOrderId?: string; shipmentId?: string }> {
  const addr = splitAddress(customer.address || `${customer.address}, PIN: ${customer.pincode}`);
  const finalPincode = customer.pincode || addr.pincode;

  const subTotal = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingCost = deliveryCharge + codCharge;
  const discount = Math.max(0, subTotal - total + shippingCost);

  const products = cartItems.map((item) => ({
    name: item.name,
    sku: item.variant.replace(/\s+/g, '-').toUpperCase().slice(0, 40),
    units: item.quantity,
    selling_price: String(item.unitPrice),
    discount: '0',
  }));

  const payload = {
    order_id: orderId,
    order_date: new Date().toISOString().slice(0, 10),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
    billing_customer_name: customer.name.slice(0, 70),
    billing_last_name: '',
    billing_address: addr.address.slice(0, 200),
    billing_address_2: '',
    billing_city: process.env.SHIPROCKET_DEFAULT_CITY || 'Mumbai',
    billing_pincode: finalPincode,
    billing_state: process.env.SHIPROCKET_DEFAULT_STATE || 'Maharashtra',
    billing_country: 'India',
    billing_email: customer.email,
    billing_phone: customer.phone,
    shipping_is_billing: true,
    shipping_customer_name: '',
    shipping_address: '',
    shipping_address_2: '',
    shipping_city: '',
    shipping_pincode: '',
    shipping_state: '',
    shipping_country: '',
    shipping_email: '',
    shipping_phone: '',
    order_items: products,
    payment_method: paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    sub_total: String(total),
    length: '10',
    breadth: '10',
    height: '10',
    weight: '0.5',
    shipping_charges: String(shippingCost),
    discount: String(discount),
  };

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof json?.error === 'string'
        ? json.error
        : json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`Shiprocket: ${detail}`);
  }

  return {
    shiprocketOrderId: String(json?.order_id ?? ''),
    shipmentId: String(json?.shipment_id ?? ''),
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
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const table = process.env.AIRTABLE_TABLE || 'Orders';

    if (!token || !baseId) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Airtable is not configured (missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID env vars in Netlify)' }),
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

    // 3. Create order in Shiprocket (COD orders only)
    let shiprocketWarning: string | undefined;
    let shiprocketOrderId: string | undefined;
    let shiprocketShipmentId: string | undefined;

    if (body.paymentMethod === 'cod' && body.cartItems?.length) {
      try {
        const srToken = await getShiprocketToken();
        if (srToken) {
          const sr = await createShiprocketOrder(
            srToken,
            orderId,
            body.customer,
            body.cartItems,
            body.total,
            body.deliveryCharge,
            body.codCharge,
            body.paymentMethod,
          );
          shiprocketOrderId = sr.shiprocketOrderId;
          shiprocketShipmentId = sr.shipmentId;

          // 4. Update Airtable with Shiprocket IDs and status
          const updateFields: Record<string, unknown> = {
            Status: 'Created in Shiprocket',
          };
          if (shiprocketOrderId) updateFields['Shiprocket Order ID'] = shiprocketOrderId;
          if (shiprocketShipmentId) updateFields['Shiprocket Shipment ID'] = shiprocketShipmentId;

          await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields: updateFields, typecast: true }),
            },
          );
        } else {
          shiprocketWarning = 'Shiprocket not configured (missing SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD)';
        }
      } catch (srErr) {
        shiprocketWarning = srErr instanceof Error ? srErr.message : String(srErr);
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        recordId,
        orderId,
        shiprocketOrderId: shiprocketOrderId || null,
        shiprocketShipmentId: shiprocketShipmentId || null,
        shiprocketWarning,
        screenshotWarning,
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
