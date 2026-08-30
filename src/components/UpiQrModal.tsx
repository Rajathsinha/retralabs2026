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
  ExternalLink,
  FileImage,
  Google,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';

const UPI_ID = 'retralabs@ptaxis';
const MERCHANT_NAME = 'RetraLabs';
const COUNTDOWN_SECONDS = 180;

type Stage = 'idle' | 'verifying' | 'success' | 'expired';
type OcrStatus = 'idle' | 'scanning' | 'matched' | 'mismatch' | 'error';
type PaymentMethod = 'upi' | 'paytm' | 'gpay' | 'whatsapp';
type PaymentTab = 'qr' | 'upi';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onConfirm: (txnRef: string, screenshot: File | null) => Promise<void>;
  whatsappUrl: string;
}

function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  const patterns = [
    /₹\s*([\d,]+\.?\d*)/gi,
    /Rs\.?\s*([\d,]+\.?\d*)/gi,
    /INR\s*([\d,]+\.?\d*)/gi,
    /\b([\d]{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!Number.isNaN(amount) && amount > 0) amounts.push(amount);
    }
  }
  return amounts;
}

function verifyAmount(ocrText: string, payable: number): boolean {
  return extractAmounts(ocrText).some(value => Math.abs(value - payable) <= 1);
}

const methodDetails: Record<PaymentMethod, { label: string; detail: string; icon: ReactNode }> = {
  upi: { label: 'UPI / QR', detail: 'Recommended', icon: <QrCode size={18} /> },
  paytm: { label: 'Paytm', detail: 'Pay with Paytm', icon: <span className="text-[13px] font-black tracking-tight">paytm</span> },
  gpay: { label: 'Google Pay', detail: 'Pay with GPay', icon: <span className="text-[15px] font-bold">G</span> },
  whatsapp: { label: 'WhatsApp Pay', detail: 'Pay in WhatsApp', icon: <MessageCircle size={18} /> },
};

export default function UpiQrModal({ isOpen, onClose, amount, onConfirm, whatsappUrl }: UpiQrModalProps) {
  const [txnRef, setTxnRef] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [stage, setStage] = useState<Stage>('idle');
  const [mounted, setMounted] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [fraudWarning, setFraudWarning] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [tab, setTab] = useState<PaymentTab>('qr');
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const ocrAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setStage('idle');
      setSecondsLeft(COUNTDOWN_SECONDS);
      setMethod('upi');
      setTab('qr');
      setTxnRef('');
      setScreenshot(null);
      setScreenshotUrl(null);
      setOcrStatus('idle');
      setFraudWarning('');
    } else {
      setMounted(false);
      ocrAbortRef.current?.abort();
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

  const runOcrCheck = useCallback(async (file: File) => {
    ocrAbortRef.current?.abort();
    const controller = new AbortController();
    ocrAbortRef.current = controller;
    setOcrStatus('scanning');
    setOcrProgress(0);
    setFraudWarning('');
    let worker: { recognize: (image: File) => Promise<{ data: { text: string } }>; terminate: () => void } | null = null;

    try {
      const Tesseract = await import('tesseract.js');
      if (controller.signal.aborted) return;
      worker = await Tesseract.createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
        logger: (message: { status: string; progress: number }) => {
          if (message.status === 'recognizing text' && !controller.signal.aborted) setOcrProgress(Math.round(message.progress * 100));
        },
      });
      if (controller.signal.aborted) return;
      const { data } = await worker.recognize(file);
      if (controller.signal.aborted) return;
      if (verifyAmount(data.text, amount)) {
        setOcrStatus('matched');
      } else {
        setOcrStatus('mismatch');
        setFraudWarning(`We couldn't automatically verify the amount. Please confirm you paid ₹${amount.toLocaleString('en-IN')}; your order will be manually reviewed.`);
      }
    } catch {
      if (!controller.signal.aborted) {
        setOcrStatus('error');
        setFraudWarning('');
      }
    } finally {
      if (worker) {
        try { worker.terminate(); } catch { /* worker cleanup */ }
      }
    }
  }, [amount]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFraudWarning('Please upload a PNG or JPG payment screenshot.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFraudWarning('Screenshot is too large. Please use an image under 10MB.');
      return;
    }
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    setScreenshot(file);
    setScreenshotUrl(URL.createObjectURL(file));
    setFraudWarning('');
    void runOcrCheck(file);
  };

  const handleConfirm = useCallback(async () => {
    if (!txnRef.trim() || confirming || stage === 'expired' || !screenshot) return;
    setConfirming(true);
    setStage('verifying');
    try {
      await onConfirm(txnRef.trim(), screenshot);
      setStage('success');
    } catch {
      setStage('idle');
    } finally {
      setConfirming(false);
    }
  }, [txnRef, confirming, stage, onConfirm, screenshot]);

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    showToast('UPI ID copied');
    window.setTimeout(() => setCopied(false), 2000);
  };

  const openPaymentApp = (selectedMethod: PaymentMethod) => {
    setMethod(selectedMethod);
    window.location.href = `upi://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${amount}&tn=RetraLabs%20Order`;
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100;
  const isLow = secondsLeft <= 30;
  const canConfirm = Boolean(txnRef.trim() && !confirming && screenshot && stage !== 'expired');

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
          <main className="grid gap-0 lg:grid-cols-[220px_1fr]">
            <aside className="border-b border-[#e5e7eb] bg-white p-4 lg:border-b-0 lg:border-r sm:p-5">
              <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Choose a payment method</p>
              <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
                {(Object.keys(methodDetails) as PaymentMethod[]).map(option => {
                  const detail = methodDetails[option];
                  const selected = method === option;
                  return <button key={option} onClick={() => setMethod(option)} className={`flex min-w-[142px] items-center gap-3 rounded-xl border p-3 text-left transition lg:w-full ${selected ? 'border-[#20c9b5] bg-[#e9fbf8] text-[#081426] shadow-[0_0_0_3px_rgba(32,201,181,0.08)]' : 'border-[#e5e7eb] bg-white text-[#172033] hover:border-[#b8c5d3]'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#081426] text-[#5eead4]' : 'bg-[#eef2f6] text-[#4b6174]'}`}>{detail.icon}</span>
                    <span className="min-w-0"><span className="block whitespace-nowrap text-xs font-bold">{detail.label}</span><span className={`mt-0.5 block whitespace-nowrap text-[10px] ${selected ? 'text-[#167c73]' : 'text-[#9ca3af]'}`}>{detail.detail}</span></span>
                  </button>;
                })}
              </div>
              <div className="mt-5 hidden rounded-xl bg-[#f7f9fc] p-3 text-[11px] leading-relaxed text-[#6b7280] lg:block"><ShieldCheck size={15} className="mb-2 text-[#20c9b5]" /><b className="text-[#172033]">Safe and private</b><br />Your payment details are never stored on this device.</div>
            </aside>

            <section className="bg-[#f7f9fc] p-5 sm:p-7">
              {method === 'upi' ? <UpiPaymentContent tab={tab} setTab={setTab} copied={copied} copyUpiId={() => void copyUpiId()} amount={amount} openPaymentApp={openPaymentApp} /> : <AppPaymentContent method={method} amount={amount} onOpen={() => openPaymentApp(method)} />}

              <div className="mt-7 border-t border-[#e5e7eb] pt-5">
                <div className="flex items-center gap-2"><div className="h-px flex-1 bg-[#dfe5eb]" /><span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#9ca3af]">Confirm payment</span><div className="h-px flex-1 bg-[#dfe5eb]" /></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#172033]">UPI reference / UTR number</label>
                    <input value={txnRef} onChange={event => setTxnRef(event.target.value)} placeholder="Enter the reference from your payment app" className="w-full rounded-xl border border-[#d7e0e8] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#aab4c0] focus:border-[#20c9b5] focus:ring-4 focus:ring-[#20c9b5]/10" />
                  </div>
                  <div className="sm:self-end"><button onClick={() => fileRef.current?.click()} className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition sm:w-auto ${screenshot ? 'border-[#20c9b5] bg-[#e9fbf8] text-[#167c73]' : 'border-dashed border-[#b9c7d3] bg-white text-[#526579] hover:border-[#20c9b5]'}`}><Upload size={15} />{screenshot ? 'Screenshot added' : 'Upload screenshot'}</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => handleFileChange(event.target.files?.[0] || null)} /></div>
                </div>
                {screenshot && <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6b7280]"><FileImage size={14} className="text-[#20c9b5]" />{screenshot.name}{ocrStatus === 'scanning' && <span className="text-[#167c73]">Checking screenshot {ocrProgress}%</span>}{ocrStatus === 'matched' && <span className="font-bold text-[#16a34a]">Amount detected</span>}{ocrStatus === 'error' && <span className="text-amber-600">Manual review</span>}</div>}
                {fraudWarning && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{fraudWarning}</div>}
                <button onClick={() => void handleConfirm()} disabled={!canConfirm} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#081426] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#10233c] disabled:cursor-not-allowed disabled:opacity-40">{confirming ? <><Loader2 size={17} className="animate-spin" />Waiting for payment confirmation</> : <>I’ve paid — verify payment <ChevronRight size={17} /></>}</button>
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-[#8a98a8]"><button onClick={() => { setTxnRef(''); setScreenshot(null); setScreenshotUrl(null); setOcrStatus('idle'); }} className="transition hover:text-[#172033]">Cancel payment</button><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-[#172033]">Need help?</a></div>
              </div>
            </section>
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

function UpiPaymentContent({ tab, setTab, copied, copyUpiId, amount, openPaymentApp }: { tab: PaymentTab; setTab: (tab: PaymentTab) => void; copied: boolean; copyUpiId: () => void; amount: number; openPaymentApp: (method: PaymentMethod) => void }) {
  return <>
    <div className="mb-6"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#20a995]">UPI payments</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#172033]">Choose a payment method</h2><p className="mt-1 text-sm text-[#6b7280]">All payments are secure and encrypted.</p></div>
    <div className="mb-5 flex rounded-xl bg-[#e9eef3] p-1"><button onClick={() => setTab('qr')} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === 'qr' ? 'bg-white text-[#172033] shadow-sm' : 'text-[#6b7280]'}`}>Scan QR code</button><button onClick={() => setTab('upi')} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === 'upi' ? 'bg-white text-[#172033] shadow-sm' : 'text-[#6b7280]'}`}>Enter UPI ID</button></div>
    {tab === 'qr' ? <>
      <div className="text-center"><p className="text-sm font-semibold text-[#172033]">Scan this QR code with any UPI app</p><div className="relative mx-auto mt-4 w-fit rounded-2xl border border-[#e0e6ec] bg-white p-4 shadow-[0_12px_30px_rgba(8,20,38,0.08)]"><img src="/retralabs-payment-qr.png" alt="RetraLabs UPI payment QR code" className="h-48 w-48 rounded-lg object-contain sm:h-56 sm:w-56" /><span className="pointer-events-none absolute inset-2 rounded-xl border-2 border-[#20c9b5]/40" /></div><p className="mt-3 text-xs text-[#6b7280]">Or pay using any UPI app</p></div>
      <div className="mt-5 grid grid-cols-3 gap-2"><AppShortcut label="Paytm" onClick={() => openPaymentApp('paytm')} /><AppShortcut label="Google Pay" onClick={() => openPaymentApp('gpay')} /><AppShortcut label="WhatsApp Pay" onClick={() => openPaymentApp('whatsapp')} /></div>
      <div className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]"><div className="h-px flex-1 bg-[#e1e7ec]" />Or use UPI ID<div className="h-px flex-1 bg-[#e1e7ec]" /></div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[#d7e0e8] bg-white p-3"><div><p className="text-[10px] text-[#9ca3af]">UPI ID</p><p className="mt-0.5 text-sm font-bold text-[#172033]">{UPI_ID}</p></div><button onClick={copyUpiId} className="flex items-center gap-1.5 rounded-lg bg-[#e9fbf8] px-3 py-2 text-xs font-bold text-[#167c73]">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button></div>
    </> : <div className="rounded-2xl border border-[#dfe6ed] bg-white p-5"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e9fbf8] text-[#167c73]"><Smartphone size={22} /></div><h3 className="text-base font-bold text-[#172033]">Pay using your UPI ID</h3><p className="mt-1 text-sm text-[#6b7280]">Enter your UPI ID and continue in your payment app.</p><input placeholder="example@upi" className="mt-5 w-full rounded-xl border border-[#d7e0e8] px-3.5 py-3 text-sm outline-none focus:border-[#20c9b5]" /><button onClick={() => openPaymentApp('upi')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#081426] py-3.5 text-sm font-bold text-white">Pay ₹{amount.toLocaleString('en-IN')} <ChevronRight size={16} /></button></div>}
  </>;
}

function AppPaymentContent({ method, amount, onOpen }: { method: PaymentMethod; amount: number; onOpen: () => void }) {
  const detail = methodDetails[method];
  return <div><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#20a995]">{detail.label}</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#172033]">Pay securely with {detail.label}</h2><p className="mt-1 text-sm text-[#6b7280]">You will be redirected to your payment app to complete ₹{amount.toLocaleString('en-IN')}.</p><div className="mt-6 rounded-2xl border border-[#dfe6ed] bg-white p-6 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9fbf8] text-[#167c73]">{detail.icon}</div><p className="mt-4 text-base font-bold text-[#172033]">{detail.label} payment</p><p className="mt-1 text-sm text-[#6b7280]">Complete the payment in the app, then return here to enter your reference number.</p><button onClick={onOpen} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#081426] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#10233c]">Open {detail.label} <ExternalLink size={15} /></button></div></div>;
}

function AppShortcut({ label, onClick }: { label: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-xl border border-[#dfe6ed] bg-white px-2 py-3 text-center text-[11px] font-bold text-[#172033] transition hover:border-[#20c9b5] hover:bg-[#f4fffd]"><span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef2f6] text-xs font-black text-[#167c73]">{label === 'Google Pay' ? 'G' : label === 'Paytm' ? 'P' : <MessageCircle size={14} />}</span>{label}</button>; }
function TrustItem({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <div className="flex items-start gap-2"><span className="mt-0.5 text-[#20a995]">{icon}</span><span><b className="block text-[11px] text-[#172033]">{title}</b><small className="text-[10px] text-[#9ca3af]">{detail}</small></span></div>; }
function SuccessState({ amount, onClose }: { amount: number; onClose: () => void }) { return <div className="bg-white px-6 py-16 text-center sm:px-12"><div className="mx-auto flex h-20 w-20 animate-[pop_0.45s_ease-out] items-center justify-center rounded-full bg-[#e9fbf8] text-[#16a34a]"><CheckCircle2 size={42} /></div><h2 className="mt-6 text-2xl font-bold text-[#172033]">Payment submitted</h2><p className="mt-2 text-sm text-[#6b7280]">Your payment of ₹{amount.toLocaleString('en-IN')} was received. We are reviewing the transaction and will confirm your order shortly.</p><button onClick={onClose} className="mt-7 rounded-xl bg-[#081426] px-7 py-3 text-sm font-bold text-white">Continue</button></div>; }
function ExpiredState({ onRestart }: { onRestart: () => void }) { return <div className="bg-white px-6 py-16 text-center sm:px-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"><AlertCircle size={34} /></div><h2 className="mt-5 text-2xl font-bold text-[#172033]">Payment window expired</h2><p className="mt-2 text-sm text-[#6b7280]">Restart the checkout to create a fresh payment session.</p><button onClick={onRestart} className="mt-6 rounded-xl bg-[#081426] px-7 py-3 text-sm font-bold text-white">Restart payment</button></div>; }
