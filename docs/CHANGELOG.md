# Changelog

## [Unreleased]
### Changed
- **Payment Gateway Migration:** Razorpay replaced with Cashfree across backend, frontend, webhooks, environment configuration and documentation. Cashfree is now the exclusive and active payment provider. DB schemas have been generalized to remove Razorpay coupling (`provider_order_id`, `provider_payment_id`, `provider_refund_id`).
