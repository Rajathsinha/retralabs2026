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
  'ORDER_CREATED':         { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Created' },
  'PAYMENT_CONFIRMED':     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
  'INNOFULFILL_PROCESSING': { bg: 'bg-blue-50',   text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Processing' },
  'INNOFULFILL_CREATED':   { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'Booked' },
  'SHIPPED':               { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'Shipped' },
  'IN_TRANSIT':            { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'In Transit' },
  'OUT_FOR_DELIVERY':      { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Out for Delivery' },
};

const PAYMENT_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PAYMENT_PENDING: { bg: 'bg-amber-100', text: 'text-amber-800' },
  PAYMENT_PROOF_SUBMITTED: { bg: 'bg-orange-100', text: 'text-orange-800' },
  PAYMENT_CONFIRMED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  PAYMENT_EXPIRED: { bg: 'bg-rose-100', text: 'text-rose-800' },
  PAYMENT_FAILED: { bg: 'bg-rose-100', text: 'text-rose-800' },
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-tight ${
        isCod
          ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs'
          : 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs'
      }`}
    >
      {isCod ? <Banknote className="w-3.5 h-3.5 text-amber-700" /> : <CreditCard className="w-3.5 h-3.5 text-emerald-700" />}
      {isCod ? 'COD' : 'UPI / Prepaid'}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const key = String(status || '').toUpperCase();
  const style = PAYMENT_STATUS_STYLES[key] || { bg: 'bg-slate-100', text: 'text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${style.bg} ${style.text}`}>
      {key.replace(/_/g, ' ') || 'UNKNOWN'}
    </span>
  );
}

export function statusColor(status: string): string {
  return STATUS_STYLES[status]?.dot ?? 'bg-slate-400';
}
