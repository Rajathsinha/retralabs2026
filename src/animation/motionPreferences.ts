import { prefersReducedMotion, isTouch } from '../hooks/useGsapAnimations';

export type MotionTier = 'full' | 'reduced' | 'static';

/** Device capability tier for 3D animation complexity. */
export function getMotionTier(): MotionTier {
  if (prefersReducedMotion()) return 'static';

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;

  if (isTouch() || lowMemory || lowCores) return 'reduced';
  return 'full';
}

export function shouldLoad3D(): boolean {
  return getMotionTier() !== 'static';
}

export function getParticleCount(tier: MotionTier, full: number, reduced: number): number {
  if (tier === 'static') return 0;
  return tier === 'reduced' ? reduced : full;
}

export function getDpr(tier: MotionTier): [number, number] {
  if (tier === 'reduced') return [1, 1.5];
  return [1, 2];
}
