import {
  PAYMENT_STATUS,
  corsHeaders,
  getAirtableConfig,
  isPaymentSessionExpired,
  patchAirtableRecord,
  processLogistics,
  type CartLineItem,
} from './order-shared';

interface ConfirmPaymentBody {
  recordId: string;
  orderId: string;
  transaction: string;
  screenshot?: { contentType: string; filename: string; base64: string };
  cartItems: CartLineItem[];
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

    const body = JSON.parse(event.body || '{}') as ConfirmPaymentBody;
    if (!body.recordId || !body.orderId || !body.transaction?.trim()) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'recordId, orderId, and transaction are required' }) };
    }

    const recordRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${body.recordId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!recordRes.ok) {
      return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order not found' }) };
    }

    const recordJson: { fields?: Record<string, string> } = await recordRes.json();
    const fields = recordJson.fields || {};
    const existingPaymentStatus = (fields['Payment Status'] || '').toUpperCase();
    const existingTxn = (fields.Transaction || '').trim();

    if (existingPaymentStatus === PAYMENT_STATUS.CONFIRMED) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          duplicate: true,
          orderId: body.orderId,
          paymentStatus: PAYMENT_STATUS.CONFIRMED,
          awbNumber: fields['AWB Number'] || null,
          innofulfillOrderId: fields['Innofulfill Order ID'] || null,
          shipmentStatus: fields['Shipment Status'] || null,
        }),
      };
    }

    if (existingPaymentStatus === PAYMENT_STATUS.PROOF_SUBMITTED) {
      return { statusCode: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Payment proof is awaiting admin verification' }) };
    }

    const expiresAt = fields['Payment Session Expires At'];
    if (isPaymentSessionExpired(expiresAt)) {
      await patchAirtableRecord(baseId, table, token, body.recordId, {
        'Payment Status': PAYMENT_STATUS.EXPIRED,
        Status: 'PAYMENT_EXPIRED',
      });
      return { statusCode: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Payment session expired. Please restart checkout.' }) };
    }

    if (existingTxn && existingTxn !== body.transaction.trim()) {
      return { statusCode: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'This order already has a different payment reference on file' }) };
    }

    await patchAirtableRecord(baseId, table, token, body.recordId, {
      Transaction: body.transaction.trim(),
      'Payment Status': PAYMENT_STATUS.CONFIRMED,
      Status: 'PAYMENT_CONFIRMED',
    });

    if (body.screenshot?.base64) {
      await fetch(
        `https://content.airtable.com/v0/${baseId}/${body.recordId}/Screenshot/uploadAttachment`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: body.screenshot.contentType,
            filename: body.screenshot.filename,
            file: body.screenshot.base64,
          }),
        },
      ).catch((err) => console.warn('[ConfirmPayment] Screenshot upload failed:', err));
    }

    const logistics = await processLogistics(baseId, table, token, body.recordId, body.orderId, {
      cartItems: body.cartItems,
      customer: body.customer,
      paymentMethod: body.paymentMethod,
      deliveryOption: body.deliveryOption,
      total: body.total,
      deliveryCharge: body.deliveryCharge,
      codCharge: body.codCharge,
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        orderId: body.orderId,
        paymentStatus: PAYMENT_STATUS.CONFIRMED,
        awbNumber: logistics.awbNumber || null,
        innofulfillOrderId: logistics.innofulfillOrderId || null,
        shipmentStatus: logistics.shipmentStatus,
        carrierDisplayName: logistics.carrierDisplayName || null,
        innofulfillWarning: logistics.warning || null,
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
