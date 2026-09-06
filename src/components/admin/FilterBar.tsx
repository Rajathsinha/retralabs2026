import { X, RotateCcw, Download, SlidersHorizontal, Calendar, Tag, IndianRupee, MapPin, UserCheck, ShieldCheck } from 'lucide-react';
import { STATUS_OPTIONS, PAYMENT_OPTIONS, DELIVERY_OPTIONS } from './types';
import type { AdminFilters } from './types';

interface FilterBarProps {
  filters: AdminFilters;
  onChange: (f: AdminFilters) => void;
  onReset: () => void;
  onExport: () => void;
  visible: boolean;
  onClose: () => void;
  availableProducts?: string[];
  totalFilteredCount?: number;
}

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium';

export const PRESET_OPTIONS = [
  { id: 'all', label: 'All Orders' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '15d', label: 'Last 15 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'needs_action', label: 'Needs Action (Unfulfilled)' },
  { id: 'prepay_unverified', label: 'Unverified Prepaid' },
  { id: 'express', label: 'Express Only ⚡' },
  { id: 'cod', label: 'COD Only' },
  { id: 'repeat', label: 'Repeat Customers' },
  { id: 'high_value', label: 'High Value (₹10k+)' },
] as const;

export function FilterBar({
  filters,
  onChange,
  onReset,
  onExport,
  visible,
  onClose,
  availableProducts = [],
  totalFilteredCount,
}: FilterBarProps) {
  if (!visible) return null;
  const set = (patch: Partial<AdminFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-[0_4px_25px_-12px_rgba(15,23,42,0.12)] p-4 sm:p-5 animate-[fadeIn_0.15s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Advanced Order Filters</h3>
            <p className="text-[11px] text-slate-500">Filter by dates, product, amount, customer loyalty and courier status</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalFilteredCount !== undefined && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {totalFilteredCount} matching order{totalFilteredCount === 1 ? '' : 's'}
            </span>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" /> Quick Date & Status Presets
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_OPTIONS.map((p) => {
            const active = filters.datePreset === p.id || (p.id === 'all' && !filters.datePreset);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ datePreset: p.id === 'all' ? '' : p.id })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Inputs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Order Status */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Order Status
          </label>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Payment Method
          </label>
          <select value={filters.payment} onChange={(e) => set({ payment: e.target.value })} className={inputCls}>
            <option value="">All Methods</option>
            {PAYMENT_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Payment Proof Status */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-slate-400" /> Verification
          </label>
          <select
            value={filters.paymentStatus}
            onChange={(e) => set({ paymentStatus: e.target.value })}
            className={inputCls}
          >
            <option value="">All Verification</option>
            <option value="Verified">Verified Proof</option>
            <option value="Unverified">Unverified / Pending</option>
            <option value="Confirmed">Auto-Confirmed</option>
            <option value="Failed">Failed / Rejected</option>
          </select>
        </div>

        {/* Delivery Type */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Delivery Type
          </label>
          <select value={filters.delivery} onChange={(e) => set({ delivery: e.target.value })} className={inputCls}>
            <option value="">All Shipping</option>
            {DELIVERY_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Product Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
            <Tag className="w-2.5 h-2.5 text-slate-400" /> Contains Product
          </label>
          <select value={filters.product} onChange={(e) => set({ product: e.target.value })} className={inputCls}>
            <option value="">All Products</option>
            {availableProducts.map((prod) => (
              <option key={prod} value={prod}>{prod}</option>
            ))}
          </select>
        </div>

        {/* Customer Type */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-2.5 h-2.5 text-slate-400" /> Customer Type
          </label>
          <select
            value={filters.customerType}
            onChange={(e) => set({ customerType: e.target.value })}
            className={inputCls}
          >
            <option value="">All Customers</option>
            <option value="first">First-Time Buyers</option>
            <option value="repeat">Repeat Buyers (2+ orders)</option>
          </select>
        </div>

        {/* Min Amount */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
            <IndianRupee className="w-2.5 h-2.5 text-slate-400" /> Min Amount (₹)
          </label>
          <input
            type="number"
            value={filters.minAmount}
            onChange={(e) => set({ minAmount: e.target.value })}
            placeholder="e.g. 2000"
            className={inputCls}
          />
        </div>

        {/* Max Amount */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
            <IndianRupee className="w-2.5 h-2.5 text-slate-400" /> Max Amount (₹)
          </label>
          <input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => set({ maxAmount: e.target.value })}
            placeholder="e.g. 50000"
            className={inputCls}
          />
        </div>

        {/* City / State / PIN */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 text-slate-400" /> City / Pincode
          </label>
          <input
            value={filters.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Mumbai, 560016…"
            className={inputCls}
          />
        </div>

        {/* Customer Search */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Customer Name / Phone
          </label>
          <input
            value={filters.customer}
            onChange={(e) => set({ customer: e.target.value })}
            placeholder="Search person or mobile…"
            className={inputCls}
          />
        </div>

        {/* Tracking ID */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Tracking ID / AWB
          </label>
          <input
            value={filters.trackingId}
            onChange={(e) => set({ trackingId: e.target.value })}
            placeholder="AWB or tracking…"
            className={inputCls}
          />
        </div>

        {/* Referral */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Referral Source
          </label>
          <input
            value={filters.referral}
            onChange={(e) => set({ referral: e.target.value })}
            placeholder="Reddit, YouTube…"
            className={inputCls}
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Date From
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set({ dateFrom: e.target.value, datePreset: '' })}
            className={inputCls}
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Date To
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set({ dateTo: e.target.value, datePreset: '' })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset All Filters
        </button>

        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" /> Export Filtered CSV
        </button>
      </div>
    </div>
  );
}

export function hasActiveFilters(f: AdminFilters): boolean {
  return !!(
    f.status ||
    f.payment ||
    f.paymentStatus ||
    f.delivery ||
    f.referral ||
    f.customer ||
    f.trackingId ||
    f.datePreset ||
    f.dateFrom ||
    f.dateTo ||
    f.product ||
    f.minAmount ||
    f.maxAmount ||
    f.city ||
    f.customerType
  );
}
