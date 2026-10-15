import React, { useState } from 'react';
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Package,
  Sparkles,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface HamperItem {
  id?: string;
  product_id: string;
  product_name: string;
  variant_label: string;
  quantity: number;
}

interface GiftHamper {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  box_type: string;
  price: number;
  mrp: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  items_included: HamperItem[];
}

interface AdminHampersTabProps {
  hampers: GiftHamper[];
  products: any[];
  isAdmin: boolean;
  getAuthHeaders: () => Record<string, string>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminHampersTab: React.FC<AdminHampersTabProps> = ({
  hampers,
  products,
  isAdmin,
  getAuthHeaders,
  onRefresh,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHamper, setEditingHamper] = useState<GiftHamper | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [boxType, setBoxType] = useState('Royal Velvet Trunk');
  const [price, setPrice] = useState(1500);
  const [mrp, setMrp] = useState(1750);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [compositionItems, setCompositionItems] = useState<HamperItem[]>([]);

  // Open modal for creating new hamper
  const handleOpenCreate = () => {
    setEditingHamper(null);
    setName('');
    setBoxType('Royal Velvet Trunk');
    setPrice(1250);
    setMrp(1400);
    setImageUrl('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80');
    setDescription('Handcrafted luxury presentation box filled with fresh Awadhi sweets.');
    setDisplayOrder(hampers.length + 1);
    setIsActive(true);
    setIsFeatured(true);
    setCompositionItems([
      {
        product_id: products[0]?.id || 'prod-kaju-katli',
        product_name: products[0]?.name || 'Signature Silver Leaf Kaju Katli',
        variant_label: '500g',
        quantity: 1,
      },
      {
        product_id: products[1]?.id || 'prod-motichoor-ladoo',
        product_name: products[1]?.name || 'Pure Shuddh Ghee Motichoor Ladoo',
        variant_label: '250g',
        quantity: 1,
      },
    ]);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (hamper: GiftHamper) => {
    setEditingHamper(hamper);
    setName(hamper.name);
    setBoxType(hamper.box_type);
    setPrice(hamper.price);
    setMrp(hamper.mrp);
    setImageUrl(hamper.image_url);
    setDescription(hamper.description);
    setDisplayOrder(hamper.display_order);
    setIsActive(hamper.is_active);
    setIsFeatured(hamper.is_featured);
    setCompositionItems(
      hamper.items_included && hamper.items_included.length > 0
        ? hamper.items_included
        : []
    );
    setIsModalOpen(true);
  };

  // Composition Builder: Add Item
  const handleAddCompositionItem = () => {
    const defaultProd = products[0] || { id: 'prod-kaju-katli', name: 'Signature Silver Leaf Kaju Katli' };
    setCompositionItems([
      ...compositionItems,
      {
        product_id: defaultProd.id,
        product_name: defaultProd.name,
        variant_label: '250g',
        quantity: 1,
      },
    ]);
  };

  // Composition Builder: Remove Item
  const handleRemoveCompositionItem = (index: number) => {
    setCompositionItems(compositionItems.filter((_, idx) => idx !== index));
  };

  // Composition Builder: Update Item
  const handleUpdateCompositionItem = (index: number, field: keyof HamperItem, value: any) => {
    const updated = [...compositionItems];
    if (field === 'product_id') {
      const prod = products.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        product_id: value,
        product_name: prod ? prod.name : 'Artisanal Sweet',
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setCompositionItems(updated);
  };

  // Save Hamper
  const handleSaveHamper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Admin privilege required.', 'error');
      return;
    }

    if (!name.trim() || !imageUrl.trim() || price <= 0) {
      showToast('Please fill all required fields.', 'warning');
      return;
    }

    try {
      const isEdit = Boolean(editingHamper);
      const url = isEdit ? `/api/admin/hampers/${editingHamper!.id}` : '/api/admin/hampers';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        box_type: boxType.trim(),
        price: Number(price),
        mrp: Number(mrp) || Number(price),
        image_url: imageUrl.trim(),
        description: description.trim(),
        display_order: Number(displayOrder) || 1,
        is_active: Boolean(isActive),
        is_featured: Boolean(isFeatured),
        items_included: compositionItems,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Hamper updated successfully!' : 'Hamper created successfully!', 'success');
        setIsModalOpen(false);
        onRefresh();
      } else {
        showToast(data.message || 'Failed to save gift hamper', 'error');
      }
    } catch {
      showToast('Network error saving hamper', 'error');
    }
  };

  // Delete Hamper
  const handleDeleteHamper = async (hamper: GiftHamper) => {
    if (!isAdmin) {
      showToast('Admin privilege required.', 'error');
      return;
    }

    if (!window.confirm(`Permanently delete gift hamper '${hamper.name}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/hampers/${hamper.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast(`Hamper '${hamper.name}' deleted.`, 'info');
        onRefresh();
      } else {
        showToast('Failed to delete hamper.', 'error');
      }
    } catch {
      showToast('Error deleting hamper.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[14px] border border-[#E9E2D8] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1129] uppercase tracking-wider mb-1">
            <Gift className="w-4 h-4 text-[#E8C16A]" />
            <span>Curated Packaging & Line Items</span>
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-[#241C17]">
            Gift Hampers Composition Builder
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5F55] mt-0.5 max-w-2xl">
            Design luxury festive gift trunks and bespoke wedding boxes. Specify "What's inside" with exact sweet variants and quantities. Customer orders record hampers as dedicated cart line items (<code className="text-[#7A1129] font-mono">item_type=HAMPER</code>).
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="shrink-0 min-h-[44px] px-4 py-2 rounded-[10px] bg-[#7A1129] hover:bg-[#5E0D20] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#F6E08B]" />
            <span>+ Create Gift Hamper</span>
          </button>
        )}
      </div>

      {/* Hampers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hampers.map((hamper) => (
          <div
            key={hamper.id}
            className="bg-white rounded-[14px] border border-[#E9E2D8] overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F4EF]">
              <img
                src={hamper.image_url}
                alt={hamper.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="bg-[#7A1129] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                  {hamper.box_type}
                </span>
                {hamper.is_featured && (
                  <span className="bg-[#E8C16A] text-[#241C17] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    Featured
                  </span>
                )}
              </div>
              <span
                className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                  hamper.is_active ? 'bg-[#E3F4EA] text-[#17663E]' : 'bg-[#FDE8E8] text-[#A8261E]'
                }`}
              >
                {hamper.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-[#241C17]">
                  {hamper.name}
                </h3>
                <p className="text-xs text-[#6B5F55] mt-1 line-clamp-2">
                  {hamper.description}
                </p>

                {/* What's Inside Composition */}
                <div className="mt-3 pt-3 border-t border-[#E9E2D8]">
                  <div className="text-[11px] font-bold text-[#7A1129] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#E8C16A]" />
                    <span>What's Inside ({hamper.items_included?.length || 0} items):</span>
                  </div>
                  {hamper.items_included && hamper.items_included.length > 0 ? (
                    <ul className="space-y-1 text-xs text-[#241C17]">
                      {hamper.items_included.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#17663E] shrink-0 mt-0.5" />
                          <span>
                            <strong>{item.product_name}</strong> ({item.variant_label}) × {item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-[#6B5F55] italic">No sweets composed yet</span>
                  )}
                </div>
              </div>

              {/* Bottom Price & Controls */}
              <div className="pt-3 border-t border-[#E9E2D8] flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-lg text-[#7A1129] tabular-nums">
                    {formatINR(hamper.price)}
                  </span>
                  {hamper.mrp > hamper.price && (
                    <span className="text-xs text-[#6B5F55] line-through ml-1.5 tabular-nums">
                      {formatINR(hamper.mrp)}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(hamper)}
                      className="p-2 rounded-[10px] border border-[#E9E2D8] text-[#241C17] hover:bg-[#F7F4EF] transition-colors cursor-pointer"
                      title="Edit Hamper & Composition"
                    >
                      <Edit2 className="w-4 h-4 text-[#7A1129]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHamper(hamper)}
                      className="p-2 rounded-[10px] border border-[#E9E2D8] text-[#A8261E] hover:bg-[#FDE8E8] transition-colors cursor-pointer"
                      title="Delete Hamper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composition Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-[14px] bg-white p-6 shadow-xl border border-[#E9E2D8] space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E9E2D8] pb-3">
              <h3 className="font-extrabold text-lg text-[#241C17] flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#7A1129]" />
                <span>{editingHamper ? 'Edit Gift Hamper' : 'Build New Gift Hamper'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-[10px] text-[#6B5F55] hover:text-[#241C17] hover:bg-[#E9E2D8]/40 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHamper} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#241C17] mb-1">Hamper Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shahi Nawabi Gifting Trunk"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241C17] mb-1">Box / Packaging Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Velvet Trunk, Gold Embossed Box"
                    value={boxType}
                    onChange={(e) => setBoxType(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241C17] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241C17] mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241C17] mb-1">Primary Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241C17] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Artisanal Awadhi festive assortment..."
                  className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129] resize-none"
                />
              </div>

              {/* COMPOSITION BUILDER SECTION */}
              <div className="p-4 rounded-[12px] bg-[#F7F4EF] border border-[#E9E2D8] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#241C17] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#7A1129]" />
                      <span>"What's Inside" Sweet Composition</span>
                    </h4>
                    <p className="text-[11px] text-[#6B5F55]">
                      Select the specific sweets, pack weights, and quantities packed inside this hamper.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCompositionItem}
                    className="min-h-[36px] px-3 py-1.5 rounded-[8px] bg-[#7A1129] text-white text-[11px] font-bold hover:bg-[#5E0D20] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F6E08B]" />
                    <span>+ Add Sweet</span>
                  </button>
                </div>

                {compositionItems.length === 0 ? (
                  <p className="text-xs text-[#6B5F55] italic py-2 text-center">
                    No sweets added to this hamper. Click "+ Add Sweet" above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {compositionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded-[10px] bg-white border border-[#E9E2D8]"
                      >
                        {/* Product Selector */}
                        <div className="flex-1 w-full sm:w-auto">
                          <label className="block text-[10px] text-[#6B5F55] font-semibold mb-0.5">
                            Sweet Product
                          </label>
                          <select
                            value={item.product_id}
                            onChange={(e) =>
                              handleUpdateCompositionItem(idx, 'product_id', e.target.value)
                            }
                            className="w-full p-1.5 rounded-[8px] border border-[#E9E2D8] text-xs bg-white text-[#241C17]"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Variant / Pack Size */}
                        <div className="w-full sm:w-28">
                          <label className="block text-[10px] text-[#6B5F55] font-semibold mb-0.5">
                            Pack / Weight
                          </label>
                          <input
                            type="text"
                            value={item.variant_label}
                            placeholder="e.g. 500g"
                            onChange={(e) =>
                              handleUpdateCompositionItem(idx, 'variant_label', e.target.value)
                            }
                            className="w-full p-1.5 rounded-[8px] border border-[#E9E2D8] text-xs bg-[#F7F4EF] text-[#241C17]"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="w-full sm:w-20">
                          <label className="block text-[10px] text-[#6B5F55] font-semibold mb-0.5">
                            Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateCompositionItem(idx, 'quantity', Number(e.target.value))
                            }
                            className="w-full p-1.5 rounded-[8px] border border-[#E9E2D8] text-xs bg-[#F7F4EF] text-[#241C17]"
                          />
                        </div>

                        {/* Remove */}
                        <div className="self-end sm:self-auto sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveCompositionItem(idx)}
                            className="p-1.5 text-[#6B5F55] hover:text-[#A8261E] rounded cursor-pointer"
                            title="Remove from Hamper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active & Featured Toggles */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#7A1129] rounded border-stone-300"
                  />
                  <span className="font-semibold text-[#241C17]">Active on Storefront</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-[#7A1129] rounded border-stone-300"
                  />
                  <span className="font-semibold text-[#241C17]">Feature on Homepage</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9E2D8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] text-[#6B5F55] hover:bg-[#E9E2D8]/40 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-[10px] bg-[#7A1129] text-white font-bold hover:bg-[#5E0D20] shadow-xs cursor-pointer"
                >
                  {editingHamper ? 'Save Changes' : 'Create Hamper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
