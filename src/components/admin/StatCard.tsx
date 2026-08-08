import { useEffect, useRef, useState } from 'react';
import { Sparkline } from './Sparkline';
import type { StatCardData } from './types';

function useCountUp(target: number, duration = 700) {
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
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 p-4 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.tint}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <span
          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
            up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {up ? '↑' : '↓'} {Math.abs(card.change)}%
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
        {value.toLocaleString('en-IN')}
      </p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-xs text-slate-500">{card.label}</p>
        <Sparkline data={card.spark} color={card.tint.includes('blue') ? '#2563EB' : '#64748b'} />
      </div>
    </div>
  );
}
