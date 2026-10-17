import React, { useEffect } from 'react';
import {
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  CreditCard,
  FileText,
} from 'lucide-react';
import { BUSINESS_INFO } from '../config/businessInfo';

interface RefundPolicyPageProps {
  onNavigate?: (path: string) => void;
}

export const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Cancellation & Refund Policy | Saraswati Sweets Barabanki';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF6EF] text-[#221A14]">
      {/* Editorial Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="bg-[#F5EAD9]/70 border-b border-[#E8DCC8] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-[#6E6259]">
          <button
            type="button"
            onClick={() => onNavigate?.('/')}
            className="hover:text-[#7A1129] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#C79A3D]" />
          <span className="text-[#221A14] font-semibold">Cancellation & Refund Policy</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Hero Header Banner */}
        <header className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#7A1129] via-[#650E22] to-[#450816] text-white p-6 sm:p-10 md:p-12 shadow-xl border border-[#C79A3D]/40">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-[#F2C94C] text-xs font-semibold uppercase tracking-wider border border-[#F2C94C]/30">
              <RotateCcw className="w-4 h-4 text-[#F2C94C]" />
              <span>Consumer Protection & Fair Returns Guarantee</span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-white leading-tight">
              Cancellation & Refund Policy
            </h1>

            <p style={{ color: '#FAF4DE' }} className="text-sm sm:text-base leading-relaxed max-w-2xl">
              Transparent, fair, and customer-first guidelines for order cancellations, quality replacements,
              and payment refunds for our handcrafted mithai and namkeen products in Barabanki.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <div
                style={{ color: '#FAF4DE' }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/20"
              >
                <Clock className="w-3.5 h-3.5 text-[#F2C94C]" />
                <span>Last Updated: <strong className="text-white">17 October 2026</strong></span>
              </div>
              <div
                style={{ color: '#FAF4DE' }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/20"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#F2C94C]" />
                <span>Compliant with Consumer Protection (E-Commerce) Rules, 2020</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Layout */}
        <article className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#E8DFD2] p-6 sm:p-10 shadow-xs space-y-8">
          {/* 1. Perishable Food Notice */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#C79A3D]" />
              <span>1. Perishable Goods & Food Safety Regulatory Notice</span>
            </h2>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF4DE]/60 border border-[#C79A3D]/40 text-sm text-[#4A4036] space-y-2">
              <p className="font-semibold text-[#7A1129]">
                Important Consumer Information under Food Safety & Consumer Protection Laws:
              </p>
              <p className="leading-relaxed">
                Traditional Indian sweets (such as Kaju Katli, Rasgulla, Gulab Jamun, Besan Ladoos, and Khoya pedas) are fresh,
                perishable food items prepared with pure milk, mawa, and desi ghee. In accordance with standard food hygiene regulations
                under the Food Safety and Standards Act, 2006 (FSSAI) and the Consumer Protection (E-Commerce) Rules, 2020,
                food items once delivered and unsealed cannot be returned or resold to other customers for public health and safety reasons.
              </p>
            </div>
          </section>

          {/* 2. Cancellation by Customer */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C79A3D]" />
              <span>2. Customer Cancellation Window</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              You can cancel an order under the following conditions:
            </p>
            <div className="space-y-3 text-sm text-[#4A4036]">
              <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D4F] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#1F1B16]">Cancellation Before Kitchen Preparation (Eligible for Full Refund)</div>
                  <p className="text-xs text-[#6E6259] mt-0.5 leading-relaxed">
                    Orders may be cancelled freely while the order status is <strong>PENDING_PAYMENT</strong> or <strong>PLACED</strong>,
                    typically within <strong>30 minutes</strong> of order placement. If you paid online via Cashfree, a 100% full refund is automatically triggered back to your payment source.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#B3261E] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#1F1B16]">Cancellation After Preparation or Dispatch (Ineligible)</div>
                  <p className="text-xs text-[#6E6259] mt-0.5 leading-relaxed">
                    Once the store marks your order as <strong>PREPARING</strong> or <strong>OUT_FOR_DELIVERY</strong>,
                    custom packaging has been sealed and fresh ingredients committed. Cancellations cannot be accepted at this stage.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6E6259]">
              To cancel an eligible order, click the <em>Cancel Order</em> button in your order tracking screen or call our counter immediately at <strong className="text-[#7A1129]">{BUSINESS_INFO.phone}</strong>.
            </p>
          </section>

          {/* 3. Damaged, Defective or Incorrect Items */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C79A3D]" />
              <span>3. Damaged, Tampered, or Defective Items Guarantee</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              We stand 100% behind the quality and purity of our sweets. You are entitled to an <strong>immediate free replacement</strong> or a <strong>full refund</strong> if:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#4A4036]">
              <li>The outer security seal or box arrived visibly damaged, opened, or crushed in transit.</li>
              <li>The product delivered does not match your ordered sweet or pack weight (e.g. ordered Kaju Katli, received Besan Ladoo).</li>
              <li>The product has expired, exceeded its declared shelf life, or displays any quality defect.</li>
              <li>Any item listed on your invoice is missing from the delivery parcel.</li>
            </ul>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs sm:text-sm text-[#17663E] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#17663E]" />
                <span>How to Claim a Replacement or Quality Refund:</span>
              </div>
              <p>
                Contact us via WhatsApp (<a href={BUSINESS_INFO.whatsappLink} className="underline font-semibold">{BUSINESS_INFO.phone}</a>) or email (<a href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`} className="underline font-semibold">{BUSINESS_INFO.configuredSupportEmail}</a>) within <strong>2 hours of delivery</strong> with your Order Number and clear photographs of the damaged or incorrect item. Our manager will review and confirm replacement dispatch or process your refund within 2 business hours.
              </p>
            </div>
          </section>

          {/* 4. Refund Processing Timelines & Method */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#C79A3D]" />
              <span>4. Refund Processing Method & Banking Timelines</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              All refunds are executed through authoritative server-side banking integrations:
            </p>
            <div className="space-y-2 text-sm text-[#4A4036]">
              <div className="flex justify-between items-center p-3 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1]">
                <span>UPI Transactions (GPay, PhonePe, Paytm, BHIM)</span>
                <strong className="text-[#1F1B16]">24 to 48 Hours</strong>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1]">
                <span>Debit & Credit Cards (Visa, MasterCard, RuPay)</span>
                <strong className="text-[#1F1B16]">5 to 7 Banking Days</strong>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1]">
                <span>Net Banking (Indian Commercial Banks)</span>
                <strong className="text-[#1F1B16]">3 to 5 Banking Days</strong>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1]">
                <span>Cash on Delivery (COD)</span>
                <strong className="text-[#1F1B16]">Instant Counter Cash / UPI Reversal</strong>
              </div>
            </div>
            <p className="text-xs text-[#6E6259]">
              * Note: Refunds are processed directly back to the original funding account via Cashfree Payments. You will receive an automated Cashfree ARN (Acquirer Reference Number) confirming payment reversal.
            </p>
          </section>

          {/* 5. Store Cancellation Rights */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C79A3D]" />
              <span>5. Store Cancellation Rights</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              Saraswati Sweets reserves the right to cancel an order in unavoidable circumstances, including unexpected stock depletion of artisanal batches,
              extreme weather preventing delivery, or addresses outside our serviceable PIN codes. In all such events, you will be notified immediately and a 100% full refund
              will be credited back to your account without delay.
            </p>
          </section>

          {/* Escalation Contact */}
          <div className="pt-6 border-t border-[#E8DFD2] rounded-2xl bg-[#F5EAD9]/40 p-5 space-y-2 text-xs sm:text-sm text-[#6E6259]">
            <div className="font-bold text-[#221A14] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#7A1129]" />
              <span>Questions regarding a refund or cancellation?</span>
            </div>
            <p>
              Reach our customer care team directly at <a href={BUSINESS_INFO.phoneTel} className="text-[#7A1129] font-semibold underline">{BUSINESS_INFO.phone}</a> or write to our Grievance Desk at <a href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`} className="text-[#7A1129] underline">{BUSINESS_INFO.configuredSupportEmail}</a>.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};
