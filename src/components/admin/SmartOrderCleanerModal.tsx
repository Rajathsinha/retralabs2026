import { useState, useMemo } from 'react';
import {
  Sparkles,
  Trash2,
  X,
  AlertTriangle,
  Copy,
  PhoneOff,
  MapPinOff,
  UserX,
  Coins,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertOctagon,
} from 'lucide-react';
import type { AirtableRecord } from './types';
import { detectJunkOrders, type JunkIssueType } from '../../utils/junkOrderDetector';
import { deleteAdminOrders } from '../../utils/adminAuth';

interface SmartOrderCleanerModalProps {
  records: AirtableRecord[];
  onClose: () => void;
  onDeleted: () => void;
}

type FilterCategory = 'ALL' | JunkIssueType;

export function SmartOrderCleanerModal({
  records,
  onClose,
  onDeleted,
}: SmartOrderCleanerModalProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState<number | null>(null);

  // Run junk detection
  const flaggedOrders = useMemo(() => detectJunkOrders(records), [records]);

  // Initial selection: select all flagged by default
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(flaggedOrders.map((f) => f.record.id)));

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: flaggedOrders.length,
      DUPLICATE_ORDER: 0,
      BUNK_PHONE: 0,
      FAKE_ADDRESS: 0,
      DUMMY_NAME: 0,
      ZERO_AMOUNT: 0,
    };
    flaggedOrders.forEach((item) => {
      item.issues.forEach((iss) => {
        if (counts[iss.type] !== undefined) {
          counts[iss.type]++;
        }
      });
    });
    return counts;
  }, [flaggedOrders]);

  // Filtered flagged orders
  const filteredOrders = useMemo(() => {
    return flaggedOrders.filter((item) => {
      if (activeCategory !== 'ALL') {
        const hasCat = item.issues.some((i) => i.type === activeCategory);
        if (!hasCat) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const f = item.record.fields;
        const text = [
          f['orderID'],
          f['Name'],
          f['Phone'],
          f['Address'],
          f['Items'],
          ...item.issues.map((i) => `${i.label} ${i.detail}`),
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [flaggedOrders, activeCategory, searchQuery]);

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

  // Perform bulk deletion
  const handleExecuteDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    setDeleting(true);
    setDeleteError('');
    setDeleteProgress({ current: 0, total: idsToDelete.length });

    try {
      // Chunk deletion in batches of 10
      const chunkSize = 10;
      let totalDeleted = 0;

      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const res = await deleteAdminOrders(chunk);
        totalDeleted += res.deletedCount;
        setDeleteProgress({
          current: Math.min(i + chunkSize, idsToDelete.length),
          total: idsToDelete.length,
        });
      }

      setDeleteSuccess(totalDeleted);
      setConfirmingDelete(false);
      // Wait a moment so user sees success, then refresh & close
      setTimeout(() => {
        onDeleted();
      }, 1400);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-[#10192e] to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Smart AI Order Cleaner</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Airtable Purge Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically flags duplicate submissions, bunk numbers, fake addresses, and test entries.
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
            <span className="text-rose-600 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Flagged Junk: <strong className="text-rose-700 font-bold">{flaggedOrders.length}</strong>
            </span>
            <span className="text-emerald-600 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Clean & Verified: <strong className="text-emerald-700 font-bold">{Math.max(0, records.length - flaggedOrders.length)}</strong>
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

        {/* Categories Bar & Search */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Flagged ({categoryCounts['ALL']})
            </button>
            <button
              onClick={() => setActiveCategory('DUPLICATE_ORDER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'DUPLICATE_ORDER'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicates ({categoryCounts['DUPLICATE_ORDER']})
            </button>
            <button
              onClick={() => setActiveCategory('BUNK_PHONE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'BUNK_PHONE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50'
              }`}
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Fake Numbers ({categoryCounts['BUNK_PHONE']})
            </button>
            <button
              onClick={() => setActiveCategory('FAKE_ADDRESS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'FAKE_ADDRESS'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/50'
              }`}
            >
              <MapPinOff className="w-3.5 h-3.5" />
              Fake Address ({categoryCounts['FAKE_ADDRESS']})
            </button>
            <button
              onClick={() => setActiveCategory('DUMMY_NAME')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'DUMMY_NAME'
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/50'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Dummy Names ({categoryCounts['DUMMY_NAME']})
            </button>
            <button
              onClick={() => setActiveCategory('ZERO_AMOUNT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'ZERO_AMOUNT'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/50'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              ₹0 / ₹1 Orders ({categoryCounts['ZERO_AMOUNT']})
            </button>
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search junk orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {flaggedOrders.length === 0
                  ? 'Awesome! No junk or fake orders detected'
                  : 'No orders match this filter'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All order records appear clean, verified, and deliverable.
              </p>
            </div>
          ) : (
            filteredOrders.map((item) => {
              const r = item.record;
              const f = r.fields;
              const isSelected = selectedIds.has(r.id);
              const orderId = String(f['orderID'] ?? '') || r.id.slice(-6);
              const name = String(f['Name'] ?? 'No Name');
              const phone = String(f['Phone'] ?? 'No Phone');
              const addr = String(f['Address'] ?? 'No Address');
              const items = String(f['Items'] ?? 'Retra Collagen');
              const total = Number(f['Total (₹)'] || 0);
              const created = String(f['Created'] ?? '');

              return (
                <div
                  key={r.id}
                  onClick={() => toggleSelectOne(r.id)}
                  className={`cursor-pointer rounded-2xl border transition-all p-4 ${
                    isSelected
                      ? 'bg-white border-rose-300 shadow-md shadow-rose-500/5 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-rose-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top Row: Order ID, Confidence, Created Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            #{orderId}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {name}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-600 font-medium">
                            {phone}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              item.score >= 50
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.score}% Confidence Junk
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {created}
                          </span>
                        </div>
                      </div>

                      {/* Issue Badges */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {item.issues.map((iss, i) => (
                          <div
                            key={i}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                              iss.type === 'DUPLICATE_ORDER'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : iss.type === 'BUNK_PHONE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : iss.type === 'FAKE_ADDRESS'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              <strong>{iss.label}:</strong> {iss.detail}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Duplicate Note (if duplicate, show safe original) */}
                      {item.duplicateOfOrderId && (
                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-200/60 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>
                            Original order{' '}
                            <strong className="text-slate-800">
                              #{item.duplicateOfOrderId}
                            </strong>{' '}
                            is safely preserved and will NOT be deleted.
                          </span>
                        </div>
                      )}

                      {/* Order Details: Address, items, total */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-500">
                        <div className="truncate">
                          <strong className="text-slate-700">Address:</strong> {addr}
                        </div>
                        <div className="truncate">
                          <strong className="text-slate-700">Items:</strong> {items}
                        </div>
                        <div className="text-right tabular-nums">
                          <strong className="text-slate-700">Total:</strong> ₹{total.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedIds.size > 0 ? (
              <span className="font-semibold text-rose-600">
                {selectedIds.size} junk orders queued for permanent removal
              </span>
            ) : (
              <span>Select the orders you wish to clean from Airtable.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={selectedIds.size === 0 || deleting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedIds.size} Selected Junk Orders
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmingDelete && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-rose-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Permanently Delete {selectedIds.size} Records?
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  You are about to delete <strong>{selectedIds.size}</strong> flagged junk/fake records directly from Airtable. This action is <strong>irreversible</strong>.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {deleteError}
                </div>
              )}

              {deleting ? (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      Deleting batches from Airtable...
                    </span>
                    <span className="font-bold">
                      {deleteProgress.current} / {deleteProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-rose-600 transition-all duration-300"
                      style={{
                        width: `${
                          deleteProgress.total > 0
                            ? (deleteProgress.current / deleteProgress.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDelete}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                  >
                    Yes, Purge from Airtable
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Modal */}
        {deleteSuccess !== null && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Purge Complete!
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Successfully deleted <strong>{deleteSuccess}</strong> junk records from Airtable. Updating dashboard...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
