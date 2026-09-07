import { requireAdmin } from './admin-auth';
import {
  corsHeaders,
  createInnofulfillOrder,
  getAirtableConfig,
  getInnofulfillToken,
  patchAirtableRecord,
} from './order-shared';
import { innofulfillServiceable } from './delivery-shared';

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
    const { recordId, allowDuplicate } = JSON.parse(event.body || '{}') as {
      recordId?: string;
      allowDuplicate?: boolean;
    };
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

    const orderId = String(f.orderID || recordId);

    // ── 1. Duplicate Warning Check ──────────────────────────────────────────
    // If the order already has an Innofulfill Order ID and user hasn't explicitly confirmed force re-push
    if (f['Innofulfill Order ID'] && !allowDuplicate) {
      return {
        statusCode: 409,
        headers: cors,
        body: JSON.stringify({
          error: `Duplicate order: Order #${orderId} has already been pushed to Innofulfill (Innofulfill ID: ${f['Innofulfill Order ID']}${f['AWB Number'] ? `, AWB: ${f['AWB Number']}` : ''}).`,
          duplicate: true,
          innofulfillOrderId: f['Innofulfill Order ID'],
          awbNumber: f['AWB Number'] || null,
        }),
      };
    }

    // ── 2. Pincode Extraction & Validation ──────────────────────────────────
    const rawPincode = String(f.Pincode || f.PIN || '').trim();
    const matchedPincode = String(f.Address || '').match(/\b\d{6}\b/)?.[0];
    const pincode = /^\d{6}$/.test(rawPincode) ? rawPincode : (matchedPincode || '');

    if (!pincode) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({
          error: `Cannot push to Innofulfill: No valid 6-digit delivery PIN code found in order address: "${String(f.Address || '')}". Please ensure the address contains a valid 6-digit pincode.`,
        }),
      };
    }

    // ── 3. Check Innofulfill Credentials ────────────────────────────────────
    const innoToken = await getInnofulfillToken();
    if (!innoToken) throw new Error('Innofulfill credentials missing');

    // ── 4. Verify Pincode Serviceability ────────────────────────────────────
    const paymentMethod = String(f.Payment || '');
    const paymentMethodStr = paymentMethod.toUpperCase();
    const isCod = paymentMethodStr.includes('COD');

    console.log(`[PushToInnofulfill] Checking serviceability for pincode ${pincode}, payment: ${isCod ? 'COD' : 'PREPAID'}...`);
    const servCheck = await innofulfillServiceable(innoToken, pincode, isCod ? 'COD' : 'PREPAID');

    if (!servCheck.serviceable) {
      const reasonMsg = servCheck.reason || 'No serviceable carrier available for this PIN code';
      console.warn(`[PushToInnofulfill] Pincode ${pincode} is unserviceable: ${reasonMsg}`);
      return {
        statusCode: 422,
        headers: cors,
        body: JSON.stringify({
          error: `Pincode ${pincode} is not serviceable by Innofulfill (${reasonMsg}). Please fulfill this order using Shiprocket instead.`,
          unserviceable: true,
          pincode,
          reason: reasonMsg,
        }),
      };
    }

    // ── 5. Create Shipment in Innofulfill ────────────────────────────────────
    const total = Number(f['Total (₹)'] || 0);
    const declaredTotal = isCod ? total : total >= 10000 ? 3000 : 1000;
    const cartItems = [{ name: 'Cosmetic Research use', quantity: 1, unitPrice: declaredTotal, variant: 'MANUAL' }];
    const customer = {
      name: String(f.Name || 'Customer'),
      email: String(f.Email || 'manual@retralabs.in'),
      phone: String(f.Phone || '9999999999'),
      address: String(f.Address || ''),
      city: String(f.City || '').trim() || 'Bengaluru',
      state: String(f.State || '').trim() || 'Karnataka',
      pincode,
    };
    const isExpress = String(f.Delivery || '').toLowerCase().includes('express');

    let innoResult;
    try {
      innoResult = await createInnofulfillOrder(
        innoToken,
        orderId,
        customer,
        cartItems,
        total,
        isCod ? 'cod' : 'prepay',
        isExpress ? 'fast' : undefined,
      );
    } catch (innoErr: unknown) {
      const errStr = innoErr instanceof Error ? innoErr.message : String(innoErr);
      if (errStr.toLowerCase().includes('already exists') || errStr.toLowerCase().includes('duplicate')) {
        return {
          statusCode: 409,
          headers: cors,
          body: JSON.stringify({
            error: `Innofulfill reports order #${orderId} already exists in their booking system: ${errStr}`,
            duplicate: true,
          }),
        };
      }
      throw innoErr;
    }

    // ── 6. Update Airtable Record ───────────────────────────────────────────
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

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        innofulfill: innoResult,
        awbNumber: innoResult.awbNumber || null,
        orderId,
      }),
    };
  } catch (err) {
    console.error('[PushToInnofulfill] Error:', err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal error',
      }),
    };
  }
};
