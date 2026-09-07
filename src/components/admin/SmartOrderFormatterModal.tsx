import { useState, useMemo } from 'react';
import {
  Wand2,
  X,
  Phone,
  User,
  MapPin,
  CheckCircle2,
  CheckSquare,
  Square,
  ArrowRight,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { AirtableRecord } from './types';
import {
  formatOrderRecord,
  type FormattedOrderResult,
} from '../../utils/orderDataFormatter';
import { updateAdminOrders } from '../../utils/adminAuth';

interface SmartOrderFormatterModalProps {
  records: AirtableRecord[];
  onClose: () => void;
  onFormatted: () => void;
}

type FilterType = 'ALL' | 'PHONE' | 'NAME' | 'ADDRESS';

export function SmartOrderFormatterModal({
  records,
  onClose,
  onFormatted,
}: SmartOrderFormatterModalProps) {
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState<number | null>(null);

  // Compute all orders that have formatting changes
  const formattedResults: FormattedOrderResult[] = useMemo(() => {
    return records
      .map((r) => formatOrderRecord(r))
      .filter((res) => res.hasChanges);
  }, [records]);

  // Selected order IDs (default: select all needing formatting)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(formattedResults.map((f) => f.record.id))
  );

  // Counts by filter
  const counts = useMemo(() => {
    return {
      ALL: formattedResults.length,
      PHONE: formattedResults.filter((r) => r.phone.changed).length,
      NAME: formattedResults.filter((r) => r.name.changed).length,
      ADDRESS: formattedResults.filter((r) => r.address.changed).length,
    };
  }, [formattedResults]);

  // Filtered orders based on selected tab and search
  const filteredOrders = useMemo(() => {
    return formattedResults.filter((res) => {
      if (filterType === 'PHONE' && !res.phone.changed) return false;
      if (filterType === 'NAME' && !res.name.changed) return false;
      if (filterType === 'ADDRESS' && !res.address.changed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const f = res.record.fields;
        const text = [
          f['orderID'],
          f['Name'],
          f['Phone'],
          f['Address'],
          res.phone.formatted,
          res.name.formatted,
          res.address.formatted,
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [formattedResults, filterType, searchQuery]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredOrders.forEach((f) => next.add(f.record.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredOrders.forEach((f) => next.delete(f.record.id));
      return next;
    });
  };

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((f) => selectedIds.has(f.record.id));

  // Perform bulk update in batches of 10
  const handleApplyFormatting = async () => {
    const selectedOrders = formattedResults.filter((f) => selectedIds.has(f.record.id));
    if (selectedOrders.length === 0) return;

    setUpdating(true);
    setUpdateError('');
    setUpdateProgress({ current: 0, total: selectedOrders.length });

    try {
      const updates = selectedOrders.map((res) => {
        const fieldsToUpdate: Record<string, unknown> = {};
        if (res.name.changed) fieldsToUpdate['Name'] = res.name.formatted;
        if (res.phone.changed) fieldsToUpdate['Phone'] = res.phone.formatted;
        if (res.address.changed) fieldsToUpdate['Address'] = res.address.formatted;
        return {
          id: res.record.id,
          fields: fieldsToUpdate,
        };
      });

      const chunkSize = 10;
      let totalUpdated = 0;

      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        const res = await updateAdminOrders(chunk);
        if (!res.success && res.error) {
          throw new Error(res.error);
        }
        totalUpdated += res.updatedCount;
        setUpdateProgress({
          current: Math.min(i + chunkSize, updates.length),
          total: updates.length,
        });
      }

      setUpdateSuccess(totalUpdated);
      setTimeout(() => {
        onFormatted();
      }, 1400);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Smart AI Formatter</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Name · 10-Digit Mobile · Address
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Standardizes customer names to Title Case, phone numbers strictly to 10 digits (removing +91, spaces, 0), and cleans addresses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-medium">
              Analyzed: <strong className="text-slate-900">{records.length}</strong> orders
            </span>
            <span className="text-blue-600 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Needs Formatting: <strong className="text-blue-700 font-bold">{formattedResults.length}</strong>
            </span>
            <span className="text-emerald-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Already Standardized: <strong className="text-emerald-700 font-bold">{Math.max(0, records.length - formattedResults.length)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Selected: <strong className="text-slate-900">{selectedIds.size}</strong> of {filteredOrders.length}
            </span>
            {allFilteredSelected ? (
              <button
                onClick={deselectAllFiltered}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Deselect All
              </button>
            ) : (
              <button
                onClick={selectAllFiltered}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                Select All
              </button>
            )}
          </div>
        </div>

        {/* Category Pills & Search */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Formatting ({counts.ALL})
            </button>
            <button
              onClick={() => setFilterType('PHONE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'PHONE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Phone (+91 → 10 Digits) ({counts.PHONE})
            </button>
            <button
              onClick={() => setFilterType('NAME')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'NAME'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Name (Title Case) ({counts.NAME})
            </button>
            <button
              onClick={() => setFilterType('ADDRESS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'ADDRESS'
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Address Standardize ({counts.ADDRESS})
            </button>
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Diff Review List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {formattedResults.length === 0
                  ? 'Awesome! All orders are cleanly standardized'
                  : 'No orders match this filter'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Customer names are Title Cased, phone numbers are strictly 10 digits, and addresses have clean formatting.
              </p>
            </div>
          ) : (
            filteredOrders.map((res) => {
              const r = res.record;
              const f = r.fields;
              const isSelected = selectedIds.has(r.id);
              const orderId = String(f['orderID'] ?? '') || r.id.slice(-6);

              return (
                <div
                  key={r.id}
                  onClick={() => toggleSelectOne(r.id)}
                  className={`cursor-pointer rounded-2xl border transition-all p-4 ${
                    isSelected
                      ? 'bg-white border-blue-300 shadow-md shadow-blue-500/5 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* Top Row: Order ID & Changed tags */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            #{orderId}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {String(f['Created'] ?? '')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {res.changeSummary.map((summary, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60"
                            >
                              {summary}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Phone Diff (if changed) */}
                      {res.phone.changed && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>Mobile Number Standardization</span>
                            <span className="text-[10px] text-blue-600 font-normal ml-auto">
                              {res.phone.notes}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="line-through text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                              {res.phone.current}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                              {res.phone.formatted}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Name Diff (if changed) */}
                      {res.name.changed && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                            <User className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Customer Name (Title Case)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="line-through text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                              {res.name.current}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                              {res.name.formatted}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Address Diff (if changed) */}
                      {res.address.changed && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-violet-600" />
                            <span>Address Formatting</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-rose-500 line-through bg-rose-50/70 p-1.5 rounded">
                              {res.address.current}
                            </div>
                            <div className="text-emerald-700 bg-emerald-50/70 p-1.5 rounded font-medium">
                              {res.address.formatted}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedIds.size > 0 ? (
              <span className="font-semibold text-blue-600">
                {selectedIds.size} orders selected to format in Airtable
              </span>
            ) : (
              <span>Select the orders you wish to format.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={updating}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFormatting}
              disabled={selectedIds.size === 0 || updating}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" />
              Apply AI Formatting to {selectedIds.size} Orders
            </button>
          </div>
        </div>

        {/* Updating Progress Overlay */}
        {updating && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-blue-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Applying AI Formatting to Airtable...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Updating {updateProgress.current} of {updateProgress.total} orders in batches of 10.
                </p>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${
                      updateProgress.total > 0
                        ? (updateProgress.current / updateProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {updateError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {updateError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Modal */}
        {updateSuccess !== null && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Formatting Complete!
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Successfully standardized <strong>{updateSuccess}</strong> customer records in Airtable. Refreshing dashboard...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
