import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { StatusBadge, DeliveryBadge, PaymentBadge } from './badges';
import type { AirtableRecord } from './types';

export type SortDir = 'asc' | 'desc';

interface OrdersTableProps {
  records: AirtableRecord[];
  loading: boolean;
  sortKey: string;
  sortDir: SortDir;
  onSort: (key: string) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (r: AirtableRecord) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

const COLS: { key: string; label: string; width: number }[] = [
  { key: 'orderID', label: 'Order ID', width: 130 },
  { key: 'Name', label: 'Customer', width: 140 },
  { key: 'Total (₹)', label: 'Total', width: 100 },
  { key: 'Payment', label: 'Payment', width: 90 },
  { key: 'Delivery', label: 'Delivery', width: 100 },
  { key: 'Status', label: 'Status', width: 140 },
  { key: 'Tracking ID', label: 'Tracking', width: 120 },
  { key: 'Created', label: 'Date', width: 110 },
];

export function OrdersTable({
  records, loading, sortKey, sortDir, onSort, selected, onToggleSelect, onToggleSelectAll, onRowClick, page, pageSize, onPageChange,
}: OrdersTableProps) {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = records.slice(start, start + pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-50/80 px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 accent-[#2563EB] cursor-pointer"
                />
              </th>
              {COLS.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th key={c.key} className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap" style={{ minWidth: c.width }}>
                    <button onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                      {c.label}
                      {active ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && pageRows.length === 0 && (
              <tr><td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-slate-400 text-sm">Loading orders…</td></tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">You're all caught up</p>
                    <p className="text-xs text-slate-400">No orders match the current filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map((r, i) => {
              const f = r.fields;
              const isSel = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  onClick={() => onRowClick(r)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${isSel ? 'bg-blue-50/50' : i % 2 ? 'bg-slate-50/40' : ''} hover:bg-blue-50/40`}
                >
                  <td className="sticky left-0 z-10 px-4 py-3 bg-inherit" onClick={(e) => { e.stopPropagation(); onToggleSelect(r.id); }}>
                    <input type="checkbox" checked={isSel} readOnly className="w-4 h-4 rounded border-slate-300 accent-[#2563EB] cursor-pointer" />
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">{String(f['orderID'] ?? '—')}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{String(f['Name'] ?? '—')}</td>
                  <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">₹{Number(f['Total (₹)'] || 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3"><PaymentBadge payment={String(f['Payment'] ?? '')} /></td>
                  <td className="px-3 py-3"><DeliveryBadge delivery={String(f['Delivery'] ?? '')} /></td>
                  <td className="px-3 py-3"><StatusBadge status={String(f['Status'] ?? 'New')} /></td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{String(f['Tracking ID'] ?? '—')}</td>
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{String(f['Created'] ?? '—')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{pageRows.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{records.length}</span> orders
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 px-2">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
