import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

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
  carrierDisplayName?: string | null;
  logisticsProvider?: string | null;
  innofulfillOrderId: string | null;
  shipmentStatus: string | null;
  trackingStatus: string | null;
  trackingTimeline: Record<string, unknown>[] | null;
  trackingUrl: string | null;
}

const STATUS_FLOW = [
  'Order Placed',
  'Confirmed',
  'AWB Assigned',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
];

function getStatusIndex(status: string, shipmentStatus?: string | null): number {
  const normalized = (status || '').toLowerCase();
  const shipNorm = (shipmentStatus || '').toLowerCase();

  if (normalized.includes('delivered')) return 6;
  if (normalized.includes('out for delivery')) return 5;
  if (normalized.includes('transit')) return 4;
  if (normalized.includes('picked') || normalized.includes('pickup')) return 3;
  if (shipNorm === 'awb_assigned' || normalized.includes('awb') || normalized.includes('shipped')) return 2;
  if (normalized.includes('confirm') || normalized.includes('paid') || normalized.includes('created in innofulfill')) return 1;
  return 0;
}

function isTerminalStatus(status: string): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized.includes('cancelled') || normalized.includes('failed') || normalized.includes('rto') || normalized.includes('returned');
}

export default function TrackOrderPage() {
  useSEO({ title: 'Track Your Order | RetraLabs', description: 'Track your RetraLabs order status and courier shipment.', noindex: true });

  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phoneOrEmail.trim()) {
      setError('Please enter both your Order ID and phone number or email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch('/.netlify/functions/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId.trim(),
          phoneOrEmail: phoneOrEmail.trim(),
        }),
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

  // Auto-fill orderId from URL parameter
  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    if (urlOrderId && !order && !loading) {
      setOrderId(urlOrderId);
    }
  }, [searchParams, order, loading]);

  const terminalStatus = order ? isTerminalStatus(order.status) : false;
  const currentStep = order ? getStatusIndex(order.status, order.shipmentStatus) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Track Your Order</h1>
          <p className="text-slate-500 text-sm">Enter your RetraLabs Order ID and verification contact to view real-time shipment status</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. RL-20260830-1001"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 font-medium"
                autoCapitalize="characters"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number or Email Address</label>
              <input
                type="text"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="e.g. +91 9876543210 or yourname@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 font-medium"
                autoComplete="email tel"
              />
              <p className="text-xs text-slate-400 mt-1.5">Enter the phone number or email address you used at checkout</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
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
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Order ID</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{order.orderId}</p>
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
                  <p className="text-sm font-semibold text-slate-700">{order.delivery || 'Standard'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Total</p>
                  <p className="text-sm font-semibold text-slate-700">{order.total ? `₹${order.total.toLocaleString('en-IN')}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Status</p>
                  <p className={`text-sm font-semibold ${terminalStatus ? 'text-red-600' : 'text-emerald-600'}`}>
                    {order.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipment / AWB info */}
            {order.awbNumber ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Shipment Details</h3>
                    <p className="text-xs text-slate-400">Verified Courier Tracking</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">AWB Number</span>
                    <span className="font-mono font-bold text-slate-900">{order.awbNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Courier</span>
                    <span className="font-semibold text-slate-700">{order.carrierDisplayName || order.courierName || order.logisticsProvider || 'Shiprocket'}</span>
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
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-amber-900">Shipment Handover in Progress</p>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                        {order.carrierDisplayName || order.courierName || order.logisticsProvider || 'Shiprocket'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Tracking number will be available once the shipment is handed over to the courier.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status timeline */}
            {!terminalStatus && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
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
                        <span className={`text-sm font-medium ${isComplete ? (isCurrent ? 'text-blue-600 font-bold' : 'text-slate-700') : 'text-slate-400'}`}>
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
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Items</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{order.items}</p>
              </div>
            )}
          </div>
        )}

        {/* Security badge & Help text */}
        {!order && !error && !loading && (
          <div className="bg-slate-100 rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-600 font-semibold text-sm mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Order Lookup</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your RetraLabs Order ID was displayed on your checkout confirmation and sent to your email.
              Enter the phone number or email address used during purchase to verify and view your tracking information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
