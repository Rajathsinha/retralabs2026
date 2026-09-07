import { lazy, Suspense, Component, ReactNode, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
// Helper to automatically recover from stale dynamic imports when new builds are deployed
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isChunkError =
        (err as { name?: string })?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
          errMsg
        );

      if (isChunkError) {
        const lastReload = sessionStorage.getItem('chunk_reload_ts');
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 8000) {
          sessionStorage.setItem('chunk_reload_ts', String(now));
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

const WhatsAppButton = lazyWithRetry(() => import('./components/WhatsAppButton'));
const CartDrawer     = lazyWithRetry(() => import('./components/CartDrawer'));

const HomePage           = lazyWithRetry(() => import('./pages/HomePage'));
const CataloguePage      = lazyWithRetry(() => import('./pages/CataloguePage'));
const ProductDetailPage  = lazyWithRetry(() => import('./pages/ProductDetailPage'));
const CheckoutPage       = lazyWithRetry(() => import('./pages/CheckoutPage'));
const AboutPage          = lazyWithRetry(() => import('./pages/AboutPage'));
const ContactPage        = lazyWithRetry(() => import('./pages/ContactPage'));
const SupportPage        = lazyWithRetry(() => import('./pages/SupportPage'));
const CalculatorPage     = lazyWithRetry(() => import('./pages/CalculatorPage'));
const PaymentSuccessPage = lazyWithRetry(() => import('./pages/PaymentSuccessPage'));
const PaymentFailedPage  = lazyWithRetry(() => import('./pages/PaymentFailedPage'));
const PrivacyPolicyPage  = lazyWithRetry(() => import('./pages/PrivacyPolicyPage'));
const TermsPage          = lazyWithRetry(() => import('./pages/TermsPage'));
const RefundPolicyPage   = lazyWithRetry(() => import('./pages/RefundPolicyPage'));
const AdminPage          = lazyWithRetry(() => import('./pages/AdminPage'));
const TrackOrderPage     = lazyWithRetry(() => import('./pages/TrackOrderPage'));
const CategoryPage       = lazyWithRetry(() => import('./pages/CategoryPage'));
const GuidePage          = lazyWithRetry(() => import('./pages/GuidePage'));
const GuidesIndexPage    = lazyWithRetry(() => import('./pages/GuidesIndexPage'));
const HeroUIWrapper      = lazyWithRetry(() => import('./providers/HeroUIWrapper'));

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: Error) {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
        error?.message || ''
      );

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8000) {
        sessionStorage.setItem('chunk_reload_ts', String(now));
        window.location.reload();
      }
    }
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
          this.state.error?.message || ''
        );

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
          <div className="text-center p-8 max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <h1 className="text-xl font-bold text-white mb-2">
              {isChunkError ? 'New Update Available' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              {isChunkError
                ? 'A new version of RetraLabs has been deployed. Please reload to load the latest updates.'
                : (this.state.error?.message || 'An unexpected error occurred.')}
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('chunk_reload_ts');
                window.location.reload();
              }}
              className="w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/25"
            >
              Update & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Scroll to top on route change ───────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

// ─── Page loading spinner ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </div>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
function RootLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ overflowX: 'hidden' }}>
      <Header />
      <Suspense fallback={<div className="flex-1" style={{ minHeight: '100vh' }} />}>
        <HeroUIWrapper>
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <div key={pathname} className="animate-page-in">
                <Outlet />
              </div>
            </Suspense>
          </main>
          <Footer />
          <WhatsAppButton />
          <CartDrawer />
        </HeroUIWrapper>
      </Suspense>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/"                element={<HomePage />} />
            <Route path="/catalogue"       element={<CataloguePage />} />
            <Route path="/product/:id"     element={<ProductDetailPage />} />
            <Route path="/checkout"        element={<CheckoutPage />} />
            <Route path="/about"           element={<AboutPage />} />
            <Route path="/contact"         element={<ContactPage />} />
            <Route path="/support"         element={<SupportPage />} />
            <Route path="/calculator"      element={<CalculatorPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-failed"  element={<PaymentFailedPage />} />
            <Route path="/privacy"         element={<PrivacyPolicyPage />} />
            <Route path="/terms"           element={<TermsPage />} />
            <Route path="/refund"          element={<RefundPolicyPage />} />
            <Route path="/track"            element={<TrackOrderPage />} />
            <Route path="/category/:slug"  element={<CategoryPage />} />
            <Route path="/guides"          element={<GuidesIndexPage />} />
            <Route path="/guides/:slug"     element={<GuidePage />} />
          </Route>
          {/* Admin — no header/footer */}
          <Route path="/admin" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#040C1E' }} />}><AdminPage /></Suspense>} />
        </Routes>
      </CartProvider>
    </ErrorBoundary>
  );
}
