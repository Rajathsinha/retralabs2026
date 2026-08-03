/**
 * Reusable helper that sends a Brevo transactional order-confirmation email
 * through the `brevo-order-email` Netlify Function.
 *
 * The Brevo API key lives server-side only (as a Netlify env var) and is never
 * exposed to the browser. This helper forwards the structured order details
 * the server needs to build the HTML email.
 */

export interface OrderEmailItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderEmailParams {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  codCharge: number;
  total: number;
  paymentMethod: string;
  orderDate?: string;
}

/**
 * Sends an order confirmation email via Brevo.
 * Resolves to `{ success: true }` on success, or `{ success: false, error }` on failure.
 * Never throws — callers can fire-and-forget or log the failure without a try/catch.
 */
export async function sendOrderConfirmationEmail(
  params: OrderEmailParams,
): Promise<{ success: true; messageId?: string } | { success: false, error: string }> {
  try {
    const res = await fetch('/.netlify/functions/brevo-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const json: any = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const detail = json?.error || `Email request failed (HTTP ${res.status})`;
      return { success: false, error: detail };
    }

    return { success: true, messageId: json.messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
