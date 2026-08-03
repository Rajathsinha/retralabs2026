import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import Logo from './Logo';
import SearchModal from './SearchModal';
import { BUSINESS_NAP } from '../constants/config';

const MARQUEE_ITEMS = [
  { dot: '#22C55E', text: 'Free Shipping Across India' },
  { dot: '#3B82F6', text: 'Cash on Delivery Available' },
  { dot: '#F59E0B', text: 'Fastest Delivery · 1–2 Days' },
  { dot: '#22C55E', text: '99%+ HPLC Verified Purity' },
  { dot: '#3B82F6', text: 'Direct Manufacturer Sourcing' },
  { dot: '#F59E0B', text: 'Discreet Packaging Guaranteed' },
];

const NAV_ITEMS: { path: string; label: string; external?: boolean }[] = [
  { path: '/catalogue',   label: 'Shop' },
  { path: '/catalogue',   label: 'Peptides' },
  { path: '/calculator',  label: 'Calculator' },
  { path: '/support',     label: 'Resources' },
  { path: BUSINESS_NAP.social.trustpilot, label: 'Reviews', external: true },
  { path: '/about',       label: 'About Us' },
];

/* ── Shared circular glass button ── */
function GlassButton({
  onClick, label, children, className = '',
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`group relative w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        text-slate-700 hover:text-[#2B7FFF]
        ${className}`}
      style={{
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(229,231,235,0.7)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      {children}
      {/* hover glow */}
      <span
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: '0 0 0 1px rgba(43,127,255,0.25), 0 4px 16px rgba(43,127,255,0.15)' }}
      />
    </button>
  );
}

export default function Header() {
  const { cart, openCart } = useCart();
  const { currency, setCurrencyCode } = useCurrency();
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const location  = useLocation();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [cartBump,     setCartBump]     = useState(0);
  const currencyRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCountRef.current) setCartBump(b => b + 1);
    prevCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    if (currencyOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [currencyOpen]);

  const active = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="sticky top-0 z-50">

        {/* ── Announcement Bar ── */}
        <div className="bg-[#0A0A0A] border-b border-white/5 overflow-hidden" style={{ height: 36 }}>
          <div className="relative h-full flex items-center">
            <div className="animate-marquee whitespace-nowrap inline-flex items-center gap-0">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center">
                  <span className="inline-flex items-center gap-2 px-8">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }} />
                    <span className="text-white/80 text-[11px] font-medium tracking-[0.06em] uppercase">{item.text}</span>
                  </span>
                  <span className="text-white/15 text-[10px]">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Floating Glass Navbar ── */}
        <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2">
          <header
            className="mx-auto max-w-[1440px] transition-all duration-500"
            style={{
              borderRadius: 26,
              height: 88,
              background: scrolled
                ? 'rgba(255,255,255,0.72)'
                : 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.65)',
              boxShadow: scrolled
                ? '0 8px 40px -4px rgba(0,0,0,0.08), 0 2px 8px -2px rgba(43,127,255,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'
                : '0 4px 30px -6px rgba(0,0,0,0.06), 0 1px 6px -2px rgba(43,127,255,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <div className="h-full flex items-center px-6 lg:px-12">

              {/* ── LEFT: Logo + status dot ── */}
              <RouterLink to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200">
                <Logo size="md" variant="dark" />
              </RouterLink>

              {/* ── CENTER: generous whitespace (intentionally empty) ── */}
              <div className="hidden lg:block flex-1" />

              {/* ── RIGHT: action cluster ── */}
              <div className="flex items-center gap-3 lg:gap-5 ml-auto lg:ml-0">

                {/* Search — circular glass */}
                <GlassButton onClick={() => setSearchOpen(true)} label="Search products">
                  <Search className="w-[19px] h-[19px]" strokeWidth={1.9} />
                </GlassButton>

                {/* Currency selector */}
                <div className="relative" ref={currencyRef}>
                  <button
                    onClick={() => setCurrencyOpen(o => !o)}
                    aria-label="Select currency"
                    className="group relative h-11 flex items-center gap-1.5 px-3.5 rounded-full transition-all duration-300 ease-out hover:scale-105 active:scale-95
                      text-slate-700 hover:text-[#2B7FFF] text-[13px] font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(229,231,235,0.7)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                  >
                    <span className="text-base leading-none">{currency.flag}</span>
                    <span>{currency.code}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2B7FFF] transition-colors" strokeWidth={2} />
                    <span
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ boxShadow: '0 0 0 1px rgba(43,127,255,0.25), 0 4px 16px rgba(43,127,255,0.15)' }}
                    />
                  </button>
                  {currencyOpen && (
                    <div
                      className="absolute right-0 top-full mt-2.5 w-48 overflow-hidden z-50 animate-fade-in-down"
                      style={{
                        borderRadius: 18,
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.7)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
                      }}
                    >
                      {Object.values(CURRENCIES).map(c => (
                        <button
                          key={c.code}
                          onClick={() => { setCurrencyCode(c.code); setCurrencyOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-[13px] transition-colors ${
                            currency.code === c.code
                              ? 'bg-[#2B7FFF]/8 text-slate-900 font-semibold'
                              : 'text-slate-600 hover:bg-[#2B7FFF]/5 hover:text-slate-900'
                          }`}
                        >
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="font-medium">{c.code}</span>
                          <span className="text-slate-400 text-[11px] ml-auto">{c.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart — circular glass with floating badge */}
                <button
                  onClick={() => { setCartBump(b => b + 1); openCart(); }}
                  aria-label="Cart"
                  className="group relative w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-105 active:scale-95
                    text-slate-700 hover:text-[#2B7FFF]"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(229,231,235,0.7)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                >
                  <span key={cartBump} className={cartBump > 0 ? 'animate-cart-bounce inline-flex' : 'inline-flex'}>
                    <ShoppingCart className="w-[19px] h-[19px]" strokeWidth={1.9} />
                  </span>
                  {cartCount > 0 && (
                    <span
                      key={`badge-${cartCount}`}
                      className="absolute -top-1 -right-1 bg-[#2B7FFF] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none animate-badge-pop"
                      style={{ boxShadow: '0 2px 8px rgba(43,127,255,0.4)' }}
                    >
                      {cartCount}
                    </span>
                  )}
                  <span
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ boxShadow: '0 0 0 1px rgba(43,127,255,0.25), 0 4px 16px rgba(43,127,255,0.15)' }}
                  />
                </button>

                {/* Hamburger — circular glass (mobile + desktop) */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                  className="group relative w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-105 active:scale-95
                    text-slate-700 hover:text-[#2B7FFF]"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(229,231,235,0.7)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                  }}
                >
                  {mobileOpen ? <X className="w-[19px] h-[19px]" strokeWidth={1.9} /> : <Menu className="w-[19px] h-[19px]" strokeWidth={1.9} />}
                  <span
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ boxShadow: '0 0 0 1px rgba(43,127,255,0.25), 0 4px 16px rgba(43,127,255,0.15)' }}
                  />
                </button>
              </div>
            </div>
          </header>
        </div>

        {/* ── Desktop Center Nav (floats below the bar when open) ── */}
        {/* The nav links sit in a separate floating glass pill below the main bar on desktop */}
        <nav className="hidden lg:flex justify-center -mt-1">
          <div
            className="flex items-center gap-1 px-3 py-1.5"
            style={{
              borderRadius: 18,
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 2px 12px -4px rgba(0,0,0,0.04)',
            }}
          >
            {NAV_ITEMS.map(({ path, label, external }, i) => {
              const isActive = !external && active(path) && label !== 'Peptides' && label !== 'Resources';
              const className = `relative px-5 py-2 text-[13.5px] font-medium tracking-tight transition-all duration-200 group ${
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`;
              const content = (
                <>
                  {label}
                  <span className={`absolute bottom-1 left-5 right-5 h-[2px] bg-[#2B7FFF] rounded-full transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </>
              );
              return external ? (
                <a
                  key={`${label}-${i}`}
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <RouterLink key={`${label}-${i}`} to={path} className={className}>
                  {content}
                </RouterLink>
              );
            })}
          </div>
        </nav>

        {/* ── Mobile Drawer ── */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            mobileOpen ? 'max-h-[85dvh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className="mx-4 mt-2"
            style={{
              borderRadius: 22,
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <nav className="px-4 py-4 flex flex-col gap-1">
              <button
                onClick={() => { setMobileOpen(false); setTimeout(() => setSearchOpen(true), 150); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] text-[15px] font-medium text-slate-400 hover:text-slate-900 hover:bg-slate-50/60 transition-all text-left"
              >
                <Search className="w-[18px] h-[18px]" /> Search products...
              </button>

              {NAV_ITEMS.map(({ path, label, external }, i) => {
                const className = `flex items-center px-4 py-3.5 rounded-[14px] text-[15px] font-medium transition-all ${
                  !external && active(path) && label !== 'Peptides' && label !== 'Resources'
                    ? 'text-slate-900 bg-[#2B7FFF]/8'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/60'
                }`;
                return external ? (
                  <a
                    key={`m-${label}-${i}`}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className={className}
                  >
                    {label}
                  </a>
                ) : (
                  <RouterLink key={`m-${label}-${i}`} to={path} className={className}>
                    {label}
                  </RouterLink>
                );
              })}

              <div className="mt-3 pt-3 border-t border-slate-100/80">
                <button
                  onClick={() => { setMobileOpen(false); openCart(); }}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3.5 rounded-[14px] transition-all duration-200 text-[15px]"
                >
                  <ShoppingCart className="w-[18px] h-[18px]" />
                  View Cart
                  {cartCount > 0 && (
                    <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
