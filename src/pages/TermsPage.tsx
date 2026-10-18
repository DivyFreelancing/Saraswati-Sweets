import React, { useEffect } from 'react';
import {
  ChevronRight,
  ShieldCheck,
  FileText,
  Clock,
  ArrowLeft,
  Scale,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  Truck,
  CreditCard,
  Building,
} from 'lucide-react';
import { BUSINESS_INFO } from '../config/businessInfo';
import { handleSpaNavigation } from '../utils/navigation';

interface TermsPageProps {
  onNavigate?: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Terms & Conditions | Saraswati Sweets Barabanki';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sections = [
    { id: 'section-1', title: '1. Introduction & Business Identity' },
    { id: 'section-2', title: '2. Eligibility & Account Responsibilities' },
    { id: 'section-3', title: '3. Artisanal Mithai, Ingredients & Quality' },
    { id: 'section-4', title: '4. Pricing, Taxes & Payment Methods' },
    { id: 'section-5', title: '5. Order Acceptance, Fulfillment & Delivery' },
    { id: 'section-6', title: '6. Cancellation, Replacements & Refunds' },
    { id: 'section-7', title: '7. Intellectual Property Rights' },
    { id: 'section-8', title: '8. Disclaimers & Limitation of Liability' },
    { id: 'section-9', title: '9. Grievance Redressal Mechanism' },
    { id: 'section-10', title: '10. Governing Law & Jurisdiction' },
    { id: 'section-11', title: '11. Amendments to Terms' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6EF] text-[#221A14]">
      {/* Editorial Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="bg-[#F5EAD9]/70 border-b border-[#E8DCC8] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-[#6E6259]">
          <a
            href="/"
            onClick={(e) => handleSpaNavigation(e, '/', onNavigate)}
            className="hover:text-[#7A1129] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#C79A3D]" />
          <span className="text-[#221A14] font-semibold">Terms & Conditions</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Hero Header Banner */}
        <header className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#7A1129] via-[#650E22] to-[#450816] text-white p-6 sm:p-10 md:p-12 shadow-xl border border-[#C79A3D]/40">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-[#F2C94C] text-xs font-semibold uppercase tracking-wider border border-[#F2C94C]/30">
              <Scale className="w-4 h-4 text-[#F2C94C]" />
              <span>Legal Terms & Consumer Protection Disclosures</span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-white leading-tight">
              Terms & Conditions of Service
            </h1>

            <p style={{ color: '#FAF4DE' }} className="text-sm sm:text-base leading-relaxed max-w-2xl">
              These Terms & Conditions constitute a legally binding agreement between you and{' '}
              <strong className="text-white">{BUSINESS_INFO.legalName}</strong> governing your use of our
              e-commerce website, mobile ordering interfaces, and customer services.
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
                <span>FSSAI License: <strong className="text-white">{BUSINESS_INFO.fssaiLicenseNumber}</strong></span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sticky Sidebar (TOC) */}
          <aside className="lg:col-span-4 sticky top-24 hidden lg:block space-y-4">
            <div className="rounded-2xl border border-[#E8DFD2] bg-white p-5 shadow-xs space-y-3">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#7A1129] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C79A3D]" />
                <span>Table of Contents</span>
              </h3>
              <nav className="space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#6E6259] hover:text-[#7A1129] hover:bg-[#F5EAD9]/60 transition-colors block truncate"
                  >
                    {sec.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Contact Box */}
            <div className="rounded-2xl border border-[#C79A3D]/40 bg-[#FAF4DE]/50 p-5 space-y-3 text-xs text-[#6E6259]">
              <div className="font-display font-bold text-sm text-[#221A14] flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#7A1129]" />
                <span>Operating Entity</span>
              </div>
              <p className="leading-relaxed font-medium text-[#1F1B16]">
                {BUSINESS_INFO.legalName}
              </p>
              <p className="leading-relaxed">
                {BUSINESS_INFO.address}
              </p>
              <div className="pt-2 border-t border-[#E8DFD2] space-y-1">
                <div>Phone: <strong className="text-[#221A14]">{BUSINESS_INFO.phone}</strong></div>
                <div>Support: <strong className="text-[#7A1129]">{BUSINESS_INFO.configuredSupportEmail}</strong></div>
              </div>
            </div>
          </aside>

          {/* Right Main Article */}
          <article className="lg:col-span-8 bg-white rounded-3xl border border-[#E8DFD2] p-6 sm:p-10 shadow-xs space-y-10">
            {/* Section 1 */}
            <section id="section-1" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>1. Introduction & Business Identity</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Welcome to the digital platform of <strong>Saraswati Sweets</strong>. These Terms & Conditions
                govern your access to and purchase of artisanal traditional Indian sweets, snacks, and confectionery products
                through our website (<a href={BUSINESS_INFO.domain} className="text-[#7A1129] underline">{BUSINESS_INFO.domain}</a>).
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                The platform is owned and operated by <strong>{BUSINESS_INFO.legalName}</strong>, an Indian company
                with its primary manufacturing and retail premises at <em>{BUSINESS_INFO.address}</em>.
                We hold verified Food Safety and Standards Authority of India (FSSAI) State License Number <strong>{BUSINESS_INFO.fssaiLicenseNumber}</strong>.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                By accessing this website, placing an order, or registering an account, you affirm that you have read, understood,
                and agreed to be bound by these Terms and Conditions and our associated policies, in compliance with the
                Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology Act, 2000.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>2. Eligibility & Account Responsibilities</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                To enter into a binding contract on our platform, you must be at least 18 years of age and competent to contract under the Indian Contract Act, 1872.
                Minors may only browse or purchase with the direct supervision and involvement of a parent or legal guardian.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                When registering an account via email OTP or placing an order, you agree to provide truthful, accurate, and complete information,
                including your real name, valid contact mobile number, and accurate delivery address in Barabanki.
                You are responsible for maintaining the confidentiality of your session credentials and email inbox.
              </p>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>3. Artisanal Mithai, Ingredients & Quality</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Since 1989, Saraswati Sweets has prepared traditional Awadhi mithai and namkeen using 100% pure desi cow ghee,
                fresh milk, mawa, saffron, and premium dry fruits. Because our sweets are handcrafted in daily artisanal batches,
                minor variations in shape, texture, and natural color may occur.
              </p>
              <div className="p-4 rounded-2xl bg-[#FAF4DE]/60 border border-[#C79A3D]/40 text-xs sm:text-sm text-[#4A4036] space-y-2">
                <div className="font-bold text-[#7A1129] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#7A1129]" />
                  <span>Perishable Nature & Shelf Life Notice</span>
                </div>
                <p>
                  Our fresh sweets contain no artificial chemical preservatives. Each product card and detail page specifies the
                  calculated shelf life (e.g. 7 days, 15 days, 30 days) and recommended storage instructions (e.g., store in refrigerator below 4°C
                  or in a cool, dry place). We strongly advise consuming fresh sweets within the designated shelf-life duration.
                </p>
              </div>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                <strong>Allergen Advisory:</strong> Our products are prepared in a kitchen that handles milk, tree nuts (almonds, cashews, pistachios),
                wheat (gluten), and sesame. Customers with severe dietary allergies should review product ingredient labels carefully before ordering.
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>4. Pricing, Taxes & Payment Methods</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                All prices displayed on our website are denominated in Indian Rupees (INR ₹) and are inclusive of all applicable Goods and Services Tax (GST).
                The final checkout page provides a full, itemized breakdown including items subtotal, coupon discounts, packaging/delivery charges, and applicable tax.
              </p>
              <div className="space-y-2 text-sm text-[#4A4036]">
                <p><strong>Accepted Payment Modes:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Online Payment:</strong> Securely processed via RBI-authorized payment aggregator <em>Cashfree Payments</em>. We accept UPI (Google Pay, PhonePe, Paytm, BHIM), major Credit and Debit Cards (Visa, MasterCard, RuPay), and Net Banking. Card credentials are never stored on Saraswati Sweets servers.</li>
                  <li><strong>Cash on Delivery (COD):</strong> Permitted for doorstep delivery orders in Barabanki up to a maximum cart limit of ₹2,000. Advance online payment is mandatory for store takeaway orders and orders exceeding ₹2,000.</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>5. Order Acceptance, Fulfillment & Delivery</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Placing an order constitutes an offer to purchase. An order is confirmed when you receive an order confirmation email and SMS/in-app alert
                with a unique Saraswati Order Number (e.g. <code>#ORD-...</code>). We reserve the right to decline or cancel an order if items are out of stock,
                the delivery address falls outside our serviceable Barabanki PIN codes, or suspected payment fraud is detected.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Delivery is conducted in tamper-evident sealed boxes by our dedicated local fleet. Please review our dedicated{' '}
                <a
                  href="/shipping-policy"
                  onClick={(e) => handleSpaNavigation(e, '/shipping-policy', onNavigate)}
                  className="text-[#7A1129] font-semibold underline"
                >
                  Shipping & Delivery Policy
                </a>{' '}
                for full details on serviceable areas, slots, and delivery charges.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>6. Cancellation, Replacements & Refunds</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Due to the perishable nature of fresh traditional sweets and strict food safety regulations, cancellations are permitted only before our kitchen
                initiates preparation or dispatch (typically within 30 minutes of placing your order).
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                In the rare event that an order arrives damaged, tampered, spoiled, or incomplete, please notify us within 2 hours of receipt with photographic proof.
                We provide immediate free replacements or full refunds to your original payment method. For detailed terms, see our{' '}
                <a
                  href="/refund-policy"
                  onClick={(e) => handleSpaNavigation(e, '/refund-policy', onNavigate)}
                  className="text-[#7A1129] font-semibold underline"
                >
                  Cancellation & Refund Policy
                </a>.
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>7. Intellectual Property Rights</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                All brand names, trademarks, logos, photographs, illustrations, textual content, packaging designs, and source code appearing on this website
                are the exclusive intellectual property of <strong>{BUSINESS_INFO.legalName}</strong> or licensed to us.
                Unauthorized reproduction, scraping, copying, or redistribution of our brand assets is strictly prohibited under the Copyright Act, 1957 and Trade Marks Act, 1999.
              </p>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>8. Disclaimers & Limitation of Liability</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We make every effort to maintain continuous service availability and deliver our sweets within scheduled timelines.
                However, we are not liable for delays or non-performance caused by events beyond our reasonable control (force majeure),
                including extreme weather, road closures, strikes, power grid failures, or telecommunications disruptions.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                To the fullest extent permitted by Indian law, our total liability for any claim arising out of or related to an order
                shall not exceed the total price paid by you for the specific order giving rise to the dispute.
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>9. Grievance Redressal Mechanism</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                In compliance with Rule 5(4) of the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021,
                we have appointed a Grievance Officer to address consumer complaints promptly:
              </p>
              <div className="rounded-2xl border border-[#C79A3D]/40 bg-[#FAF4DE]/50 p-5 space-y-2 text-sm text-[#4A4036]">
                <div className="font-bold text-[#1F1B16]">Grievance Officer: Mr. Ram Prakash Srivastava</div>
                <div>Entity: <strong>{BUSINESS_INFO.legalName}</strong></div>
                <div>Address: {BUSINESS_INFO.address}</div>
                <div>Email: <a href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`} className="text-[#7A1129] underline font-medium">{BUSINESS_INFO.configuredSupportEmail}</a></div>
                <div>Telephone: <a href={BUSINESS_INFO.phoneTel} className="text-[#7A1129] font-medium">{BUSINESS_INFO.phone}</a></div>
                <div className="pt-2 text-xs text-[#6E6259]">
                  We acknowledge all consumer complaints within <strong>48 hours</strong> and strive to resolve grievances within <strong>1 month</strong> from the date of receipt.
                </div>
              </div>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>10. Governing Law & Jurisdiction</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                These Terms and Conditions and any dispute or claim arising out of your purchases shall be governed by and construed in accordance
                with the laws of the Republic of India.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Subject to the consumer dispute resolution mechanisms provided under the Consumer Protection Act, 2019, the competent courts situated
                in <strong>Barabanki, Uttar Pradesh, India</strong> shall have exclusive jurisdiction over all matters arising hereunder.
              </p>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>11. Amendments to Terms</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We reserve the right to amend or update these Terms & Conditions from time to time to reflect modifications in our commercial operations,
                food handling guidelines, or statutory compliance obligations. The updated version will be posted on this page with a revised “Last Updated” date.
                Continued use of our platform after updates indicates your acceptance of the revised Terms.
              </p>
            </section>

            {/* Bottom Footer Note */}
            <div className="pt-8 border-t border-[#E8DFD2] flex flex-wrap items-center justify-between gap-4 text-xs text-[#6E6259]">
              <div>
                © {new Date().getFullYear()} {BUSINESS_INFO.legalName}. All rights reserved.
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/privacy-policy"
                  onClick={(e) => handleSpaNavigation(e, '/privacy-policy', onNavigate)}
                  className="hover:text-[#7A1129] underline"
                >
                  Privacy Policy
                </a>
                <span>·</span>
                <a
                  href="/shipping-policy"
                  onClick={(e) => handleSpaNavigation(e, '/shipping-policy', onNavigate)}
                  className="hover:text-[#7A1129] underline"
                >
                  Shipping Policy
                </a>
                <span>·</span>
                <a
                  href="/refund-policy"
                  onClick={(e) => handleSpaNavigation(e, '/refund-policy', onNavigate)}
                  className="hover:text-[#7A1129] underline"
                >
                  Refund Policy
                </a>
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
};
