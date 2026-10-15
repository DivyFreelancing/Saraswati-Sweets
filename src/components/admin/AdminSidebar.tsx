import React from 'react';
import {
  BarChart3,
  LineChart,
  ShoppingCart,
  Package,
  FolderTree,
  Gift,
  Tag,
  Star,
  Building2,
  Bell,
  Users,
  Bike,
  Settings,
  ShieldCheck,
  LogOut,
  LucideIcon,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'reports'
  | 'orders'
  | 'products'
  | 'categories'
  | 'customers'
  | 'delivery'
  | 'hampers'
  | 'marketing'
  | 'reviews'
  | 'enquiries'
  | 'notifications'
  | 'settings'
  | 'coupons'
  | 'audit';

export interface AdminNavTabItem {
  key: AdminTab;
  label: string;
  icon: LucideIcon;
  count?: number | string;
  adminOnly?: boolean;
}

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isAdmin: boolean;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  onSignOut: () => void;
  counts: {
    orders: number;
    products: number;
    categories: number;
    hampers: number;
    marketing: number;
    reviews: number | string;
    enquiries: number | string;
    notifications: number | string;
    customers: number;
    delivery: number;
    coupons: number;
    audit: number;
  };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isAdmin,
  userRole = 'staff',
  userName = 'Admin User',
  userEmail = '',
  onSignOut,
  counts,
}) => {
  const navTabs: AdminNavTabItem[] = [
    { key: 'overview', label: 'Dashboard', icon: BarChart3 },
    { key: 'reports', label: 'Reports & Analytics', icon: LineChart },
    { key: 'orders', label: 'Orders', count: counts.orders, icon: ShoppingCart },
    { key: 'products', label: 'Sweets & Stock', count: counts.products, icon: Package },
    { key: 'categories', label: 'Categories', count: counts.categories, icon: FolderTree },
    { key: 'hampers', label: 'Gift Hampers', count: counts.hampers, icon: Gift },
    { key: 'marketing', label: 'Offers & Banners', count: counts.marketing, icon: Tag },
    { key: 'reviews', label: 'Reviews', count: counts.reviews, icon: Star },
    { key: 'enquiries', label: 'Bulk Enquiries', count: counts.enquiries, icon: Building2 },
    { key: 'notifications', label: 'Notifications', count: counts.notifications, icon: Bell },
    { key: 'customers', label: 'Customers', count: counts.customers, icon: Users, adminOnly: true },
    { key: 'delivery', label: 'Delivery & Fleet', count: counts.delivery, icon: Bike },
    { key: 'coupons', label: 'Coupons', count: counts.coupons, icon: Tag, adminOnly: true },
    { key: 'settings', label: 'Store Settings', icon: Settings },
    { key: 'audit', label: 'Audit Trail', count: counts.audit, icon: ShieldCheck, adminOnly: true },
  ];

  // Exact role-gating condition preserved from original code
  const visibleTabs = navTabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <>
      {/* ============================================================ */}
      {/* 1. DESKTOP FIXED SIDEBAR (>= 900px / lg:flex)               */}
      {/* ============================================================ */}
      <aside
        aria-label="Admin Navigation Sidebar"
        className="admin-desktop-sidebar fixed inset-y-0 left-0 w-[232px] bg-[#4A0A1B] text-white flex-col justify-between z-30 select-none shadow-[2px_0_12px_rgba(36,28,23,0.15)]"
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="px-5 pt-6 pb-5 border-b border-white/10">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#E8C16A]/80 mb-0.5">
              STORE CONSOLE
            </span>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#E8C16A] leading-tight">
              Saraswati Sweets
            </h1>
            <p className="text-[11px] text-white/60 mt-1 font-medium">
              Since 1989 • Barabanki
            </p>
          </div>

          {/* Navigation Links (Scrollable if many tabs) */}
          <nav
            aria-label="Admin Console Sections"
            className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const hasCount = tab.count !== undefined && tab.count !== null && tab.count !== '';

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectTab(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-150 cursor-pointer text-left group ${
                    isActive
                      ? 'bg-[#F3E9DC] text-[#4A0A1B] font-bold shadow-xs'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#7A1129]' : 'text-white/70 group-hover:text-white'
                      }`}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <span className="truncate">{tab.label}</span>
                  </span>

                  {hasCount && (
                    <span
                      className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums transition-colors ${
                        isActive
                          ? 'bg-[#7A1129] text-[#FAF4DE]'
                          : 'bg-white/15 text-white/90 group-hover:bg-white/25'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Role, Identity & Sign Out Footer */}
        <div className="p-4 border-t border-white/10 bg-[#3D0816]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#E8C16A] bg-[#E8C16A]/15 px-2 py-0.5 rounded">
                Role: {userRole}
              </span>
              <p
                className="text-xs font-semibold text-white/90 truncate mt-1.5"
                title={userEmail || userName}
              >
                {userName}
              </p>
              {userEmail && (
                <p className="text-[11px] text-white/60 truncate" title={userEmail}>
                  {userEmail}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out of store console"
            className="w-full min-h-[44px] px-3 py-2 rounded-[10px] bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-white/15 active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5 text-[#E8C16A]" strokeWidth={1.8} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MOBILE / TABLET TOP STRIP (< 900px)                       */}
      {/* ============================================================ */}
      <header
        aria-label="Admin Mobile Navigation"
        className="admin-mobile-nav sticky top-0 z-30 bg-[#4A0A1B] text-white border-b border-white/10 shadow-sm select-none"
      >
        {/* Mobile Header Row */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/10">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#E8C16A]/80">
              STORE CONSOLE
            </span>
            <span className="text-base font-extrabold text-[#E8C16A]">
              Saraswati Sweets
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-[#E8C16A] bg-[#E8C16A]/15 px-2 py-0.5 rounded">
              {userRole}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E8C16A]" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Horizontally Scrollable Nav Strip */}
        <nav
          aria-label="Mobile Navigation Tabs"
          className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar scroll-smooth"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const hasCount = tab.count !== undefined && tab.count !== null && tab.count !== '';

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#F3E9DC] text-[#4A0A1B] font-bold shadow-xs'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#7A1129]' : 'text-white/70'}`}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
                {hasCount && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive ? 'bg-[#7A1129] text-[#FAF4DE]' : 'bg-white/20 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>
    </>
  );
};
