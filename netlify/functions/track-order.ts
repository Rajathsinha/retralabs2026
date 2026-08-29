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

    const body = JSON.parse(event.body || '{}') as { orderId?: string; phone?: string };
    if (!body.orderId || !body.phone) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Order ID and phone number are required' }),
      };
    }

    const cleanInputPhone = cleanPhone(body.phone);

    // Search Airtable for the order by orderID
    const filterFormula = encodeURIComponent(`{orderID} = "${body.orderId}"`);
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
    const records = searchJson?.records || [];
    if (!records.length) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Order not found. Please check your Order ID.' }),
      };
    }

    const record = records[0];
    const f = record.fields || {};

    // Verify phone matches — security check to prevent looking up other customers' orders
    const storedPhone = cleanPhone(String(f['Phone'] || ''));
    if (storedPhone !== cleanInputPhone) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'The phone number does not match this order. Please verify and try again.' }),
      };
    }

    const awbNumber = f['AWB Number'] ? String(f['AWB Number']) : null;
    const innofulfillOrderId = f['Innofulfill Order ID'] ? String(f['Innofulfill Order ID']) : null;
    const courierName = f['Courier'] ? String(f['Courier']) : (innofulfillOrderId ? 'Innofulfill' : null);

    // Try to fetch tracking status from Innofulfill if we have an AWB
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
        // Tracking fetch is non-critical — return what we have from Airtable
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        order: {
          orderId: String(f['orderID'] || body.orderId),
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
