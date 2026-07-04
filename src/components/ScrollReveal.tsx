import { useScrollReveal } from '../hooks/useScrollReveal';

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: 'fade-in-up' | 'fade-in' | 'slide-in-left' | 'slide-in-right' | 'scale-in';
  delay?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  animation = 'fade-in-up',
  delay = 0,
  className = '',
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? `animate-${animation}` : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {children}
    </div>
  );
}
