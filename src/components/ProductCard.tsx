import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ProductWithVariants } from '../types';
import { getProductImageUrl } from '../utils/imageUrl';

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
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div
      className="group flex flex-col bg-white border border-[#E5E7EB] overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[6px] hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.12)]"
      style={{ borderRadius: 18 }}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Image container */}
      <div className="relative w-full aspect-[4/5] bg-[#F8F9FA] overflow-hidden">
        <img
          src={getProductImageUrl(product.image_url, product.name)}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain p-5 sm:p-7 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-2.5">
        <h3 className="text-[#111111] text-[15px] font-semibold leading-snug line-clamp-2 tracking-[-0.01em]">
          {product.name}
        </h3>

        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              className={`w-[14px] h-[14px] ${i <= 4 ? 'fill-[#F59E0B] text-[#F59E0B]' : 'fill-[#E5E7EB] text-[#E5E7EB]'}`}
              strokeWidth={0}
            />
          ))}
          <span className="text-[#9CA3AF] text-[12px] ml-1.5 font-medium">4.5</span>
        </div>

        {/* Price */}
        <p className="text-[#111111] text-[17px] font-bold mt-auto tracking-[-0.02em]">
          {cheapestVariant
            ? `₹${cheapestVariant.price_inr.toLocaleString('en-IN')}`
            : 'Out of stock'}
        </p>

        {/* Add to Cart button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!cheapestVariant}
          className={`w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-all duration-200 mt-1 ${
            added
              ? 'bg-[#16a34a] text-white'
              : 'bg-[#111111] hover:bg-[#222222] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-white active:scale-[0.97]'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          style={{ borderRadius: 14 }}
        >
          {added ? (
            <><Check className="w-4 h-4" /> Added</>
          ) : (
            <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
          )}
        </button>
      </div>
    </div>
  );
}
