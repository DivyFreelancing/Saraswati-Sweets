/**
 * Canonical Business Contact Identity for Saraswati Sweets
 *
 * Strict single source of truth across backend services, notifications, and store settings.
 * All business contact details, addresses, and establishment metadata are defined here.
 */

export const BUSINESS_INFO = {
  /** Canonical Brand Name */
  name: 'Saraswati Sweets',

  /** Legal / Entity Name */
  legalName: 'Saraswati Sweets Private Limited',

  /** Full Canonical Address */
  address: 'Saraswati Sweets, Indira Market, Near Chaya Chauraha, Barabanki, Uttar Pradesh',

  /** Shortened Street / Counter Address */
  shortAddress: 'Indira Market, Near Chaya Chauraha, Barabanki',

  /** Key Landmark */
  landmark: 'Near Chaya Chauraha',

  /** City */
  city: 'Barabanki',

  /** State */
  state: 'Uttar Pradesh',

  /** Primary Postal Code */
  pincode: '225001',

  /** Official Mobile / Contact Number (Formatted) */
  phone: '+91 91611 10030',

  /** Unformatted 10-digit number */
  rawPhone: '9161110030',

  /** Click-to-call link */
  phoneTel: 'tel:+919161110030',

  /** Official WhatsApp Contact Number */
  whatsappNumber: '919161110030',

  /** Direct WhatsApp Chat URL */
  whatsappLink: 'https://wa.me/919161110030',

  /** Canonical Domain / Website URL */
  domain: 'https://saraswatisweetsbarabanki.com',

  /** Canonical Website Link */
  website: 'https://saraswatisweetsbarabanki.com',

  /** Year of Establishment */
  establishedYear: 1989,

  /** Standard Brand Tagline */
  tagline: 'Pure Desi Ghee Mithai & Artisanal Namkeen Since 1989',

  /** Store Operating Hours */
  openingHours: '6:30 AM – 10:00 PM',

  /** Complete Operating Schedule */
  operatingSchedule: 'Monday to Sunday: 6:30 AM – 10:00 PM IST (Open 365 Days)',

  /** Verified Google Maps Direct Directions Link */
  googleMapsUrl: 'https://maps.google.com/?q=Saraswati+Sweets+Indira+Market+Near+Chaya+Chauraha+Barabanki',

  /**
   * Configured Transactional Sender Mailbox (from ZeptoMail domain authorization).
   * Flagged for user confirmation before changing email-related settings.
   */
  configuredSenderEmail: 'order@saraswatisweetsbarabanki.com',

  /**
   * Configured Support & Store Inbox (existing fallback mailbox).
   * Flagged for user confirmation before changing email-related settings.
   */
  configuredSupportEmail: 'saraswatisweetsbarabanki@gmail.com',

  /** Verified FSSAI State License Number (Form C) */
  fssaiLicenseNumber: '12714022000190',
} as const;

export type BusinessInfo = typeof BUSINESS_INFO;
