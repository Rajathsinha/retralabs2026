import { corsHeaders } from './order-shared';
import { getCashfreeConfig, createCashfreeOrder } from './cashfree-shared';

const SITE_ORIGIN = 'https://retralabs.in';

interface CreateCashfreeOrderBody {
  recordId?: string;
  orderId?: string;
  amount?: number;
  customer?: { name: string; email: string; phone: string };
}

/**
 * Starts a Cashfree Hosted Checkout session for an order already created
 * (as PAYMENT_PENDING) via /api/create-order. Returns a payment_session_id
 * the frontend hands to Cashfree's JS SDK to redirect the customer to
 * Cashfree's own payment page.
 */
export const handler = async (event: { httpMethod?: string; body?: string }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const cfg = getCashfreeConfig();
    if (!cfg) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Cashfree is not configured' }) };
    }

    const body = JSON.parse(event.body || '{}') as CreateCashfreeOrderBody;
    if (!body.recordId || !body.orderId || !body.amount || body.amount <= 0) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'recordId, orderId, and a positive amount are required' }) };
    }

    const returnUrl = `${SITE_ORIGIN}/checkout?cf_return=1&order_id={order_id}`;
    const notifyUrl = `${SITE_ORIGIN}/api/cashfree-webhook`;

    const result = await createCashfreeOrder(
      cfg,
      body.orderId,
      body.amount,
      body.customer || { name: 'Customer', email: '', phone: '' },
      returnUrl,
      notifyUrl,
    );

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, paymentSessionId: result.paymentSessionId, mode: cfg.mode }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
