import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Clock3,
  Copy,
  FileImage,
  Loader2,
  LockKeyhole,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { PAYMENT_SESSION_SECONDS } from '../constants/payment';

const UPI_ID = 'retralabs@ptaxis';
const COUNTDOWN_SECONDS = PAYMENT_SESSION_SECONDS;
const SUPPORTED_APPS_LABEL = 'Google Pay • PhonePe • Paytm • BHIM • Any UPI app';

type Stage = 'idle' | 'verifying' | 'success' | 'expired';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onConfirm: (txnRef: string, screenshot: File | null) => Promise<void>;
  whatsappUrl: string;
}

export default function UpiQrModal({ isOpen, onClose, amount, onConfirm, whatsappUrl }: UpiQrModalProps) {
  const [txnRef, setTxnRef] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [stage, setStage] = useState<Stage>('idle');
  const [mounted, setMounted] = useState(false);
  const [fileError, setFileError] = useState('');
  const [toast, setToast] = useState('');
  const [utrMissing, setUtrMissing] = useState(false);
  const [screenshotMissing, setScreenshotMissing] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [stillProcessing, setStillProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utrFieldRef = useRef<HTMLInputElement>(null);
  const screenshotButtonRef = useRef<HTMLButtonElement>(null);
  const stillProcessingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setStage('idle');
      setSecondsLeft(COUNTDOWN_SECONDS);
      setTxnRef('');
      setScreenshot(null);
      setScreenshotUrl(null);
      setFileError('');
      setUtrMissing(false);
      setScreenshotMissing(false);
      setConfirmError('');
      setStillProcessing(false);
    } else {
      setMounted(false);
      if (stillProcessingTimer.current) window.clearTimeout(stillProcessingTimer.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirming, onClose]);

  useEffect(() => {
    return () => { if (screenshotUrl) URL.revokeObjectURL(screenshotUrl); };
  }, [screenshotUrl]);

  useEffect(() => {
    if (!isOpen || stage === 'success' || stage === 'expired') return;
    if (secondsLeft <= 0) {
      setStage('expired');
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [isOpen, secondsLeft, stage]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Please upload a PNG or JPG payment screenshot.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Screenshot is too large. Please use an image under 10MB.');
      return;
    }
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    setScreenshot(file);
    setScreenshotUrl(URL.createObjectURL(file));
    setFileError('');
    setScreenshotMissing(false);
  };

  const handleConfirm = useCallback(async () => {
    if (confirming || stage === 'expired') return;

    // Validate up front and tell the customer exactly what's missing —
    // never just leave the button inert with no explanation. Both fields
    // are mandatory; neither is auto-verified, an admin reviews them.
    if (!txnRef.trim()) {
      setUtrMissing(true);
      setScreenshotMissing(false);
      setConfirmError('');
      utrFieldRef.current?.focus();
      return;
    }
    setUtrMissing(false);
    if (!screenshot) {
      setScreenshotMissing(true);
      setConfirmError('');
      screenshotButtonRef.current?.focus();
      return;
    }
    setScreenshotMissing(false);

    setConfirmError('');
    setConfirming(true);
    setStillProcessing(false);
    setStage('verifying');
    // If this takes a while, say so rather than leaving the screen looking stuck.
    stillProcessingTimer.current = window.setTimeout(() => setStillProcessing(true), 6000);
    try {
      await onConfirm(txnRef.trim(), screenshot);
      setStage('success');
    } catch (err) {
      setStage('idle');
      setConfirmError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong while submitting your payment details. Your UTR and screenshot are still here — please try again."
      );
    } finally {
      if (stillProcessingTimer.current) { window.clearTimeout(stillProcessingTimer.current); stillProcessingTimer.current = null; }
      setConfirming(false);
      setStillProcessing(false);
    }
  }, [txnRef, confirming, stage, onConfirm, screenshot]);

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    showToast('UPI ID copied ✓');
    window.setTimeout(() => setCopied(false), 2000);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100;
  const isLow = secondsLeft <= 30;
  const canConfirm = !confirming && stage !== 'expired';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-[#081426]/85 p-3 sm:p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="RetraLabs secure checkout">
      <button aria-label="Close payment checkout" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className={`relative z-10 my-3 w-full max-w-[880px] overflow-hidden rounded-[24px] bg-[#f7f9fc] shadow-[0_32px_100px_rgba(0,0,0,0.45)] transition-all duration-300 sm:my-8 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
        <header className="bg-[#081426] px-5 py-5 text-white sm:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="RetraLabs" className="h-11 w-11 rounded-[14px]" />
              <div>
                <p className="text-[17px] font-bold tracking-[-0.02em]">RetraLabs</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Secure Checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-1.5 text-xs font-semibold text-slate-300 sm:flex"><LockKeyhole size={14} className="text-[#20c9b5]" /> Secure payment</div>
              <button onClick={onClose} aria-label="Close" className="rounded-xl border border-white/10 bg-white/[0.06] p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={17} /></button>
            </div>
          </div>
          <div className="mt-7 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-[1fr_260px] sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Payable amount</p>
              <p className="mt-1 text-[36px] font-bold tracking-[-0.04em] sm:text-[42px]">₹{amount.toLocaleString('en-IN')}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={14} className={isLow ? 'text-amber-400' : 'text-[#20c9b5]'} /> Order will expire in <span className={`rounded-full px-2 py-1 font-bold ${isLow ? 'bg-amber-400/15 text-amber-300' : 'bg-[#20c9b5]/15 text-[#5eead4]'}`}>{mm}:{ss}</span></div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-amber-400' : 'bg-[#20c9b5]'}`} style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Order summary</p>
              <div className="mt-3 flex items-start justify-between gap-3 text-sm"><span className="font-semibold text-white">Research order</span><span className="font-bold text-white">₹{amount.toLocaleString('en-IN')}</span></div>
              <p className="mt-1 text-xs text-slate-400">Quantity and product details confirmed at checkout</p>
              <div className="my-3 h-px bg-white/10" />
              <div className="flex justify-between text-sm font-bold"><span className="text-slate-300">Total amount</span><span className="text-[#5eead4]">₹{amount.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </header>

        {stage === 'success' ? (
          <SuccessState amount={amount} onClose={onClose} />
        ) : stage === 'expired' ? (
          <ExpiredState onRestart={() => { setStage('idle'); setSecondsLeft(COUNTDOWN_SECONDS); }} />
        ) : (
          <main className="bg-[#f7f9fc] p-5 sm:p-8">
            <div className="mx-auto max-w-[480px]">
              <div className="mb-6 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#20a995]">UPI Payment</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#172033]">Pay securely via UPI</h2>
              </div>

              {/* 1. Scan QR code — the primary, recommended path */}
              <div>
                <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]"><QrCode size={13} /> 1. Scan QR code</p>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#172033]">Scan this QR code with any UPI app</p>
                  <div className="relative mx-auto mt-4 w-fit rounded-2xl border border-[#e0e6ec] bg-white p-4 shadow-[0_12px_30px_rgba(8,20,38,0.08)]">
                    <img src="/retralabs-payment-qr.png" alt="RetraLabs UPI payment QR code" className="h-60 w-60 rounded-lg object-contain sm:h-64 sm:w-64" />
                    <span className="pointer-events-none absolute inset-2 rounded-xl border-2 border-[#20c9b5]/40" />
                  </div>
                  <p className="mt-4 text-xs text-[#9ca3af]">{SUPPORTED_APPS_LABEL}</p>
                </div>
              </div>

              <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]"><div className="h-px flex-1 bg-[#e1e7ec]" />Or pay using UPI ID<div className="h-px flex-1 bg-[#e1e7ec]" /></div>

              {/* 2. Or pay using UPI ID — manual fallback, no app deep links */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">2. Or pay using UPI ID</p>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#d7e0e8] bg-white p-3.5">
                  <div><p className="text-[10px] text-[#9ca3af]">UPI ID</p><p className="mt-0.5 text-sm font-bold text-[#172033]">{UPI_ID}</p></div>
                  <button onClick={() => void copyUpiId()} className="flex items-center gap-1.5 rounded-lg bg-[#e9fbf8] px-3 py-2 text-xs font-bold text-[#167c73]">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy UPI ID'}</button>
                </div>
              </div>

              <div className="mt-7 border-t border-[#e5e7eb] pt-5">
                <div className="flex items-center gap-2"><div className="h-px flex-1 bg-[#dfe5eb]" /><span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#9ca3af]">Already paid?</span><div className="h-px flex-1 bg-[#dfe5eb]" /></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#172033]">Enter your UPI Reference / UTR Number</label>
                    <input
                      ref={utrFieldRef}
                      value={txnRef}
                      onChange={event => { setTxnRef(event.target.value); if (utrMissing) setUtrMissing(false); }}
                      placeholder="Enter UTR / payment reference"
                      className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#aab4c0] focus:ring-4 ${utrMissing ? 'border-amber-400 focus:border-amber-400 focus:ring-amber-100' : 'border-[#d7e0e8] focus:border-[#20c9b5] focus:ring-[#20c9b5]/10'}`}
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a98a8]">Enter the UTR/reference number shown in your UPI app after completing the payment. Please place your order only once.</p>
                  </div>
                  <div className="sm:self-start">
                    <button
                      ref={screenshotButtonRef}
                      onClick={() => fileRef.current?.click()}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition sm:w-auto ${screenshot ? 'border-[#20c9b5] bg-[#e9fbf8] text-[#167c73]' : screenshotMissing ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-dashed border-[#b9c7d3] bg-white text-[#526579] hover:border-[#20c9b5]'}`}
                    >
                      <Upload size={15} />{screenshot ? 'Screenshot added' : 'Upload screenshot'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => handleFileChange(event.target.files?.[0] || null)} />
                  </div>
                </div>
                {screenshot && <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6b7280]"><FileImage size={14} className="text-[#20c9b5]" />{screenshot.name}</div>}
                {fileError && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{fileError}</div>}
                {utrMissing && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><AlertCircle size={15} className="mt-0.5 shrink-0" /><span><b>UTR number required.</b> Please enter your UTR/payment reference number before placing the order. This helps us manually verify your payment and prevents duplicate orders.</span></div>}
                {screenshotMissing && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><AlertCircle size={15} className="mt-0.5 shrink-0" /><span><b>Screenshot required.</b> Please upload a screenshot of your payment before placing the order.</span></div>}
                {confirmError && <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{confirmError}</div>}
                <button onClick={() => void handleConfirm()} disabled={!canConfirm} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#081426] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#10233c] disabled:cursor-not-allowed disabled:opacity-70">{confirming ? <><Loader2 size={17} className="animate-spin" />{stillProcessing ? 'Still processing… please don’t click again' : 'Processing your payment request… Please don’t click again'}</> : <>I’ve paid — verify payment <ChevronRight size={17} /></>}</button>
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-[#8a98a8]"><button onClick={() => { setTxnRef(''); setScreenshot(null); setScreenshotUrl(null); setFileError(''); setUtrMissing(false); setScreenshotMissing(false); setConfirmError(''); }} disabled={confirming} className="transition hover:text-[#172033] disabled:cursor-not-allowed disabled:opacity-40">Cancel payment</button><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-[#172033]">Need help?</a></div>
              </div>
            </div>
          </main>
        )}

        <footer className="grid gap-3 border-t border-[#e5e7eb] bg-white px-5 py-5 text-[#6b7280] sm:grid-cols-4 sm:px-8">
          <TrustItem icon={<ShieldCheck size={16} />} title="100% Secure" detail="Payments are protected" />
          <TrustItem icon={<CheckCircle2 size={16} />} title="Instant payment" detail="Fast confirmation" />
          <TrustItem icon={<WalletCards size={16} />} title="No extra charges" detail="Pay the product price" />
          <TrustItem icon={<HelpCircle size={16} />} title="24/7 support" detail="We are here to help" />
        </footer>
        <div className="flex items-center justify-between gap-4 bg-[#081426] px-5 py-4 text-[11px] text-slate-400 sm:px-8"><div className="flex items-center gap-2"><img src="/favicon.png" alt="RetraLabs" className="h-6 w-6 rounded-lg" /><span>Research. Restore. Redefine.</span></div><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition hover:text-white"><MessageCircle size={13} /> Need help?</a></div>
        {toast && <div className="fixed bottom-5 left-1/2 z-[10001] -translate-x-1/2 rounded-full bg-[#081426] px-4 py-2.5 text-xs font-bold text-white shadow-xl">{toast}</div>}
      </div>
    </div>
  );
}

function TrustItem({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <div className="flex items-start gap-2"><span className="mt-0.5 text-[#20a995]">{icon}</span><span><b className="block text-[11px] text-[#172033]">{title}</b><small className="text-[10px] text-[#9ca3af]">{detail}</small></span></div>; }
function SuccessState({ amount, onClose }: { amount: number; onClose: () => void }) { return <div className="bg-white px-6 py-16 text-center sm:px-12"><div className="mx-auto flex h-20 w-20 animate-[pop_0.45s_ease-out] items-center justify-center rounded-full bg-[#e9fbf8] text-[#16a34a]"><CheckCircle2 size={42} /></div><h2 className="mt-6 text-2xl font-bold text-[#172033]">Payment verification pending</h2><p className="mt-2 text-sm text-[#6b7280]">Your payment reference for ₹{amount.toLocaleString('en-IN')} has been received. We'll manually verify it against your screenshot and confirm your order once it matches our records.</p><p className="mt-3 text-xs font-semibold text-[#9ca3af]">Please don't place another order while verification is in progress.</p><button onClick={onClose} className="mt-7 rounded-xl bg-[#081426] px-7 py-3 text-sm font-bold text-white">Continue</button></div>; }
function ExpiredState({ onRestart }: { onRestart: () => void }) { return <div className="bg-white px-6 py-16 text-center sm:px-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"><AlertCircle size={34} /></div><h2 className="mt-5 text-2xl font-bold text-[#172033]">Payment window expired</h2><p className="mt-2 text-sm text-[#6b7280]">Restart the checkout to create a fresh payment session.</p><button onClick={onRestart} className="mt-6 rounded-xl bg-[#081426] px-7 py-3 text-sm font-bold text-white">Restart payment</button></div>; }
