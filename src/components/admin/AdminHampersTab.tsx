import React, { useState, useRef } from 'react';
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
  Upload,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  Loader2,
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
  const [price, setPrice] = useState<number | string>(1250);
  const [mrp, setMrp] = useState<number | string>(1400);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [compositionItems, setCompositionItems] = useState<HamperItem[]>([]);

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Open modal for creating new hamper
  const handleOpenCreate = () => {
    setEditingHamper(null);
    setName('');
    setBoxType('Royal Velvet Trunk');
    setPrice(1250);
    setMrp(1400);
    setImageUrl('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    setShowUrlFallback(false);
    setFieldErrors({});
    setServerError(null);
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
    setBoxType(hamper.box_type || 'Royal Velvet Trunk');
    const effectivePrice =
      typeof hamper.price === 'number' && !isNaN(hamper.price) && hamper.price > 0
        ? hamper.price
        : typeof (hamper as any).hamper_price === 'number' && !isNaN((hamper as any).hamper_price) && (hamper as any).hamper_price > 0
        ? (hamper as any).hamper_price
        : '';
    setPrice(effectivePrice);
    setMrp(hamper.mrp || effectivePrice);
    setImageUrl(hamper.image_url || '');
    setSelectedFile(null);
    setPreviewUrl(hamper.image_url || null);
    setUploadError(null);
    setShowUrlFallback(false);
    setFieldErrors({});
    setServerError(null);
    setDescription(hamper.description || '');
    setDisplayOrder(hamper.display_order || 1);
    setIsActive(hamper.is_active);
    setIsFeatured(hamper.is_featured);
    setCompositionItems(
      hamper.items_included && hamper.items_included.length > 0
        ? hamper.items_included
        : []
    );
    setIsModalOpen(true);
  };

  // Handle local file selection
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setFieldErrors((prev) => ({ ...prev, image: '' }));

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError('Only JPEG, PNG, and WebP image formats are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(`Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 5MB limit.`);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClearImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageUrl('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload image to server/Supabase Storage
  const uploadHamperImage = async (file: File): Promise<string> => {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

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
        folder: 'hampers',
      }),
    });
    const signData = await signRes.json();
    if (!signRes.ok) {
      throw new Error(signData.message || 'Failed to authorize storage upload');
    }

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
        folder: 'hampers',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Image upload failed');
    }
    return data.imageUrl;
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
    if (isSubmitting) return;

    if (!isAdmin) {
      showToast('Admin privilege required.', 'error');
      return;
    }

    // Field-specific validations
    const errors: Record<string, string> = {};
    setServerError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Hamper name is required.';
    }

    const trimmedBoxType = boxType.trim();
    if (!trimmedBoxType) {
      errors.boxType = 'Box / packaging type is required.';
    }

    const numPrice = Number(price);
    if (price === '' || price === undefined || price === null || isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Selling price must be greater than ₹0.';
    }

    const numMrp = mrp === '' || mrp === undefined || mrp === null ? numPrice : Number(mrp);
    if (isNaN(numMrp) || numMrp <= 0) {
      errors.mrp = 'MRP must be a valid positive amount.';
    } else if (numPrice > 0 && numMrp < numPrice) {
      errors.mrp = 'MRP cannot be less than selling price.';
    }

    const hasImage = Boolean(selectedFile || (previewUrl && previewUrl.trim()) || imageUrl.trim());
    if (!hasImage) {
      errors.image = 'Hamper image is required. Please upload an image.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fix the highlighted form errors.', 'warning');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      let finalImageUrl = imageUrl.trim();

      // If a new local file was selected, upload it first
      if (selectedFile) {
        setIsUploading(true);
        try {
          finalImageUrl = await uploadHamperImage(selectedFile);
          setImageUrl(finalImageUrl);
        } catch (uploadErr: any) {
          const msg = uploadErr.message || 'Image upload failed. Please try again.';
          setUploadError(msg);
          showToast(msg, 'error');
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const isEdit = Boolean(editingHamper);
      const url = isEdit ? `/api/admin/hampers/${editingHamper!.id}` : '/api/admin/hampers';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: trimmedName,
        box_type: trimmedBoxType,
        price: numPrice,
        hamper_price: numPrice, // Both price and hamper_price provided for 100% backend compatibility
        mrp: numMrp,
        image_url: finalImageUrl,
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
        const errorMsg = data.message || data.error || 'Failed to save gift hamper';
        setServerError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (netErr: any) {
      const errorMsg = netErr.message || 'Network error saving hamper';
      setServerError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
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
                    {formatINR(hamper.price ?? (hamper as any).hamper_price ?? 0)}
                  </span>
                  {(hamper.mrp || 0) > (hamper.price ?? (hamper as any).hamper_price ?? 0) && (
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

            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3 rounded-[10px] bg-[#FDE8E8] border border-[#A8261E]/30 text-[#A8261E] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Failed to save gift hamper</p>
                  <p className="text-[11px] mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveHamper} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hamper Name */}
                <div>
                  <label className="block font-bold text-[#241C17] mb-1">Hamper Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Shahi Nawabi Gifting Trunk"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-[10px] border text-[#241C17] focus:bg-white focus:outline-hidden ${
                      fieldErrors.name ? 'border-[#A8261E] bg-[#FDE8E8]/30' : 'border-[#E9E2D8] bg-[#F7F4EF]'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[#A8261E] text-[11px] font-medium mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Box / Packaging Type */}
                <div>
                  <label className="block font-bold text-[#241C17] mb-1">Box / Packaging Type *</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Velvet Trunk, Gold Embossed Box"
                    value={boxType}
                    onChange={(e) => {
                      setBoxType(e.target.value);
                      if (fieldErrors.boxType) setFieldErrors((prev) => ({ ...prev, boxType: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-[10px] border text-[#241C17] focus:bg-white focus:outline-hidden ${
                      fieldErrors.boxType ? 'border-[#A8261E] bg-[#FDE8E8]/30' : 'border-[#E9E2D8] bg-[#F7F4EF]'
                    }`}
                  />
                  {fieldErrors.boxType && (
                    <p className="text-[#A8261E] text-[11px] font-medium mt-1">{fieldErrors.boxType}</p>
                  )}
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block font-bold text-[#241C17] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-[10px] border text-[#241C17] focus:bg-white focus:outline-hidden ${
                      fieldErrors.price ? 'border-[#A8261E] bg-[#FDE8E8]/30' : 'border-[#E9E2D8] bg-[#F7F4EF]'
                    }`}
                  />
                  {fieldErrors.price && (
                    <p className="text-[#A8261E] text-[11px] font-medium mt-1">{fieldErrors.price}</p>
                  )}
                </div>

                {/* MRP */}
                <div>
                  <label className="block font-bold text-[#241C17] mb-1">
                    MRP (₹) <span className="font-normal text-[#6B5F55]">(Optional — defaults to price)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={mrp}
                    placeholder={price ? String(price) : '1400'}
                    onChange={(e) => {
                      setMrp(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.mrp) setFieldErrors((prev) => ({ ...prev, mrp: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-[10px] border text-[#241C17] focus:bg-white focus:outline-hidden ${
                      fieldErrors.mrp ? 'border-[#A8261E] bg-[#FDE8E8]/30' : 'border-[#E9E2D8] bg-[#F7F4EF]'
                    }`}
                  />
                  {fieldErrors.mrp && (
                    <p className="text-[#A8261E] text-[11px] font-medium mt-1">{fieldErrors.mrp}</p>
                  )}
                </div>
              </div>

              {/* IMAGE UPLOAD & PREVIEW SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#241C17]">Hamper Image *</label>
                  <button
                    type="button"
                    onClick={() => setShowUrlFallback(!showUrlFallback)}
                    className="text-[11px] text-[#7A1129] hover:underline font-semibold cursor-pointer"
                  >
                    {showUrlFallback ? '← Back to Image Upload' : 'Enter Image URL Instead'}
                  </button>
                </div>

                {/* Hidden File Picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />

                {/* Image Preview Box (If image chosen or existing hamper image loaded) */}
                {(previewUrl || imageUrl) && !showUrlFallback ? (
                  <div className="rounded-[12px] border border-[#E9E2D8] bg-[#FAF8F5] p-3 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-36 h-24 rounded-[8px] overflow-hidden bg-stone-100 shrink-0 border border-[#E9E2D8]">
                      <img
                        src={previewUrl || imageUrl}
                        alt="Hamper preview"
                        className="w-full h-full object-cover"
                      />
                      {selectedFile && (
                        <span className="absolute bottom-1 right-1 bg-[#17663E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          New
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1 text-left w-full sm:w-auto">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#7A1129] shrink-0" />
                        <span className="font-bold text-xs text-[#241C17] truncate">
                          {selectedFile ? selectedFile.name : (editingHamper ? 'Current Hamper Photo' : 'Selected Photo')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B5F55]">
                        {selectedFile
                          ? `${(selectedFile.size / 1024).toFixed(0)} KB · ${selectedFile.type.replace('image/', '').toUpperCase()}`
                          : 'Saved to secure storage'}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting || isUploading}
                          className="px-3 py-1 rounded-[8px] border border-[#E9E2D8] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#241C17] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3 text-[#7A1129]" />
                          <span>Replace Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearImage}
                          disabled={isSubmitting || isUploading}
                          className="px-2.5 py-1 rounded-[8px] text-xs font-semibold text-[#A8261E] hover:bg-[#FDE8E8] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !showUrlFallback ? (
                  /* Upload Dropzone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[12px] p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      fieldErrors.image
                        ? 'border-[#A8261E] bg-[#FDE8E8]/20 hover:bg-[#FDE8E8]/30'
                        : 'border-[#C79A3D]/40 bg-[#FAF8F5] hover:bg-[#F5EFE6] hover:border-[#7A1129]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF4DE] border border-[#C79A3D]/40 flex items-center justify-center text-[#7A1129] shadow-2xs">
                      <Upload className="w-6 h-6 text-[#7A1129]" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-[#7A1129]">Click to Upload Hamper Image</span>
                      <p className="text-xs text-[#6B5F55] mt-0.5">
                        Supports JPEG, PNG, or WebP up to 5MB
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Fallback URL Input */
                  <div className="space-y-1">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setPreviewUrl(e.target.value);
                        if (fieldErrors.image) setFieldErrors((prev) => ({ ...prev, image: '' }));
                      }}
                      className="w-full px-3 py-2 rounded-[10px] border border-[#E9E2D8] bg-[#F7F4EF] text-[#241C17] focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
                    />
                    <p className="text-[11px] text-[#6B5F55]">
                      Paste an image URL for this gift hamper.
                    </p>
                  </div>
                )}

                {/* Upload Error / Validation Message */}
                {uploadError && (
                  <div className="flex items-center gap-1.5 text-[#A8261E] text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
                {fieldErrors.image && !uploadError && (
                  <p className="text-[#A8261E] text-[11px] font-medium">{fieldErrors.image}</p>
                )}
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
                  disabled={isSubmitting || isUploading}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] text-[#6B5F55] hover:bg-[#E9E2D8]/40 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="min-h-[44px] px-5 py-2 rounded-[10px] bg-[#7A1129] text-white font-bold hover:bg-[#5E0D20] shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-[#F6E08B]" />}
                  <span>
                    {isSubmitting
                      ? (isUploading ? 'Uploading Image...' : 'Saving Hamper...')
                      : (editingHamper ? 'Save Changes' : 'Create Hamper')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
