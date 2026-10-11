/**
 * Saraswati Sweets - Centralized Email Configuration & Resolution Module
 *
 * Defines canonical email addresses and resolution rules for:
 * 1. Verified Sender Address (ZeptoMail sender):
 *    - Defaults to 'order@saraswatisweetsbarabanki.com' (authorized ZeptoMail sender domain).
 *    - Configurable via process.env.ZEPTOMAIL_FROM_ADDRESS.
 *    - Not assumed to have a receiving inbox.
 *
 * 2. Store Owner / Admin Receiving Inbox:
 *    - Defaults to 'saraswatisweetsbarabanki@gmail.com' (admin's actual personal inbox).
 *    - Configurable via process.env.ADMIN_ORDER_EMAIL (or process.env.ADMIN_EMAIL).
 *    - Receives new-order alerts, bulk enquiry alerts, and store-owner notifications.
 *    - Always takes precedence over database or in-memory store settings.
 *
 * 3. Disallowed Legacy Domains:
 *    - 'saraswatisweets.in' does NOT exist and is strictly rejected everywhere.
 */

export const DEFAULT_SENDER_EMAIL = 'order@saraswatisweetsbarabanki.com';
export const DEFAULT_ADMIN_RECIPIENT_EMAIL = 'saraswatisweetsbarabanki@gmail.com';
export const DISALLOWED_EMAIL_DOMAINS = ['saraswatisweets.in'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates whether a given string is a syntactically valid email address.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 5 && EMAIL_REGEX.test(trimmed);
}

/**
 * Checks whether an email address belongs to a disallowed or non-existent domain.
 */
export function isDisallowedDomain(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  return DISALLOWED_EMAIL_DOMAINS.some((domain) => lower.includes(domain));
}

/**
 * Sanitizes and validates an email string.
 * Returns the trimmed email if valid and not from a disallowed domain; otherwise null.
 */
export function sanitizeEmail(email?: string | null, fieldName = 'email'): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim();
  if (!trimmed) return null;

  if (isDisallowedDomain(trimmed)) {
    console.warn(`[EmailConfig] Disallowed domain detected in ${fieldName}: '${trimmed}'. Rejecting address.`);
    return null;
  }

  if (!isValidEmail(trimmed)) {
    console.warn(`[EmailConfig] Invalid email syntax in ${fieldName}: '${trimmed}'. Rejecting address.`);
    return null;
  }

  return trimmed;
}

/**
 * Resolves the verified sender email address for outbound emails (e.g., ZeptoMail).
 * Priority:
 * 1. process.env.ZEPTOMAIL_FROM_ADDRESS (if valid and not disallowed)
 * 2. DEFAULT_SENDER_EMAIL ('order@saraswatisweetsbarabanki.com')
 */
export function getSenderEmail(): string {
  const envSender = sanitizeEmail(process.env.ZEPTOMAIL_FROM_ADDRESS, 'ZEPTOMAIL_FROM_ADDRESS');
  if (envSender) {
    return envSender;
  }
  return DEFAULT_SENDER_EMAIL;
}

/**
 * Resolves the recipient email address for store-owner / administrative alerts.
 * Priority:
 * 1. process.env.ADMIN_ORDER_EMAIL (environment takes precedence over DB / in-memory settings)
 * 2. process.env.ADMIN_EMAIL (canonical fallback env var)
 * 3. Optional custom fallback (if provided, valid, and not disallowed)
 * 4. DEFAULT_ADMIN_RECIPIENT_EMAIL ('saraswatisweetsbarabanki@gmail.com')
 *
 * Guarantees:
 * - Environment variables ALWAYS take precedence over store settings.
 * - Under NO circumstances will an email with 'saraswatisweets.in' be returned.
 * - Never returns null or empty string.
 */
export function getAdminRecipientEmail(customFallback?: string | null): string {
  // 1. Check primary environment variable
  const envAdminOrder = sanitizeEmail(process.env.ADMIN_ORDER_EMAIL, 'ADMIN_ORDER_EMAIL');
  if (envAdminOrder) {
    return envAdminOrder;
  }

  // 2. Check secondary admin email environment variable
  const envAdmin = sanitizeEmail(process.env.ADMIN_EMAIL, 'ADMIN_EMAIL');
  if (envAdmin) {
    return envAdmin;
  }

  // 3. Check custom fallback if supplied (e.g. from runtime context, but validated)
  const sanitizedCustom = sanitizeEmail(customFallback, 'customFallback');
  if (sanitizedCustom) {
    return sanitizedCustom;
  }

  // 4. Default admin inbox
  return DEFAULT_ADMIN_RECIPIENT_EMAIL;
}

/**
 * Safe summary of active email configuration (never exposes secrets or keys).
 */
export function getEmailConfigSummary() {
  return {
    senderEmail: getSenderEmail(),
    adminRecipientEmail: getAdminRecipientEmail(),
    defaultSender: DEFAULT_SENDER_EMAIL,
    defaultAdminInbox: DEFAULT_ADMIN_RECIPIENT_EMAIL,
    disallowedDomains: DISALLOWED_EMAIL_DOMAINS,
  };
}
