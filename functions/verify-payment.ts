import { requireAdmin } from './admin-auth';
import {
  PAYMENT_STATUS,
  corsHeaders,
  getAirtableConfig,
  isPaymentConfirmed,
  patchAirtableRecord,
  processLogistics,
  type CartLineItem,
} from './order-shared';

interface VerifyPaymentBody {
  recordId: string;
  adminPassword?: string;
  cartItems?: CartLineItem[];
  customer?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod?: 'prepay' | 'cod';
  deliveryOption?: 'normal' | 'fast';
  total?: number;
  deliveryCharge?: number;
  codCharge?: number;
}

export const handler = async (event: { httpMethod?: string; body?: string; headers?: Record<string, string> }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Admin-only: this route exposes or mutates order data.
  const denied = await requireAdmin(event);
  if (denied) return denied;
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const expectedPassword = (process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '').trim();
    const body = JSON.parse(event.body || '{}') as VerifyPaymentBody;
    if (expectedPassword && body.adminPassword !== expectedPassword) {
      return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId || !body.recordId) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing configuration or recordId' }) };
    }

    const recordRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${body.recordId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!recordRes.ok) {
      return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order not found' }) };
    }

    const recordJson: { fields?: Record<string, string | number> } = await recordRes.json();
    const fields = recordJson.fields || {};
    const paymentStatus = String(fields['Payment Status'] || '');
    const orderId = String(fields.orderID || '');

    if (isPaymentConfirmed(paymentStatus)) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, duplicate: true, paymentStatus: PAYMENT_STATUS.CONFIRMED, orderId }),
      };
    }

    if (paymentStatus !== PAYMENT_STATUS.PROOF_SUBMITTED && paymentStatus !== PAYMENT_STATUS.PENDING) {
      return { statusCode: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Cannot verify payment from status ${paymentStatus || 'unknown'}` }) };
    }

    await patchAirtableRecord(baseId, table, token, body.recordId, {
      'Payment Status': PAYMENT_STATUS.CONFIRMED,
      Status: 'PAYMENT_CONFIRMED',
    });

    let logistics = null;
    if (body.cartItems?.length && body.customer && orderId) {
      logistics = await processLogistics(baseId, table, token, body.recordId, orderId, {
        cartItems: body.cartItems,
        customer: body.customer,
        paymentMethod: body.paymentMethod || 'prepay',
        deliveryOption: body.deliveryOption,
        total: body.total || Number(fields['Total (₹)'] || 0),
        deliveryCharge: body.deliveryCharge || 0,
        codCharge: body.codCharge || 0,
      });
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        orderId,
        paymentStatus: PAYMENT_STATUS.CONFIRMED,
        logistics,
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
