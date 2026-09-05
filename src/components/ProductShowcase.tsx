import { useState, useEffect, useRef } from 'react';
import { ProductMorphWrapper } from '../animation/LazyScenes';
import { getProductImageUrl } from '../utils/imageUrl';
import type { ProductWithVariants } from '../types';

const PRODUCT_ACCENTS: Record<string, string> = {
  'Retatrutide': '#2563EB',
  'Tirzepatide': '#1D4ED8',
  'GHK-Cu': '#1D4ED8',
  'BPC-157': '#7C3AED',
  'TB-500': '#EA580C',
  'Semax': '#4338CA',
  'Selank': '#DB2777',
  'MOT-C': '#0D9488',
  'NAD+': '#7C3AED',
  'Tesamorelin': '#059669',
};

interface ProductShowcaseProps {
  products: ProductWithVariants[];
  className?: string;
}

export function ProductShowcase({ products, className = '' }: ProductShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [morphProgress, setMorphProgress] = useState(1);
  const [prevIndex, setPrevIndex] = useState(0);
  const morphRef = useRef<number | null>(null);

  const active = products[activeIndex];
  const previous = products[prevIndex];
  const accent = PRODUCT_ACCENTS[active?.name] ?? '#2563EB';
  const prevAccent = PRODUCT_ACCENTS[previous?.name] ?? '#2563EB';

  const selectProduct = (index: number) => {
    if (index === activeIndex) return;
    setPrevIndex(activeIndex);
    setActiveIndex(index);
    setMorphProgress(0);

    if (morphRef.current) cancelAnimationFrame(morphRef.current);
    const start = performance.now();
    const duration = 900;

    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setMorphProgress(eased);
      if (t < 1) morphRef.current = requestAnimationFrame(animate);
    };
    morphRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % products.length;
        setPrevIndex(prev);
        setMorphProgress(0);

        if (morphRef.current) cancelAnimationFrame(morphRef.current);
        const start = performance.now();
        const duration = 900;

        const animate = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setMorphProgress(eased);
          if (t < 1) morphRef.current = requestAnimationFrame(animate);
        };
        morphRef.current = requestAnimationFrame(animate);

        return next;
      });
    }, 6000);
    return () => {
      clearInterval(interval);
      if (morphRef.current) cancelAnimationFrame(morphRef.current);
    };
  }, [products.length]);

  if (!active) return null;

  return (
    <div className={className}>
      <div
        className="relative w-full"
        style={{ height: 'clamp(280px, 42vw, 480px)' }}
      >
        <ProductMorphWrapper
          accentColor={accent}
          prevAccentColor={prevAccent}
          morphProgress={morphProgress}
          className="absolute inset-0"
          fallbackSrc={getProductImageUrl(active.image_url, active.name)}
        />

        {/* Product selector */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {products.map((product, i) => (
            <button
              key={product.id}
              type="button"
              aria-label={`View ${product.name}`}
              onClick={() => selectProduct(i)}
              className="transition-all duration-500"
              style={{
                width: i === activeIndex ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: i === activeIndex ? accent : 'rgba(255,255,255,0.35)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563EB] mb-1">
          Research Grade
        </p>
        <h3 className="text-[#111111] text-[20px] font-semibold tracking-tight">
          {active.name}
        </h3>
      </div>
    </div>
  );
}
