/**
 * Centralized Framer Motion animation variants.
 * All animations use GPU-accelerated transform + opacity only.
 * Custom ease curve [0.16, 1, 0.3, 1] ≈ iOS spring — snappy start, soft settle.
 */

const SPRING = [0.16, 1, 0.3, 1] as const;

// ── Fade + lift ───────────────────────────────────────────────────────────────
export const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: SPRING } },
};

export const fadeDown = {
  hidden:  { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: SPRING } },
};

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ── Slide ─────────────────────────────────────────────────────────────────────
export const slideLeft = {
  hidden:  { opacity: 0, x: -36 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: SPRING } },
};

export const slideRight = {
  hidden:  { opacity: 0, x: 36 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: SPRING } },
};

// ── Scale ─────────────────────────────────────────────────────────────────────
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: SPRING } },
};

export const scaleUp = {
  hidden:  { opacity: 0, scale: 0.95, y: 12 },
  visible: { opacity: 1, scale: 1,    y: 0,   transition: { duration: 0.55, ease: SPRING } },
};

// ── Stagger containers ────────────────────────────────────────────────────────
export const staggerFast = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const staggerMedium = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

export const staggerSlow = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.2,  delayChildren: 0.1 } },
};

// ── Hero headline word-by-word ────────────────────────────────────────────────
export const heroWord = {
  hidden:  { opacity: 0, y: 40, rotateX: -20 },
  visible: {
    opacity: 1, y: 0, rotateX: 0,
    transition: { duration: 0.7, ease: SPRING },
  },
};

// ── Card hover (used with whileHover) ─────────────────────────────────────────
export const cardHover = {
  rest:  { scale: 1,    y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  hover: { scale: 1.02, y: -5, transition: { duration: 0.25, ease: 'easeOut' } },
};

// ── Page transition ───────────────────────────────────────────────────────────
export const pageEnter = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0,  transition: { duration: 0.42, ease: SPRING } },
  exit:     { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } },
};

// ── Floating orb keyframes ────────────────────────────────────────────────────
export const orbFloat = {
  animate: {
    y:     [0, -24, 0],
    scale: [1, 1.06, 1],
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const orbFloat2 = {
  animate: {
    y:     [0, 20, 0],
    scale: [1, 0.94, 1],
    transition: { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 },
  },
};
