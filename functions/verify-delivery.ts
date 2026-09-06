import { resolveDelivery } from './delivery-shared';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/** Outcomes the checkout renders. Each maps to one message the customer sees. */
export type DeliveryOutcome =
  | 'ok'              // PIN verified and a carrier will deliver
  | 'invalid_format'  // not six digits
  | 'not_found'       // well-formed PIN that does not exist
  | 'unavailable'     // we could not reach the lookup — retryable, not the customer's fault
  | 'undeliverable';  // PIN is real but no carrier serves it

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

/**
 * Verifies a PIN code and reports whether we can deliver to it.
 *
 * Called from the checkout as the customer types. The same logic runs again in
 * create-order, so this endpoint is a convenience for the UI, never the
 * authority — see delivery-shared.ts.
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

    const { pin, serviceability, checkedAt } = await resolveDelivery(pincode, paymentMethod);

    if (pin.status === 'invalid') {
      return json(200, { outcome: 'invalid_format' satisfies DeliveryOutcome, pincode });
    }
    if (pin.status === 'not_found') {
      return json(200, { outcome: 'not_found' satisfies DeliveryOutcome, pincode });
    }
    if (pin.status === 'unavailable') {
      return json(200, { outcome: 'unavailable' satisfies DeliveryOutcome, pincode });
    }

    const location = {
      pincode: pin.pincode,
      state: pin.state,
      district: pin.district,
      city: pin.city,
      areas: pin.areas ?? [],
    };

    // Carriers unreachable: the address is real, so let the order through and
    // let server-side routing retry at order time rather than blocking a sale
    // on our own outage.
    if (!serviceability || serviceability.indeterminate) {
      return json(200, {
        outcome: 'ok' satisfies DeliveryOutcome,
        location,
        deliverable: true,
        provider: null,
        carrierCheck: 'indeterminate',
        checkedAt,
      });
    }

    if (!serviceability.serviceable) {
      return json(200, {
        outcome: 'undeliverable' satisfies DeliveryOutcome,
        location,
        deliverable: false,
        reason: serviceability.reason ?? null,
        checkedAt,
      });
    }

    return json(200, {
      outcome: 'ok' satisfies DeliveryOutcome,
      location,
      deliverable: true,
      provider: serviceability.provider,
      carrierCheck: 'confirmed',
      checkedAt,
    });
  } catch (err) {
    console.error('[verify-delivery]', err);
    // Surface as retryable rather than as a bad PIN.
    return json(200, { outcome: 'unavailable' satisfies DeliveryOutcome });
  }
};
