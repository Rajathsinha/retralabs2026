import { isValidPincodeFormat, canonicalRegion } from './delivery-shared';
import {
  PAYMENT_STATUS,
  SHIPMENT_STATUS,
  corsHeaders,
  generateOrderId,
  getAirtableConfig,
  isPaymentConfirmed,
  patchAirtableRecord,
  paymentSessionExpiresAt,
  processLogistics,
  type CartLineItem,
  type OrderFields,
} from './order-shared';

interface CreateOrderBody {
  action?: 'create' | 'init_payment_session';
  fields: OrderFields;
  screenshot?: { contentType: string; filename: string; base64: string };
  cartItems?: CartLineItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: 'prepay' | 'cod';
  deliveryOption?: 'normal' | 'fast';
  total: number;
  deliveryCharge: number;
  codCharge: number;
  skipLogistics?: boolean;
}

/**
 * Validates the destination server-side.
 *
 * Every Indian PIN is deliverable, so this never refuses an order on delivery
 * grounds. It only rejects input that is structurally wrong — a malformed PIN
 * or a state outside the official list — because those break carrier booking.
 * Which carrier actually ships is decided in processLogistics, never here and
 * never by the client.
 */
function validateDestination(
  customer: CreateOrderBody['customer'],
): { state?: string; error?: string } {
  const pincode = String(customer?.pincode ?? '').trim();
  if (!isValidPincodeFormat(pincode)) {
    return { error: 'Please enter a valid 6-digit PIN code.' };
  }
  const state = canonicalRegion(customer?.state);
  if (!state) {
    return { error: 'Please select a valid Indian state or union territory.' };
  }
  return { state };
}

async function uploadScreenshot(
  baseId: string,
  recordId: string,
  token: string,
  screenshot: { contentType: string; filename: string; base64: string },
): Promise<string | undefined> {
  try {
    const uploadRes = await fetch(
      `https://content.airtable.com/v0/${baseId}/${recordId}/Screenshot/uploadAttachment`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: screenshot.contentType,
          filename: screenshot.filename,
          file: screenshot.base64,
        }),
      },
    );
    if (!uploadRes.ok) {
      const errJson: { error?: string | { message?: string } } = await uploadRes.json().catch(() => ({}));
      const detail = typeof errJson?.error === 'string' ? errJson.error : errJson?.error?.message || `HTTP ${uploadRes.status}`;
      return `Screenshot upload failed: ${detail}`;
    }
  } catch (uploadErr) {
    return uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
  }
  return undefined;
}

export const handler = async (event: { httpMethod?: string; body?: string }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Airtable not configured' }) };
    }

    const body = JSON.parse(event.body || '{}') as CreateOrderBody;
    if (!body.fields?.Name || !body.fields?.Email) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing required order fields' }) };
    }

    // Validate the destination before anything is persisted.
    let verifiedState = body.customer?.state ?? '';
    const verifiedCity = body.customer?.city ?? '';

    if (body.customer?.pincode) {
      const destination = validateDestination(body.customer);
      if (destination.error || !destination.state) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: destination.error || 'Invalid delivery address.' }),
        };
      }
      verifiedState = destination.state;
    }

    const orderId = await generateOrderId(baseId, table, token);
    const isCod = body.paymentMethod === 'cod';
    const paymentStatus = isCod ? PAYMENT_STATUS.CONFIRMED : PAYMENT_STATUS.PENDING;
    const sessionStartedAt = new Date().toISOString();
    const sessionExpiresAt = new Date(paymentSessionExpiresAt(sessionStartedAt)).toISOString();

    const fieldsToSave: Record<string, unknown> = {
      ...body.fields,
      orderID: orderId,
      Status: 'ORDER_CREATED',
      'Payment Status': paymentStatus,
      'Shipment Status': SHIPMENT_STATUS.NOT_CREATED,
    };

    if (!isCod) {
      fieldsToSave['Payment Session Started At'] = sessionStartedAt;
      fieldsToSave['Payment Session Expires At'] = sessionExpiresAt;
    }

    let recordId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const createRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fieldsToSave, typecast: true }),
        },
      );
      const createJson: { id?: string; error?: string | { message?: string } } = await createRes.json().catch(() => ({}));
      if (createRes.ok) {
        recordId = createJson?.id || null;
        break;
      }
      const detail = typeof createJson?.error === 'string' ? createJson.error : createJson?.error?.message || `HTTP ${createRes.status}`;
      const unknownMatch = detail.match(/Unknown field name: ["']?([^"')]+)["']?/i);
      if (unknownMatch) {
        delete fieldsToSave[unknownMatch[1]];
        continue;
      }
      return { statusCode: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Airtable: ${detail}` }) };
    }

    if (!recordId) {
      return { statusCode: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Airtable: failed to create record' }) };
    }

    let screenshotWarning: string | undefined;
    if (body.screenshot?.base64) {
      screenshotWarning = await uploadScreenshot(baseId, recordId, token, body.screenshot);
    }

    let logistics = {
      innofulfillOrderId: null as string | null,
      awbNumber: null as string | null,
      shipmentStatus: SHIPMENT_STATUS.NOT_CREATED,
      carrierDisplayName: null as string | null,
      warning: null as string | null,
    };

    const shouldProcessLogistics =
      !body.skipLogistics &&
      body.cartItems?.length &&
      isPaymentConfirmed(paymentStatus, body.paymentMethod);

    if (shouldProcessLogistics) {
      const result = await processLogistics(baseId, table, token, recordId, orderId, {
        cartItems: body.cartItems!,
        // Verified server-side above — never the client's state/city.
        customer: { ...body.customer, state: verifiedState, city: verifiedCity },
        paymentMethod: body.paymentMethod,
        deliveryOption: body.deliveryOption,
        total: body.total,
        deliveryCharge: body.deliveryCharge,
        codCharge: body.codCharge,
      });
      logistics = {
        innofulfillOrderId: result.innofulfillOrderId || null,
        awbNumber: result.awbNumber || null,
        shipmentStatus: result.shipmentStatus,
        carrierDisplayName: result.carrierDisplayName || null,
        warning: result.warning || null,
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        recordId,
        orderId,
        paymentStatus,
        paymentSessionExpiresAt: isCod ? null : sessionExpiresAt,
        paymentSessionSeconds: isCod ? null : 300,
        innofulfillOrderId: logistics.innofulfillOrderId,
        awbNumber: logistics.awbNumber,
        shipmentStatus: logistics.shipmentStatus,
        carrierDisplayName: logistics.carrierDisplayName,
        innofulfillWarning: logistics.warning,
        screenshotWarning: screenshotWarning || null,
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

export { getInnofulfillToken, createInnofulfillOrder } from './order-shared';
