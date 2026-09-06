import { useState, useEffect, useMemo } from 'react';
import { Printer, X, MapPin, Phone, Settings2, Check, Scissors, Filter, RefreshCw, Package } from 'lucide-react';
import type { AirtableRecord, SenderConfig } from './types';

interface BulkAddressLabelModalProps {
  records: AirtableRecord[];
  onClose: () => void;
}

const DEFAULT_SENDER: SenderConfig = {
  name: 'RetraLabs Dispatch Hub',
  phone: '6360489397',
  addressLines: [
    'Rajareddy layout 1st cross',
    'Shanti layout 8th cross',
    'Ramamurthy Nagar, Bengaluru, Karnataka 560016',
  ],
  returnNotice: 'If undelivered, please return to sender address.',
};

function getStoredSender(): SenderConfig {
  try {
    const raw = localStorage.getItem('retralabs_sender_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SENDER;
}

function field(record: AirtableRecord, key: string): string {
  return String(record.fields[key] ?? '').trim();
}

function getAddressLines(record: AirtableRecord): string[] {
  const raw = field(record, 'Address');
  if (!raw) return ['Address not provided'];

  return raw
    .split(/,|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^PIN\s*:?\s*/i, '').trim())
    .filter(Boolean);
}

function extractPincode(record: AirtableRecord, addressLines: string[]): string {
  const rawPincode = field(record, 'Pincode') || field(record, 'PIN');
  if (rawPincode && /^\d{6}$/.test(rawPincode)) return rawPincode;
  const found = addressLines.find((l) => /(?:^|\D)(\d{6})(?:\D|$)/.test(l));
  if (found) {
    const match = found.match(/(\d{6})/);
    if (match) return match[1];
  }
  return '';
}

// ── 5-Per-A4 Horizontal Strip Component ──────────────────────────────────────
function LabelStrip5({
  record,
  sender,
  showBarcode,
  showItems,
  showCod,
}: {
  record: AirtableRecord;
  sender: SenderConfig;
  showBarcode: boolean;
  showItems: boolean;
  showCod: boolean;
}) {
  const customerName = field(record, 'Name') || 'Customer Name Not Provided';
  const phone = field(record, 'Phone') || '—';
  const addressLines = getAddressLines(record);
  const pincode = extractPincode(record, addressLines);
  const orderId = field(record, 'orderID') || '—';
  const payment = field(record, 'Payment').toUpperCase();
  const isCod = payment.includes('COD');
  const total = Number(record.fields['Total (₹)'] || 0);
  const items = field(record, 'Items');
  const delivery = field(record, 'Delivery');
  const isExpress = delivery.toLowerCase().includes('express');

  return (
    <div className="label-strip-5 relative group">
      {/* Scissor / cut guide tag */}
      <div className="absolute -top-[1.5mm] right-3 bg-white px-1 text-[6pt] text-slate-400 font-mono flex items-center gap-0.5 print:hidden">
        <Scissors className="w-2.5 h-2.5" /> Cut line
      </div>

      {/* LEFT: FROM ADDRESS BOX */}
      <div className="strip-from">
        <div>
          <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
            <span className="font-extrabold tracking-wider text-[7.5pt] text-slate-800 uppercase flex items-center gap-1">
              FROM (SENDER)
            </span>
            <span className="text-[6.5pt] font-semibold bg-slate-200 text-slate-700 px-1 py-0.5 rounded">
              VERIFIED SHIPPER
            </span>
          </div>

          <p className="font-bold text-[9pt] text-slate-950 leading-tight mb-0.5">
            {sender.name}
          </p>
          <p className="text-[7.5pt] font-semibold text-slate-700 flex items-center gap-1 mb-1">
            <Phone className="w-2.5 h-2.5 inline text-slate-500" /> +91 {sender.phone}
          </p>

          <div className="text-[7pt] text-slate-600 leading-snug space-y-0.5">
            {sender.addressLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-1 mt-1 text-[6pt] text-slate-500 leading-tight">
          <p className="italic">{sender.returnNotice}</p>
        </div>
      </div>

      {/* RIGHT: TO CUSTOMER ADDRESS BOX */}
      <div className="strip-to">
        <div>
          {/* Top meta strip */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black tracking-wider text-[8pt] text-blue-700 uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" /> DELIVER TO
              </span>
              <span className="font-mono text-[7.5pt] font-bold text-slate-700">
                #{orderId}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isExpress && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[6.5pt] uppercase tracking-wide border border-amber-300">
                  ⚡ Express
                </span>
              )}
              {isCod ? (
                showCod && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[7pt] uppercase tracking-wide">
                    COD: ₹{total.toLocaleString('en-IN')}
                  </span>
                )
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-extrabold text-[7pt] uppercase tracking-wide">
                  PREPAID
                </span>
              )}
            </div>
          </div>

          {/* Customer Name & Phone */}
          <div className="flex items-baseline justify-between mb-1">
            <p className="font-extrabold text-[10.5pt] text-slate-950 leading-tight truncate max-w-[65%]">
              {customerName}
            </p>
            <p className="text-[8.5pt] font-bold text-slate-900 tabular-nums flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-600" /> +91 {phone}
            </p>
          </div>

          {/* Delivery Address Lines */}
          <div className="text-[7.5pt] text-slate-800 leading-tight max-h-[16mm] overflow-hidden pr-2">
            <p className="font-medium">{addressLines.join(', ')}</p>
          </div>
        </div>

        {/* Bottom Footer: Pincode Block, Barcode & Items */}
        <div className="border-t border-slate-200 pt-1 mt-1 flex items-center justify-between gap-2">
          {/* Pincode prominent badge */}
          <div className="flex items-center gap-1.5 border border-slate-900 rounded bg-slate-950 text-white px-2 py-0.5 shrink-0">
            <span className="text-[6pt] font-bold tracking-wider text-slate-300 uppercase">PIN</span>
            <span className="text-[9.5pt] font-mono font-black tracking-widest text-amber-300">
              {pincode || 'NO PIN'}
            </span>
          </div>

          {/* Items brief */}
          {showItems && items && (
            <div className="flex-1 truncate text-[7pt] text-slate-600 font-medium px-1">
              <span className="text-slate-400 font-semibold mr-1">Items:</span>
              <span title={items}>{items}</span>
            </div>
          )}

          {/* Barcode representation */}
          {showBarcode && (
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-[0.4mm] h-4" aria-hidden="true">
                {orderId.split('').map((ch, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-slate-900"
                    style={{
                      width: idx % 3 === 0 ? '1mm' : '0.4mm',
                      height: '100%',
                      opacity: (ch.charCodeAt(0) % 2 === 0) ? 1 : 0.7,
                    }}
                  />
                ))}
              </div>
              <span className="text-[5.5pt] font-mono font-semibold text-slate-500 tracking-wider">
                {orderId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 6-Per-A4 Grid Label Component (Alternative 2x3 format) ───────────────────
function LabelGrid6({ record, sender }: { record: AirtableRecord; sender: SenderConfig }) {
  const customerName = field(record, 'Name') || 'Customer';
  const phone = field(record, 'Phone') || '—';
  const addressLines = getAddressLines(record);
  const pincode = extractPincode(record, addressLines);
  const orderId = field(record, 'orderID') || '—';
  const payment = field(record, 'Payment').toUpperCase();
  const isCod = payment.includes('COD');
  const total = Number(record.fields['Total (₹)'] || 0);

  return (
    <article className="shipping-label">
      <div className="label-from">
        <span className="label-from-tag">FROM</span>
        <span className="label-from-text">{sender.name} · {sender.phone}</span>
        {isCod ? (
          <span className="ml-auto bg-rose-600 text-white text-[7pt] font-bold px-1 rounded">COD ₹{total}</span>
        ) : (
          <span className="ml-auto bg-emerald-600 text-white text-[7pt] font-bold px-1 rounded">PREPAID</span>
        )}
      </div>

      <div className="label-to">
        <p className="label-heading">DELIVER TO</p>
        <p className="label-name">{customerName}</p>
        <p className="label-phone"><Phone className="label-icon" />{phone}</p>
        <p className="label-address-icon"><MapPin className="label-icon label-map-icon" /><span>{addressLines.map((l, i) => <span className="label-address-line" key={i}>{l}</span>)}</span></p>
      </div>

      <div className="label-footer">
        <div className="label-pincode">
          <span className="label-pincode-label">PINCODE</span>
          <span className="label-pincode-value">{pincode || '—'}</span>
        </div>
        <div className="label-barcode" aria-hidden="true">
          {orderId.split('').map((_, i) => (
            <span key={i} className="label-bar" style={{ opacity: i % 2 ? 1 : 0.4 }} />
          ))}
        </div>
        <p className="label-order-id">{orderId}</p>
      </div>
    </article>
  );
}

// ── Main Bulk Labels Modal ───────────────────────────────────────────────────
export function BulkAddressLabelModal({ records, onClose }: BulkAddressLabelModalProps) {
  const [layout, setLayout] = useState<'5-strip' | '6-grid'>('5-strip');
  const [sender, setSender] = useState<SenderConfig>(getStoredSender);
  const [editingSender, setEditingSender] = useState(false);
  const [senderDraft, setSenderDraft] = useState<SenderConfig>(getStoredSender);

  // Print customization toggles
  const [showBarcode, setShowBarcode] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showCod, setShowCod] = useState(true);

  // In-modal quick filter
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'prepaid' | 'cod'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(records.map((r) => r.id)));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingSender) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, editingSender]);

  // Filtered and selected list
  const activeRecords = useMemo(() => {
    return records.filter((r) => {
      if (!selectedIds.has(r.id)) return false;
      const isCod = field(r, 'Payment').toUpperCase().includes('COD');
      if (paymentFilter === 'cod' && !isCod) return false;
      if (paymentFilter === 'prepaid' && isCod) return false;
      return true;
    });
  }, [records, selectedIds, paymentFilter]);

  // Paginate into groups of 5 (for 5-strip) or 6 (for 6-grid)
  const pageSize = layout === '5-strip' ? 5 : 6;
  const pages: AirtableRecord[][] = useMemo(() => {
    const list: AirtableRecord[][] = [];
    for (let i = 0; i < activeRecords.length; i += pageSize) {
      list.push(activeRecords.slice(i, i + pageSize));
    }
    return list;
  }, [activeRecords, pageSize]);

  const saveSender = () => {
    setSender(senderDraft);
    localStorage.setItem('retralabs_sender_config', JSON.stringify(senderDraft));
    setEditingSender(false);
  };

  const handleSelectCount = (count: number) => {
    const slice = records.slice(0, count);
    setSelectedIds(new Set(slice.map((r) => r.id)));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 print-label-modal flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Top bar with controls */}
        <header className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3.5 bg-slate-50 gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Bulk Shipping & Address Labels
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {layout === '5-strip' ? '5 Per A4 Sheet' : '6 Per A4 Sheet'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {activeRecords.length} customer labels · {pages.length} A4 page{pages.length === 1 ? '' : 's'} ready to print
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Format toggle */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setLayout('5-strip')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  layout === '5-strip' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Print 5 horizontal dispatch slips with full FROM and TO addresses on 1 A4 sheet"
              >
                5 Per Sheet (FROM & TO)
              </button>
              <button
                onClick={() => setLayout('6-grid')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  layout === '6-grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Print 6 standard parcel labels in a 2x3 grid"
              >
                6 Per Sheet (2x3 Grid)
              </button>
            </div>

            {/* Sender editor button */}
            <button
              onClick={() => { setSenderDraft(sender); setEditingSender(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              Edit Sender (FROM)
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={activeRecords.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              Print {pages.length} A4 Sheet{pages.length === 1 ? '' : 's'}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Sub-toolbar: filters & toggles */}
        <div className="border-b border-slate-200 px-4 sm:px-6 py-2 bg-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Quick Filter:
            </span>
            {(['all', 'prepaid', 'cod'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPaymentFilter(p)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  paymentFilter === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'all' ? 'All Orders' : p === 'prepaid' ? 'Prepaid Only' : 'COD Only'}
              </button>
            ))}

            <span className="text-slate-300 mx-1">|</span>

            <span className="text-slate-500 font-semibold">Select:</span>
            <button onClick={() => setSelectedIds(new Set(records.map((r) => r.id)))} className="hover:text-blue-600 underline font-medium">All ({records.length})</button>
            <button onClick={() => handleSelectCount(5)} className="hover:text-blue-600 underline font-medium">First 5 (1 Sheet)</button>
            <button onClick={() => handleSelectCount(10)} className="hover:text-blue-600 underline font-medium">First 10 (2 Sheets)</button>
            <button onClick={() => handleSelectCount(15)} className="hover:text-blue-600 underline font-medium">First 15 (3 Sheets)</button>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} className="rounded text-blue-600 accent-blue-600" />
              <span>Barcodes</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showItems} onChange={(e) => setShowItems(e.target.checked)} className="rounded text-blue-600 accent-blue-600" />
              <span>Item Names</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showCod} onChange={(e) => setShowCod(e.target.checked)} className="rounded text-blue-600 accent-blue-600" />
              <span>COD Badges</span>
            </label>
          </div>
        </div>

        {/* Modal content body: Preview sheets */}
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-6 md:p-8 print-label-scroll">
          {activeRecords.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl">
              <Package className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">No orders selected for printing</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose orders from the table or reset the payment filter above to generate address labels.
              </p>
              <button
                onClick={() => { setSelectedIds(new Set(records.map((r) => r.id))); setPaymentFilter('all'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Reset selection to all ({records.length}) orders
              </button>
            </div>
          ) : (
            <div className="space-y-8 flex flex-col items-center">
              {pages.map((pageRecords, pageIdx) => (
                <div key={pageIdx} className="flex flex-col items-center">
                  <div className="text-[11px] font-bold text-slate-500 mb-2 tracking-wide uppercase print:hidden">
                    — A4 Page {pageIdx + 1} of {pages.length} ({pageRecords.length} customer labels) —
                  </div>

                  {layout === '5-strip' ? (
                    <div className="labels-5-page bg-white shadow-xl p-3 sm:p-4 rounded-sm border border-slate-300">
                      {pageRecords.map((r) => (
                        <LabelStrip5
                          key={r.id}
                          record={r}
                          sender={sender}
                          showBarcode={showBarcode}
                          showItems={showItems}
                          showCod={showCod}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="labels-print-page bg-white shadow-xl p-3 sm:p-4 rounded-sm border border-slate-300">
                      {pageRecords.map((r) => (
                        <LabelGrid6 key={r.id} record={r} sender={sender} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Sender Slide-over / Modal */}
      {editingSender && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-[fadeIn_0.15s_ease]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                Customize Sender (FROM) Address
              </h3>
              <button onClick={() => setEditingSender(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase tracking-wide">Company / Sender Name</label>
                <input
                  type="text"
                  value={senderDraft.name}
                  onChange={(e) => setSenderDraft({ ...senderDraft, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase tracking-wide">Sender Phone Number</label>
                <input
                  type="text"
                  value={senderDraft.phone}
                  onChange={(e) => setSenderDraft({ ...senderDraft, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase tracking-wide">Address Lines (One per line)</label>
                <textarea
                  rows={3}
                  value={senderDraft.addressLines.join('\n')}
                  onChange={(e) => setSenderDraft({ ...senderDraft, addressLines: e.target.value.split('\n') })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase tracking-wide">Return to Sender Notice</label>
                <input
                  type="text"
                  value={senderDraft.returnNotice}
                  onChange={(e) => setSenderDraft({ ...senderDraft, returnNotice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSenderDraft(DEFAULT_SENDER)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset Default
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSender(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSender}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
