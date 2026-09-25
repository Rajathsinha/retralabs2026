import { useRef, useState } from 'react';
import { Banknote, Landmark, Lock, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react';
import { CardChip, ContactlessMark, MastercardMark, RupayMark, UpiMark, VisaMark } from './paymentMethods';

const METHODS = [
  { icon: Smartphone, label: 'UPI',         detail: 'GPay · PhonePe · Paytm',    accent: '#22D3EE' },
  { icon: Wallet,     label: 'Cards',       detail: 'Visa · Mastercard · RuPay', accent: '#2563EB' },
  { icon: Landmark,   label: 'Net Banking', detail: 'All major Indian banks',    accent: '#A78BFA' },
  { icon: Banknote,   label: 'COD',         detail: 'Pay when it arrives',       accent: '#22C55E' },
];

/**
 * Homepage payment announcement.
 *
 * The card tilts toward the pointer rather than looping an animation on its
 * own: motion that answers the visitor reads as craft, motion that just plays
 * reads as decoration. Falls back to a flat card when the OS asks for reduced
 * motion, and on touch, where there is no hover to respond to.
 */
export default function PayYourWaySection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType !== 'mouse') return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 16, y: px * 20 });
  };

  return (
    <section className="relative overflow-hidden bg-[#08080A] py-20 sm:py-28">
      {/* depth: two soft light sources + a fine grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background:
            'radial-gradient(60% 55% at 18% 15%, rgba(37,99,235,0.35) 0%, transparent 60%), radial-gradient(50% 50% at 85% 80%, rgba(34,211,238,0.22) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(70% 60% at 50% 40%, black 0%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 40%, black 0%, transparent 85%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-8 items-center">

          {/* ── Copy ── */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22D3EE]/25 bg-[#22D3EE]/[0.08] backdrop-blur-sm mb-6">
              <Zap className="w-3 h-3 text-[#22D3EE]" strokeWidth={2.5} />
              <span className="text-[#67E8F9] text-[10px] font-bold tracking-[0.14em] uppercase">Now Live</span>
            </div>

            <h2 className="text-[40px] sm:text-[56px] lg:text-[64px] font-extrabold text-white leading-[0.95] tracking-[-0.04em] mb-5">
              Pay Your
              <span className="block bg-gradient-to-r from-[#60A5FA] via-[#22D3EE] to-[#60A5FA] bg-clip-text text-transparent">
                Way.
              </span>
            </h2>

            <p className="text-[20px] sm:text-[22px] font-bold text-white/90 tracking-[-0.01em] mb-3">
              UPI. Cards. Net Banking. COD.
            </p>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-md mb-8">
              Secure, seamless payments powered by Cashfree — or keep it simple and pay
              cash when your order reaches your door. Whatever suits you.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="inline-flex items-center gap-2 text-white/70 text-[13px] font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" strokeWidth={2.2} />
                256-bit encrypted
              </span>
              <span className="inline-flex items-center gap-2 text-white/70 text-[13px] font-semibold">
                <Lock className="w-4 h-4 text-[#22C55E]" strokeWidth={2.2} />
                PCI-DSS compliant gateway
              </span>
            </div>
          </div>

          {/* ── 3D card + method tiles ── */}
          <div className="relative" style={{ perspective: '1200px' }}>
            <div
              ref={cardRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setTilt({ x: 0, y: 0 })}
              className="relative mx-auto w-full max-w-[420px] aspect-[1.6/1] rounded-[22px] p-6 sm:p-7 flex flex-col justify-between transition-transform duration-300 ease-out will-change-transform"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transformStyle: 'preserve-3d',
                background:
                  'linear-gradient(145deg, #1E293B 0%, #0F172A 45%, #060A14 100%)',
                boxShadow:
                  '0 2px 3px rgba(255,255,255,0.14) inset, 0 -1px 2px rgba(0,0,0,0.6) inset, 0 30px 60px -18px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              {/* specular sweep */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[22px] overflow-hidden pointer-events-none"
              >
                <div
                  className="absolute -inset-x-1/2 -top-1/2 h-[200%] opacity-40"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.16) 48%, rgba(255,255,255,0.03) 54%, transparent 62%)',
                    transform: `translateX(${tilt.y * 1.6}px)`,
                    transition: 'transform 300ms ease-out',
                  }}
                />
              </div>

              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CardChip className="w-9 h-7" />
                  <ContactlessMark className="w-4 h-4" />
                </div>
                <span className="text-white/90 text-[11px] font-bold tracking-[0.18em] uppercase">RetraLabs</span>
              </div>

              <div className="relative">
                <p className="text-white/35 text-[9px] font-bold tracking-[0.18em] uppercase mb-1.5">Accepted here</p>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center h-7 px-2 rounded-md bg-white/95 shadow-sm"><UpiMark className="h-3.5 w-auto" /></span>
                  <span className="inline-flex items-center h-7 px-2 rounded-md bg-white/95 shadow-sm"><VisaMark className="h-3.5 w-auto" /></span>
                  <span className="inline-flex items-center h-7 px-2 rounded-md bg-white/95 shadow-sm"><MastercardMark className="h-3.5 w-auto" /></span>
                  <span className="inline-flex items-center h-7 px-2 rounded-md bg-white/95 shadow-sm"><RupayMark className="h-3.5 w-auto" /></span>
                </div>
              </div>
            </div>

            {/* method tiles under the card */}
            <div className="grid grid-cols-2 gap-3 mt-7 max-w-[420px] mx-auto">
              {METHODS.map(({ icon: Icon, label, detail, accent }) => (
                <div
                  key={label}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-md p-3.5 transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20 hover:-translate-y-0.5"
                  style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset' }}
                >
                  <Icon className="w-4 h-4 mb-2 transition-transform duration-300 group-hover:scale-110" style={{ color: accent }} strokeWidth={2.2} />
                  <p className="text-white text-[13px] font-bold leading-none mb-1">{label}</p>
                  <p className="text-white/40 text-[10.5px] leading-tight">{detail}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
