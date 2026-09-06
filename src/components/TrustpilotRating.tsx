import { TRUSTPILOT } from '../constants/config';

/**
 * Trustpilot's star mark: a filled square with a white star glyph.
 * `fill` (0–1) draws the green portion left-to-right over a grey base, so a
 * score like 4.6 renders as four full stars plus a 60%-filled fifth.
 */
export function TrustpilotStar({ size = 18, fill = 1 }: { size?: number; fill?: number }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 bg-[#DCDCE6]" />
      <span className="absolute inset-y-0 left-0 bg-[#00B67A]" style={{ width: `${pct}%` }} />
      <span className="absolute inset-0 inline-flex items-center justify-center text-white">
        <svg viewBox="0 0 24 24" width={size * 0.68} height={size * 0.68} fill="currentColor">
          <path d="m12 2.4 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.4Z" />
        </svg>
      </span>
    </span>
  );
}

interface TrustpilotRatingProps {
  /** Star size in px. */
  size?: number;
  /** Light backgrounds (default) vs dark footer/hero backgrounds. */
  theme?: 'light' | 'dark';
  /** Show the "N reviews" count alongside the score. */
  showCount?: boolean;
  className?: string;
}

/**
 * RetraLabs' live-checked Trustpilot COMPANY rating, rendered in-house.
 *
 * Figures come from constants/config.ts (see TRUSTPILOT for the update
 * procedure). Deliberately not a Trustpilot TrustBox embed — those require a
 * paid plan and fall back to a bare text link when the plan does not cover
 * them. This always renders, works while prerendering, and costs no requests.
 *
 * This is the company score, labelled as such. It is never presented as a
 * rating of the individual product and is not emitted as structured data.
 */
export default function TrustpilotRating({
  size = 16,
  theme = 'light',
  showCount = true,
  className = '',
}: TrustpilotRatingProps) {
  const { rating, bestRating, reviewCount, url } = TRUSTPILOT;
  const scoreColor = theme === 'dark' ? 'text-white' : 'text-[#0F172A]';
  const metaColor = theme === 'dark' ? 'text-[#94A3B8]' : 'text-[#64748B]';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 group ${className}`}
      aria-label={`RetraLabs is rated ${rating} out of ${bestRating} from ${reviewCount} reviews on Trustpilot. Opens the Trustpilot profile in a new tab.`}
    >
      <span className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map(i => (
          <TrustpilotStar key={i} size={size} fill={rating - i} />
        ))}
      </span>
      <span className={`text-[13px] font-bold ${scoreColor}`}>{rating}</span>
      {showCount && (
        <span className={`text-[12px] ${metaColor} group-hover:underline`}>
          {reviewCount} reviews on Trustpilot
        </span>
      )}
    </a>
  );
}
