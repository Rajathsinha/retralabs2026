import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger, prefersReducedMotion } from '../hooks/useGsapAnimations';

/** Exposes 0→1 scroll progress for driving 3D camera motion. */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(
  options: { start?: string; end?: string } = {}
) {
  const { start = 'top bottom', end = 'bottom top' } = options;
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setProgress(0.5);
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      scrub: true,
      onUpdate: self => setProgress(self.progress),
    });

    return () => trigger.kill();
  }, [start, end]);

  return { ref, progress };
}
