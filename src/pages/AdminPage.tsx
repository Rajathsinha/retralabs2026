import { useSEO } from '../hooks/useSEO';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  Banknote,
  CreditCard,
  Zap,
  X,
  FileText,
  Printer,
  Copy,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  SlidersHorizontal,
  Share2,
  Bot,
} from 'lucide-react';
import { Sidebar } from '../components/admin/Sidebar';
import type { AdminPage as AdminPageId } from '../components/admin/Sidebar';
import { Topbar } from '../components/admin/Topbar';
import { StatCard } from '../components/admin/StatCard';
import { FilterBar, hasActiveFilters } from '../components/admin/FilterBar';
import { OrdersTable } from '../components/admin/OrdersTable';
import { OrderDrawer } from '../components/admin/OrderDrawer';
import { QuickActions } from '../components/admin/QuickActions';
import { BulkAddressLabelModal } from '../components/admin/BulkAddressLabelModal';
import { OrderInvoiceModal } from '../components/admin/OrderInvoiceModal';
import { ManualOrderModal } from '../components/admin/ManualOrderModal';
import { SmartOrderCleanerModal } from '../components/admin/SmartOrderCleanerModal';
import { SmartOrderFormatterModal } from '../components/admin/SmartOrderFormatterModal';
import { AdminAiCopilotModal } from '../components/admin/AdminAiCopilotModal';
import { SkeletonTable } from '../components/admin/SkeletonTable';
import { DashboardView } from '../components/admin/DashboardView';
import { AnalyticsView } from '../components/admin/AnalyticsView';
import { CustomersView } from '../components/admin/CustomersView';
import { SettingsView } from '../components/admin/SettingsView';
import type { AirtableRecord, AdminFilters, StatCardData } from '../components/admin/types';
import { adminFetch, adminLogin, getAdminToken, clearAdminToken, deleteAdminOrders } from '../utils/adminAuth';
import { detectJunkOrders } from '../utils/junkOrderDetector';
import { formatOrderRecord } from '../utils/orderDataFormatter';
import { getDevMockOrders } from '../utils/devMockOrders';
import {
  AdminSortOption,
  SORT_OPTIONS,
  sortOrders,
  getOrderTimestamp,
  formatExactOrderTime,
  extractCityAndState,
  cleanPhone10,
} from '../utils/orderViewHelpers';
import Logo from '../components/Logo';

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
  try {
    const res = await adminFetch('/api/list-orders');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.records) && json.records.length > 0) {
        return json.records;
      }
    }
  } catch (err) {
    console.warn('API fetch failed, checking dev environment fallback:', err);
  }

  if (import.meta.env.DEV) {
    return getDevMockOrders();
  }

  throw new Error('Airtable fetch failed (HTTP 500)');
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

// ── 100% Real 10-day history bucketing from records ────────────────────────
function get10DayDailyCounts(records: AirtableRecord[], predicate?: (r: AirtableRecord) => boolean): number[] {
  const daysMap = new Map<string, number>();
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daysMap.set(d.toISOString().slice(0, 10), 0);
  }
  records.forEach((r) => {
    const c = String(r.fields['Created'] ?? '');
    if (daysMap.has(c) && (!predicate || predicate(r))) {
      daysMap.set(c, (daysMap.get(c) || 0) + 1);
    }
  });
  return Array.from(daysMap.values());
}

function get10DayDailyRevenue(records: AirtableRecord[]): number[] {
  const daysMap = new Map<string, number>();
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daysMap.set(d.toISOString().slice(0, 10), 0);
  }
  records.forEach((r) => {
    const c = String(r.fields['Created'] ?? '');
    const total = Number(r.fields['Total (₹)'] || 0);
    if (daysMap.has(c)) {
      daysMap.set(c, (daysMap.get(c) || 0) + total);
    }
  });
  return Array.from(daysMap.values());
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
        <div className="flex flex-col items-center mb-7">
          <Logo size="lg" variant="light" />
          <p className="text-slate-500 text-xs mt-2.5">Admin Dashboard</p>
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
  const [sortOption, setSortOption] = useState<AdminSortOption>('time_desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewRecord, setViewRecord] = useState<AirtableRecord | null>(null);
  const [showBulkLabels, setShowBulkLabels] = useState(false);
  const [invoiceModalRecords, setInvoiceModalRecords] = useState<AirtableRecord[] | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSmartCleaner, setShowSmartCleaner] = useState(false);
  const [showSmartFormatter, setShowSmartFormatter] = useState(false);
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [copiedFormLink, setCopiedFormLink] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [mobileNav, setMobileNav] = useState(false);
  const [copiedPhones, setCopiedPhones] = useState(false);
  const [pageSize, setPageSize] = useState(15);

  // Global hotkey: Cmd+K or Ctrl+K to toggle AI Copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAiCopilot((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const flaggedJunkOrders = useMemo(() => detectJunkOrders(records), [records]);
  const needsFormattingCount = useMemo(() => {
    return records.filter((r) => formatOrderRecord(r).hasChanges).length;
  }, [records]);

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
    const now = Date.now();
    const getDaysAgoTime = (days: number) => now - days * 86400000;

    return records.filter((r) => {
      const f = r.fields;
      const payment = String(f['Payment'] ?? '').toUpperCase();
      const isCod = payment.includes('COD');
      const total = Number(f['Total (₹)'] || 0);
      const phone = cleanPhone10(f['Phone']);
      const name = String(f['Name'] ?? '').trim();
      const custKey = phone || name;
      const orderCount = customerOrderCounts.get(custKey) || 1;
      const status = String(f['Status'] ?? '');
      const awb = String(f['AWB Number'] ?? '');
      const tracking = String(f['Tracking ID'] ?? '');
      const innoId = String(f['Innofulfill Order ID'] ?? '');
      const delivery = String(f['Delivery'] ?? '').toLowerCase();
      const pStatus = String(f['Payment Status'] ?? '').toUpperCase();
      const timeInfo = formatExactOrderTime(r);
      const orderTs = getOrderTimestamp(r);
      const loc = extractCityAndState(r);

      // Tab filter
      if (tab === 'cod' && !isCod) return false;
      if (tab === 'prepay' && isCod) return false;

      // Date Presets
      if (filters.datePreset) {
        if (filters.datePreset === 'today' && !timeInfo.isToday) return false;
        if (filters.datePreset === 'yesterday' && !timeInfo.isYesterday) return false;
        if (filters.datePreset === '7d' && orderTs < getDaysAgoTime(7)) return false;
        if (filters.datePreset === '15d' && orderTs < getDaysAgoTime(15)) return false;
        if (filters.datePreset === '30d' && orderTs < getDaysAgoTime(30)) return false;
        if (filters.datePreset === 'quarter' && orderTs < getDaysAgoTime(90)) return false;
        if (filters.datePreset === 'needs_action' && (awb || tracking || innoId)) return false;
        if (
          filters.datePreset === 'prepay_unverified' &&
          (isCod || pStatus === 'CONFIRMED' || pStatus === 'PAID' || pStatus === 'PAYMENT_CONFIRMED')
        )
          return false;
        if (filters.datePreset === 'express' && !delivery.includes('express')) return false;
        if (filters.datePreset === 'cod' && !isCod) return false;
        if (filters.datePreset === 'repeat' && orderCount <= 1) return false;
        if (filters.datePreset === 'high_value' && total < 10000) return false;
      }

      // Explicit Filters
      if (filters.status && status !== filters.status) return false;
      if (filters.payment && !payment.includes(filters.payment.toUpperCase())) return false;
      if (filters.paymentStatus && !pStatus.includes(filters.paymentStatus.toUpperCase())) return false;
      if (filters.delivery && !delivery.includes(filters.delivery.toLowerCase())) return false;
      if (filters.referral && !String(f['Referral'] ?? '').toLowerCase().includes(filters.referral.toLowerCase())) return false;
      if (filters.product && !String(f['Items'] ?? '').toLowerCase().includes(filters.product.toLowerCase())) return false;

      if (filters.minAmount && total < Number(filters.minAmount)) return false;
      if (filters.maxAmount && total > Number(filters.maxAmount)) return false;

      if (filters.city) {
        const queryCity = filters.city.toLowerCase();
        const hay = [loc.city, loc.state, String(f['Address'] ?? '')].join(' ').toLowerCase();
        if (!hay.includes(queryCity)) return false;
      }

      if (filters.customerType && filters.customerType !== 'all') {
        if (filters.customerType === 'repeat' && orderCount <= 1) return false;
        if (filters.customerType === 'first' && orderCount > 1) return false;
      }

      if (filters.customer) {
        const c = filters.customer.toLowerCase();
        const hay = [name, phone].join(' ').toLowerCase();
        if (!hay.includes(c)) return false;
      }

      if (filters.trackingId) {
        const t = filters.trackingId.toLowerCase();
        const hay = [awb, tracking, innoId].join(' ').toLowerCase();
        if (!hay.includes(t)) return false;
      }

      if (filters.dateFrom) {
        const fromTs = new Date(filters.dateFrom).getTime();
        if (orderTs < fromTs) return false;
      }
      if (filters.dateTo) {
        const toTs = new Date(filters.dateTo + 'T23:59:59').getTime();
        if (orderTs > toTs) return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        const hay = [
          f['orderID'],
          name,
          phone,
          f['Email'],
          f['Items'],
          loc.city,
          loc.state,
          f['Status'],
          f['Shipment Status'],
          f['Courier'],
          f['Carrier Display Name'],
          innoId,
          awb,
          tracking,
          f['Transaction'],
          f['Address'],
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, tab, filters, customerOrderCounts]);

  const sorted = useMemo(() => {
    return sortOrders(filtered, sortOption);
  }, [filtered, sortOption]);

  const stats: StatCardData[] = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const days7Ago = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const days14Ago = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

    const todays = filtered.filter((r) => String(r.fields['Created'] ?? '') === today);
    const yesterdays = filtered.filter((r) => String(r.fields['Created'] ?? '') === yesterday);

    const count = (pred: (r: AirtableRecord) => boolean) => filtered.filter(pred).length;
    const isCod = (r: AirtableRecord) => String(r.fields['Payment'] ?? '').toUpperCase().includes('COD');
    const isExpress = (r: AirtableRecord) => String(r.fields['Delivery'] ?? '').toLowerCase().includes('express');
    const revenue = filtered.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);

    // Day-over-day real deltas for today's orders & revenue
    const todayOrderDelta = yesterdays.length > 0
      ? Math.round(((todays.length - yesterdays.length) / yesterdays.length) * 100)
      : (todays.length > 0 ? 100 : 0);

    const todayRev = todays.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    const yestRev = yesterdays.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    const todayRevDelta = yestRev > 0
      ? Math.round(((todayRev - yestRev) / yestRev) * 100)
      : (todayRev > 0 ? 100 : 0);

    // 7d vs prior 7d real delta helper
    const get7dDelta = (predicate: (r: AirtableRecord) => boolean) => {
      const recent7 = filtered.filter((r) => {
        const c = String(r.fields['Created'] ?? '');
        return c >= days7Ago && predicate(r);
      }).length;
      const prior7 = filtered.filter((r) => {
        const c = String(r.fields['Created'] ?? '');
        return c >= days14Ago && c < days7Ago && predicate(r);
      }).length;
      if (prior7 > 0) return Math.round(((recent7 - prior7) / prior7) * 100);
      return recent7 > 0 ? 100 : 0;
    };

    return [
      {
        key: 'today',
        label: "Today's Orders",
        value: todays.length,
        icon: ShoppingBag,
        tint: 'bg-blue-100 text-blue-600',
        change: todayOrderDelta,
        spark: get10DayDailyCounts(filtered),
      },
      {
        key: 'rev',
        label: 'Total Revenue',
        value: revenue,
        icon: IndianRupee,
        tint: 'bg-emerald-100 text-emerald-600',
        change: todayRevDelta,
        spark: get10DayDailyRevenue(filtered),
      },
      {
        key: 'pend',
        label: 'Pending Action',
        value: count((r) => ['New', 'Created in Innofulfill', 'Confirmed'].includes(String(r.fields['Status']))),
        icon: Clock,
        tint: 'bg-amber-100 text-amber-600',
        change: get7dDelta((r) => ['New', 'Created in Innofulfill', 'Confirmed'].includes(String(r.fields['Status']))),
        spark: get10DayDailyCounts(filtered, (r) => ['New', 'Created in Innofulfill', 'Confirmed'].includes(String(r.fields['Status']))),
      },
      {
        key: 'pack',
        label: 'Paid / Ready',
        value: count((r) => String(r.fields['Status']) === 'Paid'),
        icon: Package,
        tint: 'bg-violet-100 text-violet-600',
        change: get7dDelta((r) => String(r.fields['Status']) === 'Paid'),
        spark: get10DayDailyCounts(filtered, (r) => String(r.fields['Status']) === 'Paid'),
      },
      {
        key: 'ship',
        label: 'Shipped',
        value: count((r) => String(r.fields['Status']) === 'Shipped'),
        icon: Truck,
        tint: 'bg-indigo-100 text-indigo-600',
        change: get7dDelta((r) => String(r.fields['Status']) === 'Shipped'),
        spark: get10DayDailyCounts(filtered, (r) => String(r.fields['Status']) === 'Shipped'),
      },
      {
        key: 'del',
        label: 'Delivered',
        value: count((r) => String(r.fields['Status']) === 'Delivered'),
        icon: CheckCircle2,
        tint: 'bg-green-100 text-green-600',
        change: get7dDelta((r) => String(r.fields['Status']) === 'Delivered'),
        spark: get10DayDailyCounts(filtered, (r) => String(r.fields['Status']) === 'Delivered'),
      },
      {
        key: 'cod',
        label: 'COD Orders',
        value: count(isCod),
        icon: Banknote,
        tint: 'bg-orange-100 text-orange-600',
        change: get7dDelta(isCod),
        spark: get10DayDailyCounts(filtered, isCod),
      },
      {
        key: 'pre',
        label: 'Prepaid Orders',
        value: count((r) => !isCod(r)),
        icon: CreditCard,
        tint: 'bg-sky-100 text-sky-600',
        change: get7dDelta((r) => !isCod(r)),
        spark: get10DayDailyCounts(filtered, (r) => !isCod(r)),
      },
      {
        key: 'exp',
        label: 'Express Speed',
        value: count(isExpress),
        icon: Zap,
        tint: 'bg-amber-100 text-amber-600',
        change: get7dDelta(isExpress),
        spark: get10DayDailyCounts(filtered, isExpress),
      },
    ];
  }, [filtered]);

  const onSort = (key: string) => {
    if (key === 'Total (₹)') {
      setSortOption((prev) => (prev === 'price_desc' ? 'price_asc' : 'price_desc'));
    } else if (key === 'Name') {
      setSortOption((prev) => (prev === 'name_asc' ? 'name_desc' : 'name_asc'));
    } else if (key === 'orderID') {
      setSortOption((prev) => (prev === 'order_id_desc' ? 'time_desc' : 'order_id_desc'));
    } else {
      setSortOption((prev) => (prev === 'time_desc' ? 'time_asc' : 'time_desc'));
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
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

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${ids.length} selected orders from Airtable? This action cannot be undone.`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      await deleteAdminOrders(ids);
      setSelected(new Set());
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkDeleting(false);
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
        onOpenAiCopilot={() => setShowAiCopilot(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col lg:pl-64">
        <Topbar
          search={filters.search}
          onSearch={(v) => setFilters({ ...filters, search: v })}
          onRefresh={load}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onOpenMobileNav={() => setMobileNav(true)}
          onOpenAiCopilot={() => setShowAiCopilot(true)}
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

                  <button
                    type="button"
                    onClick={() => setShowSmartFormatter(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-blue-500/20 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    title="Standardize customer names to Title Case, phone numbers strictly to 10 digits (+91/0 removed), and clean addresses"
                  >
                    <Wand2 className="h-4 w-4 text-cyan-200" />
                    Smart AI Formatter
                    {needsFormattingCount > 0 && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-indigo-700">
                        {needsFormattingCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSmartCleaner(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-rose-500/20 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    title="Scan & delete duplicate submissions, fake numbers, and junk addresses"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Smart AI Cleaner
                    {flaggedJunkOrders.length > 0 && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-rose-600">
                        {flaggedJunkOrders.length} Flagged
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Paste / Create Orders
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/order`;
                      navigator.clipboard.writeText(url);
                      setCopiedFormLink(true);
                      setTimeout(() => setCopiedFormLink(false), 2500);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-4 py-2.5 text-sm font-semibold transition-all"
                    title="Copy shareable customer order form link (/order)"
                  >
                    {copiedFormLink ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        Copied Form Link!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 text-slate-600" />
                        Copy Customer Form Link
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAiCopilot(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-blue-500/20 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    title="Ask RetraLabs AI Copilot questions about orders, revenue, UPI verification, AWBs, and anomalies"
                  >
                    <Bot className="h-4 w-4 text-cyan-200" />
                    AI Copilot
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-mono">⌘K</span>
                  </button>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                {stats.map((s) => <StatCard key={s.key} card={s} />)}
              </div>

              {/* Quick Filter Pills Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                {[
                  { id: '', label: 'All Orders', count: records.length },
                  {
                    id: 'today',
                    label: "Today's Orders",
                    count: records.filter((r) => formatExactOrderTime(r).isToday).length,
                    badgeColor: 'bg-blue-100 text-blue-800',
                  },
                  {
                    id: 'yesterday',
                    label: 'Yesterday',
                    count: records.filter((r) => formatExactOrderTime(r).isYesterday).length,
                  },
                  {
                    id: 'needs_action',
                    label: 'Needs Push / Shipping',
                    count: records.filter(
                      (r) => !r.fields['AWB Number'] && !r.fields['Tracking ID'] && !r.fields['Innofulfill Order ID'],
                    ).length,
                    badgeColor: 'bg-amber-100 text-amber-800',
                  },
                  {
                    id: 'prepay',
                    label: 'UPI / Prepaid',
                    count: records.filter((r) => !String(r.fields['Payment'] || '').toUpperCase().includes('COD')).length,
                    badgeColor: 'bg-emerald-100 text-emerald-800',
                  },
                  {
                    id: 'cod',
                    label: 'Cash on Delivery (COD)',
                    count: records.filter((r) => String(r.fields['Payment'] || '').toUpperCase().includes('COD')).length,
                    badgeColor: 'bg-amber-100 text-amber-800',
                  },
                  {
                    id: 'prepay_unverified',
                    label: 'Unverified Proof',
                    count: records.filter((r) => {
                      const isCod = String(r.fields['Payment'] || '').toUpperCase().includes('COD');
                      const pStatus = String(r.fields['Payment Status'] || '').toUpperCase();
                      return !isCod && pStatus !== 'CONFIRMED' && pStatus !== 'PAID' && pStatus !== 'PAYMENT_CONFIRMED';
                    }).length,
                    badgeColor: 'bg-rose-100 text-rose-800',
                  },
                  {
                    id: 'high_value',
                    label: 'High Value (₹10k+)',
                    count: records.filter((r) => Number(r.fields['Total (₹)'] || 0) >= 10000).length,
                  },
                ].map((pill) => {
                  const active =
                    pill.id === ''
                      ? !filters.datePreset && tab === 'all'
                      : pill.id === 'cod'
                      ? tab === 'cod'
                      : pill.id === 'prepay'
                      ? tab === 'prepay'
                      : filters.datePreset === pill.id;

                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => {
                        if (pill.id === 'cod') {
                          setTab('cod');
                          setFilters((f) => ({ ...f, datePreset: '' }));
                        } else if (pill.id === 'prepay') {
                          setTab('prepay');
                          setFilters((f) => ({ ...f, datePreset: '' }));
                        } else {
                          setTab('all');
                          setFilters((f) => ({ ...f, datePreset: pill.id }));
                        }
                        setPageNum(1);
                      }}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-slate-950 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          active
                            ? 'bg-white/20 text-white'
                            : pill.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search, Sort & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => {
                      setFilters({ ...filters, search: e.target.value });
                      setPageNum(1);
                    }}
                    placeholder="Search customer, 10-digit mobile, city, order ID…"
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                  {filters.search && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, search: '' })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Dedicated Sort Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Sort:</span>
                    <select
                      value={sortOption}
                      onChange={(e) => {
                        setSortOption(e.target.value as AdminSortOption);
                        setPageNum(1);
                      }}
                      className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer py-1"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      showFilters || hasActiveFilters(filters)
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters</span>
                    {hasActiveFilters(filters) && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                        Active
                      </span>
                    )}
                  </button>

                  {/* Export CSV */}
                  <button
                    type="button"
                    onClick={() => exportCsv(sorted)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Export CSV
                  </button>

                  {/* Paste / Create Orders */}
                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Create Order</span>
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
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Active Filters:</span>
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
                  sortKey={sortOption}
                  sortDir={sortOption.endsWith('_asc') ? 'asc' : 'desc'}
                  onSort={onSort}
                  sortOption={sortOption}
                  onSortOptionChange={setSortOption}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onRowClick={setViewRecord}
                  page={pageNum}
                  pageSize={pageSize}
                  onPageChange={setPageNum}
                  onPageSizeChange={setPageSize}
                  customerOrderCounts={customerOrderCounts}
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

                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {bulkDeleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
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

      {viewRecord && (
        <OrderDrawer
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onPrintInvoice={(rec) => setInvoiceModalRecords([rec])}
          onPrintLabel={(rec) => { setSelected(new Set([rec.id])); setShowBulkLabels(true); }}
          onDeleteOrder={async (rec) => {
            await deleteAdminOrders([rec.id]);
            setSelected((prev) => {
              const next = new Set(prev);
              next.delete(rec.id);
              return next;
            });
            await load();
          }}
          onOrderUpdated={load}
        />
      )}

      {showSmartFormatter && (
        <SmartOrderFormatterModal
          records={records}
          onClose={() => setShowSmartFormatter(false)}
          onFormatted={async () => {
            setShowSmartFormatter(false);
            await load();
          }}
        />
      )}

      {showSmartCleaner && (
        <SmartOrderCleanerModal
          records={records}
          onClose={() => setShowSmartCleaner(false)}
          onDeleted={async () => {
            setShowSmartCleaner(false);
            setSelected(new Set());
            await load();
          }}
        />
      )}

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

      <AdminAiCopilotModal
        isOpen={showAiCopilot}
        onClose={() => setShowAiCopilot(false)}
        records={records}
        onSelectOrder={(rec) => setViewRecord(rec)}
      />

      <QuickActions
        onRefresh={load}
        onCreateOrder={() => setShowManualModal(true)}
        onPrintLabels={() => setShowBulkLabels(true)}
        onSmartFormat={() => setShowSmartFormatter(true)}
        onSmartClean={() => setShowSmartCleaner(true)}
        onOpenAiCopilot={() => setShowAiCopilot(true)}
      />
    </div>
  );
}
