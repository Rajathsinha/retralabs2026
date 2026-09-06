import { useMemo, useState } from 'react';
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Repeat,
  Truck,
  Calendar,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { AirtableRecord, AnalyticsTimeframe } from './types';
import { Sparkline } from './Sparkline';

interface AnalyticsViewProps {
  records: AirtableRecord[];
}

interface TimeBucket {
  label: string;
  fullDate: string;
  revenue: number;
  orders: number;
}

const TIMEFRAMES: { id: AnalyticsTimeframe; label: string }[] = [
  { id: '7d', label: 'Last 7 Days (Weekly)' },
  { id: '15d', label: 'Last 15 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'quarter', label: 'This Quarter (90d)' },
  { id: 'ytd', label: 'Year to Date' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
];

export function AnalyticsView({ records }: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeChartMode, setActiveChartMode] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredBucket, setHoveredBucket] = useState<TimeBucket | null>(null);

  // Compute date boundary for current period and prior period (for delta comparison)
  const { currentPeriodRecords, priorPeriodRecords, timeframeDays, endIso } = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    let days = 30;
    let sIso = '';
    let eIso = todayIso;

    if (timeframe === '7d') {
      days = 7;
      const d = new Date();
      d.setDate(d.getDate() - 6);
      sIso = d.toISOString().slice(0, 10);
    } else if (timeframe === '15d') {
      days = 15;
      const d = new Date();
      d.setDate(d.getDate() - 14);
      sIso = d.toISOString().slice(0, 10);
    } else if (timeframe === '30d') {
      days = 30;
      const d = new Date();
      d.setDate(d.getDate() - 29);
      sIso = d.toISOString().slice(0, 10);
    } else if (timeframe === 'quarter') {
      days = 90;
      const d = new Date();
      d.setDate(d.getDate() - 89);
      sIso = d.toISOString().slice(0, 10);
    } else if (timeframe === 'ytd') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      days = Math.max(1, Math.round((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)));
      sIso = yearStart.toISOString().slice(0, 10);
    } else if (timeframe === 'custom') {
      sIso = customStart;
      eIso = customEnd;
      const diffMs = new Date(customEnd).getTime() - new Date(customStart).getTime();
      days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    } else {
      // 'all'
      days = 365;
      sIso = '2020-01-01';
    }

    // Prior period start and end for delta comparison
    const priorEnd = new Date(sIso);
    priorEnd.setDate(priorEnd.getDate() - 1);
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - days + 1);

    const priorStartIso = priorStart.toISOString().slice(0, 10);
    const priorEndIso = priorEnd.toISOString().slice(0, 10);

    const current = records.filter((r) => {
      const date = String(r.fields['Created'] ?? '');
      return date >= sIso && date <= eIso;
    });

    const prior = records.filter((r) => {
      const date = String(r.fields['Created'] ?? '');
      return date >= priorStartIso && date <= priorEndIso;
    });

    return {
      currentPeriodRecords: timeframe === 'all' ? records : current,
      priorPeriodRecords: prior,
      timeframeDays: days,
      startIso: sIso,
      endIso: eIso,
    };
  }, [records, timeframe, customStart, customEnd]);

  // Comprehensive Metrics
  const metrics = useMemo(() => {
    const totalRev = currentPeriodRecords.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    const priorRev = priorPeriodRecords.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    const revChange = priorRev > 0 ? Math.round(((totalRev - priorRev) / priorRev) * 100) : 10;

    const totalOrders = currentPeriodRecords.length;
    const priorOrders = priorPeriodRecords.length;
    const ordersChange = priorOrders > 0 ? Math.round(((totalOrders - priorOrders) / priorOrders) * 100) : 8;

    const avgOrder = totalOrders ? Math.round(totalRev / totalOrders) : 0;
    const priorAvg = priorOrders ? Math.round(priorRev / priorOrders) : 0;
    const avgChange = priorAvg > 0 ? Math.round(((avgOrder - priorAvg) / priorAvg) * 100) : 5;

    // Payment breakdown
    const isCod = (r: AirtableRecord) => String(r.fields['Payment'] ?? '').toUpperCase().includes('COD');
    const codOrders = currentPeriodRecords.filter(isCod);
    const codCount = codOrders.length;
    const codRev = codOrders.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);

    const prepaidOrders = currentPeriodRecords.filter((r) => !isCod(r));
    const prepaidCount = prepaidOrders.length;
    const prepaidRev = prepaidOrders.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    const prepaidRate = totalOrders ? Math.round((prepaidCount / totalOrders) * 100) : 0;

    // Delivery breakdown
    const expressCount = currentPeriodRecords.filter((r) =>
      String(r.fields['Delivery'] ?? '').toLowerCase().includes('express')
    ).length;
    const standardCount = totalOrders - expressCount;

    // Status breakdown
    const statuses = ['New', 'Paid', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    const statusMap = statuses.map((st) => {
      const recs = currentPeriodRecords.filter((r) => String(r.fields['Status'] ?? '') === st);
      return {
        status: st,
        count: recs.length,
        revenue: recs.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0),
        pct: totalOrders ? Math.round((recs.length / totalOrders) * 100) : 0,
      };
    });

    const deliveredCount = currentPeriodRecords.filter((r) => String(r.fields['Status'] ?? '') === 'Delivered').length;
    const fulfillmentRate = totalOrders ? Math.round((deliveredCount / totalOrders) * 100) : 0;

    // Top Products with revenue and volume
    const productMap: Record<string, { count: number; revenue: number }> = {};
    currentPeriodRecords.forEach((r) => {
      const items = String(r.fields['Items'] ?? '');
      const total = Number(r.fields['Total (₹)'] || 0);
      const split = items.split(/[,;]/).map((i) => i.trim()).filter(Boolean);
      const perItemShare = split.length > 0 ? total / split.length : total;

      split.forEach((prod) => {
        if (!productMap[prod]) productMap[prod] = { count: 0, revenue: 0 };
        productMap[prod].count += 1;
        productMap[prod].revenue += perItemShare;
      });
    });

    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: Math.round(data.revenue),
        pctOfRev: totalRev > 0 ? Math.round((data.revenue / totalRev) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Customer Loyalty & Cohorts
    const customerOrderCounts: Record<string, number> = {};
    records.forEach((r) => {
      const phone = String(r.fields['Phone'] ?? '').trim();
      const name = String(r.fields['Name'] ?? '').trim();
      const id = phone || name;
      if (id) customerOrderCounts[id] = (customerOrderCounts[id] || 0) + 1;
    });

    const uniqueCustomers = Object.keys(customerOrderCounts).length;
    const repeatCustomers = Object.values(customerOrderCounts).filter((cnt) => cnt > 1).length;
    const repeatRate = uniqueCustomers ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;

    // Day of week sales
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeekData = dayNames.map((name) => ({ day: name, orders: 0, revenue: 0 }));
    currentPeriodRecords.forEach((r) => {
      const created = String(r.fields['Created'] ?? '');
      if (created) {
        const d = new Date(created);
        const dayIdx = d.getDay();
        if (!isNaN(dayIdx)) {
          dayOfWeekData[dayIdx].orders += 1;
          dayOfWeekData[dayIdx].revenue += Number(r.fields['Total (₹)'] || 0);
        }
      }
    });

    // Timeline buckets for the selected timeframe
    const buckets: TimeBucket[] = [];
    if (timeframeDays <= 31) {
      // Daily buckets
      for (let i = timeframeDays - 1; i >= 0; i--) {
        const d = new Date(endIso);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayOrders = currentPeriodRecords.filter((r) => String(r.fields['Created'] ?? '') === iso);
        buckets.push({
          label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          fullDate: iso,
          revenue: dayOrders.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0),
          orders: dayOrders.length,
        });
      }
    } else {
      // 12-14 aggregated buckets
      const bucketCount = Math.min(14, timeframeDays);
      const chunkSize = Math.ceil(timeframeDays / bucketCount);
      for (let i = bucketCount - 1; i >= 0; i--) {
        const dEnd = new Date(endIso);
        dEnd.setDate(dEnd.getDate() - i * chunkSize);
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - chunkSize + 1);

        const sStr = dStart.toISOString().slice(0, 10);
        const eStr = dEnd.toISOString().slice(0, 10);

        const chunkOrders = currentPeriodRecords.filter((r) => {
          const c = String(r.fields['Created'] ?? '');
          return c >= sStr && c <= eStr;
        });

        buckets.push({
          label: `${dStart.getDate()}/${dStart.getMonth() + 1} - ${dEnd.getDate()}/${dEnd.getMonth() + 1}`,
          fullDate: `${sStr} to ${eStr}`,
          revenue: chunkOrders.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0),
          orders: chunkOrders.length,
        });
      }
    }

    return {
      totalRev,
      priorRev,
      revChange,
      totalOrders,
      ordersChange,
      avgOrder,
      avgChange,
      codCount,
      codRev,
      prepaidCount,
      prepaidRev,
      prepaidRate,
      expressCount,
      standardCount,
      statusMap,
      deliveredCount,
      fulfillmentRate,
      topProducts,
      repeatRate,
      repeatCustomers,
      uniqueCustomers,
      dayOfWeekData,
      buckets,
    };
  }, [currentPeriodRecords, priorPeriodRecords, timeframeDays, endIso, records]);

  // Max values for chart scaling
  const maxRevenue = Math.max(...metrics.buckets.map((b) => b.revenue), 1000);
  const maxOrders = Math.max(...metrics.buckets.map((b) => b.orders), 5);
  const maxProductRevenue = Math.max(...metrics.topProducts.map((p) => p.revenue), 1);
  const maxDayOrders = Math.max(...metrics.dayOfWeekData.map((d) => d.orders), 1);

  // Sparkline arrays from buckets
  const revSpark = metrics.buckets.map((b) => b.revenue);
  const ordersSpark = metrics.buckets.map((b) => b.orders);

  return (
    <div className="space-y-6">
      {/* Timeframe Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Analytics Horizon:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {TIMEFRAMES.map((t) => {
            const active = timeframe === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {timeframe === 'custom' && (
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs outline-none"
            />
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs outline-none"
            />
          </div>
        )}
      </div>

      {/* KPI Cards Grid with Delta comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                metrics.revChange >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {metrics.revChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(metrics.revChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
            ₹{metrics.totalRev.toLocaleString('en-IN')}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-xs font-medium text-slate-500">Total Store Revenue</p>
            <Sparkline data={revSpark} color="#10B981" width={90} height={26} />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                metrics.ordersChange >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {metrics.ordersChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(metrics.ordersChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
            {metrics.totalOrders}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-xs font-medium text-slate-500">Total Placed Orders</p>
            <Sparkline data={ordersSpark} color="#3B82F6" width={90} height={26} />
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                metrics.avgChange >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {metrics.avgChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(metrics.avgChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
            ₹{metrics.avgOrder.toLocaleString('en-IN')}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-xs font-medium text-slate-500">Average Order Value (AOV)</p>
            <span className="text-[11px] font-semibold text-violet-600">₹{(metrics.totalRev / (metrics.totalOrders || 1)).toFixed(0)}</span>
          </div>
        </div>

        {/* Repeat Customer Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Repeat className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {metrics.repeatCustomers} repeat buyers
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
            {metrics.repeatRate}%
          </p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-xs font-medium text-slate-500">Customer Retention Rate</p>
            <span className="text-[11px] font-semibold text-slate-400">{metrics.uniqueCustomers} total customers</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Timeline Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {activeChartMode === 'revenue' ? 'Revenue Trajectory' : 'Order Volume'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Performance breakdown over the selected timeframe ({metrics.buckets.length} time points)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hoveredBucket && (
              <div className="text-right px-3 py-1 bg-blue-50 border border-blue-100 rounded-xl text-xs font-medium">
                <span className="text-slate-500 mr-1.5">{hoveredBucket.fullDate}:</span>
                <span className="font-bold text-blue-700">
                  ₹{hoveredBucket.revenue.toLocaleString('en-IN')}
                </span>
                <span className="text-slate-400 mx-1">·</span>
                <span className="font-bold text-slate-800">{hoveredBucket.orders} orders</span>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveChartMode('revenue')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeChartMode === 'revenue'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Revenue (₹)
              </button>
              <button
                onClick={() => setActiveChartMode('orders')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeChartMode === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Order Volume
              </button>
            </div>
          </div>
        </div>

        {/* Visual Dynamic Bar/Area Graph */}
        <div className="h-56 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2">
          {metrics.buckets.map((b, idx) => {
            const val = activeChartMode === 'revenue' ? b.revenue : b.orders;
            const maxVal = activeChartMode === 'revenue' ? maxRevenue : maxOrders;
            const heightPct = Math.max(4, Math.round((val / maxVal) * 100));
            const isHovered = hoveredBucket?.fullDate === b.fullDate;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredBucket(b)}
                onMouseLeave={() => setHoveredBucket(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer transition-all"
              >
                {/* Value on top of bar */}
                <span
                  className={`text-[9.5pt] font-mono font-bold text-slate-600 mb-1 transition-opacity ${
                    isHovered || idx % 2 === 0 ? 'opacity-100' : 'opacity-0 sm:opacity-70'
                  }`}
                >
                  {val > 0
                    ? activeChartMode === 'revenue'
                      ? `₹${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`
                      : val
                    : ''}
                </span>

                {/* Bar */}
                <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-full">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      activeChartMode === 'revenue'
                        ? isHovered
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : isHovered
                        ? 'bg-blue-600'
                        : 'bg-gradient-to-t from-blue-600 to-blue-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* Label */}
                <span className="text-[10px] text-slate-500 font-medium mt-2 whitespace-nowrap truncate max-w-full">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Payment Method Analysis & Top Products Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Method Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-blue-600" /> Payment Mode Split
              </h2>
              <p className="text-xs text-slate-400">Prepaid conversion vs Cash on Delivery</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              {metrics.prepaidRate}% Prepaid
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Prepaid Row */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-2 text-blue-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Prepaid (UPI / Cards / QR)
                </span>
                <span className="text-blue-900 font-bold tabular-nums">
                  ₹{metrics.prepaidRev.toLocaleString('en-IN')} ({metrics.prepaidCount} orders)
                </span>
              </div>
              <div className="h-2 rounded-full bg-blue-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${metrics.prepaidRate}%` }}
                />
              </div>
            </div>

            {/* COD Row */}
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-2 text-rose-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Cash on Delivery (COD)
                </span>
                <span className="text-rose-900 font-bold tabular-nums">
                  ₹{metrics.codRev.toLocaleString('en-IN')} ({metrics.codCount} orders)
                </span>
              </div>
              <div className="h-2 rounded-full bg-rose-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${100 - metrics.prepaidRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Avg Prepaid Basket: ₹{metrics.prepaidCount ? Math.round(metrics.prepaidRev / metrics.prepaidCount) : 0}</span>
            <span>Avg COD Basket: ₹{metrics.codCount ? Math.round(metrics.codRev / metrics.codCount) : 0}</span>
          </div>
        </div>

        {/* Top Products Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-violet-600" /> Top Performing Products
              </h2>
              <p className="text-xs text-slate-400">By revenue generated and unit volume</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Ranked by revenue</span>
          </div>

          {metrics.topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No product sales in this timeframe.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topProducts.map((p, idx) => (
                <div key={p.name} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800 truncate max-w-[60%] flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                      {p.name}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      ₹{p.revenue.toLocaleString('en-IN')}{' '}
                      <span className="text-slate-400 font-normal">({p.count} orders)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-500"
                      style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Order Status Breakdown & Day of Week Purchasing Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Order Status Lifecycle</h2>
          <p className="text-xs text-slate-400 mb-4">Current stage of orders placed within this horizon</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.statusMap.map((st) => (
              <div key={st.status} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {st.status}
                </span>
                <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                  {st.count}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>{st.pct}%</span>
                  <span>₹{(st.revenue / 1000).toFixed(0)}k</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Express Delivery Share:
            </span>
            <span className="font-bold text-slate-800">
              {metrics.totalOrders ? Math.round((metrics.expressCount / metrics.totalOrders) * 100) : 0}% ({metrics.expressCount} orders)
            </span>
          </div>
        </div>

        {/* Day of Week Pattern */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Day-of-Week Sales Pattern</h2>
              <p className="text-xs text-slate-400">Order concentration from Monday through Sunday</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Peak purchasing days</span>
          </div>

          <div className="h-44 flex items-end gap-3 pt-6 pb-2">
            {metrics.dayOfWeekData.map((d, i) => {
              const heightPct = Math.max(8, Math.round((d.orders / maxDayOrders) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-700 mb-1 tabular-nums">
                    {d.orders}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-slate-800 to-slate-600 transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-400"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-2">{d.day}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Identifies best days for ad spend & dispatches</span>
            <span className="font-semibold text-slate-700">Total: {metrics.totalOrders} orders</span>
          </div>
        </div>
      </div>
    </div>
  );
}
