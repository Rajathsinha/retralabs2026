import { Check } from 'lucide-react';
import { ProductWithVariants, ProductVariant } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface ProductModalProps {
  product: ProductWithVariants;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (variant: ProductVariant) => void;
  addedVariantId: string | null;
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, addedVariantId }: ProductModalProps) {
  const { format } = useCurrency();
  const isFlagship = product.name === 'Retatrutide' || product.name === 'Tirzepatide';
  const isBacWater = product.name === 'Bacteriostatic Water (Pharma Grade)';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors z-10"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3 pb-2 p-6">
          <div className="flex gap-2">
            {isFlagship && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-black text-white">
                FLAGSHIP
              </span>
            )}
            {product.name === 'Retatrutide' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                MOST POPULAR
              </span>
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {product.name}
          </h2>
          <p className="text-gray-600 font-normal text-base">
            {product.description}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 pt-0 gap-3 flex flex-col">
          {product.variants.map((variant) => {
            const isAdded = addedVariantId === variant.id;

            return (
              <div key={variant.id} className="rounded-2xl border border-gray-100 bg-gray-50">
                <div className="p-5 flex flex-row items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {isBacWater ? `${variant.dosage_mg}ML` : `${variant.dosage_mg}mg`}
                      </h3>
                      {variant.in_stock ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">IN STOCK</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">LIMITED</span>
                      )}
                    </div>
                    {variant.vial_configuration && (
                      <p className="text-sm text-gray-500 mb-2">
                        {variant.vial_configuration}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-gray-900">
                      {format(variant.price_inr)}
                    </p>
                  </div>

                  <button
                    disabled={!variant.in_stock}
                    onClick={() => onAddToCart(variant)}
                    className={`px-4 py-2.5 rounded-xl font-bold transition-colors ${
                      isAdded
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : !variant.in_stock
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isAdded ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Added
                      </span>
                    ) : (
                      'Add to Research'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide text-center">
            For in-vitro research only. Not for human consumption.
          </p>
        </div>
      </div>
    </div>
  );
}
