import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Mail,
  Phone,
  RefreshCw,
  Send,
  Calendar,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export interface PrivacyRequestItem {
  id: string;
  ticketNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  requestType: 'DATA_ACCESS' | 'DATA_CORRECTION' | 'DATA_ERASURE' | 'CONSENT_WITHDRAWAL' | 'GRIEVANCE';
  details: string;
  status: 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminGrievancesTabProps {
  requests: PrivacyRequestItem[];
  isAdmin: boolean;
  getAuthHeaders: () => Record<string, string>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_CONFIG: Record<
  PrivacyRequestItem['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  RECEIVED: {
    label: 'Received / New',
    bg: 'bg-[#FDF2F2]',
    text: 'text-[#991B1B]',
    border: 'border-[#FCA5A5]',
  },
  IN_REVIEW: {
    label: 'Under Investigation',
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FCD34D]',
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#166534]',
    border: 'border-[#86EFAC]',
  },
  REJECTED: {
    label: 'Rejected / Closed',
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#4B5563]',
    border: 'border-[#D1D5DB]',
  },
};

const TYPE_CONFIG: Record<
  PrivacyRequestItem['requestType'],
  { label: string; bg: string; text: string }
> = {
  GRIEVANCE: {
    label: 'Consumer Grievance',
    bg: 'bg-[#FAF4DE]',
    text: 'text-[#7A1129]',
  },
  DATA_CORRECTION: {
    label: 'Data Correction',
    bg: 'bg-[#EBF5FF]',
    text: 'text-[#1E40AF]',
  },
  DATA_ERASURE: {
    label: 'Profile Erasure',
    bg: 'bg-[#F5F3FF]',
    text: 'text-[#5B21B6]',
  },
  DATA_ACCESS: {
    label: 'Data Access / Export',
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
  },
  CONSENT_WITHDRAWAL: {
    label: 'Consent Withdrawal',
    bg: 'bg-[#FFF7ED]',
    text: 'text-[#9A3412]',
  },
};

export const AdminGrievancesTab: React.FC<AdminGrievancesTabProps> = ({
  requests,
  isAdmin,
  getAuthHeaders,
  onRefresh,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PrivacyRequestItem['status']>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PrivacyRequestItem['requestType']>('ALL');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingStatus, setEditingStatus] = useState<Record<string, PrivacyRequestItem['status']>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Statistics
  const totalCount = requests.length;
  const receivedCount = requests.filter((r) => r.status === 'RECEIVED').length;
  const inReviewCount = requests.filter((r) => r.status === 'IN_REVIEW').length;
  const resolvedCount = requests.filter((r) => r.status === 'RESOLVED').length;

  // Filtered list
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && r.requestType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTicket = r.ticketNumber?.toLowerCase().includes(q);
      const matchName = r.customerName?.toLowerCase().includes(q);
      const matchEmail = r.customerEmail?.toLowerCase().includes(q);
      const matchPhone = r.customerPhone?.toLowerCase().includes(q);
      const matchDetails = r.details?.toLowerCase().includes(q);
      if (!matchTicket && !matchName && !matchEmail && !matchPhone && !matchDetails) {
        return false;
      }
    }
    return true;
  });

  const handleStatusChange = (id: string, newStatus: PrivacyRequestItem['status']) => {
    setEditingStatus((prev) => ({ ...prev, [id]: newStatus }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: notes }));
  };

  const handleSaveResolution = async (request: PrivacyRequestItem) => {
    const targetStatus = editingStatus[request.id] || request.status;
    const targetNotes =
      editingNotes[request.id] !== undefined ? editingNotes[request.id] : request.resolutionNotes || '';

    setSavingId(request.id);
    try {
      const res = await fetch(`/api/admin/privacy-requests/${request.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          status: targetStatus,
          resolution_notes: targetNotes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(`Ticket #${request.ticketNumber} updated to ${targetStatus}`, 'success');
        onRefresh();
      } else {
        showToast(data.message || 'Failed to update ticket status', 'error');
      }
    } catch {
      showToast('Network error while saving resolution', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Statutory Compliance Header Banner */}
      <div className="rounded-2xl bg-white border border-[#C79A3D]/40 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAF4DE] text-[#7A1129] text-xs font-bold uppercase tracking-wider border border-[#C79A3D]/40">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D4F]" />
            <span>Consumer Protection (E-Commerce) Rules & DPDP Act 2023</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-[#1F1B16] flex items-center gap-2">
            <span>Customer Grievance & Privacy Rights Desk</span>
          </h2>
          <p className="text-xs text-[#6E6259] leading-relaxed max-w-2xl">
            Designated Grievance Officer: <strong>Mr. Ram Prakash Srivastava</strong> | Email: <strong>saraswatisweetsbarabanki@gmail.com</strong> | Phone: <strong>+91 91611 10030</strong>. All grievances must be acknowledged within <strong>48 hours</strong> and resolved within <strong>30 days</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FAF7F2] hover:bg-[#F3E9DC] text-xs font-bold text-[#1F1B16] transition-colors self-start md:self-auto shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7A1129]" />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl bg-white border border-[#E8DFD2] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#6E6259]">Total Tickets</div>
          <div className="text-2xl font-display font-extrabold text-[#1F1B16] mt-1">{totalCount}</div>
        </div>
        <div className="rounded-xl bg-[#FDF2F2] border border-[#FCA5A5] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">Action Required</div>
          <div className="text-2xl font-display font-extrabold text-[#991B1B] mt-1">{receivedCount}</div>
        </div>
        <div className="rounded-xl bg-[#FFFBEB] border border-[#FCD34D] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#92400E]">In Review</div>
          <div className="text-2xl font-display font-extrabold text-[#92400E] mt-1">{inReviewCount}</div>
        </div>
        <div className="rounded-xl bg-[#F0FDF4] border border-[#86EFAC] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#166534]">Resolved</div>
          <div className="text-2xl font-display font-extrabold text-[#166534] mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="rounded-2xl bg-white border border-[#E8DFD2] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, customer name, email, phone, or issue description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8DFD2] bg-[#FAF7F2] text-xs text-[#1F1B16] placeholder:text-stone-400 focus:bg-white focus:outline-hidden focus:border-[#7A1129]"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#6E6259] mr-1 hidden sm:inline">Status:</span>
            {(['ALL', 'RECEIVED', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#7A1129] text-white shadow-2xs'
                    : 'bg-[#FAF7F2] text-[#6E6259] hover:bg-[#F3E9DC] border border-[#E8DFD2]'
                }`}
              >
                {st === 'ALL' ? 'All Status' : STATUS_CONFIG[st].label}
                {st === 'RECEIVED' && receivedCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                    {receivedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Request Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E8DFD2]">
          <span className="text-xs font-bold text-[#6E6259] mr-1">Type:</span>
          {(['ALL', 'GRIEVANCE', 'DATA_CORRECTION', 'DATA_ERASURE', 'DATA_ACCESS', 'CONSENT_WITHDRAWAL'] as const).map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setTypeFilter(tp)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                typeFilter === tp
                  ? 'bg-[#C79A3D] text-white'
                  : 'bg-[#FAF7F2] text-[#6E6259] hover:bg-[#F3E9DC] border border-[#E8DFD2]'
              }`}
            >
              {tp === 'ALL' ? 'All Types' : TYPE_CONFIG[tp].label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tickets List */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#E8DFD2] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FAF4DE] text-[#7A1129] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#2E7D4F]" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1F1B16]">No Customer Grievances Found</h3>
          <p className="text-xs text-[#6E6259] max-w-sm mx-auto">
            {search || statusFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'No tickets match the current filters. Try resetting the search or status filter.'
              : 'There are currently no customer grievances or privacy requests recorded.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const currentStatus = editingStatus[req.id] || req.status;
            const currentNotes =
              editingNotes[req.id] !== undefined ? editingNotes[req.id] : req.resolutionNotes || '';
            const statusMeta = STATUS_CONFIG[req.status];
            const typeMeta = TYPE_CONFIG[req.requestType] || TYPE_CONFIG.GRIEVANCE;
            const isSaving = savingId === req.id;
            const hasUnsavedChanges =
              currentStatus !== req.status ||
              (currentNotes.trim() !== (req.resolutionNotes || '').trim());

            return (
              <div
                key={req.id}
                className="rounded-2xl bg-white border border-[#E8DFD2] p-5 sm:p-6 shadow-xs space-y-4 hover:border-[#C79A3D]/60 transition-colors"
              >
                {/* Header row: Ticket # + Badges + Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DFD2] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm bg-[#FAF4DE] text-[#7A1129] px-2.5 py-1 rounded-lg border border-[#C79A3D]/40">
                      {req.ticketNumber}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${typeMeta.bg} ${typeMeta.text}`}>
                      {typeMeta.label}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="text-xs text-[#6E6259] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {new Date(req.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                {/* Customer Details & Grievance Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Info Card */}
                  <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8DFD2] space-y-2 text-xs">
                    <div className="font-bold text-[#1F1B16] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#7A1129]" />
                      <span>{req.customerName || 'Customer'}</span>
                    </div>

                    <div className="text-[#6E6259] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#7A1129]" />
                      <a
                        href={`mailto:${req.customerEmail}`}
                        className="hover:underline text-[#7A1129] truncate"
                      >
                        {req.customerEmail}
                      </a>
                    </div>

                    {req.customerPhone && (
                      <div className="text-[#6E6259] flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#7A1129]" />
                        <a href={`tel:${req.customerPhone}`} className="hover:underline">
                          {req.customerPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Customer Grievance / Details Text */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#6E6259]">
                      Customer Complaint / Request Details:
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD2] text-xs text-[#1F1B16] leading-relaxed whitespace-pre-wrap">
                      {req.details}
                    </div>
                  </div>
                </div>

                {/* Resolution & Status Management Panel */}
                <div className="bg-[#FAF4DE]/40 rounded-xl p-4 border border-[#C79A3D]/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#1F1B16] shrink-0">Update Status:</label>
                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          handleStatusChange(req.id, e.target.value as PrivacyRequestItem['status'])
                        }
                        className="px-3 py-1.5 rounded-lg border border-[#E8DFD2] bg-white text-xs font-bold text-[#1F1B16] focus:outline-hidden focus:border-[#7A1129]"
                      >
                        <option value="RECEIVED">Received / New</option>
                        <option value="IN_REVIEW">Under Investigation</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected / Closed</option>
                      </select>
                    </div>

                    {req.status === 'RESOLVED' && req.updatedAt && (
                      <div className="text-xs text-[#2E7D4F] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Resolved on{' '}
                          {new Date(req.updatedAt).toLocaleDateString('en-IN', {
                            dateStyle: 'medium',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                      Internal Resolution Notes / Redressal Summary:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter resolution notes, communication details with customer, or explanation..."
                      value={currentNotes}
                      onChange={(e) => handleNotesChange(req.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] bg-white text-xs text-[#1F1B16] placeholder:text-stone-400 focus:outline-hidden focus:border-[#7A1129]"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isSaving || !hasUnsavedChanges}
                      onClick={() => handleSaveResolution(req)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        hasUnsavedChanges
                          ? 'bg-[#7A1129] hover:bg-[#5E0D20] text-white shadow-xs'
                          : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Resolution'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
