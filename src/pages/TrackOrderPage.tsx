import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Search, Package, Truck, MapPin, CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface OrderData {
  orderId: string;
  orderDate: string | null;
  status: string;
  items: string | null;
  total: number | null;
  payment: string | null;
  delivery: string | null;
  name: string | null;
  awbNumber: string | null;
  courierName: string | null;
  innofulfillOrderId: string | null;
  trackingStatus: string | null;
  trackingTimeline: any[] | null;
  trackingUrl: string | null;
}

const STATUS_FLOW = [
  'Order Placed',
  'Confirmed',
  'AWB Generated',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
];

function getStatusIndex(status: string): number {
  const normalized = status.toLowerCase();
  if (normalized.includes('delivered')) return 6;
  if (normalized.includes('out for delivery')) return 5;
  if (normalized.includes('transit')) return 4;
  if (normalized.includes('picked') || normalized.includes('pickup')) return 3;
  if (normalized.includes('awb') || normalized.includes('created in innofulfill')) return 2;
  if (normalized.includes('confirm')) return 1;
  return 0;
}

function isTerminalStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized.includes('cancelled') || normalized.includes('failed') || normalized.includes('rto') || normalized.includes('returned');
}

export default function TrackOrderPage() {
  useSEO({ title: 'Track Your Order | RetraLabs', description: 'Track your RetraLabs order status and shipment.', noindex: true });

  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      setError('Please enter both your Order ID and phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch('/.netlify/functions/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error || `Tracking failed (HTTP ${res.status})`);
        return;
      }
      setOrder(json.order as OrderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit if orderId came from URL (e.g., from checkout confirmation page)
  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    if (urlOrderId && !order && !loading) {
      setOrderId(urlOrderId);
    }
  }, [searchParams]);

  const terminalStatus = order ? isTerminalStatus(order.status) : false;
  const currentStep = order ? getStatusIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Track Your Order</h1>
          <p className="text-slate-500 text-sm">Enter your Order ID and phone number to see your shipment status</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. RETR-1001"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 font-medium"
                autoCapitalize="characters"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91XXXXXXXXXX"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 font-medium"
                autoComplete="tel"
              />
              <p className="text-xs text-slate-400 mt-1.5">Enter the phone number you used when placing the order</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Search className="w-4 h-4" /> Track Order</>
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900 mb-0.5">Tracking Error</p>
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Order result */}
        {order && (
          <div className="space-y-4">
            {/* Order header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Order ID</p>
                  <p className="text-xl font-black text-slate-900">{order.orderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Order Date</p>
                  <p className="text-sm font-semibold text-slate-700">{order.orderDate || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Payment</p>
                  <p className="text-sm font-semibold text-slate-700">{order.payment || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Delivery</p>
                  <p className="text-sm font-semibold text-slate-700">{order.delivery || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Total</p>
                  <p className="text-sm font-semibold text-slate-700">{order.total ? `₹${order.total.toLocaleString('en-IN')}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Status</p>
                  <p className={`text-sm font-semibold ${terminalStatus ? 'text-red-600' : 'text-emerald-600'}`}>{order.status}</p>
                </div>
              </div>
            </div>

            {/* Shipment / AWB info */}
            {order.awbNumber ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Shipment Details</h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">AWB Number</span>
                    <span className="font-bold text-slate-900">{order.awbNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Courier</span>
                    <span className="font-semibold text-slate-700">{order.courierName || 'Innofulfill'}</span>
                  </div>
                  {order.trackingStatus && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tracking Status</span>
                      <span className="font-semibold text-blue-600">{order.trackingStatus}</span>
                    </div>
                  )}
                </div>

                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    <Truck className="w-4 h-4" />
                    Track on Courier Site
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">AWB not yet generated</p>
                    <p className="text-xs text-amber-700">Your tracking details are being generated. Please check back in a few hours.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status timeline */}
            {!terminalStatus && order.awbNumber && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Order Timeline</h3>
                <div className="space-y-1">
                  {STATUS_FLOW.map((step, idx) => {
                    const isComplete = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isComplete
                                ? isCurrent
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isComplete && !isCurrent ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isCurrent ? (
                              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                            ) : (
                              <div className="w-2 h-2 bg-slate-300 rounded-full" />
                            )}
                          </div>
                          {idx < STATUS_FLOW.length - 1 && (
                            <div className={`w-0.5 h-6 ${idx < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${isComplete ? (isCurrent ? 'text-blue-600' : 'text-slate-700') : 'text-slate-400'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Terminal status (cancelled/failed/RTO/returned) */}
            {terminalStatus && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">Order Status: {order.status}</p>
                    <p className="text-xs text-red-700 mt-0.5">This order has reached a final state. For assistance, please contact WhatsApp Support.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            {order.items && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Items</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line">{order.items}</p>
              </div>
            )}
          </div>
        )}

        {/* Help text */}
        {!order && !error && !loading && (
          <div className="bg-slate-100 rounded-2xl p-5 text-center">
            <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Your Order ID was shown on the confirmation page and sent in your order confirmation email.
              Use the phone number you entered at checkout to verify your identity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
