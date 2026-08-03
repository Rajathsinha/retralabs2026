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

const NAV_LINKS = [
  { path: '/catalogue',  label: 'Shop'        },
  { path: '/calculator', label: 'Calculator'  },
  { path: '/support',    label: 'Resources'   },
  { path: '/about',      label: 'About'       },
  { path: BUSINESS_NAP.social.trustpilot, label: 'Reviews', external: true },
];

function GlassCircleBtn({
  onClick, label, children, badge,
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group relative w-10 h-10 flex items-center justify-center rounded-full
        text-slate-600 hover:text-[#2B7FFF]
        transition-all duration-250 ease-out hover:scale-105 active:scale-95 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(200,210,225,0.55)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 bg-[#2B7FFF] text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none animate-badge-pop"
          style={{ boxShadow: '0 2px 6px rgba(43,127,255,0.45)' }}
        >
          {badge}
        </span>
      )}
      {/* hover ring */}
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-250"
        style={{ boxShadow: '0 0 0 1.5px rgba(43,127,255,0.30), 0 4px 14px rgba(43,127,255,0.12)' }}
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
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false);
    };
    if (currencyOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [currencyOpen]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="sticky top-0 z-50">

        {/* ── Announcement bar ── */}
        <div className="bg-[#0A0A0A] overflow-hidden" style={{ height: 34 }}>
          <div className="relative h-full flex items-center">
            <div className="animate-marquee whitespace-nowrap inline-flex items-center">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center">
                  <span className="inline-flex items-center gap-2 px-8">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }} />
                    <span className="text-white/75 text-[11px] font-medium tracking-[0.06em] uppercase">{item.text}</span>
                  </span>
                  <span className="text-white/12 text-[10px] select-none">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Floating glass bar ── */}
        <div className="px-4 sm:px-5 lg:px-6 pt-3 pb-2">
          <header
            className="mx-auto max-w-[1440px] relative transition-[box-shadow,background] duration-500"
            style={{
              borderRadius: 26,
              height: 88,
              background: scrolled ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.62)',
              backdropFilter: 'blur(28px) saturate(200%)',
              WebkitBackdropFilter: 'blur(28px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.70)',
              boxShadow: scrolled
                ? '0 10px 44px -6px rgba(0,0,0,0.09), 0 2px 10px -2px rgba(43,127,255,0.06), inset 0 1px 0 rgba(255,255,255,0.95)'
                : '0 4px 28px -8px rgba(0,0,0,0.06), 0 1px 6px -2px rgba(43,127,255,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
            }}
          >
            {/* ── LEFT: actual logo ── */}
            <div className="absolute left-8 top-0 h-full flex items-center">
              <RouterLink to="/" className="flex-shrink-0 hover:opacity-75 transition-opacity duration-200">
                <Logo size="md" variant="dark" />
              </RouterLink>
            </div>

            {/* ── CENTER: nav links absolutely centered ── */}
            <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {NAV_LINKS.map(({ path, label, external }) => {
                const active = !external && isActive(path);
                const cls = `relative px-5 py-2.5 text-[14px] font-medium tracking-[-0.01em] transition-colors duration-200 group whitespace-nowrap
                  ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`;
                const underline = (
                  <span className={`absolute bottom-1 left-5 right-5 h-[2px] rounded-full bg-[#2B7FFF]
                    transition-transform duration-200 origin-left
                    ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                  />
                );
                return external ? (
                  <a key={label} href={path} target="_blank" rel="noopener noreferrer" className={cls}>
                    {label}{underline}
                  </a>
                ) : (
                  <RouterLink key={label} to={path} className={cls}>
                    {label}{underline}
                  </RouterLink>
                );
              })}
            </nav>

            {/* ── RIGHT: action buttons ── */}
            <div className="absolute right-8 top-0 h-full flex items-center gap-3.5">

              {/* Search */}
              <GlassCircleBtn onClick={() => setSearchOpen(true)} label="Search">
                <Search className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </GlassCircleBtn>

              {/* Currency */}
              <div className="relative" ref={currencyRef}>
                <button
                  onClick={() => setCurrencyOpen(o => !o)}
                  aria-label="Select currency"
                  className="group relative h-10 flex items-center gap-1.5 px-3.5 rounded-full
                    text-slate-600 hover:text-[#2B7FFF] text-[13px] font-medium
                    transition-all duration-250 hover:scale-105 active:scale-95 flex-shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(200,210,225,0.55)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                  }}
                >
                  <span className="text-[15px] leading-none">{currency.flag}</span>
                  <span className="font-semibold">{currency.code}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-[#2B7FFF] transition-colors" strokeWidth={2} />
                  <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                    style={{ boxShadow: '0 0 0 1.5px rgba(43,127,255,0.30), 0 4px 14px rgba(43,127,255,0.12)' }} />
                </button>
                {currencyOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-46 z-50 overflow-hidden animate-fade-in-down"
                    style={{
                      width: 176,
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.88)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.75)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
                    }}
                  >
                    {Object.values(CURRENCIES).map(c => (
                      <button
                        key={c.code}
                        onClick={() => { setCurrencyCode(c.code); setCurrencyOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-[13px] transition-colors ${
                          currency.code === c.code
                            ? 'text-slate-900 font-semibold bg-[#2B7FFF]/[0.07]'
                            : 'text-slate-500 hover:bg-slate-50/70 hover:text-slate-800'
                        }`}
                      >
                        <span className="text-[15px] leading-none">{c.flag}</span>
                        <span className="font-medium">{c.code}</span>
                        <span className="text-slate-400 text-[11px] ml-auto">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart */}
              <GlassCircleBtn onClick={openCart} label="Cart" badge={cartCount}>
                <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </GlassCircleBtn>

              {/* Hamburger (visible all breakpoints for full-page menu) */}
              <GlassCircleBtn onClick={() => setMobileOpen(o => !o)} label={mobileOpen ? 'Close menu' : 'Menu'}>
                {mobileOpen
                  ? <X className="w-[18px] h-[18px]" strokeWidth={1.9} />
                  : <Menu className="w-[18px] h-[18px]" strokeWidth={1.9} />}
              </GlassCircleBtn>
            </div>
          </header>
        </div>

        {/* ── Mobile / slide-down drawer ── */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${
            mobileOpen ? 'max-h-[80dvh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className="mx-4 mt-1 mb-2"
            style={{
              borderRadius: 22,
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.72)',
              boxShadow: '0 10px 36px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <nav className="px-3 py-4 flex flex-col gap-1">
              <button
                onClick={() => { setMobileOpen(false); setTimeout(() => setSearchOpen(true), 150); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] text-[15px] text-slate-400 hover:text-slate-800 hover:bg-slate-50/60 transition-all text-left"
              >
                <Search className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.9} />
                Search products...
              </button>

              {NAV_LINKS.map(({ path, label, external }) => {
                const active = !external && isActive(path);
                const cls = `flex items-center px-4 py-3.5 rounded-[14px] text-[15px] font-medium transition-all ${
                  active ? 'text-slate-900 bg-[#2B7FFF]/[0.07]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/60'
                }`;
                return external ? (
                  <a key={label} href={path} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className={cls}>{label}</a>
                ) : (
                  <RouterLink key={label} to={path} className={cls}>{label}</RouterLink>
                );
              })}

              <div className="mt-3 pt-3 border-t border-slate-100/80">
                <button
                  onClick={() => { setMobileOpen(false); openCart(); }}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3.5 rounded-[14px] text-[15px] transition-all duration-200"
                >
                  <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.9} />
                  View Cart
                  {cartCount > 0 && (
                    <span className="bg-[#2B7FFF] text-white text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
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
