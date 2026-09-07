import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  Copy,
  Check,
  Upload,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { ALL_REGION_NAMES, canonicalRegion } from '../data/indianStates';

const UPI_ID = 'retralabs@ptaxis';
const QR_IMAGE = '/retralabs-payment-qr.png';
const WHATSAPP_PHONE = '916360489397';

const PRESET_PRODUCTS = [
  'Retratrutide Starter Kit',
  'Retratrutide 5mg vial',
  'Retratrutide 10mg vial',
  'Tirzepatide Starter Kit',
  'Custom Order',
];

interface OrderSuccessData {
  orderId: string;
  provider: string;
  carrierDisplayName?: string;
  awbNumber?: string;
  shipmentStatus?: string;
}

export default function CustomerOrderFormPage() {
  const [searchParams] = useSearchParams();
  useSEO({
    title: 'Direct Order Form | RetraLabs',
    description: 'Complete your delivery details and upload payment confirmation.',
    noindex: true,
  });

  // Pre-fill from URL query parameters if present
  const paramAmount = searchParams.get('amount');
  const paramItem = searchParams.get('item');
  const paramName = searchParams.get('name') || '';
  const paramPhone = searchParams.get('phone') || '';
  const paramPin = searchParams.get('pincode') || '';

  // Form states
  const [name, setName] = useState(paramName);
  const [phone, setPhone] = useState(paramPhone);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState(paramPin);
  
  // Product & Amount
  const [selectedProduct, setSelectedProduct] = useState(paramItem || 'Retratrutide Starter Kit');
  const [customItemName, setCustomItemName] = useState('');
  const [amountPreset, setAmountPreset] = useState<'1000' | '3000' | 'custom'>(() => {
    if (paramAmount === '1000') return '1000';
    if (paramAmount === '3000') return '3000';
    if (paramAmount) return 'custom';
    return '1000';
  });
  const [customAmount, setCustomAmount] = useState(paramAmount && !['1000', '3000'].includes(paramAmount) ? paramAmount : '');
  const [deliveryOption, setDeliveryOption] = useState<'normal' | 'fast'>('normal');

  // Payment proof & transaction
  const [transaction, setTransaction] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);

  // UI state
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<OrderSuccessData | null>(null);
  const [pinLookupLoading, setPinLookupLoading] = useState(false);

  // Calculate final total amount
  const totalAmount = useMemo(() => {
    if (amountPreset === '1000') return 1000;
    if (amountPreset === '3000') return 3000;
    const parsed = parseFloat(customAmount);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1000;
  }, [amountPreset, customAmount]);

  const finalItemName = useMemo(() => {
    if (selectedProduct === 'Custom Order') return customItemName || 'Custom RetraLabs Order';
    return selectedProduct;
  }, [selectedProduct, customItemName]);

  // Auto-detect City & State when a valid 6-digit pincode is entered
  useEffect(() => {
    if (/^[1-9][0-9]{5}$/.test(pincode)) {
      setPinLookupLoading(true);
      fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length) {
            const po = data[0].PostOffice[0];
            if (po.District && !city) setCity(po.District);
            if (po.State) {
              const matchedState = canonicalRegion(po.State);
              if (matchedState) setState(matchedState);
            }
          }
        })
        .catch(() => {})
        .finally(() => setPinLookupLoading(false));
    }
  }, [pincode]);

  // Handle screenshot file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, WebP).');
      return;
    }

    setScreenshotFile(file);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setScreenshotPreview(b64);
      setScreenshotBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!name.trim() || name.length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setErrorMsg('Please enter a valid 6-digit Indian PIN code.');
      return;
    }
    if (!address.trim() || address.length < 5) {
      setErrorMsg('Please enter your complete delivery address.');
      return;
    }
    if (!screenshotBase64 || !screenshotFile) {
      setErrorMsg('Please attach your payment screenshot confirmation.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || 'orders@retralabs.in',
        address: address.trim(),
        city: city.trim() || 'City',
        state: state || 'Karnataka',
        pincode: pincode.trim(),
        item: finalItemName,
        total: totalAmount,
        deliveryOption,
        transaction: transaction.trim(),
        screenshot: {
          contentType: screenshotFile.type || 'image/jpeg',
          filename: screenshotFile.name || 'payment-screenshot.jpg',
          base64: screenshotBase64,
        },
      };

      const res = await fetch('/api/submit-customer-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Submission failed (HTTP ${res.status})`);
      }

      setSuccessData({
        orderId: data.orderId,
        provider: data.provider,
        carrierDisplayName: data.carrierDisplayName,
        awbNumber: data.awbNumber,
        shipmentStatus: data.shipmentStatus,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success State View ──
  if (successData) {
    const whatsappText = encodeURIComponent(
      `Hi RetraLabs, I just placed order ${successData.orderId} for ₹${totalAmount.toLocaleString('en-IN')}. Please confirm dispatch!`,
    );
    const whatsappLink = `https://wa.me/${WHATSAPP_PHONE}?text=${whatsappText}`;

    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-3">
            Payment & Order Confirmed
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Thank You, {name}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Your order has been recorded and is being prepared for fast dispatch.
          </p>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left mb-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Order ID</span>
              <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                {successData.orderId}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Item</span>
              <span className="text-xs font-bold text-slate-900">{finalItemName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Total Paid</span>
              <span className="text-sm font-black text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Delivery To</span>
              <span className="text-xs text-slate-700 font-medium text-right max-w-[220px] truncate">
                {address}, {city} ({pincode})
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Courier Routing</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                {successData.carrierDisplayName || successData.provider || 'Express Courier'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to={`/track?orderId=${successData.orderId}`}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              Track Order Status <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Contact Us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form View ──
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Official RetraLabs Order Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Direct Order & Payment Confirmation
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Fill in your delivery address, make the payment via UPI, and attach your receipt to initiate dispatch.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── STEP 1: ITEM & AMOUNT ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Order & Pricing Details
              </h2>
            </div>

            <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              {/* Product Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product / Item
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {PRESET_PRODUCTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct === 'Custom Order' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Item Description *
                  </label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="e.g. 2x Retratrutide 5mg with Bacteriostatic Water"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Total Amount Payable (₹)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAmountPreset('1000')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      amountPreset === '1000'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    ₹1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPreset('3000')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      amountPreset === '3000'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    ₹3,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPreset('custom')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      amountPreset === 'custom'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {amountPreset === 'custom' && (
                  <div className="mt-2.5 relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Delivery Speed Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Delivery Speed
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('normal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      deliveryOption === 'normal'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" /> Standard Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('fast')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      deliveryOption === 'fast'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> ⚡ Express Air
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP 2: DELIVERY DETAILS ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Delivery & Contact Information
              </h2>
            </div>

            <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com (for tracking notifications)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Address (Flat/House, Building, Street, Area) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Door No, Building Name, Street, Landmark..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="560001"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500 font-mono font-semibold"
                    />
                    {pinLookupLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                  >
                    {ALL_REGION_NAMES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP 3: PAYMENT & PROOF UPLOAD ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                UPI Payment & Confirmation Screenshot
              </h2>
            </div>

            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              {/* QR and UPI Box */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="w-36 h-36 bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                  <img
                    src={QR_IMAGE}
                    alt="RetraLabs UPI QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scan & Pay</span>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Scan via any UPI App (Google Pay, PhonePe, Paytm, BHIM) or copy UPI ID:
                  </p>

                  <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                    <code className="bg-slate-100 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-slate-200">
                      {UPI_ID}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Screenshot Area */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Upload Payment Screenshot *
                </label>
                
                {screenshotPreview ? (
                  <div className="relative rounded-2xl border border-emerald-300 bg-emerald-50/40 p-4 flex items-center gap-4">
                    <img
                      src={screenshotPreview}
                      alt="Payment proof preview"
                      className="w-16 h-16 object-cover rounded-xl border border-emerald-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-900 truncate">
                        {screenshotFile?.name || 'Payment Confirmation'}
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Screenshot attached successfully
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotFile(null);
                        setScreenshotPreview(null);
                        setScreenshotBase64(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                      title="Remove image"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      Tap or Click to Upload Payment Screenshot
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP supported
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* UTR / Transaction ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UPI Reference / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  value={transaction}
                  onChange={(e) => setTransaction(e.target.value)}
                  placeholder="e.g. 423987123456"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirming Order & Booking Courier...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Submit Order for ₹{totalAmount.toLocaleString('en-IN')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
