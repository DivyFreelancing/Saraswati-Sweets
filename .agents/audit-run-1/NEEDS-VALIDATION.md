# Needs-Validation Candidates

This document details prioritized investigation leads whose full validation is blocked by missing deployment or live runtime facts. These records are not classified as confirmed vulnerabilities.

---

## 1. Candidate: Cashfree Webhook HMAC Verification Lacks Maximum Clock Skew Bound

- **Fingerprint**: `cashfree-webhook-timestamp-skew-unbounded`
- **Candidate Title**: Cashfree Webhook HMAC Verification Lacks Maximum Clock Skew Bound
- **Affected Boundary**: Payment Webhook Verification (`server/services/cashfreeService.ts#verifyWebhookSignature`)
- **Primary Source File**: [server/services/cashfreeService.ts:223-248](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/cashfreeService.ts#L223-L248)

### Source Trace
1. **Entrypoint**: [server/routes/paymentRoutes.ts:240](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/paymentRoutes.ts#L240)
   `POST /api/payments/webhook` receives incoming Cashfree webhook requests with `x-webhook-signature` and `x-webhook-timestamp` headers.
2. **Propagation**: [server/services/cashfreeService.ts:235](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/cashfreeService.ts#L235)
   `verifyWebhookSignature` constructs the HMAC payload as `${timestampHeader}${rawString}` and compares the resulting HMAC with `signatureHeader` using `crypto.timingSafeEqual`.
3. **Propagation (Missing Skew Verification)**:
   The implementation checks HMAC integrity but does not inspect whether `Math.abs(Date.now() - timestampMs)` is within an allowed threshold (such as 300 seconds / 5 minutes).
4. **Sink**: [server/services/paymentPersistenceService.ts:110](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/paymentPersistenceService.ts#L110)
   If an intercepted or delayed webhook with an old timestamp arrives before an event is deduplicated, `confirmOrderPayment` executes state transitions.

### Verified Evidence
- [server/services/cashfreeService.ts:235](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/cashfreeService.ts#L235):
  `const payload = `${timestampHeader}${rawString}`;`
- [server/services/cashfreeService.ts:245](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/cashfreeService.ts#L245):
  `return crypto.timingSafeEqual(genBuf, sigBuf);`

### Exact Decisive Blocker
Cashfree production webhook delivery retry timeline, expected network transit latency, and live Supabase idempotency guarantees during network partitions cannot be verified offline. Determining whether an unbounded timestamp represents a realistic replay risk requires production telemetry and payment gateway documentation on signature expiry.

### Bounded Local and Deployment Resolution Plans
- **Local Plan**:
  Construct an automated unit test supplying an HMAC computed with an `x-webhook-timestamp` from 24 hours in the past. Verify that `verifyWebhookSignature` returns `true`, demonstrating that the cryptographic layer accepts expired timestamps.
- **Deployment Plan**:
  1. Inspect the Cashfree Merchant Dashboard webhook settings to determine if Cashfree automatically invalidates or retries webhooks beyond a specific window.
  2. Implement a defensive 5-minute skew tolerance check in `verifyWebhookSignature`:
     ```ts
     const timestampMs = Number(timestampHeader);
     if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
       console.warn('[Webhook] Rejected webhook with expired or skewed timestamp');
       return false;
     }
     ```
