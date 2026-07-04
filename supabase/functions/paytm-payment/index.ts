import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InitiatePaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

interface PaymentCallbackRequest {
  orderId: string;
  txnId: string;
  status: string;
  amount: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/paytm-payment', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (path === '/initiate' && req.method === 'POST') {
      const body: InitiatePaymentRequest = await req.json();

      const paytmMerchantId = Deno.env.get('PAYTM_MERCHANT_ID');
      const paytmMerchantKey = Deno.env.get('PAYTM_MERCHANT_KEY');
      const paytmWebsite = Deno.env.get('PAYTM_WEBSITE') || 'DEFAULT';
      const paytmEnv = Deno.env.get('PAYTM_ENVIRONMENT') || 'STAGING';

      if (!paytmMerchantId || !paytmMerchantKey) {
        return new Response(
          JSON.stringify({
            error: 'Paytm credentials not configured. Please configure PAYTM_MERCHANT_ID and PAYTM_MERCHANT_KEY.'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const paytmOrderId = `ORDER_${body.orderId}_${Date.now()}`;
      const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/paytm-payment/callback`;

      const paytmParams = {
        MID: paytmMerchantId,
        WEBSITE: paytmWebsite,
        INDUSTRY_TYPE_ID: 'Retail',
        CHANNEL_ID: 'WEB',
        ORDER_ID: paytmOrderId,
        CUST_ID: body.customerEmail,
        TXN_AMOUNT: body.amount.toString(),
        CALLBACK_URL: callbackUrl,
        EMAIL: body.customerEmail,
        MOBILE_NO: body.customerPhone,
      };

      const checksum = await generateChecksum(paytmParams, paytmMerchantKey);

      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          paytm_order_id: paytmOrderId,
          payment_method: 'paytm',
        })
        .eq('id', body.orderId);

      if (updateError) {
        throw updateError;
      }

      const paytmUrl = paytmEnv === 'PRODUCTION'
        ? 'https://securegw.paytm.in/order/process'
        : 'https://securegw-stage.paytm.in/order/process';

      return new Response(
        JSON.stringify({
          paytmUrl,
          paytmParams: {
            ...paytmParams,
            CHECKSUMHASH: checksum,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (path === '/callback' && req.method === 'POST') {
      const formData = await req.formData();
      const paytmParams: Record<string, string> = {};

      formData.forEach((value, key) => {
        paytmParams[key] = value.toString();
      });

      const receivedChecksum = paytmParams.CHECKSUMHASH;
      delete paytmParams.CHECKSUMHASH;

      const paytmMerchantKey = Deno.env.get('PAYTM_MERCHANT_KEY');
      if (!paytmMerchantKey) {
        throw new Error('Paytm merchant key not configured');
      }

      const isValidChecksum = await verifyChecksum(paytmParams, paytmMerchantKey, receivedChecksum);

      if (!isValidChecksum) {
        return new Response('Invalid checksum', { status: 400, headers: corsHeaders });
      }

      const paytmOrderId = paytmParams.ORDERID;
      const txnId = paytmParams.TXNID;
      const status = paytmParams.STATUS;

      const { data: order } = await supabaseClient
        .from('orders')
        .select('id')
        .eq('paytm_order_id', paytmOrderId)
        .single();

      if (order) {
        await supabaseClient
          .from('orders')
          .update({
            payment_status: status === 'TXN_SUCCESS' ? 'completed' : 'failed',
            paytm_txn_id: txnId,
            payment_completed_at: status === 'TXN_SUCCESS' ? new Date().toISOString() : null,
          })
          .eq('id', order.id);
      }

      const redirectUrl = status === 'TXN_SUCCESS'
        ? `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment-success?orderId=${order?.id}`
        : `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment-failed?orderId=${order?.id}`;

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
        },
      });
    }

    if (path === '/verify' && req.method === 'POST') {
      const { orderId } = await req.json();

      const { data: order, error } = await supabaseClient
        .from('orders')
        .select('payment_status, paytm_txn_id')
        .eq('id', orderId)
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          paymentStatus: order.payment_status,
          txnId: order.paytm_txn_id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateChecksum(params: Record<string, string>, merchantKey: string): Promise<string> {
  const paramStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('|');

  const data = new TextEncoder().encode(paramStr + '|' + merchantKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyChecksum(
  params: Record<string, string>,
  merchantKey: string,
  receivedChecksum: string
): Promise<boolean> {
  const calculatedChecksum = await generateChecksum(params, merchantKey);
  return calculatedChecksum === receivedChecksum;
}
