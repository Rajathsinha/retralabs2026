import {
  corsHeaders,
  getAirtableConfig,
  getInnofulfillBase,
  getInnofulfillToken,
  isFakeAwb,
  patchAirtableRecord,
  sanitizeAwb,
  sendAwbAssignedEmail,
  SHIPMENT_STATUS,
} from './order-shared';

function cleanPhone(phone: string): string {
  // Keep only the last 10 digits — see order-shared.ts's cleanPhone for why
  // a separate "strip leading 91" step must never run first.
  return (phone || '').replace(/\D/g, '').slice(-10).padStart(10, '0');
}

function cleanEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function innofulfillHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tenantId = process.env.INNOFULFILL_TENANT_ID;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** First non-empty value among the given keys. Their payloads vary by endpoint. */
function pickString(source: Record<string, unknown> | undefined, ...names: string[]): string | undefined {
  if (!source) return undefined;
  for (const name of names) {
    const value = source[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

/**
 * Pulls an order's live record from Innofulfill.
 *
 * Looks it up by Innofulfill's own id when we have one stored, then falls back
 * to our order number — which is what we send them as `referenceId` at booking
 * time, and what their portal lists under "Reference ID". That fallback is what
 * makes orders trackable at all right now: shipment writes to Airtable were
 * failing silently for months, so almost no order has an Innofulfill id stored
 * even though the booking itself went through.
 */
async function fetchInnofulfillOrder(
  token: string,
  innofulfillOrderId: string | null,
  referenceId: string,
): Promise<Record<string, unknown> | null> {
  const base = getInnofulfillBase();
  const queries = [
    innofulfillOrderId ? `orderId=${encodeURIComponent(innofulfillOrderId)}` : '',
    referenceId ? `referenceId=${encodeURIComponent(referenceId)}` : '',
  ].filter(Boolean);

  for (const query of queries) {
    try {
      const res = await fetch(`${base}/gateway/booking-service/orders?${query}`, {
        headers: innofulfillHeaders(token),
      });
      if (!res.ok) continue;
      const json: { data?: Array<Record<string, unknown>> | Record<string, unknown> } = await res.json();
      const raw = (Array.isArray(json?.data) ? json.data[0] : json?.data || json) as Record<string, unknown> | undefined;
      if (!raw || typeof raw !== 'object' || !Object.keys(raw).length) continue;
      // The field names below are read off their portal's columns rather than a
      // spec. Logging the real keys once lets the mapping be corrected against
      // a live response instead of guessed at again.
      console.log(`[TrackOrder] Innofulfill order via ${query}: ${Object.keys(raw).join(', ')}`);
      return raw;
    } catch (err) {
      console.warn(`[TrackOrder] Innofulfill lookup failed (${query}):`, err);
    }
  }
  return null;
}

function shipmentMessage(shipmentStatus: string, awbNumber: string | null, innofulfillOrderId: string | null): string {
  if (!innofulfillOrderId && shipmentStatus === SHIPMENT_STATUS.NOT_CREATED) {
    return 'Shipment not created yet';
  }
  if (innofulfillOrderId && !awbNumber) {
    return 'AWB awaiting shipment assignment';
  }
  if (!awbNumber) {
    return 'Tracking information will appear once the shipment is dispatched.';
  }
  return '';
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
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order tracking is not configured' }) };
    }

    const body = JSON.parse(event.body || '{}') as {
      orderId?: string;
      phone?: string;
      email?: string;
      phoneOrEmail?: string;
    };

    const targetOrderId = (body.orderId || '').trim();
    const verificationInput = (body.phoneOrEmail || body.phone || body.email || '').trim();
    if (!targetOrderId || !verificationInput) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order ID and either phone number or email are required' }) };
    }

    const filterFormula = encodeURIComponent(`{orderID} = "${targetOrderId}"`);
    const searchRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${filterFormula}&maxRecords=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!searchRes.ok) {
      return { statusCode: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Failed to search orders' }) };
    }

    let records: Array<{ id: string; fields?: Record<string, string | number> }> = (await searchRes.json()).records || [];
    if (!records.length) {
      const allRecentRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=100&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (allRecentRes.ok) {
        const recentJson: { records?: Array<{ id: string; fields?: Record<string, string | number> }> } = await allRecentRes.json();
        const found = (recentJson.records || []).find((r) => String(r.fields?.orderID ?? '').trim().toLowerCase() === targetOrderId.toLowerCase());
        if (found) records = [found];
      }
    }

    if (!records.length) {
      return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order not found. Please check your Order ID.' }) };
    }

    const record = records[0];
    const recordId = record.id;
    const f = record.fields || {};

    const storedPhone = cleanPhone(String(f.Phone || ''));
    const storedEmail = cleanEmail(String(f.Email || ''));
    const inputCleanPhone = cleanPhone(verificationInput);
    const inputCleanEmail = cleanEmail(verificationInput);
    const isPhoneMatch = inputCleanPhone.length === 10 && storedPhone === inputCleanPhone;
    const isEmailMatch = inputCleanEmail.length > 3 && storedEmail === inputCleanEmail;
    if (!isPhoneMatch && !isEmailMatch) {
      return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'The provided phone number or email does not match this order.' }) };
    }

    let awbNumber = sanitizeAwb(f['AWB Number'] ? String(f['AWB Number']) : undefined) || null;
    const storedTrackingId = sanitizeAwb(f['Tracking ID'] ? String(f['Tracking ID']) : undefined);
    if (!awbNumber && storedTrackingId) awbNumber = storedTrackingId;

    if (isFakeAwb(f['AWB Number'] ? String(f['AWB Number']) : undefined)) {
      console.warn(`[TrackOrder] Clearing fake AWB for ${targetOrderId}`);
      awbNumber = null;
      await patchAirtableRecord(baseId, table, token, recordId, {
        'AWB Number': '',
        'Tracking ID': '',
        'Shipment Status': SHIPMENT_STATUS.AWB_PENDING,
      });
    }

    const innofulfillOrderId = f['Innofulfill Order ID'] ? String(f['Innofulfill Order ID']).trim() : null;
    let courierName = f['Carrier Display Name'] ? String(f['Carrier Display Name']) : (f.Courier ? String(f.Courier) : null);
    let shipmentStatus = f['Shipment Status'] ? String(f['Shipment Status']) : (innofulfillOrderId ? SHIPMENT_STATUS.AWB_PENDING : SHIPMENT_STATUS.NOT_CREATED);
    const provider = f['Courier Provider'] ? String(f['Courier Provider']) : 'Innofulfill';

    // Only Innofulfill shipments are tracked. Shiprocket parcels are handled
    // off-site, so no carrier detail is shown for them at all.
    const isShiprocket = provider === 'Shiprocket';

    /** Innofulfill's own order status — "Ready for Dispatch", "Cancelled", etc. */
    let innofulfillStatus: string | null = null;
    /** Innofulfill's document number, e.g. RETR0000000187. */
    let innofulfillDocNo: string | null = null;

    if (!isShiprocket) {
      try {
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          const orderData = await fetchInnofulfillOrder(
            innoToken,
            innofulfillOrderId,
            String(f.orderID || targetOrderId),
          );
          if (orderData) {
            const shipment =
              (orderData.shipments as Array<Record<string, unknown>> | undefined)?.[0] || orderData;

            innofulfillStatus =
              pickString(orderData, 'orderStatus', 'status', 'currentStatus', 'orderState') ||
              pickString(shipment, 'shipmentStatus', 'status', 'currentStatus') ||
              null;

            innofulfillDocNo =
              pickString(orderData, 'documentNo', 'documentNumber', 'docNo', 'orderNumber', 'orderNo') ||
              null;

            const assignedAwb = sanitizeAwb(
              pickString(shipment, 'awbNumber', 'trackingNumber', 'awb') ||
              pickString(orderData, 'awbNumber', 'trackingNumber'),
            );
            const resolvedId = pickString(orderData, 'orderId', 'id');
            courierName =
              pickString(shipment, 'carrierDisplayName', 'carrierName') ||
              pickString(orderData, 'carrierDisplayName', 'carrierName') ||
              courierName;

            if (assignedAwb) {
              awbNumber = assignedAwb;
              shipmentStatus = SHIPMENT_STATUS.AWB_ASSIGNED;
            }

            // Backfill whatever the booking failed to store, so the admin table
            // and the next lookup don't have to rediscover it.
            const patch: Record<string, unknown> = {};
            if (assignedAwb) {
              patch['AWB Number'] = assignedAwb;
              patch['Tracking ID'] = assignedAwb;
            }
            if (resolvedId && !innofulfillOrderId) patch['Innofulfill Order ID'] = resolvedId;
            if (Object.keys(patch).length) {
              await patchAirtableRecord(baseId, table, token, recordId, patch);
            }

            // AWB just became available (it was pending at order time) — notify
            // the customer rather than leaving them to keep checking this page.
            if (assignedAwb && !f['AWB Email Sent']) {
              await sendAwbAssignedEmail(
                baseId, table, token, recordId,
                { name: String(f.Name || 'Customer'), email: String(f.Email || '') },
                String(f.orderID || targetOrderId), assignedAwb, courierName || 'Innofulfill', null,
              );
            }
          }
        }
      } catch (pollErr) {
        console.warn('[TrackOrder] Innofulfill status poll error:', pollErr);
      }
    }

    let trackingStatus: string | null = null;
    let trackingTimeline: Array<{ status?: string; date?: string; location?: string }> | null = null;
    let trackingUrl = f['Tracking URL'] ? String(f['Tracking URL']) : null;

    if (awbNumber && !isShiprocket) {
      try {
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          const trackRes = await fetch(
            `${getInnofulfillBase()}/gateway/booking-service/shipments/track?awb=${encodeURIComponent(awbNumber)}`,
            { headers: innofulfillHeaders(innoToken) },
          );
          if (trackRes.ok) {
            const trackJson: { data?: Record<string, unknown> } = await trackRes.json();
            const trackData = trackJson?.data || trackJson;
            trackingStatus = (trackData?.status as string | undefined) || (trackData?.shipmentStatus as string | undefined) || null;
            trackingTimeline = Array.isArray(trackData?.trackingHistory)
              ? (trackData.trackingHistory as Array<{ status?: string; date?: string; location?: string; timestamp?: string }>).map((event) => ({
                  status: event.status,
                  date: event.date || event.timestamp,
                  location: event.location,
                }))
              : null;
            if (trackData?.trackingUrl) trackingUrl = String(trackData.trackingUrl);
          }
        }
      } catch {
        // non-critical
      }
    }

    // Innofulfill's own order status is the more meaningful signal — it moves
    // through Ready for Dispatch / Pickup Rescheduled / Inscanned well before
    // any AWB scan event exists.
    if (innofulfillStatus) trackingStatus = innofulfillStatus;

    const statusMessage = isShiprocket
      ? 'Your order has been dispatched. We will share tracking details with you directly by email or WhatsApp.'
      : shipmentMessage(shipmentStatus, awbNumber, innofulfillOrderId);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        order: {
          orderId: String(f.orderID || targetOrderId),
          documentNumber: String(f.orderID || targetOrderId),
          orderDate: f.Created ? String(f.Created) : null,
          status: f.Status ? String(f.Status) : 'Processing',
          paymentStatus: f['Payment Status'] ? String(f['Payment Status']) : null,
          items: f.Items ? String(f.Items) : null,
          total: f['Total (₹)'] ? Number(f['Total (₹)']) : null,
          payment: f.Payment ? String(f.Payment) : null,
          delivery: f.Delivery ? String(f.Delivery) : null,
          name: f.Name ? String(f.Name) : null,
          // Shiprocket parcels expose no carrier detail here by design.
          awbNumber: isShiprocket ? null : awbNumber,
          awbDisplay: isShiprocket
            ? null
            : awbNumber || innofulfillDocNo || (innofulfillOrderId ? 'Awaiting shipment assignment' : null),
          courierName: isShiprocket ? null : courierName,
          innofulfillOrderId: isShiprocket ? null : innofulfillOrderId,
          /** Innofulfill's document number, e.g. RETR0000000187. */
          innofulfillDocNo: isShiprocket ? null : innofulfillDocNo,
          carrier: isShiprocket ? null : 'Innofulfill',
          shipmentStatus,
          statusMessage,
          trackingStatus: isShiprocket ? null : trackingStatus,
          trackingTimeline: isShiprocket ? null : trackingTimeline,
          trackingUrl: isShiprocket ? null : trackingUrl,
        },
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
