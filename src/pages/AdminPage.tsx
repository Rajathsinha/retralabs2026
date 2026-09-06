import { useSEO } from '../hooks/useSEO';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingBag, IndianRupee, Clock, Package, Truck, CheckCircle2, Banknote, CreditCard, Zap, X, FileText, Printer, Copy, Check, Plus } from 'lucide-react';
import { Sidebar } from '../components/admin/Sidebar';
import type { AdminPage as AdminPageId } from '../components/admin/Sidebar';
import { Topbar } from '../components/admin/Topbar';
import { StatCard } from '../components/admin/StatCard';
import { FilterBar, hasActiveFilters } from '../components/admin/FilterBar';
import { OrdersTable, type SortDir } from '../components/admin/OrdersTable';
import { OrderDrawer } from '../components/admin/OrderDrawer';
import { QuickActions } from '../components/admin/QuickActions';
import { BulkAddressLabelModal } from '../components/admin/BulkAddressLabelModal';
import { OrderInvoiceModal } from '../components/admin/OrderInvoiceModal';
import { ManualOrderModal } from '../components/admin/ManualOrderModal';
import { SkeletonTable } from '../components/admin/SkeletonTable';
import { DashboardView } from '../components/admin/DashboardView';
import { AnalyticsView } from '../components/admin/AnalyticsView';
import { CustomersView } from '../components/admin/CustomersView';
import { SettingsView } from '../components/admin/SettingsView';
import type { AirtableRecord, AdminFilters, StatCardData } from '../components/admin/types';
import { adminFetch, adminLogin, getAdminToken, clearAdminToken } from '../utils/adminAuth';

const EMPTY_FILTERS: AdminFilters = {
  search: '',
  status: '',
  payment: '',
  paymentStatus: '',
  delivery: '',
  referral: '',
  customer: '',
  trackingId: '',
  datePreset: '',
  dateFrom: '',
  dateTo: '',
  product: '',
  minAmount: '',
  maxAmount: '',
  city: '',
  customerType: 'all',
  fulfillmentStatus: 'all',
};

async function fetchOrders(): Promise<AirtableRecord[]> {
  const res = await adminFetch('/api/list-orders');
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
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy || !input) return;
    setBusy(true);
    const ok = await adminLogin(input);
    setBusy(false);
    if (ok) onAuth();
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
  const [authed, setAuthed] = useState(() => Boolean(getAdminToken()));
  useSEO({ title: 'Admin | RetraLabs', description: 'Internal dashboard.', noindex: true });

  const [page, setPage] = useState<AdminPageId>('orders');
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filters, setFilters] = useState<AdminFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<'all' | 'prepay' | 'cod'>('all');
  const [sortKey, setSortKey] = useState('Created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewRecord, setViewRecord] = useState<AirtableRecord | null>(null);
  const [showBulkLabels, setShowBulkLabels] = useState(false);
  const [invoiceModalRecords, setInvoiceModalRecords] = useState<AirtableRecord[] | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [mobileNav, setMobileNav] = useState(false);
  const [copiedPhones, setCopiedPhones] = useState(false);
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

  // Extract list of all products
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const items = String(r.fields['Items'] ?? '');
      items.split(/[,;]/).forEach((i) => {
        const t = i.trim();
        if (t) set.add(t);
      });
    });
    return Array.from(set).sort();
  }, [records]);

  // Customer order counts for loyalty checking
  const customerOrderCounts = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const phone = String(r.fields['Phone'] ?? '').trim();
      const name = String(r.fields['Name'] ?? '').trim();
      const k = phone || name;
      if (k) map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [records]);

  const filtered = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);

    const getDaysAgoIso = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    };

    return records.filter((r) => {
      const f = r.fields;
      const payment = String(f['Payment'] ?? '').toUpperCase();
      const isCod = payment.includes('COD');
      const created = String(f['Created'] ?? '');
      const total = Number(f['Total (₹)'] || 0);
      const phone = String(f['Phone'] ?? '').trim();
      const name = String(f['Name'] ?? '').trim();
      const custKey = phone || name;
      const orderCount = customerOrderCounts.get(custKey) || 1;
      const status = String(f['Status'] ?? '');
      const awb = String(f['AWB Number'] ?? '');
      const tracking = String(f['Tracking ID'] ?? '');
      const delivery = String(f['Delivery'] ?? '').toLowerCase();
      const pStatus = String(f['Payment Status'] ?? '');

      // Tab filter
      if (tab === 'cod' && !isCod) return false;
      if (tab === 'prepay' && isCod) return false;

      // Date Presets
      if (filters.datePreset) {
        if (filters.datePreset === 'today' && created !== todayIso) return false;
        if (filters.datePreset === 'yesterday' && created !== yesterdayIso) return false;
        if (filters.datePreset === '7d' && created < getDaysAgoIso(7)) return false;
        if (filters.datePreset === '15d' && created < getDaysAgoIso(15)) return false;
        if (filters.datePreset === '30d' && created < getDaysAgoIso(30)) return false;
        if (filters.datePreset === 'quarter' && created < getDaysAgoIso(90)) return false;
        if (filters.datePreset === 'needs_action' && (!['Paid', 'Confirmed', 'New'].includes(status) || (awb && tracking))) return false;
        if (filters.datePreset === 'prepay_unverified' && (isCod || pStatus === 'VERIFIED' || pStatus === 'PAID')) return false;
        if (filters.datePreset === 'express' && !delivery.includes('express')) return false;
        if (filters.datePreset === 'cod' && !isCod) return false;
        if (filters.datePreset === 'repeat' && orderCount <= 1) return false;
        if (filters.datePreset === 'high_value' && total < 10000) return false;
      }

      // Explicit Filters
      if (filters.status && status !== filters.status) return false;
      if (filters.payment && !payment.includes(filters.payment.toUpperCase())) return false;
      if (filters.paymentStatus && !pStatus.toLowerCase().includes(filters.paymentStatus.toLowerCase())) return false;
      if (filters.delivery && !delivery.includes(filters.delivery.toLowerCase())) return false;
      if (filters.referral && !String(f['Referral'] ?? '').toLowerCase().includes(filters.referral.toLowerCase())) return false;
      if (filters.product && !String(f['Items'] ?? '').toLowerCase().includes(filters.product.toLowerCase())) return false;

      if (filters.minAmount && total < Number(filters.minAmount)) return false;
      if (filters.maxAmount && total > Number(filters.maxAmount)) return false;

      if (filters.city) {
        const addr = String(f['Address'] ?? '').toLowerCase();
        if (!addr.includes(filters.city.toLowerCase())) return false;
      }

      if (filters.customerType && filters.customerType !== 'all') {
        if (filters.customerType === 'repeat' && orderCount <= 1) return false;
        if (filters.customerType === 'first' && orderCount > 1) return false;
      }

      if (filters.customer) {
        const c = filters.customer.toLowerCase();
        const hay = [String(f['Name'] ?? ''), String(f['Phone'] ?? '')].join(' ').toLowerCase();
        if (!hay.includes(c)) return false;
      }

      if (filters.trackingId) {
        const t = filters.trackingId.toLowerCase();
        const hay = [awb, tracking, String(f['Innofulfill Order ID'] ?? '')].join(' ').toLowerCase();
        if (!hay.includes(t)) return false;
      }

      if (filters.dateFrom && created < filters.dateFrom) return false;
      if (filters.dateTo && created > filters.dateTo) return false;

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
          f['Address'],
        ].map((v) => String(v ?? '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, tab, filters, customerOrderCounts]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = String(a.fields[sortKey] ?? '');
      const bv = String(b.fields[sortKey] ?? '');
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
      { key: 'pend', label: 'Pending Action', value: count((r) => ['New', 'Created in Innofulfill', 'Confirmed'].includes(String(r.fields['Status']))), icon: Clock, tint: 'bg-amber-100 text-amber-600', change: -4, spark: spark(15) },
      { key: 'pack', label: 'Paid / Ready', value: count((r) => String(r.fields['Status']) === 'Paid'), icon: Package, tint: 'bg-violet-100 text-violet-600', change: 6, spark: spark(10) },
      { key: 'ship', label: 'Shipped', value: count((r) => String(r.fields['Status']) === 'Shipped'), icon: Truck, tint: 'bg-indigo-100 text-indigo-600', change: 15, spark: spark(12) },
      { key: 'del', label: 'Delivered', value: count((r) => String(r.fields['Status']) === 'Delivered'), icon: CheckCircle2, tint: 'bg-green-100 text-green-600', change: 22, spark: spark(18) },
      { key: 'cod', label: 'COD Orders', value: count(isCod), icon: Banknote, tint: 'bg-orange-100 text-orange-600', change: 5, spark: spark(14) },
      { key: 'pre', label: 'Prepaid Orders', value: count((r) => !isCod(r)), icon: CreditCard, tint: 'bg-sky-100 text-sky-600', change: 9, spark: spark(16) },
      { key: 'exp', label: 'Express Speed', value: count(isExpress), icon: Zap, tint: 'bg-amber-100 text-amber-600', change: 18, spark: spark(7) },
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

  const copySelectedPhones = () => {
    const phones = sorted
      .filter((r) => selected.has(r.id))
      .map((r) => String(r.fields['Phone'] ?? '').trim())
      .filter(Boolean)
      .join(', ');
    if (phones) {
      navigator.clipboard.writeText(phones);
      setCopiedPhones(true);
      setTimeout(() => setCopiedPhones(false), 2000);
    }
  };

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const selectedRecords = sorted.filter((record) => selected.has(record.id));
  const bulkLabelTargetRecords = selectedRecords.length > 0 ? selectedRecords : sorted;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      <Sidebar
        current={page}
        onNavigate={(p) => { setPage(p); setMobileNav(false); }}
        onLogout={() => { clearAdminToken(); setAuthed(false); }}
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
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders Management</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Filter, bulk generate shipping slips, print invoices and track shipments.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkLabels(true)}
                    disabled={bulkLabelTargetRecords.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40"
                    title="Print up to 5 customer FROM & TO address labels per A4 sheet"
                  >
                    <FileText className="h-4 w-4" />
                    Print 5-per-A4 Labels
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-mono">
                      {selectedRecords.length > 0 ? selectedRecords.length : sorted.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInvoiceModalRecords(selectedRecords.length > 0 ? selectedRecords : sorted.slice(0, 10))}
                    disabled={sorted.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-40"
                  >
                    <Printer className="h-4 w-4" />
                    Print Invoices
                  </button>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                {stats.map((s) => <StatCard key={s.key} card={s} />)}
              </div>

              {/* Preset filters and view tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
                  {(['all', 'prepay', 'cod'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setPageNum(1); }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t === 'all' ? 'All' : t === 'prepay' ? 'Prepaid' : 'COD'}
                      <span className={`ml-1.5 text-xs ${tab === t ? 'text-blue-600' : 'text-slate-400'}`}>
                        {t === 'all'
                          ? records.length
                          : t === 'prepay'
                          ? records.filter((r) => !String(r.fields['Payment'] ?? '').toUpperCase().includes('COD')).length
                          : records.filter((r) => String(r.fields['Payment'] ?? '').toUpperCase().includes('COD')).length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      showFilters || hasActiveFilters(filters)
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    {showFilters ? 'Hide Filters' : 'Filters & Presets'}
                    {hasActiveFilters(filters) && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">Active</span>
                    )}
                  </button>

                  <button
                    onClick={() => exportCsv(sorted)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Paste / Create Orders
                  </button>
                </div>
              </div>

              {/* Advanced Filter Drawer */}
              <FilterBar
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_FILTERS)}
                onExport={() => exportCsv(sorted)}
                visible={showFilters}
                onClose={() => setShowFilters(false)}
                availableProducts={availableProducts}
                totalFilteredCount={sorted.length}
              />

              {/* Active Filter Pills Bar */}
              {hasActiveFilters(filters) && (
                <div className="flex flex-wrap items-center gap-2 mb-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Active:</span>
                  {Object.entries(filters)
                    .filter(([, v]) => v && v !== 'search' && v !== 'all')
                    .map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold">
                        {k}: {v}
                        <button onClick={() => setFilters({ ...filters, [k]: '' })} className="hover:text-blue-900 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    Clear All
                  </button>
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

              {/* Bulk Actions Floating Bar */}
              {selected.size > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-3 bg-slate-950 text-white rounded-2xl px-5 py-3 text-sm shadow-xl animate-[fadeIn_0.15s_ease]">
                  <span className="font-bold text-amber-300">{selected.size} orders selected</span>
                  
                  <button
                    onClick={() => setShowBulkLabels(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> Print 5-per-A4 Labels
                  </button>

                  <button
                    onClick={() => setInvoiceModalRecords(selectedRecords)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Invoices
                  </button>

                  <button
                    onClick={() => exportCsv(selectedRecords)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium text-xs transition-colors"
                  >
                    Export Selected CSV
                  </button>

                  <button
                    onClick={copySelectedPhones}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium text-xs transition-colors"
                  >
                    {copiedPhones ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPhones ? 'Copied!' : 'Copy Mobile Numbers'}
                  </button>

                  <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-white text-xs font-semibold">
                    Deselect All
                  </button>
                </div>
              )}
            </>
          )}

          {page === 'analytics' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics & Intelligence</h1>
                <p className="text-sm text-slate-500 mt-0.5">Explore revenue trajectory, order volume, payment splits, and product performance.</p>
              </div>
              <AnalyticsView records={records} />
            </>
          )}

          {page === 'customers' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Profiles & History</h1>
                <p className="text-sm text-slate-500 mt-0.5">Inspect repeat buyer cohorts, customer lifetime spend, and shipping details.</p>
              </div>
              <CustomersView records={records} onRowClick={setViewRecord} />
            </>
          )}

          {page === 'settings' && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Settings</h1>
                <p className="text-sm text-slate-500 mt-0.5">Configure store preferences, logistics defaults, and notification webhooks.</p>
              </div>
              <SettingsView />
            </>
          )}
        </main>
      </div>

      <OrderDrawer
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        onPrintInvoice={(rec) => setInvoiceModalRecords([rec])}
        onPrintLabel={(rec) => { setSelected(new Set([rec.id])); setShowBulkLabels(true); }}
      />

      {showBulkLabels && (
        <BulkAddressLabelModal
          records={bulkLabelTargetRecords}
          onClose={() => setShowBulkLabels(false)}
        />
      )}

      {invoiceModalRecords && (
        <OrderInvoiceModal
          records={invoiceModalRecords}
          onClose={() => setInvoiceModalRecords(null)}
        />
      )}

      {showManualModal && (
        <ManualOrderModal
          onClose={() => setShowManualModal(false)}
          onOrdersCreated={() => {
            load();
          }}
        />
      )}

      <QuickActions
        onRefresh={load}
        onCreateOrder={() => setShowManualModal(true)}
        onPrintLabels={() => setShowBulkLabels(true)}
      />
    </div>
  );
}
