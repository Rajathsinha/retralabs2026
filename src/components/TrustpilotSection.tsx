/**
 * TrustpilotSection — premium custom review showcase.
 *
 * Design: Apple testimonials × Linear UI × luxury biotech.
 * Two bidirectional auto-scrolling rows, glassmorphism cards,
 * ambient glow, hover pause + lift, Framer Motion entrance.
 *
 * NOTE: Update REVIEWS array with your actual Trustpilot review text.
 */
import { useState } from 'react';

// ── Trustpilot brand star (exact SVG shape) ───────────────────────────────────
function TpStar({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 105 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M52.5 0L64.6 36.5H103.1L71.8 59.1L83.9 95.5L52.5 72.9L21.1 95.5L33.2 59.1L1.9 36.5H40.4L52.5 0Z"
        fill="#00b67a"
      />
    </svg>
  );
}

// ── Trustpilot review screenshots ─────────────────────────────────────────────
const REVIEWS = [
  { id: 1, image: '/testimonials/image.png' },
  { id: 2, image: '/testimonials/image copy.png' },
  { id: 3, image: '/testimonials/image copy 2.png' },
  { id: 4, image: '/testimonials/image copy 3.png' },
  { id: 5, image: '/testimonials/image copy 4.png' },
] as const;

type Review = typeof REVIEWS[number];

// ── Individual review card ────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      className="relative flex-shrink-0 w-[min(520px,84vw)] rounded-2xl p-2 cursor-default transition-all duration-200 ease-out hover:-translate-y-2 hover:scale-[1.015]"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        willChange: 'transform',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 10%, rgba(0,182,122,0.35) 50%, transparent 90%)',
        }}
      />
      <img
        src={review.image}
        alt="Trustpilot customer review"
        className="block w-full h-auto rounded-xl bg-white"
        loading="lazy"
      />
    </div>
  );
}

// ── Bidirectional scrolling row ───────────────────────────────────────────────
function ScrollRow({ reverse = false }: { reverse?: boolean }) {
  const [paused, setPaused] = useState(false);
  const doubled = [...REVIEWS, ...REVIEWS];
  const duration = reverse ? 48 : 36;
  const animName = reverse ? 'tp-right' : 'tp-left';

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-4 py-2"
        style={{
          animation: `${animName} ${duration}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange: 'transform',
        }}
      >
        {doubled.map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TrustpilotSection() {
  return (
    <section className="relative py-24 bg-[#040812] overflow-hidden">
      {/* Keyframes */}
      <style>{`
        @keyframes tp-left  { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes tp-right { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>

      {/* ── Ambient background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Emerald top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[380px]"
          style={{
            background:
              'radial-gradient(ellipse, rgba(0,182,122,0.13) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Cyan bottom-right glow */}
        <div
          className="absolute bottom-0 right-1/3 w-[500px] h-[280px]"
          style={{
            background:
              'radial-gradient(ellipse, rgba(6,182,212,0.07) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      {/* ── Section header ── */}
      <div
        className="relative text-center px-4 mb-14"
      >
        {/* Trustpilot label */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <TpStar className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold text-slate-600 tracking-[0.2em] uppercase">
            Trustpilot
          </span>
        </div>

        {/* Stars — 4 filled + 1 half = 4.5 */}
        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i}>
              {i <= 4 ? (
                <TpStar className="w-9 h-9" />
              ) : (
                /* half star — left half green, right half dark */
                <svg viewBox="0 0 105 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9" aria-hidden="true">
                  <defs>
                    <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="50%" stopColor="#00b67a" />
                      <stop offset="50%" stopColor="#1e3a2e" />
                    </linearGradient>
                  </defs>
                  <path d="M52.5 0L64.6 36.5H103.1L71.8 59.1L83.9 95.5L52.5 72.9L21.1 95.5L33.2 59.1L1.9 36.5H40.4L52.5 0Z" fill="url(#half)" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* "Great" heading */}
        <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-none mb-3">
          Great
        </h2>

        {/* Score · count · link */}
        <p className="text-sm text-slate-600">
          <span className="text-slate-300 font-semibold tabular-nums">4.5</span>
          <span className="mx-2 text-slate-800">·</span>
          <a
            href="https://www.trustpilot.com/review/retralabs.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-400 transition-colors duration-200"
          >
            55 verified reviews on Trustpilot ↗
          </a>
        </p>
      </div>

      {/* ── Review rows ── */}
      <div className="flex flex-col gap-5">
        <ScrollRow reverse={false} />
        <ScrollRow reverse={true} />
      </div>

      {/* Edge fade masks */}
      <div
        className="absolute inset-y-0 left-0 w-28 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to right, #040812 10%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-28 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to left, #040812 10%, transparent 100%)',
        }}
      />
    </section>
  );
}
