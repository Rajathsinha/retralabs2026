import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkline } from './Sparkline';
import type { StatCardData } from './types';

function useCountUp(target: number, duration = 650) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(start + (target - start) * eased);
      setVal(next);
      ref.current = next;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

/**
 * Each card's accent, keyed off the tint class the dashboard already assigns.
 * Derived here rather than threaded through StatCardData so the colour system
 * lives in one place instead of being restated at every call site.
 */
const ACCENTS: Array<[string, string]> = [
  ['blue', '#2563EB'],
  ['emerald', '#10B981'],
  ['amber', '#F59E0B'],
  ['violet', '#8B5CF6'],
  ['indigo', '#6366F1'],
  ['green', '#22C55E'],
  ['orange', '#F97316'],
  ['sky', '#0EA5E9'],
  ['rose', '#F43F5E'],
];

function accentFor(tint: string): string {
  const hit = ACCENTS.find(([name]) => tint.includes(name));
  return hit ? hit[1] : '#64748B';
}

export function StatCard({ card, index = 0 }: { card: StatCardData; index?: number }) {
  const Icon = card.icon;
  const value = useCountUp(card.value);
  const up = card.change >= 0;
  const accent = accentFor(card.tint);
  // Short enough that the last of ten cards is still in under half a second.
  const delay = Math.min(index, 11) * 0.045;

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, sheenX: 50, sheenY: 50, active: false });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max tilt angle in degrees
    const maxTilt = 10;
    const rotX = -((y - centerY) / centerY) * maxTilt;
    const rotY = ((x - centerX) / centerX) * maxTilt;

    // Sheen coordinates in percent
    const sheenX = Math.round((x / rect.width) * 100);
    const sheenY = Math.round((y / rect.height) * 100);

    setTilt({ x: rotX, y: rotY, sheenX, sheenY, active: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt((prev) => ({ ...prev, x: 0, y: 0, active: false }));
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative rounded-2xl border p-4 transition-all will-change-transform select-none overflow-hidden cursor-pointer"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        opacity: 0,
        animation: `rl-card-in 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s forwards`,
        // A wash of the card's own colour, so a grid of ten reads as distinct
        // metrics at a glance rather than ten identical white boxes.
        background: `linear-gradient(150deg, ${accent}0E 0%, #FFFFFF 42%, #FFFFFF 100%)`,
        borderColor: tilt.active ? `${accent}55` : 'rgba(226,232,240,0.9)',
        transform: tilt.active
          ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: tilt.active
          ? 'transform 0.08s ease-out, border-color 0.3s ease'
          : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease, border-color 0.3s ease',
        boxShadow: tilt.active
          ? `${(-tilt.y * 1.5).toFixed(1)}px ${(tilt.x * 1.5 + 14).toFixed(1)}px 28px -6px ${accent}40, 0 0 0 1px rgba(255,255,255,0.7) inset`
          : '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
      }}
    >
      {/* Accent rail — the card's identity, visible without hovering. */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px] origin-top transition-transform duration-500 group-hover:scale-y-100"
        style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}00)`, transform: 'scaleY(0.55)' }}
      />
      {/* 3D Specular Sheen Layer */}
      {tilt.active && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 160px at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 80%)`,
          }}
        />
      )}

      {/* Top Row (Popped out in 3D) */}
      <div
        className="flex items-start justify-between"
        style={{ transform: tilt.active ? 'translateZ(26px)' : 'none', transition: 'transform 0.2s ease-out' }}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-shadow duration-300 ${card.tint}`}
          style={{
            transform: tilt.active ? 'translateZ(10px)' : 'none',
            boxShadow: tilt.active ? `0 6px 18px -6px ${accent}` : '0 1px 2px rgba(15,23,42,0.06)',
          }}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <span
          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-xs ${
            up ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50' : 'bg-rose-50 text-rose-600 border border-rose-200/50'
          }`}
        >
          {up ? '↑' : '↓'} {Math.abs(card.change)}%
        </span>
      </div>

      {/* Big Metric (Popped out further in 3D) */}
      <p
        className="mt-3 text-2xl font-black text-slate-900 tracking-tight tabular-nums"
        style={{ transform: tilt.active ? 'translateZ(20px)' : 'none', transition: 'transform 0.2s ease-out' }}
      >
        {value.toLocaleString('en-IN')}
      </p>

      {/* Label and Sparkline */}
      <div
        className="mt-1 flex items-end justify-between"
        style={{ transform: tilt.active ? 'translateZ(14px)' : 'none', transition: 'transform 0.2s ease-out' }}
      >
        <p className="text-xs font-medium text-slate-500">{card.label}</p>
        <div className="transform-gpu transition-transform group-hover:scale-105">
          <Sparkline
            data={card.spark && card.spark.length > 0 ? card.spark : [0, 0, 0, 0, 0]}
            color={accent}
            animate
            delay={delay + 0.15}
          />
        </div>
      </div>
    </div>
  );
}
