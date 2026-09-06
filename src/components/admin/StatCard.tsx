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

export function StatCard({ card }: { card: StatCardData }) {
  const Icon = card.icon;
  const value = useCountUp(card.value);
  const up = card.change >= 0;

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
      className="relative rounded-2xl bg-white border border-slate-200/90 p-4 transition-all will-change-transform select-none overflow-hidden cursor-pointer"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        transform: tilt.active
          ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: tilt.active ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease',
        boxShadow: tilt.active
          ? `${(-tilt.y * 1.5).toFixed(1)}px ${(tilt.x * 1.5 + 14).toFixed(1)}px 24px -6px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255,255,255,0.7) inset`
          : '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
      }}
    >
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
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${card.tint}`}
          style={{ transform: tilt.active ? 'translateZ(10px)' : 'none' }}
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
        <div className="transform-gpu transition-transform hover:scale-105">
          <Sparkline
            data={card.spark && card.spark.length > 0 ? card.spark : [0, 0, 0, 0, 0]}
            color={card.tint.includes('blue') ? '#2563EB' : card.tint.includes('emerald') ? '#10B981' : '#64748b'}
          />
        </div>
      </div>
    </div>
  );
}
