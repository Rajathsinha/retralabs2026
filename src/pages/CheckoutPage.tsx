import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
} from '@heroui/react';
import { getProductImageUrl, BAC_WATER_IMAGE_URL } from '../utils/imageUrl';
import { Minus, Plus, Trash2, Check, MessageCircle, Tag, ShoppingBag, ArrowRight, X, GraduationCap, Zap, Clock, Banknote } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { OrderFormData } from '../types';
import UpiQrModal from '../components/UpiQrModal';

const FAST_DELIVERY_CHARGE = 800;
const WHATSAPP_SUPPORT_NUMBER = '918217824384';

// ── Airtable ────────────────────────────────────────────────────────────────
async function saveToAirtable(payload: Record<string, unknown>): Promise<string | null> {
  const token  = import.meta.env.VITE_AIRTABLE_TOKEN;
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
  const table  = import.meta.env.VITE_AIRTABLE_TABLE  || 'Orders';
  if (!token || !baseId) return null;
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: payload, typecast: true }),
  });
  const json = await res.json();
  return json.id || null;
}

async function uploadScreenshot(recordId: string, file: File) {
  const token  = import.meta.env.VITE_AIRTABLE_TOKEN;
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
  if (!token || !baseId) return;
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip "data:image/...;base64," prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  await fetch(
    `https://content.airtable.com/v0/${baseId}/${recordId}/Screenshot/uploadAttachment`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type, filename: file.name, file: base64 }),
    }
  );
}

// ── Email HTML builder ────────────────────────────────────────────────────────
function buildOrderEmailHtml(o: { name: string; phone: string; address: string; items: string; total: number; delivery: string; payment: string; txnRef?: string }) {
  const itemRows = o.items.split('\n').map(line => `<li style="margin-bottom:4px">${line}</li>`).join('');
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 16px">
      <div style="background:#040C1E;border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
        <span style="color:#00C896;font-weight:900;font-size:22px;letter-spacing:-0.03em">RetraLabs</span>
        <p style="color:#94a3b8;font-size:13px;margin:4px 0 0">Order Confirmation</p>
      </div>
      <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px">
        <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 4px">Hi ${o.name},</p>
        <p style="color:#475569;font-size:14px;margin:0 0 20px">Your order has been received. We'll confirm and process it shortly.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px"/>
        <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px">Items Ordered</p>
        <ul style="color:#334155;font-size:14px;padding-left:20px;margin:0 0 16px">${itemRows}</ul>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 12px"/>
        <table style="width:100%;font-size:14px;color:#475569">
          <tr><td>Delivery Address</td><td style="text-align:right;color:#0f172a;font-weight:600">${o.address}</td></tr>
          <tr><td>Delivery Speed</td><td style="text-align:right;color:#0f172a;font-weight:600">${o.delivery}</td></tr>
          <tr><td>Payment</td><td style="text-align:right;color:#0f172a;font-weight:600">${o.payment}</td></tr>
          ${o.txnRef ? `<tr><td>Transaction Ref</td><td style="text-align:right;color:#0f172a;font-weight:600">${o.txnRef}</td></tr>` : ''}
          <tr><td style="padding-top:12px;font-weight:700;color:#0f172a;font-size:16px">Total</td><td style="text-align:right;padding-top:12px;font-weight:900;color:#0f172a;font-size:18px">₹${o.total.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">RetraLabs · Research Use Only · Not for Human Consumption</p>
    </div>`;
}

// ── Resend email to customer ─────────────────────────────────────────────────
async function sendResendEmail(to: string, subject: string, html: string) {
  const key = import.meta.env.VITE_RESEND_API_KEY;
  if (!key) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'orders@retralabs.in', to, subject, html }),
  });
}

// ── Interakt WhatsApp to customer ────────────────────────────────────────────
async function sendInteraktWhatsApp(phone: string, bodyValues: string[]) {
  const apiKey = import.meta.env.VITE_INTERAKT_API_KEY;
  if (!apiKey) return;
  // Strip country code — Interakt wants bare 10-digit number + countryCode separately
  const bare = phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);
  await fetch('https://api.interakt.ai/v1/public/message/', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      countryCode: '+91',
      phoneNumber: bare,
      callbackData: 'order_confirmation',
      type: 'Template',
      template: {
        name: 'order_details',
        languageCode: 'en',
        bodyValues,
      },
    }),
  });
}

function getCodCharge(orderTotal: number): number {
  if (orderTotal <= 8000)  return 600;
  if (orderTotal <= 16000) return 1200;
  return 1500;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { format, currency } = useCurrency();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getSubtotal,
    getDiscount,
    getDiscountAmount,
    couponCode,
    applyCoupon,
    removeCoupon,
    getCouponAmount,
  } = useCart();

  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    pincode: '',
    disclaimer_accepted: false,
    age_confirmed: false,
    no_dosing_accepted: false,
    referral_source: '',
    referral_friend_name: '',
    delivery_option: 'normal',
  });

  const [paymentMethod, setPaymentMethod] = useState<'prepay' | 'cod'>('prepay');

  const deliveryCharge = formData.delivery_option === 'fast' ? FAST_DELIVERY_CHARGE : 0;
  const codCharge      = paymentMethod === 'cod' ? getCodCharge(getTotal() + deliveryCharge) : 0;
  const grandTotal     = getTotal() + deliveryCharge + codCharge;

  /* ── Restore saved contact details from localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rl_customer_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (_) {}
  }, []);

  /* ── Persist contact details permanently (survives order completion) ── */
  useEffect(() => {
    const { customer_name, customer_email, customer_phone, shipping_address, pincode, referral_source, referral_friend_name, delivery_option } = formData;
    try {
      localStorage.setItem('rl_customer_details', JSON.stringify({
        customer_name, customer_email, customer_phone, shipping_address, pincode, referral_source, referral_friend_name, delivery_option,
      }));
    } catch (_) {}
  }, [formData]);

  const [orderReady, setOrderReady] = useState(false);   // step 2: review screen
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [orderSent,   setOrderSent]   = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [orderSnapshot, setOrderSnapshot] = useState<{
    items: string;
    total: number;
    cartItems: Array<{ name: string; config: string; qty: number; price: number }>;
    deliveryOption: string;
    paymentMethod: 'prepay' | 'cod';
    deliveryCharge: number;
    codCharge: number;
  } | null>(null);
  const orderSaving = useRef(false); // prevent double-save

  // coupon input state
  const [couponInput,  setCouponInput]  = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [couponMsg,    setCouponMsg]    = useState('');

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const result = applyCoupon(couponInput);
    setCouponStatus(result.success ? 'success' : 'error');
    setCouponMsg(result.message);
    if (result.success) setCouponInput('');
  };

  /** Step 1 → 2: validate form and build WhatsApp URL, but don't open yet */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (formData.pincode.length !== 6) {
      alert('Please enter a valid 6-digit PIN code.');
      return;
    }
    if (!formData.referral_source) {
      document.getElementById('referral-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);

    const lines = cart.map(
      (item) => {
        const config = item.variant.vial_configuration || `${item.variant.dosage_mg}mg`;
        return `• ${item.product.name} (${config}) — ₹${item.variant.price_inr.toLocaleString('en-IN')} × ${item.quantity}`;
      }
    );

    const discountText =
      getDiscountAmount() > 0
        ? `\n*Subtotal:* ₹${getSubtotal().toLocaleString('en-IN')}\n*Peptide Discount:* -₹${getDiscountAmount().toLocaleString('en-IN')}`
        : '';

    const couponAmt = getCouponAmount();
    const couponText = couponCode && couponAmt > 0
      ? `\n*Coupon (${couponCode}):* -₹${couponAmt.toLocaleString('en-IN')}`
      : '';

    const referralLine = formData.referral_source
      ? `\nFound us via: ${formData.referral_source}${formData.referral_source === 'Friend' && formData.referral_friend_name ? ` (referred by ${formData.referral_friend_name})` : ''}`
      : '';

    const deliveryLine = formData.delivery_option === 'fast'
      ? `\n*Delivery: Express (1–2 days, major cities) — +₹${FAST_DELIVERY_CHARGE.toLocaleString('en-IN')}*`
      : `\n*Delivery: Standard (3–4 days Tier 1/2 · 4–6 days remote) — Free*`;

    const paymentLine = paymentMethod === 'cod'
      ? `\n*Payment: Cash on Delivery — +₹${codCharge.toLocaleString('en-IN')} COD fee*`
      : `\n*Payment: Online (UPI)*`;

    const message =
      `*New Order — RetraLabs.in*\n\n` +
      `*Customer*\n` +
      `Name: ${formData.customer_name}\n` +
      `Email: ${formData.customer_email}\n` +
      `Phone: ${formData.customer_phone}${referralLine}\n\n` +
      `*Shipping Address*\n${formData.shipping_address}${formData.pincode ? `, PIN: ${formData.pincode}` : ''}\n\n` +
      `*Items*\n${lines.join('\n')}` +
      `${discountText}` +
      `${couponText}` +
      `${deliveryLine}` +
      `${paymentLine}\n\n` +
      `*Total: ₹${grandTotal.toLocaleString('en-IN')}*` +
      (currency.code !== 'INR' ? ` (~${format(grandTotal)})` : '') +
      (paymentMethod === 'cod' ? `\n\n⚠️ COD order — please confirm availability before dispatching.` : `\n\nPayment via UPI preferred (INR).`);

    setWhatsappUrl(`https://wa.me/918217824384?text=${encodeURIComponent(message)}`);
    setTimeout(() => {
      setOrderReady(true);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 600);
  };

  /** Step 2 → 3: save order + notify customer automatically */
  const handleConfirmOrder = async () => {
    if (orderSaving.current || confirming) return;
    orderSaving.current = true;
    setConfirming(true);

    // Capture everything before any awaits so values are never stale
    const cartSnapshot = cart.map(item => ({ ...item }));
    const snapTotal = grandTotal;
    const snapDeliveryCharge = deliveryCharge;
    const snapCodCharge = codCharge;
    const snapPaymentMethod = paymentMethod;
    const snapFormData = { ...formData };

    const itemsSummary = cartSnapshot
      .map(i => `${i.product.name} ${i.variant.dosage_mg}mg x${i.quantity} = ₹${(i.variant.price_inr * i.quantity).toLocaleString('en-IN')}`)
      .join('\n');
    const itemsSummaryFlat = cartSnapshot
      .map(i => `${i.product.name} ${i.variant.dosage_mg}mg x${i.quantity}`)
      .join(', ');

    try {
    const interaktValues = [
      snapFormData.customer_name,
      itemsSummaryFlat,
      `₹${snapTotal.toLocaleString('en-IN')}`,
      `${snapFormData.shipping_address}, PIN: ${snapFormData.pincode}`,
    ];

    const emailHtml = buildOrderEmailHtml({
      name: snapFormData.customer_name,
      phone: snapFormData.customer_phone,
      address: `${snapFormData.shipping_address}, PIN: ${snapFormData.pincode}`,
      items: itemsSummary,
      total: snapTotal,
      delivery: snapFormData.delivery_option === 'fast' ? 'Express' : 'Standard',
      payment: snapPaymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI / Online',
    });

    try {
      await Promise.all([
        saveToAirtable({
          'Name':     snapFormData.customer_name,
          'Email':    snapFormData.customer_email,
          'Phone':    snapFormData.customer_phone,
          'Address':  `${snapFormData.shipping_address}, PIN: ${snapFormData.pincode}`,
          'Items':    itemsSummary,
          'Total':    snapTotal,
          'Payment':  snapPaymentMethod === 'cod' ? 'COD' : 'UPI/Prepay',
          'Delivery': snapFormData.delivery_option === 'fast' ? 'Express' : 'Standard',
          'Referral': snapFormData.referral_source,
          'Status':   'New',
          'Created':  new Date().toISOString().slice(0, 10),
        }),
        sendInteraktWhatsApp(snapFormData.customer_phone, interaktValues),
        sendResendEmail(snapFormData.customer_email, 'Your RetraLabs Order is Confirmed!', emailHtml),
      ]);
    } catch (_) {
      // non-blocking
    }

      setOrderSnapshot({
        items: itemsSummaryFlat,
        total: snapTotal,
        cartItems: cartSnapshot.map(i => ({ name: i.product.name, config: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`, qty: i.quantity, price: i.variant.price_inr })),
        deliveryOption: snapFormData.delivery_option,
        paymentMethod: snapPaymentMethod,
        deliveryCharge: snapDeliveryCharge,
        codCharge: snapCodCharge,
      });
      clearCart();
      setOrderSent(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } finally {
      setConfirming(false);
      orderSaving.current = false;
    }
  };

  const handleQrPaymentConfirmed = async (txnRef: string, screenshot: File | null) => {
    if (orderSaving.current) return;
    orderSaving.current = true;

    // Capture everything before any awaits
    const cartSnapshot = cart.map(item => ({ ...item }));
    const snapTotal = grandTotal;
    const snapDeliveryCharge = deliveryCharge;
    const snapFormData = { ...formData };

    const itemsSummary = cartSnapshot
      .map(i => `${i.product.name} ${i.variant.dosage_mg}mg x${i.quantity} = ₹${(i.variant.price_inr * i.quantity).toLocaleString('en-IN')}`)
      .join('\n');
    const itemsSummaryFlat = cartSnapshot
      .map(i => `${i.product.name} ${i.variant.dosage_mg}mg x${i.quantity}`)
      .join(', ');

    const interaktValues = [
      snapFormData.customer_name,
      itemsSummaryFlat,
      `₹${snapTotal.toLocaleString('en-IN')}`,
      `${snapFormData.shipping_address}, PIN: ${snapFormData.pincode}`,
    ];

    const emailHtml = buildOrderEmailHtml({
      name: snapFormData.customer_name,
      phone: snapFormData.customer_phone,
      address: `${snapFormData.shipping_address}, PIN: ${snapFormData.pincode}`,
      items: itemsSummary,
      total: snapTotal,
      delivery: snapFormData.delivery_option === 'fast' ? 'Express' : 'Standard',
      payment: 'UPI QR',
      txnRef,
    });

    try {
      const [recordId] = await Promise.all([
        saveToAirtable({
          'Name':        snapFormData.customer_name,
          'Email':       snapFormData.customer_email,
          'Phone':       snapFormData.customer_phone,
          'Address':     `${snapFormData.shipping_address}, PIN: ${snapFormData.pincode}`,
          'Items':       itemsSummary,
          'Total':       snapTotal,
          'Payment':     'UPI QR',
          'Delivery':    snapFormData.delivery_option === 'fast' ? 'Express' : 'Standard',
          'Referral':    snapFormData.referral_source,
          'Transaction': txnRef,
          'Status':      'Paid',
          'Created':     new Date().toISOString().slice(0, 10),
        }),
        sendInteraktWhatsApp(snapFormData.customer_phone, interaktValues),
        sendResendEmail(snapFormData.customer_email, 'Your RetraLabs Order is Confirmed!', emailHtml),
      ]);
      if (recordId && screenshot) {
        await uploadScreenshot(recordId, screenshot);
      }
    } catch (_) {
      // non-blocking
    }

    setOrderSnapshot({
      items: itemsSummaryFlat,
      total: snapTotal,
      cartItems: cartSnapshot.map(i => ({ name: i.product.name, config: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`, qty: i.quantity, price: i.variant.price_inr })),
      deliveryOption: snapFormData.delivery_option,
      paymentMethod: 'prepay',
      deliveryCharge: snapDeliveryCharge,
      codCharge: 0,
    });
    clearCart();
    setShowQrModal(false);
    orderSaving.current = false;
    setOrderSent(true);
  };

  /* ── Step 3: order confirmed screen ── */
  if (orderSent) {
    const snap = orderSnapshot;
    const isCod = (snap?.paymentMethod ?? paymentMethod) === 'cod';
    const snapDeliveryCharge = snap?.deliveryCharge ?? 0;
    const snapCodCharge = snap?.codCharge ?? 0;
    const snapTotal = snap?.total ?? 0;
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="max-w-lg mx-auto">

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Order Placed!</h2>
            <p className="text-slate-500 text-sm">
              {isCod
                ? 'Your COD order has been received. We will confirm shortly.'
                : 'Your order has been received. Payment details sent separately.'}
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900 mb-0.5">Confirmation sent</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                A successful order confirmation has been sent to your WhatsApp
                <span className="font-semibold"> ({formData.customer_phone})</span> and email
                <span className="font-semibold"> ({formData.customer_email})</span>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Your Order Details</p>

            <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-900">{formData.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-900">{formData.customer_phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-900 text-right max-w-[60%] break-all">{formData.customer_email}</span>
              </div>
            </div>

            <div className="mb-4 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Delivery Address</p>
              <p className="text-sm font-semibold text-slate-900">{formData.shipping_address}, PIN: {formData.pincode}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-slate-100 space-y-2">
              <p className="text-xs text-slate-500 mb-2">Items Ordered</p>
              {snap?.cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-700">{item.name} {item.config} ×{item.qty}</span>
                  <span className="font-semibold text-slate-900">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery</span>
                <span className="text-slate-900">{snapDeliveryCharge > 0 ? `₹${snapDeliveryCharge.toLocaleString('en-IN')}` : 'Free'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment</span>
                <span className="text-slate-900">{isCod ? `COD (+₹${snapCodCharge.toLocaleString('en-IN')})` : 'UPI / Online'}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2">
                <span>Total</span>
                <span>₹{snapTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Tracking note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-4 text-center">
            <p className="text-sm font-semibold text-amber-900">Need a tracking ID?</p>
            <p className="text-xs text-amber-700 mt-1">Contact WhatsApp Support below — we'll share your tracking details on priority.</p>
          </div>

          {/* WhatsApp support nudge */}
          <a
            href={`https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(
              `Hi, I just placed an order on RetraLabs and need support.\n\n` +
              `*Name:* ${formData.customer_name}\n` +
              `*Phone:* ${formData.customer_phone}\n` +
              `*Email:* ${formData.customer_email}\n` +
              `*Address:* ${formData.shipping_address}, PIN: ${formData.pincode}\n` +
              (orderSnapshot ? `*Items:* ${orderSnapshot.items}\n*Total:* ₹${orderSnapshot.total.toLocaleString('en-IN')}\n` : '') +
              `\nPlease help me with my order.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl transition-colors mb-2"
            style={{ textDecoration: 'none' }}
          >
            <MessageCircle className="w-5 h-5" />
            Contact WhatsApp Support
          </a>
          <p className="text-center text-xs text-slate-400 mb-4">We respond within minutes for priority order queries.</p>

          <button onClick={() => navigate('/')} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-2">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 2: order review ── */
  if (orderReady) {
    const isCodReview = paymentMethod === 'cod';
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md mx-auto">

          <div className="text-center mb-7">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Review Your Order</h2>
            <p className="text-slate-500 text-sm">Confirm below — we'll send details to your WhatsApp and email instantly.</p>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Items</p>
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.variant.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                    <p className="text-xs text-slate-400">{item.variant.vial_configuration || `${item.variant.dosage_mg}mg`} · qty {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{format(item.variant.price_inr * item.quantity)}</p>
                </div>
              ))}
            </div>
            {(getDiscount() > 0 || getCouponAmount() > 0 || deliveryCharge > 0 || isCodReview) && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                {getDiscount() > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>5% Discount 🎉</span><span>&minus;{format(getDiscountAmount())}</span></div>}
                {couponCode && getCouponAmount() > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Coupon ({couponCode.toUpperCase()})</span><span>&minus;{format(getCouponAmount())}</span></div>}
                {deliveryCharge > 0 && <div className="flex justify-between text-sm text-amber-600"><span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />Express Delivery</span><span>+{format(deliveryCharge)}</span></div>}
                {isCodReview && <div className="flex justify-between text-sm text-orange-600"><span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" />COD Fee</span><span>+{format(codCharge)}</span></div>}
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-2">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-xl font-black text-slate-900">{format(grandTotal)}</span>
            </div>
          </div>

          {/* Customer + shipping info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-semibold text-slate-900">{formData.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-semibold text-slate-900">{formData.customer_phone}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-semibold text-slate-900 text-right max-w-[60%] break-all">{formData.customer_email}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-semibold text-slate-900 text-right max-w-[60%]">{formData.shipping_address}, PIN: {formData.pincode}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="font-semibold text-slate-900">{isCodReview ? 'Cash on Delivery' : 'UPI / Online'}</span></div>
          </div>

          {/* CTAs — behaviour differs by payment method */}
          {isCodReview ? (
            /* COD: single confirm button */
            <button
              onClick={handleConfirmOrder}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-200 shadow-lg"
            >
              {confirming ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Check className="w-5 h-5" />Confirm COD Order</>
              )}
            </button>
          ) : (
            /* Prepay: UPI QR is the primary action */
            <button
              onClick={() => setShowQrModal(true)}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-200 shadow-lg"
            >
              <Check className="w-5 h-5" />Pay via UPI QR
            </button>
          )}

          <UpiQrModal
            isOpen={showQrModal}
            onClose={() => setShowQrModal(false)}
            amount={grandTotal}
            onConfirm={handleQrPaymentConfirmed}
            whatsappUrl={whatsappUrl}
          />

          <button
            onClick={() => { setOrderReady(false); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
          >
            ← Go back and edit
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Lock It In.</h1>
        <p className="text-slate-500 mb-8">Review your cart, fill in your details, and then, proceed for the payment options</p>

        {/* Payment notice */}
        <Card className="mb-4 border border-blue-200 bg-blue-50" shadow="none">
          <CardBody className="flex flex-row items-start gap-4 p-5">
            <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-900 mb-1">How ordering works</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Fill in your details below, then confirm on WhatsApp. Pay online via <strong>UPI (no extra charge)</strong> or choose <strong>Cash on Delivery</strong> — a small COD fee applies based on order value.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* 5% discount notice */}
        <Card className="mb-8 border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50" shadow="none">
          <CardBody className="flex flex-row items-center gap-4 p-5">
            <div className="p-2.5 bg-emerald-100 rounded-xl flex-shrink-0">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-emerald-900">🎉 5% Off — On Every Order.</h3>
              <p className="text-sm text-emerald-700 mt-0.5">
                Add 2+ different peptides worth ₹9,000+ and 5% comes off automatically. No codes needed.
              </p>
            </div>
            <Chip color="success" variant="flat" className="font-black text-sm flex-shrink-0">
              5% OFF
            </Chip>
          </CardBody>
        </Card>

        {/* Empty cart state */}
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-slate-600 mb-6 text-lg">Your cart is empty. The peptides aren't going to research themselves.</p>
            <button
              type="button"
              onClick={() => navigate('/catalogue')}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold px-8 py-3 rounded-xl transition-colors text-base"
            >
              Browse Catalogue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left column: Cart items + totals */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-5">Order Summary</h2>

              <div className="space-y-3">
                {cart.map((item) => (
                  <Card
                    key={item.variant.id}
                    shadow="none"
                    className="border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <CardBody className="flex flex-row items-center gap-4 p-4">
                      <img
                        src={getProductImageUrl(item.product.image_url, item.product.name)}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                        onError={(e) => { (e.target as HTMLImageElement).src = BAC_WATER_IMAGE_URL; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.product.name}</p>
                        <p className="text-sm text-slate-500">
                          {item.variant.vial_configuration || `${item.variant.dosage_mg}mg`} &mdash; {format(item.variant.price_inr)}
                        </p>
                      </div>
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="bordered"
                          aria-label="Decrease quantity"
                          onPress={() => updateQuantity(item.variant.id, item.quantity - 1)}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="bordered"
                          aria-label="Increase quantity"
                          onPress={() => updateQuantity(item.variant.id, item.quantity + 1)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {/* Remove button */}
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        aria-label="Remove item"
                        onPress={() => removeFromCart(item.variant.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Order totals */}
              <Card shadow="none" className="mt-5 border border-slate-200">
                <CardHeader className="px-5 pt-5 pb-0">
                  <h3 className="text-base font-semibold text-slate-800">Price Breakdown</h3>
                </CardHeader>
                <CardBody className="px-5 pb-5 pt-3 space-y-3">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium">{format(getSubtotal())}</span>
                  </div>

                  {getDiscount() > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="font-medium">5% Discount 🎉</span>
                      <span className="font-semibold">
                        &minus;{format(getDiscountAmount())}
                      </span>
                    </div>
                  )}

                  {/* ── Coupon row ── */}
                  {couponCode ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            <GraduationCap className="w-3 h-3" />
                            {couponCode.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => { removeCoupon(); setCouponStatus('idle'); setCouponMsg(''); }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Remove coupon"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="font-semibold text-emerald-600">
                          &minus;{format(getCouponAmount())}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Coupon code"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value); setCouponStatus('idle'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                          className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 transition-colors bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponInput.trim()}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      {couponStatus === 'error' && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium">{couponMsg}</p>
                      )}
                    </div>
                  )}

                  {/* ── Delivery charge row ── */}
                  <div className="flex justify-between items-center">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${formData.delivery_option === 'fast' ? 'text-amber-600' : 'text-slate-500'}`}>
                      {formData.delivery_option === 'fast'
                        ? <><Zap className="w-3.5 h-3.5" />Express Delivery (1–2 days)</>
                        : <><Clock className="w-3.5 h-3.5" />Standard Delivery (3–4 / 4–6 days)</>
                      }
                    </span>
                    <span className={`font-semibold text-sm ${formData.delivery_option === 'fast' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formData.delivery_option === 'fast' ? `+${format(FAST_DELIVERY_CHARGE)}` : 'FREE'}
                    </span>
                  </div>

                  {/* ── COD charge row ── */}
                  {paymentMethod === 'cod' && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-orange-600">
                        <Banknote className="w-3.5 h-3.5" />Cash on Delivery fee
                      </span>
                      <span className="font-semibold text-sm text-orange-600">
                        +{format(codCharge)}
                      </span>
                    </div>
                  )}

                  <Divider />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {format(grandTotal)}
                    </span>
                  </div>

                  {(getDiscount() > 0 || getCouponAmount() > 0) && (
                    <div className="flex items-center gap-2 pt-1">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 font-medium">
                        You saved {format(getDiscountAmount() + getCouponAmount())} in total
                      </span>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Right column: Order form */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-5">Ship It To:</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base"
                  />
                </div>

                {/* Shipping Address */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Shipping Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Full shipping address with PIN code"
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base resize-none"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="6-digit PIN code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base"
                  />
                </div>

                {/* ── Delivery Option ── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Delivery Speed <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Normal delivery */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, delivery_option: 'normal' })}
                      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        formData.delivery_option === 'normal'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${formData.delivery_option === 'normal' ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-sm font-bold">Standard</span>
                      </div>
                      <p className={`text-xs ${formData.delivery_option === 'normal' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Tier 1 &amp; 2: 3–4 days · Remote: 4–6 days
                      </p>
                      <span className={`text-base font-black ${formData.delivery_option === 'normal' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        FREE
                      </span>
                      {formData.delivery_option === 'normal' && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-slate-900" />
                        </div>
                      )}
                    </button>

                    {/* Fast delivery */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, delivery_option: 'fast' })}
                      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        formData.delivery_option === 'fast'
                          ? 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${formData.delivery_option === 'fast' ? 'text-white' : 'text-amber-500'}`} />
                        <span className="text-sm font-bold">Express</span>
                      </div>
                      <p className={`text-xs ${formData.delivery_option === 'fast' ? 'text-amber-100' : 'text-slate-500'}`}>
                        1–2 days · Major cities only
                      </p>
                      <span className={`text-base font-black ${formData.delivery_option === 'fast' ? 'text-white' : 'text-amber-600'}`}>
                        +{format(FAST_DELIVERY_CHARGE)}
                      </span>
                      {formData.delivery_option === 'fast' && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-amber-500" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Payment Method ── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Prepay */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('prepay')}
                      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        paymentMethod === 'prepay'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${paymentMethod === 'prepay' ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="text-sm font-bold">Pay Online</span>
                      </div>
                      <p className={`text-xs ${paymentMethod === 'prepay' ? 'text-slate-300' : 'text-slate-500'}`}>
                        UPI / Bank transfer via WhatsApp
                      </p>
                      <span className={`text-base font-black ${paymentMethod === 'prepay' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        FREE
                      </span>
                      {paymentMethod === 'prepay' && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-slate-900" />
                        </div>
                      )}
                    </button>

                    {/* COD */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className={`w-4 h-4 ${paymentMethod === 'cod' ? 'text-white' : 'text-orange-500'}`} />
                        <span className="text-sm font-bold">Cash on Delivery</span>
                      </div>
                      <p className={`text-xs ${paymentMethod === 'cod' ? 'text-orange-100' : 'text-slate-500'}`}>
                        Pay in cash when it arrives
                      </p>
                      <span className={`text-base font-black ${paymentMethod === 'cod' ? 'text-white' : 'text-orange-600'}`}>
                        +{format(getCodCharge(getTotal() + deliveryCharge))}
                      </span>
                      {paymentMethod === 'cod' && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-orange-500" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── How did you find us? (mandatory) ── */}
                <div id="referral-section">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    How did you find us? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['YouTube', 'Instagram', 'Reddit', 'Friend', 'Google', 'Twitter / X', 'TikTok', 'IndiaMART'].map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setFormData({ ...formData, referral_source: src, referral_friend_name: src !== 'Friend' ? '' : formData.referral_friend_name })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                          formData.referral_source === src
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                  {formData.referral_source === 'Friend' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Friend's name (may qualify for an extra discount)"
                        value={formData.referral_friend_name}
                        onChange={(e) => setFormData({ ...formData, referral_friend_name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
                      />
                    </div>
                  )}
                  {!formData.referral_source && (
                    <p className="text-xs text-red-500 mt-1">Please select how you found us to continue.</p>
                  )}
                </div>

                {/* ── Compliance checkboxes ── */}
                <div className="space-y-3">
                  {/* Research use */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.disclaimer_accepted}
                        onChange={(e) => setFormData({ ...formData, disclaimer_accepted: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm text-slate-600 leading-relaxed">
                        I confirm these products are being purchased for <strong>research purposes only</strong>,
                        in accordance with applicable regulations and institutional guidelines.
                      </span>
                    </label>
                  </div>

                  {/* 18+ age */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.age_confirmed}
                        onChange={(e) => setFormData({ ...formData, age_confirmed: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm text-slate-600 leading-relaxed">
                        I confirm I am <strong>18 years of age or older</strong>.
                      </span>
                    </label>
                  </div>

                  {/* No dosing guidance */}
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.no_dosing_accepted}
                        onChange={(e) => setFormData({ ...formData, no_dosing_accepted: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded border-rose-300 accent-rose-700 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm text-rose-800 leading-relaxed">
                        I understand that <strong>RetraLabs does not provide dosing guidance, medical advice, or usage instructions</strong> of any kind.
                        I will <strong>not</strong> request dosing information, and I take full responsibility for my research activities.
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!formData.disclaimer_accepted || !formData.age_confirmed || !formData.no_dosing_accepted || submitting}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-xl transition-colors"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      Review & Place Order
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
