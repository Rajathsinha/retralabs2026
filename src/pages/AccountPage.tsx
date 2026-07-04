import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, Package, LogOut,
  Save, ChevronDown, ChevronRight, CheckCircle, Clock,
  Truck, XCircle, Edit3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/* ── Order shape from Supabase ── */
interface Order {
  id: string;
  total_amount: number;
  order_status: string;
  created_at: string;
  tracking_number: string | null;
}

function getStatusMeta(status: string) {
  switch (status) {
    case 'pending':    return { label: 'Pending Payment', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: Clock };
    case 'paid':       return { label: 'Payment Received', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     icon: CheckCircle };
    case 'processing': return { label: 'Processing',       color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200', icon: Package };
    case 'shipped':    return { label: 'Shipped',          color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200',     icon: Truck };
    case 'delivered':  return { label: 'Delivered',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle };
    case 'cancelled':  return { label: 'Cancelled',        color: 'text-red-700',     bg: 'bg-red-50 border-red-200',       icon: XCircle };
    default:           return { label: status,             color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200',   icon: Package };
  }
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();

  /* ── Profile form ── */
  const [name,    setName]    = useState(user?.user_metadata?.name    || '');
  const [phone,   setPhone]   = useState(user?.user_metadata?.phone   || '');
  const [address, setAddress] = useState(user?.user_metadata?.address || '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  /* ── Orders ── */
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  /* ── Fetch orders by email ── */
  useEffect(() => {
    if (!user?.email) { setOrdersLoading(false); return; }

    supabase
      .from('orders')
      .select('id, total_amount, order_status, created_at, tracking_number')
      .eq('customer_email', user.email)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) || []);
        setOrdersLoading(false);
      })
      .catch(() => setOrdersLoading(false));
  }, [user?.email]);

  /* ── Save profile ── */
  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ name, phone, address });
    setSaving(false);
    setSaved(true);
    setEditingProfile(false);
    setTimeout(() => setSaved(false), 3000);
  };

  /* ── Sign out ── */
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = (name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Dark hero header ── */}
      <div className="bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white text-xl font-extrabold tracking-tight">{initials}</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">
                {user?.user_metadata?.name || 'My Account'}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ══ LEFT: Profile + address ══ */}
          <div className="lg:col-span-1 space-y-5">

            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile</p>
                </div>
                <button
                  onClick={() => setEditingProfile(e => !e)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {editingProfile ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="px-5 pb-5 space-y-3.5">
                {/* Email (read-only) */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-xs font-semibold text-slate-500">Email</label>
                  </div>
                  <p className="text-sm text-slate-700 font-medium break-all">{user?.email}</p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                  {editingProfile ? (
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-sm text-slate-900 transition-all"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 font-medium">{name || <span className="text-slate-400 italic">Not set</span>}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-xs font-semibold text-slate-500">Phone</label>
                  </div>
                  {editingProfile ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-sm text-slate-900 transition-all"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 font-medium">{phone || <span className="text-slate-400 italic">Not set</span>}</p>
                  )}
                </div>

                {/* Saved address */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-xs font-semibold text-slate-500">Saved Address</label>
                  </div>
                  {editingProfile ? (
                    <textarea
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Flat, Street, City, State, PIN"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-sm text-slate-900 resize-none transition-all"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 font-medium whitespace-pre-line">
                      {address || <span className="text-slate-400 italic">Not set — add one for faster checkout</span>}
                    </p>
                  )}
                </div>

                {editingProfile && (
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Save Changes</>
                    )}
                  </button>
                )}

                {saved && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-emerald-700 text-xs font-semibold">Profile saved!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm py-3 rounded-2xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* ══ RIGHT: Order history ══ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-slate-100">
                <Package className="w-4 h-4 text-slate-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Order History</p>
                {orders.length > 0 && (
                  <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                )}
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-500 text-sm font-medium">No orders yet</p>
                  <p className="text-slate-400 text-xs mt-1 mb-5">Your order history will appear here</p>
                  <button
                    onClick={() => navigate('/catalogue')}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Browse Catalogue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map(order => {
                    const meta    = getStatusMeta(order.order_status);
                    const Icon    = meta.icon;
                    const isOpen  = expandedOrder === order.id;
                    const date    = new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    });

                    return (
                      <div key={order.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedOrder(isOpen ? null : order.id)}
                          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          {/* Status icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 tabular-nums truncate">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{date}</p>
                          </div>

                          {/* Status badge */}
                          <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>

                          {/* Total */}
                          <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                            ₹{order.total_amount.toLocaleString('en-IN')}
                          </p>

                          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Expanded detail */}
                        {isOpen && (
                          <div className="px-5 pb-4 bg-slate-50/50 border-t border-slate-100">
                            <div className="pt-4 space-y-3">
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                                <div>
                                  <span className="text-slate-400 font-semibold uppercase tracking-wide">Order ID</span>
                                  <p className="text-slate-700 font-mono mt-0.5">{order.id}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-semibold uppercase tracking-wide">Status</span>
                                  <p className={`font-bold mt-0.5 ${meta.color}`}>{meta.label}</p>
                                </div>
                                {order.tracking_number && (
                                  <div>
                                    <span className="text-slate-400 font-semibold uppercase tracking-wide">Tracking #</span>
                                    <p className="text-slate-700 font-mono mt-0.5">{order.tracking_number}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => navigate('/catalogue')}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  <Truck className="w-3.5 h-3.5" /> Track Package
                                </button>
                                <a
                                  href={`https://wa.me/918217824384?text=Hi%2C%20I%20need%20help%20with%20order%20${order.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Support
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
