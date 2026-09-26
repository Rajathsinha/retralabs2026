import {
  PAYMENT_STATUS,
  confirmPaymentAndFulfill,
  corsHeaders,
  getAirtableConfig,
  isPaymentConfirmed,
  patchAirtableRecord,
} from './order-shared';
import { getCashfreeConfig, fetchCashfreeOrder } from './cashfree-shared';

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

const TERMINAL_FAILURE_STATUSES = new Set(['EXPIRED', 'TERMINATED', 'TERMINATION_REQUESTED']);

/**
 * Customer-facing fallback for the Cashfree Hosted Checkout return page.
 *
 * The webhook (cashfree-webhook.ts) is the source of truth for confirming
 * payment, but it can land a few seconds after the browser redirect does —
 * this lets the return page ask Cashfree directly ("what actually happened
 * to this order?") instead of trusting the redirect's own query string,
 * which anyone could tamper with. Idempotent either way.
 */
export const handler = async (
  event: { httpMethod?: string; queryStringParameters?: Record<string, string> },
  context?: { waitUntil?: (work: Promise<unknown>) => void },
) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const orderId = (event.queryStringParameters?.orderId || '').trim();
    if (!orderId) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'orderId is required' }) };
    }

    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Airtable not configured' }) };
    }

    const record = await findRecordByOrderId(baseId, table, token, orderId);
    if (!record) {
      return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order not found' }) };
    }

    let fields = record.fields || {};
    let paymentStatus = String(fields['Payment Status'] || '');

    // Distinguishes "Cashfree says they haven't paid" from "we couldn't reach
    // Cashfree to ask". Collapsing those two into one answer is what let the
    // checkout tell paying customers they hadn't been charged.
    let verified = true;

    if (!isPaymentConfirmed(paymentStatus)) {
      const cfg = getCashfreeConfig();
      if (!cfg) verified = false;
      if (cfg) {
        try {
          const cfOrder = await fetchCashfreeOrder(cfg, orderId);
          if (cfOrder.orderStatus === 'PAID') {
            await confirmPaymentAndFulfill(
              baseId, table, token, record.id, orderId, fields, undefined,
              context?.waitUntil?.bind(context),
            );
            const freshRes = await fetch(
              `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${record.id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (freshRes.ok) {
              const freshJson: { fields?: Record<string, unknown> } = await freshRes.json();
              fields = freshJson.fields || fields;
              paymentStatus = String(fields['Payment Status'] || '');
            }
          } else if (TERMINAL_FAILURE_STATUSES.has(cfOrder.orderStatus) && !isPaymentConfirmed(paymentStatus)) {
            await patchAirtableRecord(baseId, table, token, record.id, {
              'Payment Status': PAYMENT_STATUS.FAILED,
              Status: 'PAYMENT_FAILED',
            });
            paymentStatus = PAYMENT_STATUS.FAILED;
          }
        } catch (cfErr) {
          verified = false;
          console.error(`[CashfreeOrderStatus] Cashfree lookup failed for ${orderId}:`, cfErr);
        }
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        orderId,
        paymentStatus,
        confirmed: isPaymentConfirmed(paymentStatus),
        verified,
        awbNumber: fields['AWB Number'] || null,
        innofulfillOrderId: fields['Innofulfill Order ID'] || null,
        shipmentStatus: fields['Shipment Status'] || null,
        carrierDisplayName: fields['Carrier Display Name'] || null,
        total: fields['Total (₹)'] || null,
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
