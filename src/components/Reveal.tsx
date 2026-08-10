import { type ReactNode } from 'react';
import { useTextReveal } from '../hooks/useGsapAnimations';

interface RevealTextProps {
  children: string;
  className?: string;
  delay?: number;
  stagger?: number;
  y?: number;
  start?: string;
}

export function RevealText({
  children,
  className = '',
  delay = 0,
  stagger = 0.06,
  y = 28,
  start = 'top 85%',
}: RevealTextProps) {
  const ref = useTextReveal<HTMLDivElement>({ delay, stagger, y, start });
  const words = children.split(' ');

  return (
    <div ref={ref} className={className} aria-label={children}>
      {words.map((word, i) => (
        <span key={i} aria-hidden="true" style={{ display: 'inline-block', overflow: 'hidden' }}>
          <span data-reveal-word style={{ display: 'inline-block' }}>
            {word}
          </span>
          {i < words.length - 1 && <span style={{ display: 'inline-block' }}>&nbsp;</span>}
        </span>
      ))}
    </div>
  );
}

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  start?: string;
}

export function RevealSection({
  children,
  className = '',
  delay = 0,
  y = 40,
  start = 'top 80%',
}: RevealSectionProps) {
  const ref = useSectionReveal<HTMLDivElement>({ delay, y, start });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  y?: number;
  start?: string;
}

export function StaggerGroup({
  children,
  className = '',
  delay = 0,
  stagger = 0.1,
  y = 30,
  start = 'top 85%',
}: StaggerGroupProps) {
  const ref = useStaggerChildren<HTMLDivElement>({ delay, stagger, y, start });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
