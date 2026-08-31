import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight, Tag, CornerDownLeft, ArrowUpDown } from 'lucide-react';
import { getProductImageUrl, BAC_WATER_IMAGE_URL } from '../utils/imageUrl';
import { useCurrency } from '../context/CurrencyContext';
import { PRODUCTS } from '../data/products';
import { productDisplayName } from '../utils/productDisplayName';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent not-italic text-slate-900 font-bold bg-amber-100/60 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchOverlay({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cursor, setCursor] = useState(0);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(PRODUCTS.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedCategory('All');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter products by search query & selected category
  const results = useMemo(() => {
    let filtered = PRODUCTS;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          productDisplayName(p).toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [query, selectedCategory]);

  // Reset cursor when results change
  useEffect(() => {
    setCursor(0);
  }, [query, selectedCategory]);

  // Ensure active element is scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[cursor] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [cursor]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter' && results[cursor]) {
        e.preventDefault();
        navigate(`/product/${results[cursor].id}`);
        onClose();
      }
    },
    [results, cursor, navigate, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md transition-opacity duration-150 animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[640px] bg-[#FAFAF8] rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[82vh] transition-all duration-200 animate-in zoom-in-95"
        style={{
          boxShadow: '0 30px 90px -15px rgba(0, 0, 0, 0.3), 0 10px 30px -10px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200/80 bg-white">
          <Search strokeWidth={2} className="w-5 h-5 flex-shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search peptides, research compounds, or categories..."
            className="flex-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-slate-400 text-slate-900 tracking-tight"
            style={{ caretColor: '#2563EB' }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md tracking-wider">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-200/60 bg-slate-50/70 overflow-x-auto no-scrollbar">
          <Tag className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
          {categories.map((cat) => {
            const active = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 flex-shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto min-h-[220px]">
          {results.length === 0 ? (
            <div className="py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No matching products found</p>
              <p className="text-xs text-slate-500 mt-1">
                No products match &ldquo;<span className="font-semibold text-slate-700">{query}</span>&rdquo;
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
              </p>
            </div>
          ) : (
            <>
              {/* Header Label */}
              <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  {query.trim()
                    ? `${results.length} result${results.length !== 1 ? 's' : ''}`
                    : selectedCategory !== 'All'
                    ? `${selectedCategory} Products`
                    : 'All Products'}
                </span>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSelectedCategory('All');
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {/* Items */}
              <ul ref={listRef} className="divide-y divide-slate-100">
                {results.map((product, i) => {
                  const minPrice = Math.min(...product.variants.map((v) => v.price_inr));
                  const focused = i === cursor;

                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => {
                          navigate(`/product/${product.id}`);
                          onClose();
                        }}
                        className={`group w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all duration-150 ${
                          focused ? 'bg-slate-200/50' : 'hover:bg-slate-100/50'
                        }`}
                      >
                        {/* Product Image Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                          <img
                            src={getProductImageUrl(product.image_url, product.name)}
                            alt={product.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = BAC_WATER_IMAGE_URL;
                            }}
                          />
                        </div>

                        {/* Product Title & Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm font-semibold tracking-tight truncate ${
                                focused ? 'text-slate-950' : 'text-slate-900'
                              }`}
                            >
                              <HighlightMatch text={productDisplayName(product)} query={query} />
                            </p>
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/60 rounded">
                              {product.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5 leading-normal">
                            {product.description}
                          </p>
                        </div>

                        {/* Price & Hover Arrow */}
                        <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              focused ? 'text-blue-600 font-extrabold' : 'text-slate-800'
                            }`}
                          >
                            {format(minPrice)}
                          </span>
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 ${
                              focused
                                ? 'bg-blue-600 text-white translate-x-0 opacity-100 scale-100'
                                : 'opacity-0 -translate-x-1 scale-90 text-slate-400'
                            }`}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Footer with Kbd Shortcut Hints */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200/80 bg-white text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                <ArrowUpDown className="w-2.5 h-2.5 inline" />
              </kbd>
              <span className="hidden sm:inline">Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                <CornerDownLeft className="w-2.5 h-2.5 inline" />
              </kbd>
              <span className="hidden sm:inline">Select</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                ESC
              </kbd>
              <span className="hidden sm:inline">Close</span>
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">
            RetraLabs
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SearchModal({ isOpen, onClose }: Props) {
  return createPortal(<SearchOverlay isOpen={isOpen} onClose={onClose} />, document.body);
}
