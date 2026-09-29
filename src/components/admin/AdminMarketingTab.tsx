import React, { useState } from 'react';
import {
  Tag,
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  coupon_code?: string;
  discount_text: string;
  badge?: string;
  bg_color?: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  badge?: string;
  display_order: number;
  is_active: boolean;
}

interface AdminMarketingTabProps {
  offers: Offer[];
  banners: Banner[];
  coupons: any[];
  isAdmin: boolean;
  getAuthHeaders: () => Record<string, string>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminMarketingTab: React.FC<AdminMarketingTabProps> = ({
  offers,
  banners,
  coupons,
  isAdmin,
  getAuthHeaders,
  onRefresh,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'offers' | 'banners'>('offers');

  // Offer Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState({
    title: '',
    tagline: '',
    description: '',
    coupon_code: '',
    discount_text: '',
    badge: 'Limited Period',
    bg_color: '#8A1538',
    is_active: true,
    display_order: 1,
  });

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    cta_text: 'Shop Sweets',
    cta_link: '/catalog',
    badge: 'Heritage Since 1978',
    is_active: true,
    display_order: 1,
  });

  // =================== OFFER HANDLERS ===================
  const handleOpenCreateOffer = () => {
    setEditingOffer(null);
    setOfferForm({
      title: '',
      tagline: 'Pure Desi Ghee Celebrations',
      description: 'Instant discount on fresh orders.',
      coupon_code: coupons[0]?.code || 'SWAD100',
      discount_text: 'FLAT ₹100 OFF',
      badge: 'Festive Special',
      bg_color: '#8A1538',
      is_active: true,
      display_order: offers.length + 1,
    });
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      tagline: offer.tagline || '',
      description: offer.description || '',
      coupon_code: offer.coupon_code || '',
      discount_text: offer.discount_text,
      badge: offer.badge || '',
      bg_color: offer.bg_color || '#8A1538',
      is_active: offer.is_active,
      display_order: offer.display_order || 1,
    });
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Admin privilege required.', 'error');
      return;
    }

    try {
      const isEdit = Boolean(editingOffer);
      const url = isEdit ? `/api/admin/offers/${editingOffer!.id}` : '/api/admin/offers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(offerForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Offer updated!' : 'Offer created!', 'success');
        setIsOfferModalOpen(false);
        onRefresh();
      } else {
        showToast(data.message || 'Failed to save offer', 'error');
      }
    } catch {
      showToast('Network error saving offer', 'error');
    }
  };

  const handleDeleteOffer = async (offer: Offer) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete offer '${offer.title}'?`)) return;

    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast(`Offer deleted.`, 'info');
        onRefresh();
      }
    } catch {
      showToast('Failed to delete offer', 'error');
    }
  };

  // =================== BANNER HANDLERS ===================
  const handleOpenCreateBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: 'Awadhi Shahi Diwali & Wedding Gifting',
      subtitle: 'Handcrafted in 100% pure cow desi ghee. Luxury velvet hampers with royal packaging.',
      image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
      cta_text: 'Order Royal Hampers',
      cta_link: '/hampers',
      badge: 'Pure Desi Ghee',
      is_active: true,
      display_order: banners.length + 1,
    });
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      image_url: banner.image_url,
      cta_text: banner.cta_text,
      cta_link: banner.cta_link,
      badge: banner.badge || '',
      is_active: banner.is_active,
      display_order: banner.display_order,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Admin privilege required.', 'error');
      return;
    }

    try {
      const isEdit = Boolean(editingBanner);
      const url = isEdit ? `/api/admin/banners/${editingBanner!.id}` : '/api/admin/banners';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(bannerForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Banner updated!' : 'Banner created!', 'success');
        setIsBannerModalOpen(false);
        onRefresh();
      } else {
        showToast(data.message || 'Failed to save banner', 'error');
      }
    } catch {
      showToast('Network error saving banner', 'error');
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete banner '${banner.title}'?`)) return;

    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('Banner deleted.', 'info');
        onRefresh();
      }
    } catch {
      showToast('Failed to delete banner', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-tab Switcher */}
      <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-[#C9A227]" />
            <span>Storefront Visibility & Promos</span>
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16]">
            Offers & Homepage Banners
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6258] mt-0.5">
            Configure celebratory banners and discount cards shown on the homepage and offers page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab pills */}
          <div className="flex rounded-xl bg-[#F3EBE0] p-1 border border-[#E8DFD2]">
            <button
              type="button"
              onClick={() => setSubTab('offers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                subTab === 'offers' ? 'bg-[#8A1538] text-white shadow-xs' : 'text-[#1F1B16] hover:bg-white/60'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Offers ({offers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('banners')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                subTab === 'banners' ? 'bg-[#8A1538] text-white shadow-xs' : 'text-[#1F1B16] hover:bg-white/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Banners ({banners.length})</span>
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={subTab === 'offers' ? handleOpenCreateOffer : handleOpenCreateBanner}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-[#F6E08B]" />
              <span>{subTab === 'offers' ? '+ New Offer' : '+ New Banner'}</span>
            </button>
          )}
        </div>
      </div>

      {/* OFFERS VIEW */}
      {subTab === 'offers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="p-5 rounded-2xl border border-[#E8DFD2] bg-white shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white shadow-xs"
                    style={{ backgroundColor: offer.bg_color || '#8A1538' }}
                  >
                    {offer.discount_text}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      offer.is_active ? 'bg-emerald-100 text-[#2E7D4F]' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {offer.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <h3 className="font-display font-bold text-base text-[#1F1B16]">
                  {offer.title}
                </h3>
                {offer.tagline && (
                  <p className="text-xs text-[#8A1538] font-semibold">{offer.tagline}</p>
                )}
                <p className="text-xs text-[#6B6258] leading-relaxed">{offer.description}</p>
              </div>

              <div className="pt-3 border-t border-[#E8DFD2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#6B6258]">Code:</span>
                  <span className="font-mono font-bold text-xs bg-[#FBF7F1] border border-[#E8DFD2] px-2 py-0.5 rounded text-[#8A1538]">
                    {offer.coupon_code || 'Auto-applied'}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditOffer(offer)}
                      className="p-1.5 rounded-lg border border-[#E8DFD2] text-[#1F1B16] hover:bg-[#F3EBE0]"
                      title="Edit Offer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#8A1538]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOffer(offer)}
                      className="p-1.5 rounded-lg border border-[#E8DFD2] text-[#B3261E] hover:bg-red-50"
                      title="Delete Offer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BANNERS VIEW */}
      {subTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-[#E8DFD2] overflow-hidden shadow-xs flex flex-col"
            >
              <div className="relative aspect-[21/9] bg-[#F3EBE0] overflow-hidden">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {banner.badge && (
                  <span className="absolute top-2.5 left-2.5 bg-[#8A1538] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
                    {banner.badge}
                  </span>
                )}
                <span
                  className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                    banner.is_active ? 'bg-emerald-600 text-white' : 'bg-stone-500 text-white'
                  }`}
                >
                  {banner.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#1F1B16]">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-xs text-[#6B6258] mt-1 leading-relaxed">
                      {banner.subtitle}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E8DFD2] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#8A1538] font-bold">
                    <span>CTA: {banner.cta_text}</span>
                    <span className="text-stone-400 font-mono text-[11px]">({banner.cta_link})</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBanner(banner)}
                        className="p-1.5 rounded-lg border border-[#E8DFD2] text-[#1F1B16] hover:bg-[#F3EBE0]"
                        title="Edit Banner"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#8A1538]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner)}
                        className="p-1.5 rounded-lg border border-[#E8DFD2] text-[#B3261E] hover:bg-red-50"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT OFFER MODAL */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8DFD2] space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E8DFD2] pb-3">
              <h3 className="font-display font-bold text-lg text-[#1F1B16] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#8A1538]" />
                <span>{editingOffer ? 'Edit Offer' : 'Create New Promotional Offer'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1F1B16] mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival Delight Offer"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F1B16] mb-1">Discount Text Badge *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLAT ₹100 OFF"
                    value={offerForm.discount_text}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_text: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F1B16] mb-1">Linked Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SWAD100"
                    value={offerForm.coupon_code}
                    onChange={(e) => setOfferForm({ ...offerForm, coupon_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F1B16] mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Pure Desi Ghee Celebrations"
                  value={offerForm.tagline}
                  onChange={(e) => setOfferForm({ ...offerForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F1B16] mb-1">Detailed Description</label>
                <textarea
                  rows={2}
                  placeholder="Terms or instructions for availing discount..."
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F1B16] mb-1">Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Limited Period"
                    value={offerForm.badge}
                    onChange={(e) => setOfferForm({ ...offerForm, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F1B16] mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={offerForm.display_order}
                    onChange={(e) => setOfferForm({ ...offerForm, display_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={offerForm.is_active}
                    onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#8A1538] rounded border-stone-300"
                  />
                  <span className="font-semibold text-[#1F1B16]">Active on Storefront</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8DFD2]">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8A1538] text-white font-bold hover:bg-[#701029]"
                >
                  {editingOffer ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT BANNER MODAL */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8DFD2] space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E8DFD2] pb-3">
              <h3 className="font-display font-bold text-lg text-[#1F1B16] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#8A1538]" />
                <span>{editingBanner ? 'Edit Banner' : 'Create Homepage Banner'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBannerModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1F1B16] mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Awadhi Shahi Diwali & Wedding Gifting"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F1B16] mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={bannerForm.image_url}
                  onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F1B16] mb-1">Subtitle / Callout</label>
                <textarea
                  rows={2}
                  placeholder="Subtext explaining authentic pure desi ghee heritage..."
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F1B16] mb-1">Button Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop Sweets"
                    value={bannerForm.cta_text}
                    onChange={(e) => setBannerForm({ ...bannerForm, cta_text: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F1B16] mb-1">Button Link</label>
                  <input
                    type="text"
                    placeholder="e.g. /catalog or /hampers"
                    value={bannerForm.cta_link}
                    onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] focus:outline-none focus:border-[#8A1538]"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerForm.is_active}
                    onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#8A1538] rounded border-stone-300"
                  />
                  <span className="font-semibold text-[#1F1B16]">Active on Homepage</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8DFD2]">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8A1538] text-white font-bold hover:bg-[#701029]"
                >
                  {editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
