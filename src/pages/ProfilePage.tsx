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
} from 'lucide-react';

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
      <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#701029] to-[#8A1538] text-[#F6E08B] flex items-center justify-center font-serif font-bold text-2xl shadow-xs">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'स'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16]">
                {user?.full_name}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F7E9EE] text-[#8A1538]">
                {user?.role}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#6B6258] mt-1">
              {user?.phone ? user.phone : user?.email}
            </p>

            <button
              type="button"
              onClick={() => {
                setProfileNameInput(user?.full_name || '');
                setProfilePhoneInput(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
                setIsEditProfileOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A1538] hover:text-[#5E0D20] hover:underline cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Name & Mobile</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/orders')}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            >
              <Package className="w-4 h-4" />
              <span>My Orders & Live Tracking</span>
            </button>
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

      {/* 2. My Orders & Live Tracking Preview Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16] flex items-center gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#7A1129]" />
              <span>My Orders & Tracking</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6258]">
              Track live kitchen status, delivery progress, and previous mithai orders.
            </p>
          </div>

          {recentOrders.length > 0 && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/orders')}
              className="min-h-[40px] px-4 py-2 rounded-full border border-[#7A1129] text-xs font-semibold text-[#7A1129] hover:bg-[#7A1129] hover:text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View All Orders ({recentOrders.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
              <button
                type="button"
                onClick={() => onNavigate('/catalog')}
                className="min-h-[40px] px-5 py-2 rounded-full bg-[#7A1129] text-white text-xs font-semibold hover:bg-[#5E0D20] transition-colors"
              >
                Explore Sweets & Namkeen
              </button>
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
                    <span className="font-bold text-sm text-[#1F1B16]">
                      #{order.order_number}
                    </span>
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/orders/${order.order_number}`);
                      }}
                      className="px-4 py-2 rounded-full bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Track Order</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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
                  if (!profileNameInput.trim()) return;
                  setIsSavingProfile(true);
                  await updateUserProfile({
                    full_name: profileNameInput.trim(),
                    phone: profilePhoneInput.trim(),
                  });
                  setIsSavingProfile(false);
                  setIsEditProfileOpen(false);
                }}
                className="space-y-4"
              >
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
    </div>
  );
};
