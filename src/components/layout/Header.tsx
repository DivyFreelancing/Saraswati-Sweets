import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Menu,
  X,
  Phone,
  MapPin,
  Gift,
  FileText,
  ChevronRight,
  ChevronDown,
  LogIn,
  LogOut,
  Bell,
  Search,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NotificationDrawer } from '../common/NotificationDrawer';
import { formatINR } from '../../utils/formatters';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, onOpenCart }) => {
  const { totalItems, subtotal } = useCart();
  const { user, isAuthenticated, openAuthModal, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect scroll to adjust glass transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  interface NavLinkItem {
    label: string;
    path: string;
    icon?: React.ComponentType<{ className?: string }>;
    isHighlight?: boolean;
  }

  const leftNavLinks: NavLinkItem[] = [
    { label: 'Home', path: '/' },
    { label: 'Shop by Category', path: '/categories' },
    { label: 'All Sweets', path: '/catalog' },
  ];

  const rightNavLinks: NavLinkItem[] = [
    { label: 'Gift Hampers', path: '/hampers', icon: Gift, isHighlight: true },
    { label: 'Bulk Orders', path: '/bulk-enquiry', icon: FileText },
  ];

  const allNavLinks: NavLinkItem[] = [
    ...leftNavLinks,
    ...rightNavLinks,
    { label: 'My Orders & Tracking', path: '/orders', icon: Package },
  ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* 1. Thin trust strip above the header (scrolls naturally with page) */}
      <div className="bg-[#2A0E14] text-[#FAF4DE] py-1.5 px-4 text-xs font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="bg-[#C79A3D] text-[#2A0E14] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">
              Barabanki
            </span>
            <span className="truncate text-[#FAF4DE]/95">
              Pure Desi Ghee Mithai Since 1989 · Barabanki · Open Daily 6:30 AM – 10:00 PM · Delivering across Barabanki & Nearby
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-[#FAF4DE]/90 text-[11px]">
            <a
              href="tel:+919161110030"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3 text-[#C79A3D]" />
              <span>+91 91611 10030</span>
            </a>
            <span className="text-[#FAF4DE]/40">|</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#C79A3D]" />
              <span>Near Ghantaghar</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Sticky Transparent Navigation Bar with Centered Logo */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#FBF6EF]/40 backdrop-blur-md border-b border-[#E8DCC8]/40 shadow-[0_4px_20px_-4px_rgba(34,26,20,0.04)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 sm:h-24 md:h-26 gap-3">
          {/* LEFT ZONE:
              - Desktop: Left Navigation Links (Home, Categories, Sweets)
              - Mobile: Hamburger Toggle + Search Icon
          */}
          <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[#221A14] hover:bg-[#F5EAD9] border border-[#E8DCC8] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search catalog"
              className="lg:hidden min-h-[40px] min-w-[40px] p-2 rounded-full border border-[#E8DCC8] bg-white/70 hover:bg-[#F5EAD9] text-[#221A14] flex items-center justify-center transition-colors shadow-2xs"
            >
              <Search className="w-4 h-4 text-[#7A1129]" />
            </button>

            {/* Desktop Left Nav Links */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
              {leftNavLinks.map((link) => {
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleLinkClick(link.path)}
                    className={`text-sm font-semibold transition-colors py-1 relative ${
                      isActive
                        ? 'text-[#7A1129]'
                        : 'text-[#221A14] hover:text-[#7A1129]'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A1129] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* CENTER ZONE:
              Official Saraswati Sweets Logo prominently in the Middle
          */}
          <div className="flex items-center justify-center shrink-0">
            <div
              onClick={() => handleLinkClick('/')}
              className="flex items-center gap-2 cursor-pointer group select-none py-1"
              title="Saraswati Sweets - Home"
            >
              <img
                src="/images/logo.png"
                alt="Saraswati Sweets Since 1989"
                className="h-16 sm:h-20 md:h-22 lg:h-24 w-auto object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-sm"
              />
            </div>
          </div>

          {/* RIGHT ZONE:
              - Desktop: Right Nav Links + Search, PWA, Account, Cart
              - Mobile: Cart button
          */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            {/* Desktop Right Nav Links */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6 mr-1">
              {rightNavLinks.map((link) => {
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleLinkClick(link.path)}
                    className={`text-sm font-semibold transition-colors py-1 relative flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'text-[#7A1129]'
                        : 'text-[#221A14] hover:text-[#7A1129]'
                    } ${link.isHighlight ? 'text-[#7A1129]' : ''}`}
                  >
                    {link.icon && <link.icon className="w-3.5 h-3.5 text-[#C79A3D]" />}
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A1129] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Desktop Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search catalog"
              className="hidden lg:flex min-h-[40px] min-w-[40px] p-2 rounded-full border border-[#E8DCC8]/80 bg-white/40 hover:bg-white/80 text-[#221A14] items-center justify-center transition-colors shadow-2xs backdrop-blur-xs"
              title="Search Sweets & Namkeen"
            >
              <Search className="w-4 h-4 text-[#7A1129]" />
            </button>

            {/* In-App PWA Install */}
            <div className="hidden xl:block">
              <PWAInstallButton variant="header" />
            </div>

            {/* Notification Bell */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className="min-h-[40px] min-w-[40px] p-2 rounded-full border border-[#E8DCC8]/80 bg-white/40 hover:bg-white/80 text-[#221A14] flex items-center justify-center transition-colors shadow-2xs backdrop-blur-xs"
                title="View Notifications"
                aria-label="View In-App Notifications"
              >
                <Bell className="w-4 h-4 text-[#7A1129]" />
              </button>
            )}

            {/* Direct "My Orders" button on desktop when logged in */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => handleLinkClick('/orders')}
                className={`hidden md:flex min-h-[40px] px-3.5 py-1.5 rounded-full border text-xs font-semibold items-center gap-1.5 transition-colors shadow-2xs backdrop-blur-xs ${
                  currentPath === '/orders'
                    ? 'border-[#7A1129] bg-[#7A1129] text-white'
                    : 'border-[#E8DCC8]/80 bg-white/50 hover:bg-white/90 text-[#221A14]'
                }`}
                title="My Orders & Live Tracking"
              >
                <Package className={`w-3.5 h-3.5 ${currentPath === '/orders' ? 'text-white' : 'text-[#7A1129]'}`} />
                <span>My Orders</span>
              </button>
            )}

            {/* Auth / Account Trigger & Dropdown */}
            {isAuthenticated ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="hidden sm:flex min-h-[40px] px-3 py-1.5 rounded-full border border-[#E8DCC8]/80 bg-white/50 hover:bg-white/90 text-xs font-semibold text-[#221A14] items-center gap-2 transition-colors shadow-2xs backdrop-blur-xs"
                  aria-expanded={accountMenuOpen}
                  aria-label="User Account Menu"
                >
                  <div className="w-6 h-6 rounded-full bg-[#7A1129] text-white flex items-center justify-center font-bold text-[10px]">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="truncate max-w-[85px]">
                    {user?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#6E6259] transition-transform duration-200 ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Account Dropdown Menu */}
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E8DCC8] shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-[#E8DCC8]/60">
                      <p className="text-xs font-bold text-[#221A14] truncate">
                        {user?.full_name || 'Valued Customer'}
                      </p>
                      <p className="text-[11px] text-[#6E6259] truncate">
                        {user?.phone || user?.email}
                      </p>
                      {user?.role && user.role !== 'CUSTOMER' && (
                        <span className="inline-block mt-1 text-[10px] font-bold bg-[#F7E9EE] text-[#7A1129] px-2 py-0.5 rounded-full">
                          {user.role}
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLinkClick('/orders');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#221A14] hover:bg-[#F5EAD9]/60 flex items-center gap-2.5 transition-colors"
                      >
                        <Package className="w-4 h-4 text-[#7A1129]" />
                        <span>My Orders & Tracking</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLinkClick('/profile');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#221A14] hover:bg-[#F5EAD9]/60 flex items-center gap-2.5 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-[#7A1129]" />
                        <span>Profile & Addresses</span>
                      </button>

                      {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleLinkClick('/admin');
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#2E7D4F] hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#2E7D4F]" />
                          <span>Admin Dashboard</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-[#E8DCC8]/60">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          signOut();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#B3261E] hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-[#B3261E]" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="hidden sm:flex min-h-[40px] px-4 py-1.5 rounded-full border border-[#7A1129]/40 bg-transparent hover:bg-[#7A1129] hover:text-white text-xs font-semibold text-[#7A1129] items-center gap-1.5 transition-colors shadow-2xs backdrop-blur-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Cart Trigger with item-count badge */}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping cart with ${totalItems} items`}
              className="relative min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-full bg-white/50 hover:bg-white/90 text-[#221A14] border border-[#E8DCC8] font-semibold text-sm flex items-center gap-2 transition-colors shadow-2xs shrink-0 backdrop-blur-xs"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#7A1129]" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-[#7A1129] text-white text-[10px] font-bold w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white tabular-nums">
                    {totalItems}
                  </span>
                )}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] text-[#6E6259] leading-tight font-normal">Cart</span>
                <span className="text-xs font-bold tabular-nums text-[#7A1129] leading-tight">
                  {totalItems > 0 ? formatINR(subtotal) : '₹0'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Expandable Search Input Row */}
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="pb-3 pt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6259]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Kaju Katli, Motichoor, Besan Ladoo, Dalmoth..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 text-sm bg-white/90 border border-[#E8DCC8] rounded-full focus:outline-none focus:border-[#7A1129] focus:ring-1 focus:ring-[#7A1129]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs sm:text-sm font-semibold rounded-full min-h-[38px]"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* Mobile Dropdown Nav Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FBF6EF]/95 backdrop-blur-md border-b border-[#E8DCC8] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {/* Mobile User Profile Bar */}
          {isAuthenticated ? (
            <div className="p-3 bg-[#F5EAD9]/70 rounded-2xl border border-[#E8DCC8]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#7A1129] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-[#221A14] truncate">
                      {user?.full_name || 'Valued Customer'}
                    </div>
                    <div className="text-[11px] text-[#6E6259] truncate">
                      {user?.phone || user?.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="p-1.5 rounded-lg text-[#6E6259] hover:text-[#B3261E] hover:bg-white/80 transition-colors shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8DCC8]/60">
                <button
                  type="button"
                  onClick={() => handleLinkClick('/orders')}
                  className="py-2 px-3 rounded-xl bg-white border border-[#E8DCC8] text-xs font-bold text-[#7A1129] flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#FBF6EF] transition-colors"
                >
                  <Package className="w-3.5 h-3.5 text-[#7A1129]" />
                  <span>My Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkClick('/profile')}
                  className="py-2 px-3 rounded-xl bg-white border border-[#E8DCC8] text-xs font-semibold text-[#221A14] flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#FBF6EF] transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#7A1129]" />
                  <span>Addresses</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#F5EAD9]/70 rounded-2xl border border-[#E8DCC8] flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#221A14]">Welcome to Saraswati Sweets</div>
                <div className="text-[11px] text-[#6E6259]">Sign in for order history & tracking</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal();
                }}
                className="px-4 py-1.5 rounded-full bg-[#7A1129] text-white text-xs font-semibold shadow-xs"
              >
                Sign In
              </button>
            </div>
          )}

          <div className="divide-y divide-[#E8DCC8]/60">
            {allNavLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleLinkClick(link.path)}
                className={`w-full min-h-[44px] flex items-center justify-between py-3 text-left font-semibold text-sm ${
                  currentPath === link.path ? 'text-[#7A1129]' : 'text-[#221A14]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {link.icon && <link.icon className="w-4 h-4 text-[#7A1129]" />}
                  <span>{link.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6E6259]" />
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E8DCC8] space-y-2 text-xs text-[#6E6259]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7A1129]" />
              <span>Saraswati Sweets, Indira Market, Begum Gunj, Barabanki, Uttar Pradesh 225001</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#7A1129]" />
              <span>+91 91611 10030 (6:30 AM – 10:00 PM)</span>
            </div>
          </div>
        </div>
      )}

      {/* In-App Notifications Drawer */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </header>
    </>
  );
};
