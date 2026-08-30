import { useEffect } from 'react';
import { Printer, X, MapPin, Phone } from 'lucide-react';
import type { AirtableRecord } from './types';

interface PrepaidLabelsModalProps {
  records: AirtableRecord[];
  onClose: () => void;
}

const SENDER = {
  name: 'RetraLabs',
  phone: '6360489397',
  address: ['Rajareddy layout 1st cross', 'Shanti layout 8th cross', 'Ramamurthy Nagar, Bengaluru 560016'],
};

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

function Label({ record }: { record: AirtableRecord }) {
  const customerName = field(record, 'Name') || 'Customer name not provided';
  const phone = field(record, 'Phone') || 'Phone not provided';
  const addressLines = getAddressLines(record);
  const orderId = field(record, 'orderID') || '—';
  const pincode = (addressLines.find((l) => /^\d{6}$/.test(l.replace(/[^0-9]/g, ''))) || '').replace(/[^0-9]/g, '');

  return (
    <article className="shipping-label">
      {/* Compact FROM strip */}
      <div className="label-from">
        <span className="label-from-tag">FROM</span>
        <span className="label-from-text">{SENDER.name} · {SENDER.phone}</span>
      </div>

      {/* Dominant TO section */}
      <div className="label-to">
        <p className="label-heading">DELIVER TO</p>
        <p className="label-name">{customerName}</p>
        <p className="label-phone"><Phone className="label-icon" />{phone}</p>
        <p className="label-address-icon"><MapPin className="label-icon label-map-icon" /><span>{addressLines.map((line) => <span className="label-address-line" key={line}>{line}</span>)}</span></p>
      </div>

      {/* Barcode-style order footer */}
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

export function PrepaidLabelsModal({ records, onClose }: PrepaidLabelsModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (records.length === 0) return null;

  const pages: AirtableRecord[][] = [];
  for (let index = 0; index < records.length; index += 6) pages.push(records.slice(index, index + 6));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 p-3 sm:p-6 print-label-modal">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Prepaid shipping labels</h2>
            <p className="mt-0.5 text-xs text-slate-500">{records.length} label{records.length === 1 ? '' : 's'} · six labels fit on each A4 sheet</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
            >
              <Printer className="h-4 w-4" />
              Print A4 labels
            </button>
            <button type="button" onClick={onClose} aria-label="Close label preview" className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 print-label-scroll">
          {pages.map((page, pageIndex) => (
            <div className="labels-print-page" key={pageIndex}>
              {page.map((record) => <Label key={record.id} record={record} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
