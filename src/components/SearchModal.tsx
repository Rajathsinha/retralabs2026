import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { getProductImageUrl, BAC_WATER_IMAGE_URL } from '../utils/imageUrl';
import { useCurrency } from '../context/CurrencyContext';
import { PRODUCTS } from '../data/products';

interface Props { isOpen: boolean; onClose: () => void; }

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent not-italic" style={{ color: '#1a1a1a', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchOverlay({ isOpen, onClose }: Props) {
  const navigate   = useNavigate();
  const { format } = useCurrency();
  const inputRef   = useRef<HTMLInputElement>(null);
  const [query,  setQuery]  = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (isOpen) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [isOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const results = query.trim().length === 0
    ? PRODUCTS.slice(0, 7)
    : PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 7);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && results[cursor]) { navigate(`/product/${results[cursor].id}`); onClose(); }
  }, [results, cursor, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(12px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full overflow-hidden"
        style={{
          maxWidth: '640px',
          background: '#FAFAF8',
          borderRadius: '20px',
          boxShadow: '0 40px 120px rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 px-7 py-5" style={{ borderBottom: '1px solid #EDECE9' }}>
          <Search strokeWidth={1.5} className="w-5 h-5 flex-shrink-0" style={{ color: '#aaa9a4' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search products…"
            className="flex-1 bg-transparent outline-none text-[15px] tracking-wide"
            style={{ color: '#1a1a1a', caretColor: '#1a1a1a' }}
          />
          {query ? (
            <button onClick={() => setQuery('')} style={{ color: '#aaa9a4' }} className="hover:opacity-60 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span
              className="text-[11px] font-medium tracking-widest uppercase"
              style={{ color: '#c9c7c0', letterSpacing: '0.12em' }}
            >
              ESC
            </span>
          )}
        </div>

        {/* Results */}
        <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm tracking-wide" style={{ color: '#9e9c96' }}>
                Nothing found for &ldquo;<span style={{ color: '#1a1a1a' }}>{query}</span>&rdquo;
              </p>
            </div>
          ) : (
            <>
              {/* Section label */}
              <div className="px-7 pt-5 pb-2">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#c0bdb6' }}>
                  {query.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'All products'}
                </span>
              </div>

              <ul>
                {results.map((product, i) => {
                  const minPrice = Math.min(...product.variants.map(v => v.price_inr));
                  const focused  = i === cursor;

                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => { navigate(`/product/${product.id}`); onClose(); }}
                        className="group w-full flex items-center gap-5 px-7 py-4 text-left transition-colors duration-100"
                        style={{ background: focused ? '#F2F1EE' : 'transparent' }}
                      >
                        {/* Image */}
                        <div
                          className="flex-shrink-0 overflow-hidden"
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: '#EDECEA',
                          }}
                        >
                          <img
                            src={getProductImageUrl(product.image_url, product.name)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = BAC_WATER_IMAGE_URL; }}
                          />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium tracking-wide truncate"
                            style={{ color: focused ? '#0a0a0a' : '#2c2b28' }}
                          >
                            <HighlightMatch text={product.name} query={query} />
                          </p>
                          <p className="text-xs truncate mt-0.5 tracking-wide" style={{ color: '#a09e98' }}>
                            {product.description}
                          </p>
                        </div>

                        {/* Price + icon */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-sm font-semibold tabular-nums"
                            style={{ color: focused ? '#0a0a0a' : '#6b6965' }}
                          >
                            {format(minPrice)}
                          </span>
                          <ArrowUpRight
                            className="w-3.5 h-3.5 transition-all duration-150"
                            style={{
                              color: '#0a0a0a',
                              opacity: focused ? 1 : 0,
                              transform: focused ? 'translate(0,0)' : 'translate(-4px, 4px)',
                            }}
                          />
                        </div>
                      </button>

                      {i < results.length - 1 && (
                        <div className="mx-7" style={{ height: 1, background: '#EDECE9' }} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-7 py-3"
          style={{ borderTop: '1px solid #EDECE9' }}
        >
          <span className="text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: '#c0bdb6' }}>
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
