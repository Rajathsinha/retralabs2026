import { handler as createOrder } from './create-order';
import { handler as confirmPayment } from './confirm-payment';
import { handler as submitPaymentProof } from './submit-payment-proof';
import { handler as verifyPayment } from './verify-payment';
import { handler as trackOrder } from './track-order';
import { handler as listOrders } from './list-orders';
import { handler as brevoOrderEmail } from './brevo-order-email';
import { handler as pushToInnofulfill } from './push-to-innofulfill';
import { handler as pushToShiprocket } from './push-to-shiprocket';
import { handler as checkInnofulfillServiceability } from './check-innofulfill-serviceability';
import { handler as verifyDelivery } from './verify-delivery';
import { handler as adminLogin } from './admin-login';
import { handler as adminCreateManualOrder } from './admin-create-manual-order';
import { handler as adminDeleteOrders } from './admin-delete-orders';
import { handler as adminUpdateOrders } from './admin-update-orders';

// Polyfill globalThis.process for Node-style env access in Cloudflare edge runtime
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} };
} else if (!globalThis.process.env) {
  (globalThis as any).process.env = {};
}

const HANDLERS: Record<string, (event: any, context?: any) => Promise<any>> = {
  'create-order': createOrder,
  'confirm-payment': confirmPayment,
  'submit-payment-proof': submitPaymentProof,
  'verify-payment': verifyPayment,
  'track-order': trackOrder,
  'list-orders': listOrders,
  'brevo-order-email': brevoOrderEmail,
  'push-to-shiprocket': pushToShiprocket,
  'push-to-innofulfill': pushToInnofulfill,
  'check-innofulfill-serviceability': checkInnofulfillServiceability,
  'verify-delivery': verifyDelivery,
  'admin-login': adminLogin,
  'admin-create-manual-order': adminCreateManualOrder,
  'admin-delete-orders': adminDeleteOrders,
  'admin-update-orders': adminUpdateOrders,
};

export const onRequest: PagesFunction<Record<string, string>> = async (context) => {
  const { request, env, params } = context;

  // Safely inject env vars into process.env with case-insensitivity
  if (env) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string') {
        globalThis.process.env[k] = v;
        globalThis.process.env[k.toUpperCase()] = v;
      }
    }
  }

  const pathParts = (params.path as string[]) || [];
  const functionName = pathParts[pathParts.length - 1] || pathParts[0];

  // Handle CORS OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      },
    });
  }

  const handlerFn = HANDLERS[functionName];

  // If not an API route, fall back to static assets (HTML/JS/CSS)
  if (!handlerFn) {
    return context.next();
  }

  const url = new URL(request.url);
  const queryStringParameters: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    queryStringParameters[k] = v;
  });

  let body = '';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  const event = {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters,
    body,
    path: url.pathname,
  };

  try {
    const res = await handlerFn(event, context);
    const responseBody = typeof res?.body === 'string' ? res.body : JSON.stringify(res?.body ?? {});
    return new Response(responseBody, {
      status: res?.statusCode || 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...(res?.headers || {}),
      },
    });
  } catch (err: any) {
    console.error(`[Cloudflare Function Error] ${functionName}:`, err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost = onRequest;
export const onRequestGet = onRequest;
export const onRequestOptions = onRequest;
