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

        {/* Announcement bar */}
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

        {/* Main bar */}
        <header
          className="bg-white/85 backdrop-blur-md border-b transition-shadow duration-300"
          style={{
            borderColor: scrolled ? '#EAECF0' : 'transparent',
            boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
          }}
        >
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">

              {/* Left — logo */}
              <RouterLink to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
                <Logo size="md" variant="dark" />
              </RouterLink>

              {/* Center — nav links */}
              <nav className="hidden lg:flex items-center gap-1">
                {NAV_LINKS.map(({ path, label, external }) => {
                  const active = !external && isActive(path);
                  const cls = `px-4 py-2 text-[14px] font-medium transition-colors duration-200
                    ${active ? 'text-[#111111]' : 'text-[#667085] hover:text-[#111111]'}`;
                  return external ? (
                    <a key={label} href={path} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
                  ) : (
                    <RouterLink key={label} to={path} className={cls}>{label}</RouterLink>
                  );
                })}
              </nav>

              {/* Right — actions */}
              <div className="flex items-center gap-2.5">

                {/* Search */}
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-[#667085] hover:text-[#111111] hover:bg-[#F2F4F7] transition-all duration-200"
                >
                  <Search className="w-[18px] h-[18px]" strokeWidth={1.9} />
                </button>

                {/* Currency */}
                <div className="relative" ref={currencyRef}>
                  <button
                    onClick={() => setCurrencyOpen(o => !o)}
                    aria-label="Select currency"
                    className="h-10 flex items-center gap-1.5 px-3 rounded-lg text-[#667085] hover:text-[#111111] hover:bg-[#F2F4F7] text-[13px] font-medium transition-all duration-200"
                  >
                    <span className="text-[15px] leading-none">{currency.flag}</span>
                    <span className="font-semibold">{currency.code}</span>
                    <ChevronDown className="w-3 h-3 text-[#98A2B3]" strokeWidth={2} />
                  </button>
                  {currencyOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-[#EAECF0] shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden z-50">
                      {Object.values(CURRENCIES).map(c => (
                        <button
                          key={c.code}
                          onClick={() => { setCurrencyCode(c.code); setCurrencyOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${
                            currency.code === c.code
                              ? 'text-[#111111] font-semibold bg-[#F2F4F7]'
                              : 'text-[#667085] hover:bg-[#F9FAFB] hover:text-[#111111]'
                          }`}
                        >
                          <span className="text-[15px] leading-none">{c.flag}</span>
                          <span className="font-medium">{c.code}</span>
                          <span className="text-[#98A2B3] text-[11px] ml-auto">{c.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart */}
                <button
                  onClick={openCart}
                  aria-label="Cart"
                  className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[#667085] hover:text-[#111111] hover:bg-[#F2F4F7] transition-all duration-200"
                >
                  <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.9} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#2563EB] text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* Hamburger */}
                <button
                  onClick={() => setMobileOpen(o => !o)}
                  aria-label={mobileOpen ? 'Close menu' : 'Menu'}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-[#667085] hover:text-[#111111] hover:bg-[#F2F4F7] transition-all duration-200 lg:hidden"
                >
                  {mobileOpen ? <X className="w-[18px] h-[18px]" strokeWidth={1.9} /> : <Menu className="w-[18px] h-[18px]" strokeWidth={1.9} />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            mobileOpen ? 'max-h-[80dvh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="bg-white border-b border-[#EAECF0] px-4 py-3 flex flex-col gap-1">
            <button
              onClick={() => { setMobileOpen(false); setTimeout(() => setSearchOpen(true), 150); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[15px] text-[#98A2B3] hover:text-[#111111] hover:bg-[#F9FAFB] transition-all text-left"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.9} />
              Search products...
            </button>

            {NAV_LINKS.map(({ path, label, external }) => {
              const active = !external && isActive(path);
              const cls = `px-4 py-3 rounded-lg text-[15px] font-medium transition-all ${
                active ? 'text-[#111111] bg-[#F2F4F7]' : 'text-[#667085] hover:text-[#111111] hover:bg-[#F9FAFB]'
              }`;
              return external ? (
                <a key={label} href={path} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className={cls}>{label}</a>
              ) : (
                <RouterLink key={label} to={path} className={cls}>{label}</RouterLink>
              );
            })}

            <button
              onClick={() => { setMobileOpen(false); openCart(); }}
              className="flex items-center justify-center gap-2.5 bg-[#111111] text-white font-semibold px-5 py-3 rounded-lg text-[15px] mt-2 transition-all"
            >
              <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={1.9} />
              View Cart
              {cartCount > 0 && (
                <span className="bg-[#2563EB] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
