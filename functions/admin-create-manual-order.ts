import { requireAdmin } from './admin-auth';
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

export interface ManualOrderInput {
  name: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  pincode: string;
  item?: string;
  price?: number;
  paymentMethod?: 'prepay' | 'cod';
  deliveryOption?: 'normal' | 'fast';
  email?: string;
}

export interface ManualOrderResult {
  success: boolean;
  orderId?: string;
  recordId?: string;
  name: string;
  phone: string;
  pincode: string;
  provider?: 'Innofulfill' | 'Shiprocket';
  innofulfillOrderId?: string;
  awbNumber?: string;
  shipmentStatus?: string;
  error?: string;
  warning?: string | null;
}

const cors = corsHeaders;

export const handler = async (event: { httpMethod?: string; body?: string; headers?: Record<string, string> }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  // Admin-only guard
  const denied = await requireAdmin(event);
  if (denied) return denied;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Airtable is not configured' }) };
    }

    const body = JSON.parse(event.body || '{}') as {
      order?: ManualOrderInput;
      orders?: ManualOrderInput[];
    };

    const inputList: ManualOrderInput[] = body.orders || (body.order ? [body.order] : []);
    if (!inputList.length) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'No order details provided' }) };
    }

    const results: ManualOrderResult[] = [];

    for (const raw of inputList) {
      const name = (raw.name || 'Valued Customer').trim();
      const rawPhone = (raw.phone || '').trim();
      const phone = cleanPhone(rawPhone);
      const rawPin = (raw.pincode || '').trim();
      const pincode = rawPin.match(/\b\d{6}\b/)?.[0] || '';
      const address = (raw.address || '').trim();
      const item = (raw.item || 'Retratrutide Starter Kit').trim();
      const price = Number(raw.price) > 0 ? Number(raw.price) : 1000;
      const paymentMethod: 'prepay' | 'cod' = raw.paymentMethod === 'cod' ? 'cod' : 'prepay';
      const deliveryOption: 'normal' | 'fast' = raw.deliveryOption === 'fast' ? 'fast' : 'normal';
      const email = (raw.email || 'orders@retralabs.in').trim();

      if (!name || name.length < 2) {
        results.push({ success: false, name, phone, pincode, error: 'Customer name is missing or too short' });
        continue;
      }
      if (!isValidPincodeFormat(pincode)) {
        results.push({ success: false, name, phone, pincode, error: `Invalid 6-digit PIN code: "${pincode}"` });
        continue;
      }
      if (!phone || phone.length !== 10) {
        results.push({ success: false, name, phone: rawPhone, pincode, error: 'Invalid 10-digit phone number' });
        continue;
      }

      // Canonicalize state
      const verifiedState = canonicalRegion(raw.state) || 'Karnataka';
      const verifiedCity = (raw.city || 'City').trim();

      try {
        // 1. Generate sequential orderID
        const orderId = await generateOrderId(baseId, table, token);

        // 2. Prepare fields for Airtable
        const today = new Date().toISOString().slice(0, 10);
        const fullAddress = address.includes(pincode)
          ? address
          : `${address}${verifiedCity ? `, ${verifiedCity}` : ''}, ${verifiedState} - ${pincode}`;

        const fieldsToSave: Record<string, unknown> = {
          orderID: orderId,
          Name: name,
          Phone: phone,
          Email: email,
          Address: fullAddress,
          Items: item,
          'Total (₹)': price,
          Payment: paymentMethod === 'cod' ? 'COD' : 'Prepaid (Manual)',
          Delivery: deliveryOption === 'fast' ? 'Express (Air)' : 'Standard',
          Referral: 'Admin Manual',
          Status: 'ORDER_CREATED',
          Created: today,
          'Payment Status': PAYMENT_STATUS.CONFIRMED,
          'Shipment Status': SHIPMENT_STATUS.NOT_CREATED,
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
          throw new Error(`Airtable creation failed: ${detail}`);
        }

        if (!recordId) {
          throw new Error('Failed to create Airtable record');
        }

        // 4. Process Logistics (Innofulfill if serviceable, else Shiprocket)
        const cartItems: CartLineItem[] = [
          {
            name: item,
            variant: 'MANUAL',
            quantity: 1,
            unitPrice: price >= 10000 ? 3000 : 1000,
          },
        ];

        const logistics = await processLogistics(baseId, table, token, recordId, orderId, {
          cartItems,
          customer: {
            name,
            email,
            phone,
            address: fullAddress,
            city: verifiedCity,
            state: verifiedState,
            pincode,
          },
          paymentMethod,
          deliveryOption,
          total: price,
          deliveryCharge: 0,
          codCharge: 0,
        });

        results.push({
          success: true,
          orderId,
          recordId,
          name,
          phone,
          pincode,
          provider: logistics.shipmentProvider,
          innofulfillOrderId: logistics.innofulfillOrderId,
          awbNumber: logistics.awbNumber,
          shipmentStatus: logistics.shipmentStatus,
          warning: logistics.warning,
        });
      } catch (orderErr) {
        console.error(`[ManualOrder] Failed to process order for ${name}:`, orderErr);
        results.push({
          success: false,
          name,
          phone,
          pincode,
          error: orderErr instanceof Error ? orderErr.message : String(orderErr),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: successCount > 0,
        total: results.length,
        created: successCount,
        results,
      }),
    };
  } catch (err) {
    console.error('[ManualOrder] Root Error:', err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
    };
  }
};
