import { X, RotateCcw, Download } from 'lucide-react';
import { STATUS_OPTIONS, PAYMENT_OPTIONS, DELIVERY_OPTIONS } from './types';
import type { AdminFilters } from './types';

interface FilterBarProps {
  filters: AdminFilters;
  onChange: (f: AdminFilters) => void;
  onReset: () => void;
  onExport: () => void;
  visible: boolean;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-400 transition-all';

export function FilterBar({ filters, onChange, onReset, onExport, visible, onClose }: FilterBarProps) {
  if (!visible) return null;
  const set = (patch: Partial<AdminFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="mb-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.12)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Filters</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Status</label>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Payment</label>
          <select value={filters.payment} onChange={(e) => set({ payment: e.target.value })} className={inputCls}>
            <option value="">All</option>
            {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Delivery</label>
          <select value={filters.delivery} onChange={(e) => set({ delivery: e.target.value })} className={inputCls}>
            <option value="">All</option>
            {DELIVERY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Referral</label>
          <input value={filters.referral} onChange={(e) => set({ referral: e.target.value })} placeholder="YouTube, Reddit…" className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Customer</label>
          <input value={filters.customer} onChange={(e) => set({ customer: e.target.value })} placeholder="Name or phone" className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Tracking ID</label>
          <input value={filters.trackingId} onChange={(e) => set({ trackingId: e.target.value })} placeholder="Tracking ID" className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Date from</label>
          <input type="date" value={filters.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Date to</label>
          <input type="date" value={filters.dateTo} onChange={(e) => set({ dateTo: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
        </button>
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors ml-auto">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
    </div>
  );
}

export function hasActiveFilters(f: AdminFilters): boolean {
  return !!(f.status || f.payment || f.delivery || f.referral || f.customer || f.trackingId || f.dateFrom || f.dateTo);
}
