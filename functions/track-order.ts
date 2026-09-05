import {
  corsHeaders,
  getAirtableConfig,
  getInnofulfillBase,
  getInnofulfillToken,
  isFakeAwb,
  patchAirtableRecord,
  sanitizeAwb,
  SHIPMENT_STATUS,
} from './order-shared';

function cleanPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').replace(/^91/, '').slice(-10).padStart(10, '0');
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

    if ((!awbNumber || shipmentStatus === SHIPMENT_STATUS.AWB_PENDING) && innofulfillOrderId) {
      try {
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          const orderCheckRes = await fetch(
            `${getInnofulfillBase()}/gateway/booking-service/orders?orderId=${encodeURIComponent(innofulfillOrderId)}`,
            { headers: innofulfillHeaders(innoToken) },
          );
          if (orderCheckRes.ok) {
            const orderCheckJson: { data?: Array<Record<string, unknown>> | Record<string, unknown> } = await orderCheckRes.json();
            const orderData = Array.isArray(orderCheckJson?.data) ? orderCheckJson.data[0] : orderCheckJson?.data || orderCheckJson;
            const shipment = (orderData?.shipments as Array<Record<string, unknown>> | undefined)?.[0] || orderData || {};
            const assignedAwb = sanitizeAwb(
              (shipment?.awbNumber as string | undefined) ||
              (orderData?.awbNumber as string | undefined) ||
              (shipment?.trackingNumber as string | undefined),
            );
            if (assignedAwb) {
              awbNumber = assignedAwb;
              shipmentStatus = SHIPMENT_STATUS.AWB_ASSIGNED;
              courierName =
                (typeof shipment?.carrierDisplayName === 'string' && shipment.carrierDisplayName) ||
                (typeof orderData?.carrierDisplayName === 'string' && orderData.carrierDisplayName) ||
                courierName;
              await patchAirtableRecord(baseId, table, token, recordId, {
                'AWB Number': awbNumber,
                'Tracking ID': awbNumber,
                'Shipment Status': SHIPMENT_STATUS.AWB_ASSIGNED,
                ...(courierName ? { 'Carrier Display Name': courierName, Courier: courierName } : {}),
              });
            }
          }
        }
      } catch (pollErr) {
        console.warn('[TrackOrder] AWB poll error:', pollErr);
      }
    }

    let trackingStatus: string | null = null;
    let trackingTimeline: Array<{ status?: string; date?: string; location?: string }> | null = null;
    let trackingUrl = f['Tracking URL'] ? String(f['Tracking URL']) : null;

    if (awbNumber) {
      if (provider === 'Shiprocket') {
        try {
          const email = (process.env.SHIPROCKET_EMAIL || process.env.VITE_SHIPROCKET_EMAIL || '').trim();
          const password = (process.env.SHIPROCKET_PASSWORD || process.env.VITE_SHIPROCKET_PASSWORD || '').trim();
          if (email && password) {
            const srAuth: { token?: string } = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            }).then((r) => r.json()).catch(() => ({}));
            if (srAuth?.token) {
              const trackRes = await fetch(
                `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awbNumber)}`,
                { headers: { Authorization: `Bearer ${srAuth.token}` } },
              );
              if (trackRes.ok) {
                const trackJson: { tracking_data?: Record<string, unknown> } = await trackRes.json();
                const trackData = trackJson?.tracking_data || trackJson;
                trackingStatus = (trackData?.current_status as string | undefined) || null;
                const activities = trackData?.shipment_track_activities;
                trackingTimeline = Array.isArray(activities)
                  ? activities.map((act: { activity?: string; status?: string; date?: string; location?: string }) => ({
                      status: act.activity || act.status,
                      date: act.date,
                      location: act.location,
                    }))
                  : null;
                if (trackData?.track_url) trackingUrl = String(trackData.track_url);
              }
            }
          }
        } catch (srErr) {
          console.warn('[TrackOrder] Shiprocket tracking error:', srErr);
        }
      } else {
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
    }

    const statusMessage = shipmentMessage(shipmentStatus, awbNumber, innofulfillOrderId);

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
          awbNumber,
          awbDisplay: awbNumber || (innofulfillOrderId ? 'Awaiting shipment assignment' : null),
          courierName,
          innofulfillOrderId,
          shipmentStatus,
          statusMessage,
          trackingStatus,
          trackingTimeline,
          trackingUrl,
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
