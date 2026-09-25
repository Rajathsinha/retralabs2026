/**
 * Payment brand marks, shared by the checkout console, the near-CTA badge
 * strips and the marketing section so they can never drift apart.
 *
 * The method list itself lives in ./methods.
 */

/* ── Brand marks ──────────────────────────────────────────────────────────
 * Drawn as minimal, honest representations rather than pixel-copies of
 * trademarked artwork: the Mastercard rings, and clean wordmarks set in each
 * network's own colours. Recognisable at 16px, never muddy.
 * ---------------------------------------------------------------------- */

export function UpiMark({ className = 'h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 20" className={className} role="img" aria-label="UPI" fill="none">
      {/* tricolour chevrons echoing the UPI mark */}
      <path d="M2 2h5l-4 16H-2z" transform="translate(4 0)" fill="#FF7B1C" />
      <path d="M2 2h5l-4 16H-2z" transform="translate(11 0)" fill="#0C8A3E" />
      <text x="20" y="15.5" fontSize="13" fontWeight="800" fill="#0B3B8C" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.3">
        UPI
      </text>
    </svg>
  );
}

export function VisaMark({ className = 'h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 20" className={className} role="img" aria-label="Visa">
      <text
        x="24" y="15.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A1F71"
        fontFamily="Inter, system-ui, sans-serif" fontStyle="italic" letterSpacing="0.5"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardMark({ className = 'h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 20" className={className} role="img" aria-label="Mastercard">
      <circle cx="13" cy="10" r="7.5" fill="#EB001B" />
      <circle cx="21" cy="10" r="7.5" fill="#F79E1B" />
      <path d="M17 4.2a7.5 7.5 0 0 0 0 11.6 7.5 7.5 0 0 0 0-11.6z" fill="#FF5F00" />
    </svg>
  );
}

export function RupayMark({ className = 'h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 20" className={className} role="img" aria-label="RuPay">
      <text x="0" y="15.5" fontSize="13" fontWeight="800" fill="#097A3D" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.3">
        Ru
      </text>
      <text x="19" y="15.5" fontSize="13" fontWeight="800" fill="#F47216" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.3">
        Pay
      </text>
    </svg>
  );
}

/** Generic chip + contactless glyph, for the animated card face. */
export function CardChip({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 26" className={className} fill="none" aria-hidden="true">
      <rect x="0.75" y="0.75" width="32.5" height="24.5" rx="4.25" fill="url(#chipGold)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <path d="M11 1v24M23 1v24M1 9h32M1 17h32" stroke="rgba(120,80,10,0.45)" strokeWidth="1.2" />
      <defs>
        <linearGradient id="chipGold" x1="0" y1="0" x2="34" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7E3A1" />
          <stop offset="0.5" stopColor="#D9B757" />
          <stop offset="1" stopColor="#F3DC97" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ContactlessMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      {[4, 8, 12, 16].map((r, i) => (
        <path
          key={r}
          d={`M${6 + i * 1.6} ${10 - r / 2.2}a${r / 2.2} ${r / 2.2} 0 0 1 0 ${r / 1.1}`}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

