import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

export const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'test_app_id';
export const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'test_secret_key';
export const CASHFREE_ENVIRONMENT = process.env.CASHFREE_ENVIRONMENT || 'SANDBOX'; // SANDBOX or PRODUCTION

const API_BASE = CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

export function getCashfreeAppId(): string {
  return CASHFREE_APP_ID;
}

export function getPublicSiteUrl(): string {
  const url = process.env.PUBLIC_SITE_URL || process.env.APP_URL;
  const isProd = process.env.NODE_ENV === 'production' || CASHFREE_ENVIRONMENT === 'PRODUCTION';

  if (isProd) {
    if (!url || url.includes('localhost') || url.includes('127.0.0.1') || !url.startsWith('https://')) {
      throw new Error(
        'FATAL CONFIG ERROR: PUBLIC_SITE_URL (or APP_URL) must be configured in production with a valid public HTTPS URL (must start with "https://").'
      );
    }
    return url.replace(/\/$/, '');
  }

  return (url || 'http://localhost:3000').replace(/\/$/, '');
}

export class CashfreeOrderCreationError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 502, details?: any) {
    super(message);
    this.name = 'CashfreeOrderCreationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function createCashfreeOrder(
  amountInPaise: number,
  receipt: string,
  customerDetails: { customer_id: string; customer_phone: string; customer_email?: string; customer_name?: string },
  notes: Record<string, string> = {},
  orderExpiryTime?: string
): Promise<{ id: string; amount: number; currency: string; payment_session_id?: string }> {
  // Convert amount from paise to rupees for Cashfree order creation
  const amountInRupees = Number((amountInPaise / 100).toFixed(2));
  // Default Cashfree auto-expiry: 20 minutes from checkout
  const expiryIso = orderExpiryTime || new Date(Date.now() + 20 * 60 * 1000).toISOString();
  const siteUrl = getPublicSiteUrl();

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    CASHFREE_ENVIRONMENT === 'PRODUCTION' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT);

  const hasPlaceholderCreds = isPlaceholderOrMissingCredentials(CASHFREE_APP_ID, CASHFREE_SECRET_KEY);

  // In production, placeholder credentials MUST fail closed
  if (isProduction && hasPlaceholderCreds) {
    throw new CashfreeOrderCreationError(
      'Payment gateway credentials not configured for production environment',
      503
    );
  }

  // Simulation mode is ONLY permitted for non-production environments with placeholder credentials
  if (!isProduction && hasPlaceholderCreds) {
    const testOrderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      id: testOrderId,
      amount: amountInPaise,
      currency: 'INR',
      payment_session_id: "session_test_" + testOrderId
    };
  }

  // Live gateway invocation: Never fall back to simulated orders upon error
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        order_amount: amountInRupees,
        order_currency: 'INR',
        order_id: receipt.slice(0, 40),
        customer_details: {
          customer_id: customerDetails.customer_id.substring(0, 50),
          customer_phone: customerDetails.customer_phone || "9999999999",
          customer_email: customerDetails.customer_email || "test@test.com",
          customer_name: customerDetails.customer_name || "Customer"
        },
        order_meta: {
          return_url: `${siteUrl}/checkout?order_id={order_id}`,
          order_expiry_time: expiryIso
        },
        order_tags: notes
      })
    });

    if (!response.ok) {
      let errBody: any = null;
      try {
        errBody = await response.json();
      } catch (_) {}
      const errMsg = errBody?.message || `Cashfree API returned HTTP ${response.status}`;
      throw new CashfreeOrderCreationError(
        `Failed to create order on payment gateway: ${errMsg}`,
        response.status >= 500 ? 502 : 503,
        errBody
      );
    }

    const order = await response.json();
    return {
      id: order.order_id, // Cashfree merchant order ID passed in request
      amount: amountInPaise,
      currency: order.order_currency || 'INR',
      payment_session_id: order.payment_session_id
    };
  } catch (err: any) {
    console.error('[Cashfree API] Live order create failed:', err.message);
    if (err instanceof CashfreeOrderCreationError) {
      throw err;
    }
    throw new CashfreeOrderCreationError(
      `Payment gateway network failure: ${err.message}`,
      502
    );
  }
}

export interface CashfreeOrderDetails {
  status: 'PAID' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED' | 'FAILED' | 'UNKNOWN';
  orderAmount?: number;
  orderCurrency?: string;
  isNetworkError?: boolean;
  rawData?: any;
}

export function isPlaceholderOrMissingCredentials(
  appId: string = CASHFREE_APP_ID,
  secret: string = CASHFREE_SECRET_KEY
): boolean {
  if (!appId || !secret) return true;
  const app = appId.toLowerCase();
  const sec = secret.toLowerCase();
  return (
    app.includes('placeholder') ||
    sec.includes('placeholder') ||
    app.includes('test_app_id') ||
    sec.includes('test_secret_key') ||
    app === 'your_app_id' ||
    sec === 'your_secret_key'
  );
}

export async function fetchCashfreeOrderDetails(orderId: string): Promise<CashfreeOrderDetails> {
  if (!orderId) return { status: 'FAILED' };

  // Fail closed if credentials are missing or placeholder: never auto-verify as PAID
  if (isPlaceholderOrMissingCredentials()) {
    console.warn('[Cashfree API] Missing, placeholder, or unconfigured credentials: fail closed.');
    return { status: 'FAILED', isNetworkError: false };
  }

  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Cashfree API] Failed to fetch order status. HTTP ${response.status}`);
      if (response.status === 404) {
        return { status: 'FAILED' };
      }
      return { status: 'UNKNOWN', isNetworkError: true };
    }

    const data = await response.json();
    const orderStatus = data.order_status;
    return {
      status: orderStatus === 'PAID' ? 'PAID'
            : orderStatus === 'ACTIVE' ? 'ACTIVE'
            : orderStatus === 'EXPIRED' ? 'EXPIRED'
            : orderStatus === 'TERMINATED' ? 'TERMINATED'
            : orderStatus === 'TERMINATION_REQUESTED' ? 'TERMINATION_REQUESTED'
            : orderStatus === 'FAILED' ? 'FAILED'
            : 'UNKNOWN',
      orderAmount: data.order_amount,
      orderCurrency: data.order_currency,
      rawData: data,
    };
  } catch (err: any) {
    console.error('[Cashfree API] Network error verifying order:', err.message);
    return { status: 'UNKNOWN', isNetworkError: true };
  }
}

export async function verifyCashfreeOrderStatus(orderId: string): Promise<string> {
  const details = await fetchCashfreeOrderDetails(orderId);
  return details.status;
}


export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string,
  timestampHeader: string
): boolean {
  if (!rawBody || !signatureHeader || !timestampHeader) return false;
  if (isPlaceholderOrMissingCredentials()) return false;

  try {
    const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    if (!rawString.trim()) return false;

    const payload = `${timestampHeader}${rawString}`;
    const generated = crypto.createHmac('sha256', CASHFREE_SECRET_KEY).update(payload).digest('base64');

    const genBuf = Buffer.from(generated, 'utf8');
    const sigBuf = Buffer.from(signatureHeader, 'utf8');

    if (genBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function createCashfreeRefund(
  orderId: string,
  amountInPaise: number,
  notes: Record<string, string> = {}
): Promise<any> {
  const amountInRupees = amountInPaise / 100;
  const refundId = `rfnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (!CASHFREE_APP_ID.includes('placeholder') && !CASHFREE_APP_ID.includes('test_app')) {
    const response = await fetch(`${API_BASE}/orders/${orderId}/refunds`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: amountInRupees,
        refund_id: refundId,
        refund_note: notes.reason || 'Store refund'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Cashfree Refund API failed (${response.status}): ${JSON.stringify(errData)}`);
    }

    const refundResult = await response.json();
    return refundResult;
  }

  // Fallback for simulated development test mode
  return {
    cf_refund_id: 'sim_cf_rfnd_' + Date.now(),
    refund_id: refundId,
    order_id: orderId,
    refund_amount: amountInRupees,
    refund_status: 'SUCCESS', // Simulate immediate success in local dev
    refund_note: notes.reason || ''
  };
}

export async function fetchCashfreeRefund(orderId: string, refundId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/refunds/${refundId}`, {
    method: 'GET',
    headers: {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': '2023-08-01',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Cashfree Fetch Refund API failed (${response.status})`);
  }

  return await response.json();
}
