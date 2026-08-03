import { Box } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-7 h-7', icon: 'w-3.5 h-3.5', text: 'text-sm', dot: 'w-1 h-1' },
    md: { container: 'w-9 h-9', icon: 'w-4.5 h-4.5', text: 'text-lg', dot: 'w-1.5 h-1.5' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-2xl', dot: 'w-2 h-2' },
  };

  const { container, icon, text, dot } = sizes[size];
  const isLight = variant === 'light';
  const boxBg = isLight ? 'bg-white/10' : 'bg-slate-100';
  const iconColor = 'text-cyan-400';
  const textColor = isLight ? 'text-white' : 'text-slate-900';
  const dotColor = 'bg-cyan-400';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${container} ${boxBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Box className={`w-4 h-4 ${iconColor}`} strokeWidth={2.5} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`${text} font-bold tracking-tight ${textColor}`}>RetraLabs</span>
        <span className={`${dot} ${dotColor} rounded-full flex-shrink-0 mb-0.5`} />
      </div>
    </div>
  );
}
