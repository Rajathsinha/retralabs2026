import { useSEO } from '../hooks/useSEO';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, LogOut, Search, X, Eye, Download, ChevronDown, Truck, Package } from 'lucide-react';

const PASS = import.meta.env.VITE_ADMIN_PASSWORD;

const STATUS_OPTIONS = [
  'New',
  'Created in Shiprocket',
  'Confirmed',
  'Paid',
  'Shipped',
  'Delivered',
  'Cancelled',
];

interface AirtableAttachment { url: string; thumbnails?: { small?: { url: string } } }
interface AirtableRecord {
  id: string;
  fields: Record<string, string | number | AirtableAttachment[] | undefined>;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchOrders(): Promise<AirtableRecord[]> {
  const res = await fetch('/.netlify/functions/list-orders', { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || `Airtable fetch failed (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.records || [];
}

function exportCsv(records: AirtableRecord[]) {
  const cols = ['Created', 'Name', 'Phone', 'Email', 'Items', 'Total (₹)', 'Payment', 'Transaction', 'Status', 'Shiprocket Order ID', 'Shiprocket Shipment ID', 'Tracking ID', 'Shiprocket Error', 'Address', 'Delivery'];
  const header = cols.join(',');
  const rows = records.map(r =>
    cols.map(c => {
      const v = String(r.fields[c] ?? '');
      return `"${v.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `retralabs-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Password gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [input, setInput] = useState('');
  const [err, setErr] = useState(false);
  const submit = () => {
    if (input === PASS) { sessionStorage.setItem('admin_auth', '1'); onAuth(); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  };
  return (
    <div className="min-h-screen bg-[#040C1E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-7">
          <span className="text-[#00C896] font-black text-xl">RetraLabs</span>
          <p className="text-slate-500 text-xs mt-1">Admin Dashboard</p>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className={`w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border ${err ? 'border-red-500' : 'border-white/10'} text-white text-sm outline-none mb-3 focus:border-[#00C896]/50 transition-colors`}
          autoFocus
        />
        {err && <p className="text-red-500 text-xs mb-3 text-center">Wrong password</p>}
        <button onClick={submit} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00C896] to-[#00A3FF] text-white font-bold text-sm transition-opacity hover:opacity-90">
          Enter
        </button>
      </div>
    </div>
  );
}

// ── View Order Modal ──────────────────────────────────────────────────────────
function ViewOrderModal({ record, onClose }: { record: AirtableRecord | null; onClose: () => void }) {
  if (!record) return null;
  const f = record.fields;

  const rows: { label: string; value: string | number | undefined; isPrice?: boolean }[] = [
    { label: 'Order ID', value: String(f['orderID'] ?? '—') },
    { label: 'Customer Name', value: String(f['Name'] ?? '—') },
    { label: 'Phone', value: String(f['Phone'] ?? '—') },
    { label: 'Email', value: String(f['Email'] ?? '—') },
    { label: 'Address', value: String(f['Address'] ?? '—') },
    { label: 'Items', value: String(f['Items'] ?? '—') },
    { label: 'Total', value: f['Total (₹)'], isPrice: true },
    { label: 'Payment', value: String(f['Payment'] ?? '—') },
    { label: 'Delivery', value: String(f['Delivery'] ?? '—') },
    { label: 'Transaction', value: String(f['Transaction'] ?? '—') },
    { label: 'Referral', value: String(f['Referral'] ?? '—') },
    { label: 'Status', value: String(f['Status'] ?? '—') },
    { label: 'Shiprocket Order ID', value: String(f['Shiprocket Order ID'] ?? '—') },
    { label: 'Shiprocket Shipment ID', value: String(f['Shiprocket Shipment ID'] ?? '—') },
    { label: 'Tracking ID', value: String(f['Tracking ID'] ?? '—') },
    { label: 'Shiprocket Error', value: String(f['Shiprocket Error'] ?? '—') },
    { label: 'Created', value: String(f['Created'] ?? '—') },
  ];

  const screenshots = f['Screenshot'] as AirtableAttachment[] | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0B1426] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0B1426]">
          <h3 className="text-white font-bold text-base">Order Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500 flex-shrink-0">{row.label}</span>
              <span className={`text-right ${row.isPrice ? 'text-[#00C896] font-bold' : 'text-slate-200 font-medium'} break-words`}>
                {row.isPrice && row.value !== undefined && row.value !== '—'
                  ? `₹${Number(row.value).toLocaleString('en-IN')}`
                  : String(row.value ?? '—')}
              </span>
            </div>
          ))}

          {screenshots && screenshots.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <p className="text-slate-500 text-xs mb-2">Payment Screenshot</p>
              <div className="flex gap-2 flex-wrap">
                {screenshots.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                    <img src={att.thumbnails?.small?.url || att.url} alt="Payment screenshot" className="w-20 h-20 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-[#00C896]/50 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1');
  useSEO({ title: 'Admin | RetraLabs', description: 'Internal dashboard.', noindex: true });
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [viewRecord, setViewRecord] = useState<AirtableRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchOrders();
      setRecords(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [authed, load]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const f = r.fields;
      if (filterStatus && String(f['Status'] ?? '') !== filterStatus) return false;
      if (filterPayment && !String(f['Payment'] ?? '').toLowerCase().includes(filterPayment.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          f['orderID'], f['Name'], f['Phone'], f['Email'], f['Items'],
          f['Status'], f['Shiprocket Order ID'], f['Tracking ID'], f['Shiprocket Error'], f['Transaction'],
        ].map(v => String(v ?? '').toLowerCase()).join(' ');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, search, filterStatus, filterPayment]);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const cols: { key: string; label: string; width?: number }[] = [
    { key: 'orderID', label: 'Order ID', width: 140 },
    { key: 'Name', label: 'Customer Name', width: 130 },
    { key: 'Phone', label: 'Phone', width: 110 },
    { key: 'Payment', label: 'Payment', width: 90 },
    { key: 'Total (₹)', label: 'Total', width: 90 },
    { key: 'Status', label: 'Status', width: 150 },
    { key: 'Shiprocket Order ID', label: 'Shiprocket ID', width: 120 },
    { key: 'Tracking ID', label: 'Tracking ID', width: 120 },
    { key: 'Shiprocket Error', label: 'SR Error', width: 200 },
    { key: 'Created', label: 'Created At', width: 100 },
  ];

  const statusColor: Record<string, string> = {
    'New': '#3b82f6',
    'Created in Shiprocket': '#00C896',
    'Confirmed': '#8b5cf6',
    'Paid': '#00C896',
    'Shipped': '#f59e0b',
    'Delivered': '#22c55e',
    'Cancelled': '#ef4444',
  };

  const stats = {
    total: filtered.length,
    cod: filtered.filter(r => String(r.fields['Payment'] ?? '').toLowerCase().includes('cod')).length,
    shiprocket: filtered.filter(r => !!r.fields['Shiprocket Order ID']).length,
    shiprocketErrors: filtered.filter(r => {
      const e = String(r.fields['Shiprocket Error'] ?? '');
      return e && e !== '—';
    }).length,
    newOrders: filtered.filter(r => String(r.fields['Status'] ?? '') === 'New').length,
  };

  return (
    <div className="min-h-screen bg-[#040C1E] text-slate-200 font-sans">
      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.08] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00C896] to-[#00A3FF] flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[#00C896] font-black text-lg">RetraLabs</span>
            <span className="text-slate-600 text-xs ml-2">Order Automation</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {lastRefresh && <span className="text-slate-600 text-xs hidden sm:block">Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading} className="bg-white/[0.08] border-none rounded-lg px-3.5 py-1.5 text-slate-400 flex items-center gap-1.5 text-xs hover:bg-white/[0.12] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Airtable
          </button>
          <button onClick={() => exportCsv(filtered)} className="bg-[#00C896] rounded-lg px-3.5 py-1.5 text-white font-bold flex items-center gap-1.5 text-xs hover:opacity-90 transition-opacity">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false); }} className="bg-white/[0.06] rounded-lg px-3.5 py-1.5 text-slate-400 flex items-center gap-1.5 text-xs hover:bg-white/[0.1] transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, color: '#3b82f6' },
          { label: 'COD Orders', value: stats.cod, color: '#f59e0b' },
          { label: 'In Shiprocket', value: stats.shiprocket, color: '#00C896' },
          { label: 'SR Errors', value: stats.shiprocketErrors, color: '#ef4444' },
          { label: 'New (Pending)', value: stats.newOrders, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
            <p className="text-slate-500 text-xs">{s.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex gap-2.5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            placeholder="Search by Order ID, name, phone, Shiprocket ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-slate-200 text-sm outline-none focus:border-[#00C896]/50 transition-colors"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-[#00C896]/50 transition-colors"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          placeholder="Payment method..."
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value)}
          className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-[#00C896]/50 transition-colors w-40"
        />
        {(search || filterStatus || filterPayment) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterPayment(''); }} className="text-slate-400 text-xs border border-white/15 rounded-lg px-3 py-2 hover:bg-white/[0.06] transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="px-6 pb-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {cols.map(c => (
                <th key={c.key} className="text-left px-3 py-2.5 text-slate-500 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap" style={{ minWidth: c.width }}>
                  {c.label}
                </th>
              ))}
              <th className="text-left px-3 py-2.5 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={cols.length + 1} className="text-center py-10 text-slate-600">No orders found</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                {cols.map(c => (
                  <td key={c.key} className="px-3 py-2.5 align-top max-w-[220px]">
                    {c.key === 'Status' ? (() => {
                      const status = String(r.fields['Status'] || 'New');
                      const color = statusColor[status] || '#475569';
                      return (
                        <span
                          className="inline-block px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap"
                          style={{ background: `${color}22`, border: `1px solid ${color}66`, color }}
                        >
                          {status}
                        </span>
                      );
                    })() : c.key === 'Total (₹)' ? (
                      <span className="text-[#00C896] font-bold">₹{Number(r.fields[c.key] || 0).toLocaleString('en-IN')}</span>
                    ) : c.key === 'Shiprocket Order ID' ? (() => {
                      const srId = String(r.fields['Shiprocket Order ID'] ?? '');
                      return srId && srId !== '—' ? (
                        <span className="text-[#00C896] font-medium flex items-center gap-1">
                          <Truck className="w-3 h-3" />{srId}
                        </span>
                      ) : <span className="text-slate-700">—</span>;
                    })() : c.key === 'Tracking ID' ? (() => {
                      const tid = String(r.fields['Tracking ID'] ?? '');
                      return tid && tid !== '—' ? (
                        <span className="text-amber-400 font-medium">{tid}</span>
                      ) : <span className="text-slate-700">—</span>;
                    })() : c.key === 'Shiprocket Error' ? (() => {
                      const err = String(r.fields['Shiprocket Error'] ?? '');
                      return err && err !== '—' ? (
                        <span className="text-red-400 text-xs break-words" title={err}>{err.length > 40 ? err.slice(0, 40) + '…' : err}</span>
                      ) : <span className="text-slate-700">—</span>;
                    })() : (
                      <span className="text-slate-300">{String(r.fields[c.key] ?? '—')}</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => setViewRecord(r)}
                    className="text-slate-400 hover:text-[#00C896] transition-colors flex items-center gap-1 text-xs"
                    title="View order"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ViewOrderModal record={viewRecord} onClose={() => setViewRecord(null)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
