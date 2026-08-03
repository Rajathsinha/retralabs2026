interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { img: 'w-7 h-7',   text: 'text-[15px]', dot: 'w-1.5 h-1.5', gap: 'gap-2.5' },
    md: { img: 'w-9 h-9',   text: 'text-[18px]', dot: 'w-2 h-2',     gap: 'gap-3'   },
    lg: { img: 'w-11 h-11', text: 'text-[22px]', dot: 'w-2 h-2',     gap: 'gap-3.5' },
  };

  const { img, text, dot, gap } = sizes[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex items-center ${gap}`}>
      <img
        src="/favicon.png"
        alt="RetraLabs"
        className={`${img} rounded-[10px] flex-shrink-0`}
        style={{ objectFit: 'cover' }}
      />
      <div className="flex items-baseline gap-1.5">
        <span
          className={`${text} font-semibold tracking-tight ${textColor}`}
          style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}
        >
          RetraLabs
        </span>
        <span
          className={`${dot} rounded-full flex-shrink-0 mb-0.5 animate-status-pulse`}
          style={{ backgroundColor: '#2B7FFF', boxShadow: '0 0 8px rgba(43,127,255,0.6)' }}
        />
      </div>
    </div>
  );
}
