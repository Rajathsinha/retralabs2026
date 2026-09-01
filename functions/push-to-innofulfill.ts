

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
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

    // Fetch Airtable config
    const token = process.env.VITE_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN;
    const baseId = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const table = process.env.VITE_AIRTABLE_TABLE || process.env.AIRTABLE_TABLE || 'Orders';
    if (!token || !baseId) throw new Error('Airtable not configured');

    // Fetch record
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`;
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!getRes.ok) throw new Error('Failed to fetch Airtable record');
    const record = await getRes.json();
    const f = record.fields;

    // Get Innofulfill token
    const innoToken = await getInnofulfillToken();
    if (!innoToken) throw new Error('Innofulfill credentials missing');

    // Build payload using the same savings logic already in create-order.ts
    const paymentMethodStr = String(f['Payment'] || '').toUpperCase();
    const isCod = paymentMethodStr.includes('COD');
    const total = Number(f['Total (₹)'] || 0);
    const declaredTotal = isCod ? total : total >= 10000 ? 3000 : 1000;

    const cartItems = [{ name: f['Items'] || 'Item', quantity: 1, unitPrice: declaredTotal, variant: 'MANUAL' }];
    const customer = {
      name: f['Name'] || 'Customer',
      email: f['Email'] || 'manual@retralabs.in',
      phone: f['Phone'] || '9999999999',
      address: f['Address'] || '',
      city: 'City',
      state: 'State',
      pincode: String(f['Address'] || '').match(/\b\d{6}\b/)?.[0] || '110001',
    };

    // Use helper from create-order.ts
    const innoResult = await createInnofulfillOrder(
      innoToken,
      f['orderID'] || `MANUAL-${Date.now()}`,
      customer,
      cartItems,
      total,
      0,
      0,
      isCod ? 'cod' : 'prepay',
      undefined
    );

    // Update Airtable with results
    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields: {
        'Innofulfill Order ID': String(innoResult.innofulfillOrderId || ''),
        'Innofulfill Internal ID': String(innoResult.innofulfillInternalId || ''),
        'Carrier Display Name': innoResult.carrierDisplayName || 'Innofulfill',
        'Courier Provider': 'Innofulfill',
        'AWB Number': String(innoResult.awbNumber || ''),
        'Tracking ID': String(innoResult.awbNumber || ''),
        'Shipment Status': innoResult.shipmentStatus || 'CREATED',
      } }),
    });
    if (!patchRes.ok) console.error('Failed to update Airtable after innofulfill push');

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, innofulfill: innoResult }) };
  } catch (err: any) {
    console.error('[PushToInnofulfill] Error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};

import { getInnofulfillToken, createInnofulfillOrder } from './create-order';
