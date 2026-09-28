interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  /** Draws the line on over ~0.9s instead of appearing complete. */
  animate?: boolean;
  /** Seconds to wait before drawing, for staggering a row of cards. */
  delay?: number;
}

export function Sparkline({ data, color = '#2563EB', width = 80, height = 28, animate = false, delay = 0 }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`);
  const path = `M ${points.join(' L ')}`;
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;
  const id = `spark-${color.replace('#', '')}`;
  // Comfortably longer than the path, so the dash fully clears it whatever the
  // point count — measuring the real length would need a DOM read per render.
  const dash = (width + height) * 2;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${id})`}
        style={animate ? { opacity: 0, animation: `rl-spark-fill 0.5s ease-out ${delay + 0.55}s forwards` } : undefined}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animate ? {
          strokeDasharray: dash,
          strokeDashoffset: dash,
          animation: `rl-spark-draw 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s forwards`,
        } : undefined}
      />
    </svg>
  );
}
