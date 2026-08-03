interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { iconSize: 28, text: 'text-[15px]', gap: 'gap-2.5' },
    md: { iconSize: 34, text: 'text-[18px]', gap: 'gap-3'   },
    lg: { iconSize: 40, text: 'text-[22px]', gap: 'gap-3.5' },
  };

  const { iconSize, text, gap } = sizes[size];
  const isLight = variant === 'light';

  return (
    <div className={`flex items-center ${gap}`}>
      {/* Clean isometric cube — no background, pure SVG */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="RetraLabs cube"
      >
        {/* Top face */}
        <path
          d="M18 3L33 11.5V20L18 11.5L3 20V11.5L18 3Z"
          fill="url(#topFace)"
          stroke="#2B7FFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Left face */}
        <path
          d="M3 20V28.5L18 37V28.5L3 20Z"
          fill="url(#leftFace)"
          stroke="#2B7FFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right face */}
        <path
          d="M33 20V28.5L18 37V28.5L33 20Z"
          fill="url(#rightFace)"
          stroke="#2B7FFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="topFace" x1="3" y1="3" x2="33" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" stopOpacity="0.35" />
            <stop offset="1" stopColor="#2B7FFF" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="leftFace" x1="3" y1="20" x2="18" y2="37" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2B7FFF" stopOpacity="0.20" />
            <stop offset="1" stopColor="#1D4ED8" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="rightFace" x1="18" y1="20" x2="33" y2="37" gradientUnits="userSpaceOnUse">
            <stop stopColor="#93C5FD" stopOpacity="0.18" />
            <stop offset="1" stopColor="#2B7FFF" stopOpacity="0.10" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={`${text} font-semibold tracking-[-0.02em] leading-none ${isLight ? 'text-white' : 'text-slate-900'}`}
          style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}
        >
          RetraLabs
        </span>
        {/* Animated status dot */}
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-status-pulse"
          style={{ backgroundColor: '#2B7FFF', boxShadow: '0 0 6px rgba(43,127,255,0.7)' }}
        />
      </div>
    </div>
  );
}
