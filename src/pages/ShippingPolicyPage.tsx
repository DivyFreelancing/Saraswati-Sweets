import React, { useEffect } from 'react';
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  Clock,
  ArrowLeft,
  MapPin,
  Package,
  AlertCircle,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { BUSINESS_INFO } from '../config/businessInfo';
import { handleSpaNavigation } from '../utils/navigation';

interface ShippingPolicyPageProps {
  onNavigate?: (path: string) => void;
}

export const ShippingPolicyPage: React.FC<ShippingPolicyPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Shipping & Delivery Policy | Saraswati Sweets Barabanki';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const serviceableAreas = [
    { pincode: '225001', area: 'Barabanki City, Ghantaghar, Indira Market, Dhanokhar, Civil Lines' },
    { pincode: '225002', area: 'Barabanki Railway Station, Awas Vikas, Somaiya Nagar, Civil Lines' },
    { pincode: '225003', area: 'Deva Road, Patel Tiraha, Industrial Area' },
    { pincode: '225122', area: 'Satrikh Road, Subhash Nagar, Jahangirabad Road' },
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
          <span className="text-[#221A14] font-semibold">Shipping & Delivery Policy</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Hero Header Banner */}
        <header className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#7A1129] via-[#650E22] to-[#450816] text-white p-6 sm:p-10 md:p-12 shadow-xl border border-[#C79A3D]/40">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-[#F2C94C] text-xs font-semibold uppercase tracking-wider border border-[#F2C94C]/30">
              <Truck className="w-4 h-4 text-[#F2C94C]" />
              <span>Direct Kitchen Dispatch & Freshness Guarantee</span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-white leading-tight">
              Shipping & Delivery Policy
            </h1>

            <p style={{ color: '#FAF4DE' }} className="text-sm sm:text-base leading-relaxed max-w-2xl">
              At <strong className="text-white">Saraswati Sweets</strong>, we believe traditional Awadhi mithai is best enjoyed fresh.
              This policy explains how our dedicated local delivery fleet safely transports freshly crafted sweets directly to your doorstep in Barabanki.
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
                <span>Tamper-Proof Food Packaging Guaranteed</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Layout */}
        <article className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#E8DFD2] p-6 sm:p-10 shadow-xs space-y-8">
          {/* 1. Serviceable Areas & PIN Codes */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#C79A3D]" />
              <span>1. Serviceable Delivery Areas (Barabanki)</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              We operate our own temperature-controlled delivery vans and riders directly from our flagship counter at Indira Market, Near Chaya Chauraha.
              To guarantee absolute freshness and food safety, we currently service the following PIN codes in and around Barabanki city:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {serviceableAreas.map((item) => (
                <div key={item.pincode} className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FBF7F1] space-y-1">
                  <div className="font-display font-bold text-base text-[#7A1129] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2E7D4F]" />
                    <span>PIN Code: {item.pincode}</span>
                  </div>
                  <p className="text-xs text-[#6E6259] leading-relaxed">{item.area}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#6E6259] italic pt-1">
              * Note: If your location is outside these PIN codes, online doorstep delivery is unavailable. However, you can place a <strong>Store Takeaway Order</strong> online and collect your packaged box directly at our counter.
            </p>
          </section>

          {/* 2. Dispatch Schedule & Delivery Timelines */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C79A3D]" />
              <span>2. Dispatch Schedule & Delivery Timelines</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              Orders placed online are fulfilled promptly from fresh batches prepared daily:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4036]">
              <li><strong>Standard Delivery Orders:</strong> Dispatched and delivered to your address within <strong>1 to 2 hours</strong> from confirmation during operational store hours (6:30 AM – 10:00 PM IST).</li>
              <li><strong>Scheduled Takeaway Orders:</strong> You select your convenient 30-minute pickup slot (between 8:00 AM – 9:30 PM). Your order will be boxed, labeled, and waiting for you at the counter with zero queue time.</li>
              <li><strong>Bulk / Event Orders:</strong> For wedding, festival, or catering enquiries (over 10 kg), custom delivery schedules and transport arrangements are confirmed with you by our store manager.</li>
            </ul>
          </section>

          {/* 3. Delivery Charges & Thresholds */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#C79A3D]" />
              <span>3. Delivery Charges & Free Delivery Threshold</span>
            </h2>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF4DE]/60 border border-[#C79A3D]/40 space-y-3 text-sm text-[#4A4036]">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8DFD2]">
                <span>Standard Doorstep Delivery (Barabanki)</span>
                <span className="font-bold text-[#1F1B16]">₹40.00 – ₹50.00 (Flat Fee)</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E8DFD2]">
                <span>Orders above Free Delivery Threshold (₹499+)</span>
                <span className="font-bold text-[#2E7D4F]">FREE (₹0.00)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Store Takeaway Counter Pickup</span>
                <span className="font-bold text-[#2E7D4F]">FREE (₹0.00)</span>
              </div>
            </div>
            <p className="text-xs text-[#6E6259]">
              All delivery charges are clearly presented on the checkout page prior to payment. There are zero hidden fees or unexpected charges upon doorstep arrival.
            </p>
          </section>

          {/* 4. Food Safety Packaging Guarantee */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C79A3D]" />
              <span>4. Tamper-Evident Food-Grade Packaging</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              Every mithai and namkeen item is packed in certified food-grade packaging approved under FSSAI regulations.
              Our boxes are sealed with a tamper-evident holographic security tape. If the outer seal appears broken or tampered upon arrival,
              please refuse delivery and contact our helpline immediately at <strong className="text-[#7A1129]">{BUSINESS_INFO.phone}</strong>.
            </p>
          </section>

          {/* 5. Order Tracking & Communication */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#C79A3D]" />
              <span>5. Live Order Tracking & Status Updates</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              Once your order is confirmed, you receive an automated confirmation email and status updates at each fulfillment step:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]">
                <div className="font-bold text-[#7A1129]">1. Confirmed</div>
                <div className="text-[10px] text-[#6E6259]">Batch assigned</div>
              </div>
              <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]">
                <div className="font-bold text-[#7A1129]">2. Preparing</div>
                <div className="text-[10px] text-[#6E6259]">Handcrafted & packed</div>
              </div>
              <div className="p-3 rounded-xl bg-[#FBF7F1] border border-[#E8DFD2]">
                <div className="font-bold text-[#7A1129]">3. Out for Delivery</div>
                <div className="text-[10px] text-[#6E6259]">Rider on the road</div>
              </div>
              <div className="p-3 rounded-xl bg-[#E3F4EA] border border-[#17663E]/30">
                <div className="font-bold text-[#17663E]">4. Delivered</div>
                <div className="text-[10px] text-[#17663E]">Doorstep handover</div>
              </div>
            </div>
            <p className="text-sm text-[#4A4036] pt-1">
              You can track your order at any time using your Order Number at our{' '}
              <a
                href="/orders"
                onClick={(e) => handleSpaNavigation(e, '/orders', onNavigate)}
                className="text-[#7A1129] font-semibold underline"
              >
                Order Tracking Page
              </a>.
            </p>
          </section>

          {/* 6. Non-Delivery Protocols & Address Errors */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#7A1129]" />
              <span>6. Failed Delivery Attempts & Address Errors</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              Our delivery partner will attempt to call your registered mobile number upon arriving at your address.
              If the recipient is unreachable, does not respond after 3 phone attempts, or provided an incorrect address,
              the rider will return the sweets to our Indira Market counter.
            </p>
            <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
              Because fresh sweets are perishable, failed orders may be held at the store counter for customer collection until the end of the operating day.
            </p>
          </section>

          {/* Bottom Help Contact */}
          <div className="pt-6 border-t border-[#E8DFD2] rounded-2xl bg-[#F5EAD9]/40 p-5 space-y-2 text-xs sm:text-sm text-[#6E6259]">
            <div className="font-bold text-[#221A14] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#7A1129]" />
              <span>Need help with an ongoing delivery?</span>
            </div>
            <p>
              Call our Barabanki Dispatch Desk directly at <a href={BUSINESS_INFO.phoneTel} className="text-[#7A1129] font-semibold underline">{BUSINESS_INFO.phone}</a> or email <a href={`mailto:${BUSINESS_INFO.configuredSenderEmail}`} className="text-[#7A1129] underline">{BUSINESS_INFO.configuredSenderEmail}</a>.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};
