import React from 'react';
import { MapPin, Phone, MessageSquare, Mail, Clock, ShieldCheck, Truck } from 'lucide-react';

export const ContactPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Visit Our Barabanki Shop
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6B6258] max-w-2xl">
          We invite you to taste our sweets fresh off the kadhai at our historic store near Ghantaghar.
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
            Main Market Road, Near Historic Ghantaghar, <br />
            Barabanki, Uttar Pradesh 225001
          </p>
          <div className="pt-2">
            <a
              href="https://maps.google.com/?q=Barabanki+Ghantaghar"
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
              <a href="tel:+919450012345" className="text-[#1F1B16] font-semibold hover:text-[#8A1538]">
                +91 94500 12345
              </a>
            </p>
            <p>
              WhatsApp:{' '}
              <a href="https://wa.me/919450012345" className="text-[#2E7D4F] font-semibold hover:underline">
                Chat on WhatsApp
              </a>
            </p>
            <p>
              Email:{' '}
              <a href="mailto:order@saraswatisweets.in" className="text-[#1F1B16] hover:text-[#8A1538]">
                order@saraswatisweets.in
              </a>
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
            <p>8:00 AM – 10:00 PM</p>
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
    </div>
  );
};
