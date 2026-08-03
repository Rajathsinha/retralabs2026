interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { img: 'w-7 h-7',   text: 'text-[15px]', gap: 'gap-2.5' },
    md: { img: 'w-9 h-9',   text: 'text-[18px]', gap: 'gap-3'   },
    lg: { img: 'w-11 h-11', text: 'text-[22px]', gap: 'gap-3.5' },
  };

  const { img, text, gap } = sizes[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-[#111111]';

  return (
    <div className={`flex items-center ${gap}`}>
      <div className={`${img} rounded-[10px] flex-shrink-0 bg-white border border-[#EAECF0] flex items-center justify-center overflow-hidden`}>
        <img
          src="/favicon.png"
          alt="RetraLabs"
          className="w-full h-full"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <span
        className={`${text} font-semibold tracking-[-0.02em] ${textColor}`}
        style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}
      >
        RetraLabs
      </span>
    </div>
  );
}
