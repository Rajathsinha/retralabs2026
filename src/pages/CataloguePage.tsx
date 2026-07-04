import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { ProductWithVariants, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSEO } from '../hooks/useSEO';
import { getBreadcrumbSchema } from '../utils/localSeoSchemas';
import ProductModal from '../components/ProductModal';
import {
  Star, ShoppingCart, ChevronRight, Shield, Microscope,
  FlaskConical, Package, CheckCircle, Search, SlidersHorizontal,
  ArrowRight, Check,
} from 'lucide-react';

// ─── Per-product config ───────────────────────────────────────────────────────

type ProductCfg = {
  tag: string;
  tagColor: string;
  tagBg: string;
  category: string;
  reviews: number;
};

const PRODUCT_CFG: Record<string, ProductCfg> = {
  'Retatrutide':                        { tag: 'Weight Loss',  tagColor: '#2563EB', tagBg: '#EFF6FF', category: 'weight-loss', reviews: 41 },
  'Tirzepatide':                        { tag: 'Weight Loss',  tagColor: '#1D4ED8', tagBg: '#EFF6FF', category: 'weight-loss', reviews: 27 },
  'CJC-1295 (No DAC) + Ipamorelin Stack':{ tag: 'Research',   tagColor: '#7C3AED', tagBg: '#F5F3FF', category: 'research',    reviews: 32 },
  'MOT-C':                              { tag: 'Research',     tagColor: '#0D9488', tagBg: '#F0FDFA', category: 'research',    reviews: 16 },
  'GHK-Cu':                             { tag: 'Anti-Aging',   tagColor: '#1D4ED8', tagBg: '#EFF6FF', category: 'anti-aging',  reviews: 39 },
  'BPC-157':                            { tag: 'Recovery',     tagColor: '#7C3AED', tagBg: '#F5F3FF', category: 'recovery',    reviews: 31 },
  'TB-500':                             { tag: 'Recovery',     tagColor: '#EA580C', tagBg: '#FFF7ED', category: 'recovery',    reviews: 19 },
  'Selank':                             { tag: 'Research',     tagColor: '#DB2777', tagBg: '#FDF2F8', category: 'research',    reviews: 22 },
  'Semax':                              { tag: 'Research',     tagColor: '#4338CA', tagBg: '#EEF2FF', category: 'research',    reviews: 18 },
  'Tesamorelin':                        { tag: 'Research',     tagColor: '#059669', tagBg: '#F0FDF4', category: 'research',    reviews: 12 },
  'NAD+':                               { tag: 'Anti-Aging',   tagColor: '#7C3AED', tagBg: '#F5F3FF', category: 'anti-aging',  reviews: 14 },
  'SS-31':                              { tag: 'Anti-Aging',   tagColor: '#DB2777', tagBg: '#FDF2F8', category: 'anti-aging',  reviews: 13 },
  'Kisspeptin-10':                      { tag: 'Research',     tagColor: '#EC4899', tagBg: '#FDF2F8', category: 'research',    reviews: 7  },
  'AOD 9604':                           { tag: 'Weight Loss',  tagColor: '#EA580C', tagBg: '#FFF7ED', category: 'weight-loss', reviews: 11 },
  'Cagrilintide':                       { tag: 'Weight Loss',  tagColor: '#16A34A', tagBg: '#F0FDF4', category: 'weight-loss', reviews: 6  },
  'Klow Blend':                         { tag: 'Healing',      tagColor: '#0891B2', tagBg: '#ECFEFF', category: 'healing',     reviews: 8  },
  'The Wolverine Stack':                { tag: 'Recovery',     tagColor: '#6B21A8', tagBg: '#F5F3FF', category: 'recovery',    reviews: 29 },
  'Epithalon':                          { tag: 'Anti-Aging',   tagColor: '#2563EB', tagBg: '#EFF6FF', category: 'anti-aging',  reviews: 9  },
  'Bacteriostatic Water (Pharma Grade)':{ tag: 'Supplies',     tagColor: '#6B7280', tagBg: '#F9FAFB', category: 'other',       reviews: 54 },
};

const CATEGORIES = [
  { id: 'all',         label: 'All Products' },
  { id: 'weight-loss', label: 'Weight Loss'  },
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
  onOpen: (p: ProductWithVariants) => void;
  onAddToCart: (p: ProductWithVariants, v: ProductVariant) => void;
  addedVariantId: string | null;
  onNavigate: (id: string) => void;
};

function ProductCard({ product, onOpen, onAddToCart, addedVariantId, onNavigate }: CardProps) {
  const { format } = useCurrency();
  const cfg = PRODUCT_CFG[product.name];
  const lowestVariant = [...product.variants].sort((a, b) => a.price_inr - b.price_inr)[0];
  const isAdded = lowestVariant && addedVariantId === lowestVariant.id;

  return (
    <div
      className="group bg-white border border-[#EBEBEB] flex flex-col cursor-pointer transition-all duration-300 hover:border-[#D0D0D0] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
      style={{ borderRadius: 18 }}
      onClick={() => onNavigate(product.id)}
    >
      {/* Image area */}
      <div
        className="relative overflow-hidden bg-[#F8F9FA] flex items-center justify-center"
        style={{ borderRadius: '18px 18px 0 0', aspectRatio: '1 / 1' }}
      >
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain p-4 sm:p-6 transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        {/* Category tag */}
        {cfg && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] uppercase"
            style={{ borderRadius: 8, color: cfg.tagColor, background: cfg.tagBg }}
          >
            {cfg.tag}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-2">
        {/* Product name */}
        <h3 className="text-[#111111] text-[14px] sm:text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors duration-200">
          {product.name}
        </h3>

        {/* Stars + reviews */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />
            ))}
          </div>
          <span className="text-[#9CA3AF] text-[11px] font-medium">
            ({cfg?.reviews ?? 0})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[#111111] text-[15px] sm:text-[16px] font-bold">
            {lowestVariant ? format(lowestVariant.price_inr) : '—'}
          </span>
          <span className="text-[#9CA3AF] text-[11px]">onwards</span>
        </div>

        {/* Add to cart */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (lowestVariant) onAddToCart(product, lowestVariant);
          }}
          className={`mt-auto w-full flex items-center justify-center gap-2 font-semibold py-2.5 text-[13px] transition-all duration-200 ${
            isAdded
              ? 'bg-[#16a34a] text-white'
              : 'bg-[#111111] hover:bg-[#1a1a1a] text-white active:scale-[0.97]'
          }`}
          style={{ borderRadius: 10 }}
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
    title: 'Buy Research Peptides India | Full Catalogue | RetraLabs Bengaluru',
    description: 'Browse all HPLC-verified research peptides available in India. Retatrutide, Tirzepatide, GHK-Cu, BPC-157, and more. COD available. Ships from Bengaluru across India.',
    canonical: 'https://retralabs.in/catalogue',
    keywords: 'buy peptides india, research peptides catalogue, peptide shop india, buy retatrutide bangalore, tirzepatide india catalogue',
    schema: getBreadcrumbSchema([
      { name: 'Home', url: 'https://retralabs.in/' },
      { name: 'Catalogue', url: 'https://retralabs.in/catalogue' },
    ]),
  });

  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy]                 = useState<SortKey>('default');
  const [search, setSearch]                 = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);

  const handleAddToCart = useCallback((product: ProductWithVariants, variant: ProductVariant) => {
    addToCart(product, variant);
    setAddedVariantId(variant.id);
    setTimeout(() => setAddedVariantId(null), 2000);
  }, [addToCart]);

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
            <button onClick={() => navigate('/')} className="hover:text-[#374151] transition-colors">Home</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate('/catalogue')} className="hover:text-[#374151] transition-colors">Shop</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#374151] font-medium">All Products</span>
          </nav>

          <h1 className="text-[#111111] text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] leading-tight mb-2">
            Our Peptides
          </h1>
          <p className="text-[#6B7280] text-[15px] leading-relaxed">
            Premium quality. Verified compounds. Delivered with trust.
          </p>
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
                        ? 'text-[#2563EB] bg-[#EFF6FF]'
                        : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111111]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                      activeCategory === cat.id ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
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
                  { label: 'Weight Management',  color: '#2563EB' },
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
                    <div className="w-3.5 h-3.5 rounded border-2 border-[#E5E7EB] flex-shrink-0 transition-colors group-hover:border-[#2563EB]" />
                    <span className="text-[13px] text-[#374151] group-hover:text-[#111111] transition-colors">{form}</span>
                  </label>
                ))}
              </div>
            </div>

          </aside>

          {/* ── Right: Toolbar + Grid ── */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.8} />
                <input
                  type="text"
                  placeholder="Search peptides..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] text-[13px] text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-white"
                  style={{ borderRadius: 10 }}
                />
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile category filter */}
                <div className="flex items-center gap-2 lg:hidden overflow-x-auto pb-0.5 flex-1">
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

                {/* Sort */}
                <div className="relative flex-shrink-0">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortKey)}
                    className="appearance-none border border-[#E5E7EB] text-[13px] text-[#374151] font-medium pl-3 pr-8 py-2.5 focus:outline-none focus:border-[#2563EB] cursor-pointer bg-white"
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
                  onClick={() => { setSearch(''); setActiveCategory('all'); }}
                  className="mt-4 text-[#2563EB] text-[14px] font-semibold hover:underline"
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
                    onOpen={setSelectedProduct}
                    onAddToCart={handleAddToCart}
                    addedVariantId={addedVariantId}
                    onNavigate={(id) => navigate(`/product/${id}`)}
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
                  <Icon className="w-5 h-5 text-[#2563EB]" strokeWidth={1.6} />
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
