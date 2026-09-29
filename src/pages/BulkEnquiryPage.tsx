import React, { useState } from 'react';
import { Building2, Calendar, Users, Scale, Send, CheckCircle2, Phone } from 'lucide-react';
import { catalogService } from '../services/catalogService';
import { useToast } from '../context/ToastContext';

export const BulkEnquiryPage: React.FC = () => {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    contact_name: '',
    phone: '',
    email: '',
    event_type: 'Wedding',
    event_date: '',
    estimated_guests: '',
    estimated_quantity_kg: '',
    requested_sweets: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_name || !formData.phone || !formData.event_date) {
      showToast('Please fill in required fields (Name, Phone, and Event Date)', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await catalogService.submitBulkEnquiry({
        contact_name: formData.contact_name,
        phone: formData.phone,
        email: formData.email || undefined,
        event_type: formData.event_type,
        event_date: formData.event_date,
        estimated_guests: formData.estimated_guests ? parseInt(formData.estimated_guests) : undefined,
        estimated_quantity_kg: formData.estimated_quantity_kg ? parseInt(formData.estimated_quantity_kg) : undefined,
        requested_sweets: formData.requested_sweets || undefined,
        notes: formData.notes || undefined,
        status: 'NEW',
      });

      setSubmitted(true);
      showToast(res.message, 'success');
    } catch (err) {
      showToast('Failed to submit enquiry. Please call us directly.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#F7E9EE] text-[#8A1538] mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-3xl text-[#1F1B16]">
          Enquiry Received with Gratitude!
        </h1>
        <p className="text-base text-[#6B6258] leading-relaxed">
          Thank you, <strong>{formData.contact_name}</strong>. Our senior sweetmaker and orders team in Barabanki will review your requirements for <strong>{formData.event_type}</strong> and call you at <strong>{formData.phone}</strong> with custom pricing and sample tasting options.
        </p>
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8A1538] text-white font-semibold text-sm hover:bg-[#701029] transition-colors"
          >
            Submit Another Enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538] uppercase tracking-wider mb-1">
          <Building2 className="w-4 h-4 text-[#C9A227]" />
          <span>Weddings • Corporate • Auspicious Pujas</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Bulk & Wedding Sweets Enquiry
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6B6258]">
          Whether you need 25 kg of fresh Motichoor Ladoos or 500 personalized wedding gift boxes, we guarantee pure cow desi ghee and punctual delivery across Barabanki & Lucknow.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-[#E8DFD2] p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Contact Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Your Full Name <span className="text-[#B3261E]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="e.g. Rajesh Kumar Verma"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Phone Number <span className="text-[#B3261E]">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9450012345"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. rajesh@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Occasion / Event Type
            </label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-white text-sm font-medium focus:outline-none focus:border-[#8A1538]"
            >
              <option value="Wedding">Wedding Celebration</option>
              <option value="Engagement">Engagement / Roka</option>
              <option value="Corporate">Corporate Gifting / Diwali</option>
              <option value="Puja">Family Puja / Religious Ceremony</option>
              <option value="Festival">Festival Celebration</option>
              <option value="Other">Other Occasion</option>
            </select>
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Event Date <span className="text-[#B3261E]">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
            />
          </div>

          {/* Estimated Quantity kg */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
              Approximate Quantity (in Kilograms / Boxes)
            </label>
            <input
              type="number"
              value={formData.estimated_quantity_kg}
              onChange={(e) => setFormData({ ...formData, estimated_quantity_kg: e.target.value })}
              placeholder="e.g. 25"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
            />
          </div>
        </div>

        {/* Requested Sweets */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
            Preferred Sweets or Gift Box Specifications
          </label>
          <input
            type="text"
            value={formData.requested_sweets}
            onChange={(e) => setFormData({ ...formData, requested_sweets: e.target.value })}
            placeholder="e.g. Kaju Katli (500g boxes) and Motichoor Ladoo (1kg boxes)"
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1B16] mb-1.5">
            Special Instructions / Delivery Location
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Tell us about custom branding stickers, delivery timing, or packaging preferences..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] text-sm focus:outline-none focus:border-[#8A1538] focus:bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-[#8A1538] hover:bg-[#701029] text-white font-semibold text-base transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4 text-[#F6E08B]" />
          <span>{loading ? 'Submitting Enquiry...' : 'Submit Bulk Order Enquiry'}</span>
        </button>

        <p className="text-center text-xs text-[#6B6258]">
          Prefer speaking directly? Call our store manager at <a href="tel:+919450012345" className="text-[#8A1538] font-bold underline">+91 94500 12345</a>
        </p>
      </form>
    </div>
  );
};
