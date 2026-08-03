// ── Helpers ──────────────────────────────────────────────────────────────────

/** Escape user-entered text so it can't inject HTML in the email. */
export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a number as Indian Rupees with the ₹ symbol. */
export function formatCurrency(amount: number): string {
  return `&#8377;${amount.toLocaleString('en-IN')}`;
}

/** Format an ISO date string as "3 Aug 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderData {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  codCharge: number;
  total: number;
  paymentMethod: string;
  orderDate: string;
}

// ── Product table ─────────────────────────────────────────────────────────────

function generateProductTable(items: OrderItem[]): string {
  const headerRow = `
    <tr>
      <th style="text-align:left;padding:12px 14px;font-size:13px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Product</th>
      <th style="text-align:center;padding:12px 10px;font-size:13px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Qty</th>
      <th style="text-align:right;padding:12px 10px;font-size:13px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Unit Price</th>
      <th style="text-align:right;padding:12px 14px;font-size:13px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Line Total</th>
    </tr>`;

  const bodyRows = items.map((item) => `
    <tr>
      <td style="padding:14px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(item.name)}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${escapeHtml(item.variant)}</div>
      </td>
      <td style="text-align:center;padding:14px 10px;font-size:15px;color:#334155;border-bottom:1px solid #f1f5f9;">${item.quantity}</td>
      <td style="text-align:right;padding:14px 10px;font-size:15px;color:#334155;border-bottom:1px solid #f1f5f9;">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align:right;padding:14px;font-size:15px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${formatCurrency(item.unitPrice * item.quantity)}</td>
    </tr>`).join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100% !important;">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

// ── Totals section ────────────────────────────────────────────────────────────

function generateTotalsSection(order: OrderData): string {
  const rows: string[] = [];

  rows.push(totalsRow('Subtotal', formatCurrency(order.subtotal)));

  if (order.discount > 0) {
    rows.push(totalsRow('Volume Discount', `-${formatCurrency(order.discount)}`, '#16a34a'));
  }

  rows.push(totalsRow(
    'Delivery',
    order.deliveryCharge > 0 ? formatCurrency(order.deliveryCharge) : 'Free',
  ));

  if (order.codCharge > 0) {
    rows.push(totalsRow('COD Charge', formatCurrency(order.codCharge)));
  }

  rows.push(`
    <tr>
      <td style="padding-top:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:16px 18px;background:#1e3a8a;border-radius:10px;">
              <span style="font-size:16px;font-weight:700;color:#ffffff;">Total Paid</span>
            </td>
            <td style="padding:16px 18px;background:#1e3a8a;border-radius:10px;text-align:right;">
              <span style="font-size:20px;font-weight:800;color:#ffffff;">${formatCurrency(order.total)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`);

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100% !important;">
    ${rows.join('')}
  </table>`;
}

function totalsRow(label: string, value: string, valueColor = '#0f172a'): string {
  return `
    <tr>
      <td style="padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="font-size:14px;color:#64748b;">${label}</td>
            <td style="font-size:14px;font-weight:600;color:${valueColor};text-align:right;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ── Info card ──────────────────────────────────────────────────────────────────

function infoCard(rows: { label: string; value: string }[]): string {
  const content = rows.map((r) => `
    <tr>
      <td style="padding:6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#94a3b8;width:40%;">${escapeHtml(r.label)}</td>
            <td style="font-size:14px;font-weight:600;color:#1e293b;">${escapeHtml(r.value)}</td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100% !important;">
    ${content}
  </table>`;
}

// ── Main template ──────────────────────────────────────────────────────────────

export function generateOrderConfirmationEmail(order: OrderData): string {
  const firstName = escapeHtml(order.name.split(' ')[0] || order.name);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order Confirmed</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 24px 20px;">
              <div style="font-size:28px;font-weight:800;color:#1e3a8a;letter-spacing:-0.5px;">RetraLabs</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Premium Peptides</div>
            </td>
          </tr>

          <!-- Order Confirmed banner -->
          <tr>
            <td style="padding:0 24px;">
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;text-align:center;">
                <div style="display:inline-block;width:40px;height:40px;background:#16a34a;border-radius:50%;line-height:40px;color:#ffffff;font-size:22px;font-weight:700;vertical-align:middle;">&#10003;</div>
                <div style="font-size:20px;font-weight:700;color:#065f46;margin-top:10px;">Order Confirmed</div>
                <div style="font-size:13px;color:#047857;margin-top:4px;">Thank you for your purchase</div>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 24px 8px;">
              <div style="font-size:18px;font-weight:700;color:#0f172a;">Hi ${firstName},</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <div style="font-size:15px;line-height:1.6;color:#475569;">
                We've received your order and it's being prepared for dispatch. A summary of your purchase is below — keep this email for your records.
              </div>
            </td>
          </tr>

          <!-- Order Summary card -->
          <tr>
            <td style="padding:0 24px 8px;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Order Summary</div>
                ${infoCard([
                  { label: 'Order ID', value: order.orderId },
                  { label: 'Order Date', value: formatDate(order.orderDate) },
                  { label: 'Payment Method', value: order.paymentMethod },
                  { label: 'Total Amount', value: formatCurrency(order.total) },
                ])}
              </div>
            </td>
          </tr>

          <!-- Products table -->
          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Products</div>
              ${generateProductTable(order.items)}
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:16px 24px 24px;">
              ${generateTotalsSection(order)}
            </td>
          </tr>

          <!-- Shipping Address card -->
          <tr>
            <td style="padding:0 24px 8px;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Shipping Address</div>
                ${infoCard([
                  { label: 'Name', value: order.name },
                  { label: 'Address', value: order.address },
                  { label: 'City', value: order.city },
                  { label: 'State', value: order.state },
                  { label: 'PIN', value: order.pincode },
                  { label: 'Phone', value: order.phone },
                  { label: 'Email', value: order.email },
                ])}
              </div>
            </td>
          </tr>

          <!-- What's Next section -->
          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:12px;">What's Next?</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top;width:32px;">
                    <div style="width:24px;height:24px;background:#dbeafe;border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:700;color:#1e3a8a;">1</div>
                  </td>
                  <td style="padding-bottom:14px;">
                    <div style="font-size:14px;font-weight:600;color:#1e293b;">Order Processing</div>
                    <div style="font-size:13px;color:#64748b;line-height:1.5;margin-top:2px;">We're preparing your order with care. Most orders ship within 24-48 hours.</div>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:32px;">
                    <div style="width:24px;height:24px;background:#dbeafe;border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:700;color:#1e3a8a;">2</div>
                  </td>
                  <td style="padding-bottom:14px;">
                    <div style="font-size:14px;font-weight:600;color:#1e293b;">Dispatch &amp; Tracking</div>
                    <div style="font-size:13px;color:#64748b;line-height:1.5;margin-top:2px;">Once shipped, we'll send you a tracking number via WhatsApp so you can follow your delivery in real time.</div>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:32px;">
                    <div style="width:24px;height:24px;background:#dbeafe;border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:700;color:#1e3a8a;">3</div>
                  </td>
                  <td>
                    <div style="font-size:14px;font-weight:600;color:#1e293b;">Delivery</div>
                    <div style="font-size:13px;color:#64748b;line-height:1.5;margin-top:2px;">Your order will arrive at the shipping address above. Standard delivery takes 3-5 business days.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support section -->
          <tr>
            <td style="padding:24px;">
              <div style="background:#1e3a8a;border-radius:12px;padding:24px;text-align:center;">
                <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:8px;">Need Help?</div>
                <div style="font-size:13px;color:#bfdbfe;line-height:1.6;">
                  Reply to this email or reach us at<br>
                  <a href="mailto:orders@retralabs.in" style="color:#ffffff;font-weight:600;text-decoration:underline;">orders@retralabs.in</a><br>
                  <a href="https://retralabs.in" style="color:#ffffff;font-weight:600;text-decoration:underline;">https://retralabs.in</a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px;border-top:1px solid #e2e8f0;">
              <div style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                &copy; ${new Date().getFullYear()} RetraLabs. All rights reserved.<br>
                This email was sent regarding your order #${escapeHtml(order.orderId)}.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
