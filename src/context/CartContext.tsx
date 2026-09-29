import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface CartItemType {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  weightGrams: number;
  price: number;
  mrp: number;
  imageUrl: string;
  quantity: number;
  itemTotal: number;
  stockStatus?: string;
  item_type?: 'PRODUCT' | 'HAMPER';
  items_included?: Array<{ product_name: string; variant_label: string; quantity: number }>;
}

export interface AddItemInput {
  variantId: string;
  productId?: string;
  productName?: string;
  variantLabel?: string;
  weightGrams?: number;
  price?: number;
  mrp?: number;
  imageUrl?: string;
  item_type?: 'PRODUCT' | 'HAMPER';
}

interface CartContextType {
  items: CartItemType[];
  addItem: (item: AddItemInput, quantity?: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
  savings: number;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  freeDeliveryShortfall: number;
  total: number;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const GUEST_CART_KEY = 'saraswati_guest_cart_v2';
const FREE_DELIVERY_THRESHOLD = 499;

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, getAuthHeaders, token } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<CartItemType[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(40);
  const [total, setTotal] = useState<number>(0);
  const [freeDeliveryShortfall, setFreeDeliveryShortfall] = useState<number>(FREE_DELIVERY_THRESHOLD);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const prevAuthRef = useRef<boolean>(isAuthenticated);

  // Helper to fetch server calculation for guest cart
  const fetchServerGuestCalculation = useCallback(async (guestRaw: Array<{ variantId: string; quantity: number }>) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cart/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: guestRaw }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSubtotal(data.subtotal || 0);
        setSavings(data.savings || 0);
        setDeliveryCharge(data.deliveryCharge || 0);
        setTotal(data.total || 0);
        setFreeDeliveryShortfall(data.freeDeliveryShortfall || 0);
        setTotalItems(data.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to calculate cart on server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper to fetch logged-in user cart from server
  const fetchServerUserCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cart', {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSubtotal(data.subtotal || 0);
        setSavings(data.savings || 0);
        setDeliveryCharge(data.deliveryCharge || 0);
        setTotal(data.total || 0);
        setFreeDeliveryShortfall(data.freeDeliveryShortfall || 0);
        setTotalItems(data.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to fetch user cart from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  // Load cart on mount or auth change
  useEffect(() => {
    const wasGuest = !prevAuthRef.current;
    const isNowLoggedIn = isAuthenticated;
    prevAuthRef.current = isAuthenticated;

    if (isNowLoggedIn) {
      // Check if we need to merge guest cart
      const guestStored = localStorage.getItem(GUEST_CART_KEY);
      let guestItems: Array<{ variantId: string; quantity: number }> = [];

      if (guestStored) {
        try {
          guestItems = JSON.parse(guestStored);
        } catch {}
      }

      if (wasGuest && guestItems.length > 0) {
        // Merge guest cart on login (server sums quantities, caps at 20/item)
        fetch('/api/cart/merge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ guestItems }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.cart) {
              setItems(data.cart.items || []);
              setSubtotal(data.cart.subtotal || 0);
              setSavings(data.cart.savings || 0);
              setDeliveryCharge(data.cart.deliveryCharge || 0);
              setTotal(data.cart.total || 0);
              setFreeDeliveryShortfall(data.cart.freeDeliveryShortfall || 0);
              setTotalItems(data.cart.totalItems || 0);
              localStorage.removeItem(GUEST_CART_KEY);
              showToast(data.message || 'Cart synchronized with your account', 'success');
            }
          })
          .catch((err) => {
            console.error('Error merging guest cart on login:', err);
            fetchServerUserCart();
          });
      } else {
        fetchServerUserCart();
      }
    } else {
      // Guest mode
      const guestStored = localStorage.getItem(GUEST_CART_KEY);
      if (guestStored) {
        try {
          const parsed = JSON.parse(guestStored);
          fetchServerGuestCalculation(parsed);
        } catch {
          fetchServerGuestCalculation([]);
        }
      } else {
        fetchServerGuestCalculation([]);
      }
    }
  }, [isAuthenticated, token, fetchServerGuestCalculation, fetchServerUserCart, getAuthHeaders, showToast]);

  // Add Item to cart
  const addItem = async (
    item: AddItemInput,
    quantity = 1
  ): Promise<void> => {
    if (isAuthenticated) {
      // Server-side cart mutation
      try {
        const res = await fetch('/api/cart/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ variantId: item.variantId, quantity }),
        });

        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setSubtotal(data.subtotal || 0);
          setSavings(data.savings || 0);
          setDeliveryCharge(data.deliveryCharge || 0);
          setTotal(data.total || 0);
          setFreeDeliveryShortfall(data.freeDeliveryShortfall || 0);
          setTotalItems(data.totalItems || 0);
          showToast(`Added ${item.productName || 'sweet'} (${item.variantLabel || ''}) to your cart`, 'success');
        }
      } catch (err) {
        console.error('Failed to add item to server cart:', err);
        showToast('Could not update cart. Please try again.', 'error');
      }
    } else {
      // Guest cart mutation
      let currentGuest: Array<{ variantId: string; quantity: number }> = [];
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        try {
          currentGuest = JSON.parse(stored);
        } catch {}
      }

      const existingIndex = currentGuest.findIndex((g) => g.variantId === item.variantId);
      if (existingIndex >= 0) {
        currentGuest[existingIndex].quantity = Math.min(20, currentGuest[existingIndex].quantity + quantity);
      } else {
        currentGuest.push({ variantId: item.variantId, quantity: Math.min(20, quantity) });
      }

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(currentGuest));
      await fetchServerGuestCalculation(currentGuest);
      showToast(`Added ${item.productName || 'sweet'} (${item.variantLabel || ''}) to guest cart`, 'success');
    }
  };

  // Update quantity (caps at 20, removes if <= 0)
  const updateQuantity = async (variantId: string, quantity: number): Promise<void> => {
    const cappedQty = Math.max(0, Math.min(20, quantity));

    if (isAuthenticated) {
      try {
        const res = await fetch(`/api/cart/items/${variantId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ quantity: cappedQty }),
        });

        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setSubtotal(data.subtotal || 0);
          setSavings(data.savings || 0);
          setDeliveryCharge(data.deliveryCharge || 0);
          setTotal(data.total || 0);
          setFreeDeliveryShortfall(data.freeDeliveryShortfall || 0);
          setTotalItems(data.totalItems || 0);
        }
      } catch (err) {
        console.error('Failed to update quantity on server:', err);
      }
    } else {
      let currentGuest: Array<{ variantId: string; quantity: number }> = [];
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        try {
          currentGuest = JSON.parse(stored);
        } catch {}
      }

      if (cappedQty <= 0) {
        currentGuest = currentGuest.filter((g) => g.variantId !== variantId);
      } else {
        const target = currentGuest.find((g) => g.variantId === variantId);
        if (target) {
          target.quantity = cappedQty;
        } else {
          currentGuest.push({ variantId, quantity: cappedQty });
        }
      }

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(currentGuest));
      await fetchServerGuestCalculation(currentGuest);
    }
  };

  // Remove item
  const removeItem = async (variantId: string): Promise<void> => {
    if (isAuthenticated) {
      try {
        const res = await fetch(`/api/cart/items/${variantId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setSubtotal(data.subtotal || 0);
          setSavings(data.savings || 0);
          setDeliveryCharge(data.deliveryCharge || 0);
          setTotal(data.total || 0);
          setFreeDeliveryShortfall(data.freeDeliveryShortfall || 0);
          setTotalItems(data.totalItems || 0);
          showToast('Item removed from cart', 'info');
        }
      } catch (err) {
        console.error('Failed to remove item on server:', err);
      }
    } else {
      let currentGuest: Array<{ variantId: string; quantity: number }> = [];
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        try {
          currentGuest = JSON.parse(stored);
        } catch {}
      }
      currentGuest = currentGuest.filter((g) => g.variantId !== variantId);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(currentGuest));
      await fetchServerGuestCalculation(currentGuest);
      showToast('Item removed from cart', 'info');
    }
  };

  // Clear cart
  const clearCart = async (): Promise<void> => {
    if (isAuthenticated) {
      try {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      } catch {}
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
    setItems([]);
    setSubtotal(0);
    setSavings(0);
    setDeliveryCharge(40);
    setTotal(0);
    setFreeDeliveryShortfall(FREE_DELIVERY_THRESHOLD);
    setTotalItems(0);
  };

  const refreshCart = async () => {
    if (isAuthenticated) {
      await fetchServerUserCart();
    } else {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      await fetchServerGuestCalculation(parsed);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        savings,
        deliveryCharge,
        freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
        freeDeliveryShortfall,
        total,
        isLoading,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
