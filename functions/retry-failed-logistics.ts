import { requireAdmin } from './admin-auth';
import {
  corsHeaders,
  getAirtableConfig,
  processLogistics,
  recordIsPaid,
  type CartLineItem,
} from './order-shared';
import { resolveDestination } from './shiprocket-shared';
import { extractPincodeFromAddress } from './delivery-shared';

/**
 * Re-attempts carrier booking for orders stuck in "Logistics Failed".
 *
 * Booking used to get exactly one attempt, at order time. If the carrier was
 * throttled, briefly down, or the payload was wrong, the order was marked
 * failed and nothing ever looked at it again -- 27 orders sat stranded for up
 * to eight weeks, 15 of them paid for, while Shiprocket worked fine the whole
 * time for everything placed after them.
 *
 * Run it from the admin, or on a schedule. It is safe to run repeatedly:
 * processLogistics skips records that already carry a carrier order id, and
 * the Shiprocket client treats "order already exists" as success, so a double
 * run reconciles rather than duplicates.
 */

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** Airtable pages at 100; keep one invocation well inside the CPU budget. */
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function fetchFailedOrders(
  baseId: string,
  table: string,
  token: string,
  limit: number,
): Promise<AirtableRecord[]> {
  const formula = encodeURIComponent(`{Status} = 'Logistics Failed'`);
  const url =
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}` +
    `?filterByFormula=${formula}&pageSize=${Math.min(limit, 100)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Airtable list failed (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { records?: AirtableRecord[] };
  return body.records ?? [];
}

export const handler = async (event: {
  httpMethod?: string;
  body?: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
}) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const denied = await requireAdmin(event);
  if (denied) return denied;

  const cfg = getAirtableConfig();
  if (!cfg.token || !cfg.baseId) return json(500, { error: 'Airtable is not configured' });
  const { baseId, table, token } = cfg;

  const requested = Number(
    event.queryStringParameters?.limit ?? JSON.parse(event.body || '{}')?.limit ?? DEFAULT_LIMIT,
  );
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : DEFAULT_LIMIT, MAX_LIMIT));

  // Dry run reports what would be attempted without touching any carrier.
  const dryRun = String(event.queryStringParameters?.dryRun ?? '') === '1';

  try {
    const records = await fetchFailedOrders(baseId, table, token, limit);

    const results: Array<Record<string, unknown>> = [];
    let booked = 0;
    let stillFailing = 0;
    let skipped = 0;

    for (const record of records) {
      const f = record.fields;
      const orderId = String(f['orderID'] ?? record.id);

      // An unpaid order has nothing to ship. Leave it alone rather than
      // booking a parcel against a payment that never arrived.
      const isCod = String(f['Payment'] ?? '').toUpperCase().includes('COD');
      if (!isCod && !recordIsPaid(f)) {
        skipped++;
        results.push({ orderId, outcome: 'skipped', reason: 'not paid' });
        continue;
      }

      let destination;
      try {
        destination = resolveDestination(f);
      } catch (err) {
        stillFailing++;
        results.push({
          orderId,
          outcome: 'needs-attention',
          reason: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      if (dryRun) {
        results.push({ orderId, outcome: 'would-retry', destination });
        continue;
      }

      const total = Number(f['Total (₹)'] ?? 0);
      const declared = isCod ? total : total >= 10000 ? 3000 : 1000;
      const cartItems: CartLineItem[] = [
        { name: 'Cosmetic Research use', variant: 'RETRY', quantity: 1, unitPrice: declared },
      ];

      try {
        const outcome = await processLogistics(baseId, table, token, record.id, orderId, {
          cartItems,
          customer: {
            name: String(f['Name'] ?? 'Customer'),
            email: String(f['Email'] ?? 'orders@retralabs.in'),
            phone: String(f['Phone'] ?? ''),
            address: String(f['Address'] ?? ''),
            city: destination.city,
            state: destination.state,
            pincode: destination.pincode || extractPincodeFromAddress(String(f['Address'] ?? '')) || '',
          },
          paymentMethod: isCod ? 'cod' : 'prepay',
          deliveryOption: String(f['Delivery'] ?? '').toLowerCase().includes('express') ? 'fast' : 'normal',
          total,
          deliveryCharge: 0,
          codCharge: 0,
        });

        if (outcome.warning && outcome.shipmentStatus === 'FAILED') {
          stillFailing++;
          results.push({ orderId, outcome: 'still-failing', reason: outcome.warning, destination });
        } else {
          booked++;
          results.push({
            orderId,
            outcome: 'booked',
            provider: outcome.shipmentProvider,
            awb: outcome.awbNumber ?? null,
            destination,
          });
        }
      } catch (err) {
        stillFailing++;
        results.push({
          orderId,
          outcome: 'error',
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return json(200, {
      success: true,
      dryRun,
      examined: records.length,
      booked,
      stillFailing,
      skipped,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RetryFailedLogistics]', message);
    return json(500, { error: message });
  }
};
