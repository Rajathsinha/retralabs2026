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
  ShoppingCart, ChevronRight, Shield, Microscope,
  FlaskConical, Package, CheckCircle, Search, SlidersHorizontal,
  Check, Sparkles,
} from 'lucide-react';

// ─── Per-product config ───────────────────────────────────────────────────────

type ProductCfg = {
  tag: string;
  category: string;
};

const PRODUCT_CFG: Record<string, ProductCfg> = {
  'Retatrutide':                        { tag: 'Metabolic', category: 'metabolic' },
  'Tirzepatide':                        { tag: 'Metabolic', category: 'metabolic' },
  'CJC-1295 (No DAC) + Ipamorelin Stack':{ tag: 'Research',  category: 'research' },
  'MOT-C':                              { tag: 'Research',  category: 'research' },
  'GHK-Cu':                             { tag: 'Anti-Aging', category: 'anti-aging' },
  'BPC-157':                            { tag: 'Recovery',  category: 'recovery' },
  'TB-500':                             { tag: 'Recovery',  category: 'recovery' },
  'Selank':                             { tag: 'Research',  category: 'research' },
  'Semax':                              { tag: 'Research',  category: 'research' },
  'Tesamorelin':                        { tag: 'Research',  category: 'research' },
  'NAD+':                               { tag: 'Anti-Aging', category: 'anti-aging' },
  'SS-31':                              { tag: 'Anti-Aging', category: 'anti-aging' },
  'Kisspeptin-10':                      { tag: 'Research',  category: 'research' },
  'AOD 9604':                           { tag: 'Metabolic', category: 'metabolic' },
  'Cagrilintide':                       { tag: 'Metabolic', category: 'metabolic' },
  'Klow Blend':                         { tag: 'Healing',   category: 'healing' },
  'The Wolverine Stack':                { tag: 'Recovery',  category: 'recovery' },
  'Epithalon':                          { tag: 'Anti-Aging', category: 'anti-aging' },
  'Bacteriostatic Water (Pharma Grade)':{ tag: 'Supplies',  category: 'other' },
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

  return (
    <div
      className="group relative flex flex-col cursor-pointer overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:border-[#7C6CFF]/40 hover:bg-white/[0.05] hover:-translate-y-1"
      style={{ borderRadius: 20, boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}
      onClick={() => onNavigate(product.slug)}
    >
      {/* Hover glow ring */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ borderRadius: 20, boxShadow: '0 0 0 1px rgba(124,108,255,0.35), 0 12px 40px -8px rgba(37,99,235,0.35)' }}
      />

      {/* Image area — neutral dark backdrop lets each product's own light, pastel
          photography read cleanly, like a spotlighted display case. */}
      <div
        className="relative overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: '4 / 5',
          background: 'radial-gradient(120% 120% at 50% 15%, #17161d 0%, #0c0b10 60%, #060509 100%)',
        }}
      >
        {/* Subtle hover glow, kept neutral so it doesn't tint the product photo */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(55% 45% at 50% 40%, rgba(124,108,255,0.14) 0%, transparent 70%)' }}
        />
        <img
          src={product.image_url}
          alt={product.name}
          className="relative w-full h-full object-contain p-3 sm:p-4 transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        {/* RUO badge — echoes the vial label styling */}
        {cfg && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] uppercase border border-[#a78bfa]/40 text-[#c4b5fd] bg-[#0a0812]/70 backdrop-blur-sm"
            style={{ borderRadius: 999 }}
          >
            RUO
          </div>
        )}
        {cfg && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 text-[9px] font-bold tracking-[0.08em] uppercase text-white/70 bg-white/[0.06] border border-white/10 backdrop-blur-sm"
            style={{ borderRadius: 999 }}
          >
            {cfg.tag}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="relative flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-2">
        <h3 className="text-white text-[14px] sm:text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-[#a78bfa] transition-colors duration-200">
          {productDisplayName(product)}
        </h3>

        <div className="flex items-baseline gap-1.5">
          <span className="text-white text-[15px] sm:text-[16px] font-bold">
            {lowestVariant ? format(lowestVariant.price_inr) : '—'}
          </span>
          <span className="text-white/40 text-[11px]">onwards</span>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (lowestVariant) onAddToCart(product, lowestVariant);
          }}
          className={`mt-auto w-full flex items-center justify-center gap-2 font-semibold py-2.5 text-[13px] transition-all duration-200 ${
            isAdded
              ? 'bg-[#22c55e] text-white'
              : 'text-white active:scale-[0.97] hover:shadow-[0_0_24px_-4px_rgba(124,108,255,0.6)]'
          }`}
          style={{
            borderRadius: 10,
            background: isAdded ? undefined : 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
          }}
        >
          {isAdded ? (
            <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Added</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" strokeWidth={2} /> Add to Cart</>
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
    <div className="min-h-screen relative" style={{ background: '#07090f' }}>
      {/* ─── Ambient background glows ───────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div
          className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full opacity-40 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full opacity-30 blur-[130px]"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative">
        {/* ─── Page Title ──────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.08]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8 sm:py-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[12px] text-white/40 mb-5">
              <Link to="/" className="hover:text-white/80 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/catalogue/" className="hover:text-white/80 transition-colors">Shop</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/70 font-medium">All Products</span>
            </nav>

            <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 text-[10px] font-bold tracking-[0.12em] uppercase text-[#c4b5fd] border border-[#a78bfa]/30 bg-[#a78bfa]/[0.06]" style={{ borderRadius: 999 }}>
              <Sparkles className="w-3 h-3" strokeWidth={2.2} />
              HPLC-Verified · 99%+ Purity
            </div>

            <h1
              className="text-[32px] sm:text-[44px] font-bold tracking-[-0.02em] leading-tight mb-2 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(120deg, #ffffff 30%, #c4b5fd 75%, #7dd3fc 100%)' }}
            >
              Research Peptides India
            </h1>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl">
              Browse our full catalogue of HPLC-verified research peptides. 99%+ purity, COA included, India-wide shipping with COD.
            </p>

            {/* Category links */}
            <div className="flex flex-wrap gap-2 mt-5">
              {SEO_CATEGORIES.map(cat => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}/`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold border border-white/10 bg-white/[0.03] text-white/70 hover:border-[#a78bfa]/40 hover:text-white hover:bg-white/[0.06] transition-all"
                  style={{ borderRadius: 999 }}
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
              <div className="border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="px-5 py-4 border-b border-white/[0.08]">
                  <h2 className="text-white/80 text-[13px] font-bold tracking-[0.04em] uppercase">Categories</h2>
                </div>
                <nav className="py-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`relative w-full flex items-center justify-between px-5 py-2.5 text-[13px] font-medium transition-all duration-150 text-left ${
                        activeCategory === cat.id
                          ? 'text-white bg-white/[0.06]'
                          : 'text-white/60 hover:bg-white/[0.03] hover:text-white/90'
                      }`}
                    >
                      {activeCategory === cat.id && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px]"
                          style={{ background: 'linear-gradient(180deg, #2563EB, #7C3AED)', borderRadius: 4 }}
                        />
                      )}
                      <span>{cat.label}</span>
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 ${
                        activeCategory === cat.id ? 'bg-[#a78bfa]/15 text-[#c4b5fd]' : 'bg-white/[0.05] text-white/40'
                      }`} style={{ borderRadius: 6 }}>
                        {categoryCounts[cat.id] ?? 0}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Filter by Purpose */}
              <div className="border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="px-5 py-4 border-b border-white/[0.08]">
                  <h2 className="text-white/80 text-[13px] font-bold tracking-[0.04em] uppercase">Purpose</h2>
                </div>
                <div className="py-3 px-5 space-y-2">
                  {[
                    { label: 'Metabolic Research',  color: '#60a5fa' },
                    { label: 'Tissue Recovery',     color: '#fb923c' },
                    { label: 'Cellular Longevity',  color: '#a78bfa' },
                    { label: 'Cognitive Support',   color: '#818cf8' },
                    { label: 'Hormonal Research',   color: '#34d399' },
                  ].map(item => (
                    <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className="w-3.5 h-3.5 rounded border flex-shrink-0 transition-colors"
                        style={{ borderColor: item.color + '80', background: item.color + '1f' }}
                      />
                      <span className="text-[13px] text-white/60 group-hover:text-white/90 transition-colors">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Form filter */}
              <div className="border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="px-5 py-4 border-b border-white/[0.08]">
                  <h2 className="text-white/80 text-[13px] font-bold tracking-[0.04em] uppercase">Form</h2>
                </div>
                <div className="py-3 px-5 space-y-2">
                  {['Lyophilised Powder', 'Blend / Stack', 'Medical Supplies'].map(form => (
                    <label key={form} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-3.5 h-3.5 rounded border border-white/15 flex-shrink-0 transition-colors group-hover:border-[#a78bfa]/60" />
                      <span className="text-[13px] text-white/60 group-hover:text-white/90 transition-colors">{form}</span>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" strokeWidth={1.8} />
                    <input
                      type="text"
                      placeholder="Search peptides..."
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C6CFF]/50 focus:ring-2 focus:ring-[#7C6CFF]/15 transition-all bg-white/[0.03]"
                      style={{ borderRadius: 10 }}
                    />
                  </div>

                  {/* Sort */}
                  <div className="relative flex-shrink-0">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as SortKey)}
                      className="appearance-none border border-white/10 text-[13px] text-white/80 font-medium pl-3 pr-8 py-2.5 focus:outline-none focus:border-[#7C6CFF]/50 cursor-pointer bg-white/[0.03]"
                      style={{ borderRadius: 10 }}
                    >
                      {SORT_OPTIONS.map(o => (
                        <option key={o.key} value={o.key} className="bg-[#0a0812] text-white">{o.label}</option>
                      ))}
                    </select>
                    <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  </div>

                  {/* Result count */}
                  <span className="text-white/40 text-[12px] font-medium hidden sm:block flex-shrink-0">
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
                          ? 'text-white border-transparent'
                          : 'bg-white/[0.03] text-white/60 border-white/10 hover:border-[#a78bfa]/40'
                      }`}
                      style={activeCategory === cat.id ? { background: 'linear-gradient(135deg, #2563EB, #7C3AED)' } : undefined}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* Grid */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-white/80 text-[16px] font-semibold mb-1">No products found</p>
                  <p className="text-white/40 text-[14px]">Try adjusting your search or filter</p>
                  <button
                    type="button"
                    onClick={() => { handleSearchChange(''); setActiveCategory('all'); }}
                    className="mt-4 text-[#a78bfa] text-[14px] font-semibold hover:underline"
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
            className="border border-[#34d399]/25 bg-[#34d399]/[0.06] backdrop-blur-sm px-7 sm:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ borderRadius: 18 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-[12px] bg-[#34d399]/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-[#34d399]" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-white text-[16px] font-bold leading-snug">
                  Cash on Delivery (COD) Available
                </h3>
                <p className="text-white/50 text-[14px] mt-0.5 leading-relaxed">
                  Pay when your order arrives at your doorstep.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[#22c55e] text-white text-[12px] font-bold px-5 py-2.5 rounded-full shadow-[0_0_24px_-6px_rgba(34,197,94,0.7)] flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
              COD
            </span>
          </div>
        </div>

        {/* ─── Feature Icons ───────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.08]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { icon: Shield,       title: 'Verified Compounds',  sub: 'Lab tested & authentic'   },
                { icon: Microscope,   title: 'Research Grade',       sub: 'For research use only'    },
                { icon: FlaskConical, title: 'Direct Sourcing',      sub: 'No middlemen'             },
                { icon: Package,      title: 'Discreet Packaging',   sub: '100% private & secure'    },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex flex-col items-center text-center gap-3">
                  <div className="w-11 h-11 rounded-[13px] border border-white/10 bg-white/[0.03] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#a78bfa]" strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-semibold">{title}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
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
