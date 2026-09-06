import { requireAdmin } from './admin-auth';
import {
  corsHeaders,
  createInnofulfillOrder,
  getAirtableConfig,
  getInnofulfillToken,
  isPaymentConfirmed,
  patchAirtableRecord,
} from './order-shared';

export { getInnofulfillToken, createInnofulfillOrder };

const cors = corsHeaders;

export const handler = async (event: { httpMethod?: string; body?: string; headers?: Record<string, string> }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  // Admin-only: this route exposes or mutates order data.
  const denied = await requireAdmin(event);
  if (denied) return denied;
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { recordId } = JSON.parse(event.body || '{}') as { recordId?: string };
    if (!recordId) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'recordId is required' }) };
    }

    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) throw new Error('Airtable not configured');

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`;
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!getRes.ok) throw new Error('Failed to fetch Airtable record');
    const record: { fields: Record<string, string | number> } = await getRes.json();
    const f = record.fields;

    const paymentStatus = String(f['Payment Status'] || '');
    const paymentMethod = String(f.Payment || '');
    if (!isPaymentConfirmed(paymentStatus, paymentMethod)) {
      return { statusCode: 409, headers: cors, body: JSON.stringify({ error: 'Payment must be confirmed before pushing to Innofulfill' }) };
    }

    if (f['Innofulfill Order ID']) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: true,
          duplicate: true,
          innofulfillOrderId: f['Innofulfill Order ID'],
          awbNumber: f['AWB Number'] || null,
        }),
      };
    }

    const innoToken = await getInnofulfillToken();
    if (!innoToken) throw new Error('Innofulfill credentials missing');

    const paymentMethodStr = paymentMethod.toUpperCase();
    const isCod = paymentMethodStr.includes('COD');
    const total = Number(f['Total (₹)'] || 0);
    const declaredTotal = isCod ? total : total >= 10000 ? 3000 : 1000;
    const cartItems = [{ name: String(f.Items || 'Item'), quantity: 1, unitPrice: declaredTotal, variant: 'MANUAL' }];
    const customer = {
      name: String(f.Name || 'Customer'),
      email: String(f.Email || 'manual@retralabs.in'),
      phone: String(f.Phone || '9999999999'),
      address: String(f.Address || ''),
      city: 'City',
      state: 'State',
      pincode: String(f.Address || '').match(/\b\d{6}\b/)?.[0] || '110001',
    };

    const innoResult = await createInnofulfillOrder(
      innoToken,
      String(f.orderID || `MANUAL-${Date.now()}`),
      customer,
      cartItems,
      total,
      isCod ? 'cod' : 'prepay',
      undefined,
    );

    await patchAirtableRecord(baseId, table, token, recordId, {
      'Innofulfill Order ID': String(innoResult.innofulfillOrderId || ''),
      'Innofulfill Internal ID': String(innoResult.innofulfillInternalId || ''),
      'Carrier Display Name': innoResult.carrierDisplayName || 'Innofulfill',
      'Courier Provider': 'Innofulfill',
      'Shipment Status': innoResult.shipmentStatus,
      'Shipment Created At': innoResult.shipmentCreatedAt,
      ...(innoResult.awbNumber
        ? { 'AWB Number': innoResult.awbNumber, 'Tracking ID': innoResult.awbNumber }
        : { 'AWB Number': '', 'Tracking ID': '' }),
      ...(innoResult.trackingUrl ? { 'Tracking URL': innoResult.trackingUrl } : {}),
      Status: 'Created in Innofulfill',
    });

    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true, innofulfill: innoResult }) };
  } catch (err) {
    console.error('[PushToInnofulfill] Error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }) };
  }
};
