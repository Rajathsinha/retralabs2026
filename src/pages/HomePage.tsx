import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Star, CheckCircle, Zap, Truck, Lock,
  FlaskConical, Shield, Package, Microscope,
  AlertTriangle, Calculator, Beaker, Syringe, Droplets, ChevronDown,
} from 'lucide-react';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { useSEO } from '../hooks/useSEO';
import { getLocalBusinessSchema, getServiceAreaSchema } from '../utils/localSeoSchemas';

const TrustpilotSection = lazy(() => import('../components/TrustpilotSection'));

const BEST_SELLERS = ['1', '12', '13', '3'].map(
  id => PRODUCTS.find(p => p.id === id)!
).filter(Boolean);

const TRUST_ITEMS = [
  { icon: Star,  value: '4.5 Rating',          label: 'Trustpilot Verified',   color: '#F59E0B' },
  { icon: Zap,   value: 'Order by 2 PM',       label: 'Same-Day Dispatch',     color: '#2563EB' },
  { icon: Truck, value: 'Fastest Delivery',     label: 'India-Wide 1–2 Days',   color: '#16a34a' },
  { icon: Lock,  value: 'Discreet Packaging',   label: 'Zero Product Markings', color: '#374151' },
];

const HERO_SLIDES = [
  {
    lines: ['We Built RetraLabs', 'Because We Got'],
    accent: 'Scammed.',
  },
  {
    lines: ["India's Only Trusted", 'Research Peptide'],
    accent: 'Supplier.',
  },
  {
    lines: ["India's Peptide Market", 'Was Broken.'],
    accent: 'We Fixed It.',
  },
];

const FEATURE_BLOCKS = [
  { icon: Shield,       title: 'Verified Compounds',  caption: 'GMP-certified sourcing. Every batch fully traceable.' },
  { icon: Microscope,   title: 'Research Grade',       caption: '99%+ purity via independent HPLC analysis.' },
  { icon: FlaskConical, title: 'Direct Sourcing',      caption: 'Zero middlemen. Direct from manufacturer.' },
  { icon: Package,      title: 'Discreet Packaging',   caption: 'Plain outer packaging. No product markings.' },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useSEO({
    title: 'Buy Research Peptides India | Retatrutide, Tirzepatide | RetraLabs Bengaluru',
    description: 'Buy HPLC-verified research peptides in India from RetraLabs, Bengaluru. Retatrutide, Tirzepatide, GHK-Cu with 99%+ purity and COA. Fast India-wide shipping from Karnataka.',
    keywords: 'buy research peptides india, retatrutide india, tirzepatide india, peptide supplier bengaluru, research peptides karnataka, buy peptides bangalore',
    canonical: 'https://retralabs.in/',
    schema: [getLocalBusinessSchema(), getServiceAreaSchema()],
  });

  // Calculator state
  const [peptideAmount, setPeptideAmount] = useState('10');
  const [waterVolume,   setWaterVolume]   = useState('2');
  const [desiredDose,   setDesiredDose]   = useState('0.25');
  const [doseUnit,      setDoseUnit]      = useState<'mg' | 'mcg'>('mg');
  const [syringeType,   setSyringeType]   = useState<'u100' | 'u40'>('u100');

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSlideIndex(i => (i + 1) % HERO_SLIDES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const slide = HERO_SLIDES[slideIndex];

  const peptideMg      = parseFloat(peptideAmount) || 0;
  const waterMl        = parseFloat(waterVolume)   || 0;
  const doseMg         = doseUnit === 'mg' ? parseFloat(desiredDose) || 0 : (parseFloat(desiredDose) || 0) / 1000;
  const concentration  = waterMl > 0 ? peptideMg / waterMl : 0;
  const injVolume      = concentration > 0 ? doseMg / concentration : 0;
  const unitsPerMl     = syringeType === 'u100' ? 100 : 40;
  const injUnits       = injVolume * unitsPerMl;

  return (
    <div className="bg-white min-h-screen">

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10" style={{ paddingTop: 'clamp(32px,5vw,80px)', paddingBottom: 'clamp(32px,5vw,80px)' }}>
          <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:gap-20 items-center">

            {/* ── Left Column ── */}
            <div className="min-w-0 flex flex-col" style={{ gap: 'clamp(10px, 2vw, 28px)' }}>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 w-fit px-3 py-[5px] rounded-full border border-[#2563EB]/20 bg-[#EFF6FF]">
                <div className="w-[5px] h-[5px] rounded-full bg-[#2563EB] animate-pulse flex-shrink-0" />
                <span className="text-[#2563EB] text-[9px] sm:text-[11px] font-bold tracking-[0.1em] uppercase">
                  India's Most Trusted Peptide Source
                </span>
              </div>

              {/* Headline + dots */}
              <div>
                <div
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                  }}
                >
                  <h1
                    className="text-[#111111] leading-[1.08] tracking-[-0.03em]"
                    style={{ fontSize: 'clamp(18px, 3.6vw, 64px)', fontWeight: 800 }}
                  >
                    {slide.lines[0]}<br />
                    {slide.lines[1]}<br />
                    <span className="text-[#2563EB]">{slide.accent}</span>
                  </h1>
                </div>

                {/* Slide dots */}
                <div className="flex items-center gap-1.5 mt-3 sm:mt-5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => { setVisible(false); setTimeout(() => { setSlideIndex(i); setVisible(true); }, 400); }}
                      className="transition-all duration-300"
                      style={{
                        width: i === slideIndex ? 20 : 6,
                        height: 6,
                        borderRadius: 999,
                        background: i === slideIndex ? '#2563EB' : '#D1D5DB',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Body */}
              <div>
                <p className="text-[#374151] text-[clamp(11px,1.2vw,17px)] leading-[1.7]">
                  No grey market. No compromises. Verified compounds, direct sourcing,
                  and <span className="text-[#2563EB] font-semibold">fastest delivery in India</span> —
                  straight to your door.
                </p>
                <p className="hidden sm:block text-[#9CA3AF] text-[clamp(10px,1vw,15px)] leading-[1.6] mt-2">
                  That's the whole story. Everything else is just good products at honest prices.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/catalogue')}
                  className="group flex items-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] text-white font-semibold px-3 py-2 sm:px-7 sm:py-4 transition-all duration-200 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.3)] active:scale-[0.97]"
                  style={{ fontSize: 'clamp(10px,1.1vw,15px)', borderRadius: 10 }}
                >
                  Shop the Real Stuff
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/proof')}
                  className="group flex items-center gap-2 border-[1.5px] border-[#E5E7EB] hover:border-[#111111] text-[#374151] hover:text-[#111111] font-semibold px-3 py-2 sm:px-7 sm:py-4 bg-white transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                  style={{ fontSize: 'clamp(10px,1.1vw,15px)', borderRadius: 10 }}
                >
                  Read Our Reviews
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* ── Right Column — Product Image ── */}
            <div className="relative flex items-center justify-center" style={{ height: 'clamp(200px, 46vw, 620px)' }}>
              {/* Glow halo behind image */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 65% at 50% 52%, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.04) 50%, transparent 80%)',
                  borderRadius: '50%',
                  transform: 'scale(1.15)',
                }}
              />

              {/* Image — no hard container edges, fades at perimeter */}
              <div
                className="relative w-full h-full"
                style={{
                  WebkitMaskImage: 'radial-gradient(ellipse 82% 78% at 50% 50%, black 38%, transparent 80%)',
                  maskImage: 'radial-gradient(ellipse 82% 78% at 50% 50%, black 38%, transparent 80%)',
                }}
              >
                <img
                  src="/peptide.png"
                  alt="RetraLabs Premium Research Peptide Vials"
                  className="w-full h-full object-contain"
                  style={{ objectPosition: 'center center', transform: 'scale(1.08)' }}
                />
              </div>

              {/* Floating badges */}
              <div
                className="hidden sm:block absolute top-6 left-4 bg-white border border-[#E5E7EB] px-5 py-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.10)]"
                style={{ borderRadius: 16, zIndex: 2 }}
              >
                <p className="text-[#111111] text-[13px] font-bold leading-tight">99%+ Purity</p>
                <p className="text-[#9CA3AF] text-[11px] mt-0.5 font-medium">HPLC Verified</p>
              </div>
              <div
                className="hidden sm:block absolute bottom-6 right-4 bg-white border border-[#E5E7EB] px-5 py-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.10)]"
                style={{ borderRadius: 16, zIndex: 2 }}
              >
                <p className="text-[#111111] text-[13px] font-bold leading-tight">2,400+ Orders</p>
                <p className="text-[#9CA3AF] text-[11px] mt-0.5 font-medium">Shipped India-wide</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section className="border-y border-[#E5E7EB]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-center gap-3.5 py-6 px-4 ${
                  i < TRUST_ITEMS.length - 1 ? 'lg:border-r border-[#E5E7EB]' : ''
                } ${i < 2 ? 'border-b lg:border-b-0 border-[#E5E7EB]' : ''}`}
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}0F` }}
                >
                  <item.icon style={{ color: item.color, width: 18, height: 18 }} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[#111111] text-[14px] font-semibold leading-tight">{item.value}</p>
                  <p className="text-[#9CA3AF] text-[12px] mt-0.5 font-medium">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ COD BANNER ═══════════════════ */}
      <section style={{ padding: '48px 24px' }}>
        <div className="max-w-[1440px] mx-auto px-0 lg:px-4">
          <Reveal>
            <div
              className="bg-white border border-[#E5E7EB] px-8 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              style={{ borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4.5 h-4.5 text-[#16a34a]" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[#111111] text-[15px] font-semibold leading-snug">
                    Cash on Delivery (COD) Available
                  </h3>
                  <p className="text-[#6B7280] text-[13px] mt-0.5 leading-relaxed">
                    Pay only when your package arrives. Available across every city in India.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-[#16a34a] text-white text-[12px] font-bold px-4 py-2 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  COD
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/catalogue')}
                  className="group text-[#16a34a] text-[14px] font-semibold hover:text-[#15803d] transition-colors flex items-center gap-1.5"
                >
                  Shop Now <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ BEST SELLERS ═══════════════════ */}
      <section style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[1440px] mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-[#2563EB] text-[11px] font-bold uppercase tracking-[0.15em] mb-2.5">
                  Most Popular
                </p>
                <h2 className="text-[#111111] text-[32px] font-bold tracking-[-0.02em]">
                  Best Sellers
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/catalogue')}
                className="group flex items-center gap-1.5 text-[#2563EB] text-[14px] font-semibold hover:text-[#1d4ed8] transition-colors"
              >
                View all <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </Reveal>

          {/* Product grid — 4 cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {BEST_SELLERS.map((product, i) => (
              <Reveal key={product.id} delay={i * 0.08}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURE ICONS ═══════════════════ */}
      <section className="border-t border-[#E5E7EB] bg-[#F5F7FA]" style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[1440px] mx-auto">
          <Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
              {FEATURE_BLOCKS.map((block, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-4">
                  <div
                    className="w-12 h-12 flex items-center justify-center bg-white border border-[#E5E7EB]"
                    style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                  >
                    <block.icon className="w-[22px] h-[22px] text-[#374151]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[#111111] text-[14px] font-semibold mb-1.5">{block.title}</h3>
                    <p className="text-[#9CA3AF] text-[13px] leading-relaxed max-w-[200px] mx-auto">{block.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ SOCIAL PROOF ═══════════════════ */}



      {/* ═══════════════════ TRUSTPILOT ═══════════════════ */}
      <Suspense fallback={<div className="h-64 bg-[#F5F7FA]" />}>
        <TrustpilotSection />
      </Suspense>

      {/* ═══════════════════ RECONSTITUTION CALCULATOR ═══════════════════ */}
      <section className="border-t border-[#E5E7EB] bg-[#F5F7FA]" style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[900px] mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-[7px] rounded-full border border-[#2563EB]/20 bg-[#EFF6FF]">
                <Calculator className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2} />
                <span className="text-[#2563EB] text-[11px] font-bold tracking-[0.1em] uppercase">Research Tool</span>
              </div>
              <h2 className="text-[#111111] text-[28px] sm:text-[32px] font-bold tracking-[-0.02em]">
                Reconstitution Calculator
              </h2>
              <p className="text-[#6B7280] text-[15px] mt-2 max-w-[480px] mx-auto leading-relaxed">
                Enter your vial specs and desired dose to get exact injection volume and syringe units.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white border border-[#E5E7EB] rounded-[24px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              {/* Warning */}
              <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0" strokeWidth={2} />
                <p className="text-[#92400E] text-[12px] font-medium">
                  <strong>Research Use Only</strong> — For educational and research purposes. Not for medical use.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* ── Inputs ── */}
                <div className="p-6 sm:p-8 space-y-5 border-b md:border-b-0 md:border-r border-[#E5E7EB]">
                  <h3 className="text-[#111111] text-[15px] font-bold mb-1">Your Setup</h3>

                  {/* Peptide Amount */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#374151] uppercase tracking-wide mb-2">
                      <Beaker className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2} />
                      Peptide Amount in Vial
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={peptideAmount}
                        onChange={e => setPeptideAmount(e.target.value)}
                        step={0.1}
                        className="flex-1 border border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[15px] font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                      />
                      <span className="text-[13px] font-bold text-[#6B7280] bg-[#F5F7FA] border border-[#E5E7EB] rounded-[10px] px-4 py-3 flex-shrink-0">mg</span>
                    </div>
                  </div>

                  {/* BAC Water */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#374151] uppercase tracking-wide mb-2">
                      <Droplets className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2} />
                      Bacteriostatic Water
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={waterVolume}
                        onChange={e => setWaterVolume(e.target.value)}
                        step={0.1}
                        className="flex-1 border border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[15px] font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                      />
                      <span className="text-[13px] font-bold text-[#6B7280] bg-[#F5F7FA] border border-[#E5E7EB] rounded-[10px] px-4 py-3 flex-shrink-0">mL</span>
                    </div>
                  </div>

                  {/* Desired Dose */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#374151] uppercase tracking-wide mb-2">
                      <Syringe className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2} />
                      Desired Dose per Injection
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={desiredDose}
                        onChange={e => setDesiredDose(e.target.value)}
                        step={0.01}
                        className="flex-1 border border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[15px] font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                      />
                      <div className="relative flex-shrink-0">
                        <select
                          value={doseUnit}
                          onChange={e => setDoseUnit(e.target.value as 'mg' | 'mcg')}
                          className="appearance-none bg-[#F5F7FA] border border-[#E5E7EB] rounded-[10px] pl-4 pr-8 py-3 text-[13px] font-bold text-[#374151] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                        >
                          <option value="mg">mg</option>
                          <option value="mcg">mcg</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Syringe Type */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#374151] uppercase tracking-wide mb-2">
                      <Syringe className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2} />
                      Syringe Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: 'u100', label: 'U-100 (100 units/mL)' },
                        { key: 'u40',  label: 'U-40 (40 units/mL)' },
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSyringeType(key)}
                          className={`py-3 rounded-[10px] border text-[13px] font-semibold transition-all duration-200 ${
                            syringeType === key
                              ? 'bg-[#111111] border-[#111111] text-white'
                              : 'bg-white border-[#E5E7EB] text-[#374151] hover:border-[#111111]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Results ── */}
                <div className="p-6 sm:p-8 flex flex-col justify-center">
                  <h3 className="text-[#111111] text-[15px] font-bold mb-6">Results</h3>

                  {/* Concentration */}
                  <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-[16px] p-5 mb-4">
                    <p className="text-[#9CA3AF] text-[11px] font-semibold uppercase tracking-wider mb-1">Concentration</p>
                    <p className="text-[#111111] text-[32px] font-extrabold leading-none">
                      {concentration.toFixed(2)}<span className="text-[#2563EB] text-[18px] ml-1.5 font-bold">mg/mL</span>
                    </p>
                  </div>

                  {/* Injection Volume + Units */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[16px] p-5">
                      <p className="text-[#2563EB] text-[10px] font-bold uppercase tracking-wider mb-1">Inject Volume</p>
                      <p className="text-[#111111] text-[24px] font-extrabold leading-none">
                        {injVolume.toFixed(3)}<span className="text-[#6B7280] text-[13px] ml-1 font-semibold">mL</span>
                      </p>
                    </div>
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[16px] p-5">
                      <p className="text-[#16a34a] text-[10px] font-bold uppercase tracking-wider mb-1">
                        {syringeType === 'u100' ? 'U-100' : 'U-40'} Units
                      </p>
                      <p className="text-[#111111] text-[24px] font-extrabold leading-none">
                        {injUnits.toFixed(1)}<span className="text-[#6B7280] text-[13px] ml-1 font-semibold">units</span>
                      </p>
                    </div>
                  </div>

                  {/* Quick steps */}
                  <div className="border-t border-[#E5E7EB] pt-5 space-y-2">
                    {[
                      'Enter total peptide mg in your vial',
                      'Enter mL of BAC water you\'ll add',
                      'Enter your desired dose per injection',
                      'Read inject volume and syringe units above',
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[#6B7280] text-[13px] leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ DISCLAIMER ═══════════════════ */}
      <section className="border-t border-[#E5E7EB] bg-[#FFFBEB]" style={{ paddingTop: 40, paddingBottom: 40, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[720px] mx-auto">
          <div className="flex gap-4 items-start">
            <div className="w-9 h-9 rounded-[10px] bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-[16px] h-[16px] text-[#D97706]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[#92400E] font-bold text-[12px] mb-1.5 tracking-wide uppercase">Research Use Only</p>
              <p className="text-[#78350F]/80 text-[13px] leading-[1.7]">
                All products are intended solely for in vitro research and analytical applications. Not approved for human or veterinary use. By ordering, you confirm you are a qualified researcher operating in compliance with applicable regulations.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
