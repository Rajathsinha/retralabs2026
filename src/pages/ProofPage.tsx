import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';

// ── Replace TRUSTPILOT_BIZ_ID with the 24-char hex from your Trustpilot
// Business dashboard → Integrations → TrustBox. Leave blank to hide widget.
const TRUSTPILOT_BIZ_ID = '';

const REVIEWS: { handle: string; source: 'reddit' | 'trustpilot'; stars: number; body: string; tag: string }[] = [
  {
    handle: 'u/Frosty-Ad-9691',
    source: 'reddit',
    stars: 5,
    body: 'Not gonna lie, I\'ve seen really mindblowing progress. Dropped tons of fat and health feels much more under control. Sugar levels way better. Friends noticed — one jumped on it too. RetraLabs peps are really genuine.',
    tag: 'Retatrutide',
  },
  {
    handle: 'u/Affectionate_Fox_313',
    source: 'reddit',
    stars: 5,
    body: 'I was very skeptical — had already been scammed by a fake online seller (fake vials, wasted ~7k). After checking proof from another user, I took the gamble. Quality is absolutely legit.',
    tag: 'Retatrutide',
  },
];

function StarRow({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= count ? '#00b67a' : '#e5e5e5'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function TrustpilotWidget() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TRUSTPILOT_BIZ_ID) return;

    const script = document.createElement('script');
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Trustpilot && ref.current) {
        window.Trustpilot.loadFromElement(ref.current, true);
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  if (!TRUSTPILOT_BIZ_ID) return null;

  return (
    <div className="py-10 px-4 max-w-4xl mx-auto">
      <div
        ref={ref}
        className="trustpilot-widget"
        data-locale="en-IN"
        data-template-id="53aa8912dec7e10d38f59f36"
        data-businessunit-id={TRUSTPILOT_BIZ_ID}
        data-style-height="240px"
        data-style-width="100%"
        data-theme="light"
        data-stars="4,5"
        data-review-languages="en"
      >
        <a href="https://www.trustpilot.com/review/retralabs.in" target="_blank" rel="noopener noreferrer">
          Trustpilot
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProofPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 pt-14 pb-12 px-4 text-center">

        {/* Trustpilot rating summary */}
        <div className="inline-flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 127 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7" aria-label="Trustpilot">
              <path d="M17 0L21 11.6H33.1L23.6 18.8L27.5 30.4L17 23.2L6.5 30.4L10.4 18.8L0.9 11.6H13L17 0Z" fill="#00b67a" />
              <text x="40" y="24" fill="#191919" fontSize="18" fontWeight="700" fontFamily="-apple-system,sans-serif">Trustpilot</text>
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <StarRow count={5} size={22} />
            <span className="text-2xl font-bold text-slate-900">4.5</span>
            <span className="text-slate-400 text-sm">out of 5</span>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="font-semibold text-slate-700">30 verified reviews</span> · Updated regularly
          </p>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4 leading-tight">
          What Researchers Are<br />
          <span className="text-gradient">Saying About Us.</span>
        </h1>

        <p className="text-slate-500 text-base max-w-xl mx-auto mb-6">
          Verified reviews from independent researchers who've sourced compounds from RetraLabs.
          All reviews collected via Trustpilot — unedited and publicly verifiable.
        </p>

        {/* Trust chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {['30 Verified Reviews', '4.5 / 5 Trustpilot Rating', 'Excellent Category'].map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>

        <a
          href="https://www.trustpilot.com/review/retralabs.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#00b67a] hover:bg-[#00a36c] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors duration-200"
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Read All Reviews on Trustpilot
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </section>

      {/* ── Live widget (shows if business ID is set) ─────────────────── */}
      <TrustpilotWidget />

      {/* ── Review card grid ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {REVIEWS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 h-full flex flex-col">

                {/* Stars + source badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <StarRow count={r.stars} />
                  {r.source === 'reddit' && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#FF4500] border border-[#FF4500]/25 bg-[#FF4500]/5 px-2 py-0.5 rounded-full flex-shrink-0">
                      {/* Reddit logo */}
                      <svg width="10" height="10" viewBox="0 0 20 20" fill="#FF4500">
                        <circle cx="10" cy="10" r="10" fill="#FF4500"/>
                        <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.16.16 0 00-.19.12l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.47-1.5zM7.5 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.08.56 3.58 3.58 0 01-2.08-.56.19.19 0 01.22-.3 3.24 3.24 0 001.86.49 3.24 3.24 0 001.86-.49.19.19 0 01.22.3zm-.08-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="white"/>
                      </svg>
                      via Reddit
                    </span>
                  )}
                </div>

                {/* Body */}
                <p className="text-sm text-slate-700 leading-relaxed flex-1">"{r.body}"</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#FF4500]/10 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="#FF4500">
                        <circle cx="10" cy="10" r="10" fill="#FF4500"/>
                        <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.16.16 0 00-.19.12l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.47-1.5zM7.5 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.08.56 3.58 3.58 0 01-2.08-.56.19.19 0 01.22-.3 3.24 3.24 0 001.86.49 3.24 3.24 0 001.86-.49.19.19 0 01.22.3zm-.08-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="white"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{r.handle}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                    {r.tag}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Trustpilot link */}
        <div className="text-center mt-10">
          <a
            href="https://www.trustpilot.com/review/retralabs.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#00b67a] transition-colors"
          >
            See all 30 reviews on Trustpilot
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-xs text-slate-400 mt-2">
            Real reviews from the r/retralabs community · Unedited
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-16 text-center px-4">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
          Ready to start your research?
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
          Fastest Delivery in India.<br />Lowest Prices. Real Support.
        </h2>
        <motion.button
          type="button"
          onClick={() => navigate('/catalogue')}
          className="inline-flex items-center gap-2 bg-cyan-400 text-slate-900 font-extrabold text-base px-8 py-3.5 rounded-2xl shadow-lg shadow-cyan-400/20"
          whileHover={{ scale: 1.05, boxShadow: '0 8px 36px rgba(34,211,238,0.45)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          Shop Now
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </section>

    </div>
  );
}
