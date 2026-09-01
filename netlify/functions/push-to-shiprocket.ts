import type { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { recordId } = JSON.parse(event.body || '{}');
    if (!recordId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'recordId is required' }) };
    }

    // 1. Fetch Airtable config
    const token = process.env.VITE_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN;
    const baseId = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const table = process.env.VITE_AIRTABLE_TABLE || process.env.AIRTABLE_TABLE || 'Orders';

    if (!token || !baseId) {
      throw new Error('Airtable is not configured');
    }

    // 2. Fetch the specific record from Airtable
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`;
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!getRes.ok) throw new Error('Failed to fetch record from Airtable');
    
    const record = await getRes.json();
    const f = record.fields;

    // 3. Authenticate with Shiprocket
    const email = (process.env.SHIPROCKET_EMAIL || process.env.VITE_SHIPROCKET_EMAIL || '').trim();
    const password = (process.env.SHIPROCKET_PASSWORD || process.env.VITE_SHIPROCKET_PASSWORD || '').trim();
    const pickupLocation = (process.env.SHIPROCKET_PICKUP_LOCATION || process.env.VITE_SHIPROCKET_PICKUP_LOCATION || 'Rajath').trim();

    if (!email || !password) {
      throw new Error('Shiprocket credentials are not configured');
    }

    const srAuth = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json());

    if (!srAuth.token) {
      throw new Error('Failed to authenticate with Shiprocket');
    }

    // 4. Create Shiprocket Order
    const paymentMethodStr = String(f['Payment'] || '').toUpperCase();
    const isCod = paymentMethodStr.includes('COD');
    const realAmount = Number(f['Total (₹)'] || 0);
    
    // To save money in shipping for prepaid: < 10k is 1000, >= 10k is 3000
    let amount = realAmount;
    if (!isCod) {
      amount = realAmount >= 10000 ? 3000 : 1000;
    }
    const dateStr = f['Created'] ? new Date(f['Created']) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const orderDate = `${dateStr.getFullYear()}-${pad(dateStr.getMonth() + 1)}-${pad(dateStr.getDate())} ${pad(dateStr.getHours())}:${pad(dateStr.getMinutes())}`;
    
    // Default mapped name for pickup
    let finalPickup = pickupLocation;
    if (finalPickup.toLowerCase() === 'primary') finalPickup = 'Rajath';

    const srPayload = {
      order_id: String(f['orderID'] || `MANUAL-${Date.now()}`),
      order_date: orderDate,
      pickup_location: finalPickup,
      channel_id: '',
      comment: 'Manual Push from Admin',
      billing_customer_name: String(f['Name'] || 'Customer'),
      billing_last_name: '',
      billing_address: String(f['Address'] || 'No address'),
      billing_city: 'City', // Requires a valid city, ideally parsed but falling back
      billing_pincode: String(f['Address'] || '').match(/\b\d{6}\b/)?.[0] || '110001',
      billing_state: 'State',
      billing_country: 'India',
      billing_email: String(f['Email'] || 'manual@retralabs.in'),
      billing_phone: String(f['Phone'] || '9999999999').replace(/\D/g, '').slice(-10),
      shipping_is_billing: true,
      order_items: [
        {
          name: String(f['Items'] || 'Retratrutide Starter vial'),
          sku: 'RETRA-ITEM',
          units: 1,
          selling_price: amount,
          discount: 0,
          tax: 0,
        },
      ],
      payment_method: String(f['Payment'] || '').toUpperCase().includes('COD') ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: amount,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5,
    };

    const createRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${srAuth.token}`,
      },
      body: JSON.stringify(srPayload),
    });

    const createJson = await createRes.json();
    
    // Check if error inside 200 OK wrapper
    if (createRes.ok && (createJson.status_code === 0 || !createJson.order_id)) {
      throw new Error(`Shiprocket API error: ${JSON.stringify(createJson)}`);
    } else if (!createRes.ok) {
      throw new Error(`Shiprocket API HTTP ${createRes.status}: ${JSON.stringify(createJson)}`);
    }

    // 5. Update Airtable
    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fields: {
          'AWB Number': String(createJson.awb_code || ''),
          'Tracking ID': String(createJson.shipment_id || ''),
          'Carrier Display Name': 'Shiprocket (Manual Push)',
          'Courier Provider': 'Shiprocket',
        }
      })
    });

    if (!patchRes.ok) {
      console.error('Failed to update Airtable after pushing to Shiprocket');
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, shiprocket: createJson })
    };

  } catch (err: any) {
    console.error('[PushToShiprocket] Error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Internal error' })
    };
  }
};
