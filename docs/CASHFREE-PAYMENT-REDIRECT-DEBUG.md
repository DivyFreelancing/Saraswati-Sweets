# Cashfree Payment Redirect Flow Debug

## Current Flow
1. Customer initiates checkout.
2. Backend creates local order and Cashfree payment session.
3. Frontend launches Cashfree modal.
4. User completes payment successfully in sandbox.
5. Cashfree redirects back to `returnUrl` (`/checkout?order_id=...`).
6. Frontend executes `useEffect` when `order_id` is present in URL and POSTs to `/api/payments/verify`.
7. Backend verifies payment and returns success response.
8. Frontend calls `onOrderSuccess`, which is expected to redirect to the order confirmation page.

## Where It Broke & Root Cause
1. **False Verification:** The backend `/api/payments/verify` endpoint was previously using a stub method `verifyPaymentSignature` which returned `true` unconditionally, circumventing actual Cashfree status verification.
2. **Missing State Logic:** The backend did not actively fetch the true payment state (e.g. `PAID`, `PENDING`, `FAILED`) from Cashfree APIs during the browser return callback, violating the critical requirement to verify server-side.
3. **Pending UI Bug:** The frontend `CheckoutPage.tsx` did not handle the `data.pending` state. If the payment fell into pending, it incorrectly treated it as an outright failure and wiped out the success flow.

## Fix Implemented
1. **Server-Side Verification Logic:** Replaced the unsafe signature check with `verifyCashfreeOrderStatus` in `cashfreeService.ts`. This now makes a real HTTP `GET` request to Cashfree API (`/orders/{order_id}`) to securely fetch the true payment status.
2. **Local Sandbox Fallback:** If `CASHFREE_APP_ID` is a local test string (`test_app_id`), it automatically verifies as `PAID` without hitting the internet, preserving sandbox usability without degrading production security.
3. **Proper Payment Route States:** Refactored `/api/payments/verify` in `paymentRoutes.ts` to branch explicitly on the status (`PAID`, `PENDING`, `ACTIVE`).
4. **Frontend Pending Handler:** Updated the `CheckoutPage.tsx` return handler to explicitly check for `data.pending` and display a clear "Payment verification is pending" message instead of failing out.
