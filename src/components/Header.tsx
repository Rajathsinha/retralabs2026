import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, LogOut, UserCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import SearchModal from './SearchModal';
import ReconstitutionCalculator from './ReconstitutionCalculator';

const MARQUEE_MESSAGES = [
  '\u00A0\u00A0\u00A0🚚 FREE SHIPPING ACROSS INDIA\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0',
  '\u00A0\u00A0\u00A0⚡ FASTEST DELIVERY IN INDIA\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0',
  '\u00A0\u00A0\u00A0✅ CASH ON DELIVERY AVAILABLE\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0',
  '\u00A0\u00A0\u00A0🔬 99%+ HPLC VERIFIED PURITY\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0',
];

const NAV_ITEMS = [
  { path: '/catalogue',    label: 'Shop' },
  { path: '/catalogue',    label: 'Peptides' },
  { path: '/support',      label: 'Resources' },
  { path: '/proof',        label: 'Reviews' },
  { path: '/about',        label: 'About Us' },
];

export default function Header() {
  const { cart, openCart }  = useCart();
  const { user, signOut }   = useAuth();
  const cartCount           = cart.reduce((n, i) => n + i.quantity, 0);
  const location            = useLocation();
  const navigate            = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [avatarOpen,  setAvatarOpen]  = useState(false);
  const [calcOpen,    setCalcOpen]    = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const initials = user
    ? (user.user_metadata?.name || user.email || 'U')
        .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

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
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    if (avatarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarOpen]);

  const active = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const marqueeText = MARQUEE_MESSAGES.join('');

  return (
    <>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <ReconstitutionCalculator isOpen={calcOpen} onClose={() => setCalcOpen(false)} />

      <div className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-[0_1px_20px_rgba(0,0,0,0.06)]' : ''}`}>

        {/* ── Announcement Bar — 40px, dark, scrolling marquee ── */}
        <div className="bg-[#111111] overflow-hidden" style={{ height: 40 }}>
          <div className="relative h-full flex items-center">
            <div className="animate-marquee whitespace-nowrap flex items-center h-full">
              <span className="text-white/90 text-[11px] font-semibold tracking-[0.08em] uppercase">
                {marqueeText}{marqueeText}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main Navigation Bar ── */}
        <header
          className={`transition-all duration-300 border-b ${
            scrolled
              ? 'bg-white/98 backdrop-blur-md border-[#E5E7EB]'
              : 'bg-white border-[#E5E7EB]'
          }`}
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <div className="flex items-center justify-between" style={{ height: 64 }}>

              {/* LEFT — Logo */}
              <RouterLink to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200">
                <Logo size="md" variant="dark" />
              </RouterLink>

              {/* CENTER — Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1">
                {NAV_ITEMS.map(({ path, label }, i) => (
                  <RouterLink
                    key={`${label}-${i}`}
                    to={path}
                    className={`relative px-4 py-2 text-[14px] font-medium transition-all duration-200 group ${
                      active(path) && label !== 'Peptides' && label !== 'Resources'
                        ? 'text-[#111111]'
                        : 'text-[#6B7280] hover:text-[#111111]'
                    }`}
                  >
                    {label}
                    <span className={`absolute bottom-0 left-4 right-4 h-[2px] bg-[#111111] rounded-full transition-transform duration-200 origin-left ${
                      active(path) && label !== 'Peptides' && label !== 'Resources'
                        ? 'scale-x-100'
                        : 'scale-x-0 group-hover:scale-x-100'
                    }`} />
                  </RouterLink>
                ))}
              </nav>

              {/* RIGHT — Icons */}
              <div className="flex items-center gap-0.5">

                {/* Search */}
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search products"
                  className="w-10 h-10 flex items-center justify-center rounded-full text-[#374151] hover:text-[#111111] hover:bg-[#F5F5F5] transition-all duration-200"
                >
                  <Search className="w-[20px] h-[20px]" strokeWidth={1.8} />
                </button>

                {/* Account — only shown when signed in */}
                {user ? (
                  <div className="relative" ref={avatarRef}>
                    <button
                      onClick={() => setAvatarOpen(o => !o)}
                      className="w-[34px] h-[34px] rounded-full bg-[#111111] flex items-center justify-center text-white text-[11px] font-bold hover:bg-[#2d2d2d] transition-colors duration-200"
                      aria-label="Account"
                    >
                      {initials}
                    </button>
                    {avatarOpen && (
                      <div className="absolute right-0 top-full mt-3 w-48 bg-white border border-[#E5E7EB] rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden z-50 animate-fade-in-down">
                        <div className="px-4 py-3 border-b border-[#F3F4F6]">
                          <p className="text-[13px] font-semibold text-[#111111] truncate">{user.user_metadata?.name || 'Account'}</p>
                          <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">{user.email}</p>
                        </div>
                        <button
                          onClick={() => { setAvatarOpen(false); navigate('/account'); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors text-left font-medium"
                        >
                          <UserCircle2 className="w-4 h-4" /> My Account
                        </button>
                        <button
                          onClick={async () => { setAvatarOpen(false); await signOut(); navigate('/'); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 transition-colors text-left font-medium"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Cart */}
                <button
                  onClick={openCart}
                  aria-label="Cart"
                  className="relative w-10 h-10 flex items-center justify-center rounded-full text-[#374151] hover:text-[#111111] hover:bg-[#F5F5F5] transition-all duration-200"
                >
                  <ShoppingCart className="w-[20px] h-[20px]" strokeWidth={1.8} />
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 bg-[#2563EB] text-white text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center leading-none">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                  className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#374151] hover:text-[#111111] hover:bg-[#F5F5F5] transition-all duration-200 ml-1"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile Drawer ── */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              mobileOpen ? 'max-h-[85dvh] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="border-t border-[#E5E7EB] bg-white">
              <nav className="max-w-[1440px] mx-auto px-6 py-5 flex flex-col gap-0.5">
                <button
                  onClick={() => { setMobileOpen(false); setTimeout(() => setSearchOpen(true), 150); }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] text-[15px] font-medium text-[#9CA3AF] hover:text-[#111111] hover:bg-[#F5F7FA] transition-all text-left"
                >
                  <Search className="w-[18px] h-[18px]" /> Search products...
                </button>

                {NAV_ITEMS.map(({ path, label }, i) => (
                  <RouterLink
                    key={`m-${label}-${i}`}
                    to={path}
                    className={`flex items-center px-4 py-3.5 rounded-[14px] text-[15px] font-medium transition-all ${
                      active(path) && label !== 'Peptides' && label !== 'Resources'
                        ? 'text-[#111111] bg-[#F5F7FA]'
                        : 'text-[#374151] hover:text-[#111111] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    {label}
                  </RouterLink>
                ))}

                <div className="mt-4 pt-4 border-t border-[#F3F4F6] flex flex-col gap-2.5">
                  <button
                    onClick={() => { setMobileOpen(false); openCart(); }}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#111111] hover:bg-[#1f1f1f] text-white font-semibold px-5 py-3.5 rounded-[14px] transition-all duration-200 text-[15px]"
                  >
                    <ShoppingCart className="w-[18px] h-[18px]" />
                    View Cart
                    {cartCount > 0 && (
                      <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  {user && (
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => { setMobileOpen(false); navigate('/account'); }}
                        className="flex-1 flex items-center justify-center gap-2 border border-[#E5E7EB] text-[#374151] hover:bg-[#F5F7FA] font-medium px-4 py-3 rounded-[14px] transition-all text-[14px]"
                      >
                        <UserCircle2 className="w-4 h-4" /> My Account
                      </button>
                      <button
                        onClick={async () => { setMobileOpen(false); await signOut(); navigate('/'); }}
                        className="flex items-center gap-1.5 border border-red-100 text-red-500 hover:bg-red-50 px-4 py-3 rounded-[14px] transition-all text-[14px] font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
