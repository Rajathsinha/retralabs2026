import { adminFetch, updateAdminOrders } from '../../utils/adminAuth';
import {
  X,
  Copy,
  Printer,
  ExternalLink,
  Truck,
  FileText,
  MapPin,
  CreditCard,
  User,
  Clock,
  StickyNote,
  Trash2,
  Wand2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { StatusBadge, DeliveryBadge, PaymentBadge, PaymentStatusBadge } from './badges';
import type { AirtableRecord, AirtableAttachment } from './types';
import { formatOrderRecord } from '../../utils/orderDataFormatter';

interface OrderDrawerProps {
  record: AirtableRecord | null;
  onClose: () => void;
  onPrintInvoice?: (record: AirtableRecord) => void;
  onPrintLabel?: (record: AirtableRecord) => void;
  onDeleteOrder?: (record: AirtableRecord) => Promise<void> | void;
  onOrderUpdated?: () => Promise<void> | void;
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
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch (e) { console.debug('Copy failed', e); }
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

export function OrderDrawer({
  record,
  onClose,
  onPrintInvoice,
  onPrintLabel,
  onDeleteOrder,
  onOrderUpdated,
}: OrderDrawerProps) {
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localRecord, setLocalRecord] = useState<AirtableRecord | null>(record);
  const [formatting, setFormatting] = useState(false);
  const [formatSuccess, setFormatSuccess] = useState(false);
  const [pushingShiprocket, setPushingShiprocket] = useState(false);
  const [pushingInnofulfill, setPushingInnofulfill] = useState(false);
  const [sessionPushedShiprocket, setSessionPushedShiprocket] = useState(false);
  const [sessionPushedInnofulfill, setSessionPushedInnofulfill] = useState(false);
  const [pushSuccessMsg, setPushSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecord(record);
    setFormatSuccess(false);
    setSessionPushedShiprocket(false);
    setSessionPushedInnofulfill(false);
    setPushSuccessMsg(null);
  }, [record]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (record) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, onClose]);

  const activeRecord = localRecord || record;

  // Logistics pushed status detection
  const isInnofulfillPushed = useMemo(() => {
    if (!activeRecord) return false;
    if (sessionPushedInnofulfill) return true;
    const f = activeRecord.fields;
    const innoId = String(f['Innofulfill Order ID'] ?? '').trim();
    const provider = String(f['Courier Provider'] ?? '').trim();
    const status = String(f['Status'] ?? '').toLowerCase();
    const carrier = String(f['Carrier Display Name'] ?? '').toLowerCase();
    return Boolean(
      innoId ||
      provider === 'Innofulfill' ||
      carrier.includes('innofulfill') ||
      status.includes('innofulfill')
    );
  }, [sessionPushedInnofulfill, activeRecord]);

  const isShiprocketPushed = useMemo(() => {
    if (!activeRecord) return false;
    if (sessionPushedShiprocket) return true;
    const f = activeRecord.fields;
    const provider = String(f['Courier Provider'] ?? '').trim();
    const carrier = String(f['Carrier Display Name'] ?? '').toLowerCase();
    const trackingId = String(f['Tracking ID'] ?? '').trim();
    const awb = String(f['AWB Number'] ?? '').trim();
    const innoId = String(f['Innofulfill Order ID'] ?? '').trim();
    return Boolean(
      provider === 'Shiprocket' ||
      carrier.includes('shiprocket') ||
      (!innoId && provider !== 'Innofulfill' && (trackingId || (awb && !/^RETRA-\d{8}-\d{4}$/i.test(awb))))
    );
  }, [sessionPushedShiprocket, activeRecord]);

  // Compute AI formatting
  const formattedOrder = useMemo(() => {
    if (!activeRecord) return null;
    return formatOrderRecord(activeRecord);
  }, [activeRecord]);

  if (!activeRecord) return null;

  const f = activeRecord.fields;
  const screenshots = f['Screenshot'] as AirtableAttachment[] | undefined;
  const phone = String(f['Phone'] ?? '');
  const address = String(f['Address'] ?? '');
  const tracking = String(f['Tracking ID'] ?? '');
  const paymentStatus = String(f['Payment Status'] ?? '');
  const awbRaw = f['AWB Number'] ? String(f['AWB Number']) : '';
  const awbDisplay = awbRaw && !/^RETRA-\d{8}-\d{4}$/i.test(awbRaw)
    ? awbRaw
    : (f['Innofulfill Order ID'] ? 'Awaiting shipment assignment' : '—');

  const handlePushToShiprocket = async () => {
    if (pushingShiprocket || pushingInnofulfill) return;

    if (isShiprocketPushed) {
      const confirmPush = window.confirm(
        "This order is already pushed to Shiprocket. Do you want to push again?"
      );
      if (!confirmPush) return;
    } else if (isInnofulfillPushed) {
      const confirmPush = window.confirm(
        "This order is already pushed to Innofulfill. Are you sure you want to push it to Shiprocket as well?"
      );
      if (!confirmPush) return;
    } else if (f['AWB Number'] || f['Tracking ID'] || f['Innofulfill Order ID']) {
      const confirmPush = window.confirm(
        "This order already has logistics tracking assigned. Are you sure you want to push it to Shiprocket?"
      );
      if (!confirmPush) return;
    }

    setPushingShiprocket(true);
    setPushSuccessMsg(null);
    try {
      const res = await adminFetch('/api/push-to-shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: activeRecord.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to push to Shiprocket');

      setSessionPushedShiprocket(true);
      const awb = json.shiprocket?.awb_code ? String(json.shiprocket.awb_code) : '';
      const shipmentId = json.shiprocket?.shipment_id ? String(json.shiprocket.shipment_id) : '';

      setLocalRecord((prev) => prev ? ({
        ...prev,
        fields: {
          ...prev.fields,
          ...(awb ? { 'AWB Number': awb } : {}),
          ...(shipmentId ? { 'Tracking ID': shipmentId } : {}),
          'Carrier Display Name': 'Shiprocket (Manual Push)',
          'Courier Provider': 'Shiprocket',
          Status: 'Shipped',
        }
      }) : null);

      const awbText = awb ? ` (AWB: ${awb})` : '';
      setPushSuccessMsg(`✅ Successfully pushed to Shiprocket${awbText}`);
      await onOrderUpdated?.();
    } catch (err) {
      alert(String(err));
    } finally {
      setPushingShiprocket(false);
    }
  };

  const handlePushToInnofulfill = async () => {
    if (pushingShiprocket || pushingInnofulfill) return;

    let allowDuplicate = false;
    if (isInnofulfillPushed) {
      const confirmPush = window.confirm(
        "This order is already pushed to Innofulfill. Do you want to push again?"
      );
      if (!confirmPush) return;
      allowDuplicate = true;
    } else if (isShiprocketPushed) {
      const confirmPush = window.confirm(
        "This order is already pushed to Shiprocket. Are you sure you want to push it to Innofulfill as well?"
      );
      if (!confirmPush) return;
      allowDuplicate = true;
    }

    setPushingInnofulfill(true);
    setPushSuccessMsg(null);
    try {
      const res = await adminFetch('/api/push-to-innofulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: activeRecord.id, allowDuplicate })
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.duplicate) {
          const force = window.confirm(
            `⚠️ DUPLICATE WARNING:\n\n${json.error}\n\nDo you want to force push this duplicate anyway?`
          );
          if (force) {
            const forceRes = await adminFetch('/api/push-to-innofulfill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recordId: activeRecord.id, allowDuplicate: true })
            });
            const forceJson = await forceRes.json();
            if (!forceRes.ok) throw new Error(forceJson.error || 'Failed to force push');

            setSessionPushedInnofulfill(true);
            setLocalRecord((prev) => prev ? ({
              ...prev,
              fields: {
                ...prev.fields,
                'Innofulfill Order ID': String(forceJson.innofulfill?.innofulfillOrderId || prev.fields['Innofulfill Order ID'] || ''),
                'Courier Provider': 'Innofulfill',
                'Carrier Display Name': forceJson.innofulfill?.carrierDisplayName || 'Innofulfill',
                Status: 'Created in Innofulfill',
                ...(forceJson.innofulfill?.awbNumber ? { 'AWB Number': forceJson.innofulfill.awbNumber, 'Tracking ID': forceJson.innofulfill.awbNumber } : {}),
              }
            }) : null);

            const awbText = forceJson.awbNumber ? ` (AWB: ${forceJson.awbNumber})` : '';
            setPushSuccessMsg(`✅ Successfully pushed to Innofulfill${awbText}`);
            await onOrderUpdated?.();
            return;
          } else {
            return;
          }
        }

        if (json.unserviceable) {
          alert(`❌ INNOFULFILL UNSERVICEABLE:\n\n${json.error}`);
          return;
        }

        throw new Error(json.error || 'Failed to push to Innofulfill');
      }

      setSessionPushedInnofulfill(true);
      setLocalRecord((prev) => prev ? ({
        ...prev,
        fields: {
          ...prev.fields,
          'Innofulfill Order ID': String(json.innofulfill?.innofulfillOrderId || prev.fields['Innofulfill Order ID'] || ''),
          'Courier Provider': 'Innofulfill',
          'Carrier Display Name': json.innofulfill?.carrierDisplayName || 'Innofulfill',
          Status: 'Created in Innofulfill',
          ...(json.innofulfill?.awbNumber ? { 'AWB Number': json.innofulfill.awbNumber, 'Tracking ID': json.innofulfill.awbNumber } : {}),
        }
      }) : null);

      const awbText = json.awbNumber ? ` (AWB: ${json.awbNumber})` : '';
      setPushSuccessMsg(`✅ Successfully pushed to Innofulfill${awbText}`);
      await onOrderUpdated?.();
    } catch (err) {
      alert(String(err));
    } finally {
      setPushingInnofulfill(false);
    }
  };

  const handleApplyFormatting = async () => {
    if (!formattedOrder || !formattedOrder.hasChanges) return;
    setFormatting(true);
    try {
      const updates: Record<string, string> = {};
      if (formattedOrder.name.changed) updates['Name'] = formattedOrder.name.formatted;
      if (formattedOrder.phone.changed) updates['Phone'] = formattedOrder.phone.formatted;
      if (formattedOrder.address.changed) updates['Address'] = formattedOrder.address.formatted;

      const res = await updateAdminOrders([{ id: activeRecord.id, fields: updates }]);
      if (!res.success && res.error) {
        throw new Error(res.error);
      }

      setLocalRecord((prev) =>
        prev ? { ...prev, fields: { ...prev.fields, ...updates } } : null
      );
      setFormatSuccess(true);
      await onOrderUpdated?.();
    } catch (err) {
      alert(String(err));
    } finally {
      setFormatting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!window.confirm('Confirm that payment proof has been verified for this order?')) return;
    setVerifying(true);
    try {
      const res = await adminFetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: activeRecord.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Verification failed');
      alert(json.duplicate ? 'Payment was already confirmed.' : 'Payment verified. Order will proceed to fulfillment.');
      onClose();
    } catch (err) {
      alert(String(err));
    } finally {
      setVerifying(false);
    }
  };

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
            {paymentStatus && <PaymentStatusBadge status={paymentStatus} />}
            <PaymentBadge payment={String(f['Payment'] ?? '')} />
            <DeliveryBadge delivery={String(f['Delivery'] ?? '')} />
          </div>

          {/* Smart AI Formatter card */}
          {formattedOrder && (
            <div className="mx-5 mt-4 p-3.5 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                    <Wand2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-950">Smart AI Formatter</span>
                    <p className="text-[10px] text-slate-500">Standardize Customer Name, 10-digit Phone, & Address</p>
                  </div>
                </div>
                {formattedOrder.hasChanges ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {formattedOrder.changeSummary.length} change{formattedOrder.changeSummary.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Standardized
                  </span>
                )}
              </div>

              {formattedOrder.hasChanges && (
                <div className="space-y-2 text-xs mb-3 bg-white/90 rounded-lg p-2.5 border border-indigo-100/70">
                  {formattedOrder.phone.changed && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone (+91 → 10 digits)</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-rose-500 line-through text-[11px]">{formattedOrder.phone.current}</span>
                        <span className="text-slate-400 text-[10px]">→</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-xs">
                          {formattedOrder.phone.formatted}
                        </span>
                      </div>
                    </div>
                  )}
                  {formattedOrder.name.changed && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Customer Name (Title Case)</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-rose-500 line-through text-[11px]">{formattedOrder.name.current}</span>
                        <span className="text-slate-400 text-[10px]">→</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-xs">
                          {formattedOrder.name.formatted}
                        </span>
                      </div>
                    </div>
                  )}
                  {formattedOrder.address.changed && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Clean Address</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-rose-500 line-through text-[11px] break-words">{formattedOrder.address.current}</span>
                        <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-1 rounded border border-emerald-200 text-xs leading-relaxed break-words">
                          {formattedOrder.address.formatted}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formattedOrder.hasChanges ? (
                <button
                  type="button"
                  disabled={formatting}
                  onClick={handleApplyFormatting}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {formatting ? 'Applying AI Formatting...' : 'Apply AI Format (Save to Airtable)'}
                </button>
              ) : formatSuccess ? (
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Changes saved to Airtable!
                </div>
              ) : null}
            </div>
          )}

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
            <Row label="Payment Status" value={paymentStatus ? paymentStatus.replace(/_/g, ' ') : '—'} />
            <Row label="Transaction" value={String(f['Transaction'] ?? '—')} />
            {paymentStatus === 'PAYMENT_PROOF_SUBMITTED' && (
              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={verifying}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify Payment'}
              </button>
            )}
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
            <Row label="Courier Provider" value={String(f['Courier Provider'] ?? (String(f['Carrier Display Name'] ?? '').includes('Shiprocket') ? 'Shiprocket' : 'Innofulfill'))} />
            <Row label="Courier" value={String(f['Carrier Display Name'] ?? f['Courier Provider'] ?? f['Courier'] ?? 'Shiprocket')} />
            <Row label="Shipment Status" value={String(f['Shipment Status'] ?? (f['Innofulfill Order ID'] ? 'AWB_PENDING' : 'NOT_CREATED'))} />
            <Row label="Document No." value={String(f['orderID'] ?? '—')} />
            <Row label="AWB Number" value={awbDisplay} />
            <Row label="Booking / Order ID" value={String(f['Innofulfill Order ID'] ?? '—')} />
            {f['Innofulfill Internal ID'] && (
              <Row label="Internal ID" value={String(f['Innofulfill Internal ID'])} />
            )}
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
          {pushSuccessMsg && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-[fadeIn_0.15s_ease]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pushSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setPushSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Push to Shiprocket Button */}
            <button
              type="button"
              onClick={handlePushToShiprocket}
              disabled={pushingShiprocket || pushingInnofulfill}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                isShiprocketPushed
                  ? 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200/90 shadow-sm cursor-pointer'
                  : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm shadow-blue-500/20'
              }`}
              title={isShiprocketPushed ? "Already pushed to Shiprocket. Click to push again." : "Push order to Shiprocket"}
            >
              {pushingShiprocket ? (
                <span className="animate-pulse flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Pushing...
                </span>
              ) : isShiprocketPushed ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Push to Shiprocket</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">
                    Pushed
                  </span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Push to Shiprocket</span>
                </>
              )}
            </button>

            {/* Push to Innofulfill Button */}
            <button
              type="button"
              onClick={handlePushToInnofulfill}
              disabled={pushingShiprocket || pushingInnofulfill}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                isInnofulfillPushed
                  ? 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200/90 shadow-sm cursor-pointer'
                  : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm shadow-blue-500/20'
              }`}
              title={isInnofulfillPushed ? "Already pushed to Innofulfill. Click to push again." : "Push order to Innofulfill"}
            >
              {pushingInnofulfill ? (
                <span className="animate-pulse flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking PIN...
                </span>
              ) : isInnofulfillPushed ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Push to Innofulfill</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">
                    Pushed
                  </span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Push to Innofulfill</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onPrintInvoice?.(activeRecord)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
            <button
              type="button"
              onClick={() => onPrintLabel?.(activeRecord)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-4 h-4" /> Print Address Slip
            </button>
          </div>

          {/* Quick Communication: WhatsApp & Phone */}
          {phone && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Outreach</p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                    `Hi ${String(f['Name'] ?? 'Customer')}, this is RetraLabs regarding your order #${String(f['orderID'] ?? '')}. Everything is confirmed and being prepared for dispatch!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  💬 WhatsApp Customer
                </a>
                <a
                  href={`tel:+91${phone.replace(/\D/g, '').slice(-10)}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  📞 Call Customer
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <CopyBtn text={address} label="Address" />
            <CopyBtn text={phone} label="Phone" />
            <CopyBtn text={tracking} label="Tracking" />
          </div>
          <a href={AIRTABLE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-white transition-colors">
            <ExternalLink className="w-4 h-4" /> Open in Airtable
          </a>
          {onDeleteOrder && (
            <button
              onClick={async () => {
                const orderId = String(f['orderID'] ?? activeRecord.id);
                if (window.confirm(`Are you sure you want to permanently delete order #${orderId} from Airtable? This cannot be undone.`)) {
                  try {
                    setDeleting(true);
                    await onDeleteOrder(activeRecord);
                    onClose();
                  } catch (err) {
                    alert(String(err));
                  } finally {
                    setDeleting(false);
                  }
                }
              }}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              {deleting ? 'Deleting from Airtable...' : 'Delete Order'}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } } }`}</style>
    </div>
  );
}
