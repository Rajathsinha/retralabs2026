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
import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';

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

// ── Real Trustpilot reviews ───────────────────────────────────────────────────
const REVIEWS = [
  {
    id: 1,
    name: 'Dhruv Soni',
    location: 'India',
    text: 'The order was late but it sure was legit and works fine.',
    product: 'Retatrutide',
    date: 'May 25, 2026',
    initial: 'D',
    gradient: 'from-sky-400 to-blue-500',
  },
  {
    id: 2,
    name: 'Vamshi Vikram',
    location: 'India',
    text: 'I tried Reta 10mg and finished the whole vial — it genuinely worked for me. I went from 79 kg to 73 kg in just one month. I\'m already planning to order a second vial.',
    product: 'Retatrutide 10mg',
    date: 'May 25, 2026',
    initial: 'V',
    gradient: 'from-violet-400 to-purple-500',
  },
  {
    id: 3,
    name: 'Nittin Sharma',
    location: 'India',
    text: 'Had a great experience working with them, got my reta delivered before time and the results are mind blowing. I have been conned in the past so was very skeptical before ordering, but now they have became my go to people. Highly recommended.',
    product: 'Retatrutide',
    date: 'May 1, 2026',
    initial: 'N',
    gradient: 'from-rose-400 to-pink-500',
  },
  {
    id: 4,
    name: 'Chethan Kumar',
    location: 'India',
    text: 'Product quality is top class. Used Reta and GHK-Cu — Reta worked really well, week 4 and suppression and food noise was literally zero. Overall quality is great.',
    product: 'Retatrutide · GHK-Cu',
    date: 'May 1, 2026',
    initial: 'C',
    gradient: 'from-indigo-400 to-violet-500',
  },
  {
    id: 5,
    name: 'looksmaxxer',
    location: 'India',
    text: 'The stuff is BOMB 🔥',
    product: 'Retatrutide',
    date: 'May 15, 2026',
    initial: 'L',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    id: 6,
    name: 'Mohan',
    location: 'India',
    text: 'From long time I was looking for a genuine Indian seller and finally I found this website. Original quality products in nominal price range, excellent customer support on WhatsApp and fast delivery. I happily recommend this website.',
    product: 'Retatrutide',
    date: 'May 19, 2026',
    initial: 'M',
    gradient: 'from-cyan-400 to-teal-500',
  },
  {
    id: 7,
    name: 'Alwin',
    location: 'India',
    text: 'I had my doubts at first but it was all cleared after seeing the results. Great product, works very well. Delivered to my city and well packaged. Had zero side effects. Happy with the results and happy with Retralabs.',
    product: 'Retatrutide',
    date: 'Apr 18, 2026',
    initial: 'A',
    gradient: 'from-teal-400 to-emerald-500',
  },
  {
    id: 8,
    name: 'Mohankrishna',
    location: 'United Kingdom',
    text: 'I taken Reta from them — it was a great experience. I lost 5kg in a month, it works great. Experience with the company and people are great.',
    product: 'Retatrutide',
    date: 'Apr 15, 2026',
    initial: 'M',
    gradient: 'from-emerald-400 to-green-500',
  },
  {
    id: 9,
    name: 'Mohammad Asad Khan',
    location: 'India',
    text: 'Been using Retatrutide and trust me this is legit and I have been noticing all its effects.',
    product: 'Retatrutide',
    date: 'Mar 19, 2026',
    initial: 'M',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    id: 10,
    name: 'Faizan Shaikh',
    location: 'India',
    text: 'The service is excellent — very supportive and quite reasonable. The quality, transparency, and support are top notch. Getting this quality at this price range is kinda impossible. Really good to go.',
    product: 'Retatrutide',
    date: 'Mar 9, 2026',
    initial: 'F',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 11,
    name: 'Shaikh Mohammad Ismeazam',
    location: 'India',
    text: 'Got my Reta delivered from Retralabs recently and yes it was genuine. Appetite is a lot suppressed now. No cravings for sugary foods. Lost more than 1kg in my first week. Thanks for the genuine product.',
    product: 'Retatrutide',
    date: 'Feb 6, 2026',
    initial: 'S',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    id: 12,
    name: 'Elephants World',
    location: 'India',
    text: 'Seriously the product was authentic. Services are top notch, communication is up to the standards and amazing results.',
    product: 'Retatrutide',
    date: 'May 23, 2026',
    initial: 'E',
    gradient: 'from-lime-400 to-green-500',
  },
  {
    id: 13,
    name: 'Shubham Singla',
    location: 'India',
    text: 'Trustworthy to buy and very effective after consumption. It was very effective in my weight loss journey.',
    product: 'Retatrutide',
    date: 'May 1, 2026',
    initial: 'S',
    gradient: 'from-slate-400 to-blue-500',
  },
];

type Review = typeof REVIEWS[number];

// ── Individual review card ────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <motion.div
      className="relative flex-shrink-0 w-[288px] rounded-2xl p-5 cursor-default"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        willChange: 'transform',
      }}
      whileHover={{
        y: -8,
        scale: 1.025,
        background: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.14)',
        boxShadow:
          '0 28px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,182,122,0.13)',
        transition: { duration: 0.22, ease: 'easeOut' },
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 10%, rgba(0,182,122,0.35) 50%, transparent 90%)',
        }}
      />

      {/* Stars */}
      <div className="flex gap-[3px] mb-3">
        {[1, 2, 3, 4, 5].map(i => (
          <TpStar key={i} className="w-[14px] h-[14px]" />
        ))}
      </div>

      {/* Review text */}
      <p
        className="text-[13px] text-slate-300/90 leading-relaxed mb-4 line-clamp-3"
      >
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Reviewer row */}
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}
        >
          {review.initial}
        </div>

        {/* Name + location */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-semibold text-white leading-none truncate">
              {review.name}
            </span>
            <BadgeCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          </div>
          <span className="text-[10px] text-slate-600 leading-none mt-0.5 block">
            {review.location}
          </span>
        </div>

        {/* Date */}
        <span className="text-[9px] text-slate-700 shrink-0 font-medium">
          {review.date}
        </span>
      </div>

      {/* Purchase indicator */}
      <div className="mt-3 pt-3 border-t border-white/[0.04]">
        <span className="text-[9px] text-slate-700 uppercase tracking-[0.1em] font-medium">
          ✓ Verified · {review.product}
        </span>
      </div>
    </motion.div>
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
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -80px 0px' }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
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
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.1 + i * 0.06,
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
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
            </motion.div>
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
            30 verified reviews on Trustpilot ↗
          </a>
        </p>
      </motion.div>

      {/* ── Review rows ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col gap-5"
      >
        <ScrollRow reverse={false} />
        <ScrollRow reverse={true} />
      </motion.div>

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
