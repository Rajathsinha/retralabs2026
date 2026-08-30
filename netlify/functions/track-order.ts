import type { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const INNOFULFILL_BASE = ['sandbox', 'test', 'true'].includes((process.env.INNOFULFILL_ENV || process.env.INNOFULFILL_SANDBOX || '').toLowerCase())
  ? 'https://sandbox.apis.innofulfill.com'
  : 'https://apis.innofulfill.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

function innofulfillHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tenantId = process.env.INNOFULFILL_TENANT_ID;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function getInnofulfillToken(): Promise<string | null> {
  const username = process.env.INNOFULFILL_USERNAME;
  const password = process.env.INNOFULFILL_PASSWORD;
  if (!username || !password) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${INNOFULFILL_BASE}/auth/login`, {
    method: 'POST',
    headers: innofulfillHeaders(),
    body: JSON.stringify({ username, password, signinType: 'EMAIL' }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Innofulfill auth failed (HTTP ${res.status}): ${detail}`);
  }
  const json: any = await res.json();
  const token = json?.id_token as string | undefined;
  if (!token) throw new Error('Innofulfill auth: no id_token in response');
  cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

function cleanPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').replace(/^91/, '').slice(-10).padStart(10, '0');
}

function cleanEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const token = process.env.VITE_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN;
    const baseId = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const table = process.env.VITE_AIRTABLE_TABLE || process.env.AIRTABLE_TABLE || 'Orders';

    if (!token || !baseId) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Order tracking is not configured' }),
      };
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
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Order ID and either phone number or email are required' }),
      };
    }

    // Search Airtable for the order by orderID (supporting exact match or case-insensitive)
    const filterFormula = encodeURIComponent(`{orderID} = "${targetOrderId}"`);
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${filterFormula}&maxRecords=1`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!searchRes.ok) {
      const detail = await searchRes.text().catch(() => '');
      return {
        statusCode: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Failed to search orders: ${detail}` }),
      };
    }

    const searchJson: any = await searchRes.json();
    let records = searchJson?.records || [];

    // Fallback: If not found by exact formula (e.g. historical orders where orderID had different case), search recent records
    if (!records.length) {
      const allRecentRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=100&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (allRecentRes.ok) {
        const recentJson: any = await allRecentRes.json();
        const found = (recentJson?.records || []).find((r: any) => {
          const id = String(r?.fields?.orderID ?? '').trim();
          return id.toLowerCase() === targetOrderId.toLowerCase();
        });
        if (found) {
          records = [found];
        }
      }
    }

    if (!records.length) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Order not found. Please check your Order ID.' }),
      };
    }

    const record = records[0];
    const recordId = record.id;
    const f = record.fields || {};

    // Verify identity against Phone OR Email
    const storedPhone = cleanPhone(String(f['Phone'] || ''));
    const storedEmail = cleanEmail(String(f['Email'] || ''));

    const inputCleanPhone = cleanPhone(verificationInput);
    const inputCleanEmail = cleanEmail(verificationInput);

    const isPhoneMatch = inputCleanPhone.length === 10 && storedPhone === inputCleanPhone;
    const isEmailMatch = inputCleanEmail.length > 3 && storedEmail === inputCleanEmail;

    if (!isPhoneMatch && !isEmailMatch) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'The provided phone number or email does not match this order. Please verify and try again.' }),
      };
    }

    let awbNumber = f['AWB Number'] ? String(f['AWB Number']).trim() : null;
    const innofulfillOrderId = f['Innofulfill Order ID'] ? String(f['Innofulfill Order ID']).trim() : null;
    const courierName = f['Carrier Display Name'] ? String(f['Carrier Display Name']) : (f['Courier'] ? String(f['Courier']) : 'Shreemaruti');
    let shipmentStatus = f['Shipment Status'] ? String(f['Shipment Status']) : (awbNumber ? 'AWB_ASSIGNED' : innofulfillOrderId ? 'AWB_PENDING' : 'NOT_CREATED');

    // If AWB is pending/missing but we have an Innofulfill Order ID, poll Innofulfill to see if courier has assigned the AWB
    if ((!awbNumber || shipmentStatus === 'AWB_PENDING') && innofulfillOrderId) {
      try {
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          // Attempt to retrieve order details by Innofulfill Order ID
          const orderCheckRes = await fetch(
            `${INNOFULFILL_BASE}/gateway/booking-service/orders?orderId=${encodeURIComponent(innofulfillOrderId)}`,
            { headers: innofulfillHeaders(innoToken) },
          );
          if (orderCheckRes.ok) {
            const orderCheckJson: any = await orderCheckRes.json();
            const orderData = orderCheckJson?.data?.[0] || orderCheckJson?.data || orderCheckJson;
            const assignedAwb =
              orderData?.shipments?.[0]?.awbNumber ||
              orderData?.awbNumber ||
              orderData?.shipments?.[0]?.trackingNumber;

            if (assignedAwb && String(assignedAwb).trim() !== '') {
              awbNumber = String(assignedAwb).trim();
              shipmentStatus = 'AWB_ASSIGNED';
              console.log(`[Innofulfill] AWB retrieved and saved: ${awbNumber}`);

              // Update Airtable with real assigned AWB
              const updatePayload = {
                'AWB Number': awbNumber,
                'Tracking ID': awbNumber,
                'Shipment Status': 'AWB_ASSIGNED',
              };
              await fetch(
                `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
                {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fields: updatePayload, typecast: true }),
                },
              ).catch(() => null);
            }
          }
        }
      } catch (pollErr) {
        console.warn('[Innofulfill] AWB poll attempt non-critical error:', pollErr);
      }
    }

    // Try to fetch live tracking timeline from Innofulfill if we have an assigned AWB
    let trackingStatus: string | null = null;
    let trackingTimeline: any[] | null = null;
    let trackingUrl: string | null = null;

    if (awbNumber) {
      try {
        const innoToken = await getInnofulfillToken();
        if (innoToken) {
          const trackRes = await fetch(
            `${INNOFULFILL_BASE}/gateway/booking-service/shipments/track?awb=${encodeURIComponent(awbNumber)}`,
            { headers: innofulfillHeaders(innoToken) },
          );
          if (trackRes.ok) {
            const trackJson: any = await trackRes.json();
            const trackData = trackJson?.data || trackJson;
            trackingStatus = trackData?.status || trackData?.shipmentStatus || null;
            trackingTimeline = Array.isArray(trackData?.trackingHistory) ? trackData.trackingHistory : null;
            if (trackData?.trackingUrl) trackingUrl = String(trackData.trackingUrl);
          }
        }
      } catch {
        // Tracking history fetch is non-critical
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        order: {
          orderId: String(f['orderID'] || targetOrderId),
          orderDate: f['Created'] ? String(f['Created']) : null,
          status: f['Status'] ? String(f['Status']) : 'Processing',
          items: f['Items'] ? String(f['Items']) : null,
          total: f['Total (₹)'] ? Number(f['Total (₹)']) : null,
          payment: f['Payment'] ? String(f['Payment']) : null,
          delivery: f['Delivery'] ? String(f['Delivery']) : null,
          name: f['Name'] ? String(f['Name']) : null,
          awbNumber,
          courierName,
          innofulfillOrderId,
          shipmentStatus,
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
