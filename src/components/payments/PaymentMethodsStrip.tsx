import { Banknote, Landmark, Lock } from 'lucide-react';
import { MastercardMark, RupayMark, UpiMark, VisaMark } from './paymentMethods';

type Variant = 'light' | 'dark' | 'bare';

/**
 * Compact "here's how you can pay" row, for placing directly under a CTA.
 *
 * Deliberately small and quiet: near an Add to Cart or Checkout button its job
 * is to remove a hesitation, not to compete with the button it sits beneath.
 */
export default function PaymentMethodsStrip({
  variant = 'light',
  showCod = true,
  showSecureLine = false,
  className = '',
}: {
  variant?: Variant;
  showCod?: boolean;
  showSecureLine?: boolean;
  className?: string;
}) {
  const isDark = variant === 'dark';
  const chip =
    variant === 'bare'
      ? 'bg-transparent border-transparent'
      : isDark
        ? 'bg-white/[0.06] border-white/10'
        : 'bg-white border-[#E5E7EB]';
  const labelColor = isDark ? 'text-white/55' : 'text-[#9CA3AF]';

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {[UpiMark, VisaMark, MastercardMark, RupayMark].map((Mark, i) => (
          <span
            key={i}
            className={`inline-flex items-center justify-center h-7 px-2 rounded-lg border ${chip} ${isDark ? '' : 'shadow-[0_1px_2px_rgba(16,24,40,0.04)]'}`}
          >
            <Mark className="h-3.5 w-auto" />
          </span>
        ))}
        <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border ${chip} ${isDark ? '' : 'shadow-[0_1px_2px_rgba(16,24,40,0.04)]'}`}>
          <Landmark className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-[#374151]'}`} strokeWidth={2} />
          <span className={`text-[10px] font-bold tracking-wide ${isDark ? 'text-white/70' : 'text-[#374151]'}`}>NET BANKING</span>
        </span>
        {showCod && (
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#16a34a]/25 bg-[#16a34a]/10">
            <Banknote className="w-3.5 h-3.5 text-[#15803d]" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-wide text-[#15803d]">COD</span>
          </span>
        )}
      </div>

      {showSecureLine && (
        <p className={`flex items-center gap-1.5 text-[11px] font-medium ${labelColor}`}>
          <Lock className="w-3 h-3" strokeWidth={2.5} />
          Secure payments powered by Cashfree
        </p>
      )}
    </div>
  );
}
