interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const heights = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-14',
  };

  return (
    <img
      src="/image copy copy.png"
      alt="RetraLabs"
      className={`${heights[size]} w-auto flex-shrink-0`}
    />
  );
}
