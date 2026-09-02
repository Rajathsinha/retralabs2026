import { getInnofulfillToken } from './create-order';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function getInnofulfillBase(): string {
  const isSandbox = (process.env.INNOFULFILL_ENV || process.env.INNOFULFILL_SANDBOX || '')
    .toLowerCase() === 'sandbox';
  return isSandbox
    ? 'https://sandbox.apis.innofulfill.com'
    : 'https://apis.innofulfill.com';
}

function innofulfillHeaders(token: string): Record<string, string> {
  const tenantId = process.env.INNOFULFILL_TENANT_ID || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'TenantId': tenantId,
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { toPincode, paymentMode = 'PREPAID', fromPincode = '560016' } = body;

    if (!toPincode) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'toPincode is required' }) };
    }

    const token = await getInnofulfillToken();
    if (!token) {
      throw new Error('Innofulfill auth failed');
    }

    const innoBase = getInnofulfillBase();
    const carrierName = process.env.INNOFULFILL_CARRIER_NAME || 'innofulfill_ecomm';

    const mappedPaymentMode = paymentMode.toUpperCase() === 'PREPAY' ? 'PREPAID' : paymentMode.toUpperCase();

    const payload = {
      fromPincode: parseInt(fromPincode, 10),
      toPincode: parseInt(toPincode, 10),
      paymentMode: mappedPaymentMode,
      operationType: 'PICKUP_DELIVERY',
      carriers: [carrierName]
    };

    const res = await fetch(`${innoBase}/gateway/serviceability/ecomm`, {
      method: 'POST',
      headers: innofulfillHeaders(token),
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    
    if (!res.ok) {
      console.error('[Innofulfill Serviceability] Error API response:', json);
      return { statusCode: res.status, headers: corsHeaders, body: JSON.stringify({ error: 'Serviceability check failed', details: json }) };
    }

    const data = json.data?.[0];
    const carrierStatus = data?.carriers?.[0];
    
    // If the carrier provided doesn't match or the default SMILE is used, we just check the first carrier returned.
    const isServiceable = carrierStatus?.serviceable === true;
    const reason = carrierStatus?.reason || '';

    return { 
      statusCode: 200, 
      headers: corsHeaders, 
      body: JSON.stringify({ 
        serviceable: isServiceable,
        reason: reason,
        raw: json
      }) 
    };

  } catch (err: any) {
    console.error('[Innofulfill Serviceability] Error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};
