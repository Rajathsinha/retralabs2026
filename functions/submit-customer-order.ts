import { canonicalRegion, isValidPincodeFormat } from './delivery-shared';
import {
  PAYMENT_STATUS,
  SHIPMENT_STATUS,
  cleanPhone,
  corsHeaders,
  generateOrderId,
  getAirtableConfig,
  patchAirtableRecord,
  processLogistics,
  type CartLineItem,
} from './order-shared';

interface SubmitCustomerOrderBody {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  pincode: string;
  item?: string;
  total: number;
  deliveryOption?: 'normal' | 'fast';
  transaction?: string;
  screenshot?: {
    contentType: string;
    filename: string;
    base64: string;
  };
}

const cors = corsHeaders;

export const handler = async (event: { httpMethod?: string; body?: string }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Airtable is not configured' }) };
    }

    const body = JSON.parse(event.body || '{}') as SubmitCustomerOrderBody;

    const name = (body.name || '').trim();
    const rawPhone = (body.phone || '').trim();
    const phone = cleanPhone(rawPhone);
    const rawPin = (body.pincode || '').trim();
    const pincode = rawPin.match(/\b\d{6}\b/)?.[0] || '';
    const address = (body.address || '').trim();
    const city = (body.city || 'City').trim();
    const state = canonicalRegion(body.state) || 'Karnataka';
    const email = (body.email || 'orders@retralabs.in').trim();
    const item = (body.item || 'Retratrutide Starter Kit').trim();
    const total = Number(body.total) > 0 ? Number(body.total) : 1000;
    const deliveryOption: 'normal' | 'fast' = body.deliveryOption === 'fast' ? 'fast' : 'normal';
    const transaction = (body.transaction || '').trim();

    // Validations
    if (!name || name.length < 2) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Please provide your full name.' }) };
    }
    if (!phone || phone.length !== 10) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Please provide a valid 10-digit phone number.' }) };
    }
    if (!isValidPincodeFormat(pincode)) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Please enter a valid 6-digit Indian PIN code.' }) };
    }
    if (!address || address.length < 5) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Please provide your complete delivery address.' }) };
    }
    if (!body.screenshot?.base64) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Please upload your payment screenshot.' }) };
    }

    // 1. Generate next sequential orderID (e.g. RETR0000000043)
    const orderId = await generateOrderId(baseId, table, token);

    // 2. Prepare full address
    const fullAddress = address.includes(pincode)
      ? address
      : `${address}, ${city}, ${state} - ${pincode}`;

    const today = new Date().toISOString().slice(0, 10);
    const fieldsToSave: Record<string, unknown> = {
      orderID: orderId,
      Name: name,
      Phone: phone,
      Email: email,
      Address: fullAddress,
      Items: item,
      'Total (₹)': total,
      Payment: 'UPI QR (Customer Form)',
      Delivery: deliveryOption === 'fast' ? 'Express (Air)' : 'Standard',
      Referral: 'Direct Customer Form',
      Status: 'ORDER_CREATED',
      Created: today,
      'Payment Status': PAYMENT_STATUS.CONFIRMED,
      'Shipment Status': SHIPMENT_STATUS.NOT_CREATED,
      ...(transaction ? { Transaction: transaction } : {}),
      'Payment Proof Submitted At': new Date().toISOString(),
    };

    // 3. Create Airtable Record
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
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: `Airtable: ${detail}` }) };
    }

    if (!recordId) {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Failed to create order record' }) };
    }

    // 4. Upload payment screenshot to Airtable Screenshot field
    if (body.screenshot?.base64) {
      try {
        await fetch(
          `https://content.airtable.com/v0/${baseId}/${recordId}/Screenshot/uploadAttachment`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: body.screenshot.contentType || 'image/jpeg',
              filename: body.screenshot.filename || `payment-${orderId}.jpg`,
              file: body.screenshot.base64,
            }),
          },
        );
      } catch (uploadErr) {
        console.warn('[SubmitCustomerOrder] Screenshot upload error:', uploadErr);
      }
    }

    // 5. Automatic Logistics Routing (Innofulfill if serviceable, else Shiprocket)
    // Note: processLogistics enforces courier declared value (<10k: 1000, >=10k: 3000)
    const declaredCourierPrice = total >= 10000 ? 3000 : 1000;
    const cartItems: CartLineItem[] = [
      {
        name: item,
        variant: 'DEFAULT',
        quantity: 1,
        unitPrice: declaredCourierPrice,
      },
    ];

    const logistics = await processLogistics(baseId, table, token, recordId, orderId, {
      cartItems,
      customer: {
        name,
        email,
        phone,
        address: fullAddress,
        city,
        state,
        pincode,
      },
      paymentMethod: 'prepay',
      deliveryOption,
      total,
      deliveryCharge: 0,
      codCharge: 0,
    });

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        orderId,
        recordId,
        provider: logistics.shipmentProvider,
        awbNumber: logistics.awbNumber || null,
        shipmentStatus: logistics.shipmentStatus,
        carrierDisplayName: logistics.carrierDisplayName || logistics.shipmentProvider,
        warning: logistics.warning || null,
      }),
    };
  } catch (err) {
    console.error('[SubmitCustomerOrder] Error:', err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }),
    };
  }
};
