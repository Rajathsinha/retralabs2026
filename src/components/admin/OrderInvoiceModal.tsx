import { useEffect } from 'react';
import { Printer, X, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { AirtableRecord } from './types';

interface OrderInvoiceModalProps {
  records: AirtableRecord[];
  onClose: () => void;
}

function field(record: AirtableRecord, key: string): string {
  return String(record.fields[key] ?? '').trim();
}

function InvoiceSheet({ record }: { record: AirtableRecord }) {
  const f = record.fields;
  const orderId = field(record, 'orderID') || record.id.slice(-8).toUpperCase();
  const created = field(record, 'Created') || new Date().toISOString().slice(0, 10);
  const name = field(record, 'Name') || 'Valued Customer';
  const phone = field(record, 'Phone') || '—';
  const email = field(record, 'Email') || '—';
  const address = field(record, 'Address') || '—';
  const payment = field(record, 'Payment') || 'Prepaid';
  const total = Number(f['Total (₹)'] || 0);
  const delivery = field(record, 'Delivery') || 'Standard';
  const tracking = field(record, 'AWB Number') || field(record, 'Tracking ID') || 'Pending';
  const itemsRaw = field(record, 'Items') || 'Research Product';

  // Parse items
  const itemsList = itemsRaw.split(/[,;]/).map((item) => item.trim()).filter(Boolean);

  return (
    <div className="invoice-print-page bg-white shadow-xl rounded-sm border border-slate-300 mb-8 mx-auto flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-sm">
                R
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">RetraLabs</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Premium Research Peptides & Biomolecules</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Bengaluru, Karnataka, India · support@retralabs.com</p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded mb-1">
              Packing Slip / Invoice
            </span>
            <p className="font-mono text-sm font-bold text-slate-900">#{orderId}</p>
            <p className="text-xs text-slate-500 mt-0.5">Date: {created}</p>
          </div>
        </div>

        {/* Addresses Grid */}
        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50/80 rounded-xl border border-slate-200 mb-6 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
              Shipped / Dispatched From
            </span>
            <p className="font-bold text-slate-900 text-sm">RetraLabs Fulfillment Hub</p>
            <p className="text-slate-600 mt-0.5">Rajareddy layout 1st cross, Shanti layout</p>
            <p className="text-slate-600">Ramamurthy Nagar, Bengaluru, KA 560016</p>
            <p className="text-slate-600 font-medium mt-1">Contact: +91 6360489397</p>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
              Deliver To (Customer)
            </span>
            <p className="font-bold text-slate-900 text-sm">{name}</p>
            <p className="text-slate-700 mt-0.5 leading-relaxed">{address}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-slate-600 font-medium">
              <span>Phone: +91 {phone}</span>
              {email !== '—' && <span>Email: {email}</span>}
            </div>
          </div>
        </div>

        {/* Order Details Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 mb-5">
          <div>
            <span className="text-slate-500 mr-1.5 font-normal">Payment Method:</span>
            <span className="font-bold text-slate-900">{payment}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5 font-normal">Shipping Speed:</span>
            <span className="font-bold text-slate-900">{delivery}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5 font-normal">AWB / Tracking:</span>
            <span className="font-mono font-bold text-slate-900">{tracking}</span>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-2.5 w-12 text-center">#</th>
                <th className="px-4 py-2.5">Item Description</th>
                <th className="px-4 py-2.5 text-center w-20">Qty</th>
                <th className="px-4 py-2.5 text-right w-28">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {itemsList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item}</td>
                  <td className="px-4 py-3 text-center font-bold">1</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Box */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Subtotal</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Shipping & Handling</span>
              <span className="text-emerald-600 font-semibold">{delivery.toLowerCase().includes('express') ? 'Included' : 'Free'}</span>
            </div>
            <div className="flex justify-between py-2 text-sm font-black text-slate-900 border-b-2 border-slate-900">
              <span>Total Amount</span>
              <span className="text-blue-700">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-[10px] text-slate-500 text-right italic pt-0.5">
              {payment.toUpperCase().includes('COD') ? 'Amount to be collected on delivery' : 'Payment received in full'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer & Verification */}
      <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>All peptides supplied for in-vitro laboratory research and reference use only.</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-slate-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Quality Verified & Packed
        </div>
      </div>
    </div>
  );
}

export function OrderInvoiceModal({ records, onClose }: OrderInvoiceModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (records.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 print-label-modal flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Customer Invoice & Packing Slips</h2>
              <p className="text-xs text-slate-500">
                {records.length} document{records.length === 1 ? '' : 's'} ready for print / export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-xs"
            >
              <Printer className="h-4 w-4" />
              Print Invoices
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 print-label-scroll">
          {records.map((r) => (
            <InvoiceSheet key={r.id} record={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
