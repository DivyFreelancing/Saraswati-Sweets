import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AddressProvider } from './context/AddressContext';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
// Code-split modals and slide-overs so initial render bundle contains only critical shell
const CartDrawer = React.lazy(() => import('./components/cart/CartDrawer').then(m => ({ default: m.CartDrawer })));
const ProductDetailModal = React.lazy(() => import('./components/catalog/ProductDetailModal').then(m => ({ default: m.ProductDetailModal })));
const AuthModal = React.lazy(() => import('./components/auth/AuthModal').then(m => ({ default: m.AuthModal })));
import { ToastContainer } from './components/common/Toast';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { CatalogPageSkeleton } from './components/common/LoadingSkeleton';

import { HomePage } from './pages/HomePage';

// Code-split all secondary routes so initial homepage load contains only essential components
const CatalogPage = React.lazy(() => import('./pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const HampersPage = React.lazy(() => import('./pages/HampersPage').then(m => ({ default: m.HampersPage })));
const BulkEnquiryPage = React.lazy(() => import('./pages/BulkEnquiryPage').then(m => ({ default: m.BulkEnquiryPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const CartPage = React.lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = React.lazy(() => import('./pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const OrderHistoryPage = React.lazy(() => import('./pages/OrderHistoryPage').then(m => ({ default: m.OrderHistoryPage })));
const OrderDetailPage = React.lazy(() => import('./pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const CertificationsPage = React.lazy(() => import('./pages/CertificationsPage').then(m => ({ default: m.CertificationsPage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const ShippingPolicyPage = React.lazy(() => import('./pages/ShippingPolicyPage').then(m => ({ default: m.ShippingPolicyPage })));
const RefundPolicyPage = React.lazy(() => import('./pages/RefundPolicyPage').then(m => ({ default: m.RefundPolicyPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

import { Product } from './types/database';
import { getCanonicalStaticPath, isPrivatePath } from './config/routes';

function AppContent() {
  const { openAuthModal, isAuthModalOpen } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('category') || '';
    }
    return '';
  });

  // Track modal history state with refs to prevent stale closures in popstate listener
  const isDetailModalOpenRef = React.useRef(false);
  const selectedProductRef = React.useRef<Product | null>(null);
  const modalEntryActiveRef = React.useRef(false);
  const isClosingViaButtonRef = React.useRef(false);
  const justClosedAtRef = React.useRef(0);
  const backgroundPathRef = React.useRef<string>(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/products/')
      ? '/catalog'
      : (typeof window !== 'undefined' ? window.location.pathname || '/' : '/')
  );

  useEffect(() => {
    isDetailModalOpenRef.current = isDetailModalOpen;
  }, [isDetailModalOpen]);

  useEffect(() => {
    selectedProductRef.current = selectedProduct;
  }, [selectedProduct]);

  // Handle client-side routing & browser back/forward
  useEffect(() => {
    if (currentPath === '/login' || currentPath === '/auth') {
      openAuthModal();
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    }
  }, [currentPath, openAuthModal]);

  // Dynamically load Manrope font on-demand only for /admin console routes
  useEffect(() => {
    if (currentPath.startsWith('/admin')) {
      const linkId = 'font-manrope-admin';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }
    }
  }, [currentPath]);

  // Direct product URL normalization on initial mount:
  // If user opens a direct product URL (e.g. /products/chandrakala), establish /catalog
  // as the underlying base route and push the product modal entry at the top of history.
  // This allows the mobile back gesture or browser Back button to close the modal only and
  // leave the customer on the catalog page rather than navigating away from the website.
  useEffect(() => {
    const initialPath = window.location.pathname || '/';
    if (initialPath.startsWith('/products/') && initialPath !== '/products') {
      const slug = decodeURIComponent(initialPath.replace('/products/', '')).replace(/\/$/, '');
      backgroundPathRef.current = '/catalog';
      window.history.replaceState({ path: '/catalog' }, '', '/catalog');
      window.history.pushState(
        { modal: 'product', productSlug: slug, backgroundPath: '/catalog' },
        '',
        initialPath
      );
      modalEntryActiveRef.current = true;
    }
  }, []);

  // Listen for browser popstate (back gesture, Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      // 1. If this popstate was triggered programmatically by handleCloseProductDetail calling history.back(),
      // consume the flag and synchronize route state without double closing.
      if (isClosingViaButtonRef.current) {
        isClosingViaButtonRef.current = false;
        modalEntryActiveRef.current = false;
        const path = window.location.pathname || '/';
        const searchParams = new URLSearchParams(window.location.search);
        const cat = searchParams.get('category');
        if (cat) setActiveCategorySlug(cat);
        setCurrentPath(path);
        return;
      }

      // 2. If the product detail modal is open and the user navigated back:
      if (isDetailModalOpenRef.current) {
        // Record timestamp to debounce touch ghost-clicks
        justClosedAtRef.current = Date.now();
        // Close modal without calling history.back() because the browser already popped the history entry
        setIsDetailModalOpen(false);
        isDetailModalOpenRef.current = false;
        setSelectedProduct(null);
        selectedProductRef.current = null;
        modalEntryActiveRef.current = false;

        const path = window.location.pathname || '/';
        const searchParams = new URLSearchParams(window.location.search);
        const cat = searchParams.get('category');
        if (cat) setActiveCategorySlug(cat);
        setCurrentPath(path);
        return;
      }

      // 3. Normal navigation when no modal is open:
      const path = window.location.pathname || '/';
      const searchParams = new URLSearchParams(window.location.search);
      const cat = searchParams.get('category');
      if (cat) setActiveCategorySlug(cat);
      setCurrentPath(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (pathWithQuery: string) => {
    // If modal is open, close it cleanly first
    if (isDetailModalOpenRef.current) {
      justClosedAtRef.current = Date.now();
      setIsDetailModalOpen(false);
      isDetailModalOpenRef.current = false;
      setSelectedProduct(null);
      selectedProductRef.current = null;
      modalEntryActiveRef.current = false;
    }

    const [path, query] = pathWithQuery.split('?');
    if (query) {
      const params = new URLSearchParams(query);
      const cat = params.get('category');
      if (cat) setActiveCategorySlug(cat);
    } else {
      setActiveCategorySlug('');
    }

    backgroundPathRef.current = path;
    setCurrentPath(path);
    window.history.pushState({ path }, '', pathWithQuery);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenProductDetail = (product: Product) => {
    // Debounce touch ghost-clicks and rapid clicks after closing
    if (Date.now() - justClosedAtRef.current < 250) {
      return;
    }

    const productSlug = product.slug || product.id;
    const newPath = `/products/${productSlug}`;

    // If modal is already open and switching products (e.g. from related products):
    if (isDetailModalOpenRef.current) {
      handleSelectRelatedProduct(product);
      return;
    }

    setSelectedProduct(product);
    selectedProductRef.current = product;
    setIsDetailModalOpen(true);
    isDetailModalOpenRef.current = true;

    // Check if browser is already at this product URL (e.g. direct load initial setup)
    if (window.location.pathname === newPath && modalEntryActiveRef.current) {
      return;
    }

    // Preserve underlying page for background rendering
    const bgPath = currentPath.startsWith('/products/')
      ? '/catalog'
      : (window.location.pathname + window.location.search || currentPath);
    backgroundPathRef.current = bgPath;

    window.history.pushState(
      { modal: 'product', productSlug, backgroundPath: bgPath },
      '',
      newPath
    );
    modalEntryActiveRef.current = true;
    setCurrentPath(newPath);
  };

  const handleSelectRelatedProduct = (product: Product) => {
    setSelectedProduct(product);
    selectedProductRef.current = product;
    const productSlug = product.slug || product.id;
    const newPath = `/products/${productSlug}`;

    // Use replaceState so switching products does NOT pile up modal history entries
    window.history.replaceState(
      { modal: 'product', productSlug, backgroundPath: backgroundPathRef.current },
      '',
      newPath
    );
    setCurrentPath(newPath);
  };

  const handleCloseProductDetail = () => {
    justClosedAtRef.current = Date.now();
    setIsDetailModalOpen(false);
    isDetailModalOpenRef.current = false;
    setSelectedProduct(null);
    selectedProductRef.current = null;

    if (modalEntryActiveRef.current) {
      // Revert the modal-specific history entry without navigating away from the underlying page
      isClosingViaButtonRef.current = true;
      modalEntryActiveRef.current = false;
      window.history.back();
    } else {
      // Direct URL fallback: transition route to the background path
      const targetPath = backgroundPathRef.current || '/catalog';
      if (window.location.pathname.startsWith('/products/')) {
        window.history.replaceState({ path: targetPath }, '', targetPath);
        setCurrentPath(targetPath);
      }
    }
  };

  const renderCurrentPage = () => {
    // When the product modal is open, render the background page so the underlying UI,
    // scroll position, and browsing state are preserved without unmounting.
    const displayPath = isDetailModalOpen ? backgroundPathRef.current : currentPath;

    // Dynamic order confirmation route: /order-confirmation/:orderNumber
    if (displayPath.startsWith('/order-confirmation/')) {
      const orderNumber = displayPath.replace('/order-confirmation/', '');
      return (
        <OrderConfirmationPage
          orderNumber={orderNumber}
          onTrackOrder={(num) => navigateTo(`/orders/${num}`)}
          onContinueShopping={() => navigateTo('/catalog')}
          onViewOrders={() => navigateTo('/orders')}
        />
      );
    }

    // Dynamic order tracking route: /orders/:orderNumber
    if (displayPath.startsWith('/orders/') && displayPath !== '/orders') {
      const orderNumber = displayPath.replace('/orders/', '');
      return (
        <OrderDetailPage
          orderNumber={orderNumber}
          onBack={() => navigateTo('/orders')}
          onGoToCart={() => navigateTo('/cart')}
        />
      );
    }

    // Dynamic category route: /categories/:slug
    if (displayPath.startsWith('/categories/') && displayPath !== '/categories') {
      const categorySlug = decodeURIComponent(displayPath.replace('/categories/', '')).replace(/\/$/, '');
      return (
        <CatalogPage
          initialCategorySlug={categorySlug}
          onOpenProductDetail={handleOpenProductDetail}
          onNavigate={navigateTo}
        />
      );
    }

    // Dynamic product route: /products/:slug (only when modal is NOT open, e.g. direct load initial render)
    if (displayPath.startsWith('/products/') && displayPath !== '/products') {
      const productSlug = decodeURIComponent(displayPath.replace('/products/', '')).replace(/\/$/, '');
      return (
        <CatalogPage
          initialProductSlug={productSlug}
          onOpenProductDetail={handleOpenProductDetail}
          onNavigate={navigateTo}
        />
      );
    }

    const canonicalPath = getCanonicalStaticPath(displayPath);
    switch (canonicalPath || displayPath) {
      case '/catalog':
        return (
          <CatalogPage
            initialCategorySlug={activeCategorySlug}
            onOpenProductDetail={handleOpenProductDetail}
            onNavigate={navigateTo}
          />
        );
      case '/categories':
        return (
          <CategoriesPage
            onSelectCategory={(slug) => navigateTo(`/categories/${slug}`)}
          />
        );
      case '/hampers':
        return <HampersPage />;
      case '/offers':
        window.history.replaceState({}, '', '/');
        return (
          <HomePage
            onNavigate={navigateTo}
            onOpenProductDetail={handleOpenProductDetail}
          />
        );
      case '/bulk-enquiry':
        return <BulkEnquiryPage />;
      case '/certifications':
      case '/legacy-and-certifications':
      case '/legacy':
        return <CertificationsPage onNavigate={navigateTo} />;
      case '/privacy-policy':
      case '/privacy':
        return <PrivacyPolicyPage onNavigate={navigateTo} />;
      case '/terms':
      case '/terms-and-conditions':
      case '/terms-of-service':
        return <TermsPage onNavigate={navigateTo} />;
      case '/shipping-policy':
      case '/shipping-and-delivery':
      case '/delivery-policy':
        return <ShippingPolicyPage onNavigate={navigateTo} />;
      case '/refund-policy':
      case '/cancellation-and-refund':
      case '/return-policy':
        return <RefundPolicyPage onNavigate={navigateTo} />;
      case '/contact':
        return <ContactPage />;
      case '/cart':
        return (
          <CartPage
            onContinueShopping={() => navigateTo('/catalog')}
            onProceedToCheckout={() => navigateTo('/checkout')}
          />
        );
      case '/orders':
        return (
          <OrderHistoryPage
            onSelectOrder={(num) => navigateTo(`/orders/${num}`)}
            onGoToStore={() => navigateTo('/catalog')}
            onGoToCart={() => navigateTo('/cart')}
          />
        );
      case '/profile':
        return <ProfilePage onNavigate={navigateTo} />;
      case '/checkout':
        return (
          <CheckoutPage
            onBackToMenu={() => navigateTo('/catalog')}
            onOrderSuccess={(orderNum) => navigateTo(`/order-confirmation/${orderNum}`)}
          />
        );
      case '/admin/login':
        return (
          <AdminLoginPage
            onLoginSuccess={() => navigateTo('/admin')}
            onBackToStore={() => navigateTo('/')}
          />
        );
      case '/admin':
      case '/admin/coupons':
        return (
          <AdminPage
            onBackToStore={() => navigateTo('/')}
            onGoToLogin={() => navigateTo('/admin/login')}
            initialTab={displayPath === '/admin/coupons' ? 'coupons' : undefined}
          />
        );
      case '/':
        return (
          <HomePage
            onNavigate={navigateTo}
            onOpenProductDetail={handleOpenProductDetail}
          />
        );
      default:
        return <NotFoundPage onNavigate={navigateTo} />;
    }
  };

  // Full-screen admin console layout (free of storefront header, footer and bottom nav)
  if (currentPath.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] text-[#241C17] admin-shell">
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-[#6B5F55]">Loading store console...</div>}>
          {renderCurrentPage()}
        </React.Suspense>
        <ToastContainer />
        <OfflineIndicator />
      </div>
    );
  }

  const activeDisplayPath = isDetailModalOpen ? backgroundPathRef.current : currentPath;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF6EF] text-[#221A14] selection:bg-[#7A1129]/15 selection:text-[#7A1129] pb-16 lg:pb-0 overflow-x-clip w-full max-w-full">
      {/* Header */}
      <Header
        currentPath={activeDisplayPath}
        onNavigate={navigateTo}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1 min-h-[calc(100vh-80px)]">
        <React.Suspense
          fallback={
            activeDisplayPath.startsWith('/catalog') ||
            activeDisplayPath.startsWith('/categories') ||
            activeDisplayPath.startsWith('/products') ? (
              <CatalogPageSkeleton />
            ) : (
              <div className="min-h-[calc(100vh-80px)] flex items-center justify-center text-xs text-[#6E6259]">
                Loading...
              </div>
            )
          }
        >
          {renderCurrentPage()}
        </React.Suspense>
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Mobile Sticky Bottom Navigation */}
      <MobileBottomNav
        currentPath={activeDisplayPath}
        onNavigate={navigateTo}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      {/* Cart Drawer Slide-over */}
      {isCartDrawerOpen && (
        <React.Suspense fallback={null}>
          <CartDrawer
            isOpen={isCartDrawerOpen}
            onClose={() => setIsCartDrawerOpen(false)}
            onNavigateToCheckout={() => navigateTo('/checkout')}
            onContinueShopping={() => navigateTo('/catalog')}
          />
        </React.Suspense>
      )}

      {/* Product Detail Modal */}
      {isDetailModalOpen && (
        <React.Suspense fallback={null}>
          <ProductDetailModal
            product={selectedProduct}
            isOpen={isDetailModalOpen}
            onClose={handleCloseProductDetail}
            onSelectRelatedProduct={handleSelectRelatedProduct}
          />
        </React.Suspense>
      )}

      {/* Phone OTP Authentication Modal */}
      {isAuthModalOpen && (
        <React.Suspense fallback={null}>
          <AuthModal />
        </React.Suspense>
      )}

      {/* Global Notifications */}
      <ToastContainer />

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AddressProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AddressProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
