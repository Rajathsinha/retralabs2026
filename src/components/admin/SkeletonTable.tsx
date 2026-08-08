export function SkeletonTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 30}px` }} />
          ))}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 border-b border-slate-100 flex gap-3">
          <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + (j % 4) * 25}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
