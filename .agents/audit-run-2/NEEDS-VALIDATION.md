# Needs-Validation Candidates (Run 2)

This document details prioritized investigation leads whose full validation is blocked by missing deployment or live runtime facts.

---

## 1. Candidate: Public Bulk Enquiry Endpoint Lacks Dedicated Rate Limiting Guarding Outbound Email Quota

- **Fingerprint**: `public-enquiry-rate-limit-missing`
- **Candidate Title**: Public Bulk Enquiry Endpoint Lacks Dedicated Rate Limiting Guarding Outbound Email Quota
- **Affected Boundary**: Public Form Endpoints & Notification Dispatch (`server.ts#apiLimiter` -> `server/routes/publicRoutes.ts#POST /api/enquiries`)
- **Primary Source File**: [server/routes/publicRoutes.ts:359-420](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/publicRoutes.ts#L359-L420)

### Source Trace
1. **Entrypoint**: [server.ts:154](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server.ts#L154)
   `publicRoutes` is mounted without `sensitiveLimiter`.
2. **Propagation**: [server/routes/publicRoutes.ts:359](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/publicRoutes.ts#L359)
   `POST /api/enquiries` processes unauthenticated bulk enquiry submissions.
3. **Sink**: [server/services/notificationService.ts:1149](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/services/notificationService.ts#L1149)
   `emailProvider.sendEmail` fires outbound API requests to ZeptoMail for every submission.

### Verified Evidence
- [server.ts:154](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server.ts#L154):
  `app.use('/api', publicRoutes);`
- [server/routes/publicRoutes.ts:411](file:///c:/Users/yadav/OneDrive/Desktop/saraswati-sweets---artisanal-mithai-&-namkeen/server/routes/publicRoutes.ts#L411):
  `notifyNewBulkEnquiry(newEnquiry).catch(...)`

### Exact Decisive Blocker
Production ZeptoMail account plan limits, daily sending thresholds, and upstream Cloudflare / Railway WAF edge rate-limiting rules cannot be determined from local source code.

### Bounded Local and Deployment Resolution Plans
- **Local Plan**: Run an automated loop submitting 50 rapid enquiries to verify whether local IP rate limiting triggers.
- **Deployment Plan**:
  1. Inspect ZeptoMail merchant dashboard daily bounce/spam metrics and sending allowances.
  2. Attach an explicit rate limiter (e.g. max 5 enquiries per IP per 15 minutes) to `POST /api/enquiries`.
