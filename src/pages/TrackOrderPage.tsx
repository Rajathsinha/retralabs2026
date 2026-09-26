import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Search, Package, Truck, Clock, XCircle, AlertCircle, ArrowRight, ShieldCheck, MapPin, RefreshCw } from 'lucide-react';

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
  /** Innofulfill's document number, e.g. RETR0000000187. Null for Shiprocket. */
  innofulfillDocNo?: string | null;
  /** 'Innofulfill', or null when the parcel went out via Shiprocket. */
  carrier?: string | null;
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetches the order. Every call re-reads the courier's live status server
   * side, so this doubles as the refresh.
   *
   * `background` keeps the current result on screen while it refetches —
   * a silent poll must never blank out the status the customer is reading.
   */
  const fetchOrder = async (background = false) => {
    const id = orderId.trim();
    const contact = phoneOrEmail.trim();
    if (!id || !contact) {
      setError('Please enter both your order / document number and phone number or email address.');
      return;
    }
    if (background) setRefreshing(true);
    else { setLoading(true); setOrder(null); }
    setError(null);

    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, phoneOrEmail: contact }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        // A failed background refresh keeps the last good status rather than
        // replacing it with an error the customer can do nothing about.
        if (!background) setError(json?.error || `Tracking failed (HTTP ${res.status})`);
        return;
      }
      setOrder(json.order as OrderData);
      setLastUpdated(new Date());
    } catch (err) {
      if (!background) setError(err instanceof Error ? err.message : 'Failed to track order. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchOrder(false);
  };

  useEffect(() => {
    const urlOrderId = searchParams.get('orderId');
    if (urlOrderId && !order && !loading) {
      setOrderId(urlOrderId);
    }
  }, [searchParams, order, loading]);

  const terminalStatus = order ? isTerminalStatus(order.status) : false;
  const deliveredOrCancelled =
    terminalStatus ||
    /delivered|cancel|rto|returned/i.test(order?.trackingStatus || order?.shipmentStatus || '');

  /**
   * Keeps the courier status live while the customer is watching it.
   *
   * Stops once the parcel has arrived — there is nothing further to learn —
   * and pauses while the tab is hidden, so a page left open in a background
   * tab doesn't keep hitting the courier's API all day.
   */
  useEffect(() => {
    if (!order || deliveredOrCancelled) return;

    const REFRESH_MS = 45000;
    const tick = () => {
      if (document.visibilityState === 'visible') void fetchOrder(true);
    };
    const timer = window.setInterval(tick, REFRESH_MS);

    // Catch up immediately when they come back to the tab.
    const onVisible = () => { if (document.visibilityState === 'visible') void fetchOrder(true); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // Re-armed when the tracked order or its finality changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId, deliveredOrCancelled]);
  const documentNumber = order?.documentNumber || order?.orderId || '';
  // Shiprocket parcels carry no carrier detail on this page by design — the
  // server sends nulls for them, so there is nothing courier-shaped to show.
  const viaShiprocket = Boolean(order) && !order?.carrier && !order?.awbNumber && !order?.awbDisplay;
  const awbLabel = order?.awbNumber || order?.innofulfillDocNo || order?.awbDisplay || 'Awaiting shipment assignment';
  const courierLabel = order?.carrierDisplayName || order?.courierName || order?.carrier || '—';
  // A Shiprocket parcel has no courier feed here, and its internal
  // shipmentStatus ("AWB_PENDING") and Status ("Created in Shiprocket") would
  // both leak plumbing at the customer. It is only ever marked Shiprocket once
  // the booking succeeded, so "Dispatched" is both cleaner and true.
  const shipmentStatusLabel = viaShiprocket
    ? 'Dispatched'
    : order?.trackingStatus || order?.shipmentStatus || order?.status || '—';
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
            Enter your order / document number (e.g. 20260907001) and verification contact to view shipment status
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
                placeholder="e.g. 20260907001"
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
                {!viaShiprocket && (
                  <>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">AWB / Reference</p>
                      <p className="text-sm font-semibold text-slate-700 font-mono">{awbLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Courier</p>
                      <p className="text-sm font-semibold text-slate-700">{courierLabel}</p>
                    </div>
                  </>
                )}
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

              {/* Live status footer — tells them the number they're reading is
                  current, and lets them force a check without re-entering
                  their details. */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs text-slate-400" aria-live="polite">
                  {deliveredOrCancelled ? (
                    <>Final status — no longer updating</>
                  ) : (
                    <>
                      <span className="relative flex w-2 h-2" aria-hidden="true">
                        <span className={`absolute inline-flex w-full h-full rounded-full bg-emerald-400 ${refreshing ? 'animate-ping' : 'opacity-60'}`} />
                        <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                      </span>
                      {refreshing
                        ? 'Checking courier…'
                        : lastUpdated
                          ? `Live · updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Live'}
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void fetchOrder(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
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

            {!order.awbNumber && !viaShiprocket && (
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

            {/* Courier events come from Innofulfill only, so there is no
                timeline to offer for a parcel that went out via Shiprocket. */}
            <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm ${viaShiprocket ? 'hidden' : ''}`}>
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
