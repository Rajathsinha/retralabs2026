import { useEffect, useRef, useState } from 'react';

interface UseSceneVisibilityOptions {
  rootMargin?: string;
  threshold?: number;
}

/** Pauses off-screen 3D scenes via IntersectionObserver. */
export function useSceneVisibility<T extends HTMLElement = HTMLDivElement>(
  options: UseSceneVisibilityOptions = {}
) {
  const { rootMargin = '120px', threshold = 0 } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return { ref, isVisible };
}
