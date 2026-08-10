import { ShoppingBag, IndianRupee, Clock, Package, Truck, CheckCircle2, TrendingUp, ArrowRight } from 'lucide-react';
import type { AirtableRecord, StatCardData } from './types';
import { StatCard } from './StatCard';
import { Sparkline } from './Sparkline';

interface DashboardViewProps {
  stats: StatCardData[];
  records: AirtableRecord[];
  onRowClick: (r: AirtableRecord) => void;
  onGoToOrders: () => void;
}

export function DashboardView({ stats, records, onRowClick, onGoToOrders }: DashboardViewProps) {
  const recent = [...records]
    .sort((a, b) => String(b.fields['Created'] ?? '').localeCompare(String(a.fields['Created'] ?? '')))
    .slice(0, 6);

  const statusBreakdown = [
    { label: 'New', color: '#3B82F6' },
    { label: 'Paid', color: '#8B5CF6' },
    { label: 'Shipped', color: '#6366F1' },
    { label: 'Delivered', color: '#10B981' },
    { label: 'Cancelled', color: '#EF4444' },
  ].map((s) => ({
    ...s,
    count: records.filter((r) => String(r.fields['Status'] ?? '') === s.label).length,
  }));
  const totalStatus = statusBreakdown.reduce((s, x) => s + x.count, 0) || 1;

  const today = new Date().toISOString().slice(0, 10);
  const todaysRevenue = records
    .filter((r) => String(r.fields['Created'] ?? '') === today)
    .reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {stats.map((s) => <StatCard key={s.key} card={s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue today + sparkline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <IndianRupee className="w-4 h-4" /> Today's Revenue
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            ₹{todaysRevenue.toLocaleString('en-IN')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">+12% vs yesterday</span>
          </div>
          <div className="mt-4">
            <Sparkline data={stats[1]?.spark || [5, 8, 6, 10, 9, 12, 11, 14]} color="#10B981" width={260} height={50} />
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Order Status Breakdown</p>
          <div className="space-y-3">
            {statusBreakdown.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{s.label}</span>
                  <span className="text-slate-500 tabular-nums">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(s.count / totalStatus) * 100}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Quick Actions</p>
          <div className="space-y-2">
            <button
              onClick={onGoToOrders}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">View all orders</span>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
            </button>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">Pending: {stats.find((s) => s.key === 'pend')?.value ?? 0}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
              <Package className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-slate-700">Packed: {stats.find((s) => s.key === 'pack')?.value ?? 0}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">Shipped: {stats.find((s) => s.key === 'ship')?.value ?? 0}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Delivered: {stats.find((s) => s.key === 'del')?.value ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
          <button onClick={onGoToOrders} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View all →
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.length === 0 && (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No orders yet.</p>
          )}
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() => onRowClick(r)}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {String(r.fields['Name'] ?? 'Unknown')}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {String(r.fields['orderID'] ?? '')} · {String(r.fields['Items'] ?? '')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-900 tabular-nums">
                  ₹{Number(r.fields['Total (₹)'] || 0).toLocaleString('en-IN')}
                </p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  String(r.fields['Status'] ?? '') === 'Delivered' ? 'bg-green-50 text-green-600'
                  : String(r.fields['Status'] ?? '') === 'Shipped' ? 'bg-indigo-50 text-indigo-600'
                  : 'bg-amber-50 text-amber-600'
                }`}>
                  {String(r.fields['Status'] ?? 'New')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
