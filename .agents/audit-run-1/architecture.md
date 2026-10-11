# Architecture and Security Model

### 1. Product, Principals, and Protected Resources
Saraswati Sweets is a full-stack artisanal mithai, namkeen, and gift hamper e-commerce platform with automated delivery logistics, Cashfree payment processing, and administrative store management.

Principals:
- **Anonymous Visitor / Guest**: Can browse products, calculate delivery estimates, create guest carts, place guest orders, and check guest order status using order number and checkout phone verification.
- **Authenticated Customer (`CUSTOMER`)**: Registered via Supabase Auth (phone/email OTP). Can manage saved delivery addresses, review personal order history, and submit bulk enquiries.
- **Staff / Operator (`STAFF`)**: Can view order queues, update operational order fulfillment statuses, and manage dispatch.
- **Administrator (`ADMIN`)**: Possesses root store control, including catalog management, pricing and inventory overrides, coupon creation, Cashfree refunds, store operations toggling (emergency halt), and audit log inspection.

Protected Resources:
- Order and financial payment records (Cashfree order tokens, transaction statuses, refund calls).
- Customer Personally Identifiable Information (PII) including full names, unmasked phone numbers, and physical street addresses.
- Store configuration state (open/closed toggles, operational delivery partners, coupons).

### 2. Comparable Baseline
Comparable to Node.js/TypeScript headless commerce solutions (such as MedusaJS or Shopify storefronts). Security expectations require strict customer tenant separation, cryptographic webhook authentication, and signed session claims.

### 3. Tech Stack and Deployment Limits
- **Runtime & Backend**: Node.js, Express 4.x, TypeScript, Vite SSR/SPA middleware.
- **Database & Identity**: Supabase (PostgreSQL + PostgREST) with in-memory resilient fallback store (`inMemoryStore`).
- **Payment Gateway**: Cashfree Payment Gateway v2023-08-01 API and webhooks.
- **Logistics**: Zepto Fleet integration and custom local delivery partner dispatch.
- **Sandboxed Execution Policy**: Sandboxed source review and local execution only. External API calls to Cashfree, Supabase live servers, and Zepto dispatch are mocked or offline during audit execution.

### 4. Entry Surfaces and Lifecycle Paths
- **Public & Guest APIs**: `POST /api/orders` (order creation), `POST /api/orders/guest-status` (guest order polling), `POST /api/cart/verify` (price recalculation), `GET /api/public/categories`, `GET /api/public/products`.
- **Customer Account APIs**: `GET /api/orders` (customer order history), `GET /api/orders/:orderNumber` (single order lookup), `GET|POST /api/addresses` (saved address management).
- **Payment Webhook & Verification**: `POST /api/payments/verify` (client checkout return verification), `POST /api/payments/webhook` (Cashfree server-to-server HMAC notifications).
- **Administrative APIs**: `/api/admin/*` (`/overview`, `/store-settings`, `/products`, `/orders`, `/refunds`).

### 5. Trust Boundaries and Controls
- **Boundary 1: Authentication (`authenticateToken`)**: Extracts Bearer token from `Authorization` header or query string. Delegates to Supabase `auth.getUser(token)` when configured.
- **Boundary 2: Authorization (`requireRole`)**: Restricts access based on `req.user.role` (`ADMIN`, `STAFF`, `CUSTOMER`).
- **Boundary 3: Order Ownership Isolation**: In `orderRoutes.ts`, filters order lists by matching `order.user_id === req.user.id` or phone number matching.
- **Boundary 4: Webhook Integrity**: In `cashfreeService.ts`, validates Cashfree HMAC-SHA256 signatures over timestamp and raw request body.

### 6. Starting Paths
- `server/authMiddleware.ts`
- `server/routes/orderRoutes.ts`
- `server/routes/paymentRoutes.ts`
- `server/routes/adminRoutes.ts`
- `server/services/cashfreeService.ts`
- `server/routes/addressRoutes.ts`
- `server/routes/cartRoutes.ts`
- `server.ts`

### 7. Prior Coverage and Scope
This is initial audit run `run-1`. No prior coverage ledger exists. All surfaces are evaluated fresh under `profile: standard`.

### 8. Companion Selection Summary
- `WEB-PROTOCOL-AND-AUTH.md`: Required for Supabase JWT verification, query parameter token leakage, session handling, and admin authorization.
- `DATA-ISOLATION-AND-LIFECYCLE.md`: Required for multi-tenant customer order access, guest order privacy, and address isolation.
- `PROTOCOLS-RPC-AND-MESSAGING.md`: Required for Cashfree payment webhook processing, HMAC verification, and event deduplication.
- `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`: Required for request payload bounds (`50mb` JSON parser limit) and rate limiting on order status endpoints.
