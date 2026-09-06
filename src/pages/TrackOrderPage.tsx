import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Search, Package, Truck, Clock, XCircle, AlertCircle, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

interface TrackingTimelineEvent {
  status?: string;
  date?: string;
  location?: string;
  timestamp?: string;
  description?: string;
}

interface OrderData {
  orderId: string;
  documentNumber: string;
  orderDate: string | null;
  status: string;
  paymentStatus: string | null;
  items: string | null;
  total: number | null;
  payment: string | null;
  delivery: string | null;
  name: string | null;
  awbNumber: string | null;
  awbDisplay: string | null;
  courierName: string | null;
  carrierDisplayName?: string | null;
  logisticsProvider?: string | null;
  innofulfillOrderId: string | null;
  shipmentStatus: string | null;
  statusMessage: string | null;
  trackingStatus: string | null;
  trackingTimeline: TrackingTimelineEvent[] | null;
  trackingUrl: string | null;
}

function isTerminalStatus(status: string): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized.includes('cancelled') || normalized.includes('failed') || normalized.includes('rto') || normalized.includes('returned');
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
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
      setError('Please enter both your order / document number and phone number or email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch('/api/track-order', {
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

  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    if (urlOrderId && !order && !loading) {
      setOrderId(urlOrderId);
    }
  }, [searchParams, order, loading]);

  const terminalStatus = order ? isTerminalStatus(order.status) : false;
  const documentNumber = order?.documentNumber || order?.orderId || '';
  const awbLabel = order?.awbNumber || order?.awbDisplay || 'Awaiting shipment assignment';
  const courierLabel = order?.carrierDisplayName || order?.courierName || order?.logisticsProvider || '—';
  const shipmentStatusLabel = order?.trackingStatus || order?.shipmentStatus || order?.status || '—';
  const timeline = (order?.trackingTimeline || []).filter((event) => event.status || event.description);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Track Your Order</h1>
          <p className="text-slate-500 text-sm">
            Enter your order / document number (e.g. RETR0000000035) and verification contact to view shipment status
          </p>
        </div>

        <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Order / Document No.</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. RETR0000000035"
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

        {order && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Order / Document No.</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight font-mono">{documentNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Order Date</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(order.orderDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">AWB</p>
                  <p className="text-sm font-semibold text-slate-700 font-mono">{awbLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Courier</p>
                  <p className="text-sm font-semibold text-slate-700">{courierLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Status</p>
                  <p className={`text-sm font-semibold ${terminalStatus ? 'text-red-600' : 'text-emerald-600'}`}>
                    {shipmentStatusLabel.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Payment</p>
                  <p className="text-sm font-semibold text-slate-700">{order.payment || 'N/A'}</p>
                </div>
              </div>

              {order.statusMessage && (
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-600">
                  {order.statusMessage}
                </div>
              )}
            </div>

            {order.awbNumber && order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                <Truck className="w-4 h-4" />
                Track on Courier Site
                <ArrowRight className="w-4 h-4" />
              </a>
            )}

            {!order.awbNumber && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">
                      {order.statusMessage || 'Tracking information will appear once the shipment is dispatched.'}
                    </p>
                    {order.innofulfillOrderId && (
                      <p className="text-xs text-amber-800">Shipment booking ID: {order.innofulfillOrderId}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Shipment Timeline</h3>
                  <p className="text-xs text-slate-400">Events from courier / Innofulfill only</p>
                </div>
              </div>

              {timeline.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  {order.statusMessage || 'Tracking information will appear once the shipment is dispatched.'}
                </p>
              ) : (
                <div className="space-y-0">
                  {timeline.map((event, idx) => (
                    <div key={`${event.status}-${idx}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        {idx < timeline.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 min-h-[2rem]" />}
                      </div>
                      <div className="pb-5 flex-1">
                        <p className="text-sm font-medium text-slate-900">{event.status}</p>
                        {event.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                        )}
                        {event.location && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </p>
                        )}
                        {(event.date || event.timestamp) && (
                          <p className="text-xs text-slate-400 mt-1">{formatDate(event.date || event.timestamp || null)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

            {order.items && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Items</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{order.items}</p>
                {order.total != null && (
                  <p className="text-sm font-semibold text-slate-900 mt-3 pt-3 border-t border-slate-100">
                    Total: ₹{order.total.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!order && !error && !loading && (
          <div className="bg-slate-100 rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-600 font-semibold text-sm mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Order Lookup</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your order / document number was shown on checkout confirmation and sent to your email.
              Enter the phone number or email address used during purchase to verify and view tracking information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
