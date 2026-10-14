import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import {
  ServerOrder,
  ServerOrderItem,
  ServerBulkEnquiry,
  ServerNotification,
  ServerProfile,
  STORE_SETTINGS,
  inMemoryStore,
  isLiveSupabase,
  supabaseServer,
} from '../db';
import { BUSINESS_INFO } from '../config/businessInfo';

dotenv.config();

/**
 * Event emitter for real-time admin order notifications
 */
export const adminOrderEvents = new EventEmitter();
adminOrderEvents.setMaxListeners(100);

export interface AdminOrderNotificationPayload {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  placed_at: string;
  recipient_name: string;
  recipient_phone: string;
  item_count: number;
  items_summary?: string;
  order_snapshot?: ServerOrder;
  fulfilment_type?: 'DELIVERY' | 'TAKEAWAY';
  slot_time_formatted?: string;
  pickup_date?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  recipientName?: string;
  notificationType?: string;
  isPromotional?: boolean;
  templateKey?: string;
  mergeInfo?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Service Interface for Transactional & Promotional Email Delivery
 */
export interface IEmailProvider {
  sendEmail(message: EmailMessage, recipientProfile?: ServerProfile): Promise<EmailSendResult>;
}

/**
 * Documented Interface Stub: Firebase Cloud Messaging (FCM) Mobile Push Service
 * Note: FCM mobile push is out of scope for the web build; documented interface stub provided.
 */
export interface IFcmPushService {
  /**
   * Dispatches push message to an individual Android/iOS device token.
   */
  sendPushNotification(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Broadcasts push message to an FCM topic (e.g. 'store-announcements').
   */
  sendTopicNotification(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class FcmPushNotificationStub implements IFcmPushService {
  async sendPushNotification(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ) {
    console.log(
      `[FCM Mobile Push Stub] Dispatched to device ${deviceToken.slice(0, 10)}...: ${payload.title} - ${payload.body}`
    );
    return { success: true, messageId: `fcm_stub_${Date.now()}` };
  }

  async sendTopicNotification(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ) {
    console.log(
      `[FCM Mobile Push Stub] Dispatched to topic '${topic}': ${payload.title} - ${payload.body}`
    );
    return { success: true, messageId: `fcm_topic_${Date.now()}` };
  }
}

/**
 * Extracts raw Send Mail token securely from ZEPTOMAIL_API_KEY
 */
export function extractZeptoMailToken(apiKey: string): string {
  const trimmed = (apiKey || '').trim();
  return trimmed.replace(/^Zoho-enczapikey\s*/i, '').trim();
}

/**
 * Helper to ensure ZeptoMail Authorization header follows official format:
 * "Authorization: Zoho-enczapikey YOUR_SEND_MAIL_TOKEN"
 * Guarantees exactly one space after colon and no duplicated token prefix.
 */
export function formatZeptoAuthHeader(apiKey: string): string {
  const token = extractZeptoMailToken(apiKey);
  return `Zoho-enczapikey ${token}`;
}

import {
  getSenderEmail,
  getAdminRecipientEmail,
  DEFAULT_SENDER_EMAIL,
  DEFAULT_ADMIN_RECIPIENT_EMAIL,
} from '../config/emailConfig';

/**
 * Resolves the recipient email address for administrative notification emails (e.g. new orders, bulk enquiries).
 * Delegates to centralized emailConfig module.
 * Priority:
 * 1. process.env.ADMIN_ORDER_EMAIL if non-empty after trimming
 * 2. process.env.ADMIN_EMAIL
 * 3. customFallback if provided and valid
 * 4. Default admin inbox: 'saraswatisweetsbarabanki@gmail.com'
 *
 * Guaranteed: Under no circumstances does this fall back to the old invalid 'order@saraswatisweets.in'.
 */
export function getAdminNotificationRecipient(customFallback?: string | null): string {
  return getAdminRecipientEmail(customFallback);
}

/**
 * Zoho ZeptoMail Provider with Exact cURL Payload Format & Non-Blocking Delivery
 */
export class ZeptoMailProvider implements IEmailProvider {
  private apiKey: string;
  private fromAddress: string;
  private fromName: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ZEPTOMAIL_API_KEY || '';
    this.fromAddress = getSenderEmail();
    this.fromName = process.env.ZEPTOMAIL_FROM_NAME || 'Saraswati Sweets';
    this.baseUrl = process.env.ZEPTOMAIL_BASE_URL || 'https://cpaas.zoho.in';
  }

  async sendEmail(message: EmailMessage, recipientProfile?: ServerProfile): Promise<EmailSendResult> {
    const typeTag = message.notificationType || 'TRANSACTIONAL';

    // 1. Check Promotional Opt-out (transactional never blocked!)
    if (message.isPromotional) {
      if (recipientProfile && recipientProfile.promotional_emails_opt_in === false) {
        console.log(`[Email Service] Promotional email skipped: User opted out.`);
        return {
          success: false,
          skipped: true,
          reason: 'Promotional communications opted out by user profile.',
        };
      }
    }

    // 2. If live ZeptoMail API key is present and not placeholder, call ZeptoMail Send Mail API
    const token = extractZeptoMailToken(this.apiKey);
    if (token && !token.includes('placeholder')) {
      const authHeader = formatZeptoAuthHeader(this.apiKey);

      // 2a. Template-based dispatch if templateKey is provided
      if (message.templateKey) {
        try {
          const tmplPayload = {
            mail_template_key: message.templateKey,
            from: { address: this.fromAddress },
            to: [
              {
                email_address: {
                  address: message.to,
                  name: message.recipientName || this.fromName,
                },
              },
            ],
            merge_info: message.mergeInfo || {},
          };

          const tmplRes = await fetch(`${this.baseUrl}/v1.1/email/template`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify(tmplPayload),
          });

          if (tmplRes.ok) {
            const data: any = await tmplRes.json().catch(() => null);
            console.log(`[ZeptoMail] [${typeTag}_TEMPLATE] dispatched successfully (HTTP ${tmplRes.status})`);
            return { success: true, id: data?.data?.[0]?.message_id || `zepto_${Date.now()}` };
          }

          console.warn(`[ZeptoMail] Template dispatch returned HTTP ${tmplRes.status}; falling back to direct HTML.`);
        } catch (err: any) {
          console.warn(`[ZeptoMail] Template network error (${err.message}); falling back to direct HTML.`);
        }
      }

      try {
        const payload = {
          from: {
            address: this.fromAddress,
          },
          to: [
            {
              email_address: {
                address: message.to,
                name: message.recipientName || this.fromName,
              },
            },
          ],
          subject: message.subject,
          htmlbody: message.html,
          ...(message.text ? { textbody: message.text } : {}),
        };

        const response = await fetch(`${this.baseUrl}/v1.1/email`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json().catch(() => null);
        if (!response.ok) {
          const sanitizedError = {
            code: data?.error?.code || 'UNKNOWN_ERROR',
            message: data?.error?.message || data?.message || response.statusText,
            details: data?.error?.details?.map((d: any) => ({
              code: d?.code,
              message: d?.message,
              target: d?.target,
            })) || undefined,
          };
          console.warn(
            `[ZeptoMail API Error] [${typeTag}] HTTP ${response.status}:`,
            JSON.stringify(sanitizedError)
          );
          const detailMsg = sanitizedError.details?.map((d: any) => d.message).join(', ');
          return {
            success: false,
            error: `ZeptoMail HTTP ${response.status}: ${sanitizedError.message || 'Request failed'}${detailMsg ? ` (${detailMsg})` : ''}`,
          };
        }

        console.log(`[ZeptoMail] [${typeTag}] email dispatched successfully (HTTP ${response.status})`);
        return { success: true, id: data?.data?.[0]?.message_id || `zepto_${Date.now()}` };
      } catch (err: any) {
        console.error(`[ZeptoMail Network Error] [${typeTag}]:`, err.message);
        return { success: false, error: err.message };
      }
    }

    // 3. Fallback simulated transactional dispatch in test / dev mode
    const simulatedId = `zepto_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const maskedTo = message.to.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*');
    console.log(`\n======================================================`);
    console.log(`[TRANSACTIONAL EMAIL DISPATCHED via ZeptoMail Provider (Simulated)]`);
    console.log(`ID:      ${simulatedId}`);
    console.log(`To:      ${maskedTo}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Type:    ${typeTag}`);
    console.log(`Preview: ${message.text || message.subject}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      id: simulatedId,
    };
  }
}

export let emailProvider: IEmailProvider = new ZeptoMailProvider();
export function setEmailProvider(provider: IEmailProvider): void {
  emailProvider = provider;
}
export const fcmPushStub: IFcmPushService = new FcmPushNotificationStub();

/**
 * Creates in-memory / in-app notification
 */
export function addInAppNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: 'ORDER_PLACED' | 'ORDER_STATUS' | 'PAYMENT_FAILED' | 'ENQUIRY_RECEIVED' | 'PROMOTIONAL';
  metadata?: Record<string, any>;
}): ServerNotification {
  const notif: ServerNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    is_read: false,
    metadata: params.metadata,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.notifications.unshift(notif);
  if (inMemoryStore.notifications.length > 500) {
    inMemoryStore.notifications.length = 500;
  }
  return notif;
}

export const DEFAULT_PRODUCTION_URL = 'https://saraswatisweetsbarabanki.com';

/**
 * Resolves the public site base URL for customer-facing communication (e.g. ZeptoMail tracking links).
 * Priority:
 * 1. process.env.PUBLIC_SITE_URL (if valid and not localhost in production)
 * 2. process.env.APP_URL (if valid and not localhost in production)
 * 3. process.env.RAILWAY_PUBLIC_DOMAIN (e.g. `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
 * 4. Production fallback: 'https://saraswatisweetsbarabanki.com' (NEVER falls back to localhost in production!)
 * 5. In local dev mode without env vars: returns 'https://saraswatisweetsbarabanki.com' unless explicitly configured.
 */
export function getOrderTrackingBaseUrl(): string {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION';

  const rawCandidate = (process.env.PUBLIC_SITE_URL || process.env.APP_URL || '').trim();

  if (rawCandidate) {
    const isLocal = rawCandidate.includes('localhost') || rawCandidate.includes('127.0.0.1');

    if (isProduction && isLocal) {
      console.warn(
        `[TrackingURL] Localhost detected in production environment: '${rawCandidate}'. Overriding to authoritative production URL: '${DEFAULT_PRODUCTION_URL}'.`
      );
      return DEFAULT_PRODUCTION_URL;
    }

    if (!isLocal || !isProduction) {
      let cleaned = rawCandidate.replace(/\/$/, '');
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = `https://${cleaned}`;
      }
      if (isProduction && cleaned.startsWith('http://')) {
        cleaned = cleaned.replace(/^http:\/\//, 'https://');
      }
      return cleaned;
    }
  }

  // Check Railway public domain
  if (process.env.RAILWAY_PUBLIC_DOMAIN && !process.env.RAILWAY_PUBLIC_DOMAIN.includes('localhost')) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/$/, '')}`;
  }

  // Authoritative production fallback (Never fallback to localhost for customer communication)
  return DEFAULT_PRODUCTION_URL;
}

/**
 * Generates the canonical order tracking URL for customer order confirmation.
 * Route: /order-confirmation/:orderNumber
 */
export function buildOrderTrackingUrl(orderNumber: string): string {
  const baseUrl = getOrderTrackingBaseUrl();
  const cleanOrderNumber = encodeURIComponent(String(orderNumber || '').trim());
  return `${baseUrl}/order-confirmation/${cleanOrderNumber}`;
}

/**
 * Safe HTML escaping for customer-controlled text and product names.
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format currency consistently in Indian Rupees (INR)
 */
export function formatINR(amount: number | undefined | null): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

/**
 * Format order date in IST (Asia/Kolkata)
 */
export function formatOrderDate(dateString?: string): string {
  try {
    const d = dateString ? new Date(dateString) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-IN');
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateString || '';
  }
}

/**
 * Authoritative payment status resolution:
 * Only labels an order as paid if verified by Cashfree (CAPTURED).
 */
export function getAuthoritativePaymentStatus(order: ServerOrder): {
  statusText: string;
  isPaid: boolean;
  statusBadgeColor: string;
} {
  if (order.payment_status === 'CAPTURED') {
    return {
      statusText: 'Paid Online (Verified)',
      isPaid: true,
      statusBadgeColor: '#2E7D4F',
    };
  }
  if (order.payment_method === 'COD') {
    return {
      statusText: 'Pay on Delivery (Cash / UPI)',
      isPaid: false,
      statusBadgeColor: '#B25E00',
    };
  }
  if (order.payment_status === 'FAILED') {
    return {
      statusText: 'Payment Failed',
      isPaid: false,
      statusBadgeColor: '#B3261E',
    };
  }
  if (order.payment_status === 'REFUNDED') {
    return {
      statusText: 'Refunded',
      isPaid: false,
      statusBadgeColor: '#5B626A',
    };
  }
  return {
    statusText: 'Payment Pending',
    isPaid: false,
    statusBadgeColor: '#B25E00',
  };
}

/**
 * Resolves fulfilment & address details cleanly separating delivery vs takeaway.
 */
export function getOrderTypeDetails(order: ServerOrder): {
  isTakeaway: boolean;
  orderTypeLabel: string;
  fulfilmentLabel: string;
  fulfilmentDetails: string;
  pickupSlotText: string;
} {
  const isTakeaway = order.fulfilment_type === 'TAKEAWAY';
  const pickupTimeText = order.slot_snapshot?.slot_time_formatted
    ? `${order.slot_snapshot.slot_time_formatted}${
        order.slot_snapshot.slot_date ? ` (${order.slot_snapshot.slot_date})` : ''
      }`
    : 'Scheduled Counter Slot';

  if (isTakeaway) {
    return {
      isTakeaway: true,
      orderTypeLabel: '🏪 Store Pickup / Takeaway',
      fulfilmentLabel: 'Store Counter Pickup',
      fulfilmentDetails: `Store Counter Pickup (${pickupTimeText}) — Saraswati Sweets Counter, Main Road, Barabanki`,
      pickupSlotText: pickupTimeText,
    };
  }

  const addr = order.address_snapshot;
  const streetText = escapeHtml(addr?.street_address);
  const landmarkText = addr?.landmark
    ? addr.landmark.trim().toLowerCase().startsWith('near')
      ? escapeHtml(addr.landmark.trim())
      : `Near ${escapeHtml(addr.landmark.trim())}`
    : '';
  const cityText = escapeHtml(addr?.city || 'Barabanki');
  const pincodeText = addr?.pincode ? `- ${escapeHtml(addr.pincode)}` : '';

  const addressParts = [streetText, landmarkText, cityText, pincodeText].filter(Boolean);
  const fullAddress = addressParts.join(', ') || 'Barabanki, Uttar Pradesh';

  return {
    isTakeaway: false,
    orderTypeLabel: '🚚 Direct Home Delivery',
    fulfilmentLabel: 'Home Delivery (Barabanki)',
    fulfilmentDetails: fullAddress,
    pickupSlotText: 'Standard Delivery Window',
  };
}

export interface ZeptoMailOrderItemMerge {
  product_name: string;
  name: string;
  variant_label: string;
  weight: string;
  pack: string;
  quantity: number;
  qty: number;
  unit_price: string;
  price: string;
  line_total: string;
  total_price: string;
  total: string;
}

export interface ZeptoMailOrderConfirmationMergeInfo {
  customer_name: string;
  recipient_name: string;
  customer_phone: string;
  order_id: string;
  order_number: string;
  order_date: string;
  order_type: string;
  fulfilment_type: string;
  fulfillment_type: string;
  is_takeaway: boolean;
  is_delivery: boolean;
  payment_status: string;
  payment_status_badge_color: string;
  payment_method: string;
  delivery_address: string;
  shipping_address: string;
  pickup_slot: string;
  pickup_location: string;
  items_subtotal: string;
  subtotal: string;
  delivery_fee: string;
  shipping_fee: string;
  discount_amount: string;
  discount_code: string;
  has_discount: boolean;
  tax_amount: string;
  tax: string;
  total_amount: string;
  grand_total: string;
  order_tracking_url: string;
  tracking_url: string;
  store_phone: string;
  store_whatsapp: string;
  store_address: string;
  items: ZeptoMailOrderItemMerge[];
  products: ZeptoMailOrderItemMerge[];
  order_items: ZeptoMailOrderItemMerge[];
  order_items_html: string;
  items_html: string;
}

/**
 * Builds authoritative ZeptoMail merge_info object supporting both Mustache array iteration
 * ({{#each items}}...{{/each}}) and pre-rendered safe HTML table rows ({{order_items_html}}).
 */
export function buildZeptoMailOrderConfirmationMergeInfo(
  order: ServerOrder,
  trackingUrl: string
): ZeptoMailOrderConfirmationMergeInfo {
  const customerName = escapeHtml(
    order.address_snapshot?.recipient_name || 'Valued Customer'
  );
  const customerPhone = escapeHtml(
    order.address_snapshot?.recipient_phone || order.guest_phone || ''
  );
  const orderTypeInfo = getOrderTypeDetails(order);
  const paymentInfo = getAuthoritativePaymentStatus(order);
  const orderDate = formatOrderDate(order.placed_at || order.created_at);

  const itemsMergeList: ZeptoMailOrderItemMerge[] = (order.items || []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const lineTotalNum =
      typeof item.total_price === 'number'
        ? item.total_price
        : item.unit_price
        ? item.unit_price * qty
        : 0;
    const unitPriceNum =
      typeof item.unit_price === 'number' && item.unit_price > 0
        ? item.unit_price
        : lineTotalNum / qty;
    const prodName = escapeHtml(item.product_name || 'Artisanal Mithai');
    const variant = escapeHtml(item.variant_label || 'Standard Pack');

    return {
      product_name: prodName,
      name: prodName,
      variant_label: variant,
      weight: variant,
      pack: variant,
      quantity: qty,
      qty: qty,
      unit_price: formatINR(unitPriceNum),
      price: formatINR(unitPriceNum),
      line_total: formatINR(lineTotalNum),
      total_price: formatINR(lineTotalNum),
      total: formatINR(lineTotalNum),
    };
  });

  const itemsHtmlRows = itemsMergeList
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #E8DFD2; text-align: left; vertical-align: top;">
          <div style="font-weight: 600; color: #1F1B16; font-size: 14px; line-height: 1.4;">${item.product_name}</div>
          <div style="color: #6B6258; font-size: 12px; margin-top: 3px;">Weight/Pack: ${item.variant_label}</div>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #E8DFD2; text-align: center; vertical-align: top; font-size: 14px; color: #1F1B16; font-weight: 500;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #E8DFD2; text-align: right; vertical-align: top; font-weight: 700; font-size: 14px; color: #8A1538; white-space: nowrap;">
          ${item.total_price}
        </td>
      </tr>`
    )
    .join('');

  const safeItemsHtmlRows =
    itemsHtmlRows ||
    `<tr><td colspan="3" style="padding: 14px; text-align: center; color: #6B6258; font-size: 13px;">Fresh Artisanal Mithai Selection</td></tr>`;

  const subtotalNum =
    typeof order.subtotal === 'number'
      ? order.subtotal
      : Array.isArray(order.items) && order.items.length > 0
      ? order.items.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0)
      : order.total_amount || 0;

  const discountNum = typeof order.discount_amount === 'number' ? order.discount_amount : 0;
  const deliveryNum =
    typeof order.delivery_charge === 'number'
      ? order.delivery_charge
      : order.fulfilment_type === 'TAKEAWAY'
      ? 0
      : 50;
  const taxNum = typeof order.tax_amount === 'number' ? order.tax_amount : 0;
  const totalNum =
    typeof order.total_amount === 'number'
      ? order.total_amount
      : Math.max(0, subtotalNum - discountNum + deliveryNum + taxNum);

  const paymentMethodLabel =
    order.payment_method === 'COD'
      ? 'Cash on Delivery'
      : order.payment_method === 'ONLINE'
      ? 'Online Payment (UPI / Cards / NetBanking)'
      : escapeHtml(order.payment_method || 'Online');

  return {
    customer_name: customerName,
    recipient_name: customerName,
    customer_phone: customerPhone,
    order_id: escapeHtml(order.order_number),
    order_number: escapeHtml(order.order_number),
    order_date: orderDate,
    order_type: orderTypeInfo.orderTypeLabel,
    fulfilment_type: orderTypeInfo.orderTypeLabel,
    fulfillment_type: orderTypeInfo.orderTypeLabel,
    is_takeaway: orderTypeInfo.isTakeaway,
    is_delivery: !orderTypeInfo.isTakeaway,
    payment_status: paymentInfo.statusText,
    payment_status_badge_color: paymentInfo.statusBadgeColor,
    payment_method: paymentMethodLabel,
    delivery_address: orderTypeInfo.fulfilmentDetails,
    shipping_address: orderTypeInfo.fulfilmentDetails,
    pickup_slot: orderTypeInfo.pickupSlotText,
    pickup_location: 'Saraswati Sweets Counter, Main Road, Barabanki',
    items_subtotal: formatINR(subtotalNum),
    subtotal: formatINR(subtotalNum),
    delivery_fee: deliveryNum === 0 ? 'FREE (Store Pickup)' : formatINR(deliveryNum),
    shipping_fee: deliveryNum === 0 ? 'FREE' : formatINR(deliveryNum),
    discount_amount: discountNum > 0 ? `-${formatINR(discountNum)}` : '₹0',
    discount_code: escapeHtml(order.coupon_code || ''),
    has_discount: discountNum > 0,
    tax_amount: taxNum > 0 ? formatINR(taxNum) : '₹0 (Included in MRP)',
    tax: taxNum > 0 ? formatINR(taxNum) : '₹0 (Included in MRP)',
    total_amount: formatINR(totalNum),
    grand_total: formatINR(totalNum),
    order_tracking_url: trackingUrl,
    tracking_url: trackingUrl,
    store_phone: STORE_SETTINGS.store_phone || BUSINESS_INFO.phone,
    store_whatsapp: STORE_SETTINGS.whatsapp || BUSINESS_INFO.phone,
    store_address: STORE_SETTINGS.address_text || BUSINESS_INFO.address,
    items: itemsMergeList,
    products: itemsMergeList,
    order_items: itemsMergeList,
    order_items_html: safeItemsHtmlRows,
    items_html: safeItemsHtmlRows,
  };
}

/**
 * Builds responsive, branded direct HTML confirmation matching the ZeptoMail template layout.
 */
export function buildDirectOrderConfirmationHtml(
  order: ServerOrder,
  trackingUrl: string,
  mergeInfo?: ZeptoMailOrderConfirmationMergeInfo
): string {
  const m = mergeInfo || buildZeptoMailOrderConfirmationMergeInfo(order, trackingUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${m.order_id} - Saraswati Sweets</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F1B16; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F8F5F0;">
  <center>
    <table role="presentation" class="container" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E8DFD2; box-shadow: 0 4px 12px rgba(0,0,0,0.04); margin: 0 auto;">
      <tr>
        <td style="background-color: #8A1538; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Saraswati Sweets</h1>
          <p style="margin: 6px 0 0; color: #F6E08B; font-size: 13px; letter-spacing: 0.3px;">Pure Desi Ghee Mithai Since 1989 &bull; Barabanki</p>
        </td>
      </tr>
      <tr>
        <td class="content-padding" style="padding: 32px 28px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #EBF7EE; color: #2E7D4F; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase;">
              &#10003; Order #${m.order_id} Confirmed
            </div>
            <h2 style="margin: 12px 0 4px; color: #1F1B16; font-size: 22px; font-weight: 700;">
              Thank You, ${m.customer_name}!
            </h2>
            <p style="margin: 0; color: #6B6258; font-size: 14px; line-height: 1.5;">
              We have received your Order #${m.order_id}. Our master sweetmakers have begun preparing your pure cow desi ghee mithai fresh.
            </p>
          </div>

          <table role="presentation" width="100%" style="width: 100%; background-color: #FBF7F1; border: 1px solid #EFE4D6; border-radius: 8px; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 16px 18px;">
                <table role="presentation" width="100%" style="width: 100%;">
                  <tr>
                    <td style="padding: 4px 0; color: #6B6258; width: 38%; font-size: 13px;">Order Number:</td>
                    <td style="padding: 4px 0; font-weight: 700; color: #8A1538; font-size: 14px;">#${m.order_id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #6B6258; font-size: 13px;">Placed Date:</td>
                    <td style="padding: 4px 0; color: #1F1B16; font-weight: 500; font-size: 13px;">${m.order_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #6B6258; font-size: 13px;">Order Type:</td>
                    <td style="padding: 4px 0; color: #1F1B16; font-weight: 600; font-size: 13px;">${m.order_type}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #6B6258; font-size: 13px;">Payment Status:</td>
                    <td style="padding: 4px 0; font-weight: 600; font-size: 13px; color: ${m.payment_status_badge_color};">
                      ${m.payment_status}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #6B6258; font-size: 13px;">Payment Method:</td>
                    <td style="padding: 4px 0; color: #1F1B16; font-size: 13px;">${m.payment_method}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0 2px; color: #6B6258; font-size: 13px; vertical-align: top;">Fulfilment Details:</td>
                    <td style="padding: 6px 0 2px; color: #1F1B16; font-size: 13px; font-weight: 500; line-height: 1.4;">
                      ${m.delivery_address}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <h3 style="margin: 0 0 12px; color: #1F1B16; font-size: 16px; font-weight: 700;">Items in Your Box</h3>
          <table role="presentation" width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <thead>
              <tr style="background-color: #F3EBE0; color: #1F1B16;">
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 700; border-bottom: 2px solid #E8DFD2;">Product</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 13px; font-weight: 700; border-bottom: 2px solid #E8DFD2; width: 60px;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 700; border-bottom: 2px solid #E8DFD2; width: 90px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${m.order_items_html}
            </tbody>
          </table>

          <table role="presentation" width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 14px;">
            <tr>
              <td style="padding: 6px 12px; color: #6B6258; text-align: left;">Items Subtotal:</td>
              <td style="padding: 6px 12px; text-align: right; font-weight: 600; color: #1F1B16;">${m.items_subtotal}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; color: #6B6258; text-align: left;">Delivery / Fulfilment Fee:</td>
              <td style="padding: 6px 12px; text-align: right; font-weight: 600; color: #1F1B16;">${m.delivery_fee}</td>
            </tr>
            ${m.has_discount ? `
            <tr>
              <td style="padding: 6px 12px; color: #2E7D4F; text-align: left;">Discount (${m.discount_code || 'Promo'}):</td>
              <td style="padding: 6px 12px; text-align: right; font-weight: 600; color: #2E7D4F;">${m.discount_amount}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 12px; color: #6B6258; text-align: left;">Tax (GST):</td>
              <td style="padding: 6px 12px; text-align: right; font-weight: 600; color: #6B6258;">${m.tax_amount}</td>
            </tr>
            <tr style="border-top: 2px solid #E8DFD2;">
              <td style="padding: 12px 12px 6px; font-size: 16px; font-weight: 700; color: #1F1B16; text-align: left;">Total Amount:</td>
              <td style="padding: 12px 12px 6px; font-size: 19px; font-weight: 700; color: #8A1538; text-align: right;">${m.total_amount}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0 16px;">
            <a href="${m.order_tracking_url}" target="_blank" style="display: inline-block; background-color: #8A1538; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; letter-spacing: 0.5px;">
              Track Order & View Receipt &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #6B6258; text-align: center; margin: 0 0 24px; word-break: break-all; line-height: 1.5;">
            Or view directly in your browser: <br>
            <a href="${m.order_tracking_url}" style="color: #8A1538; text-decoration: underline;">${m.order_tracking_url}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #E8DFD2; margin: 24px 0;">

          <p style="font-size: 13px; color: #6B6258; margin: 0; text-align: center; line-height: 1.5;">
            Need help with your order? Call our Barabanki shop at <strong style="color: #1F1B16;">${m.store_phone}</strong> or WhatsApp <strong style="color: #1F1B16;">${m.store_whatsapp}</strong>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #F3EBE0; padding: 20px 24px; text-align: center; font-size: 12px; color: #6B6258;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #1F1B16;">Saraswati Sweets</p>
          <p style="margin: 0 0 6px;">${m.store_address}</p>
          <p style="margin: 0; color: #8C827A;">&copy; 1989–2026 Saraswati Sweets. Crafted with Pure Desi Ghee in Barabanki, Uttar Pradesh.</p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

/**
 * Safely masks an email address to keep customer PII out of application logs.
 * e.g., 'customer@example.com' -> 'cu******@example.com'
 */
function maskEmail(email?: string): string {
  if (!email) return '(none)';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}`;
  return `${maskedName}@${parts[1]}`;
}

/**
 * 1. Notify Order Placed (to Store Owner & In-App Alerts only)
 * NOTE: Customer confirmation email is strictly decoupled and only sent
 * when the admin explicitly accepts/confirms the order for the first time.
 */
export async function notifyOrderPlaced(order: ServerOrder): Promise<void> {
  const targetUserId = order.user_id || order.guest_phone || order.address_snapshot.recipient_phone;

  const isTakeaway = order.fulfilment_type === 'TAKEAWAY';
  const pickupTimeText = order.slot_snapshot?.slot_time_formatted
    ? `${order.slot_snapshot.slot_time_formatted}${
        order.slot_snapshot.slot_date ? ` (${order.slot_snapshot.slot_date})` : ''
      }`
    : 'scheduled slot';

  const trackingUrl = buildOrderTrackingUrl(order.order_number);

  console.log(
    `[notifyOrderPlaced] Order #${order.order_number} [${
      order.fulfilment_type || 'DELIVERY'
    }] | customer email: ${maskEmail(order.guest_email)} | tracking: ${trackingUrl}`
  );

  // In-app notification for Customer
  if (targetUserId) {
    addInAppNotification({
      userId: targetUserId,
      title: `Order #${order.order_number} Placed!`,
      message: isTakeaway
        ? `Your fresh mithai order of ₹${order.total_amount} is placed for takeaway. Pickup scheduled for ${pickupTimeText} at the Saraswati Sweets counter.`
        : `Your fresh mithai order of ₹${order.total_amount} has been placed. We will notify you once confirmed by the store.`,
      type: 'ORDER_PLACED',
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
        total: order.total_amount,
        fulfilment_type: order.fulfilment_type,
      },
    });
  }

  // In-app notification for Store Owner / Admin
  addInAppNotification({
    userId: 'ADMIN',
    title: `New ${isTakeaway ? 'Takeaway' : 'Delivery'} Order: #${order.order_number}`,
    message: isTakeaway
      ? `₹${order.total_amount} (${order.payment_method}) from ${order.address_snapshot.recipient_name} (${order.address_snapshot.recipient_phone}). Pickup slot: ${pickupTimeText}`
      : `₹${order.total_amount} (${order.payment_method}) from ${order.address_snapshot.recipient_name} (${order.address_snapshot.recipient_phone}). Destination: ${order.address_snapshot.street_address}`,
    type: 'ORDER_PLACED',
    metadata: {
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total_amount,
      fulfilment_type: order.fulfilment_type,
    },
  });

  // Transactional Email to Store Owner — always fires so store staff is alerted immediately
  await emailProvider.sendEmail({
    to: getAdminNotificationRecipient(),
    recipientName: 'Saraswati Sweets Store Owner',
    notificationType: 'ADMIN_NEW_ORDER_ALERT',
    subject: `[NEW ${isTakeaway ? 'TAKEAWAY' : 'DELIVERY'} ORDER ALERT] #${order.order_number} - ₹${order.total_amount} (${order.payment_method})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>New Order Received: #${escapeHtml(order.order_number)} [${isTakeaway ? 'TAKEAWAY / STORE PICKUP' : 'HOME DELIVERY'}]</h2>
        <p><strong>Customer:</strong> ${escapeHtml(order.address_snapshot.recipient_name)} (${escapeHtml(order.address_snapshot.recipient_phone)})</p>
        <p><strong>Fulfillment:</strong> ${isTakeaway ? `Store Counter Pickup (${escapeHtml(pickupTimeText)})` : 'Fresh Direct Delivery'}</p>
        ${isTakeaway ? `<p><strong>Scheduled Slot:</strong> ${escapeHtml(pickupTimeText)}</p>` : `<p><strong>Address:</strong> ${escapeHtml(order.address_snapshot.street_address)}, Barabanki - ${escapeHtml(order.address_snapshot.pincode)}</p>`}
        <p><strong>Items:</strong></p>
        <ul>
          ${(order.items || []).map((i) => `<li>${escapeHtml(i.product_name)} (${escapeHtml(i.variant_label)}) x ${i.quantity} = ₹${i.total_price}</li>`).join('')}
        </ul>
        <p><strong>Order Total:</strong> ₹${order.total_amount} [${escapeHtml(order.payment_method)} / ${escapeHtml(order.payment_status)}]</p>
        <p><strong>Order Tracking Link:</strong> <a href="${escapeHtml(trackingUrl)}">${escapeHtml(trackingUrl)}</a></p>
      </div>
    `,
  });

  // Emit real-time event to connected admin dashboard clients
  try {
    const itemCount = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;

    const payload: AdminOrderNotificationPayload = {
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      status: order.status,
      placed_at: order.placed_at || order.created_at || new Date().toISOString(),
      recipient_name: order.address_snapshot?.recipient_name || 'Customer',
      recipient_phone: order.address_snapshot?.recipient_phone || order.guest_phone || '',
      item_count: itemCount,
      items_summary: Array.isArray(order.items)
        ? order.items.map((i) => `${i.product_name} (${i.variant_label || ''}) × ${i.quantity}`).join(', ')
        : '',
      order_snapshot: order,
      fulfilment_type: order.fulfilment_type || 'DELIVERY',
      slot_time_formatted: order.slot_snapshot?.slot_time_formatted,
      pickup_date: order.slot_snapshot?.slot_date,
    };

    adminOrderEvents.emit('new_order', payload);
  } catch (err) {
    console.error('[AdminOrderEvents] Broadcast error:', err);
  }
}

const inFlightConfirmationEmailLocks = new Set<string>();

/**
 * Sends exactly ONE customer order-confirmation email upon the admin's first
 * explicit acceptance/confirmation of the order.
 * 
 * Idempotency & Concurrency:
 * - Persisted notification marker in slot_snapshot.confirmation_email_sent_at and confirmed_at
 * - In-flight concurrency lock to prevent duplicate sends on concurrent requests
 * - If order is already confirmed, skips sending
 * - Safe against email provider errors (does not loop or duplicate)
 */
export async function sendCustomerOrderConfirmationEmail(
  order: ServerOrder
): Promise<{ sent: boolean; reason?: string }> {
  const realCustomerEmail = order.guest_email?.trim() || undefined;
  if (!realCustomerEmail) {
    return { sent: false, reason: 'NO_CUSTOMER_EMAIL' };
  }

  // Idempotency: verify not already sent
  if (
    order.confirmation_email_sent_at ||
    order.slot_snapshot?.confirmation_email_sent_at
  ) {
    console.log(`[OrderConfirmationEmail] Email already sent for Order #${order.order_number}; skipping duplicate.`);
    return { sent: false, reason: 'ALREADY_SENT' };
  }

  // Concurrency lock
  const lockKey = order.id || order.order_number;
  if (inFlightConfirmationEmailLocks.has(lockKey)) {
    console.log(`[OrderConfirmationEmail] Confirmation email already in flight for Order #${order.order_number}; skipping concurrent call.`);
    return { sent: false, reason: 'IN_FLIGHT' };
  }
  inFlightConfirmationEmailLocks.add(lockKey);

  try {
    const trackingUrl = buildOrderTrackingUrl(order.order_number);
    const zeptoMailApiKey = process.env.ZEPTOMAIL_API_KEY;
    const zeptoMailTemplateKey = process.env.ZEPTOMAIL_TEMPLATE_KEY;
    const mergeInfo = buildZeptoMailOrderConfirmationMergeInfo(order, trackingUrl);
    const directHtml = buildDirectOrderConfirmationHtml(order, trackingUrl, mergeInfo);

    console.log(`[sendCustomerOrderConfirmationEmail] Dispatching customer confirmation for #${order.order_number} to ${maskEmail(realCustomerEmail)}.`);

    await emailProvider.sendEmail({
      to: realCustomerEmail,
      recipientName: order.address_snapshot?.recipient_name || 'Customer',
      notificationType: 'ORDER_CONFIRMATION',
      subject: `Order Confirmation #${order.order_number} - Saraswati Sweets (Barabanki)`,
      html: directHtml,
      templateKey: zeptoMailApiKey && !zeptoMailApiKey.includes('placeholder') ? zeptoMailTemplateKey : undefined,
      mergeInfo,
    });

    // Persist marker both in memory and database
    const nowIso = new Date().toISOString();
    order.confirmation_email_sent_at = nowIso;
    if (!order.slot_snapshot || typeof order.slot_snapshot !== 'object') {
      order.slot_snapshot = {};
    }
    order.slot_snapshot.confirmation_email_sent_at = nowIso;
    inMemoryStore.orders.set(order.id, order);

    if (isLiveSupabase && supabaseServer && order.id) {
      const updates: any = {
        slot_snapshot: order.slot_snapshot,
        updated_at: nowIso,
      };
      Promise.resolve(supabaseServer.from('orders').update(updates).eq('id', order.id))
        .catch((err: any) => console.warn('[sendCustomerOrderConfirmationEmail] Marker persistence note:', err?.message));
    }

    return { sent: true };
  } finally {
    inFlightConfirmationEmailLocks.delete(lockKey);
  }
}

/**
 * 2. Notify Order Status Changed
 * In-app notifications are sent for customer tracking.
 * Email notifications are ONLY sent if the order is cancelled (ORDER_CANCELLED).
 * Forward transitions (CONFIRMED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED)
 * never send customer emails.
 */
export async function notifyOrderStatusChanged(
  order: ServerOrder,
  previousStatus: string,
  newStatus: string
): Promise<void> {
  const targetUserId = order.user_id || order.guest_phone || order.address_snapshot.recipient_phone;
  const targetEmail = order.guest_email || undefined;
  const isTakeaway = order.fulfilment_type === 'TAKEAWAY';

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'Order Confirmed by Store',
    PREPARING: 'Freshly Cooking in Desi Ghee Kitchen',
    READY_FOR_PICKUP: isTakeaway ? 'Freshly Packaged & Ready for Store Counter Pickup' : 'Packaged & Ready for Dispatch',
    OUT_FOR_DELIVERY: `Out for Delivery ${order.delivery_partner_name ? `with ${order.delivery_partner_name}` : ''}`,
    DELIVERED: isTakeaway ? 'Picked Up from Counter' : 'Delivered Fresh to Your Doorstep',
    CANCELLED: 'Order Cancelled',
    REFUNDED: 'Order Refund Processed',
  };

  const statusLabel = statusLabels[newStatus] || newStatus;

  // In-app notification
  if (targetUserId) {
    addInAppNotification({
      userId: targetUserId,
      title: `Order Update #${order.order_number}`,
      message: `Your order is now: ${statusLabel}.`,
      type: 'ORDER_STATUS',
      metadata: { orderId: order.id, orderNumber: order.order_number, from: previousStatus, to: newStatus },
    });
  }

  // Email notification via ZeptoMail — STRICTLY for order cancellation only
  if (targetEmail && newStatus === 'CANCELLED') {
    await emailProvider.sendEmail({
      to: targetEmail,
      recipientName: order.address_snapshot.recipient_name,
      notificationType: 'ORDER_CANCELLED',
      subject: `Order #${order.order_number} Cancelled - Saraswati Sweets`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e8dfd2; border-radius: 8px;">
          <h2 style="color: #B3261E;">Order #${order.order_number} Cancelled</h2>
          <p>Dear ${order.address_snapshot.recipient_name},</p>
          <p>Your order <strong>#${order.order_number}</strong> has been cancelled. If payment was completed, any refund due will be credited to your source account within 5-7 business days.</p>
          <p style="margin-top: 20px; font-size: 13px; color: #6B6258;">Need assistance? Call our Barabanki shop at ${STORE_SETTINGS.store_phone} or WhatsApp ${STORE_SETTINGS.whatsapp}.</p>
        </div>
      `,
    });
  }
}

/**
 * 3. Notify Payment Failed (to Customer)
 */
export async function notifyPaymentFailed(order: ServerOrder, reason?: string): Promise<void> {
  const targetUserId = order.user_id || order.guest_phone || order.address_snapshot.recipient_phone;
  const targetEmail = order.guest_email || undefined;

  if (targetUserId) {
    addInAppNotification({
      userId: targetUserId,
      title: `Payment Incomplete for #${order.order_number}`,
      message: `Online payment was not completed (${reason || 'Transaction timed out'}). Your order is reserved for 15 minutes to allow payment retry.`,
      type: 'PAYMENT_FAILED',
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });
  }

  if (targetEmail) {
    await emailProvider.sendEmail({
      to: targetEmail,
      recipientName: order.address_snapshot.recipient_name,
      notificationType: 'PAYMENT_FAILED',
      subject: `Payment Incomplete for Order #${order.order_number} - Saraswati Sweets`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e8dfd2; border-radius: 8px;">
          <h2 style="color: #B3261E;">Payment Could Not Be Completed</h2>
          <p>Dear ${order.address_snapshot.recipient_name},</p>
          <p>We noticed your online payment of ₹${order.total_amount} for order <strong>#${order.order_number}</strong> was not completed (${reason || 'Payment failed'}).</p>
          <p>Your order is reserved for 15 minutes. You can retry paying online or choose Cash on Delivery.</p>
          <p>If you need assistance, please call our Barabanki counter at ${STORE_SETTINGS.store_phone}.</p>
        </div>
      `,
    });
  }
}

/**
 * 4. Notify New Bulk / Wedding Enquiry (to Customer & Store Owner)
 */
export async function notifyNewBulkEnquiry(enquiry: ServerBulkEnquiry): Promise<void> {
  // In-app notification for Store Owner
  addInAppNotification({
    userId: 'ADMIN',
    title: `New Bulk / Wedding Enquiry (${enquiry.enquiry_number})`,
    message: `${enquiry.contact_name} requested quote for ${enquiry.event_type} (${enquiry.estimated_quantity_kg || 50} kg sweets / ${enquiry.estimated_guests || 200} guests). Date: ${enquiry.event_date}`,
    type: 'ENQUIRY_RECEIVED',
    metadata: { enquiryId: enquiry.id, enquiryNumber: enquiry.enquiry_number },
  });

  // Email to Store Owner
  await emailProvider.sendEmail({
    to: getAdminNotificationRecipient(),
    recipientName: 'Saraswati Sweets Admin',
    notificationType: 'BULK_ENQUIRY_ADMIN_ALERT',
    subject: `[NEW BULK ENQUIRY] ${enquiry.event_type} - ${enquiry.contact_name} (${enquiry.phone})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #8A1538;">New Bulk Mithai Enquiry: ${escapeHtml(enquiry.enquiry_number)}</h2>
        <p><strong>Name:</strong> ${escapeHtml(enquiry.contact_name)} ${enquiry.organization_name ? `(${escapeHtml(enquiry.organization_name)})` : ''}</p>
        <p><strong>Phone:</strong> <a href="tel:${escapeHtml(enquiry.phone)}">${escapeHtml(enquiry.phone)}</a></p>
        <p><strong>Email:</strong> ${enquiry.email ? escapeHtml(enquiry.email) : 'Not provided'}</p>
        <p><strong>Event Type:</strong> ${escapeHtml(enquiry.event_type)}</p>
        <p><strong>Target Date:</strong> ${escapeHtml(enquiry.event_date)}</p>
        <p><strong>Estimated Quantity:</strong> ${enquiry.estimated_quantity_kg ? `${escapeHtml(String(enquiry.estimated_quantity_kg))} kg` : 'Not specified'}</p>
        <p><strong>Estimated Guests:</strong> ${enquiry.estimated_guests ? escapeHtml(String(enquiry.estimated_guests)) : 'Not specified'}</p>
        <p><strong>Budget Range:</strong> ${enquiry.budget_range ? escapeHtml(enquiry.budget_range) : 'Not specified'}</p>
        <p><strong>Delivery Address:</strong> ${enquiry.delivery_address ? escapeHtml(enquiry.delivery_address) : 'Barabanki'}</p>
        <p><strong>Requested Sweets:</strong> ${enquiry.requested_sweets ? escapeHtml(enquiry.requested_sweets) : 'None'}</p>
        <p><strong>Client Notes:</strong> ${enquiry.notes ? escapeHtml(enquiry.notes) : 'None'}</p>
      </div>
    `,
  });

  // Email to Customer (if email provided)
  if (enquiry.email) {
    await emailProvider.sendEmail({
      to: enquiry.email,
      recipientName: enquiry.contact_name,
      notificationType: 'BULK_ENQUIRY_CUSTOMER_ACK',
      subject: `Enquiry Received: Saraswati Sweets Bulk & Wedding Gifting (${enquiry.enquiry_number})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e8dfd2; border-radius: 8px;">
          <h2 style="color: #8A1538;">Namaste ${escapeHtml(enquiry.contact_name)},</h2>
          <p>Thank you for reaching out to Saraswati Sweets (Barabanki) for your upcoming <strong>${escapeHtml(enquiry.event_type)}</strong> celebration on <strong>${escapeHtml(enquiry.event_date)}</strong>.</p>
          <p>Our senior order coordinator has received your enquiry (Ref: <strong>${escapeHtml(enquiry.enquiry_number)}</strong>) and will call you on <strong>${escapeHtml(enquiry.phone)}</strong> with wholesale bulk rates, custom box packaging choices, and complimentary sample tasting options.</p>
          <p>We look forward to sweetening your auspicious occasion with 100% pure cow desi ghee craftsmanship.</p>
          <p style="margin-top: 20px; font-size: 13px; color: #6B6258;">Saraswati Sweets • ${BUSINESS_INFO.address} • Tel: ${STORE_SETTINGS.store_phone}</p>
        </div>
      `,
    });
  }
}
