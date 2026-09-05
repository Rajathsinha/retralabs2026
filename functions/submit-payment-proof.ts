import {
  PAYMENT_STATUS,
  corsHeaders,
  generateOrderId,
  getAirtableConfig,
  patchAirtableRecord,
  SHIPMENT_STATUS,
  type CartLineItem,
} from './order-shared';

interface SubmitPaymentProofBody {
  fields: {
    Name: string;
    Email: string;
    Phone: string;
    Address: string;
    Items: string;
    'Total (₹)': number;
    Payment: string;
    Delivery: string;
    Referral: string;
    Created: string;
  };
  orderDocumentNumber?: string;
  amountPaid: number;
  transaction: string;
  paymentDateTime: string;
  screenshot: { contentType: string; filename: string; base64: string };
  cartItems?: CartLineItem[];
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

    const body = JSON.parse(event.body || '{}') as SubmitPaymentProofBody;
    if (!body.fields?.Name || !body.transaction?.trim() || !body.screenshot?.base64) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Name, transaction/UTR, and payment screenshot are required' }) };
    }

    let orderId = body.orderDocumentNumber?.trim() || '';
    let recordId: string | null = null;

    if (orderId) {
      const filterFormula = encodeURIComponent(`{orderID} = "${orderId}"`);
      const searchRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${filterFormula}&maxRecords=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (searchRes.ok) {
        const searchJson: { records?: Array<{ id: string; fields?: Record<string, string> }> } = await searchRes.json();
        const existing = searchJson.records?.[0];
        if (existing) {
          recordId = existing.id;
          const proofStatus = (existing.fields?.['Payment Status'] || '').toUpperCase();
          if (proofStatus === PAYMENT_STATUS.PROOF_SUBMITTED || proofStatus === PAYMENT_STATUS.CONFIRMED) {
            return {
              statusCode: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Payment proof has already been submitted for this order' }),
            };
          }
        }
      }
    }

    if (!recordId) {
      orderId = orderId || await generateOrderId(baseId, table, token);
      const fieldsToSave: Record<string, unknown> = {
        ...body.fields,
        orderID: orderId,
        Status: 'ORDER_CREATED',
        'Payment Status': PAYMENT_STATUS.PROOF_SUBMITTED,
        'Shipment Status': SHIPMENT_STATUS.NOT_CREATED,
        Transaction: body.transaction.trim(),
        'Payment Proof Submitted At': body.paymentDateTime || new Date().toISOString(),
      };

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
          recordId = createJson.id || null;
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
    } else {
      await patchAirtableRecord(baseId, table, token, recordId, {
        Transaction: body.transaction.trim(),
        'Payment Status': PAYMENT_STATUS.PROOF_SUBMITTED,
        Status: 'PAYMENT_PROOF_SUBMITTED',
        'Payment Proof Submitted At': body.paymentDateTime || new Date().toISOString(),
      });
    }

    if (!recordId) {
      return { statusCode: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Failed to save payment proof' }) };
    }

    await fetch(
      `https://content.airtable.com/v0/${baseId}/${recordId}/Screenshot/uploadAttachment`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: body.screenshot.contentType,
          filename: body.screenshot.filename,
          file: body.screenshot.base64,
        }),
      },
    ).catch((err) => console.warn('[SubmitPaymentProof] Screenshot upload failed:', err));

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        recordId,
        orderId,
        paymentStatus: PAYMENT_STATUS.PROOF_SUBMITTED,
        message: "Payment proof submitted. We'll verify your payment and process your order.",
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
