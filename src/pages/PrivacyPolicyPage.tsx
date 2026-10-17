import React, { useEffect } from 'react';
import {
  ChevronRight,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Server,
  CreditCard,
  Send,
  Database,
  Truck,
  Scale,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { BUSINESS_INFO } from '../config/businessInfo';

interface PrivacyPolicyPageProps {
  onNavigate?: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Privacy Policy | Saraswati Sweets Barabanki';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sections = [
    { id: 'section-1', title: '1. Information We Collect' },
    { id: 'section-2', title: '2. How We Use Your Information' },
    { id: 'section-3', title: '3. Cookies and Similar Technologies' },
    { id: 'section-4', title: '4. When We Share Information' },
    { id: 'section-5', title: '5. Payment Security & Third Parties' },
    { id: 'section-6', title: '6. Data Retention' },
    { id: 'section-7', title: '7. Data Security' },
    { id: 'section-8', title: '8. Your Rights & Choices' },
    { id: 'section-9', title: '9. Children’s Privacy' },
    { id: 'section-10', title: '10. External Links' },
    { id: 'section-11', title: '11. Changes to This Policy' },
    { id: 'section-12', title: '12. Contact Us' },
  ];

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
          <span className="text-[#221A14] font-semibold">Privacy Policy</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Hero Header Banner */}
        <header className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#7A1129] via-[#650E22] to-[#450816] text-white p-6 sm:p-10 md:p-12 shadow-xl border border-[#C79A3D]/40">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-[#F2C94C] text-xs font-semibold uppercase tracking-wider border border-[#F2C94C]/30">
              <ShieldCheck className="w-4 h-4 text-[#F2C94C]" />
              <span>Customer Trust & Data Protection</span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-white leading-tight">
              Privacy Policy
            </h1>

            <p
              style={{ color: '#FAF4DE' }}
              className="text-sm sm:text-base leading-relaxed max-w-2xl"
            >
              Welcome to <strong className="text-white">Saraswati Sweets, Barabanki</strong> (“Saraswati Sweets”, “we”, “our”, or “us”).
              We value the privacy of our customers and are committed to protecting the personal information shared with us through our website.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <div
                style={{ color: '#FAF4DE' }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/20"
              >
                <Clock className="w-3.5 h-3.5 text-[#F2C94C]" />
                <span>Last Updated: <strong className="text-white">15 October 2026</strong></span>
              </div>
              <div
                style={{ color: '#FAF4DE' }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 border border-white/20"
              >
                <MapPin className="w-3.5 h-3.5 text-[#F2C94C]" />
                <span className="text-white">Barabanki, Uttar Pradesh, India</span>
              </div>
            </div>
          </div>

          {/* Decorative Background Accents */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#C79A3D]/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-[#C79A3D]/10 blur-3xl pointer-events-none" />
        </header>

        {/* Quick Navigation Anchor Bar (Mobile & Tablet) */}
        <div className="lg:hidden bg-white rounded-2xl border border-[#E8DFD2] p-4 shadow-xs space-y-2">
          <div className="text-xs font-bold text-[#7A1129] uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Jump to Section</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className="text-xs px-2.5 py-1 rounded-md bg-[#FAF4DE] text-[#7A1129] hover:bg-[#F5EAD9] font-medium transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Grid: Sticky Desktop TOC + Policy Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Desktop Sticky Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E8DFD2] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8DFD2]">
                <ShieldCheck className="w-5 h-5 text-[#7A1129]" />
                <h2 className="font-display font-bold text-base text-[#1F1B16]">
                  Table of Contents
                </h2>
              </div>
              <nav aria-label="Table of contents" className="space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#6E6259] hover:text-[#7A1129] hover:bg-[#FAF4DE] transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{sec.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#C79A3D] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </nav>

              <div className="pt-4 border-t border-[#E8DFD2] space-y-2">
                <div className="text-[11px] font-semibold text-[#8A1538] uppercase tracking-wider">
                  Official Store Contact
                </div>
                <div className="text-xs text-[#6E6259] space-y-1">
                  <p className="font-semibold text-[#221A14]">{BUSINESS_INFO.name}</p>
                  <p>{BUSINESS_INFO.shortAddress}</p>
                  <a
                    href={BUSINESS_INFO.phoneTel}
                    className="block text-[#7A1129] font-medium hover:underline pt-1"
                  >
                    {BUSINESS_INFO.phone}
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Legal Policy Prose Content */}
          <article className="lg:col-span-8 bg-white rounded-3xl border border-[#E8DFD2] p-6 sm:p-10 md:p-12 shadow-xs space-y-10 sm:space-y-12">
            {/* Introductory Preamble */}
            <div className="space-y-4 pb-6 border-b border-[#E8DFD2] text-[#4A4036] leading-relaxed text-sm sm:text-base">
              <p>
                Welcome to <strong>Saraswati Sweets, Barabanki</strong> (“Saraswati Sweets”, “we”, “our”, or “us”).
                We value the privacy of our customers and are committed to protecting the personal information shared with us through our website.
              </p>
              <p>
                This Privacy Policy explains what information we may collect when you browse our website, create an account, place an order,
                make a payment, or contact us, how we use that information, and the choices available to you.
              </p>
              <div className="p-4 rounded-xl bg-[#FAF4DE] border border-[#C79A3D]/30 text-xs sm:text-sm text-[#5B4822] leading-relaxed font-medium">
                By accessing or using our website, you acknowledge that you have read this Privacy Policy.
                Where applicable, we will obtain any consent required by law.
              </div>
            </div>

            {/* Section 1 */}
            <section id="section-1" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>1. Information We Collect</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Depending on how you use our website, we may collect the following categories of information:
              </p>

              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-[#E8DFD2] bg-[#FBF6EF]/50 p-4 sm:p-5 space-y-2">
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#1F1B16] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7A1129]" />
                    Personal and Account Information
                  </h3>
                  <p className="text-sm text-[#4A4036] leading-relaxed">
                    When you create or access an account, we may collect information such as your name, email address,
                    and mobile number, as required for account identification, authentication, and customer communication.
                    If you use email-based OTP authentication, your email address and related authentication information may be
                    processed to verify your identity.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E8DFD2] bg-[#FBF6EF]/50 p-4 sm:p-5 space-y-2">
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#1F1B16] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7A1129]" />
                    Order and Delivery Information
                  </h3>
                  <p className="text-sm text-[#4A4036] leading-relaxed">
                    When you place an order, we may collect your order details, selected sweets and quantities,
                    product preferences, delivery address, contact number, order instructions, and order history.
                    This information is necessary to process orders and arrange delivery or fulfilment.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E8DFD2] bg-[#FBF6EF]/50 p-4 sm:p-5 space-y-2">
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#1F1B16] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7A1129]" />
                    Payment Information
                  </h3>
                  <p className="text-sm text-[#4A4036] leading-relaxed">
                    Online payments may be processed through <strong>Cashfree Payments</strong> or another payment provider
                    made available on our website. Payment providers may process transaction details, payment status,
                    and transaction identifiers to authorize and verify payments.
                  </p>
                  <p className="text-sm text-[#4A4036] leading-relaxed pt-1 font-medium">
                    We do not intend to collect or store your complete card number, CVV, UPI PIN, banking password,
                    or other payment authentication credentials on our own systems. Such information should be entered
                    only through the payment provider's authorized interface.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E8DFD2] bg-[#FBF6EF]/50 p-4 sm:p-5 space-y-2">
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#1F1B16] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7A1129]" />
                    Technical and Usage Information
                  </h3>
                  <p className="text-sm text-[#4A4036] leading-relaxed">
                    When you visit our website, technical information such as your IP address, browser type, device information,
                    timestamps, referring pages, and website activity may be processed through server logs or other technical mechanisms,
                    where applicable. This information may help us maintain website security, troubleshoot errors, and improve website performance.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>2. How We Use Your Information</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We may use the information collected for the following purposes:
              </p>
              <ul className="space-y-2.5 text-sm text-[#4A4036] leading-relaxed">
                {[
                  'To create and manage customer accounts and authenticate users.',
                  'To accept, process, confirm, and fulfil orders for sweets and other products.',
                  'To verify payments and maintain accurate order and transaction records.',
                  'To communicate order confirmations, delivery updates, cancellations, refunds, and customer support responses.',
                  'To send OTPs and essential account-related notifications.',
                  'To respond to customer questions, complaints, and requests.',
                  'To maintain website security, detect suspicious activity, prevent fraud, and troubleshoot technical problems.',
                  'To understand website usage and improve our products, services, and customer experience.',
                  'To send promotional messages or information about offers and new products where permitted by law and subject to applicable consent or opt-out requirements.',
                  'To comply with applicable legal, tax, accounting, and regulatory obligations.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#C79A3D] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-[#4A4036] leading-relaxed pt-2 italic">
                We seek to use personal information only for legitimate purposes relevant to our business.
              </p>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>3. Cookies and Similar Technologies</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Our website may use cookies, browser storage, or similar technologies where necessary to maintain website
                functionality, remember preferences, support account sessions, and improve the user experience.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                If analytics or advertising technologies are used, their collection and use of information will be subject
                to applicable law and any consent requirements. You may be able to manage cookies through your browser
                settings, although disabling certain technologies may affect website functionality.
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>4. When We Share Information</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We do not sell customers' personal information as a business practice. However, we may share relevant
                information with trusted service providers when necessary to operate our website and fulfil our services, including:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FAF4DE]/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#7A1129]">
                    <Database className="w-4 h-4 text-[#7A1129]" />
                    <span>Supabase</span>
                  </div>
                  <p className="text-xs text-[#5B4822]">
                    For database, account-related, and authentication functionality, where applicable.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FAF4DE]/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#7A1129]">
                    <CreditCard className="w-4 h-4 text-[#7A1129]" />
                    <span>Cashfree Payments</span>
                  </div>
                  <p className="text-xs text-[#5B4822]">
                    For processing and verifying online payments.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FAF4DE]/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#7A1129]">
                    <Send className="w-4 h-4 text-[#7A1129]" />
                    <span>ZeptoMail or Email Provider</span>
                  </div>
                  <p className="text-xs text-[#5B4822]">
                    For sending OTPs, order confirmations, and transactional notifications, as applicable.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FAF4DE]/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#7A1129]">
                    <Server className="w-4 h-4 text-[#7A1129]" />
                    <span>Railway or Hosting Provider</span>
                  </div>
                  <p className="text-xs text-[#5B4822]">
                    For hosting and operating website services.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FAF4DE]/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#7A1129]">
                    <Truck className="w-4 h-4 text-[#7A1129]" />
                    <span>Delivery & Fulfilment Partners</span>
                  </div>
                  <p className="text-xs text-[#5B4822]">
                    Where applicable, to deliver customer orders.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8DFD2] bg-[#FAF4DE]/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#7A1129]">
                    <Scale className="w-4 h-4 text-[#7A1129]" />
                    <span>Advisers & Authorities</span>
                  </div>
                  <p className="text-xs text-[#5B4822]">
                    When disclosure is required by law or necessary to establish, exercise, or defend legal claims.
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#4A4036] leading-relaxed pt-2">
                These providers may process information under their respective terms, privacy policies, and contractual obligations.
                We aim to share only information reasonably necessary for the relevant purpose.
              </p>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>5. Payment Security and Third-Party Websites</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Online transactions may involve third-party payment providers and other external services.
                When you use these services, your information may be processed under their own privacy policies and security practices.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Although we take reasonable measures to protect our website and customer information, no method of
                electronic transmission or storage can be guaranteed to be completely secure.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Customers should review the relevant third-party privacy policies before using external services.
                This Privacy Policy does not replace the policies applicable to those services.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>6. Data Retention</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We retain personal information for as long as reasonably necessary to fulfil the purposes described in this Policy,
                maintain customer accounts and order history, provide customer support, resolve disputes, prevent fraud,
                and meet applicable legal, tax, accounting, and regulatory requirements.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Where information is no longer required and no legal obligation requires its retention, we will take
                reasonable steps to delete it or anonymize it, subject to technical and operational limitations.
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>7. Data Security</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We use reasonable technical and organizational measures intended to protect personal information against
                unauthorized access, alteration, disclosure, loss, or misuse.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Access to customer information should be limited to authorized personnel and service providers who need it
                for legitimate business purposes. However, we cannot guarantee absolute security against every possible threat.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                If a personal data breach occurs, we will take appropriate steps in accordance with applicable legal requirements.
              </p>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>8. Your Privacy Rights and Choices</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Subject to applicable law, you may request access to, correction of, or deletion of your personal information.
                You may also request assistance regarding your account, object to certain processing, or withdraw consent
                where processing is based on consent.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Requests may be subject to identity verification, legal retention requirements, and other applicable limitations.
                Deleting certain information may affect our ability to maintain your account or fulfil future orders.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                You may also opt out of promotional communications where an opt-out facility is provided.
                Essential messages relating to account security, payments, or existing orders may still be necessary.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                To submit a privacy request, contact us using the details in the Contact Us section below.
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>9. Children's Privacy</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Our website is intended for general customers and is not specifically directed at children.
                Where applicable law requires parental or guardian consent for processing a child's personal information,
                we will follow the relevant legal requirements.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                If you believe that a child has provided personal information in circumstances where it should not have been collected,
                please contact us so that we can review the matter and take appropriate action.
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>10. External Links</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Our website may contain links to third-party websites or services. We do not control the privacy practices
                of external websites. We encourage you to review their privacy policies before sharing information with them.
              </p>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>11. Changes to This Privacy Policy</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our services, website functionality,
                business practices, or legal obligations.
              </p>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                Any revised version will be published on this page with an updated “Last Updated” date.
                Where required by law, we will provide notice or obtain consent for material changes.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="space-y-4 scroll-mt-28">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#7A1129] border-b border-[#E8DFD2] pb-3 flex items-center gap-2">
                <span>12. Contact Us</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4036] leading-relaxed">
                If you have questions, concerns, or requests regarding this Privacy Policy or the handling of your personal information, please contact:
              </p>

              <div className="rounded-2xl border-2 border-[#C79A3D]/40 bg-gradient-to-br from-[#FAF4DE]/50 to-white p-6 sm:p-8 space-y-5">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#1F1B16]">
                    {BUSINESS_INFO.legalName} (Saraswati Sweets)
                  </h3>
                  <p className="text-sm text-[#6E6259]">
                    Data Fiduciary & Consumer Grievance Redressal Desk — Barabanki, Uttar Pradesh, India
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="font-bold text-[#1F1B16] flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#7A1129]" />
                      Grievance & Privacy Email:
                    </span>
                    <a
                      href={`mailto:${BUSINESS_INFO.configuredSupportEmail}`}
                      className="text-[#7A1129] font-medium hover:underline block break-all"
                    >
                      {BUSINESS_INFO.configuredSupportEmail}
                    </a>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-[#1F1B16] flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#7A1129]" />
                      Helpline:
                    </span>
                    <a
                      href={BUSINESS_INFO.phoneTel}
                      className="text-[#7A1129] font-semibold hover:underline block"
                    >
                      {BUSINESS_INFO.phone}
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8DFD2] space-y-1">
                  <span className="font-bold text-[#1F1B16] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#7A1129]" />
                    Registered Premises:
                  </span>
                  <p className="text-sm text-[#4A4036] leading-relaxed">
                    {BUSINESS_INFO.address}
                  </p>
                  <div className="pt-2">
                    <a
                      href={BUSINESS_INFO.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A1129] hover:underline"
                    >
                      <span>Locate our store on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8DFD2] text-xs text-[#6E6259] leading-relaxed">
                  <strong>Statutory Redressal Standards:</strong> In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and the Digital Personal Data Protection Act, 2023, our Grievance Desk will acknowledge your privacy request or grievance within <strong>48 hours</strong> and provide complete resolution within <strong>30 days</strong>.
                </div>
              </div>

              <p className="text-sm text-[#4A4036] leading-relaxed pt-2">
                We will make reasonable efforts to review and respond to privacy-related requests in accordance with applicable law.
              </p>
            </section>

            {/* Closing Acknowledgment */}
            <div className="pt-8 border-t border-[#E8DFD2] space-y-3">
              <p className="text-xs sm:text-sm text-[#6E6259] leading-relaxed italic">
                By using our website, you acknowledge this Privacy Policy and the information provided about how personal information may be processed.
                Nothing in this Policy limits any rights you may have under applicable law.
              </p>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
};
