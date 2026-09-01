
import {
  generateOrderConfirmationEmail,
  type OrderData,
  type OrderItem,
} from './email-template';

interface IncomingOrder {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  codCharge?: number;
  total: number;
  paymentMethod: string;
  orderDate?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
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
    const body = JSON.parse(event.body || '{}') as Partial<IncomingOrder>;

    const required: (keyof IncomingOrder)[] = [
      'orderId', 'name', 'email', 'phone', 'address', 'items', 'total', 'paymentMethod',
    ];
    const missing = required.filter((k) => !body[k] || String(body[k]).trim() === '');
    if (missing.length) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
      };
    }

    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Brevo is not configured (missing BREVO_API_KEY env var)' }),
      };
    }

    const order: OrderData = {
      orderId: body.orderId!,
      name: body.name!,
      email: body.email!,
      phone: body.phone!,
      address: body.address!,
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      items: body.items || [],
      subtotal: body.subtotal ?? body.total!,
      discount: body.discount ?? 0,
      deliveryCharge: body.deliveryCharge ?? 0,
      codCharge: body.codCharge ?? 0,
      total: body.total!,
      paymentMethod: body.paymentMethod!,
      orderDate: body.orderDate || new Date().toISOString(),
    };

    const htmlContent = generateOrderConfirmationEmail(order);

    const payload = {
      sender: {
        name: 'RetraLabs',
        email: 'orders@retralabs.in',
      },
      to: [{ email: order.email, name: order.name }],
      subject: `Order #${order.orderId} Confirmed`,
      htmlContent,
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
        body: JSON.stringify({
          error: `Brevo request failed (HTTP ${res.status})`,
          detail,
        }),
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
