import { useRef, useState } from 'react';
import { ArrowRight, Banknote, Check, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { CardChip, ContactlessMark, MastercardMark, RupayMark, UpiMark, VisaMark } from './paymentMethods';
import type { PaymentMethodId } from './methods';

interface MethodRow {
  id: PaymentMethodId;
  label: string;
  blurb: string;
  icon: typeof Smartphone;
  accent: string;
}

const ROWS: MethodRow[] = [
  { id: 'upi',        label: 'UPI',               blurb: 'GPay, PhonePe, Paytm & any UPI app', icon: Smartphone, accent: '#22D3EE' },
  { id: 'card',       label: 'Credit / Debit Card', blurb: 'Visa, Mastercard, RuPay & Amex',   icon: CreditCard, accent: '#60A5FA' },
  { id: 'netbanking', label: 'Net Banking',       blurb: 'All major Indian banks',             icon: Landmark,   accent: '#A78BFA' },
  { id: 'wallet',     label: 'Wallets',           blurb: 'Paytm, Amazon Pay, Mobikwik & more', icon: Wallet,     accent: '#F472B6' },
  { id: 'cod',        label: 'Cash on Delivery',  blurb: 'Pay the courier when it arrives',    icon: Banknote,   accent: '#22C55E' },
];

/** Per-method artwork shown inside the selected row. Keeps the console feeling alive without animating for its own sake. */
function MethodArtwork({ id }: { id: PaymentMethodId }) {
  if (id === 'card') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center h-6 px-1.5 rounded bg-white/95"><VisaMark className="h-3 w-auto" /></span>
        <span className="inline-flex items-center h-6 px-1.5 rounded bg-white/95"><MastercardMark className="h-3 w-auto" /></span>
        <span className="inline-flex items-center h-6 px-1.5 rounded bg-white/95"><RupayMark className="h-3 w-auto" /></span>
      </div>
    );
  }
  if (id === 'upi') {
    return (
      <span className="inline-flex items-center h-6 px-1.5 rounded bg-white/95"><UpiMark className="h-3.5 w-auto" /></span>
    );
  }
  return null;
}

/**
 * The checkout payment console — deliberately the heaviest object on the page.
 *
 * Dark and layered against the light checkout so it reads as the one thing left
 * to do. Every method Cashfree gives us is visible up front (no hidden "other
 * options" drawer), with COD sitting among them as a peer rather than a
 * consolation prize.
 *
 * Controlled: the page owns the selection and the submit, this owns the feel.
 */
export default function PaymentConsole({
  formattedAmount,
  selected,
  onSelect,
  onPay,
  busy = false,
  busyLabel,
}: {
  formattedAmount: string;
  selected: PaymentMethodId;
  onSelect: (id: PaymentMethodId) => void;
  onPay: () => void;
  busy?: boolean;
  busyLabel?: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType !== 'mouse') return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  /* Arrow keys move between methods, as a radiogroup should. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = ROWS.findIndex(r => r.id === selected);
    onSelect(ROWS[(i + dir + ROWS.length) % ROWS.length].id);
  };

  const isCod = selected === 'cod';
  const ctaLabel = isCod ? 'Place COD Order' : `Pay ${formattedAmount}`;

  return (
    <div
      ref={surfaceRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setSpot(null)}
      className="relative overflow-hidden rounded-[26px] p-5 sm:p-7"
      style={{
        background: 'linear-gradient(160deg, #15192A 0%, #0B0E18 50%, #06070C 100%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.09) inset, 0 40px 70px -28px rgba(6,8,14,0.9), 0 0 0 1px rgba(255,255,255,0.07)',
      }}
    >
      {/* cursor spotlight */}
      {spot && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-[420px] h-[420px] rounded-full transition-opacity duration-300"
          style={{
            left: spot.x - 210,
            top: spot.y - 210,
            background: 'radial-gradient(circle, rgba(96,165,250,0.13) 0%, transparent 65%)',
          }}
        />
      )}

      {/* ── Amount ── */}
      <div className="relative flex items-end justify-between gap-4 pb-5 mb-5 border-b border-white/[0.08]">
        <div>
          <p className="text-white/40 text-[10px] font-bold tracking-[0.16em] uppercase mb-1.5">Amount payable</p>
          <p className="text-white text-[34px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-none">
            {formattedAmount}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 pb-1.5">
          <CardChip className="w-8 h-6 opacity-70" />
          <ContactlessMark className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>

      {/* ── Methods ── */}
      <p className="relative text-white/40 text-[10px] font-bold tracking-[0.16em] uppercase mb-3">Choose how you pay</p>

      <div role="radiogroup" aria-label="Payment method" onKeyDown={handleKeyDown} className="relative space-y-2.5 mb-6">
        {ROWS.map(({ id, label, blurb, icon: Icon, accent }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(id)}
              disabled={busy}
              className={`group relative w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all duration-300 min-h-[62px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E18] disabled:opacity-60 disabled:cursor-not-allowed ${
                active
                  ? 'bg-white/[0.085] border border-white/25 -translate-y-px'
                  : 'bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/15'
              }`}
              style={
                active
                  ? { boxShadow: `0 1px 0 rgba(255,255,255,0.1) inset, 0 12px 26px -12px ${accent}55, 0 0 0 1px ${accent}40` }
                  : { boxShadow: '0 1px 0 rgba(255,255,255,0.045) inset' }
              }
            >
              {/* icon plate */}
              <span
                className="relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-[1.04]"
                style={{
                  background: active
                    ? `linear-gradient(145deg, ${accent}30, ${accent}10)`
                    : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
                  boxShadow: active
                    ? `0 1px 0 rgba(255,255,255,0.18) inset, 0 0 18px -4px ${accent}70`
                    : '0 1px 0 rgba(255,255,255,0.08) inset',
                }}
              >
                <Icon className="w-[18px] h-[18px] transition-colors duration-300" style={{ color: active ? accent : 'rgba(255,255,255,0.55)' }} strokeWidth={2.2} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[14.5px] font-bold leading-none transition-colors ${active ? 'text-white' : 'text-white/80'}`}>
                    {label}
                  </span>
                  {id === 'cod' && (
                    <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[9px] font-bold tracking-wide text-[#4ADE80] uppercase">
                      No prepay
                    </span>
                  )}
                </span>
                <span className="block text-white/40 text-[11.5px] mt-1 truncate">{blurb}</span>
              </span>

              <span className="flex items-center gap-3 flex-shrink-0">
                <span className={`hidden sm:block transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
                  <MethodArtwork id={id} />
                </span>
                {/* radio dot */}
                <span
                  className={`relative w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    active ? 'border-transparent' : 'border-white/25 group-hover:border-white/40'
                  }`}
                  style={active ? { background: accent, boxShadow: `0 0 12px -1px ${accent}` } : undefined}
                >
                  {active && <Check className="w-3 h-3 text-[#06070C]" strokeWidth={3.5} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Pay CTA ── */}
      <button
        type="button"
        onClick={onPay}
        disabled={busy}
        aria-busy={busy}
        className="group relative w-full overflow-hidden rounded-2xl py-4 sm:py-[18px] font-extrabold text-[15.5px] tracking-[-0.01em] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E18]"
        style={{
          background: isCod
            ? 'linear-gradient(145deg, #16A34A 0%, #15803D 100%)'
            : 'linear-gradient(145deg, #3B82F6 0%, #2563EB 55%, #1D4ED8 100%)',
          color: '#fff',
          boxShadow: isCod
            ? '0 1px 0 rgba(255,255,255,0.28) inset, 0 16px 34px -12px rgba(22,163,74,0.65)'
            : '0 1px 0 rgba(255,255,255,0.28) inset, 0 16px 34px -12px rgba(37,99,235,0.7)',
        }}
      >
        {/* sheen sweep on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out"
          style={{ background: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)' }}
        />
        <span className="relative flex items-center justify-center gap-2.5">
          {busy ? (
            <>
              <span className="w-[18px] h-[18px] border-2 border-white/35 border-t-white rounded-full animate-spin" />
              {busyLabel || 'Connecting…'}
            </>
          ) : (
            <>
              <Lock className="w-[15px] h-[15px]" strokeWidth={2.6} />
              {ctaLabel}
              <ArrowRight className="w-[17px] h-[17px] transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </span>
      </button>

      {/* ── Trust line ── */}
      <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-4">
        <span className="inline-flex items-center gap-1.5 text-white/45 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" strokeWidth={2.4} />
          256-bit encrypted
        </span>
        <span className="text-white/15 text-[10px]">|</span>
        <span className="text-white/45 text-[11px] font-semibold">
          {isCod ? 'No card details needed' : 'Secure payment powered by Cashfree'}
        </span>
      </div>
    </div>
  );
}
