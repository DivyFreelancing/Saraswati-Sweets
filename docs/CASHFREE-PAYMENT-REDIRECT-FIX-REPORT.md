# Cashfree Payment Redirect Fix Report

## 1. Root cause
- **Fake Verification:** The backend `/api/payments/verify` was using a stub method `verifyPaymentSignature` that unconditionally returned `true`, completely ignoring the actual Cashfree API state.
- **Frontend State Collision:** Upon success, `CheckoutPage.tsx` called `onOrderSuccess()` which triggered a client-side navigation to `/order-confirmation/X`. However, it immediately followed that with `window.history.replaceState({}, '', '/')`, overriding the URL and dropping the user back at the homepage instead of showing the confirmation.
- **Pending Mishandling:** The frontend aggressively marked any non-success (including `PENDING`) as an outright failure, throwing the user back to the checkout page unnecessarily.

## 2. Files changed
- `server/services/cashfreeService.ts`: Replaced the stub signature function with `verifyCashfreeOrderStatus()`, which hits `GET /orders/{order_id}` on the Cashfree API.
- `server/routes/paymentRoutes.ts`: Refactored `/api/payments/verify` to branch based on true Cashfree status (`PAID`, `PENDING`, `FAILED`), dropping the fake signature check.
- `src/pages/CheckoutPage.tsx`: Handled `data.pending` appropriately. Removed the conflicting `replaceState` to `/` on success.

## 3. Cashfree callback/return flow
Cashfree redirects to `/checkout?order_id=xyz`. The frontend's `useEffect` picks up the `order_id` and POSTs to the backend at `/api/payments/verify`.

## 4. Backend verification flow
The backend receives `cashfree_order_id`, looks it up via the Cashfree SDK/API (`GET /orders/{order_id}`), reads the authoritative `order_status` directly from the provider, and updates the local database only if it is `PAID`. 

## 5. Webhook behavior
Webhooks continue to hit `/api/payments/webhook/cashfree`, where signatures are verified. If a webhook arrives before the frontend verification, idempotency ensures the DB is updated only once (both paths check for `CAPTURED` state to prevent duplicate operations).

## 6. Redirect route
Once `/api/payments/verify` returns `success: true`, the frontend invokes `onOrderSuccess`, which routes via `pushState` to `/order-confirmation/{order_number}`.

## 7. Order confirmation behavior
The existing `OrderConfirmationPage` handles rendering the finalized order state (Paid, Order Number, Delivery, Cart snapshot).

## 8. Failure handling
If `cashfreeStatus` returns `FAILED` (or anything besides PAID/PENDING), the API responds with `400`. The frontend catches this, halts the loading state, and displays the failure message, leaving the user on the checkout page to try again. The DB order state remains safely in `PENDING_PAYMENT`.

## 9. Pending handling
If `cashfreeStatus` is `ACTIVE` or `PENDING`, the backend responds with `{ success: false, pending: true }`. The frontend displays: "Payment verification is pending. Please check your order history in a few minutes."

## 10. Idempotency handling
If the webhook beats the frontend to the punch and marks the order as `CAPTURED`, the frontend's `/verify` call immediately returns `{ success: true, idempotent: true }` without repeating order placement logic.

## 11. Tests performed
Manually verified the logic paths for Success, Failure, and Pending.

## 12. Test results
The frontend successfully routes to `/order-confirmation/X` on success and properly handles pending and failure states without destructive URL overrides.

## 13. Any local-webhook limitation
Yes, Cashfree cannot directly push webhooks to `localhost:3000` without a tunnel like ngrok. To support local testing without compromising production security, a sandbox bypass exists: if `CASHFREE_APP_ID` is `test_app_id`, it skips the internet request and simulates a `PAID` response.

## 14. Any remaining issue
None.
