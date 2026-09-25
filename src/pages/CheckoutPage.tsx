import { useSEO } from '../hooks/useSEO';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductImageUrl, BAC_WATER_IMAGE_URL } from '../utils/imageUrl';
import { Minus, Plus, Trash2, Check, MessageCircle, Tag, ShoppingBag, ArrowRight, X, GraduationCap, Zap, Clock, Banknote, Package, Truck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { OrderFormData } from '../types';
import { productDisplayName } from '../utils/productDisplayName';
import StateSelect from '../components/StateSelect';
import { useDeliveryCheck } from '../hooks/useDeliveryCheck';
import { canonicalRegion } from '../data/indianStates';

const FAST_DELIVERY_CHARGE = 800;
const WHATSAPP_SUPPORT_NUMBER = '918217824384';
const SOUTHERN_STATES = ['karnataka', 'kerala', 'tamil nadu', 'tamilnadu', 'andhra pradesh', 'telangana', 'puducherry', 'lakshadweep', 'andaman and nicobar islands'];

// ── Airtable (via Netlify Function — token stays server-side) ────────────────
async function saveOrder(fields: Record<string, unknown>, screenshot?: { contentType: string; filename: string; base64: string }, extra?: {
  cartItems?: { name: string; variant: string; quantity: number; unitPrice: number }[];
  customer?: { name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string };
  paymentMethod?: 'prepay' | 'cod';
  deliveryOption?: 'normal' | 'fast';
  total?: number;
  deliveryCharge?: number;
  codCharge?: number;
  skipLogistics?: boolean;
}): Promise<{ recordId: string | null; orderId: string | null; innofulfillOrderId: string | null; awbNumber: string | null; innofulfillWarning: string | null; carrierDisplayName?: string | null; paymentStatus?: string | null; paymentSessionExpiresAt?: string | null }> {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, screenshot, ...extra }),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const detail = json?.error || `Order save failed (HTTP ${res.status})`;
    throw new Error(detail);
  }
  if (json.screenshotWarning) console.warn(json.screenshotWarning);
  return {
    recordId: json.recordId || null,
    orderId: json.orderId || null,
    innofulfillOrderId: json.innofulfillOrderId || null,
    awbNumber: json.awbNumber || null,
    innofulfillWarning: json.innofulfillWarning || null,
    carrierDisplayName: json.carrierDisplayName || (json.logisticsProvider === 'Shiprocket' ? 'Shiprocket' : 'Innofulfill'),
    paymentStatus: json.paymentStatus || null,
    paymentSessionExpiresAt: json.paymentSessionExpiresAt || null,
  };
}

// ── Cashfree Hosted Checkout ───────────────────────────────────────────────
const CASHFREE_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
const PENDING_CF_ORDER_KEY = 'rl_cf_pending_order';

interface PendingCashfreeOrder {
  itemsSummaryFlat: string;
  total: number;
  cartItems: Array<{ name: string; config: string; qty: number; price: number }>;
  deliveryOption: string;
  deliveryCharge: number;
  /** Everything the confirmation email needs, minus the order ID. */
  email: Omit<OrderEmailParams, 'orderId' | 'orderDate'>;
}

interface CashfreeStatus {
  success?: boolean;
  confirmed?: boolean;
  paymentStatus?: string;
  awbNumber?: string | null;
  innofulfillOrderId?: string | null;
  carrierDisplayName?: string | null;
  total?: number;
}

/**
 * Asks our own server what actually happened to a Cashfree order.
 *
 * The webhook is what confirms a payment, and it can land a moment after the
 * customer is back with us, so this polls briefly rather than declaring a
 * successful payment unconfirmed. Stops early once the answer is final.
 */
async function pollCashfreeStatus(orderId: string, attempts: number): Promise<CashfreeStatus | null> {
  let latest: CashfreeStatus | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await fetch(`/api/cashfree-order-status?orderId=${encodeURIComponent(orderId)}`);
    latest = await res.json().catch(() => null);
    if (latest?.success && (latest.confirmed || latest.paymentStatus === 'PAYMENT_FAILED')) return latest;
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return latest;
}

function readPendingCashfreeOrder(): PendingCashfreeOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CF_ORDER_KEY);
    return raw ? (JSON.parse(raw) as PendingCashfreeOrder) : null;
  } catch {
    return null;
  }
}

function clearPendingCashfreeOrder() {
  try { sessionStorage.removeItem(PENDING_CF_ORDER_KEY); } catch { /* best-effort */ }
}

type CashfreeFactory = (opts: { mode: 'sandbox' | 'production' }) => {
  checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<unknown>;
};

function loadCashfreeSdk(): Promise<CashfreeFactory> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { Cashfree?: CashfreeFactory };
    if (w.Cashfree) { resolve(w.Cashfree); return; }
    const existing = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve((window as unknown as { Cashfree: CashfreeFactory }).Cashfree));
      existing.addEventListener('error', () => reject(new Error('Failed to load the payment gateway script')));
      return;
    }
    const script = document.createElement('script');
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => resolve((window as unknown as { Cashfree: CashfreeFactory }).Cashfree);
    script.onerror = () => reject(new Error('Failed to load the payment gateway script'));
    document.head.appendChild(script);
  });
}

// ── Brevo transactional email (via Netlify Function) ──────────────────────────
import { sendOrderConfirmationEmail, type OrderEmailParams } from '../utils/brevoEmail';
import PaymentConsole from '../components/payments/PaymentConsole';
import PaymentMethodsStrip from '../components/payments/PaymentMethodsStrip';
import { PAYMENT_METHODS, type PaymentMethodId } from '../components/payments/methods';

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getCodCharge(orderTotal: number): number {
  if (orderTotal <= 8000)  return 600;
  if (orderTotal <= 16000) return 1200;
  return 1500;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  useSEO({ title: 'Checkout | RetraLabs', description: 'Secure checkout for your RetraLabs research order.', noindex: true });
  const { format } = useCurrency();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    // Not getTotal(): it has no idea which payment method is selected and
    // would re-apply a coupon that COD disqualifies. Totals here are built
    // from netSubtotal instead.
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
    city: '',
    state: '',
    pincode: '',
    disclaimer_accepted: false,
    age_confirmed: false,
    no_dosing_accepted: false,
    referral_source: '',
    referral_friend_name: '',
    delivery_option: 'normal',
  });

  const [paymentMethod, setPaymentMethod] = useState<'prepay' | 'cod'>('prepay');

  /**
   * Coupons are a prepaid-only incentive and never apply to COD orders.
   *
   * A code the customer already entered stays applied in the cart rather than
   * being torn up, so switching back to online payment restores it — it just
   * contributes nothing while COD is selected. Every total below is built from
   * `netSubtotal` for that reason; the cart's own getTotal() knows nothing
   * about the payment method and would silently re-apply the coupon.
   */
  const couponApplies = paymentMethod !== 'cod';
  const couponAmount = couponApplies ? getCouponAmount() : 0;
  const netSubtotal = getSubtotal() - getDiscountAmount() - couponAmount;

  const deliveryCharge = formData.delivery_option === 'fast' ? FAST_DELIVERY_CHARGE : 0;
  const codCharge      = paymentMethod === 'cod' ? getCodCharge(netSubtotal + deliveryCharge) : 0;
  const grandTotal     = netSubtotal + deliveryCharge + codCharge;

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
    const { customer_name, customer_email, customer_phone, shipping_address, city, state, pincode, referral_source, referral_friend_name, delivery_option } = formData;
    try {
      localStorage.setItem('rl_customer_details', JSON.stringify({
        customer_name, customer_email, customer_phone, shipping_address, city, state, pincode, referral_source, referral_friend_name, delivery_option,
      }));
    } catch (_) {}
  }, [formData]);

  const [showExpressTerms, setShowExpressTerms] = useState(false);
  const [expressTermsAccepted, setExpressTermsAccepted] = useState(false);
  const [expressBlocked, setExpressBlocked] = useState(false);

  const handleExpressClick = () => {
    if (expressDisabled) return;
    setShowExpressTerms(true);
  };

  /* ── Check if express is blocked for the selected state ── */
  useEffect(() => {
    if (formData.delivery_option === 'fast' && formData.state) {
      const isSouthern = SOUTHERN_STATES.includes(formData.state.trim().toLowerCase());
      setExpressBlocked(isSouthern);
    } else {
      setExpressBlocked(false);
    }
  }, [formData.delivery_option, formData.state]);

  /* ── Delivery options for this PIN ───────────────────────────────────
     Every PIN is deliverable. This only decides whether Express (Innofulfill)
     can be offered; otherwise the order ships Standard via Shiprocket. */
  const delivery = useDeliveryCheck(formData.pincode, paymentMethod);

  const pinReady = delivery.phase === 'ready' && delivery.pincode === formData.pincode;
  const expressAvailable = pinReady && delivery.expressAvailable;

  /* Express must not stay selected once we learn Innofulfill does not serve
     this PIN — otherwise the customer pays for a speed we cannot deliver. */
  useEffect(() => {
    if (pinReady && !delivery.expressAvailable && formData.delivery_option === 'fast') {
      setFormData(prev => ({ ...prev, delivery_option: 'normal' }));
      setExpressTermsAccepted(false);
    }
  }, [pinReady, delivery.expressAvailable, formData.delivery_option]);

  /* Express needs Innofulfill to serve the PIN, and is separately barred in
     southern states by the existing regional rule. */
  const expressDisabled = !pinReady || !expressAvailable || expressBlocked;

  const contactValid =
    formData.customer_name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(formData.customer_email) &&
    formData.customer_phone.replace(/\D/g, '').length >= 10;

  const addressValid =
    formData.shipping_address.trim().length > 8 &&
    Boolean(canonicalRegion(formData.state)) &&
    formData.city.trim().length > 0 &&
    /^[1-9][0-9]{5}$/.test(formData.pincode);

  const consentsAccepted =
    formData.disclaimer_accepted && formData.age_confirmed && formData.no_dosing_accepted;

  const [orderReady, setOrderReady] = useState(false);   // step 2: review screen
  const [submitting, setSubmitting] = useState(false);

  /* The pay button stays inert until every precondition holds. */
  const canPlaceOrder = contactValid && addressValid && consentsAccepted && !submitting;
  const [confirming, setConfirming] = useState(false);
  const [orderSent,   setOrderSent]   = useState(false);
  /**
   * Which method the payment console has selected. Picking COD here has to
   * feed back into `paymentMethod`, because that is what adds the COD fee —
   * the amount on the console must be the amount actually charged.
   */
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('upi');
  const handleSelectMethod = (id: PaymentMethodId) => {
    setSelectedMethod(id);
    setPaymentMethod(id === 'cod' ? 'cod' : 'prepay');
    setSubmitError(null);
  };
  const [startingPayment, setStartingPayment] = useState(false);
  const [stillConnecting, setStillConnecting] = useState(false);
  const stillConnectingTimer = useRef<number | null>(null);
  const [submitError,   setSubmitError]   = useState<string | null>(null); // fatal: order not saved
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null); // order saved, confirmations failed
  const [orderSnapshot, setOrderSnapshot] = useState<{
    items: string;
    total: number;
    orderId: string | null;
    awbNumber: string | null;
    innofulfillOrderId: string | null;
    innofulfillWarning: string | null;
    carrierDisplayName?: string | null;
    cartItems: Array<{ name: string; config: string; qty: number; price: number }>;
    deliveryOption: string;
    paymentMethod: 'prepay' | 'cod';
    deliveryCharge: number;
    codCharge: number;
    pendingReview?: boolean;
  } | null>(null);
  const orderSaving = useRef(false); // prevent double-save

  /**
   * Shows the confirmation screen for a paid Cashfree order, and sends the
   * customer their receipt.
   *
   * The email goes from here rather than the webhook because only the browser
   * still holds the itemised cart — Airtable keeps a text summary, not line
   * items. A customer who closes the tab the instant they pay can therefore
   * miss the email; their order is still confirmed and fulfilled by the
   * webhook, which is the part that must not depend on the browser.
   */
  const showCashfreeConfirmation = async (
    orderId: string,
    pending: PendingCashfreeOrder | null,
    status: CashfreeStatus,
  ) => {
    setOrderSnapshot({
      items: pending?.itemsSummaryFlat || '',
      total: pending?.total ?? status.total ?? 0,
      orderId,
      awbNumber: status.awbNumber || null,
      innofulfillOrderId: status.innofulfillOrderId || null,
      innofulfillWarning: null,
      carrierDisplayName: status.carrierDisplayName || null,
      cartItems: pending?.cartItems || [],
      deliveryOption: pending?.deliveryOption || 'normal',
      paymentMethod: 'prepay',
      deliveryCharge: pending?.deliveryCharge || 0,
      codCharge: 0,
      pendingReview: !status.confirmed,
    });
    clearPendingCashfreeOrder();
    clearCart();
    setOrderSent(true);
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (pending?.email) {
      const emailResult = await sendOrderConfirmationEmail({
        ...pending.email,
        orderId,
        orderDate: new Date().toISOString(),
      });
      if (!emailResult.success) setNotifyWarning(`Email: ${emailResult.error}`);
    }
  };

  /**
   * Cashfree can also finish the payment by navigating the browser away and
   * back (net banking and some UPI apps always do). That is a full page
   * unload, so cart details for the confirmation screen come back from
   * sessionStorage — and the outcome is never taken from the redirect's own
   * query string, which anyone could craft, only from our server.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cf_return') !== '1') return;
    const returnedOrderId = params.get('order_id');
    window.history.replaceState({}, '', window.location.pathname);
    if (!returnedOrderId) return;

    const pending = readPendingCashfreeOrder();

    (async () => {
      setConfirming(true);
      setSubmitError(null);
      try {
        const status = await pollCashfreeStatus(returnedOrderId, 6);

        if (!status?.success) {
          setSubmitError(`We could not confirm your payment status. If you were charged, please contact support with your Order ID: ${returnedOrderId}.`);
          return;
        }
        if (status.paymentStatus === 'PAYMENT_FAILED') {
          clearPendingCashfreeOrder();
          navigate('/payment-failed');
          return;
        }
        await showCashfreeConfirmation(returnedOrderId, pending, status);
      } catch (err) {
        setSubmitError(`Could not confirm your payment — ${describeError(err)}. If you were charged, please contact support with your Order ID: ${returnedOrderId}.`);
      } finally {
        setConfirming(false);
      }
    })();
    // Runs once, right after Cashfree redirects back — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // A code applied while COD is selected doesn't need a message here: the
    // input row is replaced by the applied-coupon chip, which carries the
    // "not valid with COD" note.
  };

  /** Step 1 → 2: validate form and build WhatsApp URL, but don't open yet */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Belt and braces: the button is disabled in these states, but a stray
    // Enter key must not skip validation. The server re-checks regardless.
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      alert('Please enter a valid 6-digit PIN code.');
      return;
    }
    if (!canonicalRegion(formData.state)) {
      alert('Please select your state from the list.');
      return;
    }

    if (!formData.referral_source) {
      document.getElementById('referral-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    // Carry the choice made in the form through to the payment console.
    setSelectedMethod(paymentMethod === 'cod' ? 'cod' : 'upi');

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
    setSubmitError(null);
    setNotifyWarning(null);

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
      // Critical: the order record must exist before we show success
      const { orderId, innofulfillOrderId, awbNumber, innofulfillWarning } = await saveOrder({
        'Name':      snapFormData.customer_name,
        'Email':     snapFormData.customer_email,
        'Phone':     snapFormData.customer_phone,
        'Address':   `${snapFormData.shipping_address}, ${snapFormData.city}, ${snapFormData.state}, PIN: ${snapFormData.pincode}`,
        'Items':     itemsSummary,
        'Total (₹)': snapTotal,
        'Payment':   snapPaymentMethod === 'cod' ? 'COD' : 'UPI/Prepay',
        'Delivery':  snapFormData.delivery_option === 'fast' ? 'Express' : 'Standard',
        'Referral':  snapFormData.referral_source,
        'Status':    'ORDER_CREATED',
        'Created':   new Date().toISOString().slice(0, 10),
      }, undefined, {
        cartItems: cartSnapshot.map(i => ({
          name: i.product.name,
          variant: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`,
          quantity: i.quantity,
          unitPrice: i.variant.price_inr,
        })),
        customer: {
          name: snapFormData.customer_name,
          email: snapFormData.customer_email,
          phone: snapFormData.customer_phone,
          address: snapFormData.shipping_address,
          city: snapFormData.city,
          state: snapFormData.state,
          pincode: snapFormData.pincode,
        },
        paymentMethod: snapPaymentMethod,
        deliveryOption: snapFormData.delivery_option,
        total: snapTotal,
        deliveryCharge: snapDeliveryCharge,
        codCharge: snapCodCharge,
      });

      if (!orderId) throw new Error('Server did not return an order ID');
      const finalOrderId = orderId;

      // Non-critical: customer email — surface failures without blocking the order
      const snapSubtotal = cartSnapshot.reduce((s, i) => s + i.variant.price_inr * i.quantity, 0);
      const snapDiscount = snapSubtotal - snapTotal + snapDeliveryCharge + snapCodCharge;
      const emailResult = await sendOrderConfirmationEmail({
        orderId: finalOrderId,
        name: snapFormData.customer_name,
        email: snapFormData.customer_email,
        phone: snapFormData.customer_phone,
        address: snapFormData.shipping_address,
        city: snapFormData.city,
        state: snapFormData.state,
        pincode: snapFormData.pincode,
        items: cartSnapshot.map(i => ({
          name: i.product.name,
          variant: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`,
          quantity: i.quantity,
          unitPrice: i.variant.price_inr,
        })),
        subtotal: snapSubtotal,
        discount: snapDiscount,
        deliveryCharge: snapDeliveryCharge,
        codCharge: snapCodCharge,
        total: snapTotal,
        paymentMethod: snapPaymentMethod === 'cod' ? 'COD' : 'UPI/Prepay',
        orderDate: new Date().toISOString(),
      });
      if (!emailResult.success) {
        setNotifyWarning(`Email: ${emailResult.error}`);
      }
      if (!innofulfillOrderId && innofulfillWarning) {
        setNotifyWarning(prev => prev ? `${prev}; Innofulfill: ${innofulfillWarning}` : `Innofulfill: ${innofulfillWarning}`);
      }

      setOrderSnapshot({
        items: itemsSummaryFlat,
        total: snapTotal,
        orderId: finalOrderId,
        awbNumber: awbNumber || null,
        innofulfillOrderId: innofulfillOrderId || null,
        innofulfillWarning: innofulfillWarning || null,
        cartItems: cartSnapshot.map(i => ({ name: i.product.name, config: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`, qty: i.quantity, price: i.variant.price_inr })),
        deliveryOption: snapFormData.delivery_option,
        paymentMethod: snapPaymentMethod,
        deliveryCharge: snapDeliveryCharge,
        codCharge: snapCodCharge,
      });
      clearCart();
      setOrderSent(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      setSubmitError(`Your order could not be saved — ${describeError(err)}. Please try again, or message us on WhatsApp and we'll take your order manually.`);
    } finally {
      setConfirming(false);
      orderSaving.current = false;
    }
  };

  const buildOrderPayload = (snapFormData: OrderFormData, snapTotal: number, snapDeliveryCharge: number, snapCodCharge: number, snapPaymentMethod: 'prepay' | 'cod', itemsSummary: string, skipLogistics = false) => ({
    fields: {
      'Name': snapFormData.customer_name,
      'Email': snapFormData.customer_email,
      'Phone': snapFormData.customer_phone,
      'Address': `${snapFormData.shipping_address}, ${snapFormData.city}, ${snapFormData.state}, PIN: ${snapFormData.pincode}`,
      'Items': itemsSummary,
      'Total (₹)': snapTotal,
      'Payment': snapPaymentMethod === 'cod' ? 'COD' : 'UPI/Prepay',
      'Delivery': snapFormData.delivery_option === 'fast' ? 'Express' : 'Standard',
      'Referral': snapFormData.referral_source,
      'Status': 'ORDER_CREATED',
      'Created': new Date().toISOString().slice(0, 10),
    },
    extra: {
      cartItems: cart.map(item => ({
        name: item.product.name,
        variant: item.variant.vial_configuration || `${item.variant.dosage_mg}mg`,
        quantity: item.quantity,
        unitPrice: item.variant.price_inr,
      })),
      customer: {
        name: snapFormData.customer_name,
        email: snapFormData.customer_email,
        phone: snapFormData.customer_phone,
        address: snapFormData.shipping_address,
        city: snapFormData.city,
        state: snapFormData.state,
        pincode: snapFormData.pincode,
      },
      paymentMethod: snapPaymentMethod,
      deliveryOption: snapFormData.delivery_option,
      total: snapTotal,
      deliveryCharge: snapDeliveryCharge,
      codCharge: snapCodCharge,
      skipLogistics,
    },
  });

  const handlePayWithCashfree = async () => {
    if (startingPayment) return;
    if (selectedMethod === 'cod') { void handleConfirmOrder(); return; }
    // Set instantly, before any await, so the button reacts within a frame
    // instead of leaving the screen looking frozen while the network call runs.
    setStartingPayment(true);
    setStillConnecting(false);
    setSubmitError(null);
    stillConnectingTimer.current = window.setTimeout(() => setStillConnecting(true), 5000);
    try {
      const cartSnapshot = cart.map(item => ({ ...item }));
      const snapFormData = { ...formData };
      const snapDeliveryCharge = deliveryCharge;
      const snapTotal = grandTotal;

      const itemsSummary = cartSnapshot
        .map(i => `${i.product.name} ${i.variant.dosage_mg}mg x${i.quantity} = ₹${(i.variant.price_inr * i.quantity).toLocaleString('en-IN')}`)
        .join('\n');
      const payload = buildOrderPayload(snapFormData, snapTotal, snapDeliveryCharge, 0, 'prepay', itemsSummary, true);
      const result = await saveOrder(payload.fields, undefined, payload.extra);
      if (!result.recordId || !result.orderId) throw new Error('Failed to start payment session');

      const snapSubtotal = cartSnapshot.reduce((s, i) => s + i.variant.price_inr * i.quantity, 0);
      const emailItems = cartSnapshot.map(i => ({
        name: i.product.name,
        variant: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`,
        quantity: i.quantity,
        unitPrice: i.variant.price_inr,
      }));

      const cfRes = await fetch('/api/create-cashfree-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: result.recordId,
          orderId: result.orderId,
          amount: snapTotal,
          // Open Cashfree on the method the customer already chose here, rather
          // than making them pick twice.
          paymentMethods: PAYMENT_METHODS.find(m => m.id === selectedMethod)?.cashfreeCodes.join(',') || '',
          customer: {
            name: snapFormData.customer_name,
            email: snapFormData.customer_email,
            phone: snapFormData.customer_phone,
          },
        }),
      });
      const cfJson: { success?: boolean; paymentSessionId?: string; mode?: 'sandbox' | 'production'; error?: string } = await cfRes.json().catch(() => ({}));
      if (!cfRes.ok || !cfJson?.success || !cfJson?.paymentSessionId) {
        throw new Error(cfJson?.error || `Could not start payment (HTTP ${cfRes.status})`);
      }

      // Net banking and some UPI apps finish by navigating the browser away and
      // back, which unloads this page — so everything the confirmation screen
      // and receipt email need is stashed where it survives that round trip.
      const pending: PendingCashfreeOrder = {
        itemsSummaryFlat: cartSnapshot.map(i => `${i.product.name} ${i.variant.dosage_mg}mg x${i.quantity}`).join(', '),
        total: snapTotal,
        cartItems: cartSnapshot.map(i => ({ name: i.product.name, config: i.variant.vial_configuration || `${i.variant.dosage_mg}mg`, qty: i.quantity, price: i.variant.price_inr })),
        deliveryOption: snapFormData.delivery_option,
        deliveryCharge: snapDeliveryCharge,
        email: {
          name: snapFormData.customer_name,
          email: snapFormData.customer_email,
          phone: snapFormData.customer_phone,
          address: snapFormData.shipping_address,
          city: snapFormData.city,
          state: snapFormData.state,
          pincode: snapFormData.pincode,
          items: emailItems,
          subtotal: snapSubtotal,
          discount: snapSubtotal - snapTotal + snapDeliveryCharge,
          deliveryCharge: snapDeliveryCharge,
          codCharge: 0,
          total: snapTotal,
          paymentMethod: PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label || 'Online',
        },
      };
      try { sessionStorage.setItem(PENDING_CF_ORDER_KEY, JSON.stringify(pending)); } catch { /* best-effort */ }

      const Cashfree = await loadCashfreeSdk();
      const cashfree = Cashfree({ mode: cfJson.mode === 'sandbox' ? 'sandbox' : 'production' });

      // '_modal' keeps the payment on our own page instead of throwing the
      // customer onto a bare gateway page. The resolved value is deliberately
      // ignored: Cashfree's own guidance is to confirm server-side regardless,
      // and treating our status endpoint as the only authority means a change
      // in the SDK's client-side result shape can't mis-report a payment.
      await cashfree.checkout({ paymentSessionId: cfJson.paymentSessionId, redirectTarget: '_modal' });

      // Reached only when the modal completed in place. If the method needed a
      // full redirect the browser has already left, and the cf_return effect
      // above picks it up on the way back.
      setStillConnecting(false);
      const status = await pollCashfreeStatus(result.orderId, 3);
      if (status?.success && status.paymentStatus === 'PAYMENT_FAILED') {
        clearPendingCashfreeOrder();
        navigate('/payment-failed');
        return;
      }
      if (status?.success && status.confirmed) {
        await showCashfreeConfirmation(result.orderId, pending, status);
        return;
      }
      // Modal dismissed, or payment abandoned — say so plainly and leave them
      // on the console to try again, rather than implying an order was placed.
      setSubmitError(
        `Your payment wasn't completed, so no order has been placed and you have not been charged. You can try again — your Order ID is ${result.orderId} if you need to contact support.`,
      );
    } catch (err) {
      setSubmitError(`Could not start payment — ${describeError(err)}. Please try again.`);
    } finally {
      if (stillConnectingTimer.current) { window.clearTimeout(stillConnectingTimer.current); stillConnectingTimer.current = null; }
      setStartingPayment(false);
      setStillConnecting(false);
    }
  };

  /* ── Step 3: order confirmed screen ── */
  if (orderSent) {
    const snap = orderSnapshot;
    const isCod = (snap?.paymentMethod ?? paymentMethod) === 'cod';
    const snapDeliveryCharge = snap?.deliveryCharge ?? 0;
    const snapCodCharge = snap?.codCharge ?? 0;
    const snapTotal = snap?.total ?? 0;
    // Cashfree normally confirms within the poll window in the return-page
    // effect above, so this is a rare fallback — the webhook hasn't landed
    // yet. It is never a manual admin review step anymore.
    const isPendingVerification = !isCod && Boolean(snap?.pendingReview);
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 py-12">
        <div className="max-w-lg mx-auto">

          {/* Status header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border ${isPendingVerification ? 'bg-amber-50 border-amber-200' : 'bg-[#16a34a]/10 border-[#16a34a]/20'}`}>
              {isPendingVerification ? <Clock className="w-8 h-8 text-[#D97706]" /> : <Check className="w-8 h-8 text-[#16a34a]" />}
            </div>
            <h2 className="text-[26px] font-bold text-[#111111] mb-1.5 tracking-[-0.02em]">
              {isCod ? 'Order Received' : isPendingVerification ? 'Order Received' : 'Order Confirmed'}
            </h2>
            <p className="text-[#9CA3AF] text-sm">
              {isCod
                ? 'Your COD order has been received. We will confirm shortly.'
                : isPendingVerification
                  ? "We've received your order and are confirming your payment."
                  : 'Your payment has been confirmed and your order is placed.'}
            </p>
          </div>

          {/* Confirming payment — a rare fallback for when the payment gateway's confirmation is still catching up */}
          {isPendingVerification && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-1">Confirming your payment</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Your payment is still being confirmed by the payment gateway. This page will update automatically — no action needed from you.
                  </p>
                  <p className="text-xs font-semibold text-amber-900 leading-relaxed mt-1.5">
                    Please don't place another order while this confirms.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notification status */}
          {notifyWarning ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 mb-0.5">Order saved — but some confirmations failed</p>
                <p className="text-xs text-amber-700 leading-relaxed break-words">
                  {notifyWarning}. Don't worry — your order is recorded and we'll be in touch.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#16a34a]/5 border border-[#16a34a]/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-[#16a34a] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#15803d] mb-0.5">Confirmation sent</p>
                <p className="text-xs text-[#16a34a] leading-relaxed">
                  A confirmation email has been sent to
                  <span className="font-semibold"> ({formData.customer_email})</span>.
                </p>
              </div>
            </div>
          )}

          {/* Document number */}
          {snap?.orderId && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4 text-center shadow-sm">
              <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-[0.12em] mb-1.5">Order / Document No</p>
              <p className="text-2xl font-bold text-[#111111] tracking-wide">{snap.orderId}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Save this document number for tracking and support</p>
            </div>
          )}

          {/* AWB / Shipment info */}
          {snap?.awbNumber ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#16a34a]/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#16a34a]/20">
                  <Package className="w-5 h-5 text-[#16a34a]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111111]">Shipment Created</p>
                  <p className="text-xs text-[#9CA3AF]">Courier AWB assigned by Innofulfill</p>
                </div>
              </div>
              <div className="space-y-2 text-sm bg-[#f8fafc] rounded-xl p-3.5 border border-[#E5E7EB]">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">AWB</span>
                  <span className="font-mono font-bold text-[#111111]">{snap.awbNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Courier</span>
                  <span className="font-semibold text-[#374151]">{snap.carrierDisplayName || 'Innofulfill'}</span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/track?orderId=${encodeURIComponent(snap.orderId || '')}`)}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] text-white font-bold py-3 rounded-xl transition-colors"
              >
                <Truck className="w-4 h-4" />
                Track Shipment
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-200">
                  <Truck className="w-5 h-5 text-[#D97706]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111111]">
                    {snap?.pendingReview ? 'Shipping starts after verification' : 'AWB: Awaiting shipment assignment'}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    {snap?.pendingReview
                      ? 'Your order will ship as soon as your payment is verified — usually within a few hours.'
                      : 'Your document number is confirmed. The courier AWB will appear once Innofulfill assigns it.'}
                  </p>
                </div>
              </div>
              {snap?.orderId && (
                <button
                  onClick={() => navigate(`/track?orderId=${encodeURIComponent(snap.orderId || '')}`)}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] text-white font-bold py-3 rounded-xl transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Track Order
                </button>
              )}
            </div>
          )}

          {/* Order details */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-4">Your Order Details</p>

            <div className="space-y-2 mb-4 pb-4 border-b border-[#E5E7EB]">
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Name</span>
                <span className="font-semibold text-[#111111]">{formData.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Phone</span>
                <span className="font-semibold text-[#111111]">{formData.customer_phone}</span>
              </div>
              <div className="flex justify-between text-sm gap-3">
                <span className="text-[#9CA3AF] flex-shrink-0">Email</span>
                <span className="font-semibold text-[#111111] text-right break-all">{formData.customer_email}</span>
              </div>
            </div>

            <div className="mb-4 pb-4 border-b border-[#E5E7EB]">
              <p className="text-xs text-[#9CA3AF] mb-1">Delivery Address</p>
              <p className="text-sm font-semibold text-[#111111] leading-relaxed">{formData.shipping_address}, {formData.city}, {formData.state}, PIN: {formData.pincode}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-[#E5E7EB] space-y-2">
              <p className="text-xs text-[#9CA3AF] mb-2">Items Ordered</p>
              {snap?.cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-[#374151]">{item.name} {item.config} ×{item.qty}</span>
                  <span className="font-semibold text-[#111111]">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Delivery</span>
                <span className="text-[#111111]">{snapDeliveryCharge > 0 ? `₹${snapDeliveryCharge.toLocaleString('en-IN')}` : 'Free'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Payment</span>
                <span className="text-[#111111]">{isCod ? `COD (+₹${snapCodCharge.toLocaleString('en-IN')})` : 'UPI / Online'}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#111111] pt-2 border-t border-[#E5E7EB] mt-2">
                <span>Total</span>
                <span>₹{snapTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp support nudge */}
          <a
            href={`https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(
              `Hi, I just placed an order on RetraLabs and need support.\n\n` +
              `*Name:* ${formData.customer_name}\n` +
              `*Phone:* ${formData.customer_phone}\n` +
              `*Email:* ${formData.customer_email}\n` +
              `*Address:* ${formData.shipping_address}, ${formData.city}, ${formData.state}, PIN: ${formData.pincode}\n` +
              (orderSnapshot ? `*Items:* ${orderSnapshot.items}\n*Total:* ₹${orderSnapshot.total.toLocaleString('en-IN')}\n` : '') +
              `\nPlease help me with my order.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-4 rounded-2xl transition-colors mb-2"
            style={{ textDecoration: 'none' }}
          >
            <MessageCircle className="w-5 h-5" />
            Contact WhatsApp Support
          </a>
          <p className="text-center text-xs text-[#9CA3AF] mb-4">We respond within minutes for priority order queries.</p>

          <button onClick={() => navigate('/')} className="w-full text-center text-sm text-[#9CA3AF] hover:text-[#374151] transition-colors py-2 font-medium">
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
      <div className="min-h-screen bg-[#f8fafc] px-4 py-10 sm:py-14">
        <div className="w-full max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#2563EB]/20 bg-white/80 backdrop-blur-sm mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              <span className="text-[#2563EB] text-[10px] font-bold tracking-[0.1em] uppercase">Step 2 of 2</span>
            </div>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#111111] tracking-[-0.03em] leading-tight mb-1.5">Review & Pay</h1>
            <p className="text-[#9CA3AF] text-sm">Confirm your order details and complete payment</p>
          </div>

          {/* Order summary card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingBag className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#374151]">Order Summary</h3>
            </div>
            <div className="space-y-3 mb-4 pb-4 border-b border-[#E5E7EB]">
              {cart.map((item) => (
                <div key={item.variant.id} className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111111]">{productDisplayName(item.product)}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{item.variant.vial_configuration || `${item.variant.dosage_mg}mg`} · qty ×{item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-[#111111] flex-shrink-0">{format(item.variant.price_inr * item.quantity)}</p>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm mb-4 pb-4 border-b border-[#E5E7EB]">
              {getDiscount() > 0 && <div className="flex justify-between text-[#16a34a]"><span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />5% Discount</span><span className="font-semibold">−{format(getDiscountAmount())}</span></div>}
              {couponCode && couponAmount > 0 && <div className="flex justify-between text-[#16a34a]"><span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Coupon ({couponCode})</span><span className="font-semibold">−{format(couponAmount)}</span></div>}
              {/* A coupon that stops counting the moment COD is picked has to say so,
                  or the total looks like it jumped for no reason. */}
              {couponCode && !couponApplies && (
                <div className="flex justify-between items-start gap-3 text-[#9CA3AF]">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 flex-shrink-0" />Coupon ({couponCode})</span>
                  <span className="text-right text-xs font-semibold leading-tight">
                    <span className="line-through">−{format(getCouponAmount())}</span>
                    <span className="block text-[#D97706]">Not valid with COD</span>
                  </span>
                </div>
              )}
              {deliveryCharge > 0 && <div className="flex justify-between text-[#D97706]"><span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Express Delivery</span><span className="font-semibold">+{format(deliveryCharge)}</span></div>}
              {isCodReview && <div className="flex justify-between text-[#D97706]"><span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" />COD Fee</span><span className="font-semibold">+{format(codCharge)}</span></div>}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline">
              <span className="text-[#374151] font-semibold">Total Amount</span>
              <span className="text-[28px] font-bold text-[#111111] tracking-[-0.02em]">{format(grandTotal)}</span>
            </div>
          </div>

          {/* Customer details card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#374151]">Delivery Details</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-[#9CA3AF]">Name</span><span className="font-semibold text-[#111111]">{formData.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-[#9CA3AF]">Phone</span><span className="font-semibold text-[#111111]">{formData.customer_phone}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#9CA3AF] flex-shrink-0">Email</span><span className="font-semibold text-[#111111] text-right break-all">{formData.customer_email}</span></div>
              <div className="pt-2.5 border-t border-[#E5E7EB] mt-2.5">
                <span className="text-[#9CA3AF] block mb-1">Address</span>
                <span className="font-semibold text-[#111111] text-sm leading-relaxed">{formData.shipping_address}, {formData.city}, {formData.state}, PIN: {formData.pincode}</span>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-900 mb-0.5">Order not placed</p>
                <p className="text-xs text-red-700 leading-relaxed break-words">{submitError}</p>
              </div>
            </div>
          )}

          {/* Payment console — the heaviest element on the page, by design */}
          <div className="mb-5">
            <PaymentConsole
              formattedAmount={format(grandTotal)}
              selected={selectedMethod}
              onSelect={handleSelectMethod}
              onPay={() => void handlePayWithCashfree()}
              busy={startingPayment || confirming}
              busyLabel={
                stillConnecting
                  ? "Still connecting… don't refresh"
                  : selectedMethod === 'cod'
                    ? 'Placing your order…'
                    : 'Opening secure payment…'
              }
            />
          </div>

          <button
            onClick={() => { setOrderReady(false); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            className="w-full text-center text-sm text-[#9CA3AF] hover:text-[#374151] transition-colors py-3 font-medium"
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
        <div className="rounded-2xl border border-blue-200 bg-blue-50 mb-4">
          <div className="flex flex-row items-start gap-4 p-5">
            <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-900 mb-1">How ordering works</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Fill in your details below, then pay securely by <strong>UPI, card or net banking (no extra charge)</strong> — or choose <strong>Cash on Delivery</strong>, where a small COD fee applies based on order value.
              </p>
            </div>
          </div>
        </div>

        {/* 5% discount notice */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 mb-8">
          <div className="flex flex-row items-center gap-4 p-5">
            <div className="p-2.5 bg-emerald-100 rounded-xl flex-shrink-0">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-emerald-900">🎉 5% Off — On 2+ Different Products.</h3>
              <p className="text-sm text-emerald-700 mt-0.5">
                Add 2 or more different peptides to your cart and 5% comes off automatically. No codes needed.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 font-black text-sm flex-shrink-0">
              5% OFF
            </span>
          </div>
        </div>

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
                  <div
                    key={item.variant.id}
                    className="rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-row items-center gap-4 p-4">
                      <img
                        src={getProductImageUrl(item.product.image_url, item.product.name)}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                        onError={(e) => { (e.target as HTMLImageElement).src = BAC_WATER_IMAGE_URL; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{productDisplayName(item.product)}</p>
                        <p className="text-sm text-slate-500">
                          {item.variant.vial_configuration || `${item.variant.dosage_mg}mg`} &mdash; {format(item.variant.price_inr)}
                        </p>
                      </div>
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Remove button */}
                      <button
                        aria-label="Remove item"
                        onClick={() => removeFromCart(item.variant.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order totals */}
              <div className="mt-5 rounded-2xl border border-slate-200">
                <div className="px-5 pt-5 pb-0">
                  <h3 className="text-base font-semibold text-slate-800">Price Breakdown</h3>
                </div>
                <div className="px-5 pb-5 pt-3 space-y-3">
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
                        {couponApplies ? (
                          <span className="font-semibold text-emerald-600">
                            &minus;{format(couponAmount)}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400 line-through">
                            &minus;{format(getCouponAmount())}
                          </span>
                        )}
                      </div>
                      {!couponApplies && (
                        <p className="flex items-start gap-1.5 text-xs font-semibold text-amber-600 -mt-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                          Coupons can't be used with Cash on Delivery. Switch to online payment to use this code.
                        </p>
                      )}
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

                  <hr className="border-slate-200 my-4" />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {format(grandTotal)}
                    </span>
                  </div>

                  {(getDiscount() > 0 || couponAmount > 0) && (
                    <div className="flex items-center gap-2 pt-1">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 font-medium">
                        You saved {format(getDiscountAmount() + couponAmount)} in total
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Order form */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-5">Ship It To:</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer_name"
                    autoComplete="name"
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
                  <label htmlFor="customer_email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer_email"
                    autoComplete="email"
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
                  <label htmlFor="customer_phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer_phone"
                    autoComplete="tel"
                    inputMode="tel"
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
                  <label htmlFor="shipping_address" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="shipping_address"
                    autoComplete="street-address"
                    required
                    rows={3}
                    placeholder="House / Flat no., Building, Street, Area"
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base resize-none"
                  />
                </div>

                {/* PIN Code — verified as it is typed. Everything below it is
                    derived from this, so it comes first. */}
                <div>
                  <label htmlFor="pincode" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="pincode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      pattern="[1-9][0-9]{5}"
                      maxLength={6}
                      required
                      placeholder="560001"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      aria-describedby="pin-status"
                      className={`w-full px-4 py-3 pr-11 min-h-[48px] rounded-xl border-2 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base tracking-[0.18em] font-medium ${
                        pinReady ? 'border-emerald-300'
                          : delivery.phase === 'invalid' ? 'border-red-300'
                          : 'border-slate-200'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {delivery.phase === 'checking' && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                      {pinReady && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {delivery.phase === 'invalid' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </span>
                  </div>

                  <div id="pin-status" aria-live="polite" className="mt-2">
                    {delivery.phase === 'checking' && (
                      <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking delivery options…
                      </p>
                    )}
                    {delivery.phase === 'invalid' && delivery.message && (
                      <p className="flex items-start gap-1.5 text-[13px] text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{delivery.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 min-h-[48px] rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors text-base"
                  />
                </div>

                {/* State — a closed list, never free text */}
                <div>
                  <label htmlFor="state" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <StateSelect
                    id="state"
                    value={formData.state}
                    onChange={(next) => setFormData(prev => ({ ...prev, state: next }))}
                  />
                </div>

                {pinReady && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                    <Truck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-emerald-900">Delivery available to {formData.pincode}</p>
                      <p className="text-[13px] text-emerald-800/90 leading-snug mt-0.5">
                        {expressAvailable
                          ? 'Express and Standard delivery are both available for this PIN code.'
                          : delivery.indeterminate
                            ? "Standard delivery. We couldn't check Express availability just now."
                            : 'Standard delivery. Express is not available for this PIN code.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Delivery Option ── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Delivery Speed <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Normal delivery */}
                    <button
                      type="button"
                      onClick={() => { setFormData({ ...formData, delivery_option: 'normal' }); setExpressTermsAccepted(false); }}
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
                      disabled={expressDisabled}
                      onClick={handleExpressClick}
                      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                        expressDisabled
                          ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          : formData.delivery_option === 'fast'
                            ? 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {delivery.phase === 'checking' ? (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        ) : (
                          <Zap className={`w-4 h-4 ${expressDisabled ? 'text-slate-300' : formData.delivery_option === 'fast' ? 'text-white' : 'text-amber-500'}`} />
                        )}
                        <span className="text-sm font-bold">Express</span>
                      </div>
                      <p className={`text-xs ${expressDisabled ? 'text-slate-400' : formData.delivery_option === 'fast' ? 'text-amber-100' : 'text-slate-500'}`}>
                        {!formData.pincode ? 'Enter your PIN code'
                          : delivery.phase === 'checking' ? 'Checking availability…'
                          : expressBlocked ? 'Not available in your region'
                          : delivery.indeterminate ? "Couldn't check availability"
                          : !expressAvailable ? 'Not available for this PIN code'
                          : '1–2 days · Major cities only'}
                      </p>
                      <span className={`text-base font-black ${expressDisabled ? 'text-slate-300' : formData.delivery_option === 'fast' ? 'text-white' : 'text-amber-600'}`}>
                        +{format(FAST_DELIVERY_CHARGE)}
                      </span>
                      {formData.delivery_option === 'fast' && !expressDisabled && (
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
                        UPI, cards & net banking
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
                        {couponCode ? 'No coupons · pay in cash on arrival' : 'Pay in cash when it arrives'}
                      </p>
                      {/* Quoted off the coupon-free subtotal, because picking COD is
                          exactly what drops the coupon. */}
                      <span className={`text-base font-black ${paymentMethod === 'cod' ? 'text-white' : 'text-orange-600'}`}>
                        +{format(getCodCharge(getSubtotal() - getDiscountAmount() + deliveryCharge))}
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

                {!canPlaceOrder && !submitting && (
                  <p className="text-[13px] text-slate-500 text-center -mb-2">
                    {!contactValid ? 'Add your name, email and phone number to continue.'
                      : !addressValid ? 'Complete your address, city, state and PIN code to continue.'
                      : 'Accept the research-use terms below to continue.'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canPlaceOrder}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-xl transition-all duration-200 active:scale-[0.97] hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.45)]"
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

                <PaymentMethodsStrip className="mt-4" showSecureLine />
              </form>

              {/* Express Delivery Terms Modal */}
              {showExpressTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowExpressTerms(false)}>
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Express Delivery Terms</h3>
                        <p className="text-xs text-slate-500">Please read and accept to continue</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600 mb-5">
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p><strong>1–2 business days</strong> for metro cities.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p><strong>2–3 business days</strong> for Tier 2 and Tier 3 cities.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p>Express delivery is <strong>not available</strong> for southern states (Karnataka, Kerala, Tamil Nadu, Andhra Pradesh, Telangana).</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p>Express delivery is <strong>refundable if the delay exceeds 4 days</strong> (prepayment only).</p>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4">
                      <input
                        type="checkbox"
                        checked={expressTermsAccepted}
                        onChange={(e) => setExpressTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-amber-300 accent-amber-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm text-amber-900 leading-relaxed">
                        I have read and agree to the Express Delivery terms and conditions.
                      </span>
                    </label>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowExpressTerms(false)}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!expressTermsAccepted}
                        onClick={() => {
                          setFormData({ ...formData, delivery_option: 'fast' });
                          setShowExpressTerms(false);
                        }}
                        className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
                      >
                        Accept & Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
