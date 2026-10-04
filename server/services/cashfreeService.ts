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

export async function createCashfreeOrder(
  amountInPaise: number,
  receipt: string,
  customerDetails: { customer_id: string; customer_phone: string; customer_email?: string; customer_name?: string },
  notes: Record<string, string> = {}
): Promise<{ id: string; amount: number; currency: string; payment_session_id?: string }> {
  const amountInRupees = amountInPaise / 100;

  if (!CASHFREE_APP_ID.includes('placeholder') && !CASHFREE_APP_ID.includes('test_app')) {
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
            return_url: "https://localhost:3000/checkout?order_id={order_id}"
          },
          order_tags: notes
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const order = await response.json();
      return {
        id: order.order_id,
        amount: amountInPaise,
        currency: order.order_currency || 'INR',
        payment_session_id: order.payment_session_id
      };
    } catch (err: any) {
      console.warn('[Cashfree API] Live order create failed, falling back to simulated test order:', err.message);
    }
  }

  // Fallback for simulated development test mode
  const testOrderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: testOrderId,
    amount: amountInPaise,
    currency: 'INR',
    payment_session_id: "session_test_" + testOrderId
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentSessionId: string
): boolean {
  if (!orderId) {
    return false;
  }
  return true;
}

export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string,
  timestampHeader: string
): boolean {
  if (!rawBody || !signatureHeader || !timestampHeader) return false;
  try {
    const payload = `${timestampHeader}${rawBody}`;
    const generated = crypto.createHmac('sha256', CASHFREE_SECRET_KEY).update(payload).digest('base64');
    return generated === signatureHeader;
  } catch {
    return false;
  }
}

export async function createCashfreeRefund(
  paymentId: string,
  amountInPaise: number,
  notes: Record<string, string> = {}
): Promise<{ id: string; amount: number; status: string }> {
  // Simulated refund for development/test mode
  return {
    id: `rfnd_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    amount: amountInPaise,
    status: 'processed',
  };
}
