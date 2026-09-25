/**
 * Cashfree Payment Gateway — Hosted Checkout integration helpers.
 *
 * API reference: Orders API v2023-08-01 (https://www.cashfree.com/docs/api-reference/payments/latest/orders/create).
 * Sandbox base: https://sandbox.cashfree.com/pg · Production base: https://api.cashfree.com/pg
 *
 * Webhook signature verification (x-webhook-signature): base64(HMAC-SHA256(secret, timestamp + rawBody)),
 * compared against the x-webhook-timestamp + x-webhook-signature headers. Must run against the raw,
 * unparsed request body — re-serializing the parsed JSON changes numeric formatting and breaks the signature.
 */

export interface CashfreeConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  apiVersion: string;
  mode: 'sandbox' | 'production';
}

export function getCashfreeConfig(): CashfreeConfig | null {
  const clientId = (process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID || '').trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!clientId || !clientSecret) return null;

  const envValue = (process.env.CASHFREE_ENV || process.env.CASHFREE_ENVIRONMENT || 'production').trim().toLowerCase();
  const isSandbox = ['sandbox', 'test', 'testing', 'staging'].includes(envValue);
  const mode: 'sandbox' | 'production' = isSandbox ? 'sandbox' : 'production';
  const baseUrl = mode === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

  return { clientId, clientSecret, baseUrl, apiVersion: '2023-08-01', mode };
}

function cashfreeHeaders(cfg: CashfreeConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-client-id': cfg.clientId,
    'x-client-secret': cfg.clientSecret,
    'x-api-version': cfg.apiVersion,
  };
}

function cleanPhoneForCashfree(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '').slice(-10);
  return digits.padStart(10, '0');
}

export interface CreateCashfreeOrderResult {
  paymentSessionId: string;
  cfOrderId: string;
  orderStatus: string;
}

export async function createCashfreeOrder(
  cfg: CashfreeConfig,
  orderId: string,
  amount: number,
  customer: { name: string; email: string; phone: string },
  returnUrl: string,
  notifyUrl: string,
): Promise<CreateCashfreeOrderResult> {
  const res = await fetch(`${cfg.baseUrl}/orders`, {
    method: 'POST',
    headers: cashfreeHeaders(cfg),
    body: JSON.stringify({
      order_id: orderId,
      order_amount: Number(amount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: orderId,
        customer_name: (customer.name || 'Customer').slice(0, 60),
        customer_email: customer.email || 'orders@retralabs.in',
        customer_phone: cleanPhoneForCashfree(customer.phone),
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
    }),
  });

  const json: { payment_session_id?: string; cf_order_id?: number | string; order_status?: string; message?: string } =
    await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Cashfree: ${json?.message || `HTTP ${res.status}`}`);
  }
  if (!json?.payment_session_id) {
    throw new Error('Cashfree: no payment_session_id in response');
  }

  return {
    paymentSessionId: json.payment_session_id,
    cfOrderId: json.cf_order_id != null ? String(json.cf_order_id) : '',
    orderStatus: json.order_status || 'ACTIVE',
  };
}

export interface CashfreeOrderStatus {
  orderStatus: string;
}

export async function fetchCashfreeOrder(cfg: CashfreeConfig, orderId: string): Promise<CashfreeOrderStatus> {
  const res = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    headers: cashfreeHeaders(cfg),
  });
  const json: { order_status?: string; message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Cashfree: ${json?.message || `HTTP ${res.status}`}`);
  }
  return { orderStatus: json?.order_status || '' };
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Length-independent comparison, so a wrong signature leaks no timing signal. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCashfreeWebhookSignature(
  clientSecret: string,
  timestamp: string | null | undefined,
  rawBody: string,
  signature: string | null | undefined,
): Promise<boolean> {
  if (!timestamp || !rawBody || !signature) return false;
  const expected = await hmacSha256Base64(clientSecret, timestamp + rawBody);
  return timingSafeEqual(expected, signature);
}
