# Security Audit Report (Audit Run 2 - Comprehensive Re-audit)

## 1. Audit Metadata and Execution Profile
- **Repository**: `saraswati-sweets---artisanal-mithai-&-namkeen`
- **Reviewed Source Ref**: `fdde42afef45c351e2586379ba892f3ee1beeb2e (dirty post-patch)`
- **Audit Run**: `run-2`
- **Profile**: `standard`
- **Execution Policy**: `sandboxed-source-and-local-only`
- **Scope**: Entire application: authentication middleware, customer and guest order routes, payment processing, transactional notifications, catalog browsing, cart calculations, media storage, and admin operations (`server/`, `server.ts`, `src/`)
- **Prior Run Input**: `.agents/audit-run-1/coverage-ledger.json` and `.agents/audit-run-1/findings.json`

---

## 2. Security Posture Summary (Post-Remediation)
Following the defensive patches applied in response to `run-1`, the application's core security posture is significantly strengthened:
- **Critical Auth Bypass**: Completely eliminated. The unverified JWT fallback parser in `authMiddleware.ts` was removed. Forged tokens with arbitrary roles are rejected with HTTP 401.
- **Guest Order IDOR**: Completely eliminated. `GET /api/orders/:orderNumber` now strictly verifies that the customer ID matches `order.user_id` or that the verified account phone matches the order. Arbitrary customers can no longer access guest order records.
- **Credential Logging**: Completely eliminated. Tokens are no longer accepted via URL query parameters (`req.query.token`).
- **Webhook Timestamp Window**: Resolved. A 10-minute maximum timestamp skew window is enforced on Cashfree webhook signatures.

In this full-application second pass (`run-2`), the expanded audit across transactional notifications, media storage, and public forms identified **2 Low confirmed findings** and **1 Needs-Validation candidate**:
1. **Low Finding (`notification-html-injection-transactional-emails`)**: Unescaped user input in bulk enquiry and order alert emails allows HTML markup to be rendered in outgoing transactional emails.
2. **Low Finding (`admin-storage-path-traversal-arbitrary-overwrite`)**: The media upload endpoint (`POST /api/admin/upload-image`) accepts a `path` parameter without checking for `..` directory traversal sequences or restricting the key prefix to `products/`.
3. **Needs Validation Candidate (`public-enquiry-rate-limit-missing`)**: Public bulk enquiry endpoint lacks a dedicated rate limiter to guard outbound ZeptoMail quotas against automated bot bursts.

---

## 3. Findings Summary Table

| Severity | Fingerprint | Title | Affected Boundary | Observed Result |
| :--- | :--- | :--- | :--- | :--- |
| **LOW** | `notification-html-injection-transactional-emails` | Unescaped User Input in Transactional Email Templates Enables HTML Injection | `server/services/notificationService.ts#buildEmail` | User-submitted enquiry fields are interpolated into email HTML without entity escaping. |
| **LOW** | `admin-storage-path-traversal-arbitrary-overwrite` | Unsanitized Path Parameter in Media Upload Allows Arbitrary Bucket Key Overwrite | `server/routes/adminRoutes.ts#storageUpload` | Media upload endpoint accepts unvalidated `path` parameter with `upsert: true`. |
| **NEEDS VALIDATION** | `public-enquiry-rate-limit-missing` | Public Bulk Enquiry Endpoint Lacks Dedicated Rate Limiting Guarding Outbound Email Quota | `server.ts#apiLimiter` | Unauthenticated callers can submit enquiries without dedicated burst rate limiting. |

---

## 4. Revalidation of Run-1 Vulnerabilities

| Prior Fingerprint | Prior Verdict | Current Revalidation Status | Source Evidence |
| :--- | :--- | :--- | :--- |
| `auth-unverified-jwt-admin-privilege-escalation` | CRITICAL | **RESOLVED / CLOSED** | Unverified parsing removed from `authMiddleware.ts`. Regression test proves unsigned `service_role` token returns HTTP 401. |
| `order-idor-guest-order-pii-exposure` | MEDIUM | **RESOLVED / CLOSED** | Ownership & phone verification enforced in `orderRoutes.ts:778-786`. Regression test proves HTTP 404 returned on third-party guest orders. |
| `auth-query-parameter-token-credential-leak` | LOW | **RESOLVED / CLOSED** | `req.query.token` removed from `authMiddleware.ts`. Regression test proves query parameter tokens return HTTP 401. |
| `cashfree-webhook-timestamp-skew-unbounded` | NEEDS VALIDATION | **RESOLVED / HARDENED** | 10-minute maximum timestamp skew window added to `cashfreeService.ts:235-247`. |

---

## 5. New Findings Breakdown (Run-2)

### Finding 1: Unescaped User Input in Transactional Email Templates Enables HTML Injection
- **Fingerprint**: `notification-html-injection-transactional-emails`
- **Severity**: **LOW** (Likelihood: Medium | Impact: Low)
- **Source Location**: [server/services/notificationService.ts:1154-1188](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/notificationService.ts#L1154-L1188)
- **Lower-Trust Principal**: Public visitor submitting a bulk enquiry
- **Reproduction**:
  Submit `POST /api/enquiries` with `contact_name: "Customer <b style='color:red'>VIP</b>"` and `notes: "<a href='https://phishing.com'>Click here</a>"`.
- **Observed Result**: The raw HTML tags are rendered into the admin notification email without entity encoding.
- **Smallest Source Fix**: Call the existing `escapeHtml()` helper on all enquiry fields before template interpolation.

### Finding 2: Unsanitized Path Parameter in Media Upload Allows Arbitrary Bucket Key Overwrite
- **Fingerprint**: `admin-storage-path-traversal-arbitrary-overwrite`
- **Severity**: **LOW** (Likelihood: Low | Impact: Medium)
- **Source Location**: [server/routes/adminRoutes.ts:177-184](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/adminRoutes.ts#L177-L184)
- **Lower-Trust Principal**: Authenticated STAFF or ADMIN operator
- **Reproduction**:
  Submit `POST /api/admin/upload-image` with `path: "../critical-asset.png"`.
- **Observed Result**: The unvalidated path is passed directly to Supabase Storage with `upsert: true`.
- **Smallest Source Fix**: Disallow relative traversal sequences (`..`) and enforce that `uploadPath` must begin with `products/`.

---

## 6. Needs Validation Candidates

| Fingerprint | Title | Repository Trace | Exact Blocker | Bounded Resolution Plan |
| :--- | :--- | :--- | :--- | :--- |
| `public-enquiry-rate-limit-missing` | Public Bulk Enquiry Endpoint Lacks Dedicated Rate Limiting | `server.ts:154` -> `server/routes/publicRoutes.ts:359` | Upstream Cloudflare WAF rate limiting rules and live ZeptoMail plan limits are not visible in source. | **Local**: Automated script submitting 50 sequential enquiries.<br>**Deployment**: Verify ZeptoMail delivery quotas and configure Cloudflare rate limiting on `/api/enquiries`. |

---

## 7. Coverage Ledger Metrics
- **Total Units Tracked**: 8
- **Units in Covered Status**: 5 (Auth, Orders, Webhook Skew, Address Isolation, Cart Calculations)
- **Units in Candidate Status**: 3 (Email HTML injection, Admin storage path traversal, Enquiry rate limiting)
- **Validator Compliance**: `PASS` (100% schema and canonical reference compliance)
