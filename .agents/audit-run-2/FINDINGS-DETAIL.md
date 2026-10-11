# Detailed Findings and Proofs of Concept (Run 2)

This document provides technical reproductions, traces, invariants, and source code remediations for confirmed vulnerabilities identified in `run-2`.

---

## 1. Finding: Unsanitized Path Parameter in Media Upload Allows Arbitrary Bucket Key Overwrite

- **Fingerprint**: `admin-storage-path-traversal-arbitrary-overwrite`
- **Severity**: **LOW** (Likelihood: Low | Impact: Medium)
- **Primary Source File**: [server/routes/adminRoutes.ts](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/adminRoutes.ts#L177-L184)

### Ordered Execution Trace
1. **Entrypoint**: [server/routes/adminRoutes.ts:148](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/adminRoutes.ts#L148)
   `POST /api/admin/upload-image` extracts `path` from `req.body`.
2. **Propagation**: [server/routes/adminRoutes.ts:177](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/adminRoutes.ts#L177)
   Assigns `const uploadPath = path || ...` without checking if `path` contains `..` or leading slashes.
3. **Sink**: [server/routes/adminRoutes.ts:179-184](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/adminRoutes.ts#L179-L184)
   Invokes `supabaseServer.storage.from('product-images').upload(uploadPath, buffer, { upsert: true })`.

### Proven Security Invariant
> *Storage object keys supplied by clients must never contain path traversal sequences or escape their designated prefix directory.*

### Remediation
In `server/routes/adminRoutes.ts`:
```diff
-  const uploadPath = path || `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
+  const isSafeCustomPath = typeof path === 'string' && !path.includes('..') && path.startsWith('products/');
+  const uploadPath = isSafeCustomPath ? path.trim() : `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
```

---

## 2. Finding: Unescaped User Input in Transactional Email Templates Enables HTML Injection

- **Fingerprint**: `notification-html-injection-transactional-emails`
- **Severity**: **LOW** (Likelihood: Medium | Impact: Low)
- **Primary Source File**: [server/services/notificationService.ts](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/notificationService.ts#L1154-L1188)

### Ordered Execution Trace
1. **Entrypoint**: [server/routes/publicRoutes.ts:360-373](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/publicRoutes.ts#L360-L373)
   `POST /api/enquiries` accepts unauthenticated visitor input (`contact_name`, `organization_name`, `notes`).
2. **Propagation**: [server/routes/publicRoutes.ts:411](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/publicRoutes.ts#L411)
   `notifyNewBulkEnquiry` is called with the enquiry payload.
3. **Sink**: [server/services/notificationService.ts:1157-1167](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/notificationService.ts#L1157-L1167)
   Interpolates raw string variables directly into the template HTML without calling `escapeHtml()`.

### Proven Security Invariant
> *Untrusted user text rendered into HTML email templates must always be entity-encoded.*

### Remediation
In `server/services/notificationService.ts`:
Wrap `enquiry.contact_name`, `enquiry.organization_name`, and `enquiry.notes` in `escapeHtml()`.
