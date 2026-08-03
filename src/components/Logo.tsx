import { Box } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-7 h-7',   icon: 'w-3.5 h-3.5', text: 'text-sm',  dot: 'w-1 h-1' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5',     text: 'text-lg',  dot: 'w-1.5 h-1.5' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6',     text: 'text-2xl', dot: 'w-2 h-2' },
  };

  const { container, icon, text, dot } = sizes[size];
  const isLight = variant === 'light';
  const textColor = isLight ? 'text-white' : 'text-slate-900';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${container} rounded-[14px] flex items-center justify-center flex-shrink-0`}
        style={{
          background: isLight
            ? 'rgba(255,255,255,0.12)'
            : 'linear-gradient(135deg, rgba(43,127,255,0.10) 0%, rgba(99,179,237,0.06) 100%)',
          border: isLight
            ? '1px solid rgba(255,255,255,0.18)'
            : '1px solid rgba(43,127,255,0.18)',
          boxShadow: isLight
            ? '0 4px 16px rgba(0,0,0,0.12)'
            : '0 2px 10px rgba(43,127,255,0.10), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}
      >
        <Box className={`${icon} text-[#2B7FFF]`} strokeWidth={2.2} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`${text} font-semibold tracking-tight ${textColor}`} style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
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
