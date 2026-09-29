import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Users,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Save,
  MessageSquare,
} from 'lucide-react';

export type BulkEnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUOTED'
  | 'CONFIRMED'
  | 'FULFILLED'
  | 'CANCELLED';

interface BulkEnquiry {
  id: string;
  enquiry_number: string;
  contact_name: string;
  organization_name?: string;
  phone: string;
  email?: string;
  event_type: 'WEDDING' | 'CORPORATE' | 'FESTIVE_BULK' | 'CUSTOM_EVENT';
  event_date: string;
  estimated_guests?: number;
  estimated_quantity_kg?: number;
  budget_range?: string;
  delivery_address?: string;
  requested_sweets?: string;
  notes?: string;
  admin_notes?: string;
  status: BulkEnquiryStatus;
  created_at: string;
  updated_at: string;
}

interface AdminEnquiriesTabProps {
  enquiries: BulkEnquiry[];
  isAdmin: boolean;
  getAuthHeaders: () => Record<string, string>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_CONFIG: Record<
  BulkEnquiryStatus,
  { label: string; bg: string; text: string }
> = {
  NEW: { label: 'New Enquiry', bg: 'bg-blue-100', text: 'text-blue-800' },
  CONTACTED: { label: 'Contacted / Sample Tasting', bg: 'bg-amber-100', text: 'text-amber-800' },
  QUOTED: { label: 'Wholesale Quote Sent', bg: 'bg-purple-100', text: 'text-purple-800' },
  CONFIRMED: { label: 'Order Confirmed', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  FULFILLED: { label: 'Fulfilled & Delivered', bg: 'bg-stone-200', text: 'text-stone-700' },
  CANCELLED: { label: 'Cancelled / Declined', bg: 'bg-red-100', text: 'text-red-800' },
};

export const AdminEnquiriesTab: React.FC<AdminEnquiriesTabProps> = ({
  enquiries,
  isAdmin,
  getAuthHeaders,
  onRefresh,
  showToast,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeNotesEnquiryId, setActiveNotesEnquiryId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);

  const filteredEnquiries = enquiries.filter((e) => {
    if (filterStatus !== 'ALL' && e.status !== filterStatus) return false;
    return true;
  });

  const handleUpdateStatus = async (id: string, newStatus: BulkEnquiryStatus) => {
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Status updated to ${newStatus}`, 'success');
        onRefresh();
      } else {
        showToast(data.message || 'Failed to update status', 'error');
      }
    } catch {
      showToast('Error updating enquiry status', 'error');
    }
  };

  const handleOpenEditNotes = (enquiry: BulkEnquiry) => {
    setActiveNotesEnquiryId(enquiry.id);
    setDraftNotes(enquiry.admin_notes || '');
  };

  const handleSaveNotes = async (id: string) => {
    try {
      setSavingNotes(true);
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ admin_notes: draftNotes.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Admin notes saved.', 'success');
        setActiveNotesEnquiryId(null);
        onRefresh();
      } else {
        showToast(data.message || 'Failed to save notes', 'error');
      }
    } catch {
      showToast('Error saving notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteEnquiry = async (enquiry: BulkEnquiry) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete enquiry ${enquiry.enquiry_number} from ${enquiry.contact_name}?`)) return;

    try {
      const res = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('Enquiry deleted.', 'info');
        onRefresh();
      }
    } catch {
      showToast('Error deleting enquiry', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538] uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-[#C9A227]" />
            <span>Weddings • Corporate • Festive Pujas</span>
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#1F1B16]">
            Bulk & Wedding Sweets Enquiries
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6258] mt-0.5">
            Manage inbound wholesale quotes. Track progress from initial tasting samples to quotation, confirmation, and festival fulfillment.
          </p>
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-xs font-bold text-[#1F1B16] self-start sm:self-auto focus:outline-none focus:border-[#8A1538]"
        >
          <option value="ALL">All Enquiries ({enquiries.length})</option>
          <option value="NEW">New ({enquiries.filter((e) => e.status === 'NEW').length})</option>
          <option value="CONTACTED">Contacted / Sample</option>
          <option value="QUOTED">Quoted</option>
          <option value="CONFIRMED">Confirmed Orders</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Enquiries Cards */}
      {filteredEnquiries.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E8DFD2] text-[#6B6258] text-xs">
          No bulk enquiries found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnquiries.map((enq) => {
            const statusStyle = STATUS_CONFIG[enq.status] || STATUS_CONFIG.NEW;
            const isEditingThisNotes = activeNotesEnquiryId === enq.id;

            return (
              <div
                key={enq.id}
                className="bg-white rounded-2xl border border-[#E8DFD2] p-5 sm:p-6 shadow-xs space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFD2] pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-sm bg-[#8A1538] text-white px-2.5 py-0.5 rounded shadow-xs">
                      {enq.enquiry_number}
                    </span>
                    <span className="font-bold text-sm text-[#1F1B16]">
                      {enq.contact_name}
                    </span>
                    {enq.organization_name && (
                      <span className="text-xs text-[#6B6258] font-medium">
                        ({enq.organization_name})
                      </span>
                    )}
                    <span className="text-stone-300">•</span>
                    <span className="text-xs font-semibold text-[#8A1538] uppercase tracking-wider">
                      {enq.event_type}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#6B6258]">Status:</span>
                    <select
                      value={enq.status}
                      onChange={(e) =>
                        handleUpdateStatus(enq.id, e.target.value as BulkEnquiryStatus)
                      }
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusStyle.bg} ${statusStyle.text} border-transparent focus:outline-none`}
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="QUOTED">QUOTED</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="FULFILLED">FULFILLED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEnquiry(enq)}
                        className="p-1.5 rounded-lg border border-[#E8DFD2] text-[#B3261E] hover:bg-red-50 ml-1"
                        title="Delete Enquiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Event & Target Date */}
                  <div className="space-y-1">
                    <span className="text-[#6B6258] block font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#8A1538]" /> Target Event Date
                    </span>
                    <span className="font-bold text-[#1F1B16] text-sm">
                      {enq.event_date}
                    </span>
                    <span className="text-[11px] text-[#6B6258] block">
                      Submitted: {new Date(enq.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {/* Quantity & Guests */}
                  <div className="space-y-1">
                    <span className="text-[#6B6258] block font-medium flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#8A1538]" /> Estimated Volume
                    </span>
                    <div className="font-bold text-[#1F1B16]">
                      {enq.estimated_quantity_kg ? `${enq.estimated_quantity_kg} kg sweets` : 'Custom quantity'}
                      {enq.estimated_guests && ` • ${enq.estimated_guests} guests`}
                    </div>
                    {enq.budget_range && (
                      <span className="text-[11px] text-[#2E7D4F] font-semibold block">
                        Budget: {enq.budget_range}
                      </span>
                    )}
                  </div>

                  {/* Customer Phone & One-Tap Call */}
                  <div className="space-y-1">
                    <span className="text-[#6B6258] block font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#8A1538]" /> Customer Contact
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${enq.phone}`}
                        className="font-bold text-sm text-[#8A1538] hover:underline flex items-center gap-1"
                      >
                        <span>{enq.phone}</span>
                      </a>
                    </div>
                    {enq.email && (
                      <span className="text-[11px] text-[#6B6258] truncate block">
                        {enq.email}
                      </span>
                    )}
                  </div>

                  {/* Delivery Location */}
                  <div className="space-y-1">
                    <span className="text-[#6B6258] block font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#8A1538]" /> Delivery Location
                    </span>
                    <p className="text-xs text-[#1F1B16] line-clamp-2">
                      {enq.delivery_address || 'Barabanki local area'}
                    </p>
                  </div>
                </div>

                {/* Requested Sweets & Customer Notes */}
                {(enq.requested_sweets || enq.notes) && (
                  <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2] space-y-1.5 text-xs">
                    {enq.requested_sweets && (
                      <div>
                        <strong className="text-[#8A1538]">Requested Sweets:</strong>{' '}
                        <span className="text-[#1F1B16]">{enq.requested_sweets}</span>
                      </div>
                    )}
                    {enq.notes && (
                      <div>
                        <strong className="text-[#6B6258]">Customer Special Instructions:</strong>{' '}
                        <span className="text-[#1F1B16] italic">"{enq.notes}"</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Store Admin Internal Notes */}
                <div className="pt-2 border-t border-[#E8DFD2]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#1F1B16] flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[#8A1538]" />
                      <span>Internal Notes & Follow-up Log:</span>
                    </span>
                    {!isEditingThisNotes && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditNotes(enq)}
                        className="text-xs font-semibold text-[#8A1538] hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{enq.admin_notes ? 'Edit Notes' : '+ Add Note'}</span>
                      </button>
                    )}
                  </div>

                  {isEditingThisNotes ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={draftNotes}
                        onChange={(e) => setDraftNotes(e.target.value)}
                        placeholder="Log tasting feedback, wholesale rates quoted, delivery partner assignment notes..."
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E8DFD2] bg-white focus:outline-none focus:border-[#8A1538] resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveNotesEnquiryId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-[#6B6258] hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingNotes}
                          onClick={() => handleSaveNotes(enq.id)}
                          className="px-3.5 py-1 rounded-lg bg-[#8A1538] text-white text-xs font-semibold hover:bg-[#701029] transition-colors flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingNotes ? 'Saving...' : 'Save Note'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B6258] bg-[#F3EBE0]/60 p-2 rounded-lg italic">
                      {enq.admin_notes || 'No internal notes recorded yet.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
