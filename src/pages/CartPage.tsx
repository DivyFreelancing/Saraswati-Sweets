import React from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CartItem } from '../components/common/CartItem';
import { OrderSummary } from '../components/common/OrderSummary';
import { EmptyState } from '../components/common/EmptyState';
import { ShoppingBag, ArrowLeft, ShieldCheck, LogIn, Sparkles } from 'lucide-react';

interface CartPageProps {
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onContinueShopping,
  onProceedToCheckout,
}) => {
  const { items, updateQuantity, removeItem, clearCart, subtotal, savings, deliveryCharge, total, isLoading } = useCart();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const { showToast } = useToast();

  const handleProceed = () => {
    if (!isAuthenticated) {
      showToast('Please sign in with your mobile number to proceed to checkout. Your cart is preserved!', 'info');
      openAuthModal();
      return;
    }
    onProceedToCheckout();
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-[#8A1538]" />}
          title="Your Mithai Box is Empty"
          description="Taste the heritage of Barabanki. Choose from freshly prepared Kaju Katli, Pure Cow Desi Ghee Motichoor, and crunchy Dalmoth."
          actionLabel="Explore Sweet Catalog"
          onAction={onContinueShopping}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFD2] pb-4">
        <div>
          <button
            type="button"
            onClick={onContinueShopping}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A1538] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1F1B16]">
            Your Fresh Mithai Box ({items.reduce((s, i) => s + i.quantity, 0)} items)
          </h1>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-medium text-[#B3261E] hover:underline self-start sm:self-auto"
        >
          Clear Box
        </button>
      </div>

      {/* Guest Cart Merge Banner if not logged in */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-[#FAF4DE] border border-[#C9A227]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#8A1538] shrink-0" />
            <span className="text-[#1F1B16]">
              You are ordering as a <strong>Guest</strong>. Sign in with mobile OTP to automatically save this cart to your account.
            </span>
          </div>

          <button
            type="button"
            onClick={openAuthModal}
            className="shrink-0 px-3.5 py-1.5 rounded-lg bg-[#8A1538] text-white font-semibold flex items-center gap-1.5 hover:bg-[#701029] transition-colors shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5 text-[#F6E08B]" />
            <span>Sign In & Save Cart</span>
          </button>
        </div>
      )}

      {/* Main Grid: Items List + Server-computed Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs divide-y divide-[#E8DFD2]">
          {items.map((item) => (
            <CartItem
              key={item.variantId}
              item={item}
              onUpdateQuantity={(q) => updateQuantity(item.variantId, q)}
              onRemove={() => removeItem(item.variantId)}
            />
          ))}

          <div className="pt-4 flex items-center justify-between text-xs text-[#6B6258]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2E7D4F]" />
              <span>Prices verified directly against Barabanki store database</span>
            </span>
            <span className="font-semibold text-[#8A1538]">Max 20 qty / item</span>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 space-y-4">
          <OrderSummary
            subtotal={subtotal}
            savings={savings}
            deliveryCharge={deliveryCharge}
            freeDeliveryThreshold={499}
            onProceedToCheckout={handleProceed}
            checkoutButtonLabel="Proceed to Checkout"
          />

          <div className="p-4 rounded-xl bg-[#F3EBE0] text-xs text-[#6B6258] space-y-1 border border-[#E8DFD2]">
            <div className="font-semibold text-[#1F1B16]">Barabanki Delivery Promise:</div>
            <div>• Free delivery on orders above ₹499</div>
            <div>• Prepared in 100% pure cow desi ghee</div>
            <div>• Insulated food-safe packaging with tamper seal</div>
          </div>
        </div>
      </div>
    </div>
  );
};
