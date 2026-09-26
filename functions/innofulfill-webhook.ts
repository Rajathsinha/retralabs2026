import {
  corsHeaders,
  getAirtableConfig,
  patchAirtableRecord,
  sanitizeAwb,
  sendAwbAssignedEmail,
} from './order-shared';

/**
 * Innofulfill order-status webhook.
 *
 * Their scheme (per the portal's "How to match webhook signature"):
 *   hex(HMAC-SHA256(rawBody, secret)) compared against x-webhook-signature.
 *
 * Note this is NOT the same as Cashfree's, which is base64 and prefixes the
 * body with a timestamp — sharing one verifier between them would reject every
 * event from both.
 *
 * Subscribe events at portal.innofulfill.com/settings/webhooks with the target
 * URL https://retralabs.in/api/innofulfill-webhook.
 */

const SIGNATURE_HEADER = 'x-webhook-signature';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Length-independent comparison, so a wrong signature leaks no timing signal. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function pickString(source: Record<string, unknown> | undefined, ...names: string[]): string | undefined {
  if (!source) return undefined;
  for (const name of names) {
    const value = source[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
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

/** Their event names look like "ecomm.order_status.ready_for_dispatch". */
function humanizeStatus(raw: string): string {
  const leaf = raw.split('.').pop() || raw;
  return leaf
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export const handler = async (event: { httpMethod?: string; body?: string; headers?: Record<string, string> }) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: '' };

  try {
    const secret = (process.env.INNOFULFILL_WEBHOOK_SECRET || '').trim();
    if (!secret) {
      console.error('[InnofulfillWebhook] INNOFULFILL_WEBHOOK_SECRET is not set');
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Webhook not configured' }) };
    }

    const rawBody = event.body || '';
    const headers = event.headers || {};
    const headerKey = Object.keys(headers).find(h => h.toLowerCase() === SIGNATURE_HEADER);
    const signature = headerKey ? headers[headerKey].trim() : '';

    const expected = await hmacSha256Hex(secret, rawBody);
    if (!signature || !timingSafeEqual(expected.toLowerCase(), signature.toLowerCase())) {
      console.error('[InnofulfillWebhook] Signature verification failed');
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const data = (payload.data || payload.order || payload) as Record<string, unknown>;
    const shipment = (data.shipments as Array<Record<string, unknown>> | undefined)?.[0];

    // Our order number is what we send them as referenceId at booking time.
    const referenceId = pickString(data, 'referenceId', 'reference_id', 'referenceNumber');
    const eventName = pickString(payload, 'event', 'eventName', 'type', 'triggerEventName') || '';
    const statusRaw =
      pickString(data, 'orderStatus', 'status', 'currentStatus') ||
      pickString(shipment, 'shipmentStatus', 'status') ||
      eventName;

    if (!referenceId) {
      // Without our reference there is nothing to attach this to. Log the shape
      // (keys only — the payload carries customer addresses) so the mapping can
      // be corrected, and 200 it so they don't retry something we can't use.
      console.error(
        `[InnofulfillWebhook] No referenceId in ${eventName || 'event'}; payload keys: ${Object.keys(payload).join(', ')}; data keys: ${Object.keys(data).join(', ')}`,
      );
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true, matched: false }) };
    }

    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) throw new Error('Airtable not configured');

    const record = await findRecordByOrderId(baseId, table, token, referenceId);
    if (!record) {
      console.warn(`[InnofulfillWebhook] No order found for reference ${referenceId}`);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true, matched: false }) };
    }

    const fields = record.fields || {};
    const awbNumber = sanitizeAwb(
      pickString(shipment, 'awbNumber', 'trackingNumber', 'awb') ||
      pickString(data, 'awbNumber', 'trackingNumber'),
    );
    const documentNo = pickString(data, 'documentNo', 'documentNumber', 'docNo', 'orderNumber');
    const innofulfillId = pickString(data, 'orderId', 'id');
    const carrier = pickString(shipment, 'carrierDisplayName', 'carrierName') ||
      pickString(data, 'carrierDisplayName', 'carrierName');

    /*
     * Deliberately never writes `Status`. That column carries payment state
     * (PAYMENT_CONFIRMED), which recordIsPaid reads to decide whether an order
     * is paid — overwriting it with a shipment status would make a paid order
     * look unpaid to checkout and to the status endpoint.
     */
    const patch: Record<string, unknown> = {
      'Shipment Status': humanizeStatus(statusRaw),
    };
    if (awbNumber) {
      patch['AWB Number'] = awbNumber;
      patch['Tracking ID'] = awbNumber;
    }
    if (innofulfillId && !fields['Innofulfill Order ID']) patch['Innofulfill Order ID'] = innofulfillId;
    if (documentNo && !awbNumber && !fields['Tracking ID']) patch['Tracking ID'] = documentNo;
    if (carrier) patch['Carrier Display Name'] = carrier;

    await patchAirtableRecord(baseId, table, token, record.id, patch);

    console.log(`[InnofulfillWebhook] ${referenceId}: ${eventName || 'status'} -> ${humanizeStatus(statusRaw)}`);

    // Tell the customer their parcel is moving, once, when an AWB first exists.
    if (awbNumber && !fields['AWB Email Sent']) {
      await sendAwbAssignedEmail(
        baseId, table, token, record.id,
        { name: String(fields.Name || 'Customer'), email: String(fields.Email || '') },
        referenceId, awbNumber, carrier || 'Innofulfill', null,
      );
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true, matched: true }) };
  } catch (err) {
    console.error('[InnofulfillWebhook] Error:', err);
    // A 5xx asks them to retry, which is what we want for a transient fault.
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
