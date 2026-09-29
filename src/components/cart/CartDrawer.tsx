import React from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CartItem } from '../common/CartItem';
import { OrderSummary } from '../common/OrderSummary';
import { EmptyState } from '../common/EmptyState';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToCheckout,
  onContinueShopping,
}) => {
  const { items, updateQuantity, removeItem, subtotal, savings } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const handleProceed = () => {
    if (!isAuthenticated) {
      showToast('Please sign in with your phone to proceed to checkout. Your cart is preserved!', 'info');
      openAuthModal();
      return;
    }
    onClose();
    onNavigateToCheckout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#E8DFD2] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-5 border-b border-[#E8DFD2] flex items-center justify-between bg-[#FBF7F1]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#8A1538]" />
              <h2 className="font-display font-bold text-lg text-[#1F1B16]">
                Your Mithai Box ({items.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#6B6258] hover:text-[#1F1B16] rounded-xl hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body items list */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#E8DFD2]">
            {items.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="w-8 h-8 text-[#8A1538]" />}
                title="Your Mithai Box is Empty"
                description="Explore our authentic Kaju Katli, Desi Ghee Ladoos, and festive sweets crafted fresh in Barabanki."
                actionLabel="Explore Sweets"
                onAction={() => {
                  onClose();
                  onContinueShopping();
                }}
              />
            ) : (
              <div className="space-y-1">
                {items.map((item) => (
                  <CartItem
                    key={item.variantId}
                    item={item}
                    onUpdateQuantity={(q) => updateQuantity(item.variantId, q)}
                    onRemove={() => removeItem(item.variantId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Order Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[#E8DFD2] bg-[#FBF7F1]/80 space-y-4">
              <OrderSummary
                subtotal={subtotal}
                savings={savings}
                onProceedToCheckout={handleProceed}
                checkoutButtonLabel="Proceed to Checkout"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
