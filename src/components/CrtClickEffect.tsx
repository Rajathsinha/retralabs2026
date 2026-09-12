import { useEffect } from 'react';

/**
 * Fires a brief CRT-style flash/sweep on every button press, site-wide.
 * Delegated at the document level so it applies to every button without
 * touching each one individually — see .crt-click in index.css.
 */
export default function CrtClickEffect() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button, [role="button"]') as HTMLElement | null;
      if (!button || button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') return;

      button.classList.remove('crt-click');
      // Force reflow so the animation restarts on rapid repeat clicks.
      void button.offsetWidth;
      button.classList.add('crt-click');
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === 'crtClickFlash') {
        (event.target as HTMLElement).classList.remove('crt-click');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('animationend', handleAnimationEnd, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('animationend', handleAnimationEnd, true);
    };
  }, []);

  return null;
}
