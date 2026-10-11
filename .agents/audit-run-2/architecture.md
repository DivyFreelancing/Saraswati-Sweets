# Architecture and Security Model (Run 2 Post-Remediation)

### 1. Product, Principals, and Protected Resources
Saraswati Sweets is a full-stack artisanal mithai, namkeen, and gift hamper e-commerce platform with automated delivery logistics, Cashfree payment processing, and administrative store management.

Principals:
- **Anonymous Visitor / Guest**: Browses products, calculates delivery estimates, creates guest carts, places guest orders, and tracks guest orders strictly through verified phone number matching.
- **Authenticated Customer (`CUSTOMER`)**: Registered via Supabase Auth (phone/email OTP). Manages saved delivery addresses, reviews personal order history, and submits bulk enquiries.
- **Staff / Operator (`STAFF`)**: Views order queues, updates order fulfillment statuses, uploads media assets, and manages dispatch.
- **Administrator (`ADMIN`)**: Root store controller; manages catalog, pricing, coupons, store toggles, and initiates Cashfree refunds.

Protected Resources:
- Cashfree payment tokens, transactions, and refund executions.
- Customer Personally Identifiable Information (PII) including full names, unmasked phone numbers, and physical delivery addresses.
- Store configuration state and media assets in Supabase Storage.
- Outbound transactional email quotas and administrator notification inboxes.

### 2. Comparable Baseline
Comparable to Node.js/TypeScript headless commerce solutions (such as MedusaJS or Shopify storefronts). Security expectations require strict customer tenant separation, cryptographic webhook authentication, signed session claims, and safe templating.

### 3. Tech Stack and Deployment Limits
- **Runtime & Backend**: Node.js, Express 4.x, TypeScript, Vite SSR/SPA middleware.
- **Database & Identity**: Supabase (PostgreSQL + PostgREST) with in-memory resilient fallback store (`inMemoryStore`).
- **Payment Gateway**: Cashfree Payment Gateway v2023-08-01 API and webhooks.
- **Logistics**: Zepto Fleet integration and custom local delivery partner dispatch.
- **Email Service**: ZeptoMail transactional email provider.
- **Execution Boundary**: Sandboxed source review and local execution only. External provider APIs (Cashfree, Supabase live servers, ZeptoMail) are mocked offline.

### 4. Entry Surfaces and Lifecycle Paths
- **Public & Guest APIs**: `POST /api/orders`, `POST /api/orders/guest-status`, `POST /api/cart/verify`, `POST /api/enquiries`, `GET /api/public/categories`, `GET /api/public/products`.
- **Customer Account APIs**: `GET /api/orders`, `GET /api/orders/:orderNumber`, `GET|POST /api/addresses`, `GET|PUT /api/auth/profile`.
- **Payment Webhook & Verification**: `POST /api/payments/verify`, `POST /api/payments/webhook`.
- **Administrative APIs**: `/api/admin/overview`, `/api/admin/store-settings`, `/api/admin/upload-image`, `/api/admin/orders/:id/refund`.

### 5. Trust Boundaries and Controls
- **Boundary 1: Authentication (`authenticateToken`)**: Enforces Bearer token extraction from headers only. Validates tokens cryptographically with Supabase Auth. Unverified fallback token parsing and query-string token extraction have been eliminated.
- **Boundary 2: Authorization (`requireRole`)**: Restricts access based on verified role (`ADMIN`, `STAFF`, `CUSTOMER`).
- **Boundary 3: Order Ownership Isolation**: In `orderRoutes.ts`, strictly verifies customer ownership (`order.user_id === req.user.id`) or verified account phone matching before disclosing order details.
- **Boundary 4: Webhook Integrity**: In `cashfreeService.ts`, validates HMAC-SHA256 signatures with constant-time equality and enforces a 10-minute clock skew window.
- **Boundary 5: Email Templating**: In `notificationService.ts`, escapes customer inputs before injecting into HTML email templates.

### 6. Starting Paths
- `server/authMiddleware.ts`
- `server/routes/orderRoutes.ts`
- `server/routes/adminRoutes.ts`
- `server/routes/publicRoutes.ts`
- `server/services/notificationService.ts`
- `server/services/cashfreeService.ts`
- `server.ts`

### 7. Prior Coverage and Revalidation Summary
In `run-1`, three findings were confirmed and one was flagged for validation:
- `auth-unverified-jwt-admin-privilege-escalation`: Patched and revalidated; unverified token fallback removed.
- `order-idor-guest-order-pii-exposure`: Patched and revalidated; guest order IDOR closed.
- `auth-query-parameter-token-credential-leak`: Patched and revalidated; `req.query.token` removed.
- `cashfree-webhook-timestamp-skew-unbounded`: Patched and revalidated; 10-minute skew tolerance added.

`run-2` expands coverage into transactional email templating (`notificationService.ts`), media storage upload sanitization (`adminRoutes.ts`), and public rate limiting (`server.ts`).

### 8. Companion Selection Summary
- `WEB-PROTOCOL-AND-AUTH.md`: Evaluated for revalidated authentication middleware and session token transport.
- `DATA-ISOLATION-AND-LIFECYCLE.md`: Evaluated for customer order ownership and guest privacy.
- `PROTOCOLS-RPC-AND-MESSAGING.md`: Evaluated for Cashfree webhooks and transactional email notifications.
- `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`: Evaluated for public enquiry endpoint rate limiting.
