import { useMemo } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, ShoppingBag, Repeat, Clock } from 'lucide-react';
import type { AirtableRecord } from './types';
import { Sparkline } from './Sparkline';

interface AnalyticsViewProps {
  records: AirtableRecord[];
}

export function AnalyticsView({ records }: AnalyticsViewProps) {
  const metrics = useMemo(() => {
    const totalRevenue = records.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0);
    const codCount = records.filter((r) => String(r.fields['Payment'] ?? '').toUpperCase().includes('COD')).length;
    const prepaidCount = records.length - codCount;
    const expressCount = records.filter((r) => String(r.fields['Delivery'] ?? '').toLowerCase().includes('express')).length;
    const delivered = records.filter((r) => String(r.fields['Status'] ?? '') === 'Delivered').length;
    const avgOrder = records.length ? totalRevenue / records.length : 0;

    // Last 7 days revenue
    const days: { label: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayOrders = records.filter((r) => String(r.fields['Created'] ?? '') === key);
      days.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayOrders.reduce((s, r) => s + Number(r.fields['Total (₹)'] || 0), 0),
        orders: dayOrders.length,
      });
    }

    // Top products
    const productMap: Record<string, number> = {};
    records.forEach((r) => {
      const items = String(r.fields['Items'] ?? '');
      items.split(/[,;]/).forEach((item) => {
        const trimmed = item.trim();
        if (trimmed) productMap[trimmed] = (productMap[trimmed] || 0) + 1;
      });
    });
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalRevenue, codCount, prepaidCount, expressCount, delivered, avgOrder, days, topProducts };
  }, [records]);

  const maxRevenue = Math.max(...metrics.days.map((d) => d.revenue), 1);
  const maxProductCount = metrics.topProducts.length ? metrics.topProducts[0][1] : 1;

  const cards = [
    { label: 'Total Revenue', value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, tint: 'bg-emerald-100 text-emerald-600', change: 12, spark: [8, 12, 10, 15, 14, 18, 16, 20] },
    { label: 'Total Orders', value: records.length, icon: ShoppingBag, tint: 'bg-blue-100 text-blue-600', change: 8, spark: [5, 7, 6, 9, 8, 11, 10, 13] },
    { label: 'Avg Order Value', value: `₹${Math.round(metrics.avgOrder).toLocaleString('en-IN')}`, icon: TrendingUp, tint: 'bg-violet-100 text-violet-600', change: 5, spark: [10, 9, 11, 10, 12, 11, 13, 12] },
    { label: 'Repeat Rate', value: '24%', icon: Repeat, tint: 'bg-amber-100 text-amber-600', change: 3, spark: [6, 7, 6, 8, 7, 9, 8, 10] },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const up = c.change >= 0;
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.tint}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {up ? '↑' : '↓'} {Math.abs(c.change)}%
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{c.value}</p>
              <div className="mt-1 flex items-end justify-between">
                <p className="text-xs text-slate-500">{c.label}</p>
                <Sparkline data={c.spark} color={c.tint.includes('emerald') ? '#10B981' : c.tint.includes('blue') ? '#3B82F6' : '#8B5CF6'} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900">Revenue — Last 7 Days</h2>
            <span className="text-xs text-slate-400">₹{metrics.totalRevenue.toLocaleString('en-IN')} total</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {metrics.days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                  {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(1)}k` : ''}
                </span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-500 hover:from-blue-600 hover:to-blue-400"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-5">Top Products</h2>
          {metrics.topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No product data available.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topProducts.map(([name, count], i) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 truncate">
                      <span className="text-slate-400 mr-2">#{i + 1}</span>{name}
                    </span>
                    <span className="text-slate-500 tabular-nums flex-shrink-0 ml-2">{count} orders</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400 transition-all duration-500"
                      style={{ width: `${(count / maxProductCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment + Delivery split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Payment Method</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="#3B82F6" strokeWidth="4"
                  strokeDasharray={`${(metrics.prepaidCount / (records.length || 1)) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-900">{records.length}</span>
                <span className="text-[10px] text-slate-400">orders</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">Prepaid</span>
                <span className="ml-auto text-sm font-semibold text-slate-900 tabular-nums">{metrics.prepaidCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200" />
                <span className="text-sm text-slate-600">COD</span>
                <span className="ml-auto text-sm font-semibold text-slate-900 tabular-nums">{metrics.codCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Delivery Type</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="#F59E0B" strokeWidth="4"
                  strokeDasharray={`${(metrics.expressCount / (records.length || 1)) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-600">Express</span>
                <span className="ml-auto text-sm font-semibold text-slate-900 tabular-nums">{metrics.expressCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200" />
                <span className="text-sm text-slate-600">Standard</span>
                <span className="ml-auto text-sm font-semibold text-slate-900 tabular-nums">{records.length - metrics.expressCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
