import { lazy, Suspense, Component, ReactNode, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CodBanner from './components/CodBanner';
import CodAnnouncementModal from './components/CodAnnouncementModal';
const WhatsAppButton = lazy(() => import('./components/WhatsAppButton'));
const CartDrawer     = lazy(() => import('./components/CartDrawer'));

const HomePage           = lazy(() => import('./pages/HomePage'));
const CataloguePage      = lazy(() => import('./pages/CataloguePage'));
const ProductDetailPage  = lazy(() => import('./pages/ProductDetailPage'));
const CheckoutPage       = lazy(() => import('./pages/CheckoutPage'));
const AboutPage          = lazy(() => import('./pages/AboutPage'));
const ContactPage        = lazy(() => import('./pages/ContactPage'));
const SupportPage        = lazy(() => import('./pages/SupportPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentFailedPage  = lazy(() => import('./pages/PaymentFailedPage'));
const PrivacyPolicyPage  = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage          = lazy(() => import('./pages/TermsPage'));
const RefundPolicyPage   = lazy(() => import('./pages/RefundPolicyPage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));
const HeroUIWrapper      = lazy(() => import('./providers/HeroUIWrapper'));

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-slate-400 mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition-colors"
            >
              Reload Page
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
  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ overflowX: 'hidden' }}>
      <Header />
      <Suspense fallback={<div className="flex-1" style={{ minHeight: '100vh' }} />}>
        <HeroUIWrapper>
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
          <WhatsAppButton />
          <CartDrawer />
          <CodBanner />
        </HeroUIWrapper>
      </Suspense>
      <CodAnnouncementModal />
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
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-failed"  element={<PaymentFailedPage />} />
            <Route path="/privacy"         element={<PrivacyPolicyPage />} />
            <Route path="/terms"           element={<TermsPage />} />
            <Route path="/refund"          element={<RefundPolicyPage />} />
          </Route>
          {/* Admin — no header/footer */}
          <Route path="/admin" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#040C1E' }} />}><AdminPage /></Suspense>} />
        </Routes>
      </CartProvider>
    </ErrorBoundary>
  );
}
