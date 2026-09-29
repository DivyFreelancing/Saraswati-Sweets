import React from 'react';
import { Home, Utensils, Gift, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCart: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPath,
  onNavigate,
  onOpenCart,
}) => {
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Sweets', path: '/catalog', icon: Utensils },
    { label: 'Hampers', path: '/hampers', icon: Gift },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8DFD2] shadow-[0_-4px_16px_rgba(0,0,0,0.05)] safe-area-pb">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
                isActive ? 'text-[#8A1538]' : 'text-[#6B6258]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          );
        })}

        {/* Cart Item */}
        <button
          type="button"
          onClick={() => onNavigate('/cart')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] relative ${
            currentPath === '/cart' ? 'text-[#8A1538]' : 'text-[#6B6258]'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-[#8A1538]" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#8A1538] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-[#8A1538]">Cart</span>
        </button>

        {/* Profile Item */}
        <button
          type="button"
          onClick={() => onNavigate('/profile')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
            currentPath === '/profile' ? 'text-[#8A1538]' : 'text-[#6B6258]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] font-semibold">
            {isAuthenticated ? 'Account' : 'Login'}
          </span>
        </button>
      </div>
    </div>
  );
};

