import {
  PAYMENT_STATUS,
  corsHeaders,
  getAirtableConfig,
  patchAirtableRecord,
  type CartLineItem,
} from './order-shared';
import { ocrPaymentScreenshot } from './ocr-shared';

interface ConfirmPaymentBody {
  recordId: string;
  orderId: string;
  transaction: string;
  screenshot?: { contentType: string; filename: string; base64: string };
  /** Client-side OCR read of the screenshot, advisory only — never trusted for the decision. */
  ocrAmountMatch?: 'idle' | 'scanning' | 'matched' | 'mismatch' | 'error';
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

    if (existingTxn && existingTxn !== body.transaction.trim()) {
      return { statusCode: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'This order already has a different payment reference on file' }) };
    }

    // A self-reported reference number and an uploaded screenshot are not proof
    // of payment — anyone can type any string and attach any image. This never
    // auto-confirms or ships: it lands as PROOF_SUBMITTED, same as the manual
    // "I've already paid" flow, and only an admin who has looked at the actual
    // screenshot (verify-payment.ts, requireAdmin-gated) can move it to
    // CONFIRMED and release it to fulfillment.
    //
    // Run OCR on the server, against the screenshot that was actually
    // uploaded — unlike the browser-side check, this can't be edited or
    // skipped by the customer before the request is sent.
    let ocrNote: string | undefined;
    if (body.screenshot?.base64) {
      const ocr = await ocrPaymentScreenshot(body.screenshot.base64, body.total, body.transaction.trim());
      ocrNote = ocr.note;
    } else if (body.ocrAmountMatch) {
      ocrNote = `Browser OCR amount check: ${body.ocrAmountMatch}`;
    }

    await patchAirtableRecord(baseId, table, token, body.recordId, {
      Transaction: body.transaction.trim(),
      'Payment Status': PAYMENT_STATUS.PROOF_SUBMITTED,
      Status: 'PAYMENT_PROOF_SUBMITTED',
      'Payment Proof Submitted At': new Date().toISOString(),
      ...(ocrNote ? { 'Payment Verification Note': ocrNote } : {}),
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

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        orderId: body.orderId,
        paymentStatus: PAYMENT_STATUS.PROOF_SUBMITTED,
        awbNumber: null,
        innofulfillOrderId: null,
        shipmentStatus: null,
        carrierDisplayName: null,
        innofulfillWarning: null,
        message: "Payment reference received. We'll verify it against your screenshot and confirm your order shortly.",
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
