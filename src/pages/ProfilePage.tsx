import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAddresses, UserAddress, SERVICEABLE_PINCODES } from '../context/AddressContext';
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Phone,
  LogOut,
  Check,
  AlertCircle,
  X,
  Home,
  Package,
  ChevronRight,
  Mail,
  User,
  Lock,
  Download,
  FileText,
  Bell,
} from 'lucide-react';
import { shouldHandleSpaClick } from '../utils/navigation';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProfilePageProps {
  onNavigate?: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, signOut, openAuthModal, getAuthHeaders, updateUserProfile } = useAuth();
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, checkPincodeServiceable } = useAddresses();

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Edit Profile Modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(user?.full_name || '');
  const [profilePhoneInput, setProfilePhoneInput] = useState(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  // Communication preferences & Privacy Rights state (DPDP Act 2023 & CPA 2019)
  const [promotionalOptIn, setPromotionalOptIn] = useState<boolean>(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  // Privacy Request Modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacyRequestType, setPrivacyRequestType] = useState<string>('DATA_CORRECTION');
  const [privacyDetails, setPrivacyDetails] = useState('');
  const [isSubmittingPrivacy, setIsSubmittingPrivacy] = useState(false);
  const [privacySuccessTicket, setPrivacySuccessTicket] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState('');

  // Authenticated email state (retrieved from user session or supabase auth)
  const [authEmail, setAuthEmail] = useState<string | null>(user?.email || null);

  useEffect(() => {
    if (user?.email) {
      setAuthEmail(user.email);
      return;
    }

    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getUser().then(({ data, error }) => {
        if (!error && data?.user?.email) {
          setAuthEmail(data.user.email);
        }
      }).catch((err) => {
        console.warn('Could not fetch supabase user session email:', err);
      });
    }
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      setProfileNameInput(user.full_name || '');
      setProfilePhoneInput(user.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
    }
  }, [user]);

  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    recipient_name: user?.full_name || '',
    recipient_phone: user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '',
    street_address: '',
    landmark: '',
    city: 'Barabanki',
    state: 'Uttar Pradesh',
    pincode: '225001',
    is_default: addresses.length === 0,
  });

  useEffect(() => {
    if (user && !editingAddressId) {
      setAddressForm((prev) => ({
        ...prev,
        recipient_name: prev.recipient_name || user.full_name || '',
        recipient_phone: prev.recipient_phone || (user.phone ? user.phone.replace(/\D/g, '').slice(-10) : ''),
      }));
    }
  }, [user, editingAddressId]);

  const [formError, setFormError] = useState('');
  const [testPincode, setTestPincode] = useState('');
  const [pincodeCheckResult, setPincodeCheckResult] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrdersLoading(false);
      return;
    }

    async function loadOrders() {
      try {
        setOrdersLoading(true);
        const res = await fetch('/api/orders', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setRecentOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Failed to load orders in ProfilePage:', err);
      } finally {
        setOrdersLoading(false);
      }
    }

    loadOrders();
  }, [isAuthenticated, getAuthHeaders]);

  // Load communication preferences on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/auth/preferences', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.promotional_opt_in === 'boolean') {
            setPromotionalOptIn(data.promotional_opt_in);
          }
        }
      } catch (e) {
        console.warn('Failed to load preferences:', e);
      }
    }
    fetchPreferences();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, getAuthHeaders]);

  const handleTogglePromotional = async (newValue: boolean) => {
    setIsUpdatingPreferences(true);
    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ promotional_opt_in: newValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromotionalOptIn(newValue);
      } else {
        console.warn('Failed to update preference:', data.message);
      }
    } catch (err) {
      console.warn('Network error updating preference:', err);
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleExportData = async () => {
    setIsExportingData(true);
    try {
      const res = await fetch('/api/auth/export-my-data', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saraswati-sweets-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to generate data export.');
      }
    } catch (err) {
      alert('Network error while exporting data.');
    } finally {
      setIsExportingData(false);
    }
  };

  const handleSubmitPrivacyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyDetails.trim()) {
      setPrivacyError('Please describe your specific request or grievance.');
      return;
    }
    setIsSubmittingPrivacy(true);
    setPrivacyError('');
    try {
      const res = await fetch('/api/auth/privacy-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          request_type: privacyRequestType,
          details: privacyDetails.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPrivacySuccessTicket(data.ticketNumber);
        setPrivacyDetails('');
      } else {
        setPrivacyError(data.message || 'Failed to submit privacy request.');
      }
    } catch (err: any) {
      setPrivacyError(err.message || 'Network error while submitting request.');
    } finally {
      setIsSubmittingPrivacy(false);
    }
  };

  // If not authenticated, prompt login
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center mx-auto shadow-xs">
          <Phone className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-2xl text-[#1F1B16]">
          Sign In to Your Account
        </h1>
        <p className="text-sm text-[#6B6258] leading-relaxed">
          Sign in with your email to manage your saved Barabanki delivery addresses and account cart.
        </p>
        <button
          type="button"
          onClick={openAuthModal}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold text-sm transition-colors shadow-xs"
        >
          Sign In with Email
        </button>
      </div>
    );
  }

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: 'Home',
      recipient_name: user?.full_name || '',
      recipient_phone: user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '',
      street_address: '',
      landmark: '',
      city: 'Barabanki',
      state: 'Uttar Pradesh',
      pincode: '225001',
      is_default: addresses.length === 0,
    });
    setFormError('');
    setIsAddressModalOpen(true);
  };

  const handleOpenEditModal = (addr: UserAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label,
      recipient_name: addr.recipient_name,
      recipient_phone: addr.recipient_phone,
      street_address: addr.street_address,
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    });
    setFormError('');
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!addressForm.recipient_name || !addressForm.recipient_phone || !addressForm.street_address || !addressForm.pincode) {
      setFormError('Please fill in all mandatory fields');
      return;
    }

    if (!checkPincodeServiceable(addressForm.pincode)) {
      setFormError(`Pincode ${addressForm.pincode} is not serviceable. Available in Barabanki: ${SERVICEABLE_PINCODES.join(', ')}`);
      return;
    }

    if (editingAddressId) {
      const res = await updateAddress(editingAddressId, addressForm);
      if (res.success) setIsAddressModalOpen(false);
      else setFormError(res.message || 'Failed to update address');
    } else {
      const res = await addAddress(addressForm);
      if (res.success) setIsAddressModalOpen(false);
      else setFormError(res.message || 'Failed to add address');
    }
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPincode) return;
    const isServiceable = checkPincodeServiceable(testPincode);
    setPincodeCheckResult(isServiceable);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Profile Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#701029] to-[#8A1538] text-[#F6E08B] flex items-center justify-center font-serif font-bold text-2xl shadow-xs border border-[#C9A227]/30 shrink-0">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'स'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16]">
                  {user?.full_name || 'Valued Customer'}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F7E9EE] text-[#8A1538]">
                  {user?.role || 'Customer'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B6258] mt-1">
                Saraswati Sweets Member &middot; Barabanki
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setProfileNameInput(user?.full_name || '');
                setProfilePhoneInput(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
                setProfileSaveError('');
                setIsEditProfileOpen(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E8DFD2] hover:bg-[#FAF4DE] text-xs font-semibold text-[#8A1538] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>

            {onNavigate && (
              <a
                href="/orders"
                onClick={(e) => {
                  if (shouldHandleSpaClick(e)) {
                    e.preventDefault();
                    onNavigate('/orders');
                  }
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Package className="w-4 h-4" />
                <span>My Orders & Live Tracking</span>
              </a>
            )}

            <button
              type="button"
              onClick={signOut}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E8DFD2] hover:bg-[#FAF4DE] text-xs font-semibold text-[#8A1538] flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* 3-Column Account Details: Full Name, Email Address, Mobile Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-5 border-t border-[#E8DFD2]">
          {/* Full Name */}
          <div className="p-3.5 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8DFD2] flex items-center justify-center text-[#8A1538] shrink-0 mt-0.5 shadow-2xs">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8A1538]">
                Full Name
              </div>
              <div className="text-sm font-bold text-[#1F1B16] truncate mt-0.5">
                {user?.full_name || 'Not provided'}
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div className="p-3.5 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8DFD2] flex items-center justify-center text-[#8A1538] shrink-0 mt-0.5 shadow-2xs">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8A1538]">
                  Email Address
                </span>
                {(authEmail || user?.email) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-[#1F1B16] truncate mt-0.5" title={authEmail || user?.email || undefined}>
                {authEmail || user?.email || (
                  <span className="text-[#8C827A] font-normal italic">No email linked</span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Number */}
          <div className="p-3.5 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8DFD2] flex items-center justify-center text-[#8A1538] shrink-0 mt-0.5 shadow-2xs">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8A1538]">
                Mobile Number
              </div>
              <div className="text-sm font-bold text-[#1F1B16] truncate mt-0.5">
                {user?.phone ? (
                  <span>+91 {user.phone.replace(/\D/g, '').slice(-10)}</span>
                ) : (
                  <span className="text-[#8C827A] font-normal italic">Not provided</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. My Orders & Live Tracking Preview Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16] flex items-center gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#7A1129]" />
              <span>My Orders & Tracking</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6258]">
              Track live delivery progress and view previous mithai orders.
            </p>
          </div>

          {recentOrders.length > 0 && onNavigate && (
            <a
              href="/orders"
              onClick={(e) => {
                if (shouldHandleSpaClick(e)) {
                  e.preventDefault();
                  onNavigate('/orders');
                }
              }}
              className="min-h-[40px] px-4 py-2 rounded-full border border-[#7A1129] text-xs font-semibold text-[#7A1129] hover:bg-[#7A1129] hover:text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View All Orders ({recentOrders.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {ordersLoading ? (
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-8 text-center text-xs text-[#6B6258] animate-pulse">
            Loading your orders...
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-8 text-center space-y-3">
            <Package className="w-8 h-8 text-[#7A1129] mx-auto opacity-70" />
            <h3 className="font-display font-bold text-base text-[#1F1B16]">
              No Orders Placed Yet
            </h3>
            <p className="text-xs text-[#6B6258] max-w-sm mx-auto">
              You haven't placed any mithai orders yet. Explore our handcrafted sweets made fresh daily with pure desi ghee.
            </p>
            {onNavigate && (
              <a
                href="/catalog"
                onClick={(e) => {
                  if (shouldHandleSpaClick(e)) {
                    e.preventDefault();
                    onNavigate('/catalog');
                  }
                }}
                className="min-h-[40px] px-5 py-2 rounded-full bg-[#7A1129] text-white text-xs font-semibold hover:bg-[#5E0D20] transition-colors"
              >
                Explore Sweets & Namkeen
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                onClick={() => onNavigate && onNavigate(`/orders/${order.order_number}`)}
                className="bg-white rounded-2xl border border-[#E8DFD2] hover:border-[#7A1129]/40 p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <a
                      href={`/orders/${order.order_number}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (shouldHandleSpaClick(e)) {
                          e.preventDefault();
                          onNavigate?.(`/orders/${order.order_number}`);
                        }
                      }}
                      className="font-bold text-sm text-[#1F1B16] hover:underline"
                    >
                      #{order.order_number}
                    </a>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[#6E6259]">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-[#6E6259] line-clamp-1">
                    {order.items?.map((it: any) => `${it.product_name} (${it.quantity})`).join(', ') ||
                      'Saraswati Sweets Order'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8DFD2]/60">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-[#6E6259] block">Total Amount</span>
                    <span className="text-sm font-bold text-[#7A1129]">
                      ₹{order.total_amount?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>

                  {onNavigate && (
                    <a
                      href={`/orders/${order.order_number}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (shouldHandleSpaClick(e)) {
                          e.preventDefault();
                          onNavigate(`/orders/${order.order_number}`);
                        }
                      }}
                      className="px-4 py-2 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Track Order</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Saved Addresses Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16]">
              Saved Delivery Addresses
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6258]">
              Manage delivery locations in Barabanki with automatic pincode verification.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8DFD2] p-8 text-center space-y-3">
            <MapPin className="w-8 h-8 text-[#8A1538] mx-auto opacity-70" />
            <h3 className="font-display font-bold text-base text-[#1F1B16]">
              No Saved Addresses Yet
            </h3>
            <p className="text-xs text-[#6B6258] max-w-sm mx-auto">
              Add your home or office address in Barabanki to enable 1-tap checkout.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="text-xs font-semibold text-[#8A1538] hover:underline"
            >
              + Add your first address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs relative flex flex-col justify-between transition-all ${
                  addr.is_default
                    ? 'border-[#8A1538] bg-[#FBF7F1]'
                    : 'border-[#E8DFD2]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8A1538] flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" />
                      <span>{addr.label}</span>
                    </span>

                    {addr.is_default ? (
                      <span className="text-[11px] font-bold text-[#2E7D4F] bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDefaultAddress(addr.id)}
                        className="text-[11px] font-semibold text-[#6B6258] hover:text-[#8A1538] hover:underline"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  <div className="font-bold text-sm text-[#1F1B16]">{addr.recipient_name}</div>
                  <div className="text-xs text-[#6B6258] mt-0.5 font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {addr.recipient_phone}
                  </div>

                  <p className="text-xs text-[#1F1B16] mt-2 leading-relaxed">
                    {addr.street_address}
                    {addr.landmark ? `, Near ${addr.landmark}` : ''}
                    <br />
                    {addr.city}, {addr.state} - <strong className="text-[#8A1538]">{addr.pincode}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8DFD2] flex items-center justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(addr)}
                    className="font-medium text-[#1F1B16] hover:text-[#8A1538] flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteAddress(addr.id)}
                    className="font-medium text-[#B3261E] hover:text-[#701029] flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Pincode Serviceability Checker Widget */}
      <div className="bg-[#F3EBE0] rounded-2xl border border-[#E8DFD2] p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#8A1538]" />
          <h3 className="font-display font-bold text-lg text-[#1F1B16]">
            Check Delivery Availability in Barabanki
          </h3>
        </div>

        <p className="text-xs text-[#6B6258]">
          Enter your 6-digit postal code to check whether our fresh sweets delivery van services your area.
        </p>

        <form onSubmit={handleCheckPincode} className="flex flex-col sm:flex-row gap-3 max-w-md pt-1">
          <input
            type="text"
            maxLength={6}
            value={testPincode}
            onChange={(e) => {
              setTestPincode(e.target.value.replace(/\D/g, ''));
              setPincodeCheckResult(null);
            }}
            placeholder="e.g. 225001"
            className="px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-white text-sm focus:outline-none focus:border-[#8A1538]"
          />
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#8A1538] text-white text-xs font-semibold hover:bg-[#701029] transition-colors"
          >
            Check Pincode
          </button>
        </form>

        {pincodeCheckResult !== null && (
          <div className="pt-1 text-xs">
            {pincodeCheckResult ? (
              <span className="text-[#2E7D4F] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Fresh sweet deliveries are active for pincode {testPincode}!
              </span>
            ) : (
              <span className="text-[#B3261E] font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Pincode {testPincode} is not currently serviceable. Active pincodes: {SERVICEABLE_PINCODES.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Communication Preferences & Privacy Rights (DPDP Act, 2023 & Consumer Protection Rules) */}
      <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-7 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFD2]/70 pb-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#7A1129]" />
              <span>Communication Preferences &amp; Privacy Rights</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6258]">
              Manage promotional messages and exercise statutory rights under the Digital Personal Data Protection Act, 2023.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF4DE] text-[#7A1129] border border-[#C79A3D]/40 self-start sm:self-auto">
            DPDP Compliant
          </span>
        </div>

        {/* Section A: Communication Preferences */}
        <div className="p-4 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#7A1129]" />
              <span className="font-bold text-sm text-[#1F1B16]">
                Festive Batch Announcements &amp; Offers
              </span>
            </div>
            <p className="text-xs text-[#6B6258] max-w-xl">
              Receive updates on seasonal fresh batches (e.g. Holi Gujiya, Diwali Kaju Katli) and exclusive coupon discounts via WhatsApp and Email. Essential transactional receipts and delivery alerts are always delivered.
            </p>
          </div>

          <button
            type="button"
            disabled={isUpdatingPreferences}
            onClick={() => handleTogglePromotional(!promotionalOptIn)}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              promotionalOptIn
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${promotionalOptIn ? 'bg-emerald-300' : 'bg-stone-400'}`} />
            <span>
              {isUpdatingPreferences
                ? 'Updating...'
                : promotionalOptIn
                ? 'Subscribed (Opted In)'
                : 'Disabled (Opted Out)'}
            </span>
          </button>
        </div>

        {/* Section B: Data Principal Rights Desk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Right to Access / Export */}
          <div className="p-4 rounded-xl border border-[#E8DFD2] bg-white space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-[#1F1B16]">
                <Download className="w-4 h-4 text-[#7A1129]" />
                <span>Right to Access &amp; Portability</span>
              </div>
              <p className="text-xs text-[#6B6258] leading-relaxed">
                Download a machine-readable JSON copy of your personal data, saved addresses, order history, and recorded consent logs.
              </p>
            </div>
            <button
              type="button"
              disabled={isExportingData}
              onClick={handleExportData}
              className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#FAF4DE] hover:bg-[#F5EAD9] border border-[#C79A3D]/50 text-[#7A1129] font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingData ? 'Generating Export...' : 'Download My Personal Data'}</span>
            </button>
          </div>

          {/* Card 2: Right to Correction & Erasure / Grievance */}
          <div className="p-4 rounded-xl border border-[#E8DFD2] bg-white space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-[#1F1B16]">
                <FileText className="w-4 h-4 text-[#7A1129]" />
                <span>Correction, Erasure &amp; Grievance</span>
              </div>
              <p className="text-xs text-[#6B6258] leading-relaxed">
                Submit a formal statutory request to update personal details, request profile erasure, or submit a complaint to our Grievance Officer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPrivacySuccessTicket(null);
                setPrivacyError('');
                setIsPrivacyModalOpen(true);
              }}
              className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Submit Privacy / Grievance Request</span>
            </button>
          </div>
        </div>

        {/* Section C: Statutory Redressal Timelines Notice */}
        <div className="p-3.5 rounded-xl bg-[#FDFBF7] border border-[#E8DFD2]/70 text-[11px] text-[#6E6259] leading-relaxed">
          <strong className="text-[#1F1B16]">Statutory Grievance Redressal (CPA 2019 &amp; DPDP Act):</strong> Grievance Officer: <strong className="text-[#1F1B16]">Mr. Ram Prakash Srivastava</strong> | Email: <a href="mailto:saraswatisweetsbarabanki@gmail.com" className="text-[#7A1129] underline font-medium">saraswatisweetsbarabanki@gmail.com</a> | Helpline: <a href="tel:+919161110030" className="text-[#7A1129] underline font-medium">+91 91611 10030</a>. All inquiries acknowledged within 48 hours and redressed within 30 days.
        </div>
      </div>

      {/* 4. Address Modal (Add / Edit) */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            onClick={() => setIsAddressModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E8DFD2] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="absolute top-4 right-4 text-[#6B6258] hover:text-[#1F1B16] p-1.5"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="font-display font-bold text-xl text-[#1F1B16]">
                {editingAddressId ? 'Edit Address' : 'Add New Delivery Address'}
              </h2>

              {formError && (
                <div className="p-3 rounded-xl bg-[#FAF4DE] border border-[#B3261E]/40 text-xs text-[#8A1538] font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Label (e.g. Home, Work)
                    </label>
                    <select
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-white text-sm"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.recipient_name}
                      onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                      placeholder="e.g. Ramesh Srivastava"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={addressForm.recipient_phone}
                      onChange={(e) => setAddressForm({ ...addressForm, recipient_phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                      Barabanki Pincode *
                    </label>
                    <select
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-white text-sm font-medium"
                    >
                      <option value="225001">225001 - City / Ghantaghar</option>
                      <option value="225002">225002 - Civil Lines / Railway Stn</option>
                      <option value="225003">225003 - Deva Road</option>
                      <option value="225122">225122 - Satrikh Road</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                    Street Address & House / Flat No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.street_address}
                    onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
                    placeholder="e.g. House No. 42, Civil Lines Road"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    placeholder="e.g. Opposite City Hospital"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-[#8A1538] focus:ring-[#8A1538]"
                  />
                  <label htmlFor="is_default" className="text-xs font-medium text-[#1F1B16]">
                    Set as my default delivery address
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-sm font-semibold transition-colors mt-2"
                >
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Edit Profile Details Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            onClick={() => setIsEditProfileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E8DFD2] z-10 animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#6B6258] hover:text-[#1F1B16] rounded-full hover:bg-[#F5EAD9]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#E8DFD2]">
                <div className="w-10 h-10 rounded-xl bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#1F1B16]">
                    Edit Profile Details
                  </h3>
                  <p className="text-xs text-[#6B6258]">
                    Update your full name and registered Barabanki mobile number
                  </p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setProfileSaveError('');
                  const cleanName = profileNameInput.trim();
                  if (!cleanName) {
                    setProfileSaveError('Please enter your full name.');
                    return;
                  }
                  const cleanDigits = profilePhoneInput.replace(/\D/g, '').slice(-10);
                  if (cleanDigits.length !== 10) {
                    setProfileSaveError('Please enter a valid 10-digit mobile number.');
                    return;
                  }

                  setIsSavingProfile(true);
                  const res = await updateUserProfile({
                    full_name: cleanName,
                    phone: cleanDigits,
                  });
                  setIsSavingProfile(false);

                  if (res.success) {
                    setIsEditProfileOpen(false);
                  } else {
                    setProfileSaveError(res.message || 'Failed to update profile. Please try again.');
                  }
                }}
                className="space-y-4"
              >
                {profileSaveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{profileSaveError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="e.g. Ramesh Chandra Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16]">
                      Email Address
                    </label>
                    <span className="text-[10px] font-semibold text-[#8A1538] bg-[#F7E9EE] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Login
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A1538]">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={authEmail || user?.email || 'No email associated with account'}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#F5EAD9]/40 text-[#6B6258] text-sm cursor-not-allowed select-all"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B6258] mt-1 block">
                    Your authenticated login email. Managed securely via Supabase Authentication.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A1538]">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={profilePhoneInput}
                      onChange={(e) => setProfilePhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9161110030"
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538]"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B6258] mt-1 block">
                    Used for order delivery updates and tracking in Barabanki.
                  </span>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="flex-1 min-h-[44px] rounded-xl border border-[#E8DFD2] hover:bg-[#FAF4DE] text-xs font-bold text-[#6B6258] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Privacy Request Modal (DPDP Act Statutory Desk) */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            onClick={() => setIsPrivacyModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E8DFD2] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="absolute top-4 right-4 text-[#6B6258] hover:text-[#1F1B16] p-1.5"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h2 className="font-display font-bold text-xl text-[#1F1B16] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#7A1129]" />
                  <span>Privacy Request &amp; Grievance Desk</span>
                </h2>
                <p className="text-xs text-[#6B6258]">
                  Submit your request under Section 11-13 of the DPDP Act, 2023. Our designated Grievance Officer will review your submission.
                </p>
              </div>

              {privacySuccessTicket ? (
                <div className="p-5 rounded-2xl bg-[#FAF4DE] border border-[#C79A3D]/60 space-y-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
                  <h3 className="font-bold text-base text-[#1F1B16]">
                    Privacy Request Logged
                  </h3>
                  <p className="text-xs text-[#6B6258]">
                    Your request has been officially recorded with Ticket ID:
                  </p>
                  <div className="font-mono font-bold text-lg text-[#7A1129] py-1 bg-white rounded-lg border border-[#E8DFD2]">
                    {privacySuccessTicket}
                  </div>
                  <p className="text-[11px] text-[#6B6258] leading-relaxed">
                    Our Grievance Officer will formally acknowledge this ticket within 48 hours to <strong>{user?.email || 'your account email'}</strong> and provide final resolution within 30 days.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors mt-2"
                  >
                    Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitPrivacyRequest} className="space-y-4">
                  {privacyError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {privacyError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
                      Statutory Request Category *
                    </label>
                    <select
                      value={privacyRequestType}
                      onChange={(e) => setPrivacyRequestType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-white text-sm font-medium focus:outline-none focus:border-[#7A1129]"
                    >
                      <option value="DATA_CORRECTION">Data Correction / Update of inaccurate records</option>
                      <option value="DATA_ERASURE">Data Erasure / Account Deletion Request</option>
                      <option value="CONSENT_WITHDRAWAL">Revocation / Withdrawal of Processing Consent</option>
                      <option value="DATA_ACCESS">Data Portability &amp; Personal Data Summary</option>
                      <option value="GRIEVANCE">Consumer Protection / Privacy Grievance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
                      Request Details &amp; Specifics *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={privacyDetails}
                      onChange={(e) => setPrivacyDetails(e.target.value)}
                      placeholder="Please specify what data needs correction, why erasure is requested, or describe your grievance in detail..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs focus:outline-none focus:border-[#7A1129]"
                    />
                    <span className="text-[11px] text-[#6B6258] mt-1 block">
                      Note: Per Indian tax and GST laws, transaction records for fulfilled orders cannot be deleted and will be archived per statutory financial retention requirements.
                    </span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPrivacyModalOpen(false)}
                      className="flex-1 min-h-[44px] rounded-xl border border-[#E8DFD2] hover:bg-[#FAF4DE] text-xs font-bold text-[#6B6258] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPrivacy}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSubmittingPrivacy ? 'Logging Request...' : 'Submit Official Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
