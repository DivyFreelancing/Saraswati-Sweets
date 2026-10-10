-- ====================================================================
-- ROLLBACK MIGRATION: Webhook Events Idempotency, Payment Persistence, and Atomic Settlement
-- Date: 2026-10-09
-- Purpose: Safely revert migration 20261009_webhook_events_and_payment_persistence.sql
-- 
-- ROLLBACK SAFETY & ARCHITECTURAL CLASSIFICATION:
-- 1. Safely Reversible Components:
--    - Function `confirm_order_payment_atomic`: Dropped cleanly without data loss.
--    - Partial Unique Indexes on `payments`: Dropped cleanly without data loss.
--    - Provider indexes on `orders` and `payments`: Dropped cleanly without data loss.
--
-- 2. Data-Aware / Conditional Rollback:
--    - Constraint `orders_payment_status_check`:
--      DO NOT blindly re-apply the restrictive legacy constraint ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').
--      If live orders have been recorded with 'CAPTURED', 'REFUND_PENDING', or 'REFUND_FAILED',
--      tightening the constraint causes PostgreSQL to fail the transaction and crash.
--      This script inspects existing rows dynamically and preserves the expanded constraint
--      if incompatible values exist.
--
-- 3. Audit History Preservation (Non-Destructive by Default):
--    - Table `webhook_events`:
--      Contains immutable audit logs of webhook callbacks and signatures. Dropping this table
--      deletes financial transaction and idempotency history. It is preserved by default.
--      A manual sandbox teardown statement is provided if running in a disposable environment.
--
-- 4. Forward-Fix Only (Irreversible in Live Systems):
--    - Columns `provider_order_id`, `provider_payment_id`, `paid_at`, `currency`:
--      Once production orders and payments are linked to gateway identifiers, dropping these
--      columns deletes live financial references and makes payment reconciliation impossible.
--      These columns are left as nullable and must be managed via forward fix.
-- ====================================================================

-- 1. Drop atomic RPC functions
DROP FUNCTION IF EXISTS public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT
);

DROP FUNCTION IF EXISTS public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB
);

-- 2. Drop unique partial indexes on payments table
DROP INDEX IF EXISTS public.idx_payments_unique_order_captured;
DROP INDEX IF EXISTS public.idx_payments_unique_provider_payment_captured;
DROP INDEX IF EXISTS public.idx_payments_provider_order_id;
DROP INDEX IF EXISTS public.idx_payments_provider_payment_id;

-- 3. Drop provider index on orders table
DROP INDEX IF EXISTS public.idx_orders_provider_order_id;

-- 4. Data-Aware CHECK constraint rollback on orders.payment_status
DO $$
DECLARE
    v_incompatible_rows_count INT;
BEGIN
    -- Check if any existing orders use CAPTURED, REFUND_PENDING, or REFUND_FAILED
    SELECT COUNT(*) INTO v_incompatible_rows_count
    FROM public.orders
    WHERE payment_status NOT IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

    IF v_incompatible_rows_count = 0 THEN
        -- Safe to restore legacy constraint: No rows violate baseline set
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
        ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
            CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'));
        RAISE NOTICE 'orders_payment_status_check successfully reverted to baseline (0 incompatible rows).';
    ELSE
        -- Incompatible rows present: PRESERVE expanded constraint to protect existing orders
        RAISE NOTICE 'Preserved expanded orders_payment_status_check: % row(s) use CAPTURED or REFUND_* statuses. Constraint not tightened to prevent transaction failure and data rejection.', v_incompatible_rows_count;
    END IF;
END $$;

-- 5. Webhook Events Table: Audit trail preservation
-- Table `public.webhook_events` is retained to prevent accidental loss of webhook event history.
-- If running in a disposable local test environment where complete teardown is explicitly desired:
-- DROP TABLE IF EXISTS public.webhook_events CASCADE;
