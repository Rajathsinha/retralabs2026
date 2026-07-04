import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getProductImageUrl } from '../utils/imageUrl';
import { ProductWithVariants, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSEO } from '../hooks/useSEO';
import { WHATSAPP_NUMBER } from '../constants/config';
import { PRODUCTS } from '../data/products';
import {
  ChevronRight, Star, Check, Package, Truck, Shield,
  ShieldCheck, FlaskConical, FileCheck, MessageCircle,
  Clock, ShoppingCart, Minus, Plus, X, Microscope,
  Lock, ChevronLeft,
} from 'lucide-react';

const DEMO_BAC_WATER = PRODUCTS.find(p => p.name.includes('Bacteriostatic'))!;

// ─── Product accent colors ────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  'Retatrutide': '#2563EB',
  'Tirzepatide': '#1D4ED8',
  'CJC-1295 (No DAC) + Ipamorelin Stack': '#7C3AED',
  'MOT-C': '#0D9488',
  'GHK-Cu': '#1D4ED8',
  'BPC-157': '#7C3AED',
  'TB-500': '#EA580C',
  'Selank': '#DB2777',
  'Semax': '#4338CA',
  'Tesamorelin': '#059669',
  'NAD+': '#7C3AED',
  'SS-31': '#DB2777',
  'Kisspeptin-10': '#EC4899',
  'AOD 9604': '#EA580C',
  'Cagrilintide': '#16A34A',
  'Klow Blend': '#0891B2',
  'The Wolverine Stack': '#6B21A8',
  'Epithalon': '#2563EB',
};

const PURITY_MAP: Record<string, string> = {
  'Retatrutide': '99.2', 'Tirzepatide': '99.4', 'GHK-Cu': '99.1',
  'Semax': '99.1', 'Selank': '99.2', 'BPC-157': '99.3',
  'NAD+': '99.0', 'TB-500': '99.1', 'Tesamorelin': '99.2',
  'MOT-C': '99.0', 'Klow Blend': '99.0',
  'CJC-1295 (No DAC) + Ipamorelin Stack': '99.1',
  'The Wolverine Stack': '99.1',
  'AOD 9604': '99.1', 'Epithalon': '99.2',
  'Kisspeptin-10': '99.1', 'SS-31': '99.0', 'Cagrilintide': '99.1',
};

const REVIEWS_MAP: Record<string, { count: number; avg: number }> = {
  'Retatrutide': { count: 41, avg: 4.9 },
  'Tirzepatide': { count: 27, avg: 4.8 },
  'GHK-Cu': { count: 39, avg: 4.9 },
  'Semax': { count: 18, avg: 4.7 },
  'Selank': { count: 22, avg: 4.8 },
  'BPC-157': { count: 31, avg: 4.9 },
  'NAD+': { count: 14, avg: 4.7 },
  'TB-500': { count: 19, avg: 4.8 },
  'Tesamorelin': { count: 12, avg: 4.8 },
  'MOT-C': { count: 16, avg: 4.7 },
  'Klow Blend': { count: 8, avg: 4.9 },
  'CJC-1295 (No DAC) + Ipamorelin Stack': { count: 32, avg: 4.8 },
  'The Wolverine Stack': { count: 29, avg: 4.9 },
  'AOD 9604': { count: 11, avg: 4.7 },
  'Epithalon': { count: 9, avg: 4.8 },
  'Kisspeptin-10': { count: 7, avg: 4.7 },
  'SS-31': { count: 13, avg: 4.8 },
  'Cagrilintide': { count: 6, avg: 4.8 },
};

const SPEC_MAP: Record<string, Record<string, string>> = {
  'Retatrutide': { 'CAS Number': '2381089-83-2', 'Molecular Weight': '~4113.5 Da', 'Purity': '>99.2%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Metabolic / Obesity' },
  'Tirzepatide': { 'CAS Number': '2023788-19-2', 'Molecular Weight': '~4813.5 Da', 'Purity': '>99.4%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Metabolic / GLP-1/GIP' },
  'BPC-157': { 'CAS Number': '137525-51-0', 'Molecular Weight': '~1419.5 Da', 'Purity': '>99.3%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Tissue Repair / Gut' },
  'TB-500': { 'CAS Number': '77591-33-4', 'Molecular Weight': '~4963 Da', 'Purity': '>99.1%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Tissue Repair / Recovery' },
  'GHK-Cu': { 'CAS Number': '49557-75-7', 'Molecular Weight': '~340.38 Da', 'Purity': '>99.1%', 'Appearance': 'Blue lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Skin / Anti-Aging' },
  'NAD+': { 'CAS Number': '53-84-9', 'Molecular Weight': '~663.4 Da', 'Purity': '>99.0%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Cellular Energy / Longevity' },
  'Semax': { 'CAS Number': '80714-61-0', 'Molecular Weight': '~813.9 Da', 'Purity': '>99.1%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Cognitive / Neuroprotection' },
  'Selank': { 'CAS Number': '129954-34-3', 'Molecular Weight': '~751.9 Da', 'Purity': '>99.2%', 'Appearance': 'White lyophilised powder', 'Storage': '-20C (lyophilised)', 'Form': 'Lyophilised powder', 'Research Use': 'Anxiolytic / Cognitive' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [bacWater, setBacWater] = useState<ProductWithVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [bundleAdded, setBundleAdded] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'research' | 'shipping'>('description');
  const { addToCart, openCart } = useCart();
  const { format } = useCurrency();

  // SEO
  const seoPurity = product ? (PURITY_MAP[product.name] ?? '99+') : '99+';
  const lowestPrice = product ? Math.min(...product.variants.map(v => v.price_inr)) : 0;
  useSEO({
    title: product ? `Buy ${product.name} India | ${seoPurity}% Purity | ${format(lowestPrice)} | RetraLabs` : 'Research Peptides India | RetraLabs',
    description: product ? `Buy ${product.name} in India. ${seoPurity}% HPLC-verified purity, COA included. From ${format(lowestPrice)}. Free shipping.` : '',
  });

  useEffect(() => { if (id) loadProduct(id); }, [id]);

  async function loadProduct(productId: string) {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      const p = PRODUCTS.find(p => p.id === productId);
      if (p) { setProduct(p); if (p.variants.length) setSelectedVariant(p.variants[0]); if (!p.name.includes('Bacteriostatic')) setBacWater(DEMO_BAC_WATER); }
      setLoading(false);
      return;
    }
    try {
      const { data: pd } = await supabase.from('products').select('*').eq('id', productId).single();
      const { data: vd } = pd ? await supabase.from('product_variants').select('*').eq('product_id', productId).order('dosage_mg') : { data: null };
      if (pd && vd && vd.length > 0) {
        const pw = { ...pd, variants: vd }; setProduct(pw); if (vd.length) setSelectedVariant(vd[0]);
        const { data: bw } = await supabase.from('products').select('*').ilike('name', '%Bacteriostatic%').single();
        if (bw) { const { data: bwv } = await supabase.from('product_variants').select('*').eq('product_id', bw.id).order('dosage_mg'); if (bwv) setBacWater({ ...bw, variants: bwv }); }
      } else {
        const p = PRODUCTS.find(p => p.id === productId);
        if (p) { setProduct(p); if (p.variants.length) setSelectedVariant(p.variants[0]); if (!p.name.includes('Bacteriostatic')) setBacWater(DEMO_BAC_WATER); }
      }
    } catch { const p = PRODUCTS.find(p => p.id === productId); if (p) { setProduct(p); if (p.variants.length) setSelectedVariant(p.variants[0]); setBacWater(DEMO_BAC_WATER); } }
    finally { setLoading(false); }
  }

  const [cartAdded, setCartAdded] = useState(false);

  // Referral popup state
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralSource, setReferralSource] = useState('');
  const [friendName, setFriendName] = useState('');
  const [disclaimerTyped, setDisclaimerTyped] = useState('');
  const DISCLAIMER_PHRASE = 'I will not ask for dosage guidance';
  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState('');
  const REFERRAL_OPTIONS = ['Reddit', 'Google', 'Friend', 'Instagram', 'YouTube', 'IndiaMART', 'Other'];

  const openWithReferral = (baseUrl: string) => {
    setPendingWhatsAppUrl(baseUrl); setReferralSource(''); setFriendName(''); setDisclaimerTyped(''); setReferralOpen(true);
  };
  const submitReferral = () => {
    if (!referralSource) return;
    const ref = referralSource === 'Friend' && friendName ? `%0A%0AFound you via: Friend (referred by ${encodeURIComponent(friendName)})` : `%0A%0AFound you via: ${encodeURIComponent(referralSource)}`;
    window.open(pendingWhatsAppUrl + ref, '_blank', 'noopener,noreferrer'); setReferralOpen(false);
  };

  const isBacWater = product?.name?.includes('Bacteriostatic') ?? false;
  const isNonDiscountable = isBacWater || (product?.name?.includes('GHK') ?? false);
  const bacWaterPrice = bacWater?.variants.find(v => v.dosage_mg === 10)?.price_inr || 400;
  const basePrice = selectedVariant ? selectedVariant.price_inr * quantity : 0;
  const discountPercent = isNonDiscountable ? 0 : quantity >= 3 ? 20 : quantity === 2 ? 10 : 0;
  const discountAmount = Math.round((basePrice * discountPercent) / 100);
  const totalPrice = (bundleAdded && !isBacWater ? basePrice + bacWaterPrice : basePrice) - discountAmount;

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    for (let i = 0; i < quantity; i++) addToCart(product, selectedVariant);
    if (bundleAdded && bacWater && !isBacWater) { const bv = bacWater.variants.find(v => v.dosage_mg === 10); if (bv) addToCart(bacWater, bv); }
    setCartAdded(true); setTimeout(() => setCartAdded(false), 2000); openCart();
  };

  const handleBuyNow = () => {
    if (!product || !selectedVariant) return;
    for (let i = 0; i < quantity; i++) addToCart(product, selectedVariant);
    if (bundleAdded && bacWater && !isBacWater) { const bv = bacWater.variants.find(v => v.dosage_mg === 10); if (bv) addToCart(bacWater, bv); }
    openCart();
  };

  // Loading state
  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#111] rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <FlaskConical className="w-12 h-12 text-[#D1D5DB]" />
      <p className="text-[#6B7280] text-[15px]">Product not found</p>
      <button onClick={() => navigate('/catalogue')} className="text-[#2563EB] text-[14px] font-semibold hover:underline">Back to Shop</button>
    </div>
  );

  const accent = ACCENT_MAP[product.name] ?? '#2563EB';
  const purity = PURITY_MAP[product.name] ?? '99';
  const reviews = REVIEWS_MAP[product.name] ?? { count: 12, avg: 4.8 };
  const specs = SPEC_MAP[product.name];
  const isFlagship = product.name === 'Retatrutide' || product.name === 'Tirzepatide';
  const relatedProducts = PRODUCTS.filter(p => p.id !== product.id && !p.name.includes('Bacteriostatic')).slice(0, 4);

  return (
    <>
    <div className="min-h-screen bg-white pb-24 lg:pb-0">

      {/* ─── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#F0F0F0]">
        <div className="max-w-[1320px] mx-auto px-6 py-3.5">
          <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
            <button onClick={() => navigate('/')} className="hover:text-[#374151] transition-colors">Home</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate('/catalogue')} className="hover:text-[#374151] transition-colors">Shop</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate('/catalogue')} className="hover:text-[#374151] transition-colors">All Products</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#374151] font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* ─── Main 2-col ─────────────────────────────────────────────────── */}
      <div className="max-w-[1320px] mx-auto px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── LEFT: Image Gallery ──────────────────────────────────────── */}
          <div className="flex gap-4">
            {/* Thumbnails */}
            <div className="hidden sm:flex flex-col gap-3 flex-shrink-0">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`w-[72px] h-[72px] rounded-[12px] border-2 overflow-hidden flex items-center justify-center bg-[#F8F9FA] cursor-pointer transition-all ${
                    i === 0 ? 'border-[#111111]' : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
                  }`}
                >
                  <img
                    src={getProductImageUrl(product.image_url, product.name)}
                    alt={product.name}
                    className="w-full h-full object-contain p-1.5"
                  />
                </div>
              ))}
            </div>

            {/* Main image */}
            <div className="flex-1 sticky top-24">
              <div
                className="relative aspect-[4/5] rounded-[20px] overflow-hidden bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-center"
              >
                <img
                  src={getProductImageUrl(product.image_url, product.name)}
                  alt={product.name}
                  className="w-full h-full object-contain p-8 sm:p-12"
                />
                {isFlagship && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: accent }}>
                    <Star className="w-3 h-3 fill-current" /> BEST SELLER
                  </div>
                )}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] font-bold text-[#16a34a]">
                  <Check className="w-3 h-3" strokeWidth={3} /> IN STOCK
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Product Info ──────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Title + rating */}
            <div>
              <h1 className="text-[#111111] text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] leading-tight mb-2">
                {product.name}
              </h1>
              {!isBacWater && selectedVariant && (
                <p className="text-[#6B7280] text-[16px] font-medium mb-3">
                  {selectedVariant.dosage_mg} {isBacWater ? 'ML' : 'MG'}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />
                  ))}
                </div>
                <span className="text-[#111111] text-[14px] font-semibold">{reviews.avg}</span>
                <span className="text-[#9CA3AF] text-[13px]">({reviews.count} Reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-[#111111] text-[28px] font-bold tracking-[-0.02em]">
                {selectedVariant ? format(selectedVariant.price_inr) : '—'}
              </span>
              {discountPercent > 0 && (
                <span className="text-[#9CA3AF] text-[16px] line-through">
                  {format(Math.round(selectedVariant!.price_inr * 1.15))}
                </span>
              )}
              <span className="text-[#16a34a] text-[13px] font-semibold">Free Shipping</span>
            </div>

            {/* Description */}
            <p className="text-[#6B7280] text-[14px] leading-relaxed">
              {product.description}
            </p>

            {/* Dosage selector */}
            <div>
              <p className="text-[#111111] text-[13px] font-bold uppercase tracking-[0.06em] mb-3">Select Variant</p>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map(v => {
                  const selected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`relative px-5 py-3 text-[13px] font-semibold border-2 transition-all duration-200 ${
                        selected
                          ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
                          : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#111111]'
                      }`}
                      style={{ borderRadius: 12 }}
                    >
                      <span className="block">{v.vial_configuration || `${v.dosage_mg}${isBacWater ? 'ML' : 'mg'}`}</span>
                      <span className={`block text-[11px] mt-0.5 ${selected ? 'text-white/70' : 'text-[#9CA3AF]'}`}>
                        {format(v.price_inr)}
                      </span>
                      {v.is_recommended && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#F59E0B] rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-current" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <p className="text-[#111111] text-[13px] font-bold uppercase tracking-[0.06em] mb-3">Quantity</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 border-[#E5E7EB] overflow-hidden" style={{ borderRadius: 12 }}>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 flex items-center justify-center text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                  >
                    <Minus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <div className="w-12 h-11 flex items-center justify-center text-[#111111] text-[15px] font-bold border-x-2 border-[#E5E7EB]">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-11 h-11 flex items-center justify-center text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
                {quantity >= 2 && !isNonDiscountable && (
                  <span className="text-[#16a34a] text-[12px] font-semibold bg-[#F0FDF4] px-3 py-1.5 rounded-full border border-[#BBF7D0]">
                    {discountPercent}% volume discount
                  </span>
                )}
              </div>
            </div>

            {/* Bundle toggle */}
            {!isBacWater && bacWater && (
              <button
                type="button"
                onClick={() => setBundleAdded(!bundleAdded)}
                className={`w-full flex items-center gap-4 px-5 py-4 border-2 transition-all duration-200 text-left ${
                  bundleAdded
                    ? 'border-[#16a34a] bg-[#F0FDF4]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#9CA3AF]'
                }`}
                style={{ borderRadius: 14 }}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  bundleAdded ? 'bg-[#16a34a] border-[#16a34a]' : 'border-[#D1D5DB]'
                }`}>
                  {bundleAdded && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#111111] text-[13px] font-semibold">Add Bacteriostatic Water (10ML)</p>
                  <p className="text-[#9CA3AF] text-[12px]">Required for reconstitution</p>
                </div>
                <span className="text-[#111111] text-[14px] font-bold flex-shrink-0">{format(bacWaterPrice)}</span>
              </button>
            )}

            {/* CTA buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={!selectedVariant}
                onClick={handleAddToCart}
                className={`w-full flex items-center justify-center gap-2.5 py-4 text-[15px] font-bold transition-all duration-200 disabled:opacity-40 ${
                  cartAdded
                    ? 'bg-[#16a34a] text-white'
                    : 'text-white hover:opacity-90 active:scale-[0.98]'
                }`}
                style={{ borderRadius: 14, background: cartAdded ? undefined : accent }}
              >
                {cartAdded ? <><Check className="w-5 h-5" /> Added to Cart</> : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>}
              </button>
              <button
                type="button"
                disabled={!selectedVariant}
                onClick={handleBuyNow}
                className="w-full flex items-center justify-center gap-2.5 py-4 text-[15px] font-bold bg-[#111111] hover:bg-[#1a1a1a] text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
                style={{ borderRadius: 14 }}
              >
                Buy Now — {format(totalPrice)}
              </button>
            </div>

            {/* Feature strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { icon: Microscope, label: 'Research Grade' },
                { icon: ShieldCheck, label: 'Lab Verified' },
                { icon: FlaskConical, label: 'High Purity' },
                { icon: Package, label: 'Discreet Ship' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 py-3 px-2 rounded-[12px] border border-[#F0F0F0] bg-[#FAFAFA]">
                  <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.8} />
                  <span className="text-[#374151] text-[11px] font-semibold">{label}</span>
                </div>
              ))}
            </div>

            {/* Delivery bar */}
            <div className="flex flex-wrap items-center gap-5 py-4 px-5 rounded-[14px] border border-[#E5E7EB] bg-[#FAFAFA]">
              {[
                { icon: Truck, text: 'Free Shipping' },
                { icon: Clock, text: 'Fast Delivery' },
                { icon: Lock, text: 'Secure Payment' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#6B7280]" strokeWidth={1.8} />
                  <span className="text-[#374151] text-[12px] font-medium">{text}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ─── Tabs Section ───────────────────────────────────────────────── */}
      <div className="border-t border-[#E5E7EB]">
        <div className="max-w-[1320px] mx-auto px-6">
          {/* Tab buttons */}
          <div className="flex gap-0 border-b border-[#E5E7EB] overflow-x-auto">
            {([
              { id: 'description', label: 'Description' },
              { id: 'specs', label: 'Product Details' },
              { id: 'research', label: 'Research Information' },
              { id: 'shipping', label: 'Shipping & Returns' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#111111] text-[#111111]'
                    : 'border-transparent text-[#9CA3AF] hover:text-[#374151]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="py-8 max-w-3xl">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <p className="text-[#374151] text-[14px] leading-[1.8]">{product.description}</p>
                <ul className="space-y-2 text-[#374151] text-[14px]">
                  <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#16a34a] mt-0.5 flex-shrink-0" strokeWidth={2.5} /> HPLC-verified purity of {purity}%</li>
                  <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#16a34a] mt-0.5 flex-shrink-0" strokeWidth={2.5} /> Certificate of Analysis after order you may request</li>
                  <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#16a34a] mt-0.5 flex-shrink-0" strokeWidth={2.5} /> Sterile lyophilised vial, nitrogen sealed</li>
                  <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#16a34a] mt-0.5 flex-shrink-0" strokeWidth={2.5} /> GMP-sourced raw materials</li>
                </ul>
                <div className="mt-6 p-4 rounded-[14px] bg-[#EFF6FF] border border-[#BFDBFE]">
                  <p className="text-[#1E40AF] text-[13px] font-medium leading-relaxed">
                    <strong>Research Use Only</strong> — This product is supplied strictly for in-vitro laboratory research and analytical purposes. Not intended for human consumption.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'specs' && specs && (
              <div className="overflow-hidden rounded-[14px] border border-[#E5E7EB]">
                {Object.entries(specs).map(([key, val], i) => (
                  <div key={key} className={`flex ${i > 0 ? 'border-t border-[#E5E7EB]' : ''}`}>
                    <div className="w-[180px] flex-shrink-0 px-5 py-3.5 bg-[#F9FAFB] text-[#6B7280] text-[13px] font-medium">{key}</div>
                    <div className="flex-1 px-5 py-3.5 text-[#111111] text-[13px] font-medium">{val}</div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'specs' && !specs && (
              <p className="text-[#9CA3AF] text-[14px]">Detailed specifications will be available soon.</p>
            )}
            {activeTab === 'research' && (
              <div className="space-y-4 text-[#374151] text-[14px] leading-[1.8]">
                <p>This compound is supplied exclusively for in-vitro research applications including:</p>
                <ul className="space-y-1.5 ml-4 list-disc text-[#6B7280]">
                  <li>Receptor binding studies and dose-response characterisation</li>
                  <li>Mechanism-of-action investigation in cell models</li>
                  <li>Analytical method development (HPLC, LC-MS)</li>
                  <li>Stability and formulation research</li>
                </ul>
                <p className="text-[#9CA3AF] text-[12px] mt-4">All research must comply with institutional guidelines. RetraLabs does not provide dosing, administration, or clinical guidance.</p>
              </div>
            )}
            {activeTab === 'shipping' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-[#111111] text-[14px] font-bold mb-2">Shipping</h4>
                  <ul className="space-y-1.5 text-[#6B7280] text-[13px]">
                    <li>Free standard shipping across India (3-4 business days)</li>
                    <li>Express delivery available for major cities (+Rs.800, 1-2 days)</li>
                    <li>Temperature-controlled packaging for peptide stability</li>
                    <li>Discreet packaging with no product details visible</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[#111111] text-[14px] font-bold mb-2">Returns & Replacements</h4>
                  <ul className="space-y-1.5 text-[#6B7280] text-[13px]">
                    <li>Damaged/incorrect orders eligible for replacement within 48 hours</li>
                    <li>Contact support via WhatsApp with photos of the issue</li>
                    <li>COA discrepancies covered under quality guarantee</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Related Products ────────────────────────────────────────────── */}
      <div className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[1320px] mx-auto px-6 py-12">
          <h2 className="text-[#111111] text-[22px] font-bold tracking-[-0.02em] mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {relatedProducts.map(rp => {
              const rpAccent = ACCENT_MAP[rp.name] ?? '#2563EB';
              const rpReviews = REVIEWS_MAP[rp.name] ?? { count: 10, avg: 4.7 };
              const rpPrice = Math.min(...rp.variants.map(v => v.price_inr));
              return (
                <div
                  key={rp.id}
                  className="group bg-white border border-[#E5E7EB] overflow-hidden cursor-pointer transition-all duration-300 hover:border-[#D0D0D0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                  style={{ borderRadius: 16 }}
                  onClick={() => navigate(`/product/${rp.id}`)}
                >
                  <div className="aspect-square bg-[#F8F9FA] flex items-center justify-center overflow-hidden">
                    <img
                      src={getProductImageUrl(rp.image_url, rp.name)}
                      alt={rp.name}
                      className="w-full h-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[#111111] text-[13px] font-semibold line-clamp-1 mb-1">{rp.name}</h3>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />)}
                      <span className="text-[#9CA3AF] text-[10px] ml-1">({rpReviews.count})</span>
                    </div>
                    <p className="text-[#111111] text-[14px] font-bold">{format(rpPrice)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── COD Banner ──────────────────────────────────────────────────── */}
      <div className="max-w-[1320px] mx-auto px-6 py-8">
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-7 sm:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderRadius: 18 }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-[12px] bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-[#16a34a]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[#111111] text-[16px] font-bold leading-snug">Cash on Delivery (COD) Available</h3>
              <p className="text-[#6B7280] text-[14px] mt-0.5">Pay when your order arrives at your doorstep.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-[#16a34a] text-white text-[12px] font-bold px-5 py-2.5 rounded-full shadow-sm flex-shrink-0">
            <Check className="w-3.5 h-3.5" strokeWidth={3} /> COD
          </span>
        </div>
      </div>

      {/* ─── Bottom Feature Icons ─────────────────────────────────────────── */}
      <div className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[1320px] mx-auto px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Verified Compounds', sub: 'Lab tested & authentic' },
              { icon: Microscope, title: 'Research Grade', sub: 'For research use only' },
              { icon: FlaskConical, title: 'Direct Sourcing', sub: 'No middlemen' },
              { icon: Package, title: 'Discreet Packaging', sub: '100% private & secure' },
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

      {/* ─── Mobile sticky bottom ─────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[#9CA3AF] text-[11px]">Total</p>
            <p className="text-[#111111] text-[20px] font-bold">{format(totalPrice)}</p>
          </div>
          <button
            type="button"
            disabled={!selectedVariant}
            onClick={handleAddToCart}
            className={`w-12 h-12 rounded-[12px] border-2 flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 ${
              cartAdded ? 'bg-[#F0FDF4] border-[#16a34a] text-[#16a34a]' : 'border-[#E5E7EB] text-[#374151] hover:border-[#111111]'
            }`}
          >
            {cartAdded ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
          </button>
          <button
            type="button"
            disabled={!selectedVariant}
            onClick={handleBuyNow}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[12px] bg-[#111111] text-white text-[14px] font-bold disabled:opacity-40 transition-all active:scale-[0.97]"
          >
            Buy Now
          </button>
        </div>
      </div>

    </div>

    {/* ─── Referral Popup ──────────────────────────────────────────────────── */}
    {referralOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setReferralOpen(false); }}>
        <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">Before we chat</p>
              <h3 className="text-[16px] font-bold text-[#111111]">How did you find us?</h3>
            </div>
            <button onClick={() => setReferralOpen(false)} className="text-[#9CA3AF] hover:text-[#374151] transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {REFERRAL_OPTIONS.map(src => (
              <button key={src} onClick={() => setReferralSource(src)} className={`px-3 py-2.5 rounded-[10px] text-[12px] font-semibold border-2 transition-all ${referralSource === src ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#E5E7EB] text-[#374151] hover:border-[#9CA3AF]'}`}>{src}</button>
            ))}
          </div>
          {referralSource === 'Friend' && (
            <input type="text" placeholder="Friend's name (optional)" value={friendName} onChange={e => setFriendName(e.target.value)} className="w-full border-2 border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[13px] mb-4 focus:outline-none focus:border-[#111111]" />
          )}
          <div className="mb-4 p-3 rounded-[12px] bg-[#FEF9C3] border border-[#FDE68A]">
            <p className="text-[11px] font-bold text-[#92400E] mb-1">Confirm before continuing:</p>
            <button type="button" onClick={() => setDisclaimerTyped(DISCLAIMER_PHRASE)} className="w-full text-left text-[11px] text-[#92400E] font-mono bg-[#FEF3C7] hover:bg-[#FDE68A] rounded px-2 py-1.5 mb-2 transition-colors cursor-pointer">{DISCLAIMER_PHRASE}</button>
            <input type="text" placeholder="Tap above or type here..." value={disclaimerTyped} onChange={e => setDisclaimerTyped(e.target.value)} className={`w-full border-2 rounded-[8px] px-3 py-2 text-[12px] focus:outline-none transition-colors ${disclaimerTyped === DISCLAIMER_PHRASE ? 'border-[#16a34a] bg-[#F0FDF4] text-[#16a34a]' : 'border-[#E5E7EB] focus:border-[#F59E0B]'}`} />
            {disclaimerTyped === DISCLAIMER_PHRASE && <p className="text-[11px] text-[#16a34a] font-semibold mt-1">Confirmed</p>}
          </div>
          <button onClick={submitReferral} disabled={!referralSource || disclaimerTyped !== DISCLAIMER_PHRASE} className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 text-white font-bold py-3.5 rounded-[12px] transition-colors flex items-center justify-center gap-2 text-[14px]">
            <MessageCircle className="w-4 h-4" /> Continue to WhatsApp
          </button>
        </div>
      </div>
    )}
    </>
  );
}
