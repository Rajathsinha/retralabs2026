import { requireAdmin } from './admin-auth';
import { corsHeaders, patchAirtableRecord, getAirtableConfig, SHIPMENT_STATUS } from './order-shared';
import {
  getShiprocketToken,
  resolveDestination,
  buildShiprocketPayload,
  createShiprocketOrder,
  ShiprocketAuthError,
  ShiprocketOrderError,
} from './shiprocket-shared';

/**
 * Admin action: push one order to Shiprocket by hand.
 *
 * Previously this built its own payload from `City` / `State` / `Pincode`
 * columns that this base has never had, so every order went out labelled
 * Bengaluru, Karnataka with the customer's real pincode -- a contradiction
 * Shiprocket refuses, identically, on every retry. It also wrote its result
 * back with a raw PATCH naming two columns that do not exist, which Airtable
 * rejects wholesale, so even a successful push saved nothing and the order
 * stayed looking failed.
 *
 * It now shares the destination logic and the payload builder with the
 * automatic path, and writes back through patchAirtableRecord, which drops
 * unknown columns instead of losing the whole update.
 */

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** The value declared to the carrier. Prepaid parcels are declared low. */
function declaredValue(total: number, isCod: boolean): number {
  if (isCod) return total;
  return total >= 10000 ? 3000 : 1000;
}

export const handler = async (event: { httpMethod?: string; body?: string; headers?: Record<string, string> }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const denied = await requireAdmin(event);
  if (denied) return denied;

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let recordId = '';
  let baseId = '';
  let table = '';
  let airtableToken = '';

  try {
    ({ recordId } = JSON.parse(event.body || '{}'));
    if (!recordId) return json(400, { error: 'recordId is required' });

    const cfg = getAirtableConfig();
    if (!cfg.token || !cfg.baseId) return json(500, { error: 'Airtable is not configured' });
    baseId = cfg.baseId;
    table = cfg.table;
    airtableToken = cfg.token;

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`;
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${airtableToken}` } });
    if (!getRes.ok) return json(502, { error: `Could not read order from Airtable (HTTP ${getRes.status})` });

    const record = (await getRes.json()) as { fields?: Record<string, unknown> };
    const f = record.fields || {};

    const token = await getShiprocketToken();
    if (!token) return json(500, { error: 'Shiprocket credentials are not configured' });

    // Throws with a clear, actionable message rather than guessing a city.
    const destination = resolveDestination(f);

    const orderId = String(f['orderID'] || `MANUAL-${Date.now()}`);
    const isCod = String(f['Payment'] || '').toUpperCase().includes('COD');
    const total = Number(f['Total (₹)'] || 0);
    const codDue = Number(String(f['COD Due'] ?? '').replace(/[^0-9.]/g, '')) || undefined;

    const payload = buildShiprocketPayload({
      orderId,
      orderDate: f['Created'] ? new Date(String(f['Created'])) : new Date(),
      name: String(f['Name'] || 'Customer'),
      email: String(f['Email'] || ''),
      phone: String(f['Phone'] || ''),
      address: String(f['Address'] || ''),
      destination,
      declaredValue: declaredValue(total, isCod),
      isCod,
      codCollectible: isCod ? codDue ?? total : undefined,
    });

    const result = await createShiprocketOrder(token, payload);

    // Written through patchAirtableRecord so a column this base lacks is
    // dropped and the rest still saves -- the raw PATCH here used to lose the
    // AWB and tracking id along with the unknown columns.
    await patchAirtableRecord(baseId, table, airtableToken, recordId, {
      ...(result.awbNumber ? { 'AWB Number': result.awbNumber } : {}),
      ...(result.shiprocketShipmentId ? { 'Tracking ID': result.shiprocketShipmentId } : {}),
      'Carrier Display Name': `Shiprocket (${result.courierName})`,
      'Carrier Name': result.courierName,
      'Courier Provider': 'Shiprocket',
      'Shipment Status': result.awbNumber ? SHIPMENT_STATUS.AWB_ASSIGNED : SHIPMENT_STATUS.AWB_PENDING,
      'Shipment Created At': new Date().toISOString(),
      Status: 'Created in Shiprocket',
      'Innofulfill Error': '',
    });

    return json(200, {
      success: true,
      alreadyExisted: result.alreadyExisted,
      destination,
      shiprocket: {
        order_id: result.shiprocketOrderId,
        shipment_id: result.shiprocketShipmentId,
        awb_code: result.awbNumber,
        courier_name: result.courierName,
      },
      message: result.alreadyExisted
        ? 'This order was already in Shiprocket from an earlier attempt. The record has been updated to match.'
        : `Pushed to Shiprocket for ${destination.city}, ${destination.state} ${destination.pincode}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PushToShiprocket] Error:', message);

    // Record why, so the reason survives the page reload and shows up in the
    // retry sweep instead of only in a dismissed alert box.
    if (recordId && baseId && airtableToken) {
      await patchAirtableRecord(baseId, table, airtableToken, recordId, {
        'Innofulfill Error': `Manual Shiprocket push: ${message}`.slice(0, 950),
      }).catch(() => {});
    }

    const retryable = err instanceof ShiprocketAuthError
      ? true
      : err instanceof ShiprocketOrderError
        ? !err.permanent
        : false;

    return json(err instanceof ShiprocketAuthError ? 503 : 500, { error: message, retryable });
  }
};
