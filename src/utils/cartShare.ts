/**
 * Renders a branded image of the cart with the Canvas API and shares it to
 * WhatsApp via the Web Share API (mobile). Falls back to opening WhatsApp with
 * a text summary when file-sharing isn't supported (desktop / older browsers).
 *
 * Uses the Canvas API directly (no html2canvas) — deterministic, tiny, and
 * free of font/CORS quirks.
 */

export interface CartShareLine {
  name: string;
  config: string;
  qty: number;
  lineTotal: number; // INR
}

export interface CartShareData {
  lines: CartShareLine[];
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  couponCode: string | null;
  couponAmount: number;
  total: number;
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function drawCartImage(data: CartShareData): Promise<Blob> {
  const scale = 2;
  const W = 720;
  const pad = 32;
  const rowH = 64;
  const headerH = 108;
  const summaryRows =
    1 + (data.discountAmount > 0 ? 1 : 0) + (data.couponAmount > 0 ? 1 : 0) + 1; // subtotal, [disc], [coupon], total
  const summaryH = summaryRows * 40 + 40;
  const footerH = 70;
  const H = headerH + data.lines.length * rowH + summaryH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#040C1E';
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = '#22D3EE';
  ctx.font = '700 30px Inter, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('RetraLabs', pad, 44);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 16px Inter, Arial, sans-serif';
  ctx.fillText('Cart Summary — Price Enquiry', pad, 78);

  let y = headerH;

  // Items
  data.lines.forEach((l, i) => {
    if (i > 0) {
      ctx.strokeStyle = '#F1F5F9';
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(W - pad, y);
      ctx.stroke();
    }
    const cy = y + rowH / 2;
    ctx.fillStyle = '#111111';
    ctx.font = '600 18px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    const name = l.name.length > 34 ? l.name.slice(0, 33) + '…' : l.name;
    ctx.fillText(name, pad, cy - 11);
    ctx.fillStyle = '#6B7280';
    ctx.font = '400 14px Inter, Arial, sans-serif';
    ctx.fillText(`${l.config}  ·  Qty ${l.qty}`, pad, cy + 12);
    ctx.fillStyle = '#111111';
    ctx.font = '700 18px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(inr(l.lineTotal), W - pad, cy);
    y += rowH;
  });

  // Summary divider
  ctx.strokeStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(pad, y + 8);
  ctx.lineTo(W - pad, y + 8);
  ctx.stroke();
  y += 32;

  const summaryLine = (label: string, value: string, color = '#374151', bold = false) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? '700' : '500'} 16px Inter, Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, pad, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, W - pad, y);
    y += 40;
  };

  summaryLine('Subtotal', inr(data.subtotal));
  if (data.discountAmount > 0) summaryLine(`${data.discountPct}% discount`, '−' + inr(data.discountAmount), '#059669');
  if (data.couponAmount > 0) summaryLine(`Coupon${data.couponCode ? ' (' + data.couponCode + ')' : ''}`, '−' + inr(data.couponAmount), '#059669');

  // Total
  ctx.strokeStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(pad, y - 12);
  ctx.lineTo(W - pad, y - 12);
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.font = '800 22px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Total', pad, y + 8);
  ctx.textAlign = 'right';
  ctx.fillText(inr(data.total), W - pad, y + 8);
  y += 44;

  // Footer
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '400 13px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('retralabs.in · Free India-wide shipping · Research use only', W / 2, y + 20);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('image encode failed'))), 'image/png');
  });
}

export function buildCartMessage(data: CartShareData): string {
  const items = data.lines
    .map(l => `• ${l.name} (${l.config}) ×${l.qty} — ${inr(l.lineTotal)}`)
    .join('\n');
  const lines = [
    'Hi RetraLabs, I would like to discuss pricing for this cart:',
    '',
    items,
    '',
    `Subtotal: ${inr(data.subtotal)}`,
  ];
  if (data.discountAmount > 0) lines.push(`Discount: −${inr(data.discountAmount)}`);
  if (data.couponAmount > 0) lines.push(`Coupon: −${inr(data.couponAmount)}`);
  lines.push(`Total: ${inr(data.total)}`);
  return lines.join('\n');
}

export type ShareResult = 'shared' | 'cancelled' | 'text-fallback';

export async function shareCartToWhatsApp(data: CartShareData, phone: string): Promise<ShareResult> {
  const message = buildCartMessage(data);

  // Try sharing the image via the native share sheet (mobile).
  try {
    const blob = await drawCartImage(data);
    const file = new File([blob], 'retralabs-cart.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], text: message, title: 'RetraLabs Cart' });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    // otherwise fall through to text fallback
  }

  // Fallback: open WhatsApp chat with the business, pre-filled with the text.
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  return 'text-fallback';
}
