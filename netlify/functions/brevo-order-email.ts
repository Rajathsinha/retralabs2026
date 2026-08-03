import type { Handler } from '@netlify/functions';

interface OrderEmailParams {
  name: string;
  email: string;
  phone: string;
  address: string;
  products: string;
  amount: string;
  payment_method: string;
  orderID: string;
}

const REQUIRED: (keyof OrderEmailParams)[] = [
  'name',
  'email',
  'phone',
  'address',
  'products',
  'amount',
  'payment_method',
  'orderID',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    const body = JSON.parse(event.body || '{}') as Partial<OrderEmailParams>;

    const missing = REQUIRED.filter((k) => !body[k] || String(body[k]).trim() === '');
    if (missing.length) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
      };
    }

    const apiKey = process.env.BREVO_API_KEY;
    const templateIdStr = process.env.BREVO_TEMPLATE_ID;
    if (!apiKey || !templateIdStr) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Brevo is not configured (missing API key or template ID)' }),
      };
    }
    const templateId = Number(templateIdStr);
    if (!Number.isFinite(templateId)) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'BREVO_TEMPLATE_ID must be a numeric template ID' }),
      };
    }

    const payload = {
      templateId,
      to: [{ email: body.email!, name: body.name! }],
      params: {
        name: body.name!,
        email: body.email!,
        phone: body.phone!,
        address: body.address!,
        products: body.products!,
        amount: body.amount!,
        payment_method: body.payment_method!,
        orderID: body.orderID!,
      },
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        statusCode: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Brevo request failed (HTTP ${res.status})`, detail }),
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, messageId: (data as any)?.messageId ?? null }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
