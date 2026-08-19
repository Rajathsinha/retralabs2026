const REVIEW_IMAGES = [
  { id: 1, src: '/testimonials/image.png' },
  { id: 2, src: '/testimonials/image copy.png' },
  { id: 3, src: '/testimonials/image copy 2.png' },
  { id: 4, src: '/testimonials/image copy 3.png' },
  { id: 5, src: '/testimonials/image copy 4.png' },
] as const;

function TrustpilotStar({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center bg-[#00B67A] text-white"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.68} height={size * 0.68} fill="currentColor">
        <path d="m12 2.4 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.4Z" />
      </svg>
    </span>
  );
}

function ReviewImageCard({ src }: { src: string }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
      <div className="flex min-h-[235px] items-center justify-center bg-[#F8FAFC] p-3 sm:min-h-[260px] sm:p-4">
        <img
          src={src}
          alt="Customer review on Trustpilot"
          className="block h-auto max-h-[330px] w-full rounded-xl object-contain"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
        <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
          {[1, 2, 3, 4, 5].map(star => (
            <TrustpilotStar key={star} size={14} />
          ))}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
          Verified review
        </span>
      </div>
    </article>
  );
}

export default function TrustpilotSection() {
  return (
    <section className="relative overflow-hidden border-y border-[#E8EDF2] bg-[#F8FAFC] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-[#DDF7ED] opacity-60 blur-3xl" />

      <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto mb-10 max-w-[720px] text-center sm:mb-12">
          <div className="mb-5 flex items-center justify-center gap-2">
            <TrustpilotStar size={18} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#475569]">
              Trustpilot
            </span>
          </div>

          <div className="mb-4 flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map(star => (
              <TrustpilotStar key={star} size={27} />
            ))}
          </div>

          <h2 className="mb-3 text-3xl font-bold tracking-[-0.03em] text-[#0F172A] sm:text-4xl lg:text-5xl">
            Trusted by researchers
          </h2>
          <p className="mx-auto max-w-[560px] text-sm leading-7 text-[#64748B] sm:text-base">
            Read what customers have shared about their ordering experience with RetraLabs.
          </p>
          <a
            href="https://www.trustpilot.com/review/retralabs.in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0F766E] transition-colors hover:text-[#115E59]"
          >
            <span className="text-[#0F172A]">4.6</span>
            <span className="text-[#CBD5E1]">·</span>
            55 verified reviews on Trustpilot
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEW_IMAGES.map(review => (
            <ReviewImageCard key={review.id} src={review.src} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] leading-5 text-[#94A3B8]">
          Reviews shown from verified customer feedback. Product information is provided for research use only.
        </p>
      </div>
    </section>
  );
}
