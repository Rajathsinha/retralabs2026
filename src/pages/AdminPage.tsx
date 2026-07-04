import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, LogOut, ChevronDown } from 'lucide-react';

const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const TABLE   = import.meta.env.VITE_AIRTABLE_TABLE || 'Orders';
const PASS    = import.meta.env.VITE_ADMIN_PASSWORD;

const STATUS_OPTIONS = ['New', 'Confirmed', 'Paid', 'Shipped', 'Delivered', 'Cancelled'];

interface AirtableAttachment { url: string; thumbnails?: { small?: { url: string } } }
interface AirtableRecord {
  id: string;
  fields: Record<string, string | number | AirtableAttachment[] | undefined>;
}

async function fetchOrders(): Promise<AirtableRecord[]> {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}?sort[0][field]=Created&sort[0][direction]=desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error('Airtable fetch failed');
  const json = await res.json();
  return json.records || [];
}

async function patchStatus(recordId: string, status: string) {
  await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}/${recordId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { Status: status } }),
  });
}

function exportCsv(records: AirtableRecord[]) {
  const cols = ['Created', 'Name', 'Phone', 'Email', 'Items', 'Total', 'Payment', 'Transaction', 'Status', 'Address', 'Delivery'];
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
    <div style={{ minHeight: '100vh', background: '#040C1E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ color: '#00C896', fontWeight: 900, fontSize: 22 }}>RetraLabs</span>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Admin Dashboard</p>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
            color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12,
          }}
          autoFocus
        />
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>Wrong password</p>}
        <button onClick={submit} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A3FF)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
          Enter
        </button>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1');
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchOrders();
      setRecords(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
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

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const filtered = records.filter(r => {
    const f = r.fields;
    if (filterDate && f['Created'] !== filterDate) return false;
    if (filterPayment && !String(f['Payment'] ?? '').toLowerCase().includes(filterPayment.toLowerCase())) return false;
    if (filterStatus && f['Status'] !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, fields: { ...r.fields, Status: newStatus } } : r));
    await patchStatus(recordId, newStatus);
  };

  const cols: { key: string; label: string; width?: number }[] = [
    { key: 'Created', label: 'Date', width: 100 },
    { key: 'Name', label: 'Name', width: 130 },
    { key: 'Phone', label: 'Phone', width: 110 },
    { key: 'Email', label: 'Email', width: 180 },
    { key: 'Items', label: 'Items', width: 220 },
    { key: 'Total', label: 'Total', width: 90 },
    { key: 'Payment', label: 'Payment', width: 100 },
    { key: 'Transaction', label: 'Txn Ref', width: 130 },
    { key: 'Screenshot', label: 'Screenshot', width: 110 },
    { key: 'Status', label: 'Status', width: 130 },
  ];

  const statusColor: Record<string, string> = {
    New: '#3b82f6', Confirmed: '#8b5cf6', Paid: '#00C896', Shipped: '#f59e0b', Delivered: '#22c55e', Cancelled: '#ef4444',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#040C1E', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ color: '#00C896', fontWeight: 900, fontSize: 18 }}>RetraLabs</span>
          <span style={{ color: '#475569', fontSize: 13, marginLeft: 12 }}>Admin · {filtered.length} orders</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {lastRefresh && <span style={{ color: '#475569', fontSize: 12, display: 'flex', alignItems: 'center' }}>Last updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button onClick={() => exportCsv(filtered)} style={{ background: '#00C896', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false); }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
        />
        <input
          placeholder="Filter by payment..."
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', width: 160 }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterDate || filterPayment || filterStatus) && (
          <button onClick={() => { setFilterDate(''); setFilterPayment(''); setFilterStatus(''); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 12px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div style={{ margin: '16px 24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

      {/* Table */}
      <div style={{ overflowX: 'auto', padding: '0 24px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {cols.map(c => (
                <th key={c.key} style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, width: c.width, whiteSpace: 'nowrap' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>No orders yet</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: c.width, wordBreak: 'break-word' }}>
                    {c.key === 'Screenshot' ? (() => {
                      const attachments = r.fields['Screenshot'] as AirtableAttachment[] | undefined;
                      const att = attachments?.[0];
                      if (!att) return <span style={{ color: '#334155' }}>—</span>;
                      const thumb = att.thumbnails?.small?.url || att.url;
                      return (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <img src={thumb} alt="Payment screenshot" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                        </a>
                      );
                    })() : c.key === 'Status' ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <select
                          value={String(r.fields['Status'] || 'New')}
                          onChange={e => handleStatusChange(r.id, e.target.value)}
                          style={{
                            appearance: 'none', background: `${statusColor[String(r.fields['Status'] || 'New')] || '#475569'}22`,
                            border: `1px solid ${statusColor[String(r.fields['Status'] || 'New')] || '#475569'}66`,
                            borderRadius: 6, padding: '4px 24px 4px 8px', color: statusColor[String(r.fields['Status'] || 'New')] || '#94a3b8',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer', outline: 'none',
                          }}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                      </div>
                    ) : c.key === 'Items' ? (
                      <span style={{ color: '#94a3b8', whiteSpace: 'pre-line' }}>{String(r.fields[c.key] ?? '—')}</span>
                    ) : c.key === 'Total' ? (
                      <span style={{ color: '#00C896', fontWeight: 700 }}>₹{Number(r.fields[c.key] || 0).toLocaleString('en-IN')}</span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>{String(r.fields[c.key] ?? '—')}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
