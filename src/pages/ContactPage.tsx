import React from 'react';
import { MapPin, Phone, MessageSquare, Mail, Clock, ShieldCheck, Truck } from 'lucide-react';
import { BUSINESS_INFO } from '../config/businessInfo';

export const ContactPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Visit Our Barabanki Shop
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6B6258] max-w-2xl">
          We invite you to taste our sweets fresh off the kadhai at our flagship store at Indira Market, near Chaya Chauraha.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Address Card */}
        <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1F1B16]">
            Store Location
          </h3>
          <p className="text-sm text-[#6B6258] leading-relaxed">
            {BUSINESS_INFO.address}
          </p>
          <div className="pt-2">
            <a
              href={BUSINESS_INFO.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#8A1538] hover:underline"
            >
              Open in Google Maps →
            </a>
          </div>
        </div>

        {/* Contact Numbers */}
        <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1F1B16]">
            Call & WhatsApp
          </h3>
          <div className="space-y-1 text-sm text-[#6B6258]">
            <p>
              Direct Order Line:{' '}
              <a href={BUSINESS_INFO.phoneTel} className="text-[#1F1B16] font-semibold hover:text-[#8A1538]">
                {BUSINESS_INFO.phone}
              </a>
            </p>
            <p>
              WhatsApp:{' '}
              <a href={BUSINESS_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-[#2E7D4F] font-semibold hover:underline">
                Chat on WhatsApp
              </a>
            </p>
            <p>
              Email:{' '}
              <a href={`mailto:${BUSINESS_INFO.configuredSenderEmail}`} className="text-[#1F1B16] hover:text-[#8A1538]">
                {BUSINESS_INFO.configuredSenderEmail}
              </a>
              <span className="block text-xs text-[#6B6258] mt-0.5">
                or <a href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`} className="hover:text-[#8A1538] underline">{BUSINESS_INFO.configuredSupportEmail}</a>
              </span>
            </p>
          </div>
        </div>

        {/* Timings */}
        <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#F7E9EE] text-[#8A1538] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#1F1B16]">
            Store Hours
          </h3>
          <div className="text-sm text-[#6B6258] space-y-1">
            <p className="font-medium text-[#1F1B16]">Monday to Sunday</p>
            <p>{BUSINESS_INFO.openingHours}</p>
            <p className="text-xs text-[#2E7D4F] font-semibold pt-1">
              • Open 365 Days a Year
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Coverage Area */}
      <div className="rounded-2xl bg-[#F3EBE0] border border-[#E8DFD2] p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#8A1538]" />
          <h3 className="font-display font-bold text-xl text-[#1F1B16]">
            Online Delivery Serviceable Areas
          </h3>
        </div>

        <p className="text-sm text-[#6B6258] leading-relaxed max-w-2xl">
          We offer fast, temperature-controlled delivery directly from our store in Barabanki. Orders are dispatched in tamper-evident, sealed boxes within 2 hours.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {['225001 - City / Ghantaghar', '225002 - Railway Station & Civil Lines', '225003 - Deva Road', '225122 - Satrikh Road'].map(
            (pin) => (
              <span
                key={pin}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E8DFD2] text-xs font-semibold text-[#1F1B16]"
              >
                {pin}
              </span>
            )
          )}
        </div>
      </div>

      {/* Statutory Disclosures & Grievance Redressal Desk */}
      <div id="grievance" className="bg-white rounded-2xl border-2 border-[#C79A3D]/40 p-6 sm:p-8 space-y-6 scroll-mt-24 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DFD2] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4DE] text-[#7A1129] text-xs font-bold uppercase tracking-wider border border-[#C79A3D]/40 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D4F]" />
              <span>Consumer Protection Act, 2019 Compliance</span>
            </div>
            <h2 className="font-display font-bold text-2xl text-[#1F1B16]">
              Statutory Business Disclosures & Grievance Desk
            </h2>
          </div>
          <div className="text-xs text-[#6E6259] sm:text-right">
            <div>FSSAI State License (Form C):</div>
            <div className="font-mono font-bold text-sm text-[#7A1129]">{BUSINESS_INFO.fssaiLicenseNumber}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Legal Entity Details */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-base text-[#1F1B16] flex items-center gap-2">
              <span>Operating Company Identity</span>
            </h3>
            <div className="space-y-1.5 text-xs sm:text-sm text-[#4A4036]">
              <div><strong className="text-[#1F1B16]">Legal Entity:</strong> {BUSINESS_INFO.legalName}</div>
              <div><strong className="text-[#1F1B16]">Trade Name:</strong> {BUSINESS_INFO.name}</div>
              <div><strong className="text-[#1F1B16]">Nature of Business:</strong> Manufacturer & Online Retailer of Artisanal Sweets & Namkeen</div>
              <div><strong className="text-[#1F1B16]">Registered Manufacturing Kitchen:</strong> {BUSINESS_INFO.address}</div>
              <div><strong className="text-[#1F1B16]">Official Domain:</strong> <a href={BUSINESS_INFO.domain} className="text-[#7A1129] underline">{BUSINESS_INFO.domain}</a></div>
            </div>
          </div>

          {/* Grievance Redressal Officer */}
          <div className="space-y-3 p-4 rounded-xl bg-[#FAF4DE]/50 border border-[#C79A3D]/40">
            <h3 className="font-display font-bold text-base text-[#7A1129] flex items-center gap-2">
              <span>Consumer Grievance Officer</span>
            </h3>
            <div className="space-y-1.5 text-xs text-[#4A4036]">
              <div><strong className="text-[#1F1B16]">Designation:</strong> Customer Redressal & Food Safety Officer</div>
              <div><strong className="text-[#1F1B16]">Email:</strong> <a href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`} className="text-[#7A1129] underline font-medium">{BUSINESS_INFO.configuredSupportEmail}</a></div>
              <div><strong className="text-[#1F1B16]">Helpline:</strong> <a href={BUSINESS_INFO.phoneTel} className="text-[#7A1129] font-medium">{BUSINESS_INFO.phone}</a></div>
              <div><strong className="text-[#1F1B16]">Address:</strong> {BUSINESS_INFO.address}</div>
              <div className="pt-2 text-[11px] text-[#6E6259] leading-relaxed border-t border-[#E8DFD2]">
                Per Consumer Protection (E-Commerce) Rules, 2020: We acknowledge all customer complaints within <strong>48 hours</strong> and provide ticket resolution within <strong>1 month</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
