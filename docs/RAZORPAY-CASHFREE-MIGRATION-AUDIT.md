# Razorpay to Cashfree Migration Audit

## Razorpay References Found

| Reference | File Path | Usage | Action Required | Migration Risk |
| :--- | :--- | :--- | :--- | :--- |
| `razorpay` | `supabase/schema.sql:191` | SQL comment `(Razorpay & COD audit)` | Remove | Low |
| `'RAZORPAY'` | `supabase/schema.sql:197` | Default gateway column value | Change to `'CASHFREE'` | Low (affects local dev/db creation) |
| `razorpay_order_id` | `server/db.ts:652, 700` | Interface types (`ServerOrder`) | Rename to generic `provider_order_id` | Medium (touches multiple routes) |
| `razorpay_payment_id` | `server/db.ts:653, 701` | Interface types (`ServerOrder`) | Rename to generic `provider_payment_id` | Medium (touches multiple routes) |
| `razorpay_refund_id` | `server/db.ts:702` | Interface types (`ServerOrder`) | Rename to generic `provider_refund_id` | Medium |
| `razorpay_payment_id` | `server/db.ts:860` | Code comment on map | Rewrite to generic comment | Low |
| `Razorpay` | `server/routes/orderRoutes.ts:403` | Code comment | Rewrite to Cashfree | Low |
| `razorpay_order_id` | `server/routes/orderRoutes.ts:423, 431` | Assignment of new Cashfree order ID to old schema property | Update to `provider_order_id` | Medium |
| `razorpay_order_id` | `server/routes/paymentRoutes.ts:59, 100, 159, 174` | Webhook verification/lookups | Update to `provider_order_id` | High (ensuring webhook matching works) |
| `razorpay_payment_id` | `server/routes/paymentRoutes.ts:86, 101` | Saving cashfree id to legacy property | Update to `provider_payment_id` | Medium |
| `razorpay_payment_id` | `server/routes/adminRoutes.ts:766, 784` | Processing refunds | Update to `provider_payment_id` | Medium |
| `razorpay_refund_id` | `server/routes/adminRoutes.ts:774, 801` | Saving refund result | Update to `provider_refund_id` | Medium |
| `razorpay` | `bun.lock` | Lingering lockfile dependency | Delete bun.lock or `bun remove` | Low |
| `Razorpay` | `.env.example:22` | Comment about credentials | Rewrite to `Cashfree` | Low |

## Missing or Outdated Implementation Needs
- The DB schema currently has Razorpay-specific fields (`razorpay_order_id`, etc.). These need to be generalized to `provider_order_id`, `provider_payment_id`, `provider_refund_id` as requested by the migration guidelines.
- The `supabase/schema.sql` sets `gateway VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY'`. This should be updated to `'CASHFREE'`.
- All backend routes must be updated to reference the generalized fields rather than `razorpay_...`.

## Existing Cashfree Implementation Validation
- `server/services/cashfreeService.ts`: Present and functioning. Handles Sandbox vs Prod correctly via environment variables. Returns correct standard response.
- `src/pages/CheckoutPage.tsx`: Razorpay SDK has been successfully removed and replaced by Cashfree SDK (`window.Cashfree`).
- `src/pages/OrderDetailPage.tsx`: Hardcoded "Payment Due (COD)" bug was fixed to render conditionally for Cashfree orders.
- Environment variables have been replaced (Razorpay keys deleted, Cashfree keys added).
