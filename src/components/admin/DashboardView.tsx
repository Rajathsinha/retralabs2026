import { useState, useRef, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
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
  const recent = useMemo(() => {
    return [...records]
      .sort((a, b) => String(b.fields['Created'] ?? '').localeCompare(String(a.fields['Created'] ?? '')))
      .slice(0, 6);
  }, [records]);

  // ── 100% Real Numbers Calculation ──────────────────────────────────────────
  const {
    todaysRevenue,
    yesterdaysRevenue,
    revenueDeltaPercent,
    dailyRevenueHistory,
    statusBreakdown,
    totalStatus,
    avgOrderValue,
    prepaidRatio,
  } = useMemo(() => {
    const todayObj = new Date();
    const todayIso = todayObj.toISOString().slice(0, 10);

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayIso = yesterdayObj.toISOString().slice(0, 10);

    let tRev = 0;
    let yRev = 0;
    let totalRev = 0;
    let prepCount = 0;

    // Day bucket map for last 10 days
    const daysMap = new Map<string, number>();
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daysMap.set(d.toISOString().slice(0, 10), 0);
    }

    records.forEach((r) => {
      const created = String(r.fields['Created'] ?? '');
      const total = Number(r.fields['Total (₹)'] || 0);
      const isPrepaid = !String(r.fields['Payment'] ?? '').toUpperCase().includes('COD');

      totalRev += total;
      if (isPrepaid) prepCount++;

      if (created === todayIso) {
        tRev += total;
      } else if (created === yesterdayIso) {
        yRev += total;
      }

      if (daysMap.has(created)) {
        daysMap.set(created, (daysMap.get(created) || 0) + total);
      }
    });

    const dailyRevenueHistory = Array.from(daysMap.values());

    // Day-over-day delta percentage
    let revenueDeltaPercent = 0;
    if (yRev > 0) {
      revenueDeltaPercent = Math.round(((tRev - yRev) / yRev) * 100);
    } else if (tRev > 0) {
      revenueDeltaPercent = 100;
    }

    const statuses = [
      { label: 'New', color: '#3B82F6' },
      { label: 'Paid', color: '#8B5CF6' },
      { label: 'Shipped', color: '#6366F1' },
      { label: 'Delivered', color: '#10B981' },
      { label: 'Cancelled', color: '#EF4444' },
    ].map((s) => ({
      ...s,
      count: records.filter((r) => String(r.fields['Status'] ?? '') === s.label).length,
    }));

    const totalStatus = statuses.reduce((sum, s) => sum + s.count, 0) || 1;
    const avgOrderValue = records.length > 0 ? Math.round(totalRev / records.length) : 0;
    const prepaidRatio = records.length > 0 ? Math.round((prepCount / records.length) * 100) : 0;

    return {
      todaysRevenue: tRev,
      yesterdaysRevenue: yRev,
      revenueDeltaPercent,
      dailyRevenueHistory,
      statusBreakdown: statuses,
      totalStatus,
      avgOrderValue,
      prepaidRatio,
    };
  }, [records]);

  // ── 3D Animatic Tilt for Main Revenue Card ─────────────────────────────────
  const revCardRef = useRef<HTMLDivElement>(null);
  const [revTilt, setRevTilt] = useState({ x: 0, y: 0, sheenX: 50, sheenY: 50, active: false });

  const onRevMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!revCardRef.current) return;
    const rect = revCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = -((y - cy) / cy) * 8;
    const rotY = ((x - cx) / cx) * 8;
    setRevTilt({
      x: rotX,
      y: rotY,
      sheenX: Math.round((x / rect.width) * 100),
      sheenY: Math.round((y / rect.height) * 100),
      active: true,
    });
  }, []);

  const onRevMouseLeave = useCallback(() => {
    setRevTilt((prev) => ({ ...prev, x: 0, y: 0, active: false }));
  }, []);

  return (
    <div className="space-y-6">
      {/* 3D Animatic Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {stats.map((s) => (
          <StatCard key={s.key} card={s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 3D Showcase: Revenue Today with Real Delta & History */}
        <div
          ref={revCardRef}
          onMouseMove={onRevMouseMove}
          onMouseLeave={onRevMouseLeave}
          className="relative bg-white rounded-2xl border border-slate-200/80 p-5 overflow-hidden transition-all will-change-transform cursor-pointer"
          style={{
            perspective: '1000px',
            transformStyle: 'preserve-3d',
            transform: revTilt.active
              ? `perspective(1000px) rotateX(${revTilt.x.toFixed(2)}deg) rotateY(${revTilt.y.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
              : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
            transition: revTilt.active ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease',
            boxShadow: revTilt.active
              ? `${(-revTilt.y * 1.5).toFixed(1)}px ${(revTilt.x * 1.5 + 16).toFixed(1)}px 30px -6px rgba(16, 185, 129, 0.2), 0 0 0 1px rgba(255,255,255,0.8) inset`
              : '0 4px 14px -2px rgba(15, 23, 42, 0.06)',
          }}
        >
          {/* 3D Specular Sheen */}
          {revTilt.active && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background: `radial-gradient(circle 220px at ${revTilt.sheenX}% ${revTilt.sheenY}%, rgba(16, 185, 129, 0.12) 0%, rgba(255, 255, 255, 0.4) 30%, transparent 70%)`,
              }}
            />
          )}

          <div
            className="flex items-center justify-between"
            style={{ transform: revTilt.active ? 'translateZ(24px)' : 'none', transition: 'transform 0.2s ease-out' }}
          >
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
              Today's Live Revenue
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Real-time
            </span>
          </div>

          <p
            className="mt-3 text-3xl font-black tracking-tight text-slate-900 tabular-nums"
            style={{ transform: revTilt.active ? 'translateZ(28px)' : 'none', transition: 'transform 0.2s ease-out' }}
          >
            ₹{todaysRevenue.toLocaleString('en-IN')}
          </p>

          <div
            className="mt-2 flex items-center gap-2"
            style={{ transform: revTilt.active ? 'translateZ(18px)' : 'none', transition: 'transform 0.2s ease-out' }}
          >
            {revenueDeltaPercent >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600">
                  +{revenueDeltaPercent}% vs yesterday (₹{yesterdaysRevenue.toLocaleString('en-IN')})
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-600">
                  {revenueDeltaPercent}% vs yesterday (₹{yesterdaysRevenue.toLocaleString('en-IN')})
                </span>
              </>
            )}
          </div>

          <div
            className="mt-4 pt-3 border-t border-slate-100"
            style={{ transform: revTilt.active ? 'translateZ(12px)' : 'none' }}
          >
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1.5 font-medium">
              <span>10-Day Actual Revenue Trend</span>
              <span className="text-emerald-600 font-bold">100% Real Records</span>
            </div>
            <div className="w-full flex justify-center">
              <Sparkline
                data={dailyRevenueHistory}
                color="#10B981"
                width={280}
                height={55}
              />
            </div>
          </div>
        </div>

        {/* Status Breakdown (3D Isometric Layering) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Pipeline Status
              </p>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {records.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {statusBreakdown.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                    <span className="text-slate-600 font-bold tabular-nums">
                      {s.count} <span className="text-slate-400 font-normal">({Math.round((s.count / totalStatus) * 100)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(s.count / totalStatus) * 100}%`,
                        backgroundColor: s.color,
                        boxShadow: `0 0 8px ${s.color}66`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real Secondary Metrics */}
          <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Order Value</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">₹{avgOrderValue.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Prepaid Share</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">{prepaidRatio}%</p>
            </div>
          </div>
        </div>

        {/* Quick Links & Pipeline Pulse */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Operational Actions
            </p>
            <div className="space-y-2">
              <button
                onClick={onGoToOrders}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-left border border-blue-200/60 group"
              >
                <ShoppingBag className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">Manage All Orders</span>
                <ArrowRight className="w-4 h-4 text-blue-500 ml-auto group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Needs Action: <strong className="text-slate-900">{stats.find((s) => s.key === 'pend')?.value ?? 0}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <Package className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Paid & Ready: <strong className="text-slate-900">{stats.find((s) => s.key === 'pack')?.value ?? 0}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">
                  In Transit: <strong className="text-slate-900">{stats.find((s) => s.key === 'ship')?.value ?? 0}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Delivered: <strong className="text-slate-900">{stats.find((s) => s.key === 'del')?.value ?? 0}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
            <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              Live Feed
            </span>
          </div>
          <button onClick={onGoToOrders} className="text-xs font-bold text-blue-600 hover:text-blue-700">
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
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {String(r.fields['Name'] ?? 'Unknown')}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  #{String(r.fields['orderID'] ?? '')} · {String(r.fields['Items'] ?? '')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-slate-900 tabular-nums">
                  ₹{Number(r.fields['Total (₹)'] || 0).toLocaleString('en-IN')}
                </p>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    String(r.fields['Status'] ?? '') === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : String(r.fields['Status'] ?? '') === 'Shipped'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}
                >
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
