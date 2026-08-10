import { useEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export { gsap, ScrollTrigger, prefersReducedMotion, isTouch };

// ── Staggered text reveal: splits text into word spans and animates on scroll ──
export function useTextReveal<T extends HTMLElement = HTMLDivElement>(
  options: { delay?: number; y?: number; stagger?: number; duration?: number; start?: string } = {}
): RefObject<T> {
  const ref = useRef<T>(null);
  const { delay = 0, y = 28, stagger = 0.06, duration = 0.9, start = 'top 85%' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const words = el.querySelectorAll('[data-reveal-word]');
    if (words.length === 0) return;

    gsap.set(words, { opacity: 0, y, filter: 'blur(8px)' });
    const tween = gsap.to(words, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration,
      stagger,
      delay,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start, once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, y, stagger, duration, start]);

  return ref;
}

// ── Parallax: moves element on scroll relative to its parent section ──
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  speed: number = 0.3,
  options: { start?: string; end?: string } = {}
): RefObject<T> {
  const ref = useRef<T>(null);
  const { start = 'top bottom', end = 'bottom top' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || isTouch()) return;

    const tween = gsap.to(el, {
      yPercent: -speed * 100,
      ease: 'none',
      scrollTrigger: { trigger: el, start, end, scrub: 1 },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [speed, start, end]);

  return ref;
}

// ── Section reveal: fades + lifts a container into view ──
export function useSectionReveal<T extends HTMLElement = HTMLDivElement>(
  options: { delay?: number; y?: number; duration?: number; start?: string } = {}
): RefObject<T> {
  const ref = useRef<T>(null);
  const { delay = 0, y = 40, duration = 1, start = 'top 80%' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(el, { opacity: 0, y });
    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start, once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, y, duration, start]);

  return ref;
}

// ── Pinned scroll section: pins an element while scrubbing through an animation ──
export function usePinnedSection<T extends HTMLElement = HTMLDivElement>(
  animationFn: (tl: gsap.core.Timeline, el: HTMLElement) => void,
  options: { pinSpacing?: boolean; end?: string } = {}
): RefObject<T> {
  const ref = useRef<T>(null);
  const { pinSpacing = false, end = '+=150%' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || isTouch()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end,
          pin: true,
          pinSpacing,
          scrub: 1,
        },
      });
      animationFn(tl, el);
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSpacing, end]);

  return ref;
}

// ── Magnetic button: element follows cursor slightly on hover ──
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(
  strength: number = 0.3
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || isTouch()) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      xTo(x * strength);
      yTo(y * strength);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);

  return ref;
}

// ── Staggered children reveal: animates direct children with stagger ──
export function useStaggerChildren<T extends HTMLElement = HTMLDivElement>(
  options: { delay?: number; y?: number; stagger?: number; duration?: number; start?: string } = {}
): RefObject<T> {
  const ref = useRef<T>(null);
  const { delay = 0, y = 30, stagger = 0.1, duration = 0.8, start = 'top 85%' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el.children, { opacity: 1, y: 0 });
      return;
    }

    const children = Array.from(el.children);
    gsap.set(children, { opacity: 0, y });
    const tween = gsap.to(children, {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      delay,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start, once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, y, stagger, duration, start]);

  return ref;
}
