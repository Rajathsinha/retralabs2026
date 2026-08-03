interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const heights = {
    sm: 'h-6 sm:h-7 md:h-8',
    md: 'h-7 sm:h-8 md:h-10',
    lg: 'h-8 sm:h-10 md:h-12',
  };

  return (
    <img
      src="/generated-1785791272437-dffqk.png"
      alt="RetraLabs"
      className={`${heights[size]} w-auto flex-shrink-0`}
    />
  );
}
