import React, { useEffect, useState, useRef, useTransition } from 'react';
import {
  BarChart3,
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Bike,
  Calendar,
  Settings,
  ShieldCheck,
  AlertCircle,
  Lock,
  LogOut,
  Search,
  Plus,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  FileText,
  X,
  IndianRupee,
  Check,
  Ban,
  TrendingUp,
  MapPin,
  Phone,
  Gift,
  Tag,
  Star,
  Building2,
  Bell,
  History,
  Volume2,
  VolumeX,
  Receipt,
  Eye,
  Truck,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/formatters';
import { AdminHampersTab } from '../components/admin/AdminHampersTab';
import { AdminMarketingTab } from '../components/admin/AdminMarketingTab';
import { AdminReviewsTab } from '../components/admin/AdminReviewsTab';
import { AdminEnquiriesTab } from '../components/admin/AdminEnquiriesTab';
import { AdminNotificationsTab } from '../components/admin/AdminNotificationsTab';
import { AdminCouponUsageModal } from '../components/admin/AdminCouponUsageModal';
import { StoreOperationsCard } from '../components/admin/StoreOperationsCard';
import { ProductImagePlaceholder } from '../components/common/ProductImagePlaceholder';
import {
  isOrderSoundMuted,
  setOrderSoundMuted,
  isAudioContextSuspended,
  unlockAudioContext,
  playNewOrderChime,
} from '../utils/soundEffects';
import {
  AdminOrderNotificationBanner,
  NewOrderAlertItem,
} from '../components/admin/AdminOrderNotificationBanner';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminDashboardHeader } from '../components/admin/AdminDashboardHeader';
import { AdminKpiGrid } from '../components/admin/AdminKpiGrid';
import { AdminSalesChartCard } from '../components/admin/AdminSalesChartCard';
import { AdminPendingOrdersCard } from '../components/admin/AdminPendingOrdersCard';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';

interface AdminPageProps {
  onBackToStore: () => void;
  onGoToLogin: () => void;
  initialTab?: string;
}

type AdminTab =
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

const tabTitles: Record<AdminTab, string> = {
  overview: 'Dashboard',
  reports: 'Reports & Analytics',
  orders: 'Orders',
  products: 'Sweets & Stock',
  categories: 'Categories',
  customers: 'Customers',
  delivery: 'Delivery & Fleet',
  hampers: 'Gift Hampers',
  marketing: 'Offers & Banners',
  reviews: 'Reviews',
  enquiries: 'Bulk Enquiries',
  notifications: 'Notifications',
  settings: 'Store Settings',
  coupons: 'Coupons',
  audit: 'Audit Trail',
};

export const AdminPage: React.FC<AdminPageProps> = ({ onBackToStore, onGoToLogin, initialTab }) => {
  const { user, token, isAuthenticated, isStaff, isAdmin, signOut, getAuthHeaders } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>((initialTab as AdminTab) || 'overview');
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time Order Alerts & Audio State
  const [isMuted, setIsMuted] = useState<boolean>(() => isOrderSoundMuted());
  const [isAudioSuspended, setIsAudioSuspended] = useState<boolean>(false);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [orderAlerts, setOrderAlerts] = useState<NewOrderAlertItem[]>([]);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [trendView, setTrendView] = useState<'7days' | '30days'>('7days');

  // Stage 6 State
  const [hampers, setHampers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedCouponForUsage, setSelectedCouponForUsage] = useState<any | null>(null);

  // Orders Tab filters & search
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderFulfilmentFilter, setOrderFulfilmentFilter] = useState<'ALL' | 'DELIVERY' | 'TAKEAWAY'>('ALL');
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null);

  // Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Assign Delivery Modal
  const [assigningOrder, setAssigningOrder] = useState<any | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  // Refund Modal state
  const [refundOrderTarget, setRefundOrderTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('Customer cancellation / return');
  const [isRefunding, setIsRefunding] = useState(false);

  // Product Add / Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    category_id: '',
    description: '',
    image_url: '',
    pure_ghee: true,
    shelf_life_days: 7,
    ingredients: '',
    variantLabel: '500g',
    variantPrice: 300,
    variantMrp: 340,
    variantWeight: 500,
    variantStock: 50,
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sweet Catalog Tab filters
  const [adminProductCategory, setAdminProductCategory] = useState<string>('ALL');
  const [adminProductSearch, setAdminProductSearch] = useState<string>('');

  // Category Add / Edit Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: '',
    display_order: 1,
  });

  // Delivery Partner Add Modal
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    phone: '',
    vehicle_number: '',
  });

  // Coupon Add / Edit Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'FLAT' as 'FLAT' | 'PERCENTAGE',
    discount_value: 50,
    min_order_amount: 300,
    max_discount_amount: 150,
    usage_limit: '' as string | number,
    per_user_limit: '' as string | number,
    is_active: true,
  });

  // Variant Add / Edit Modal
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    label: '500g',
    weightGrams: 500,
    price: 300,
    mrp: 350,
    stockQuantity: 50,
    stockStatus: 'IN_STOCK',
  });

  // 1. DATA LOADER
  const loadAllAdminData = async (silent = false) => {
    if (!isAuthenticated || !isStaff) return;
    if (!silent) setLoading(true);
    setServerError('');

    try {
      const headers = getAuthHeaders();
      const [
        overviewRes,
        ordersRes,
        productsRes,
        categoriesRes,
        partnersRes,
        settingsRes,
        couponsRes,
        hampersRes,
        offersRes,
        bannersRes,
        reviewsRes,
        enquiriesRes,
        notificationsRes,
      ] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/categories', { headers }),
        fetch('/api/admin/delivery-partners', { headers }),
        fetch('/api/admin/store/settings', { headers }),
        fetch('/api/admin/coupons', { headers }),
        fetch('/api/admin/hampers', { headers }),
        fetch('/api/admin/offers', { headers }),
        fetch('/api/admin/banners', { headers }),
        fetch('/api/admin/reviews', { headers }),
        fetch('/api/admin/enquiries', { headers }),
        fetch('/api/admin/notifications', { headers }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.metrics);
        setStoreSettings(data.storeSettings);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const fetchedOrders = data.orders || [];
        setOrders(fetchedOrders);
        // Mark existing orders as seen so they do not trigger alert chimes
        fetchedOrders.forEach((o: any) => {
          if (o?.id) seenOrderIdsRef.current.add(o.id);
        });
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      if (partnersRes.ok) {
        const data = await partnersRes.json();
        setDeliveryPartners(data.partners || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setStoreSettings(data.settings);
      }

      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setCoupons(data.coupons || []);
      }

      if (hampersRes.ok) {
        const data = await hampersRes.json();
        setHampers(data.hampers || []);
      }

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(data.offers || []);
      }

      if (bannersRes.ok) {
        const data = await bannersRes.json();
        setBanners(data.banners || []);
      }

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }

      if (enquiriesRes.ok) {
        const data = await enquiriesRes.json();
        setEnquiries(data.enquiries || []);
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data.notifications || []);
      }

      // If ADMIN, also load audit logs & customers
      if (isAdmin) {
        const [auditRes, custRes] = await Promise.all([
          fetch('/api/admin/audit-logs', { headers }),
          fetch('/api/admin/customers', { headers }),
        ]);
        if (auditRes.ok) {
          const d = await auditRes.json();
          setAuditLogs(d.auditLogs || []);
        }
        if (custRes.ok) {
          const d = await custRes.json();
          setCustomers(d.customers || []);
        }
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to sync with store server.');
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [isAuthenticated, isStaff]);

  // 2. LIVE POLLING: Orders screen polls every 60 seconds, only when tab is visible
  useEffect(() => {
    if (!isAuthenticated || !isStaff) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Background poll orders & metrics without showing full screen loader
        loadAllAdminData(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isStaff, isAdmin]);

  // 3. AUDIO AUTOPLAY STATE TRACKER
  useEffect(() => {
    setIsAudioSuspended(isAudioContextSuspended());
    const handleInteraction = () => {
      if (isAudioContextSuspended()) {
        setIsAudioSuspended(true);
      } else {
        setIsAudioSuspended(false);
      }
    };
    window.addEventListener('click', handleInteraction, { passive: true });
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  // 4. REAL-TIME NEW ORDER SSE SUBSCRIPTION
  useEffect(() => {
    if (!isAuthenticated || !isStaff || !token) {
      setStreamConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connectSSE = () => {
      if (isDisposed) return;

      const sseUrl = `/api/admin/orders/stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setStreamConnected(true);
      };

      eventSource.addEventListener('connected', () => {
        setStreamConnected(true);
      });

      eventSource.addEventListener('new_order', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (!payload || !payload.id) return;

          // Deduplication: If already processed (historical or repeated event), ignore safely
          if (seenOrderIdsRef.current.has(payload.id)) {
            return;
          }
          seenOrderIdsRef.current.add(payload.id);

          // Play notification chime if sound is enabled
          if (!isOrderSoundMuted()) {
            const played = playNewOrderChime();
            if (!played && isAudioContextSuspended()) {
              setIsAudioSuspended(true);
            }
          }

          // Trigger background browser notification only if tab is hidden and permission is already granted
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`New Order #${payload.order_number || payload.id.slice(-6).toUpperCase()}`, {
                body: `₹${Number(payload.total_amount).toLocaleString('en-IN')} • ${payload.item_count || 1} items (${payload.payment_method || 'Order'})`,
                icon: '/favicon.ico',
                tag: payload.id,
              });
            } catch (notifErr) {
              console.warn('[Notification] Background desktop notification error:', notifErr);
            }
          }

          // Show floating toast alert banner
          const alertItem: NewOrderAlertItem = {
            id: payload.id,
            order_number: payload.order_number || payload.id.slice(-6).toUpperCase(),
            total_amount: Number(payload.total_amount) || 0,
            payment_method: payload.payment_method || 'ONLINE',
            placed_at: payload.placed_at || new Date().toISOString(),
            recipient_name: payload.recipient_name,
            recipient_phone: payload.recipient_phone,
            item_count: payload.item_count || 1,
            items_summary: payload.items_summary,
          };

          setOrderAlerts((prev) => [alertItem, ...prev.filter((a) => a.id !== alertItem.id)].slice(0, 10));

          // Prepend new order to orders state immediately without requiring page refresh
          if (payload.order_snapshot) {
            setOrders((prev) => {
              const exists = prev.some((o) => o.id === payload.id);
              if (exists) {
                return prev.map((o) => (o.id === payload.id ? payload.order_snapshot : o));
              }
              return [payload.order_snapshot, ...prev];
            });
          }

          // Update live metrics counters
          setMetrics((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              totalOrders: (Number(prev.totalOrders) || 0) + 1,
              todayOrders: (Number(prev.todayOrders) || 0) + 1,
              todayRevenue: (Number(prev.todayRevenue) || 0) + (Number(payload.total_amount) || 0),
            };
          });
        } catch (parseErr) {
          console.error('[Admin SSE] Error parsing new_order event:', parseErr);
        }
      });

      eventSource.onerror = () => {
        setStreamConnected(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      };
    };

    connectSSE();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      setStreamConnected(false);
    };
  }, [isAuthenticated, isStaff, token]);

  // Audio & Notification Handlers
  const handleToggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setOrderSoundMuted(nextState);
    if (!nextState) {
      unlockAudioContext().then(() => {
        setIsAudioSuspended(false);
        playNewOrderChime();
        showToast('Order notification sound enabled', 'success');
      });
    } else {
      showToast('Order notification sound muted', 'info');
    }
  };

  const handleEnableAudio = async () => {
    await unlockAudioContext();
    setIsAudioSuspended(false);
    if (isMuted) {
      setIsMuted(false);
      setOrderSoundMuted(false);
    }
    await playNewOrderChime();
    showToast('Order sound alert activated', 'success');
  };

  const handleDismissAlert = (id: string) => {
    setOrderAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleViewOrderFromAlert = (orderNumberOrId: string) => {
    setOrderAlerts((prev) => prev.filter((a) => a.id !== orderNumberOrId && a.order_number !== orderNumberOrId));
    setActiveTab('orders');
    setOrderStatusFilter('ALL');
    const targetOrder = orders.find((o) => o.id === orderNumberOrId || o.order_number === orderNumberOrId);
    if (targetOrder) {
      setSelectedOrderForDetails(targetOrder);
      if (targetOrder.order_number) {
        setOrderSearchQuery(targetOrder.order_number);
      }
    } else {
      setOrderSearchQuery(orderNumberOrId);
    }
  };

  // Manual Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadAllAdminData(true);
    showToast('Store data refreshed!', 'info');
  };

  // 3. IMAGE UPLOAD HANDLER (JPEG/PNG/WebP <= 5MB, Single Primary Image)
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME Type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Only JPEG, PNG, and WebP images are supported.', 'error');
      return;
    }

    // Validate File Size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please optimize photo.', 'error');
      return;
    }

    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;

        // 1. Get server-signed upload URL (Supabase Storage flow)
        const signRes = await fetch('/api/admin/signed-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });
        const signData = await signRes.json();
        if (!signRes.ok) {
          showToast(signData.message || 'Failed to authorize storage upload', 'error');
          setIsUploadingImage(false);
          return;
        }

        // 2. Upload photo to signed storage endpoint with authorization token
        const res = await fetch(signData.uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            dataUrl: base64Data,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            token: signData.token,
            path: signData.path,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setProductForm((prev) => ({ ...prev, image_url: data.imageUrl }));
          showToast('Photo uploaded as primary sweet image!', 'success');
        } else {
          showToast(data.message || 'Upload failed', 'error');
        }
        setIsUploadingImage(false);
        } catch (innerErr: any) {
          showToast(innerErr.message || 'Error uploading image to server', 'error');
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast(err.message || 'Error processing image', 'error');
      setIsUploadingImage(false);
    }
  };

  // 4. ORDER STATUS TRANSITION WITH AUDIT LOGGING
  const handleOrderStatusTransition = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        setSelectedOrderForDetails((prev: any) => (prev && prev.id === orderId ? data.order : prev));
        showToast(`Order status updated to ${nextStatus}`, 'success');
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Transition rejected by state machine', 'error');
      }
    } catch (err) {
      showToast('Failed to update order status', 'error');
    }
  };

  // 5. ASSIGN DELIVERY PARTNER
  const handleAssignDelivery = async () => {
    if (!assigningOrder || !selectedPartnerId) {
      showToast('Select a delivery partner first.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${assigningOrder.id}/assign-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ partnerId: selectedPartnerId }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === assigningOrder.id ? data.order : o)));
        setSelectedOrderForDetails((prev: any) => (prev && prev.id === assigningOrder.id ? data.order : prev));
        showToast(data.message || 'Delivery assigned!', 'success');
        setAssigningOrder(null);
        setSelectedPartnerId('');
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Assignment failed', 'error');
      }
    } catch (err) {
      showToast('Failed to assign partner', 'error');
    }
  };

  // 6. CASHFREE REFUND ACTION (ADMIN ONLY) WITH DOUBLE-REFUND GUARD
  
  const handleSyncRefund = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund/sync`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Refund synced: ${data.refund?.refund_status || 'Unknown'}`, 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        setSelectedOrderForDetails((prev: any) => (prev && prev.id === orderId ? data.order : prev));
      } else {
        showToast(data.message || 'Failed to sync refund', 'error');
      }
    } catch (e) {
      showToast('Error syncing refund', 'error');
    }
  };

  const handleExecuteRefund = async () => {
    if (!refundOrderTarget) return;

    if (!isAdmin) {
      showToast('Only shop administrator has refund authority.', 'error');
      return;
    }

    setIsRefunding(true);
    try {
      const res = await fetch(`/api/admin/orders/${refundOrderTarget.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === refundOrderTarget.id ? data.order : o)));
        setSelectedOrderForDetails((prev: any) => (prev && prev.id === refundOrderTarget.id ? data.order : prev));
        showToast(`Refund of ₹${refundOrderTarget.total_amount} processed successfully!`, 'success');
        setRefundOrderTarget(null);
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Refund failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing refund', 'error');
    } finally {
      setIsRefunding(false);
    }
  };

  // 7. STOCK STATUS TOGGLER
  const handleToggleStock = async (variantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'IN_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK';
    try {
      const res = await fetch(`/api/admin/variants/${variantId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ stockStatus: nextStatus }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            variants: p.variants.map((v: any) =>
              v.id === variantId ? { ...v, stockStatus: nextStatus } : v
            ),
          }))
        );
        showToast('Stock availability updated!', 'success');
      }
    } catch (err) {
      showToast('Failed to toggle stock', 'error');
    }
  };

  // 8. PRODUCT SAVE (ADMIN ONLY)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only Admin can add or modify products.', 'error');
      return;
    }

    try {
      const isEdit = Boolean(productForm.id);
      const url = isEdit ? `/api/admin/products/${productForm.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: productForm.name,
        category_id: productForm.category_id || categories.find((c) => c.is_active !== false)?.id || categories[0]?.id,
        description: productForm.description,
        image_url: productForm.image_url,
        pure_ghee: productForm.pure_ghee,
        shelf_life_days: productForm.shelf_life_days,
        ingredients: productForm.ingredients,
        ...(!isEdit
          ? {
              variants: [
                {
                  label: productForm.variantLabel,
                  weightGrams: productForm.variantWeight,
                  price: productForm.variantPrice,
                  mrp: productForm.variantMrp,
                  stockQuantity: productForm.variantStock,
                },
              ],
            }
          : {}),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Product updated!' : 'Mithai added to catalog!', 'success');
        setIsProductModalOpen(false);
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Failed to save product', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
    }
  };

  // 9. DELETE PRODUCT (ADMIN ONLY)
  const handleDeleteProduct = (productId: string, productName: string) => {
    if (!isAdmin) {
      showToast('Only Admin can delete products.', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Delete ${productName}?`,
      message:
        'This will permanently remove the mithai and all its size variants from the store.',
      confirmLabel: 'Yes, Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            showToast('Product removed.', 'info');
            loadAllAdminData(true);
          }
        } catch {
          showToast('Failed to delete product', 'error');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // 10. SAVE STORE SETTINGS (ADMIN ONLY)
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only Admin can modify store settings.', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Update Store Settings?',
      message: 'This will update active delivery rates, free delivery thresholds, and shop contact details in Barabanki.',
      confirmLabel: 'Save Settings',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/store/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify(storeSettings),
          });
          const d = await res.json();
          if (res.ok) {
            showToast('Store settings updated!', 'success');
          } else {
            showToast(d.message || 'Failed to save settings', 'error');
          }
        } catch {
          showToast('Error saving settings', 'error');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // 11. QUICK STORE OPERATIONS HANDLER (ADMIN & STORE MANAGERS)
  const handleUpdateOperationsSettings = async (newSettings: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/store/operations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          delivery_enabled: newSettings.delivery_enabled,
          takeaway_enabled: newSettings.takeaway_enabled,
          closure_message: newSettings.closure_message,
          auto_reopen_at: newSettings.auto_reopen_at,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setStoreSettings(d.settings);
        showToast(d.message || 'Store operations updated successfully!', 'success');
        return true;
      } else {
        showToast(d.message || 'Failed to update store operations', 'error');
        return false;
      }
    } catch {
      showToast('Network error updating store operations', 'error');
      return false;
    }
  };

  // 12. CATEGORY HANDLERS (ADMIN ONLY)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only Admin can manage categories.', 'error');
      return;
    }

    try {
      const isEdit = Boolean(editingCategoryId);
      const url = isEdit ? `/api/admin/categories/${editingCategoryId}` : '/api/admin/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(categoryForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Category updated!' : 'Category created!', 'success');
        setIsCategoryModalOpen(false);
        setEditingCategoryId(null);
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Failed to save category', 'error');
      }
    } catch {
      showToast('Error saving category', 'error');
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (!isAdmin) {
      showToast('Only Admin can delete categories.', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Delete Category '${categoryName}'?`,
      message: 'This will remove the category tile from the store catalog. Sweets inside will need reassignment.',
      confirmLabel: 'Yes, Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/categories/${categoryId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (res.ok) {
            showToast(data.message || 'Category deleted.', 'info');
            loadAllAdminData(true);
          } else {
            showToast(data.message || 'Failed to delete category', 'error');
          }
        } catch {
          showToast('Failed to delete category', 'error');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // 13. DELIVERY PARTNER HANDLERS
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only Admin can add delivery partners.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/delivery-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(partnerForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Rider ${partnerForm.name} onboarded!`, 'success');
        setIsPartnerModalOpen(false);
        setPartnerForm({ name: '', phone: '', vehicle_number: '' });
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Failed to add rider', 'error');
      }
    } catch {
      showToast('Error saving delivery partner', 'error');
    }
  };

  const handleTogglePartnerStatus = async (partnerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'OFF_DUTY' : 'AVAILABLE';
    try {
      const res = await fetch(`/api/admin/delivery-partners/${partnerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`Rider status set to ${nextStatus}`, 'success');
        loadAllAdminData(true);
      }
    } catch {
      showToast('Failed to update rider status', 'error');
    }
  };

  // 14. COUPON HANDLERS (ADMIN ONLY FOR MUTATIONS)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only Admin can create or modify coupons.', 'error');
      return;
    }

    try {
      const isEdit = Boolean(editingCouponId);
      const url = isEdit ? `/api/admin/coupons/${editingCouponId}` : '/api/admin/coupons';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(couponForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Coupon updated!' : 'Coupon created!', 'success');
        setIsCouponModalOpen(false);
        setEditingCouponId(null);
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Failed to save coupon', 'error');
      }
    } catch {
      showToast('Error saving coupon', 'error');
    }
  };

  const handleToggleCoupon = async (coupon: any) => {
    if (!isAdmin) {
      showToast('Only Admin can toggle coupons.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      if (res.ok) {
        showToast(`Coupon ${coupon.code} ${!coupon.is_active ? 'activated' : 'deactivated'}`, 'info');
        loadAllAdminData(true);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to toggle coupon status', 'error');
      }
    } catch {
      showToast('Failed to toggle coupon status', 'error');
    }
  };

  const handleDeleteCoupon = (coupon: any) => {
    if (!isAdmin) {
      showToast('Only Admin can delete coupons.', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Delete Coupon ${coupon.code}?`,
      message: 'This will permanently remove this coupon discount from the checkout page.',
      confirmLabel: 'Yes, Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            showToast(`Coupon ${coupon.code} deleted.`, 'info');
            loadAllAdminData(true);
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.message || 'Failed to delete coupon', 'error');
          }
        } catch {
          showToast('Failed to delete coupon', 'error');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // 15. VARIANT MANAGEMENT (ADMIN ONLY)
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedProductForVariant) {
      showToast('Only Admin can manage sweet variants.', 'error');
      return;
    }

    try {
      const isEdit = Boolean(editingVariantId);
      const url = isEdit
        ? `/api/admin/variants/${editingVariantId}`
        : `/api/admin/products/${selectedProductForVariant.id}/variants`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(variantForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Variant updated!' : 'Variant added to product!', 'success');
        setIsVariantModalOpen(false);
        setEditingVariantId(null);
        setSelectedProductForVariant(null);
        loadAllAdminData(true);
      } else {
        showToast(data.message || 'Failed to save variant', 'error');
      }
    } catch {
      showToast('Error saving variant', 'error');
    }
  };

  // 16. ORDER CANCELLATION PROMPT (WITH CONFIRMATION DIALOG)
  const handlePromptOrderCancellation = (order: any) => {
    setConfirmDialog({
      isOpen: true,
      title: `Cancel Order #${order.order_number}?`,
      message: `Are you sure you want to cancel this order? This will update the order status and record an audit log.`,
      confirmLabel: 'Yes, Cancel Order',
      isDestructive: true,
      onConfirm: () => {
        handleOrderStatusTransition(order.id, 'CANCELLED');
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ROUTE GUARDS
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#FAF4DE] text-[#B8781E] flex items-center justify-center mx-auto border border-[#C9A227]/40 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-3xl text-[#1F1B16]">
          Protected Admin Area
        </h1>
        <p className="text-sm text-[#6B6258] leading-relaxed">
          The Saraswati Sweets operations console requires staff or shop owner authentication.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onGoToLogin}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold text-sm transition-colors shadow-xs"
          >
            Staff / Owner Login
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-white border border-[#E8DFD2] hover:bg-[#F3EBE0] text-[#1F1B16] font-semibold text-sm transition-colors"
          >
            Back to Storefront
          </button>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#FAF4DE] text-[#B3261E] flex items-center justify-center mx-auto border border-[#B3261E]/30 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-3xl text-[#1F1B16]">
          Access Denied
        </h1>
        <p className="text-sm text-[#6B6258] leading-relaxed">
          You are currently signed in as a customer (<strong>{user?.full_name}</strong>). This administration console is strictly restricted to store staff and owners.
        </p>
        <button
          type="button"
          onClick={onBackToStore}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8A1538] text-white text-sm font-semibold hover:bg-[#701029]"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
    if (orderFulfilmentFilter !== 'ALL') {
      const type = o.fulfilment_type || 'DELIVERY';
      if (type !== orderFulfilmentFilter) return false;
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchNum = o.order_number?.toLowerCase().includes(q);
      const matchName = o.address_snapshot?.recipient_name?.toLowerCase().includes(q);
      const matchPhone = o.address_snapshot?.recipient_phone?.includes(q) || o.guest_phone?.includes(q);
      return matchNum || matchName || matchPhone;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#241C17]">
      {/* Fixed Left Sidebar (>= 900px) & Horizontal Nav Strip (< 900px) */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isAdmin={isAdmin}
        userRole={user?.role}
        userName={user?.full_name}
        userEmail={user?.email || user?.phone || ''}
        onSignOut={signOut}
        counts={{
          orders: orders.length,
          products: products.length,
          categories: categories.length,
          hampers: hampers.length,
          marketing: offers.length + banners.length,
          reviews: reviews.filter((r) => !r.is_approved).length > 0 ? `${reviews.filter((r) => !r.is_approved).length} new` : reviews.length,
          enquiries: enquiries.filter((e) => e.status === 'NEW').length > 0 ? `${enquiries.filter((e) => e.status === 'NEW').length} new` : enquiries.length,
          notifications: notifications.filter((n) => !n.is_read).length > 0 ? `${notifications.filter((n) => !n.is_read).length} unread` : notifications.length,
          customers: customers.length,
          delivery: deliveryPartners.length,
          coupons: coupons.length,
          audit: auditLogs.length,
        }}
      />

      {/* Main Console Area (offset by 232px on desktop, max-width 1180px, padding 28px 32px) */}
      <main className="admin-main-area bg-[#F7F4EF] min-h-screen">
        <div className="max-w-[1180px] mx-auto w-full space-y-6">
          {/* Dashboard Header Bar */}
          <AdminDashboardHeader
            title={tabTitles[activeTab] || 'Dashboard'}
            streamConnected={streamConnected}
            isRefreshing={isRefreshing}
            onRefresh={handleManualRefresh}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
            isAudioSuspended={isAudioSuspended}
            onEnableAudio={handleEnableAudio}
            onBackToStore={onBackToStore}
          />

          {serverError && (
            <div className="p-4 rounded-xl bg-[#FAF4DE] border border-[#B3261E]/40 text-sm text-[#8A1538] font-medium flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#B3261E]" />
              <span>{serverError}</span>
            </div>
          )}

          {/* 3. TAB PANELS */}

      {/* ==================================================== */}
      {/* TAB A: OVERVIEW / DASHBOARD                          */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 1. KPI row (AdminKpiGrid) */}
          {metrics && (
            <AdminKpiGrid
              metrics={metrics}
              outForDeliveryCount={
                orders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY').length ||
                metrics.outForDeliveryOrders ||
                0
              }
            />
          )}

          {/* 2. Second row, two columns (2fr / 1fr, gap 16px) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {metrics && (
              <div className="lg:col-span-2">
                <AdminSalesChartCard
                  trendView={trendView}
                  onSetTrendView={setTrendView}
                  trend7Days={metrics.trend7Days}
                  trend30Days={metrics.trend30Days}
                />
              </div>
            )}

            {storeSettings && (
              <div className="lg:col-span-1">
                <StoreOperationsCard
                  storeSettings={storeSettings}
                  onUpdateSettings={handleUpdateOperationsSettings}
                  canEdit={isStaff || isAdmin}
                />
              </div>
            )}
          </div>

          {/* 3. Third row: AdminPendingOrdersCard */}
          <AdminPendingOrdersCard
            orders={orders}
            onOpenOrder={(order) => setSelectedOrderForDetails(order)}
            onViewAllOrders={() => setActiveTab('orders')}
          />

          {/* 4. Quick Low-Stock Inventory Triage */}
          {products.some((p) => p.variants?.some((v: any) => v.stockStatus !== 'IN_STOCK' || v.stockQuantity < 15)) && (
            <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#A8261E]" strokeWidth={1.8} aria-hidden="true" />
                  <h3 className="text-[16px] font-extrabold text-[#241C17] tracking-tight">
                    Kitchen Inventory Alert • Low / Out of Stock Items
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-[#7A1129] hover:underline cursor-pointer"
                >
                  Manage all stock
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {products
                  .flatMap((p) =>
                    p.variants
                      ?.filter((v: any) => v.stockStatus !== 'IN_STOCK' || v.stockQuantity < 15)
                      .map((v: any) => ({ ...v, productName: p.name })) || []
                  )
                  .slice(0, 6)
                  .map((v: any) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#241C17] truncate">{v.productName}</div>
                        <div className="text-[11px] text-[#6B5F55] mt-0.5">
                          {v.label} • <span className="font-bold tabular-nums text-[#8A4B00]">{v.stockQuantity}</span> units left
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleStock(v.id, v.stockStatus)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-[8px] transition-colors whitespace-nowrap cursor-pointer active:scale-95 ${
                          v.stockStatus === 'IN_STOCK'
                            ? 'bg-[#FDEFD0] text-[#8A4B00] hover:bg-[#fad899]'
                            : 'bg-[#E3F4EA] text-[#17663E] hover:bg-[#c9ebd6]'
                        }`}
                      >
                        {v.stockStatus === 'IN_STOCK' ? 'Set Out of Stock' : 'Mark In Stock'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 5. Quick Action Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="p-4 rounded-[14px] bg-white border border-[#E9E2D8] hover:border-[#7A1129] hover:bg-[#F3E9DC]/40 text-left transition-all shadow-2xs flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="font-bold text-sm text-[#241C17] group-hover:text-[#7A1129] transition-colors">
                  Manage Live Orders
                </div>
                <div className="text-xs text-[#6B6258] mt-0.5">Order confirmation, dispatch, and delivery</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7A1129] group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="p-4 rounded-[14px] bg-white border border-[#E9E2D8] hover:border-[#7A1129] hover:bg-[#F3E9DC]/40 text-left transition-all shadow-2xs flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="font-bold text-sm text-[#241C17] group-hover:text-[#7A1129] transition-colors">
                  Reports & Analytics
                </div>
                <div className="text-xs text-[#6B6258] mt-0.5">Sales summaries, bestsellers, gateway & exports</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7A1129] group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('products');
                setIsProductModalOpen(true);
              }}
              className="p-4 rounded-[14px] bg-white border border-[#E9E2D8] hover:border-[#7A1129] hover:bg-[#F3E9DC]/40 text-left transition-all shadow-2xs flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="font-bold text-sm text-[#241C17] group-hover:text-[#7A1129] transition-colors">
                  + Add New Sweet / Mithai
                </div>
                <div className="text-xs text-[#6B6258] mt-0.5">Upload photo & set prices</div>
              </div>
              <Plus className="w-4 h-4 text-[#7A1129] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB: REPORTS & ANALYTICS                             */}
      {/* ==================================================== */}
      {activeTab === 'reports' && (
        <AdminReportsTab
          getAuthHeaders={getAuthHeaders}
          onNavigateToOrders={() => setActiveTab('orders')}
        />
      )}

      {/* ==================================================== */}
      {/* TAB B: ORDERS MANAGEMENT                             */}
      {/* ==================================================== */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-4">
            <div>
              <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#7A1129]" />
                <span>Orders Dashboard (Live Polling every 20s)</span>
              </h3>
             
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B5F55] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auto-syncing
              </span>
            </div>
          </div>

          {/* Search, Fulfilment & Status Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#6B5F55] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search order #, patron name, or phone..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              {/* Fulfilment Filter Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[#F7F4EF] p-1 rounded-[10px] border border-[#E9E2D8]">
                {(['ALL', 'DELIVERY', 'TAKEAWAY'] as const).map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setOrderFulfilmentFilter(ft)}
                    className={`min-h-[34px] px-3 py-1 rounded-[8px] text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      orderFulfilmentFilter === ft
                        ? 'bg-[#7A1129] text-white shadow-2xs'
                        : 'text-[#6B5F55] hover:text-[#241C17] hover:bg-white'
                    }`}
                  >
                    {ft === 'ALL' ? (
                      <span>All ({orders.length})</span>
                    ) : ft === 'DELIVERY' ? (
                      <>
                        <Truck className="w-3.5 h-3.5" />
                        <span>Delivery ({orders.filter((o) => (o.fulfilment_type || 'DELIVERY') === 'DELIVERY').length})</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-3.5 h-3.5" />
                        <span>Takeaway ({orders.filter((o) => o.fulfilment_type === 'TAKEAWAY').length})</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter Badges */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                'ALL',
                'PENDING_PAYMENT',
                'PLACED',
                'CONFIRMED',
                'OUT_FOR_DELIVERY',
                'DELIVERED',
                'CANCELLED',
                'REFUNDED',
              ].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  className={`min-h-[32px] px-3 py-1 rounded-[8px] text-xs font-bold whitespace-nowrap transition-colors ${
                    orderStatusFilter === st
                      ? 'bg-[#7A1129] text-white shadow-2xs'
                      : 'bg-[#F7F4EF] text-[#6B5F55] border border-[#E9E2D8] hover:text-[#241C17] hover:bg-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B5F55]">
              No orders found matching the selected filter or search query.
            </div>
          ) : (
            <div className="divide-y divide-[#E9E2D8]">
              {filteredOrders.map((order) => {
                const status = order.status;
                const isTakeaway = order.fulfilment_type === 'TAKEAWAY';
                const isPaidOnline = order.payment_method === 'ONLINE' && order.payment_status === 'CAPTURED';

                // Complete, authoritative financial values
                const itemsSubtotal = (order.subtotal && order.subtotal > 0)
                  ? order.subtotal
                  : (order.items?.reduce((acc: number, it: any) => acc + (it.total_price || ((it.unit_price || 0) * (it.quantity || 1)) || 0), 0) || 0);
                const productDiscount = order.discount_amount || 0;
                const deliveryFee = (order.delivery_charge !== undefined && order.delivery_charge !== null)
                  ? order.delivery_charge
                  : (isTakeaway ? 0 : 50);
                const applicableTaxes = order.tax_amount || 0;
                const finalOrderTotal = order.total_amount;

                return (
                  <div key={order.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[#7A1129]">
                          #{order.order_number}
                        </span>

                        {/* Fulfilment Type Badge */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] flex items-center gap-1 border ${
                            isTakeaway
                              ? 'bg-[#E3F4EA] text-[#17663E] border-[#17663E]/20'
                              : 'bg-[#F3E9DC] text-[#7A1129] border-[#7A1129]/20'
                          }`}
                        >
                          {isTakeaway ? (
                            <>
                              <Store className="w-3 h-3" />
                              <span>Store Takeaway</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-3 h-3" />
                              <span>Doorstep Delivery</span>
                            </>
                          )}
                        </span>

                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[6px] ${
                            status === 'DELIVERED'
                              ? 'bg-[#E3F4EA] text-[#17663E]'
                              : status === 'CANCELLED'
                              ? 'bg-[#FDE8E8] text-[#A8261E]'
                              : status === 'REFUNDED'
                              ? 'bg-[#FDEFD0] text-[#8A4B00]'
                              : 'bg-[#F3E9DC] text-[#7A1129]'
                          }`}
                        >
                          {status}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] ${
                            order.payment_method === 'ONLINE'
                              ? order.payment_status === 'CAPTURED'
                                ? 'bg-[#E3F4EA] text-[#17663E]'
                                : 'bg-[#F3E9DC] text-[#7A1129]'
                              : 'bg-stone-100 text-[#6B5F55]'
                          }`}
                        >
                          {order.payment_method === 'ONLINE' ? 'Online (Cashfree)' : 'Cash on Delivery'} • {order.payment_status === 'CAPTURED' ? 'Paid' : (order.payment_status || 'Pending')}
                        </span>

                        <span className="text-xs text-[#6B5F55] tabular-nums">
                          {new Date(order.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-right sm:text-right">
                        <div className="text-sm font-extrabold text-[#241C17] tabular-nums">
                          {formatINR(finalOrderTotal)}
                        </div>
                        <div className="text-[11px] text-[#6B5F55] font-medium">
                          Final Payable Total
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Counter Slot for Takeaway */}
                    {isTakeaway && (
                      <div className="text-xs text-[#8A4B00] font-semibold flex items-center gap-1.5 bg-[#FDEFD0] px-3 py-1.5 rounded-[10px] border border-[#C79A3D]/40">
                        <Clock className="w-3.5 h-3.5 text-[#8A4B00] shrink-0" />
                        <span>
                          Scheduled Counter Pickup:{' '}
                          <strong className="text-[#241C17]">
                            {order.slot_snapshot?.slot_time_formatted || 'Standard Slot'}
                            {order.slot_snapshot?.slot_date ? ` (${order.slot_snapshot.slot_date})` : ''}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-[#6B5F55] leading-relaxed">
                      Customer: <strong className="text-[#241C17]">{order.address_snapshot?.recipient_name}</strong> (
                      {order.address_snapshot?.recipient_phone}) •{' '}
                      {isTakeaway ? (
                        <span className="text-[#17663E] font-semibold">Store Counter Pickup (Barabanki)</span>
                      ) : (
                        <span>Destination: {order.address_snapshot?.street_address}, {order.address_snapshot?.pincode}</span>
                      )}
                    </div>

                    <div className="text-xs text-[#241C17] font-medium">
                      Items:{' '}
                      {order.items?.map((it: any) => `${it.product_name} (${it.variant_label}) × ${it.quantity}`).join(' • ')}
                    </div>

                    {!isTakeaway && order.delivery_partner_name && (
                      <div className="text-xs text-[#17663E] flex items-center gap-1 font-semibold">
                        <Bike className="w-3.5 h-3.5" />
                        <span>Rider Assigned: {order.delivery_partner_name} ({order.delivery_partner_phone})</span>
                      </div>
                    )}

                    {/* Financial Summary & Breakdown Bar */}
                    <div className="p-3.5 bg-[#F7F4EF] rounded-[12px] border border-[#E9E2D8] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs flex-1">
                        <div>
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-[#6B5F55]">Items Subtotal</span>
                          <span className="font-semibold text-[#241C17] tabular-nums">{formatINR(itemsSubtotal)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-[#6B5F55]">Product Discount</span>
                          <span className={`font-semibold tabular-nums ${productDiscount > 0 ? 'text-[#17663E]' : 'text-[#6B5F55]'}`}>
                            {productDiscount > 0 ? `−${formatINR(productDiscount)}` : '₹0'}
                            {order.coupon_code && (
                              <span className="ml-1 text-[10px] bg-[#E3F4EA] text-[#17663E] px-1 py-0.5 rounded font-mono font-bold">
                                {order.coupon_code}
                              </span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-[#6B5F55]">
                            {isTakeaway ? 'Pickup Fee' : 'Delivery Fee'}
                          </span>
                          <span className="font-semibold text-[#241C17] tabular-nums">
                            {deliveryFee === 0 ? (
                              <span className="text-[#17663E] font-bold">FREE (₹0)</span>
                            ) : (
                              formatINR(deliveryFee)
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-[#7A1129]">Final Order Total</span>
                          <span className="font-extrabold text-[#7A1129] text-sm tabular-nums">{formatINR(finalOrderTotal)}</span>
                          {applicableTaxes > 0 ? (
                            <span className="block text-[10px] text-[#6B5F55]">incl. ₹{applicableTaxes} tax</span>
                          ) : (
                            <span className="block text-[10px] text-stone-400">tax incl. in MRP</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetails(order)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white hover:bg-[#F3E9DC] border border-[#E9E2D8] text-xs font-bold text-[#241C17] transition-colors shrink-0 shadow-2xs min-h-[36px]"
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#7A1129]" />
                        <span>View Price Breakdown</span>
                      </button>
                    </div>

                    {/* State Machine Transition Action Buttons & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E9E2D8]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-[#6B5F55]">Next Status:</span>

                        {status === 'PENDING_PAYMENT' && (
                          <span className="text-[11px] text-[#8A4B00] bg-[#FDEFD0] px-2.5 py-1 rounded-[6px] border border-[#C79A3D]/40 font-bold">
                            Awaiting Cashfree Payment (15m expiry)
                          </span>
                        )}

                        {status === 'PLACED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusTransition(order.id, 'CONFIRMED')}
                              className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                            >
                              Confirm Order
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptOrderCancellation(order)}
                              className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] border border-[#A8261E] text-[#A8261E] hover:bg-[#FDE8E8] text-xs font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {status === 'CONFIRMED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusTransition(order.id, 'OUT_FOR_DELIVERY')}
                              className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                            >
                              Send Out for Delivery
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptOrderCancellation(order)}
                              className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] border border-[#A8261E] text-[#A8261E] hover:bg-[#FDE8E8] text-xs font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {/* Backward compatibility for historical orders */}
                        {(status === 'PREPARING' || status === 'READY_FOR_PICKUP') && (
                          <button
                            type="button"
                            onClick={() => handleOrderStatusTransition(order.id, 'OUT_FOR_DELIVERY')}
                            className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                          >
                            Send Out for Delivery
                          </button>
                        )}

                        {status === 'OUT_FOR_DELIVERY' && (
                          <button
                            type="button"
                            onClick={() => handleOrderStatusTransition(order.id, 'DELIVERED')}
                            className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] bg-[#1E7A4B] hover:bg-[#17663E] text-white text-xs font-bold shadow-2xs transition-colors"
                          >
                            Mark Delivered & Paid
                          </button>
                        )}

                        {status === 'DELIVERED' && (
                          <span className="text-[11px] font-bold text-[#17663E] flex items-center gap-1 bg-[#E3F4EA] px-2.5 py-1 rounded-[6px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Order Complete & Paid
                          </span>
                        )}

                        {status === 'CANCELLED' && (
                          <span className="text-[11px] font-bold text-[#A8261E] bg-[#FDE8E8] px-2.5 py-1 rounded-[6px]">
                            Order Cancelled
                          </span>
                        )}

                        {(status === 'REFUNDED' || order.payment_status?.includes('REFUND')) && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#8A4B00] bg-[#FDEFD0] px-2.5 py-1 rounded-[6px] border border-[#C79A3D]/40">
                              {order.payment_status === 'REFUND_PENDING' ? 'Refund Processing' : order.payment_status === 'REFUND_FAILED' ? 'Refund Failed' : 'Refunded'} 
                              ({order.provider_refund_id || 'Processed'})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSyncRefund(order.id)}
                              className="text-[11px] bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-[6px] text-[#241C17] font-semibold transition-colors"
                            >
                              Sync Status
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right action group: Assign Delivery & Admin Refund */}
                      <div className="flex items-center gap-2">
                        {status !== 'CANCELLED' && status !== 'DELIVERED' && status !== 'REFUNDED' && (
                          <button
                            type="button"
                            onClick={() => setAssigningOrder(order)}
                            className="px-3 py-1.5 min-h-[36px] rounded-[10px] border border-[#E9E2D8] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#241C17] flex items-center gap-1.5 transition-colors"
                          >
                            <Bike className="w-3.5 h-3.5 text-[#7A1129]" />
                            <span>{order.delivery_partner_id ? 'Reassign Rider' : 'Assign Rider'}</span>
                          </button>
                        )}

                        {isAdmin && isPaidOnline && status !== 'REFUNDED' && !order.payment_status?.includes('REFUND') && (
                          <button
                            type="button"
                            onClick={() => setRefundOrderTarget(order)}
                            className="px-3.5 py-1.5 min-h-[36px] rounded-[10px] bg-[#C79A3D] hover:bg-[#B3872F] text-white text-xs font-bold shadow-2xs transition-colors"
                          >
                            Refund via Cashfree
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB C: PRODUCTS & VARIANTS MANAGEMENT                */}
      {/* ==================================================== */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-4">
            <div>
              <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7A1129]" />
                <span>Sweet Catalog & Counter Inventory</span>
              </h3>
              <p className="text-xs text-[#6B5F55]">
                Add sweets, upload primary photos (JPEG/PNG/WebP ≤ 5MB), and toggle counter stock status.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setProductForm({
                    id: '',
                    name: '',
                    category_id: categories.find((c) => c.is_active !== false)?.id || categories[0]?.id || '',
                    description: '',
                    image_url: '',
                    pure_ghee: true,
                    shelf_life_days: 7,
                    ingredients: '',
                    variantLabel: '500g',
                    variantPrice: 300,
                    variantMrp: 340,
                    variantWeight: 500,
                    variantStock: 50,
                  });
                  setIsProductModalOpen(true);
                }}
                className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-[#E8C16A]" />
                <span>+ Add New Sweet</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills & Search */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                <button
                  type="button"
                  onClick={() => setAdminProductCategory('ALL')}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    adminProductCategory === 'ALL'
                      ? 'bg-[#7A1129] text-white shadow-2xs'
                      : 'bg-[#F7F4EF] border border-[#E9E2D8] text-[#6B5F55] hover:text-[#241C17] hover:bg-white'
                  }`}
                >
                  All Sweets ({products.length})
                </button>
                {categories.filter((cat) => cat.is_active !== false).map((cat) => {
                  const count = products.filter((p) => p.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAdminProductCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                        adminProductCategory === cat.id
                          ? 'bg-[#7A1129] text-white shadow-2xs'
                          : 'bg-[#F7F4EF] border border-[#E9E2D8] text-[#6B5F55] hover:text-[#241C17] hover:bg-white'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-[#6B5F55] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminProductSearch}
                  onChange={(e) => setAdminProductSearch(e.target.value)}
                  placeholder="Filter by sweet name or SKU..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products
              .filter((prod) => {
                const matchesCat = adminProductCategory === 'ALL' || prod.category_id === adminProductCategory;
                const matchesSearch =
                  !adminProductSearch.trim() ||
                  prod.name.toLowerCase().includes(adminProductSearch.toLowerCase().trim()) ||
                  prod.variants?.some((v: any) => v.sku?.toLowerCase().includes(adminProductSearch.toLowerCase().trim()));
                return matchesCat && matchesSearch;
              })
              .map((prod) => (
              <div
                key={prod.id}
                className="p-4 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start gap-3">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-16 h-16 rounded-[10px] object-cover bg-[#F3E9DC] shrink-0 border border-[#E9E2D8]"
                    />
                  ) : (
                    <ProductImagePlaceholder
                      aspect="square"
                      size="sm"
                      variant="admin-thumbnail"
                      productName={prod.name}
                      className="w-16 h-16 rounded-[10px] shrink-0 border border-[#E9E2D8]"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-sm text-[#241C17] truncate">{prod.name}</h4>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setProductForm({
                                id: prod.id,
                                name: prod.name,
                                category_id: prod.category_id,
                                description: prod.description,
                                image_url: prod.image_url,
                                pure_ghee: prod.pure_ghee,
                                shelf_life_days: prod.shelf_life_days,
                                ingredients: prod.ingredients,
                                variantLabel: '',
                                variantPrice: 0,
                                variantMrp: 0,
                                variantWeight: 0,
                                variantStock: 0,
                              });
                              setIsProductModalOpen(true);
                            }}
                            className="p-1 text-[#6B5F55] hover:text-[#7A1129] transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1 text-[#6B5F55] hover:text-[#A8261E] transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#6B5F55] line-clamp-1 mt-0.5">{prod.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#7A1129] font-semibold flex-wrap">
                      {categories.find((c) => c.id === prod.category_id)?.name && (
                        <span className="bg-[#FDEFD0] text-[#7A1129] px-2 py-0.5 rounded-[6px] font-bold text-[10px] border border-[#C79A3D]/30">
                          {categories.find((c) => c.id === prod.category_id)?.name}
                        </span>
                      )}
                      {prod.pure_ghee && <span>• 100% Desi Ghee</span>}
                      <span>• Shelf Life: {prod.shelf_life_days} days</span>
                    </div>
                  </div>
                </div>

                {/* Variants List & Counter Availability Switch */}
                <div className="space-y-1.5 pt-2 border-t border-[#E9E2D8]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6B5F55] uppercase tracking-wider block">
                      Variants & Counter Stock:
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductForVariant(prod);
                          setEditingVariantId(null);
                          setVariantForm({
                            label: '1 kg Box',
                            weightGrams: 1000,
                            price: 550,
                            mrp: 600,
                            stockQuantity: 50,
                            stockStatus: 'IN_STOCK',
                          });
                          setIsVariantModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#7A1129] hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Size</span>
                      </button>
                    )}
                  </div>

                  {prod.variants?.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-[8px] border border-[#E9E2D8]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#241C17]">{v.label}</span>
                        <span className="text-[#6B5F55] tabular-nums font-semibold">{formatINR(v.price)}</span>
                        {v.mrp > v.price && (
                          <span className="text-[10px] text-stone-400 line-through tabular-nums">
                            {formatINR(v.mrp)}
                          </span>
                        )}
                        <span className="text-[10px] text-[#6B5F55] bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                          Qty: {v.stockQuantity}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForVariant(prod);
                              setEditingVariantId(v.id);
                              setVariantForm({
                                label: v.label,
                                weightGrams: v.weightGrams,
                                price: v.price,
                                mrp: v.mrp,
                                stockQuantity: v.stockQuantity,
                                stockStatus: v.stockStatus,
                              });
                              setIsVariantModalOpen(true);
                            }}
                            className="p-1 text-stone-400 hover:text-[#7A1129] transition-colors"
                            title="Edit Variant Details"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleStock(v.id, v.stockStatus)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] transition-colors ${
                            v.stockStatus === 'IN_STOCK'
                              ? 'bg-[#E3F4EA] text-[#17663E] hover:bg-[#FDE8E8] hover:text-[#A8261E]'
                              : 'bg-[#FDE8E8] text-[#A8261E] hover:bg-[#E3F4EA] hover:text-[#17663E]'
                          }`}
                        >
                          {v.stockStatus === 'IN_STOCK' ? '✓ In Stock' : '✕ Out of Stock'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB D: CATEGORIES                                    */}
      {/* ==================================================== */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-4">
            <div>
              <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#7A1129]" />
                <span>Categories Directory</span>
              </h3>
              
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setCategoryForm({ name: '', description: '', image_url: '', display_order: categories.length + 1 });
                  setIsCategoryModalOpen(true);
                }}
                className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-[#E8C16A]" />
                <span>+ Add Category</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="p-4 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] flex items-start gap-3">
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-16 h-16 rounded-[10px] object-cover bg-[#F3E9DC] shrink-0 border border-[#E9E2D8]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-bold text-sm text-[#241C17] truncate">{cat.name}</h4>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setCategoryForm({
                              name: cat.name,
                              description: cat.description || '',
                              image_url: cat.image_url,
                              display_order: cat.display_order,
                            });
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1 text-stone-400 hover:text-[#7A1129] transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1 text-stone-400 hover:text-[#A8261E] transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#6B5F55] line-clamp-2 mt-0.5">{cat.description}</p>
                  <div className="text-[11px] text-[#7A1129] font-bold mt-1">
                    {cat.product_count || 0} Sweets Listed • Order #{cat.display_order}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB E: CUSTOMERS DIRECTORY (ADMIN ONLY)              */}
      {/* ==================================================== */}
      {activeTab === 'customers' && isAdmin && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#E9E2D8] pb-3">
            <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#7A1129]" />
              <span>Customer Patron Directory</span>
            </h3>
            <p className="text-xs text-[#6B5F55]">
              Registered buyers, mobile numbers, order histories, and lifetime value in Barabanki.
            </p>
          </div>

          <div className="divide-y divide-[#E9E2D8] overflow-x-auto">
            {customers.map((cust) => (
              <div key={cust.id} className="py-3 flex items-center justify-between gap-4 min-w-[500px] text-xs">
                <div>
                  <div className="font-bold text-sm text-[#241C17]">{cust.full_name}</div>
                  <div className="text-[#6B5F55] mt-0.5">
                    Phone: {cust.phone || 'N/A'} • Email: {cust.email || 'N/A'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-[#7A1129] tabular-nums text-sm">
                    {formatINR(cust.totalSpent || 0)}
                  </div>
                  <div className="text-[11px] text-[#6B5F55] mt-0.5">
                    {cust.orderCount || 0} orders • Last: {cust.lastOrderDate ? new Date(cust.lastOrderDate).toLocaleDateString('en-IN') : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB F: DELIVERY & FLEET OPERATIONS                   */}
      {/* ==================================================== */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {/* Store Operations / Delivery & Takeaway Live Controls */}
          {storeSettings && (
            <StoreOperationsCard
              storeSettings={storeSettings}
              onUpdateSettings={handleUpdateOperationsSettings}
              canEdit={isStaff || isAdmin}
            />
          )}

          <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-4">
              <div>
                <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
                  <Bike className="w-5 h-5 text-[#7A1129]" />
                  <span>Barabanki Local Delivery Fleet</span>
                </h3>
                <p className="text-xs text-[#6B5F55]">
                  Assign orders to trusted store delivery riders for doorstep drop-off.
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setPartnerForm({ name: '', phone: '', vehicle_number: '' });
                    setIsPartnerModalOpen(true);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-[#E8C16A]" />
                  <span>+ Add Rider</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveryPartners.map((dp) => (
                <div key={dp.id} className="p-4 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#241C17]">{dp.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] ${
                        dp.status === 'AVAILABLE'
                          ? 'bg-[#E3F4EA] text-[#17663E]'
                          : dp.status === 'ON_DELIVERY'
                          ? 'bg-[#FDEFD0] text-[#8A4B00]'
                          : 'bg-stone-200 text-[#6B5F55]'
                      }`}
                    >
                      {dp.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#6B5F55]">
                    Phone: <strong>{dp.phone}</strong> • Vehicle: <strong>{dp.vehicle_number}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E9E2D8]">
                    <span className="text-[#7A1129] font-bold">
                      Assigned Orders: {dp.current_assigned_orders || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePartnerStatus(dp.id, dp.status)}
                      className="text-[11px] font-bold text-[#7A1129] hover:underline"
                    >
                      Toggle {dp.status === 'AVAILABLE' ? 'Off Duty' : 'Available'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB H: STORE SETTINGS (ADMIN ONLY)                   */}
      {/* ==================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-4">
            <div>
              <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#7A1129]" />
                <span>Store Settings & Delivery Parameters</span>
              </h3>
              <p className="text-xs text-[#6B5F55]">
                {isAdmin
                  ? 'Configure Barabanki delivery charges, COD caps, and shop operating hours.'
                  : 'View-only access for staff members.'}
              </p>
            </div>
            {!isAdmin && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-[#FDEFD0] text-[#8A4B00] border border-[#C79A3D]/40">
                Staff View-Only
              </span>
            )}
          </div>

          {storeSettings && (
            <form onSubmit={handleSaveStoreSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={storeSettings.store_name || ''}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={storeSettings.phone || ''}
                  onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Barabanki Delivery Charge (₹)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={storeSettings.delivery_charge || 0}
                  onChange={(e) => setStoreSettings({ ...storeSettings, delivery_charge: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={storeSettings.free_delivery_threshold || 0}
                  onChange={(e) => setStoreSettings({ ...storeSettings, free_delivery_threshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Cash on Delivery Limit (₹)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={storeSettings.cod_max_limit || 0}
                  onChange={(e) => setStoreSettings({ ...storeSettings, cod_max_limit: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Serviceable Barabanki Pincodes
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={storeSettings.allowed_pincodes?.join(', ') || ''}
                  onChange={(e) =>
                    setStoreSettings({
                      ...storeSettings,
                      allowed_pincodes: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                />
              </div>

              {/* ==================================================== */}
              {/* STORE OPERATIONS & PICKUP SCHEDULING CONTROLS        */}
              {/* ==================================================== */}
              <div className="sm:col-span-2 pt-4 border-t border-[#E9E2D8] space-y-4">
                <StoreOperationsCard
                  storeSettings={storeSettings}
                  onUpdateSettings={handleUpdateOperationsSettings}
                  canEdit={isStaff || isAdmin}
                />

                <div className="flex items-center gap-2 pt-2">
                  <Store className="w-5 h-5 text-[#7A1129]" />
                  <h4 className="font-extrabold text-base text-[#241C17]">
                    Takeaway Counter Hours & Slot Capacity Scheduling
                  </h4>
                </div>
                <p className="text-xs text-[#6B5F55]">
                  Configure counter operating hours and per-slot kitchen order limits for Barabanki shop pickups.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F7F4EF] p-4 rounded-[12px] border border-[#E9E2D8]">
                  {/* Pickup Operating Hours */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                      Counter Opening Time (IST)
                    </label>
                    <input
                      type="time"
                      disabled={!isStaff && !isAdmin}
                      value={storeSettings.pickup_opening_time || '09:00'}
                      onChange={(e) => setStoreSettings({ ...storeSettings, pickup_opening_time: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                      Counter Closing Time (IST)
                    </label>
                    <input
                      type="time"
                      disabled={!isStaff && !isAdmin}
                      value={storeSettings.pickup_closing_time || '21:30'}
                      onChange={(e) => setStoreSettings({ ...storeSettings, pickup_closing_time: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                    />
                  </div>

                  {/* Slot Duration */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                      Pickup Slot Window (Minutes)
                    </label>
                    <select
                      disabled={!isStaff && !isAdmin}
                      value={storeSettings.pickup_slot_duration_minutes || 30}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          pickup_slot_duration_minutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes (Recommended)</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                    </select>
                  </div>

                  {/* Max Orders Per Slot */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                      Max Orders Per Slot (Kitchen Capacity)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      disabled={!isStaff && !isAdmin}
                      value={storeSettings.pickup_max_orders_per_slot || 10}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          pickup_max_orders_per_slot: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                    />
                  </div>

                  {/* Advance Booking Days */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                      Advance Booking Window (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      disabled={!isStaff && !isAdmin}
                      value={storeSettings.pickup_advance_days || 3}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          pickup_advance_days: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                    />
                  </div>

                  {/* Auto-Reopen Timestamp */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                      Auto-Reopen Timestamp (Optional)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="datetime-local"
                        disabled={!isStaff && !isAdmin}
                        value={storeSettings.auto_reopen_at ? storeSettings.auto_reopen_at.slice(0, 16) : ''}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            auto_reopen_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129] disabled:opacity-60"
                      />
                      {storeSettings.auto_reopen_at && (isStaff || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => setStoreSettings({ ...storeSettings, auto_reopen_at: null })}
                          className="px-2.5 py-1 text-xs text-[#A8261E] hover:underline shrink-0 font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[#6B5F55] mt-1">
                      Automatically turns Delivery & Takeaway back ON when time passes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 pt-2">
                {isAdmin ? (
                  <button
                    type="submit"
                    className="min-h-[44px] px-6 py-2.5 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    Save Store Settings
                  </button>
                ) : (
                  <p className="text-xs text-[#6B5F55] italic">
                    * Log in as Shop Owner (Admin) to modify store rates and settings.
                  </p>
                )}
              </div>
            </form>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* TAB J: COUPONS MANAGEMENT (ADMIN ONLY)                 */}
      {/* ==================================================== */}
      {activeTab === 'coupons' && isAdmin && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E2D8] pb-4">
            <div>
              <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#7A1129]" />
                <span>Store Coupons & Promo Discounts</span>
              </h3>
              <p className="text-xs text-[#6B5F55] mt-1">
                Manage coupon codes applicable at customer checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingCouponId(null);
                setCouponForm({
                  code: '',
                  description: '',
                  discount_type: 'FLAT',
                  discount_value: 50,
                  min_order_amount: 300,
                  max_discount_amount: 150,
                  usage_limit: '',
                  per_user_limit: '',
                  is_active: true,
                });
                setIsCouponModalOpen(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#E8C16A]" />
              <span>+ Add Coupon</span>
            </button>
          </div>

          {coupons.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B5F55] bg-[#F7F4EF] rounded-[12px] border border-[#E9E2D8]">
              No coupons active. Click '+ Add Coupon' to configure promo codes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coup) => (
                <div
                  key={coup.id}
                  className="p-4 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] space-y-3 flex flex-col justify-between hover:shadow-2xs transition-shadow"
                >
                  <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-[#7A1129] bg-white px-2 py-0.5 rounded-[6px] border border-[#E9E2D8]">
                        {coup.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] ${
                          coup.is_active ? 'bg-[#E3F4EA] text-[#17663E]' : 'bg-stone-200 text-[#6B5F55]'
                        }`}
                      >
                        {coup.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCouponId(coup.id);
                          setCouponForm({
                            code: coup.code,
                            description: coup.description || '',
                            discount_type: coup.discount_type || coup.type || 'FLAT',
                            discount_value: coup.discount_value ?? coup.value ?? 50,
                            min_order_amount: coup.min_order_amount ?? coup.min_order_value ?? 0,
                            max_discount_amount: coup.max_discount_amount || 150,
                            usage_limit: coup.usage_limit ?? coup.usage_limit_total ?? '',
                            per_user_limit: coup.per_user_limit ?? coup.usage_limit_per_user ?? '',
                            is_active: coup.is_active,
                          });
                          setIsCouponModalOpen(true);
                        }}
                        className="p-1 text-stone-400 hover:text-[#7A1129] transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coup)}
                        className="p-1 text-stone-400 hover:text-[#A8261E] transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#241C17] font-medium leading-snug">{coup.description || 'No description'}</p>

                  <div className="text-xs text-[#6B5F55] flex items-center justify-between bg-white p-2.5 rounded-[8px] border border-[#E9E2D8]">
                    <span className="flex flex-col gap-0.5">
                      <span className="font-bold text-[#241C17]">
                        {(coup.discount_type || coup.type) === 'FLAT'
                          ? `₹${coup.discount_value ?? coup.value} OFF`
                          : `${coup.discount_value ?? coup.value}% OFF`}
                      </span>
                      <span className="text-[10px]">
                        Min: ₹{coup.min_order_amount ?? coup.min_order_value ?? 0}{' '}
                        {coup.max_discount_amount ? `• Max: ₹${coup.max_discount_amount}` : ''}
                      </span>
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => handleToggleCoupon(coup)}
                      className="font-bold text-[11px] text-[#7A1129] hover:underline"
                    >
                      {coup.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-[#6B5F55] border-t border-dashed border-[#E9E2D8]">
                    <span>
                      Total Uses: {coup.usage_count || 0} / {(coup.usage_limit ?? coup.usage_limit_total) ?? '∞'} <br/>
                      Per User: {(coup.per_user_limit ?? coup.usage_limit_per_user) ?? '∞'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCouponForUsage(coup)}
                      className="font-bold text-[11px] text-[#7A1129] bg-[#F3E9DC] px-2.5 py-1 rounded-[6px] hover:bg-[#E9E2D8] transition-colors flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      View Log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB I: AUDIT TRAIL (ADMIN ONLY)                      */}
      {/* ==================================================== */}
      {activeTab === 'audit' && isAdmin && (
        <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#E9E2D8] pb-3">
            <h3 className="font-extrabold text-[18px] text-[#241C17] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#7A1129]" />
              <span>Security & Operations Audit Trail</span>
            </h3>
            <p className="text-xs text-[#6B5F55]">
              Immutable log of order status transitions, Cashfree refunds, and store configuration changes.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B5F55]">
              No audit logs recorded yet. Actions by staff and owner will automatically appear here.
            </div>
          ) : (
            <div className="divide-y divide-[#E9E2D8] overflow-x-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-[500px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#7A1129]">{log.action}</span>
                      <span className="text-[#6B5F55]">• User: <strong>{log.user_name}</strong> ({log.user_role})</span>
                    </div>
                    <div className="text-[#241C17] mt-0.5 font-mono text-[11px]">
                      Entity: {log.entity_type} #{log.entity_id} • Details: {JSON.stringify(log.details)}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#6B5F55] whitespace-nowrap tabular-nums">
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB J: GIFT HAMPERS COMPOSITION BUILDER              */}
      {/* ==================================================== */}
      {activeTab === 'hampers' && (
        <AdminHampersTab
          hampers={hampers}
          products={products}
          isAdmin={isAdmin}
          getAuthHeaders={getAuthHeaders}
          onRefresh={loadAllAdminData}
          showToast={showToast}
        />
      )}

      {/* ==================================================== */}
      {/* TAB K: MARKETING (OFFERS, BANNERS, COUPONS)          */}
      {/* ==================================================== */}
      {activeTab === 'marketing' && (
        <AdminMarketingTab
          offers={offers}
          banners={banners}
          coupons={coupons}
          isAdmin={isAdmin}
          getAuthHeaders={getAuthHeaders}
          onRefresh={loadAllAdminData}
          showToast={showToast}
        />
      )}

      {/* ==================================================== */}
      {/* TAB L: REVIEWS MODERATION                            */}
      {/* ==================================================== */}
      {activeTab === 'reviews' && (
        <AdminReviewsTab
          reviews={reviews}
          isAdmin={isAdmin}
          getAuthHeaders={getAuthHeaders}
          onRefresh={loadAllAdminData}
          showToast={showToast}
        />
      )}

      {/* ==================================================== */}
      {/* TAB M: BULK / CORPORATE / WEDDING ENQUIRIES          */}
      {/* ==================================================== */}
      {activeTab === 'enquiries' && (
        <AdminEnquiriesTab
          enquiries={enquiries}
          isAdmin={isAdmin}
          getAuthHeaders={getAuthHeaders}
          onRefresh={loadAllAdminData}
          showToast={showToast}
        />
      )}

      {/* ==================================================== */}
      {/* TAB N: NOTIFICATIONS FEED & TEST EMAIL DISPATCH      */}
      {/* ==================================================== */}
      {activeTab === 'notifications' && (
        <AdminNotificationsTab
          notifications={notifications}
          isAdmin={isAdmin}
          getAuthHeaders={getAuthHeaders}
          onRefresh={loadAllAdminData}
          showToast={showToast}
        />
      )}

      {/* ==================================================== */}
      {/* COUPON USAGE MODAL                                   */}
      {/* ==================================================== */}
      {selectedCouponForUsage && (
        <AdminCouponUsageModal
          coupon={selectedCouponForUsage}
          isOpen={Boolean(selectedCouponForUsage)}
          getAuthHeaders={getAuthHeaders}
          onClose={() => setSelectedCouponForUsage(null)}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT                          */}
      {/* ==================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-[18px] text-[#241C17]">
                {productForm.id ? 'Edit Sweet / Mithai' : 'Add New Sweet to Catalog'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-[8px] text-stone-400 hover:text-[#241C17] hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Mithai Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashmiri Kesar Peda"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Category *
                </label>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                >
                  {categories.filter((c) => c.is_active !== false).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Aromatic Awadhi specialty prepared with pure ingredients..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              {/* PRIMARY PHOTO UPLOAD (JPEG/PNG/WebP <= 5MB) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17]">
                  Primary Product Photo (JPEG, PNG, WebP ≤ 5MB)
                </label>

                <div className="flex items-center gap-3">
                  {productForm.image_url ? (
                    <img
                      src={productForm.image_url}
                      alt=""
                      className="w-16 h-16 rounded-[10px] object-cover border border-[#E9E2D8] bg-[#F3E9DC]"
                    />
                  ) : (
                    <ProductImagePlaceholder
                      aspect="square"
                      size="sm"
                      variant="admin-thumbnail"
                      className="w-16 h-16 rounded-[10px] border border-[#E9E2D8]"
                    />
                  )}

                  <div className="space-y-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 min-h-[38px] rounded-[10px] border border-[#E9E2D8] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#241C17] flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#7A1129]" />
                      <span>{isUploadingImage ? 'Uploading photo...' : 'Upload Primary Photo'}</span>
                    </button>
                    <div className="text-[10px] text-[#6B5F55]">
                      Square 1:1 image recommended. Max file size: 5MB.
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant specifications if new product */}
              {!productForm.id && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E9E2D8]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#241C17] mb-1">Variant Pack</label>
                    <input
                      type="text"
                      value={productForm.variantLabel}
                      onChange={(e) => setProductForm({ ...productForm, variantLabel: e.target.value })}
                      placeholder="e.g. 500g"
                      className="w-full px-2.5 py-1.5 rounded-[8px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#241C17] mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={productForm.variantPrice}
                      onChange={(e) => setProductForm({ ...productForm, variantPrice: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-[8px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#241C17] mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      value={productForm.variantMrp}
                      onChange={(e) => setProductForm({ ...productForm, variantMrp: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-[8px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#241C17] mb-1">Stock</label>
                    <input
                      type="number"
                      value={productForm.variantStock}
                      onChange={(e) => setProductForm({ ...productForm, variantStock: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-[8px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  Save Mithai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ASSIGN DELIVERY PARTNER                     */}
      {/* ==================================================== */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-base text-[#241C17]">
                Assign Delivery Partner
              </h3>
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="p-1.5 rounded-[8px] text-stone-400 hover:text-[#241C17] hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#6B5F55]">
              Order #{assigningOrder.order_number} to {assigningOrder.address_snapshot?.recipient_name} ({assigningOrder.address_snapshot?.street_address})
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17]">
                Select Barabanki Rider
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-medium text-[#241C17] focus:outline-hidden focus:border-[#7A1129]"
              >
                <option value="">-- Choose Active Rider --</option>
                {deliveryPartners.map((dp) => (
                  <option key={dp.id} value={dp.id}>
                    {dp.name} ({dp.vehicle_number}) • {dp.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignDelivery}
                className="flex-1 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: CASHFREE REFUND CONFIRMATION (ADMIN ONLY)   */}
      {/* ==================================================== */}
      {refundOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FDEFD0] text-[#8A4B00] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-lg text-[#241C17]">
                Refund Order #{refundOrderTarget.order_number}?
              </h3>
              <p className="text-xs text-[#6B5F55] leading-relaxed">
                This will trigger the Cashfree Refunds API for <strong>{formatINR(refundOrderTarget.total_amount)}</strong> back to the customer's account and transition order status to <strong>REFUNDED</strong>.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#241C17] mb-1">
                Refund Reason
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:outline-hidden focus:border-[#7A1129]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundOrderTarget(null)}
                className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={handleExecuteRefund}
                className="flex-1 min-h-[44px] rounded-[10px] bg-[#C79A3D] hover:bg-[#B3872F] text-white text-xs font-bold shadow-2xs disabled:opacity-50 transition-colors"
              >
                {isRefunding ? 'Processing Refund...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: CATEGORY ADD / EDIT (ADMIN ONLY)            */}
      {/* ==================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-base text-[#241C17]">
                {editingCategoryId ? 'Edit Sweet Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryId(null);
                }}
                className="p-1.5 rounded-[8px] text-stone-400 hover:text-[#241C17] hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Desi Ghee Ladoos"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Traditional Awadhi sweets made with pure shuddh ghee..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryId(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: DELIVERY PARTNER ONBOARDING (ADMIN ONLY)    */}
      {/* ==================================================== */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-base text-[#241C17]">
                Onboard Delivery Rider
              </h3>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1.5 rounded-[8px] text-stone-400 hover:text-[#241C17] hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Rider Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 XXXXX"
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  placeholder="UP-32-XX-0000"
                  value={partnerForm.vehicle_number}
                  onChange={(e) => setPartnerForm({ ...partnerForm, vehicle_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  Add Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 6: COUPON ADD / EDIT (ADMIN ONLY)              */}
      {/* ==================================================== */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-base text-[#241C17]">
                {editingCouponId ? 'Edit Store Coupon' : 'Create New Coupon'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCouponModalOpen(false);
                  setEditingCouponId(null);
                }}
                className="p-1.5 rounded-[8px] text-stone-400 hover:text-[#241C17] hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BARABANKI50"
                  value={couponForm.code}
                  disabled={Boolean(editingCouponId)}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs font-mono font-bold text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Flat ₹50 off on orders over ₹399"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Type</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-white text-xs font-medium text-[#241C17]"
                  >
                    <option value="FLAT">Flat (₹)</option>
                    <option value="PERCENTAGE">Percent (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">
                    Value {couponForm.discount_type === 'FLAT' ? '(₹)' : '(%)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.min_order_amount}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.max_discount_amount}
                    onChange={(e) => setCouponForm({ ...couponForm, max_discount_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Total Limit</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="∞ (Unlimited)"
                    value={couponForm.usage_limit}
                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Per-User Limit</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="∞ (Unlimited)"
                    value={couponForm.per_user_limit}
                    onChange={(e) => setCouponForm({ ...couponForm, per_user_limit: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCouponModalOpen(false);
                    setEditingCouponId(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 7: SWEET VARIANT ADD / EDIT (ADMIN ONLY)       */}
      {/* ==================================================== */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-base text-[#241C17]">
                {editingVariantId ? 'Edit Sweet Pack Variant' : 'Add Pack Size Variant'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsVariantModalOpen(false);
                  setEditingVariantId(null);
                  setSelectedProductForVariant(null);
                }}
                className="p-1.5 rounded-[8px] text-stone-400 hover:text-[#241C17] hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#6B5F55]">
              Product: <strong>{selectedProductForVariant?.name}</strong>
            </div>

            <form onSubmit={handleSaveVariant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241C17] mb-1">
                  Pack Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500g Box (approx 12 pcs)"
                  value={variantForm.label}
                  onChange={(e) => setVariantForm({ ...variantForm, label: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Weight (grams)</label>
                  <input
                    type="number"
                    min={50}
                    value={variantForm.weightGrams}
                    onChange={(e) => setVariantForm({ ...variantForm, weightGrams: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Counter Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={variantForm.stockQuantity}
                    onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={variantForm.price}
                    onChange={(e) => setVariantForm({ ...variantForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#241C17] mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={variantForm.mrp}
                    onChange={(e) => setVariantForm({ ...variantForm, mrp: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs text-[#241C17]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => {
                    setIsVariantModalOpen(false);
                    setEditingVariantId(null);
                    setSelectedProductForVariant(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 8: GENERIC DESTRUCTIVE CONFIRMATION DIALOG     */}
      {/* ==================================================== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-lg text-[#241C17]">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-[#6B5F55] leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 min-h-[44px] rounded-[10px] border border-[#E9E2D8] text-xs font-semibold text-[#241C17] hover:bg-[#F3E9DC] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`flex-1 min-h-[44px] rounded-[10px] text-xs font-bold text-white shadow-2xs transition-colors ${
                  confirmDialog.isDestructive
                    ? 'bg-[#A8261E] hover:bg-red-700'
                    : 'bg-[#7A1129] hover:bg-[#5E0D20]'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 9: INDIVIDUAL ORDER DETAILS & FINANCIAL BREAKDOWN */}
      {/* ==================================================== */}
      {selectedOrderForDetails && (() => {
        const modalIsTakeaway = selectedOrderForDetails.fulfilment_type === 'TAKEAWAY';
        const modalSubtotal = (selectedOrderForDetails.subtotal && selectedOrderForDetails.subtotal > 0)
          ? selectedOrderForDetails.subtotal
          : (selectedOrderForDetails.items?.reduce((acc: number, it: any) => acc + (it.total_price || ((it.unit_price || 0) * (it.quantity || 1)) || 0), 0) || 0);
        const modalDiscount = selectedOrderForDetails.discount_amount || 0;
        const modalDeliveryFee = (selectedOrderForDetails.delivery_charge !== undefined && selectedOrderForDetails.delivery_charge !== null)
          ? selectedOrderForDetails.delivery_charge
          : (modalIsTakeaway ? 0 : 50);
        const modalTaxes = selectedOrderForDetails.tax_amount || 0;
        const modalFinalTotal = selectedOrderForDetails.total_amount;
        const modalStatus = selectedOrderForDetails.status;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[14px] bg-white shadow-xl border border-[#E9E2D8] overflow-hidden my-auto animate-in fade-in-50 zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E9E2D8] px-6 py-4 bg-[#F7F4EF] shrink-0">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Receipt className="w-5 h-5 text-[#7A1129]" />
                    <h3 className="font-extrabold text-lg text-[#241C17]">
                      Order #{selectedOrderForDetails.order_number}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        modalIsTakeaway
                          ? 'bg-[#E3F4EA] text-[#17663E] border border-[#17663E]/20'
                          : 'bg-[#F3E9DC] text-[#7A1129] border border-[#7A1129]/20'
                      }`}
                    >
                      {modalIsTakeaway ? '🏪 Store Takeaway' : '🚚 Doorstep Delivery'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        modalStatus === 'DELIVERED'
                          ? 'bg-[#E3F4EA] text-[#17663E]'
                          : modalStatus === 'CANCELLED'
                          ? 'bg-[#FDE8E8] text-[#A8261E]'
                          : modalStatus === 'REFUNDED'
                          ? 'bg-[#FDEFD0] text-[#8A4B00]'
                          : 'bg-[#F3E9DC] text-[#7A1129]'
                      }`}
                    >
                      {modalStatus}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B5F55] mt-0.5">
                    Placed on {new Date(selectedOrderForDetails.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForDetails(null)}
                  className="p-1.5 rounded-[10px] text-[#6B5F55] hover:text-[#241C17] hover:bg-[#E9E2D8]/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* 1. Customer & Fulfilment Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F7F4EF] p-4 rounded-[12px] border border-[#E9E2D8] text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B5F55] block">Customer Details</span>
                    <div className="font-bold text-[#241C17] text-sm">
                      {selectedOrderForDetails.address_snapshot?.recipient_name || selectedOrderForDetails.recipient_name || 'Customer'}
                    </div>
                    <div className="text-[#6B5F55] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#7A1129]" />
                      <span>{selectedOrderForDetails.address_snapshot?.recipient_phone || selectedOrderForDetails.guest_phone || 'N/A'}</span>
                    </div>
                    <div className="pt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${modalIsTakeaway ? 'bg-[#E3F4EA] text-[#17663E] border border-[#17663E]/20' : 'bg-[#F3E9DC] text-[#7A1129] border border-[#7A1129]/20'}`}>
                        {modalIsTakeaway ? '🏪 Store Counter Pickup' : '🚚 Doorstep Delivery'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {modalIsTakeaway ? (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B5F55] block">Pickup Window & Counter</span>
                        <div className="text-[#241C17] leading-relaxed flex items-start gap-1.5 font-bold text-sm text-[#7A1129]">
                          <Clock className="w-4 h-4 text-[#7A1129] shrink-0 mt-0.5" />
                          <span>
                            {selectedOrderForDetails.slot_snapshot?.slot_time_formatted || 'Standard Slot'}
                            {selectedOrderForDetails.slot_snapshot?.slot_date ? ` (${selectedOrderForDetails.slot_snapshot.slot_date})` : ''}
                          </span>
                        </div>
                        <div className="text-[#6B5F55] text-[11px] pt-1">
                          Counter: Saraswati Sweets Main Market, Barabanki
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B5F55] block">Delivery Destination</span>
                        <div className="text-[#241C17] leading-relaxed flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#7A1129] shrink-0 mt-0.5" />
                          <span>
                            {selectedOrderForDetails.address_snapshot?.street_address}
                            {selectedOrderForDetails.address_snapshot?.landmark ? `, Near ${selectedOrderForDetails.address_snapshot?.landmark}` : ''}
                            <br />
                            {selectedOrderForDetails.address_snapshot?.city || 'Barabanki'}, {selectedOrderForDetails.address_snapshot?.state || 'Uttar Pradesh'} - {selectedOrderForDetails.address_snapshot?.pincode || '225001'}
                          </span>
                        </div>
                        {selectedOrderForDetails.delivery_partner_name && (
                          <div className="text-[#17663E] flex items-center gap-1 font-semibold pt-1">
                            <Bike className="w-3.5 h-3.5" />
                            <span>Rider: {selectedOrderForDetails.delivery_partner_name} ({selectedOrderForDetails.delivery_partner_phone})</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Itemized Products Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#241C17] flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#7A1129]" />
                      <span>Ordered Products ({selectedOrderForDetails.items?.length || 0} items)</span>
                    </h4>
                  </div>

                  <div className="border border-[#E9E2D8] rounded-[12px] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F4EF] border-b border-[#E9E2D8] text-[#6B5F55] font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Product & Pack / Weight</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E2D8]">
                        {selectedOrderForDetails.items?.map((it: any, idx: number) => {
                          const unitPrice = it.unit_price || (it.quantity ? Math.round((it.total_price || 0) / it.quantity) : 0);
                          const lineTotal = it.total_price || (unitPrice * (it.quantity || 1));

                          return (
                            <tr key={idx} className="hover:bg-[#F7F4EF]/50">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-[#241C17]">{it.product_name}</div>
                                <div className="text-[11px] text-[#6B5F55]">{it.variant_label}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-[#241C17] tabular-nums">
                                {formatINR(unitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-[#241C17] tabular-nums">
                                × {it.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#241C17] tabular-nums">
                                {formatINR(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Dedicated Order Price Breakdown Section */}
                <div className="bg-[#F7F4EF] rounded-[14px] border border-[#E9E2D8] p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-2.5">
                    <h4 className="font-bold text-sm text-[#241C17] flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-[#7A1129]" />
                      <span>Order Price Breakdown</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B5F55] bg-white px-2 py-0.5 rounded border border-[#E9E2D8]">
                      Authoritative Persisted Totals
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Items Subtotal */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#241C17]">Items Subtotal</span>
                        <span className="text-[10px] text-[#6B5F55] block">Total price of products before discounts and delivery</span>
                      </div>
                      <span className="font-semibold text-[#241C17] tabular-nums text-sm">{formatINR(modalSubtotal)}</span>
                    </div>

                    {/* Product Discount */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#241C17]">Product Discount</span>
                        {selectedOrderForDetails.coupon_code && (
                          <span className="ml-1.5 text-[10px] bg-[#E3F4EA] text-[#17663E] px-1.5 py-0.5 rounded font-mono font-bold">
                            Coupon: {selectedOrderForDetails.coupon_code}
                          </span>
                        )}
                        <span className="text-[10px] text-[#6B5F55] block">
                          {modalDiscount > 0 ? 'Discount applied through coupons or special offers' : 'No promotional coupon or offer applied'}
                        </span>
                      </div>
                      <span className={`font-semibold tabular-nums text-sm ${modalDiscount > 0 ? 'text-[#17663E]' : 'text-[#6B5F55]'}`}>
                        {modalDiscount > 0 ? `−${formatINR(modalDiscount)}` : '₹0'}
                      </span>
                    </div>

                    {/* Delivery / Pickup Fee */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#241C17]">
                          {modalIsTakeaway ? 'Store Counter Pickup Fee' : 'Delivery Fee'}
                        </span>
                        <span className="text-[10px] text-[#6B5F55] block">
                          {modalIsTakeaway ? 'FREE (₹0 Counter Pickup)' : 'Flat delivery fee across Barabanki'}
                        </span>
                      </div>
                      <span className="font-semibold text-[#241C17] tabular-nums text-sm">
                        {modalDeliveryFee === 0 ? (
                          <span className="text-[#17663E] font-bold">FREE (₹0)</span>
                        ) : (
                          formatINR(modalDeliveryFee)
                        )}
                      </span>
                    </div>

                    {/* Taxes */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#241C17]">Taxes (GST)</span>
                        <span className="text-[10px] text-[#6B5F55] block">
                          {modalTaxes > 0 ? 'Applicable GST added to order' : 'Inclusive in sweets MRP (0% additional tax)'}
                        </span>
                      </div>
                      <span className="font-semibold text-[#241C17] tabular-nums text-sm">
                        {modalTaxes > 0 ? formatINR(modalTaxes) : '₹0'}
                      </span>
                    </div>

                    {/* Final Order Total */}
                    <div className="pt-3 border-t border-[#E9E2D8] flex justify-between items-baseline">
                      <div>
                        <span className="text-base font-extrabold text-[#241C17] block">Final Order Total</span>
                        <span className="text-[11px] text-[#6B5F55]">Exact final amount payable by customer</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-[#7A1129] tabular-nums">
                          {formatINR(modalFinalTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Mathematical verification summary */}
                    <div className="p-2.5 rounded-[10px] bg-white border border-[#E9E2D8] text-[11px] font-mono text-[#6B5F55] flex flex-wrap items-center justify-between gap-1">
                      <span>
                        Calculation: {formatINR(modalSubtotal)} (Subtotal) − {formatINR(modalDiscount)} (Discount) + {formatINR(modalDeliveryFee)} (Delivery){modalTaxes > 0 ? ` + ${formatINR(modalTaxes)} (Tax)` : ''} =
                      </span>
                      <span className="font-bold text-[#7A1129]">{formatINR(modalFinalTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Payment & Gateway System Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-[12px] border border-[#E9E2D8] bg-[#F7F4EF] text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B5F55] block">Payment Method</span>
                    <div className="font-bold text-[#241C17] mt-0.5">
                      {selectedOrderForDetails.payment_method === 'ONLINE' ? 'Online Payment (Cashfree Payment Gateway)' : 'Cash on Delivery (COD)'}
                    </div>
                    <div className="text-[11px] text-[#6B5F55] mt-1">
                      {selectedOrderForDetails.payment_method === 'ONLINE' ? (
                        <span>Gateway Ref: <code className="bg-white px-1.5 py-0.5 rounded border border-[#E9E2D8] text-[10px]">{selectedOrderForDetails.provider_order_id || (selectedOrderForDetails.payment_method === 'ONLINE' ? selectedOrderForDetails.order_number : 'N/A')}</code></span>
                      ) : (
                        <span>Pay exact cash upon door delivery</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B5F55] block">Payment Status</span>
                    <div className="mt-0.5">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          selectedOrderForDetails.payment_status === 'CAPTURED'
                            ? 'bg-[#E3F4EA] text-[#17663E]'
                            : selectedOrderForDetails.payment_status === 'FAILED'
                            ? 'bg-[#FDE8E8] text-[#A8261E]'
                            : selectedOrderForDetails.payment_status?.includes('REFUND')
                            ? 'bg-[#FDEFD0] text-[#8A4B00]'
                            : 'bg-[#FDEFD0] text-[#8A4B00]'
                        }`}
                      >
                        {selectedOrderForDetails.payment_status === 'CAPTURED'
                          ? 'Paid (CAPTURED)'
                          : (selectedOrderForDetails.payment_status || 'Pending')}
                      </span>
                    </div>
                    {selectedOrderForDetails.provider_payment_id && (
                      <div className="text-[11px] text-[#6B5F55] mt-1">
                        Payment ID: <code className="bg-white px-1.5 py-0.5 rounded border border-[#E9E2D8] text-[10px]">{selectedOrderForDetails.provider_payment_id}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[#E9E2D8] px-6 py-3.5 bg-[#F7F4EF] flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-[#6B5F55]">
                  Order Status: <strong className="text-[#241C17]">{modalStatus}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForDetails(null)}
                  className="px-5 min-h-[44px] rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Real-Time New Order Alerts & Autoplay Banner */}
      <AdminOrderNotificationBanner
        alerts={orderAlerts}
        onDismiss={handleDismissAlert}
        onViewOrder={handleViewOrderFromAlert}
        isAudioSuspended={isAudioSuspended}
        onEnableAudio={handleEnableAudio}
        isMuted={isMuted}
        onToggleMute={handleToggleSound}
      />
        </div>
      </main>
    </div>
  );
};
