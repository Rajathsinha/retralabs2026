import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  ArrowRight, Star, CheckCircle, Zap, Truck, Lock, ShoppingBag,
  FlaskConical, Shield, Package, Microscope,
  AlertTriangle, Calculator, Beaker, Syringe, Droplets, ChevronDown,
} from 'lucide-react';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { ProductShowcase } from '../components/ProductShowcase';
import { useSEO } from '../hooks/useSEO';
import { getLocalBusinessSchema, getServiceAreaSchema } from '../utils/localSeoSchemas';
import { BUSINESS_NAP } from '../constants/config';
import {
  HeroSceneWrapper,
  ScrollJourneyWrapper,
  CTAConvergenceWrapper,
  ScientificDiagramWrapper,
  useScrollProgress,
} from '../animation';
import { prefersReducedMotion } from '../hooks/useGsapAnimations';

const TrustpilotSection = lazy(() => import('../components/TrustpilotSection'));

const BEST_SELLERS = ['1', '12', '13', '3'].map(
  id => PRODUCTS.find(p => p.id === id)!
).filter(Boolean);

const TRUST_ITEMS = [
  { icon: Star,  value: '4.6 Rating',          label: 'Trustpilot Verified',   color: '#F59E0B', link: BUSINESS_NAP.social.trustpilot },
  { icon: Zap,   value: 'Order by 2 PM',       label: 'Same-Day Dispatch',     color: '#2563EB' },
  { icon: Truck, value: 'Fastest Delivery',     label: 'India-Wide 1–2 Days',   color: '#16a34a' },
  { icon: Lock,  value: 'Discreet Packaging',   label: 'Zero Product Markings', color: '#374151' },
  { icon: ShoppingBag, value: 'Also on',        label: 'IndiaMART',            color: '#FB923C', link: BUSINESS_NAP.social.indiamart },
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
  {
    lines: ["India's #1 Research", 'Peptides Company'],
    accent: '7 Years Old.',
    link: BUSINESS_NAP.social.indiamart,
  },
];

const FEATURE_BLOCKS = [
  { icon: Shield,       title: 'Verified Compounds',  caption: 'GMP-certified sourcing. Every batch fully traceable.' },
  { icon: Microscope,   title: 'Research Grade',       caption: '99%+ purity via independent HPLC analysis.' },
  { icon: FlaskConical, title: 'Direct Sourcing',      caption: 'Zero middlemen. Direct from manufacturer.' },
  { icon: Package,      title: 'Discreet Packaging',   caption: 'Plain outer packaging. No product markings.' },
];

const HOME_FAQS = [
  {
    q: 'Where to buy peptides in India?',
    a: "RetraLabs (retralabs.in) is India's trusted source to buy research-grade peptides online. We supply HPLC-verified Retatrutide, Tirzepatide, GHK-Cu, BPC-157, TB-500, Semax, and more — each with 99%+ purity and a Certificate of Analysis. Order online with fast India-wide shipping from Bengaluru, temperature-controlled packaging, and Cash on Delivery available.",
  },
  {
    q: 'Where can I buy Retatrutide in India?',
    a: "You can buy research-grade Retatrutide in India from RetraLabs. Every vial is HPLC-verified at 99.2% purity with a Certificate of Analysis, starting from a 10mg starter vial. We ship India-wide with temperature-controlled packaging.",
  },
  {
    q: 'How to buy research peptides in India?',
    a: 'Browse our catalogue of Retatrutide, Tirzepatide, GHK-Cu, BPC-157, and more, select your variant, and add it to cart or enquire via WhatsApp. Every compound is HPLC-verified with 99%+ purity and ships with a Certificate of Analysis. Cash on Delivery is available across India.',
  },
  {
    q: 'Are research peptides legal in India?',
    a: 'Research peptides such as Retatrutide, Tirzepatide, and GHK-Cu are supplied strictly for laboratory and analytical research purposes. RetraLabs sells exclusively to qualified researchers and institutions. Products are not for human consumption.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const { ref: journeyRef, progress: journeyProgress } = useScrollProgress<HTMLElement>({
    start: 'top bottom',
    end: 'bottom top',
  });

  useSEO({
    title: 'Buy Research Peptides India — Retatrutide (Reta), Tirzepatide, GHK-Cu | 99%+ Purity, COA | RetraLabs',
    description: "India's oldest research peptide supplier since 2019. Buy Retatrutide (Reta), Tirzepatide, GHK-Cu, BPC-157 and more — 99%+ HPLC-verified, COA included. 2,400+ orders shipped India-wide with COD. RetraLabs, Bengaluru.",
    keywords: 'buy peptides india, peptides india, peptide supplier india, research peptides india, oldest peptide company india, buy peptides bangalore, buy peptides bengaluru, peptide supplier bangalore, buy peptides mumbai, peptide supplier mumbai, buy peptides delhi, peptide supplier delhi, buy peptides pune, peptide supplier pune, buy retatrutide india, retatrutide india, reta india, buy reta india, where to buy reta india, buy retatrutide bangalore, buy retatrutide mumbai, buy retatrutide delhi, buy retatrutide pune, buy GHK-Cu india, GHK-Cu india, copper peptide india, buy GHK-Cu bangalore, buy GHK-Cu mumbai, buy GHK-Cu delhi, buy GHK-Cu pune, buy tirzepatide india, tirzepatide india, buy BPC-157 india, BPC-157 india, HPLC verified peptides india, COA peptides india, retralabs, retralabs india, retralabs bangalore, peptide company india since 2019',
    canonical: 'https://retralabs.in/',
    schema: [getLocalBusinessSchema(), getServiceAreaSchema()],
  });

  const [peptideAmount, setPeptideAmount] = useState('10');
  const [waterVolume,   setWaterVolume]   = useState('2');
  const [desiredDose,   setDesiredDose]   = useState('0.25');
  const [doseUnit,      setDoseUnit]      = useState<'mg' | 'mcg'>('mg');
  const [syringeType,   setSyringeType]   = useState<'u100' | 'u40'>('u100');

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const interval = setInterval(() => {
      setSlideIndex(i => (i + 1) % HERO_SLIDES.length);
    }, 5000);
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
      <section className="relative overflow-hidden bg-[#f8fafc]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(37,99,235,0.12) 0%, transparent 70%)' }} />
        </div>
        <div className="relative max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-10" style={{ paddingTop: 'clamp(40px,8vw,100px)', paddingBottom: 'clamp(40px,8vw,100px)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-20 items-center">

            {/* ── Left Column ── */}
            <div className="min-w-0 flex flex-col" style={{ gap: 'clamp(16px, 3vw, 32px)' }}>
              <div className="inline-flex items-center gap-1.5 w-fit px-3 py-[5px] rounded-full border border-[#2563EB]/20 bg-white/80 backdrop-blur-sm">
                <div className="w-[5px] h-[5px] rounded-full bg-[#2563EB] flex-shrink-0" />
                <span className="text-[#2563EB] text-[9px] sm:text-[11px] font-bold tracking-[0.1em] uppercase">
                  India's Most Trusted Peptide Source
                </span>
              </div>

              <div>
                <div
                  key={slideIndex}
                  className="rl-hero-copy"
                  style={{ animation: prefersReducedMotion() ? 'none' : 'rlHeroFade 0.8s ease-out' }}
                >
                  <h1
                    className="text-[#111111] text-[clamp(32px,6vw,64px)] tracking-[-0.03em] leading-[1.05]"
                    style={{ fontFamily: "'Geist', system-ui, sans-serif", fontWeight: 300 }}
                  >
                    {slide.lines[0]} {slide.lines[1]}
                  </h1>
                  <div style={{ marginTop: '0.5rem' }}>
                    {slide.link ? (
                      <a
                        href={slide.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] text-[clamp(32px,6vw,64px)] tracking-[-0.03em] leading-[1.05] hover:text-[#1d4ed8] transition-colors cursor-pointer"
                        style={{ fontFamily: "'Geist', system-ui, sans-serif", fontWeight: 300, textDecoration: 'none' }}
                      >
                        {slide.accent}
                      </a>
                    ) : (
                      <h2
                        className="text-[#2563EB] text-[clamp(32px,6vw,64px)] tracking-[-0.03em] leading-[1.05]"
                        style={{ fontFamily: "'Geist', system-ui, sans-serif", fontWeight: 300 }}
                      >
                        {slide.accent}
                      </h2>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3 sm:mt-5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setSlideIndex(i)}
                      className="transition-all duration-500"
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

              <div>
                <p className="text-[#374151] text-[clamp(13px,1.2vw,17px)] leading-[1.7]">
                  No grey market. No compromises. Verified compounds, direct sourcing,
                  and <span className="text-[#2563EB] font-semibold">fastest delivery in India</span> —
                  straight to your door.
                </p>
                <p className="hidden sm:block text-[#9CA3AF] text-[clamp(10px,1vw,15px)] leading-[1.6] mt-2">
                  That's the whole story. Everything else is just good products at honest prices.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/catalogue')}
                  className="group flex items-center justify-center gap-2 rounded-[10px] bg-[#111111] hover:bg-[#1a1a1a] text-white font-semibold px-6 py-3 sm:px-7 sm:py-4 text-[13px] sm:text-[15px] transition-colors duration-200 flex-1 sm:flex-none"
                >
                  Shop the Real Stuff <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <a
                  href={BUSINESS_NAP.social.trustpilot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-2 border-[1.5px] border-[#E5E7EB] hover:border-[#111111] text-[#374151] hover:text-[#111111] font-semibold px-6 py-3 sm:px-7 sm:py-4 bg-white transition-colors duration-200 flex-1 sm:flex-none"
                  style={{ fontSize: 'clamp(13px,1.1vw,15px)', borderRadius: 10 }}
                >
                  Read Our Reviews
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              </div>
            </div>

            {/* ── Right Column — 3D Molecular Environment ── */}
            <div className="relative flex items-center justify-center" style={{ height: 'clamp(200px, 46vw, 620px)' }}>
              <div
                className="relative w-full h-full"
                style={{
                  WebkitMaskImage: 'radial-gradient(ellipse 82% 78% at 50% 50%, black 38%, transparent 80%)',
                  maskImage: 'radial-gradient(ellipse 82% 78% at 50% 50%, black 38%, transparent 80%)',
                }}
              >
                <HeroSceneWrapper className="w-full h-full" />
              </div>

              <div className="hidden sm:block absolute top-6 left-4 px-5 py-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]"
                style={{
                  borderRadius: 16,
                  zIndex: 2,
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <p className="text-[#111111] text-[13px] font-extrabold leading-tight tracking-tight">99%+ Purity</p>
                <p className="text-[#374151] text-[11px] mt-0.5 font-bold">HPLC Verified</p>
              </div>
              <div className="hidden sm:block absolute bottom-6 right-4 px-5 py-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]"
                style={{
                  borderRadius: 16,
                  zIndex: 2,
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <p className="text-[#111111] text-[13px] font-extrabold leading-tight tracking-tight">2,400+ Orders</p>
                <p className="text-[#374151] text-[11px] mt-0.5 font-bold">Shipped India-wide</p>
              </div>
            </div>

          </div>

          <div className="flex sm:hidden items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-2 bg-[#F8FAFF] border border-[#DBEAFE] px-3 py-2 rounded-[10px]">
              <p className="text-[#2563EB] text-[11px] font-bold">99%+ Purity</p>
            </div>
            <div className="flex items-center gap-2 bg-[#F8FAFF] border border-[#DBEAFE] px-3 py-2 rounded-[10px]">
              <p className="text-[#2563EB] text-[11px] font-bold">2,400+ Orders</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section className="border-y border-[#E5E7EB]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-5">
            {TRUST_ITEMS.map((item, i) => {
              const inner = (
                <>
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
                </>
              );
              const cls = `flex items-center justify-center gap-3.5 py-6 px-4 ${
                i < TRUST_ITEMS.length - 1 ? 'lg:border-r border-[#E5E7EB]' : ''
              } ${i < 2 ? 'border-b lg:border-b-0 border-[#E5E7EB]' : ''}`;
              return item.link ? (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${cls} hover:bg-[#F8FAFC] transition-colors`}
                >
                  {inner}
                </a>
              ) : (
                <div key={i} className={cls}>{inner}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ BEST SELLERS + 3D PRODUCT SHOWCASE ═══════════════════ */}
      <section style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[1440px] mx-auto">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-center mb-12">
            <div>
              <p className="text-[#2563EB] text-[11px] font-bold uppercase tracking-[0.15em] mb-2.5">
                Molecular Precision
              </p>
              <h2 className="text-[#111111] text-[32px] font-bold tracking-[-0.02em]">
                Research-Grade Compounds
              </h2>
              <p className="text-[#6B7280] text-[15px] mt-3 leading-relaxed max-w-md">
                Every vial is HPLC-verified, batch-traceable, and shipped under controlled conditions.
              </p>
            </div>
            <ProductShowcase products={BEST_SELLERS} />
          </div>

          <div className="flex items-end justify-between mb-8">
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
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px]">
            <Zap className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" strokeWidth={2} />
            <p className="text-[#2563EB] text-[12px] font-semibold">
              Order by 2 PM for same-day dispatch — ships India-wide in 1–2 days
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {BEST_SELLERS.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUSTPILOT ═══════════════════ */}
      <Suspense fallback={<div className="h-64 bg-[#F5F7FA]" />}>
        <TrustpilotSection />
      </Suspense>

      {/* ═══════════════════ COD BANNER ═══════════════════ */}
      <section style={{ padding: '48px 24px' }}>
        <div className="max-w-[1440px] mx-auto px-0 lg:px-4">
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
                Shop Now <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURE ICONS ═══════════════════ */}
      <section className="border-t border-[#E5E7EB] bg-[#F5F7FA]" style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[1440px] mx-auto">
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
        </div>
      </section>

      {/* ═══════════════════ SCROLL JOURNEY — MOLECULAR PROCESS ═══════════════════ */}
      <section ref={journeyRef} className="relative overflow-hidden bg-[#07111f] text-white" style={{ minHeight: '120vh' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <ScrollJourneyWrapper progress={journeyProgress} className="w-full h-full" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-24 items-center">
            <div>
              <p className="text-cyan-300 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">Inside the lab</p>
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">Purity is a process, not a promise.</h2>
              <p className="mt-5 text-slate-300 text-sm sm:text-base leading-relaxed max-w-md">Every batch moves through a documented chain of identity, analysis, and controlled dispatch.</p>
            </div>
            <div className="space-y-3">
              {[
                ['01', 'Identity verified', 'Each compound is logged against its source and batch profile.'],
                ['02', 'Analytically reviewed', 'Independent testing keeps the signal clear and the record complete.'],
                ['03', 'Cold-chain ready', 'Careful handling protects the material from lab to doorstep.'],
              ].map(([number, title, copy], i) => (
                <div
                  key={number}
                  className="border border-white/10 bg-white/[0.06] backdrop-blur-sm rounded-2xl p-5 sm:p-6 transition-opacity duration-700"
                  style={{ opacity: 0.5 + journeyProgress * 0.5 * (i + 1) / 3 }}
                >
                  <div className="flex gap-4 items-start">
                    <span className="text-cyan-300 font-mono text-xs">{number}</span>
                    <div>
                      <h3 className="font-semibold text-white">{title}</h3>
                      <p className="mt-1 text-sm text-slate-400 leading-relaxed">{copy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ RECONSTITUTION CALCULATOR ═══════════════════ */}
      <section className="border-t border-[#E5E7EB] bg-[#F5F7FA]" style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[900px] mx-auto">
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

          <div className="relative">
            <div className="absolute -top-8 right-0 w-32 h-32 hidden sm:block pointer-events-none" aria-hidden="true">
              <ScientificDiagramWrapper className="w-full h-full" />
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-[24px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0" strokeWidth={2} />
                <p className="text-[#92400E] text-[12px] font-medium">
                  <strong>Research Use Only</strong> — For educational and research purposes. Not for medical use.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 sm:p-8 space-y-5 border-b md:border-b-0 md:border-r border-[#E5E7EB]">
                  <h3 className="text-[#111111] text-[15px] font-bold mb-1">Your Setup</h3>

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
                          className={`py-3 rounded-[10px] border text-[13px] font-semibold transition-colors duration-200 ${
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

                <div className="p-6 sm:p-8 flex flex-col justify-center">
                  <h3 className="text-[#111111] text-[15px] font-bold mb-6">Results</h3>

                  <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-[16px] p-5 mb-4">
                    <p className="text-[#9CA3AF] text-[11px] font-semibold uppercase tracking-wider mb-1">Concentration</p>
                    <p className="text-[#111111] text-[32px] font-extrabold leading-none">
                      {concentration.toFixed(2)}<span className="text-[#2563EB] text-[18px] ml-1.5 font-bold">mg/mL</span>
                    </p>
                  </div>

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
          </div>
        </div>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section className="border-t border-[#E5E7EB] bg-white" style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-[820px] mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#2563EB] text-[11px] font-bold uppercase tracking-[0.15em] mb-2.5">
              Buying Guide
            </p>
            <h2 className="text-[#111111] text-[28px] sm:text-[32px] font-bold tracking-[-0.02em]">
              Where to Buy Peptides in India
            </h2>
            <p className="text-[#6B7280] text-[15px] mt-2 max-w-[560px] mx-auto leading-relaxed">
              Everything researchers ask before ordering research-grade peptides from RetraLabs.
              Looking for a specific compound? <RouterLink to="/product/1" className="text-[#2563EB] font-semibold hover:underline">Buy Retatrutide in India</RouterLink> or <RouterLink to="/product/2" className="text-[#2563EB] font-semibold hover:underline">Tirzepatide</RouterLink>.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {HOME_FAQS.map((faq, i) => (
              <details
                key={i}
                className="group bg-white border border-[#E5E7EB] rounded-[14px] px-5 py-4 open:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <h3 className="text-[#111111] text-[15px] font-semibold">{faq.q}</h3>
                  <ChevronDown className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 transition-transform group-open:rotate-180" strokeWidth={2} />
                </summary>
                <p className="text-[#6B7280] text-[14px] leading-[1.7] mt-3">{faq.a}</p>
              </details>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => navigate('/catalogue')}
              className="group inline-flex items-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] text-white font-semibold px-6 py-3 rounded-[10px] transition-colors duration-200 text-[14px]"
            >
              Browse the Full Catalogue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative bg-[#111111] overflow-hidden" style={{ paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden="true">
          <CTAConvergenceWrapper className="w-full h-full" />
        </div>
        <div className="relative max-w-[900px] mx-auto text-center z-10">
          <h2 className="text-white text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] leading-[1.1]">
            Ready to order?
          </h2>
          <p className="text-[#9CA3AF] text-[15px] mt-3 max-w-[480px] mx-auto leading-relaxed">
            Join 2,400+ researchers who trust RetraLabs for verified, research-grade peptides. Order by 2 PM for same-day dispatch.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <button
              type="button"
              onClick={() => navigate('/catalogue')}
              className="group inline-flex items-center gap-2 bg-white text-[#111111] font-bold px-7 py-4 rounded-[10px] transition-colors duration-200 text-[15px]"
            >
              Shop the Catalogue
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={BUSINESS_NAP.social.trustpilot}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 border-[1.5px] border-[#374151] hover:border-[#4B5563] text-[#D1D5DB] hover:text-white font-semibold px-7 py-4 rounded-[10px] transition-colors duration-200 text-[15px]"
            >
              Read Reviews
              <Star className="w-4 h-4 text-[#F59E0B]" strokeWidth={2} />
            </a>
          </div>
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
