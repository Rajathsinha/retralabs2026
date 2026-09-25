import {
  PAYMENT_STATUS,
  confirmPaymentAndFulfill,
  corsHeaders,
  getAirtableConfig,
  isPaymentConfirmed,
  patchAirtableRecord,
} from './order-shared';
import { getCashfreeConfig, verifyCashfreeWebhookSignature } from './cashfree-shared';

interface CashfreeWebhookPayload {
  type?: string;
  data?: {
    order?: { order_id?: string };
    payment?: { payment_status?: string; cf_payment_id?: number | string; bank_reference?: string };
  };
}

async function findRecordByOrderId(
  baseId: string,
  table: string,
  token: string,
  orderId: string,
): Promise<{ id: string; fields?: Record<string, unknown> } | null> {
  const filterFormula = encodeURIComponent(`{orderID} = "${orderId}"`);
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${filterFormula}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const json: { records?: Array<{ id: string; fields?: Record<string, unknown> }> } = await res.json();
  return json.records?.[0] || null;
}

/**
 * Cashfree server-to-server payment notification. This is the primary path
 * that moves a prepaid order from PAYMENT_PENDING to PAYMENT_CONFIRMED and
 * books the shipment — replacing the old manual UTR/screenshot review.
 *
 * Every request must carry a valid x-webhook-signature (HMAC-SHA256 of
 * "<x-webhook-timestamp><raw body>" using the Cashfree secret key, base64
 * encoded) or it is rejected. The signature check runs against the raw,
 * unparsed body on purpose — see cashfree-shared.ts.
 */
export const handler = async (event: { httpMethod?: string; body?: string; headers?: Record<string, string> }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: '' };
  }

  try {
    const cfg = getCashfreeConfig();
    if (!cfg) {
      console.error('[CashfreeWebhook] Cashfree is not configured');
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Cashfree is not configured' }) };
    }

    const rawBody = event.body || '';
    const headers = event.headers || {};
    const headerValue = (name: string): string => {
      const key = Object.keys(headers).find((h) => h.toLowerCase() === name);
      return key ? headers[key] : '';
    };
    const signature = headerValue('x-webhook-signature');
    const timestamp = headerValue('x-webhook-timestamp');

    const valid = await verifyCashfreeWebhookSignature(cfg.clientSecret, timestamp, rawBody, signature);
    if (!valid) {
      console.error('[CashfreeWebhook] Signature verification failed');
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
    const orderId = payload?.data?.order?.order_id;
    const paymentStatus = payload?.data?.payment?.payment_status;

    if (!orderId) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true }) };
    }

    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) throw new Error('Airtable not configured');

    const record = await findRecordByOrderId(baseId, table, token, orderId);
    if (!record) {
      console.warn(`[CashfreeWebhook] No order found for ${orderId}`);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true }) };
    }

    const fields = record.fields || {};

    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS') {
      const txnRef = payload?.data?.payment?.cf_payment_id
        ? String(payload.data.payment.cf_payment_id)
        : payload?.data?.payment?.bank_reference || undefined;
      await confirmPaymentAndFulfill(baseId, table, token, record.id, orderId, fields, txnRef);
    } else if (payload.type === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
      const currentStatus = String(fields['Payment Status'] || '');
      if (!isPaymentConfirmed(currentStatus)) {
        await patchAirtableRecord(baseId, table, token, record.id, {
          'Payment Status': PAYMENT_STATUS.FAILED,
          Status: 'PAYMENT_FAILED',
        });
      }
    }
    // PAYMENT_USER_DROPPED_WEBHOOK and other event types: no state change —
    // the order stays PENDING and the customer can retry from checkout.

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('[CashfreeWebhook] Error:', err);
    // A 5xx makes Cashfree retry the delivery, which is what we want for a
    // transient failure on our end (Airtable hiccup, etc).
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
