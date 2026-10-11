# Security Audit Report

## 1. Audit Metadata and Execution Profile
- **Repository**: `saraswati-sweets---artisanal-mithai-&-namkeen`
- **Reviewed Source Ref**: `fdde42afef45c351e2586379ba892f3ee1beeb2e`
- **Audit Run**: `run-1`
- **Profile**: `standard`
- **Execution Policy**: `sandboxed-source-and-local-only` (offline source review and bounded local execution; no live traffic to external services or third-party APIs)
- **Scope**: Core server runtime, authentication middleware, e-commerce order routing, payment verification, address management, and store administration (`server/`, `server.ts`, `src/`)
- **Companion Attack Classes Evaluated**: `WEB-PROTOCOL-AND-AUTH.md`, `DATA-ISOLATION-AND-LIFECYCLE.md`, `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`, `PROTOCOLS-RPC-AND-MESSAGING.md`
- **Prior Run Comparison**: Initial audit; no prior ledger existed.

---

## 2. Executive Security Posture Summary
The repository implements a modern artisanal sweets and namkeen e-commerce platform built on Express and TypeScript, with Supabase Auth/PostgreSQL integration and Cashfree payment processing. The application contains robust business logic controls in several critical areas, notably server-side recalculation of cart totals and master variant pricing (`computeServerCart`), secure hashing of guest order queries with phone verification and recipient masking (`/api/orders/guest-status`), and constant-time HMAC signature checks on payment webhooks (`timingSafeEqual`).

However, the audit identified **one Critical vulnerability**, **one Medium vulnerability**, and **one Low vulnerability**:
1. **Critical Authentication Bypass (`auth-unverified-jwt-admin-privilege-escalation`)**: An insecure fallback in `server/authMiddleware.ts` parses raw base64url JWT payloads without verifying cryptographic signatures. Supplying an unverified token with `role: "service_role"` elevates any external unauthenticated attacker to the `ADMIN` role, providing total control over administrative APIs (`/api/admin/*`).
2. **Medium Broken Object Level Authorization / IDOR (`order-idor-guest-order-pii-exposure`)**: `GET /api/orders/:orderNumber` only checks ownership if `order.user_id` is truthy. For guest orders (`user_id = null`), any authenticated customer can look up any guest order, disclosing recipient full names, unmasked mobile numbers, street addresses, and order items.
3. **Low Credential Logging in Query Strings (`auth-query-parameter-token-credential-leak`)**: `server/authMiddleware.ts` accepts session tokens via `req.query.token`, leaking session credentials into web server logs, proxy access logs, and HTTP Referer headers.

---

## 3. Confirmed Findings Summary Table

| Severity | Fingerprint | Title | Affected Boundary | Observed Result |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | `auth-unverified-jwt-admin-privilege-escalation` | Unsigned JWT Fallback Allows Unauthenticated Full ADMIN Takeover | `server/authMiddleware.ts#requireRole` | Unsigned payload assigns `ADMIN` role; unlocks all `/api/admin/*` routes. |
| **MEDIUM** | `order-idor-guest-order-pii-exposure` | Insecure Direct Object Reference (IDOR) on Guest Orders Exposes Customer PII | `server/authMiddleware.ts#requireAuth` | Any customer can view unmasked PII and delivery details of any guest order. |
| **LOW** | `auth-query-parameter-token-credential-leak` | Authentication Token Acceptance via URL Query Parameters Leaks Session Credentials | `server/authMiddleware.ts#authenticateToken` | Auth token accepted from URL query string; logged into server access logs. |

---

## 4. Confirmed Findings Breakdown

### Finding 1: Unsigned JWT Fallback Allows Unauthenticated Full ADMIN Takeover
- **Fingerprint**: `auth-unverified-jwt-admin-privilege-escalation`
- **Overall Severity**: **CRITICAL** (Likelihood: Critical | Impact: Critical)
- **Source Location**: [server/authMiddleware.ts:81-127](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L81-L127)
- **Lower-Trust Principal**: External unauthenticated attacker
- **Target-Native Bounded Reproduction**:
  ```http
  GET /api/admin/overview HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbi1leHBsb2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6OTk5OTk5OTk5OX0.
  ```
- **Conditions**: Attacker sends an HTTP request with an unverified JWT payload containing `role: "service_role"`.
- **Observed Result**: `authMiddleware.ts` parses the payload without signature validation, creates an in-memory profile with `role: "ADMIN"`, and passes the `requireRole(['ADMIN', 'STAFF'])` barrier, exposing administrative metrics, store toggle controls, product catalogs, and financial refund capabilities.
- **Remediation**:
  Remove the unverified token decoding fallback completely in [server/authMiddleware.ts](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts). Authentication claims must only be honored if verified by the authoritative identity provider (`supabaseServer.auth.getUser`).

---

### Finding 2: Insecure Direct Object Reference (IDOR) on Guest Orders Exposes Customer PII
- **Fingerprint**: `order-idor-guest-order-pii-exposure`
- **Overall Severity**: **MEDIUM** (Likelihood: Medium | Impact: Medium)
- **Source Location**: [server/routes/orderRoutes.ts:778-786](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L778-L786)
- **Lower-Trust Principal**: Authenticated customer (`CUSTOMER` role)
- **Target-Native Bounded Reproduction**:
  ```http
  GET /api/orders/ORD-GUEST-001 HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer <valid-customer-jwt>
  ```
- **Conditions**: Target order was created as a guest order (`user_id = null`), and attacker holds any valid customer account.
- **Observed Result**: Because `order.user_id` is null, the check `if (order.user_id && order.user_id !== req.user.id)` evaluates to false. The server responds with `200 OK` and returns the unmasked recipient name, unmasked mobile phone number, complete delivery address, and ordered items.
- **Remediation**:
  In [server/routes/orderRoutes.ts](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L778-L786), explicitly require `order.user_id === req.user.id` for all `CUSTOMER` requests. Deny customer access to guest orders through this endpoint; guest lookups must remain restricted to `POST /api/orders/guest-status`.

---

### Finding 3: Authentication Token Acceptance via URL Query Parameters Leaks Session Credentials
- **Fingerprint**: `auth-query-parameter-token-credential-leak`
- **Overall Severity**: **LOW** (Likelihood: Low | Impact: Medium)
- **Source Location**: [server/authMiddleware.ts:19-21](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L19-L21)
- **Lower-Trust Principal**: Log observer, network proxy, or recipient of shared URL
- **Target-Native Bounded Reproduction**:
  ```http
  GET /api/addresses?token=<supabase-jwt> HTTP/1.1
  Host: localhost:3000
  ```
- **Observed Result**: Server authenticates the user from `req.query.token`. The full JWT is logged in plaintext in HTTP server access logs and downstream proxy logs.
- **Remediation**:
  Remove `req.query.token` parsing in [server/authMiddleware.ts:19](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L19). Enforce standard `Authorization: Bearer <token>` headers.

---

## 5. Needs Validation Candidates

| Fingerprint | Title | Repository Trace | Exact Blocker | Bounded Resolution Plan |
| :--- | :--- | :--- | :--- | :--- |
| `cashfree-webhook-timestamp-skew-unbounded` | Cashfree Webhook HMAC Verification Lacks Maximum Clock Skew Bound | `server/routes/paymentRoutes.ts:240` -> `server/services/cashfreeService.ts:235` | Production Cashfree webhook retry schedule and acceptable clock drift require verification against live gateway environment. | **Local**: Validate signature behavior with 24h-old timestamp.<br>**Deployment**: Inspect Cashfree merchant dashboard settings and delivery latency logs. |

---

## 6. Positive Security Patterns & Hardening Notes
1. **Server-Side Price Authority**: `computeServerCart` in `server/routes/cartRoutes.ts` recalculates all subtotal and savings calculations from master product and hamper records rather than trusting client-submitted prices or totals.
2. **Timing-Safe Crypto**: `verifyWebhookSignature` in `server/services/cashfreeService.ts` correctly utilizes `crypto.timingSafeEqual` to prevent timing side-channel attacks on HMAC comparison.
3. **Privacy-Preserving Guest Route**: `POST /api/orders/guest-status` incorporates rate limiting per IP and per order number, requires both order number and checkout mobile number verification, and masks recipient phone numbers (`******7890`).
4. **Body Parser Bound Hardening**: `app.use(express.json({ limit: '50mb' }))` in `server.ts` is currently applied globally to accommodate admin image uploads. It is recommended to lower the global JSON limit to `1mb` and apply `50mb` exclusively to `/api/admin/media` upload routes.

---

## 7. Coverage Summary from Ledger
- **Total Coverage Units**: 6
- **Units in Candidate Status**: 3 (linked to 4 findings)
- **Units in Covered Status**: 3 (`addressRoutes`, `cartRoutes`, `express.json` parser limits)
- **Units Deferred / Blocked**: 0
- **Validator Results**:
  - `validate-coverage-ledger.cjs`: **PASS** (6 units valid)
  - `validate-findings.cjs`: **PASS** (4 findings valid)
