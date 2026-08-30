import { Zap, Package, CreditCard, Banknote } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  'New':                   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending' },
  'Created in Innofulfill': { bg: 'bg-sky-50',    text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'Created' },
  'AWB_ASSIGNED':          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'AWB Assigned' },
  'AWB_PENDING':           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'AWB Pending' },
  'PROCESSING':            { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Processing' },
  'Confirmed':             { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Confirmed' },
  'Paid':                  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
  'Shipped':               { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'Shipped' },
  'Delivered':             { bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500',   label: 'Delivered' },
  'Cancelled':             { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Cancelled' },
  'FAILED':                { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Failed' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['New'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function DeliveryBadge({ delivery }: { delivery: string }) {
  const express = String(delivery || '').toLowerCase().includes('express');
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
        express ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {express ? <Zap className="w-3 h-3" /> : <Package className="w-3 h-3" />}
      {express ? 'Express' : 'Standard'}
    </span>
  );
}

export function PaymentBadge({ payment }: { payment: string }) {
  const p = String(payment || '').toUpperCase();
  const isCod = p.includes('COD');
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
        isCod ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
      }`}
    >
      {isCod ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
      {isCod ? 'COD' : 'UPI'}
    </span>
  );
}

export function statusColor(status: string): string {
  return STATUS_STYLES[status]?.dot ?? 'bg-slate-400';
}
