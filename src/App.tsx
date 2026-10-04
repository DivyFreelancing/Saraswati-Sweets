import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AddressProvider } from './context/AddressContext';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CartDrawer } from './components/cart/CartDrawer';
import { ProductDetailModal } from './components/catalog/ProductDetailModal';
import { AuthModal } from './components/auth/AuthModal';
import { ToastContainer } from './components/common/Toast';
import { OfflineIndicator } from './components/common/OfflineIndicator';

import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { HampersPage } from './pages/HampersPage';
import { BulkEnquiryPage } from './pages/BulkEnquiryPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { ProfilePage } from './pages/ProfilePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { AdminPage } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';

import { Product } from './types/database';

function AppContent() {
  const { openAuthModal } = useAuth();
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

  // Handle client-side routing & browser back/forward
  useEffect(() => {
    if (currentPath === '/login' || currentPath === '/auth') {
      openAuthModal();
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    }
  }, [currentPath, openAuthModal]);
  useEffect(() => {
    const handlePopState = () => {
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
    const [path, query] = pathWithQuery.split('?');
    if (query) {
      const params = new URLSearchParams(query);
      const cat = params.get('category');
      if (cat) setActiveCategorySlug(cat);
    } else {
      setActiveCategorySlug('');
    }

    setCurrentPath(path);
    window.history.pushState({}, '', pathWithQuery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleCloseProductDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const renderCurrentPage = () => {
    // Dynamic order confirmation route: /order-confirmation/:orderNumber
    if (currentPath.startsWith('/order-confirmation/')) {
      const orderNumber = currentPath.replace('/order-confirmation/', '');
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
    if (currentPath.startsWith('/orders/') && currentPath !== '/orders') {
      const orderNumber = currentPath.replace('/orders/', '');
      return (
        <OrderDetailPage
          orderNumber={orderNumber}
          onBack={() => navigateTo('/orders')}
          onGoToCart={() => navigateTo('/cart')}
        />
      );
    }

    switch (currentPath) {
      case '/catalog':
        return (
          <CatalogPage
            initialCategorySlug={activeCategorySlug}
            onOpenProductDetail={handleOpenProductDetail}
          />
        );
      case '/categories':
        return (
          <CategoriesPage
            onSelectCategory={(slug) => navigateTo(`/catalog?category=${slug}`)}
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
            initialTab={currentPath === '/admin/coupons' ? 'coupons' : undefined}
          />
        );
      case '/':
      default:
        return (
          <HomePage
            onNavigate={navigateTo}
            onOpenProductDetail={handleOpenProductDetail}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF6EF] text-[#221A14] selection:bg-[#7A1129]/15 selection:text-[#7A1129] pb-16 lg:pb-0 overflow-x-clip w-full max-w-full">
      {/* Header */}
      <Header
        currentPath={currentPath}
        onNavigate={navigateTo}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Mobile Sticky Bottom Navigation */}
      <MobileBottomNav
        currentPath={currentPath}
        onNavigate={navigateTo}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      {/* Cart Drawer Slide-over */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onNavigateToCheckout={() => navigateTo('/checkout')}
        onContinueShopping={() => navigateTo('/catalog')}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={handleCloseProductDetail}
        onSelectRelatedProduct={(rel) => setSelectedProduct(rel)}
      />

      {/* Phone OTP Authentication Modal */}
      <AuthModal />

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
