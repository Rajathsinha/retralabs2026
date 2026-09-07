import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Copy,
  Check,
  CreditCard,
  Banknote,
  Package,
  Truck,
  MessageCircle,
  LayoutList,
  Table as TableIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { StatusBadge } from './badges';
import type { AirtableRecord } from './types';
import {
  formatExactOrderTime,
  extractCityAndState,
  cleanPhone10,
  formatCurrency,
  getPaymentMode,
  type AdminSortOption,
  SORT_OPTIONS,
} from '../../utils/orderViewHelpers';

export type SortDir = 'asc' | 'desc';

interface OrdersTableProps {
  records: AirtableRecord[];
  loading: boolean;
  sortKey?: string;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  sortOption?: AdminSortOption;
  onSortOptionChange?: (opt: AdminSortOption) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (r: AirtableRecord) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (size: number) => void;
  customerOrderCounts?: Map<string, number>;
}

export function OrdersTable({
  records,
  loading,
  sortKey,
  sortDir,
  onSort,
  sortOption = 'time_desc',
  onSortOptionChange,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  customerOrderCounts,
}: OrdersTableProps) {
  const [viewMode, setViewMode] = useState<'line' | 'table'>('line');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = records.slice(start, start + pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const copyPhone = (phone: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-3">
      {/* View Mode & Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">
            Showing <span className="font-bold text-slate-900">{pageRows.length}</span> of{' '}
            <span className="font-bold text-slate-900">{records.length}</span> orders
          </span>
          {sortOption && onSortOptionChange && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-blue-600" />
              Sorted by:{' '}
              <span className="font-bold text-slate-800">
                {SORT_OPTIONS.find((s) => s.id === sortOption)?.label || 'Time (Latest First)'}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'line'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Modern Line-by-Line View (Detailed)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line by Line</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Compact Data Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Page Size Selector */}
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
            >
              <option value={12}>12 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!loading && pageRows.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-2xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            No orders match your active search or filters. Try clearing your filters or search query to view all orders.
          </p>
        </div>
      )}

      {/* LINE BY LINE VIEW (DEFAULT - HIGHLY REQUESTED) */}
      {viewMode === 'line' && pageRows.length > 0 && (
        <div className="space-y-2">
          {/* Header Row */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100/70 rounded-xl border border-slate-200/60 items-center">
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                title="Select all on this page"
              />
              <span>Customer & Mobile</span>
            </div>
            <div className="col-span-2">City & State</div>
            <div className="col-span-2">Order & Items</div>
            <div className="col-span-2">Exact Time Placed</div>
            <div className="col-span-1">Mode</div>
            <div className="col-span-1 text-right">Total Price</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          {/* Line Items */}
          {pageRows.map((r) => {
            const f = r.fields;
            const isSel = selected.has(r.id);
            const timeInfo = formatExactOrderTime(r);
            const loc = extractCityAndState(r);
            const phone = cleanPhone10(f['Phone']);
            const name = String(f['Name'] || 'Customer').trim();
            const orderId = String(f['orderID'] || r.id).trim();
            const items = String(f['Items'] || 'Products').trim();
            const total = Number(f['Total (₹)'] || 0);
            const pay = getPaymentMode(r);
            const status = String(f['Status'] || 'New');
            const awb = String(f['AWB Number'] || f['Tracking ID'] || '');
            const courier = String(f['Courier Provider'] || f['Carrier Display Name'] || f['Courier'] || '');

            const custKey = phone || name;
            const orderCount = customerOrderCounts?.get(custKey) || 1;

            return (
              <div
                key={r.id}
                onClick={() => onRowClick(r)}
                className={`group relative rounded-xl border transition-all duration-150 cursor-pointer bg-white p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-blue-500/80 hover:bg-blue-50/20 ${
                  isSel
                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
                  {/* Col 1: Checkbox + Customer Name & Mobile */}
                  <div className="lg:col-span-3 flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className="pt-1 sm:pt-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(r.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        readOnly
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                          {name}
                        </span>
                        {orderCount > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                            Repeat ({orderCount})
                          </span>
                        )}
                      </div>

                      {phone ? (
                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          <button
                            type="button"
                            onClick={(e) => copyPhone(phone, r.id, e)}
                            className="inline-flex items-center gap-1 font-mono text-slate-600 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-1.5 py-0.5 rounded"
                            title="Click to copy 10-digit phone"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            {phone}
                            {copiedId === r.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                            )}
                          </button>

                          <a
                            href={`https://wa.me/91${phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No phone</span>
                      )}
                    </div>
                  </div>

                  {/* Col 2: City & State */}
                  <div className="lg:col-span-2 min-w-0">
                    <div className="inline-flex items-center gap-1.5 max-w-full">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <MapPin className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-800 truncate" title={loc.city}>
                          {loc.city}
                        </p>
                        {loc.state && (
                          <p className="text-[10px] text-slate-400 truncate" title={loc.state}>
                            {loc.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Col 3: Order ID & Products */}
                  <div className="lg:col-span-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {orderId}
                      </span>
                      {String(f['Delivery'] || '').toLowerCase().includes('express') && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          ⚡ Air
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5 max-w-[200px]" title={items}>
                      {items}
                    </p>
                  </div>

                  {/* Col 4: Exact Time Placed */}
                  <div className="lg:col-span-2 min-w-0" title={timeInfo.fullIst}>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={timeInfo.isToday ? 'text-blue-700 font-bold' : ''}>
                        {timeInfo.display}
                      </span>
                    </div>
                    {timeInfo.relative && (
                      <p className="text-[11px] text-slate-400 pl-4.5 mt-0.5">
                        {timeInfo.relative}
                      </p>
                    )}
                  </div>

                  {/* Col 5: COD / UPI Payment Mode */}
                  <div className="lg:col-span-1">
                    {pay.isCod ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Banknote className="w-3 h-3 text-amber-600" />
                        COD
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CreditCard className="w-3 h-3 text-emerald-600" />
                        UPI
                      </span>
                    )}
                  </div>

                  {/* Col 6: Total Price */}
                  <div className="lg:col-span-1 text-left lg:text-right">
                    <span className="text-sm font-black text-slate-950 tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  {/* Col 7: Status & Arrow */}
                  <div className="lg:col-span-1 flex items-center justify-between lg:justify-end gap-2">
                    <StatusBadge status={status} />
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Sub-row for tracking/AWB if available */}
                {awb && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <Truck className="w-3 h-3 text-slate-400" />
                      <span>
                        {courier || 'Courier'}:{' '}
                        <span className="font-mono font-bold text-slate-800">{awb}</span>
                      </span>
                    </div>
                    <span className="text-slate-400">Click row for shipment updates →</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMPACT TABLE VIEW (FALLBACK OPTION) */}
      {viewMode === 'table' && pageRows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => onSort?.('Name')}
                      className="inline-flex items-center gap-1 hover:text-slate-800"
                    >
                      Customer {sortKey === 'Name' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">Mobile</th>
                  <th className="px-3 py-3 text-left">City</th>
                  <th className="px-3 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => onSort?.('orderID')}
                      className="inline-flex items-center gap-1 hover:text-slate-800"
                    >
                      Order ID {sortKey === 'orderID' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => onSort?.('Time')}
                      className="inline-flex items-center gap-1 hover:text-slate-800"
                    >
                      Exact Time Placed {sortKey === 'Time' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">Mode</th>
                  <th className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSort?.('Total (₹)')}
                      className="inline-flex items-center gap-1 hover:text-slate-800 ml-auto"
                    >
                      Total {sortKey === 'Total (₹)' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">AWB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((r) => {
                  const f = r.fields;
                  const isSel = selected.has(r.id);
                  const timeInfo = formatExactOrderTime(r);
                  const loc = extractCityAndState(r);
                  const phone = cleanPhone10(f['Phone']);
                  const name = String(f['Name'] || 'Customer');
                  const orderId = String(f['orderID'] || r.id);
                  const total = Number(f['Total (₹)'] || 0);
                  const pay = getPaymentMode(r);
                  const status = String(f['Status'] || 'New');
                  const awb = String(f['AWB Number'] || f['Tracking ID'] || '—');

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onRowClick(r)}
                      className={`cursor-pointer transition-colors hover:bg-blue-50/30 ${
                        isSel ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect(r.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {name}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {phone || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {loc.city}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        {orderId}
                      </td>
                      <td
                        className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap"
                        title={timeInfo.fullIst}
                      >
                        {timeInfo.display}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {pay.isCod ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            COD
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            UPI
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {awb}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <p className="text-xs text-slate-500">
          Page <span className="font-bold text-slate-800">{page}</span> of{' '}
          <span className="font-bold text-slate-800">{totalPages}</span> ({records.length} total orders)
        </p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-bold text-slate-800">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
