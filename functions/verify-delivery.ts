import { routeShipment, isValidPincodeFormat } from './delivery-shared';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

/**
 * Reports which delivery options are available for a PIN code.
 *
 * Every PIN is deliverable, so this never refuses an order. It answers one
 * question: does Innofulfill serve this PIN, and therefore can Express be
 * offered? The checkout uses it to show or hide Express. Routing is decided
 * again server-side at order time — see delivery-shared.ts.
 */
export const handler = async (event: { httpMethod?: string; body?: string }) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}') as {
      pincode?: string;
      paymentMethod?: 'prepay' | 'cod';
    };

    const pincode = String(body.pincode ?? '').trim();
    const paymentMethod = body.paymentMethod === 'cod' ? 'cod' : 'prepay';

    if (!isValidPincodeFormat(pincode)) {
      return json(200, { outcome: 'invalid_format', pincode });
    }

    const routing = await routeShipment(pincode, paymentMethod);

    return json(200, {
      outcome: 'ok',
      pincode,
      // Always true. Kept explicit so the client never has to infer it.
      deliverable: true,
      expressAvailable: routing.expressAvailable,
      provider: routing.provider,
      indeterminate: routing.indeterminate,
      // Why Express is unavailable. Shown to no one directly, but it is the
      // difference between "Innofulfill declined this PIN" and "we could not
      // reach Innofulfill", which must not read the same to a customer.
      reason: routing.reason ?? null,
    });
  } catch (err) {
    console.error('[verify-delivery]', err);
    // Never block checkout on our own failure: standard delivery still applies.
    return json(200, {
      outcome: 'ok',
      deliverable: true,
      expressAvailable: false,
      provider: 'Shiprocket',
      indeterminate: true,
    });
  }
};
