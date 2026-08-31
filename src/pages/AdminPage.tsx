import { useSEO } from '../hooks/useSEO';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingBag, IndianRupee, Clock, Package, Truck, CheckCircle2, Banknote, CreditCard, Zap, X, FileText } from 'lucide-react';
import { Sidebar } from '../components/admin/Sidebar';
import type { AdminPage as AdminPageId } from '../components/admin/Sidebar';
import { Topbar } from '../components/admin/Topbar';
import { StatCard } from '../components/admin/StatCard';
import { FilterBar, hasActiveFilters } from '../components/admin/FilterBar';
import { OrdersTable, type SortDir } from '../components/admin/OrdersTable';
import { OrderDrawer } from '../components/admin/OrderDrawer';
import { QuickActions } from '../components/admin/QuickActions';
import { PrepaidLabelsModal } from '../components/admin/PrepaidLabelsModal';
import { SkeletonTable } from '../components/admin/SkeletonTable';
import { DashboardView } from '../components/admin/DashboardView';
import { AnalyticsView } from '../components/admin/AnalyticsView';
import { CustomersView } from '../components/admin/CustomersView';
import { SettingsView } from '../components/admin/SettingsView';
import type { AirtableRecord, AdminFilters, StatCardData } from '../components/admin/types';

const PASS = import.meta.env.VITE_ADMIN_PASSWORD;
const EMPTY_FILTERS: AdminFilters = { search: '', status: '', payment: '', delivery: '', referral: '', customer: '', trackingId: '', dateFrom: '', dateTo: '' };

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
  const cols = ['orderID', 'Created', 'Name', 'Phone', 'Email', 'Items', 'Total (₹)', 'Payment', 'Transaction', 'Status', 'Shipment Status', 'Courier Provider', 'Courier', 'Innofulfill Order ID', 'Innofulfill Internal ID', 'AWB Number', 'Tracking ID', 'Innofulfill Error', 'Address', 'Delivery'];
  const header = cols.join(',');
  const rows = records.map(r => cols.map(c => `"${String(r.fields[c] ?? '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `retralabs-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function spark(seed: number): number[] {
  return Array.from({ length: 10 }, (_, i) => Math.max(1, Math.round(seed * (0.7 + Math.sin(i + seed) * 0.3 + i * 0.04))));
}

// ── Password gate ──────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [input, setInput] = useState('');
  const [err, setErr] = useState(false);
  const submit = () => {
    if (input === PASS) { sessionStorage.setItem('admin_auth', '1'); onAuth(); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  };
  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-7">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-black">R</span>
          </div>
          <span className="text-white font-bold text-lg">RetraLabs</span>
          <p className="text-slate-500 text-xs mt-1">Admin Dashboard</p>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className={`w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border ${err ? 'border-rose-500' : 'border-white/10'} text-white text-sm outline-none mb-3 focus:border-[#2563EB]/50 transition-colors`}
          autoFocus
        />
        {err && <p className="text-rose-400 text-xs mb-3 text-center">Wrong password</p>}
        <button onClick={submit} className="w-full py-3 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-[#1D4ED8] transition-colors">
          Enter
        </button>
      </div>
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1');
  useSEO({ title: 'Admin | RetraLabs', description: 'Internal dashboard.', noindex: true });

  const [page, setPage] = useState<AdminPageId>('orders');
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filters, setFilters] = useState<AdminFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<'prepay' | 'cod'>('prepay');
  const [sortKey, setSortKey] = useState('Created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewRecord, setViewRecord] = useState<AirtableRecord | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [mobileNav, setMobileNav] = useState(false);
  const pageSize = 12;

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
    return records.filter((r) => {
      const f = r.fields;
      const payment = String(f['Payment'] ?? '').toUpperCase();
      // Tab filter
      if (tab === 'cod' && !payment.includes('COD')) return false;
      if (tab === 'prepay' && payment.includes('COD')) return false;
      // Filters
      if (filters.status && String(f['Status'] ?? '') !== filters.status) return false;
      if (filters.payment && !payment.includes(filters.payment.toUpperCase())) return false;
      if (filters.delivery && !String(f['Delivery'] ?? '').toLowerCase().includes(filters.delivery.toLowerCase())) return false;
      if (filters.referral && !String(f['Referral'] ?? '').toLowerCase().includes(filters.referral.toLowerCase())) return false;
      if (filters.customer) {
        const c = filters.customer.toLowerCase();
        const hay = [String(f['Name'] ?? ''), String(f['Phone'] ?? '')].join(' ').toLowerCase();
        if (!hay.includes(c)) return false;
      }
      if (filters.trackingId && !String(f['Tracking ID'] ?? '').toLowerCase().includes(filters.trackingId.toLowerCase())) return false;
      if (filters.dateFrom && String(f['Created'] ?? '') < filters.dateFrom) return false;
      if (filters.dateTo && String(f['Created'] ?? '') > filters.dateTo) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [
          f['orderID'],
          f['Name'],
          f['Phone'],
          f['Email'],
          f['Items'],
          f['Status'],
          f['Shipment Status'],
          f['Courier'],
          f['Carrier Display Name'],
          f['Innofulfill Order ID'],
          f['Innofulfill Internal ID'],
          f['AWB Number'],
          f['Tracking ID'],
          f['Transaction'],
        ].map((v) => String(v ?? '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, tab, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = String(a.fields[sortKey] ?? '');
      const bv = String(b.fields[sortKey] ?? '');
      // numeric for total
      if (sortKey === 'Total (₹)') {
        return sortDir === 'asc' ? Number(av || 0) - Number(bv || 0) : Number(bv || 0) - Number(av || 0);
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const stats: StatCardData[] = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = filtered.filter((r) => String(r.fields['Created'] ?? '') === today);
    const count = (pred: (r: AirtableRecord) => boolean) => filtered.filter(pred).length;
    const isCod = (r: AirtableRecord) => String(r.fields['Payment'] ?? '').toUpperCase().includes('COD');
    const isExpress = (r: AirtableRecord) => String(r.fields['Delivery'] ?? '').toLowerCase().includes('express');
    const revenue = filtered.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    return [
      { key: 'today', label: "Today's Orders", value: todays.length, icon: ShoppingBag, tint: 'bg-blue-100 text-blue-600', change: 12, spark: spark(todays.length || 8) },
      { key: 'rev', label: 'Revenue', value: revenue, icon: IndianRupee, tint: 'bg-emerald-100 text-emerald-600', change: 8, spark: spark(revenue / 1000 || 20) },
      { key: 'pend', label: 'Pending', value: count((r) => ['New', 'Created in Innofulfill', 'Confirmed'].includes(String(r.fields['Status']))), icon: Clock, tint: 'bg-amber-100 text-amber-600', change: -4, spark: spark(15) },
      { key: 'pack', label: 'Packed', value: count((r) => String(r.fields['Status']) === 'Paid'), icon: Package, tint: 'bg-violet-100 text-violet-600', change: 6, spark: spark(10) },
      { key: 'ship', label: 'Shipped', value: count((r) => String(r.fields['Status']) === 'Shipped'), icon: Truck, tint: 'bg-indigo-100 text-indigo-600', change: 15, spark: spark(12) },
      { key: 'del', label: 'Delivered', value: count((r) => String(r.fields['Status']) === 'Delivered'), icon: CheckCircle2, tint: 'bg-green-100 text-green-600', change: 22, spark: spark(18) },
      { key: 'cod', label: 'COD', value: count(isCod), icon: Banknote, tint: 'bg-orange-100 text-orange-600', change: 5, spark: spark(14) },
      { key: 'pre', label: 'Prepaid', value: count((r) => !isCod(r)), icon: CreditCard, tint: 'bg-sky-100 text-sky-600', change: 9, spark: spark(16) },
      { key: 'exp', label: 'Express Orders', value: count(isExpress), icon: Zap, tint: 'bg-amber-100 text-amber-600', change: 18, spark: spark(7) },
    ];
  }, [filtered]);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    const pageRows = sorted.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    const allSel = pageRows.every((r) => selected.has(r.id));
    setSelected((s) => {
      const n = new Set(s);
      if (allSel) pageRows.forEach((r) => n.delete(r.id));
      else pageRows.forEach((r) => n.add(r.id));
      return n;
    });
  };

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const activeFilterCount = hasActiveFilters(filters) ? 1 : 0;
  const prepaidLabelRecords = sorted.filter((record) => selected.has(record.id));
  const labelRecords = prepaidLabelRecords.length > 0 ? prepaidLabelRecords : sorted;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      <Sidebar
        current={page}
        onNavigate={(p) => { setPage(p); setMobileNav(false); }}
        onLogout={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false); }}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          search={filters.search}
          onSearch={(v) => setFilters({ ...filters, search: v })}
          onRefresh={load}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onOpenMobileNav={() => setMobileNav(true)}
          loading={loading}
          lastRefresh={lastRefresh}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {page === 'dashboard' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500 mt-0.5">Overview of your store performance at a glance.</p>
              </div>
              <DashboardView stats={stats} records={records} onRowClick={setViewRecord} onGoToOrders={() => setPage('orders')} />
            </>
          )}

          {page === 'orders' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
                <p className="text-sm text-slate-500 mt-0.5">Manage and track all customer orders in one place.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                {stats.map((s) => <StatCard key={s.key} card={s} />)}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
                {(['prepay', 'cod'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setPageNum(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t === 'prepay' ? 'Prepayment' : 'COD'}
                    <span className={`ml-1.5 text-xs ${tab === t ? 'text-blue-600' : 'text-slate-400'}`}>
                      {t === 'prepay' ? filtered.filter((r) => !String(r.fields['Payment'] ?? '').toUpperCase().includes('COD')).length : filtered.filter((r) => String(r.fields['Payment'] ?? '').toUpperCase().includes('COD')).length}
                    </span>
                  </button>
                ))}
                </div>
                {tab === 'prepay' && (
                  <button
                    type="button"
                    onClick={() => setShowLabels(true)}
                    disabled={labelRecords.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FileText className="h-4 w-4" />
                    Print prepaid labels
                    <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">{prepaidLabelRecords.length > 0 ? prepaidLabelRecords.length : sorted.length}</span>
                  </button>
                )}
              </div>

              <FilterBar
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_FILTERS)}
                onExport={() => exportCsv(sorted)}
                visible={showFilters}
                onClose={() => setShowFilters(false)}
              />

              {activeFilterCount > 0 && !showFilters && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {Object.entries(filters).filter(([, v]) => v && v !== 'search').map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                      {k}: {v}
                      <button onClick={() => setFilters({ ...filters, [k]: '' })} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}

              {error && (
                <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-700 text-sm">{error}</div>
              )}

              {loading && sorted.length === 0 ? <SkeletonTable /> : (
                <OrdersTable
                  records={sorted}
                  loading={loading}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onRowClick={setViewRecord}
                  page={pageNum}
                  pageSize={pageSize}
                  onPageChange={setPageNum}
                />
              )}

              {selected.size > 0 && (
                <div className="mt-3 flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm">
                  <span className="font-semibold">{selected.size} selected</span>
                  <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Export selected</button>
                  <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-white">Clear</button>
                </div>
              )}
            </>
          )}

          {page === 'analytics' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
                <p className="text-sm text-slate-500 mt-0.5">Track revenue, trends, and product performance.</p>
              </div>
              <AnalyticsView records={records} />
            </>
          )}

          {page === 'customers' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
                <p className="text-sm text-slate-500 mt-0.5">View customer profiles, order history, and spending.</p>
              </div>
              <CustomersView records={records} onRowClick={setViewRecord} />
            </>
          )}

          {page === 'settings' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500 mt-0.5">Configure store, delivery, and notification preferences.</p>
              </div>
              <SettingsView />
            </>
          )}
        </main>
      </div>

      <OrderDrawer record={viewRecord} onClose={() => setViewRecord(null)} />
      {showLabels && <PrepaidLabelsModal records={labelRecords} onClose={() => setShowLabels(false)} />}
      <QuickActions onRefresh={load} />
    </div>
  );
}
