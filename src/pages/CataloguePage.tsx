import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { ProductWithVariants, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSEO } from '../hooks/useSEO';
import { canonicalUrl } from '../utils/siteUrl';
import { productPath, productUrl } from '../utils/productUrl';
import { getBreadcrumbSchema } from '../utils/localSeoSchemas';
import { getItemListSchema } from '../utils/seoSchemas';
import { CATEGORIES as SEO_CATEGORIES } from '../data/seoData';
import ProductModal from '../components/ProductModal';
import { productDisplayName } from '../utils/productDisplayName';
import {
  Plus, ChevronRight, Shield, Microscope,
  FlaskConical, Package, CheckCircle, Search, SlidersHorizontal,
  Check,
} from 'lucide-react';

// ─── Per-product config ───────────────────────────────────────────────────────

type ProductCfg = {
  tag: string;
  category: string;
};

const PRODUCT_CFG: Record<string, ProductCfg> = {
  'Retatrutide':                        { tag: 'Metabolic',  category: 'metabolic' },
  'Tirzepatide':                        { tag: 'Metabolic',  category: 'metabolic' },
  'CJC-1295 (No DAC) + Ipamorelin Stack':{ tag: 'Research',   category: 'research' },
  'MOT-C':                              { tag: 'Research',   category: 'research' },
  'GHK-Cu':                             { tag: 'Anti-Aging', category: 'anti-aging' },
  'BPC-157':                            { tag: 'Recovery',   category: 'recovery' },
  'TB-500':                             { tag: 'Recovery',   category: 'recovery' },
  'Selank':                             { tag: 'Research',   category: 'research' },
  'Semax':                              { tag: 'Research',   category: 'research' },
  'Tesamorelin':                        { tag: 'Research',   category: 'research' },
  'NAD+':                               { tag: 'Anti-Aging', category: 'anti-aging' },
  'SS-31':                              { tag: 'Anti-Aging', category: 'anti-aging' },
  'Kisspeptin-10':                      { tag: 'Research',   category: 'research' },
  'AOD 9604':                           { tag: 'Metabolic',  category: 'metabolic' },
  'Cagrilintide':                       { tag: 'Metabolic',  category: 'metabolic' },
  'Klow Blend':                         { tag: 'Healing',    category: 'healing' },
  'The Wolverine Stack':                { tag: 'Recovery',   category: 'recovery' },
  'Epithalon':                          { tag: 'Anti-Aging', category: 'anti-aging' },
  'Bacteriostatic Water (Pharma Grade)':{ tag: 'Supplies',   category: 'other' },
};

const CATEGORIES = [
  { id: 'all',         label: 'All Products' },
  { id: 'metabolic',  label: 'Metabolic'   },
  { id: 'recovery',    label: 'Recovery'     },
  { id: 'anti-aging',  label: 'Anti-Aging'   },
  { id: 'healing',     label: 'Healing'      },
  { id: 'research',    label: 'Research'     },
  { id: 'other',       label: 'Other'        },
];

const SORT_OPTIONS = [
  { key: 'default',    label: 'Featured'          },
  { key: 'price-asc',  label: 'Price: Low → High' },
  { key: 'price-desc', label: 'Price: High → Low' },
  { key: 'name-asc',   label: 'Name: A → Z'       },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

// ─── Product Card ─────────────────────────────────────────────────────────────

type CardProps = {
  product: ProductWithVariants;
  onAddToCart: (p: ProductWithVariants, v: ProductVariant) => void;
  addedVariantId: string | null;
  onNavigate: (slug: string) => void;
};

function ProductCard({ product, onAddToCart, addedVariantId, onNavigate }: CardProps) {
  const { format } = useCurrency();
  const cfg = PRODUCT_CFG[product.name];
  const lowestVariant = [...product.variants].sort((a, b) => a.price_inr - b.price_inr)[0];
  const isAdded = lowestVariant && addedVariantId === lowestVariant.id;
  const hasDiscount = !!lowestVariant?.compare_at_price_inr && lowestVariant.compare_at_price_inr > lowestVariant.price_inr;

  return (
    <div
      className="group flex flex-col cursor-pointer bg-[#F2F1EC] p-3.5 sm:p-4"
      style={{ borderRadius: 20 }}
      onClick={() => onNavigate(product.slug)}
    >
      {/* Image area — plain, isolated product shot, no separate box */}
      <div
        className="relative overflow-hidden flex items-center justify-center mb-3.5"
        style={{ aspectRatio: '1 / 1' }}
      >
        {cfg && (
          <div
            className="absolute top-0 left-0 z-10 px-2.5 py-1 text-[11px] font-bold text-[#1A1A1A]"
            style={{ borderRadius: 999, background: '#F6D24C' }}
          >
            {cfg.tag}
          </div>
        )}
        <img
          src={product.image_url}
          alt={product.name}
          className="w-[62%] h-[62%] object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          style={{ filter: 'saturate(0.9)' }}
          loading="lazy"
        />
      </div>

      {/* Info area */}
      <div className="flex flex-col flex-1 gap-1.5">
        <h3 className="text-[#111111] text-[15px] sm:text-[16px] font-bold leading-snug line-clamp-2">
          {productDisplayName(product)}
        </h3>

        <p className="text-[#6B6B63] text-[13px] leading-snug line-clamp-2">
          {product.description}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[#111111] text-[16px] font-bold">
            {lowestVariant ? format(lowestVariant.price_inr) : '—'}
          </span>
          {hasDiscount && (
            <span className="text-[#9C9C93] text-[13px] line-through">
              {format(lowestVariant.compare_at_price_inr as number)}
            </span>
          )}
        </div>

        {/* Add to cart */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (lowestVariant) onAddToCart(product, lowestVariant);
          }}
          className={`mt-2.5 w-full flex items-center justify-between gap-1.5 font-bold py-2.5 sm:py-3 px-3 sm:px-4 text-[12.5px] sm:text-[14px] whitespace-nowrap transition-all duration-200 ${
            isAdded
              ? 'bg-[#16a34a] text-white'
              : 'bg-[#E8622C] hover:bg-[#D9551F] text-white active:scale-[0.98]'
          }`}
          style={{ borderRadius: 999 }}
        >
          {isAdded ? (
            <><span className="mx-auto">Added</span> <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={2.5} /></>
          ) : (
            <><span>Add to Cart</span> <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={2.5} /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CataloguePage() {
  useSEO({
    title: 'Buy Research Peptides India | Full Catalogue — Retatrutide, Tirzepatide, GHK-Cu | RetraLabs',
    description: 'Browse all HPLC-verified research peptides available in India. Retatrutide, Tirzepatide, GHK-Cu, BPC-157, TB-500, Semax, Selank and more. COA included, COD available. Ships from Bengaluru across India.',
    canonical: canonicalUrl('/catalogue'),
    keywords: 'buy peptides india, research peptides catalogue, peptide shop india, buy retatrutide bangalore, tirzepatide india catalogue, buy bpc-157 india, buy ghk-cu india, buy semax india, buy selank india',
    schema: [
      getBreadcrumbSchema([
        { name: 'Home', url: 'https://retralabs.in/' },
        { name: 'Catalogue', url: canonicalUrl('/catalogue') },
      ]),
      getItemListSchema(PRODUCTS.map(p => ({ name: p.name, url: productUrl(p) }))),
    ],
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, openCart } = useCart();

  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy]                 = useState<SortKey>('default');
  const [search, setSearch]                 = useState(() => searchParams.get('q') ?? '');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);

  // Keep ?q= and the search box in sync. The WebSite SearchAction in index.html
  // advertises /catalogue/?q={search_term_string} to Google, so that URL has to
  // actually run the search — both on first load and when shared.
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearch(prev => (prev === q ? prev : q));
  }, [searchParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value.trim()) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleAddToCart = useCallback((product: ProductWithVariants, variant: ProductVariant) => {
    addToCart(product, variant);
    // Auto-bundle bac water with every peptide (matches product-page behaviour)
    const isBac = product.name.toLowerCase().includes('bacteriostatic');
    const bacWater = PRODUCTS.find(p => p.name.toLowerCase().includes('bacteriostatic'));
    if (!isBac && bacWater) {
      const bv = bacWater.variants.find(v => v.dosage_mg === 10);
      if (bv) addToCart(bacWater, bv);
    }
    setAddedVariantId(variant.id);
    setTimeout(() => setAddedVariantId(null), 2000);
    openCart();
  }, [addToCart, openCart]);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    // category
    if (activeCategory !== 'all') {
      list = list.filter(p => PRODUCT_CFG[p.name]?.category === activeCategory);
    }

    // sort
    if (sortBy === 'price-asc')  list.sort((a, b) => (a.variants[0]?.price_inr ?? 0) - (b.variants[0]?.price_inr ?? 0));
    if (sortBy === 'price-desc') list.sort((a, b) => (b.variants[0]?.price_inr ?? 0) - (a.variants[0]?.price_inr ?? 0));
    if (sortBy === 'name-asc')   list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [activeCategory, sortBy, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: PRODUCTS.length };
    for (const cat of CATEGORIES.slice(1)) {
      counts[cat.id] = PRODUCTS.filter(p => PRODUCT_CFG[p.name]?.category === cat.id).length;
    }
    return counts;
  }, []);

  return (
    <div className="bg-white min-h-screen">

      {/* ─── Page Title ──────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] mb-5">
            <Link to="/" className="hover:text-[#374151] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/catalogue/" className="hover:text-[#374151] transition-colors">Shop</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#374151] font-medium">All Products</span>
          </nav>

          <h1 className="text-[#111111] text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] leading-tight mb-2">
            Research Peptides India
          </h1>
          <p className="text-[#6B7280] text-[15px] leading-relaxed">
            Browse our full catalogue of HPLC-verified research peptides. 99%+ purity, COA included, India-wide shipping with COD.
          </p>

          {/* Category links */}
          <div className="flex flex-wrap gap-2 mt-5">
            {SEO_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}/`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-full border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#111111] hover:bg-[#FAFAFA] transition-all"
              >
                {cat.label}
                <ChevronRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Body: Sidebar + Grid ──────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="flex gap-8 lg:gap-10 items-start">

          {/* ── Left Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-5 flex-shrink-0" style={{ width: 240 }}>

            {/* Categories */}
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="text-[#111111] text-[13px] font-bold tracking-[0.04em] uppercase">Categories</h2>
              </div>
              <nav className="py-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-5 py-2.5 text-[13px] font-medium transition-all duration-150 text-left ${
                      activeCategory === cat.id
                        ? 'text-[#E8622C] bg-[#FDEEE6]'
                        : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111111]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                      activeCategory === cat.id ? 'bg-[#E8622C]/10 text-[#E8622C]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
                    }`}>
                      {categoryCounts[cat.id] ?? 0}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Filter by Purpose */}
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="text-[#111111] text-[13px] font-bold tracking-[0.04em] uppercase">Purpose</h2>
              </div>
              <div className="py-3 px-5 space-y-2">
                {[
                  { label: 'Metabolic Research',  color: '#E8622C' },
                  { label: 'Tissue Recovery',     color: '#EA580C' },
                  { label: 'Cellular Longevity',  color: '#7C3AED' },
                  { label: 'Cognitive Support',   color: '#4338CA' },
                  { label: 'Hormonal Research',   color: '#059669' },
                ].map(item => (
                  <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className="w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-colors"
                      style={{ borderColor: item.color + '60', background: item.color + '18' }}
                    />
                    <span className="text-[13px] text-[#374151] group-hover:text-[#111111] transition-colors">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Form filter */}
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="text-[#111111] text-[13px] font-bold tracking-[0.04em] uppercase">Form</h2>
              </div>
              <div className="py-3 px-5 space-y-2">
                {['Lyophilised Powder', 'Blend / Stack', 'Medical Supplies'].map(form => (
                  <label key={form} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-3.5 h-3.5 rounded border-2 border-[#E5E7EB] flex-shrink-0 transition-colors group-hover:border-[#E8622C]" />
                    <span className="text-[13px] text-[#374151] group-hover:text-[#111111] transition-colors">{form}</span>
                  </label>
                ))}
              </div>
            </div>

          </aside>

          {/* ── Right: Toolbar + Grid ── */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex flex-col gap-3 mb-6">

              {/* Row 1: Search + Sort + Count */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.8} />
                  <input
                    type="text"
                    placeholder="Search peptides..."
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] text-[13px] text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#E8622C] focus:ring-2 focus:ring-[#E8622C]/10 transition-all bg-white"
                    style={{ borderRadius: 10 }}
                  />
                </div>

                {/* Sort */}
                <div className="relative flex-shrink-0">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortKey)}
                    className="appearance-none border border-[#E5E7EB] text-[13px] text-[#374151] font-medium pl-3 pr-8 py-2.5 focus:outline-none focus:border-[#E8622C] cursor-pointer bg-white"
                    style={{ borderRadius: 10 }}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                  <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
                </div>

                {/* Result count */}
                <span className="text-[#9CA3AF] text-[12px] font-medium hidden sm:block flex-shrink-0">
                  {filtered.length} products
                </span>
              </div>

              {/* Row 2: Mobile category pills (own row, scrollable) */}
              <div className="flex items-center gap-2 lg:hidden overflow-x-auto pb-0.5 scrollbar-hide scroll-touch">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-all ${
                      activeCategory === cat.id
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#111111]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-[#9CA3AF]" />
                </div>
                <p className="text-[#374151] text-[16px] font-semibold mb-1">No products found</p>
                <p className="text-[#9CA3AF] text-[14px]">Try adjusting your search or filter</p>
                <button
                  type="button"
                  onClick={() => { handleSearchChange(''); setActiveCategory('all'); }}
                  className="mt-4 text-[#E8622C] text-[14px] font-semibold hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filtered.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    addedVariantId={addedVariantId}
                    onNavigate={(slug) => navigate(productPath({ slug }))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── COD Banner ──────────────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pb-12">
        <div
          className="bg-[#F0FDF4] border border-[#BBF7D0] px-7 sm:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderRadius: 18 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-[12px] bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-[#16a34a]" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[#111111] text-[16px] font-bold leading-snug">
                Cash on Delivery (COD) Available
              </h3>
              <p className="text-[#6B7280] text-[14px] mt-0.5 leading-relaxed">
                Pay when your order arrives at your doorstep.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-[#16a34a] text-white text-[12px] font-bold px-5 py-2.5 rounded-full shadow-sm flex-shrink-0">
            <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
            COD
          </span>
        </div>
      </div>

      {/* ─── Feature Icons ───────────────────────────────────────────────── */}
      <div className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {[
              { icon: Shield,       title: 'Verified Compounds',  sub: 'Lab tested & authentic'   },
              { icon: Microscope,   title: 'Research Grade',       sub: 'For research use only'    },
              { icon: FlaskConical, title: 'Direct Sourcing',      sub: 'No middlemen'             },
              { icon: Package,      title: 'Discreet Packaging',   sub: '100% private & secure'    },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="w-11 h-11 rounded-[13px] border border-[#E5E7EB] bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <Icon className="w-5 h-5 text-[#E8622C]" strokeWidth={1.6} />
                </div>
                <div>
                  <p className="text-[#111111] text-[13px] font-semibold">{title}</p>
                  <p className="text-[#9CA3AF] text-[12px] mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Product Modal ───────────────────────────────────────────────── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={v => handleAddToCart(selectedProduct, v)}
          addedVariantId={addedVariantId}
        />
      )}
    </div>
  );
}
