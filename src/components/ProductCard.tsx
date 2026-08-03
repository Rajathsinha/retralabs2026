import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Check, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ProductWithVariants } from '../types';
import { getProductImageUrl } from '../utils/imageUrl';
import { PRODUCTS } from '../data/products';

const BAC_WATER = PRODUCTS.find(p => p.name.toLowerCase().includes('bacteriostatic'));

interface ProductCardProps {
  product: ProductWithVariants;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, openCart } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  const cheapestVariant = product.variants
    .filter(v => v.in_stock)
    .sort((a, b) => a.price_inr - b.price_inr)[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cheapestVariant) return;
    addToCart(product, cheapestVariant);
    const isBac = product.name.toLowerCase().includes('bacteriostatic');
    if (!isBac && BAC_WATER) {
      const bv = BAC_WATER.variants.find(v => v.dosage_mg === 10);
      if (bv) addToCart(BAC_WATER, bv);
    }
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div
      className="group relative flex flex-col bg-white border border-[#EAECF0] overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.13)] hover:border-[#D0D5DD]"
      style={{ borderRadius: 16 }}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Image area */}
      <div className="relative w-full aspect-square bg-gradient-to-b from-[#F9FAFB] to-[#F2F4F7] overflow-hidden">
        <img
          src={getProductImageUrl(product.image_url, product.name)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain p-6 sm:p-8 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />

        {/* Quick-view overlay */}
        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-250">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#374151] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#E5E7EB] shadow-sm">
            View details <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-2">
        {/* Name */}
        <h3 className="text-[#101828] text-[14px] font-semibold leading-snug tracking-[-0.01em] line-clamp-2 min-h-[2.6em]">
          {product.name}
        </h3>

        {/* Stars + rating */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                className={`w-[12px] h-[12px] ${i <= 4 ? 'fill-[#F79009] text-[#F79009]' : 'fill-[#EAECF0] text-[#EAECF0]'}`}
                strokeWidth={0}
              />
            ))}
          </div>
          <span className="text-[#667085] text-[11px] font-medium ml-0.5">4.5</span>
        </div>

        {/* Price row */}
        <div className="flex items-baseline justify-between mt-auto pt-1">
          {cheapestVariant ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[#667085]">from</span>
              <p className="text-[#101828] text-[17px] font-bold tracking-[-0.02em]">
                {`₹${cheapestVariant.price_inr.toLocaleString('en-IN')}`}
              </p>
              {cheapestVariant.compare_at_price_inr && cheapestVariant.compare_at_price_inr > cheapestVariant.price_inr && (
                <span className="text-[#9CA3AF] text-[12px] font-medium line-through">
                  {`₹${cheapestVariant.compare_at_price_inr.toLocaleString('en-IN')}`}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[#D0D5DD] text-[13px] font-medium">Out of stock</p>
          )}
        </div>

        {/* Add to Cart */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!cheapestVariant}
          className={`w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold rounded-[10px] transition-all duration-200 mt-1 ${
            added
              ? 'bg-[#12B76A] text-white scale-[0.98]'
              : cheapestVariant
                ? 'bg-[#101828] text-white hover:bg-[#1D2939] hover:shadow-[0_4px_14px_rgba(16,24,40,0.25)] active:scale-[0.97]'
                : 'bg-[#F2F4F7] text-[#98A2B3] cursor-not-allowed'
          }`}
        >
          {added ? (
            <><Check className="w-3.5 h-3.5" /> Added to cart</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>
          )}
        </button>
      </div>
    </div>
  );
}
