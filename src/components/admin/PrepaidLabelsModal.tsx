import { useEffect } from 'react';
import { Printer, X, MapPin, Phone } from 'lucide-react';
import type { AirtableRecord } from './types';

interface PrepaidLabelsModalProps {
  records: AirtableRecord[];
  onClose: () => void;
}

const SENDER = {
  name: 'Ashish',
  phone: '7019917927',
  address: ['Shanti Layout 8th Cross', 'Rammurthy Nagar', 'Bangalore 560016'],
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

  return (
    <article className="shipping-label">
      <div className="label-block">
        <p className="label-heading">FROM</p>
        <p className="label-name">{SENDER.name}</p>
        <p className="label-phone"><Phone className="label-icon" />{SENDER.phone}</p>
        {SENDER.address.map((line) => <p key={line} className="label-line">{line}</p>)}
      </div>

      <div className="label-divider" />

      <div className="label-block label-to">
        <p className="label-heading">TO</p>
        <p className="label-name">{customerName}</p>
        <p className="label-phone"><Phone className="label-icon" />{phone}</p>
        <p className="label-address-icon"><MapPin className="label-icon label-map-icon" /><span>{addressLines.map((line) => <span className="label-address-line" key={line}>{line}</span>)}</span></p>
      </div>

      <p className="label-order">{field(record, 'orderID')}</p>
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
