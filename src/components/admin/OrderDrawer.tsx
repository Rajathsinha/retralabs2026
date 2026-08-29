import { X, Copy, Printer, ExternalLink, Truck, Phone, FileText, MapPin, CreditCard, User, Clock, StickyNote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge, DeliveryBadge, PaymentBadge } from './badges';
import type { AirtableRecord, AirtableAttachment } from './types';

interface OrderDrawerProps {
  record: AirtableRecord | null;
  onClose: () => void;
}

const AIRTABLE_URL = 'https://airtable.com/appzoLMmoFxy53cKx/tbly4OWpkoz6E7OW0/viwi9NXrMheloOfuD?blocks=hide';

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-4 h-4 text-slate-400" />
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right break-words">{value}</span>
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {}
  };
  return (
    <button onClick={copy} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
      {done ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      {done ? 'Copied' : label}
    </button>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  );
}

export function OrderDrawer({ record, onClose }: OrderDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (record) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, onClose]);

  if (!record) return null;
  const f = record.fields;
  const screenshots = f['Screenshot'] as AirtableAttachment[] | undefined;
  const phone = String(f['Phone'] ?? '');
  const address = String(f['Address'] ?? '');
  const tracking = String(f['Tracking ID'] ?? '');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-[slideIn_0.25s_ease]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Order</p>
            <h3 className="text-lg font-bold text-slate-900">{String(f['orderID'] ?? '—')}</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status pills */}
          <div className="px-5 py-4 flex flex-wrap gap-2 border-b border-slate-100">
            <StatusBadge status={String(f['Status'] ?? 'New')} />
            <PaymentBadge payment={String(f['Payment'] ?? '')} />
            <DeliveryBadge delivery={String(f['Delivery'] ?? '')} />
          </div>

          <Section icon={User} title="Customer">
            <Row label="Name" value={String(f['Name'] ?? '—')} />
            <Row label="Phone" value={phone || '—'} />
            <Row label="Email" value={String(f['Email'] ?? '—')} />
            <Row label="Referral" value={String(f['Referral'] ?? '—')} />
          </Section>

          <Section icon={MapPin} title="Address">
            <p className="text-sm text-slate-900 font-medium leading-relaxed">{address || '—'}</p>
          </Section>

          <Section icon={FileText} title="Products">
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{String(f['Items'] ?? '—')}</p>
            <div className="mt-2"><Row label="Total" value={`₹${Number(f['Total (₹)'] || 0).toLocaleString('en-IN')}`} /></div>
          </Section>

          <Section icon={CreditCard} title="Payment">
            <Row label="Method" value={String(f['Payment'] ?? '—')} />
            <Row label="Transaction" value={String(f['Transaction'] ?? '—')} />
            {screenshots && screenshots.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {screenshots.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                    <img src={att.thumbnails?.small?.url || att.url} alt="Payment" className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:border-[#2563EB] transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Truck} title="Tracking">
            <Row label="Innofulfill Order ID" value={String(f['Innofulfill Order ID'] ?? '—')} />
            <Row label="AWB Number" value={String(f['AWB Number'] ?? '—')} />
            <Row label="Tracking ID" value={tracking || '—'} />
            {f['Innofulfill Error'] && String(f['Innofulfill Error']) !== '—' && (
              <p className="mt-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 break-words">{String(f['Innofulfill Error'])}</p>
            )}
          </Section>

          <Section icon={Clock} title="Timeline">
            <div className="space-y-2.5">
              {[
                { label: 'Order placed', date: String(f['Created'] ?? '—') },
                { label: 'Status', date: String(f['Status'] ?? '—') },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.label}</p>
                    <p className="text-xs text-slate-400">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={StickyNote} title="Notes">
            <p className="text-sm text-slate-400">No notes added yet.</p>
          </Section>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors">
              <FileText className="w-4 h-4" /> Generate Label
            </button>
            <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <CopyBtn text={address} label="Address" />
            <CopyBtn text={phone} label="Phone" />
            <CopyBtn text={tracking} label="Tracking" />
          </div>
          <a href={AIRTABLE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-white transition-colors">
            <ExternalLink className="w-4 h-4" /> Open in Airtable
          </a>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } } }`}</style>
    </div>
  );
}
