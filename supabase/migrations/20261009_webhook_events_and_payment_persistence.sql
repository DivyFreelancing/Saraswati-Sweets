-- ====================================================================
-- MIGRATION: Webhook Events Idempotency, Payment Persistence, and Atomic Settlement
-- Date: 2026-10-09
-- Purpose: 
--   1. Create `webhook_events` table for persistent, database-level webhook idempotency with RLS.
--   2. Ensure `payments` table has provider-agnostic identifiers (provider_order_id, provider_payment_id).
--   3. Add database-level unique constraints to prevent duplicate captured payments.
--   4. Ensure `orders.payment_status` CHECK constraint supports 'CAPTURED' while preserving 'COMPLETED'.
--   5. Provide hardened `confirm_order_payment_atomic` RPC for transactional order and payment settlement with:
--      - Strict currency validation (INR only)
--      - Rejection of COD payment method (online settlement RPC only)
--      - Strict order/provider mapping (rejects conflicting or ambiguous identifiers)
--      - Authoritative positive amount requirement and explicit unit handling (RUPEES vs PAISE)
--      - Exact 2-decimal rounding policy and amount comparison
--      - Storing verified gateway amount (not expected order total)
--      - Correct provider identifiers (no Cashfree IDs in razorpay_* columns, no payment ID fallback to order ID)
--      - Row-level locking (FOR UPDATE) to prevent concurrency races
--      - search_path safety and SECURITY DEFINER hardening
--      - Exclusive service_role execute permissions (revoked from anon/authenticated)
-- ====================================================================

-- ====================================================================
-- PREFLIGHT ADVISORY QUERIES
-- Run these preflight checks manually before applying this migration in staging/production:
-- 
-- 1. Check for existing duplicate captured payments per order:
--    SELECT order_id, COUNT(*) AS captured_count
--    FROM public.payments
--    WHERE status = 'CAPTURED'
--    GROUP BY order_id
--    HAVING COUNT(*) > 1;
-- 
-- 2. Check for existing duplicate captured payments per provider_payment_id:
--    SELECT provider_payment_id, COUNT(*) AS captured_count
--    FROM public.payments
--    WHERE provider_payment_id IS NOT NULL AND status = 'CAPTURED'
--    GROUP BY provider_payment_id
--    HAVING COUNT(*) > 1;
-- 
-- 3. Check for NULL or unsupported payment_status values in orders:
--    SELECT id, order_number, payment_status
--    FROM public.orders
--    WHERE payment_status IS NULL 
--       OR payment_status NOT IN ('PENDING', 'CAPTURED', 'COMPLETED', 'FAILED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_FAILED');
-- ====================================================================

BEGIN;

-- 1. Create webhook_events table for persistent idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(150) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'CASHFREE',
    provider_order_id VARCHAR(100),
    provider_payment_id VARCHAR(100),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED')),
    payload JSONB,
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup and constraint enforcement
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON public.webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_order_id ON public.webhook_events(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);

-- Enable Row Level Security on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Revoke untrusted public access completely
REVOKE ALL ON public.webhook_events FROM PUBLIC;
REVOKE ALL ON public.webhook_events FROM anon;
REVOKE ALL ON public.webhook_events FROM authenticated;

-- Grant backend server service_role full management access
GRANT ALL ON public.webhook_events TO service_role;

-- Grant SELECT ONLY to authenticated role so that the Admin/Staff RLS policy can evaluate.
-- In PostgreSQL, table-level SELECT grant is a prerequisite for RLS SELECT policies to evaluate.
GRANT SELECT ON public.webhook_events TO authenticated;

-- Allow authenticated ADMIN and STAFF users read-only policy for auditing and operational review.
-- Ordinary CUSTOMER authenticated users match 0 rows and cannot read payloads or event metadata.
DROP POLICY IF EXISTS "Admins and staff can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins and staff can view webhook events"
    ON public.webhook_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('ADMIN', 'STAFF')
        )
    );

-- 2. Extend payments table for provider agnosticism (Cashfree / UPI / Razorpay)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB;

-- Backfill default INR for any existing legacy rows lacking currency
UPDATE public.payments SET currency = 'INR' WHERE currency IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON public.payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON public.payments(provider_payment_id);

-- Automated preflight validation before applying constraints:
DO $$
DECLARE
    v_dup_order_count INT;
    v_dup_prov_pay_count INT;
    v_invalid_order_status_count INT;
BEGIN
    -- 1. Check for duplicate captured payments per order
    SELECT COUNT(*) INTO v_dup_order_count FROM (
        SELECT order_id 
        FROM public.payments 
        WHERE status = 'CAPTURED' 
        GROUP BY order_id 
        HAVING COUNT(*) > 1
    ) sub;

    IF v_dup_order_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED: Preflight validation found % order(s) with duplicate CAPTURED payment records in public.payments. Please de-duplicate payment records before applying this migration.', v_dup_order_count;
    END IF;

    -- 2. Check for duplicate captured payments per provider_payment_id
    SELECT COUNT(*) INTO v_dup_prov_pay_count FROM (
        SELECT provider_payment_id 
        FROM public.payments 
        WHERE provider_payment_id IS NOT NULL AND status = 'CAPTURED' 
        GROUP BY provider_payment_id 
        HAVING COUNT(*) > 1
    ) sub;

    IF v_dup_prov_pay_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED: Preflight validation found % duplicate provider_payment_id(s) with CAPTURED status in public.payments. Please resolve conflicting payment records before applying this migration.', v_dup_prov_pay_count;
    END IF;

    -- 3. Check for NULL or incompatible payment_status values in orders
    SELECT COUNT(*) INTO v_invalid_order_status_count
    FROM public.orders
    WHERE payment_status IS NULL 
       OR payment_status NOT IN ('PENDING', 'CAPTURED', 'COMPLETED', 'FAILED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_FAILED');

    IF v_invalid_order_status_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED: Preflight validation found % order(s) with NULL or incompatible payment_status values not permitted by the expanded CHECK constraint.', v_invalid_order_status_count;
    END IF;
END $$;

-- Database-level protection against duplicate successful payment records
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_order_captured 
    ON public.payments(order_id) 
    WHERE status = 'CAPTURED';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_provider_payment_captured 
    ON public.payments(provider_payment_id) 
    WHERE provider_payment_id IS NOT NULL AND status = 'CAPTURED';

-- 3. Update orders columns and payment_status CHECK constraint to permit 'CAPTURED' while preserving 'COMPLETED'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON public.orders(provider_order_id);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
    CHECK (payment_status IN ('PENDING', 'CAPTURED', 'COMPLETED', 'FAILED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_FAILED'));

-- Drop any existing legacy RPC signatures before creating hardened function
DROP FUNCTION IF EXISTS public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB
);
DROP FUNCTION IF EXISTS public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT
);

-- 4. Atomic PostgreSQL RPC Function for Order & Payment Settlement
-- Ensures order status update, payment insertion, and webhook idempotency occur inside one transaction
CREATE OR REPLACE FUNCTION public.confirm_order_payment_atomic(
    p_event_id TEXT,
    p_event_type TEXT,
    p_provider_order_id TEXT,
    p_provider_payment_id TEXT,
    p_order_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT,
    p_payment_method TEXT,
    p_paid_at TIMESTAMPTZ,
    p_raw_payload JSONB,
    p_amount_unit TEXT DEFAULT 'RUPEES'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_target_order_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_payment_id UUID := gen_random_uuid();
    -- Typed scalar variables replacing the untyped RECORD for v_existing_event.
    -- Initialised to NULL so any read before a row is found is safe (returns NULL, never raises).
    v_evt_id              UUID    := NULL;
    v_evt_status          TEXT    := NULL;
    v_evt_order_id        UUID    := NULL;
    v_evt_prov_order_id   TEXT    := NULL;
    v_evt_prov_payment_id TEXT    := NULL;
    v_evt_found           BOOLEAN := FALSE;
    v_existing_payment RECORD;
    v_existing_payment_by_prov RECORD;
    v_check_amount NUMERIC;
    v_clean_event_id TEXT := NULLIF(TRIM(p_event_id), '');
    v_clean_prov_order_id TEXT := NULLIF(TRIM(p_provider_order_id), '');
    v_clean_prov_payment_id TEXT := NULLIF(TRIM(p_provider_payment_id), '');
    v_clean_currency TEXT := UPPER(TRIM(COALESCE(p_currency, '')));
    v_clean_unit TEXT := UPPER(TRIM(COALESCE(p_amount_unit, 'RUPEES')));
BEGIN
    -- Step A: Strict Currency Validation (only INR accepted)
    IF v_clean_currency <> 'INR' THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'CURRENCY_MISMATCH',
            'message', 'Invalid or missing payment currency: only INR is accepted'
        );
    END IF;

    -- Step B: Strict Provider Payment ID Validation (Reject missing or blank provider payment ID)
    -- Never substitute order ID for payment ID
    IF v_clean_prov_payment_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'MISSING_PROVIDER_PAYMENT_ID',
            'message', 'Valid provider payment ID is required for successful online settlement'
        );
    END IF;

    -- Step C: Early Webhook Event Lookup & Conflict Prevention
    -- Results stored in typed scalar variables (v_evt_*) declared at top-level DECLARE.
    -- These are initialised to NULL, so any path that skips the SELECT leaves them NULL,
    -- which is safe to read anywhere in the function without a "record not assigned" error.
    IF v_clean_event_id IS NOT NULL THEN
        SELECT
            we.id,
            we.status,
            we.order_id,
            we.provider_order_id,
            we.provider_payment_id
        INTO
            v_evt_id,
            v_evt_status,
            v_evt_order_id,
            v_evt_prov_order_id,
            v_evt_prov_payment_id
        FROM public.webhook_events we
        WHERE we.event_id = v_clean_event_id
        FOR UPDATE;

        IF FOUND THEN
            v_evt_found := TRUE;
        END IF;

        IF v_evt_found THEN
            -- If already processed, ensure identity consistency and return idempotent success
            IF v_evt_status = 'PROCESSED' THEN
                -- If event is already linked to an order, verify incoming order identifier matches
                IF v_evt_order_id IS NOT NULL THEN
                    SELECT * INTO v_order FROM public.orders WHERE id = v_evt_order_id FOR UPDATE;
                    IF p_order_id IS NOT NULL AND TRIM(p_order_id) <> '' THEN
                        IF v_order.id IS NOT NULL AND v_order.id::TEXT <> TRIM(p_order_id) AND v_order.order_number <> TRIM(p_order_id) THEN
                            RETURN jsonb_build_object(
                                'success', false,
                                'already_processed', false,
                                'error', 'EVENT_ID_CONFLICT',
                                'message', format('Webhook event %s is already processed for a different order', v_clean_event_id)
                            );
                        END IF;
                    END IF;
                END IF;

                -- Verify incoming provider payment ID matches existing event
                IF v_evt_prov_payment_id IS NOT NULL AND v_clean_prov_payment_id IS NOT NULL
                   AND v_evt_prov_payment_id <> v_clean_prov_payment_id THEN
                    RETURN jsonb_build_object(
                        'success', false,
                        'already_processed', false,
                        'error', 'EVENT_ID_CONFLICT',
                        'message', format('Webhook event %s is already processed with payment %s', v_clean_event_id, v_evt_prov_payment_id)
                    );
                END IF;

                RETURN jsonb_build_object(
                    'success', true,
                    'already_processed', true,
                    'order_id', COALESCE(v_order.id, v_evt_order_id),
                    'order_number', v_order.order_number,
                    'message', 'Webhook event already processed'
                );
            END IF;
            -- Non-PROCESSED (PENDING/FAILED): v_evt_found=TRUE, v_evt_* populated for Step E.
        END IF;
        -- No row: v_evt_found=FALSE, all v_evt_* remain NULL. Step E skips safely.
    END IF;

    -- Step D: Strict Order Resolution & Exclusive Row Lock (FOR UPDATE)
    -- Locate order by explicit UUID or order_number first
    IF p_order_id IS NOT NULL AND TRIM(p_order_id) <> '' THEN
        BEGIN
            v_target_order_id := p_order_id::UUID;
            SELECT * INTO v_order FROM public.orders WHERE id = v_target_order_id FOR UPDATE;
        EXCEPTION WHEN invalid_text_representation THEN
            -- Non-UUID string passed as p_order_id (e.g. order_number), fallback to order_number lookup
            v_target_order_id := NULL;
        END;

        IF v_order.id IS NULL THEN
            SELECT * INTO v_order 
            FROM public.orders 
            WHERE order_number = TRIM(p_order_id)
            FOR UPDATE
            LIMIT 1;
        END IF;
    END IF;

    -- If not found by p_order_id, look up strictly by provider_order_id
    IF v_order.id IS NULL AND v_clean_prov_order_id IS NOT NULL THEN
        SELECT * INTO v_order 
        FROM public.orders 
        WHERE provider_order_id = v_clean_prov_order_id
        FOR UPDATE
        LIMIT 1;
    END IF;

    IF v_order.id IS NULL THEN
        -- Record failed webhook event if event_id is present, but NEVER overwrite an existing processed or linked event
        IF v_clean_event_id IS NOT NULL THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                status, payload, error_message, updated_at
            ) VALUES (
                v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                'FAILED', p_raw_payload, 'Order not found in database', v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = 'Order not found in database',
                updated_at = v_now
            WHERE webhook_events.status <> 'PROCESSED'
              AND webhook_events.order_id IS NULL;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'ORDER_NOT_FOUND',
            'message', 'Order not found for confirmation'
        );
    END IF;

    -- Step E: Post-Order-Resolution Webhook Event Conflict & Retry Check
    -- Uses v_evt_found / v_evt_* scalars set in Step C. All initialised to NULL/FALSE so reads
    -- are always safe even when no row was found. This is the fix for "record not assigned yet".
    IF v_clean_event_id IS NOT NULL AND v_evt_found THEN
        -- Reject reuse of event_id across different orders or payments
        IF (v_evt_order_id IS NOT NULL AND v_evt_order_id <> v_order.id)
           OR (v_evt_prov_order_id IS NOT NULL AND v_clean_prov_order_id IS NOT NULL AND v_evt_prov_order_id <> v_clean_prov_order_id)
           OR (v_evt_prov_payment_id IS NOT NULL AND v_clean_prov_payment_id IS NOT NULL AND v_evt_prov_payment_id <> v_clean_prov_payment_id) THEN
            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'EVENT_ID_CONFLICT',
                'message', format('Webhook event %s is already associated with a different order or payment identifier', v_clean_event_id)
            );
        END IF;

        -- If already processed for THIS order, return idempotent success
        IF v_evt_status = 'PROCESSED' THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'message', 'Webhook event already processed'
            );
        END IF;
        -- If status is 'FAILED' or 'PENDING', allow retry to proceed for this order!
    END IF;

    -- Step F: Conflict checks on provider_order_id
    -- If order already has a provider_order_id and a different provider_order_id is passed
    IF v_order.provider_order_id IS NOT NULL AND TRIM(v_order.provider_order_id) <> ''
       AND v_clean_prov_order_id IS NOT NULL
       AND v_order.provider_order_id <> v_clean_prov_order_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'PROVIDER_ORDER_MISMATCH',
            'message', format('Order provider_order_id mismatch: expected %s, got %s', v_order.provider_order_id, v_clean_prov_order_id)
        );
    END IF;

    -- Ensure v_clean_prov_order_id is not already linked to a different order
    IF v_clean_prov_order_id IS NOT NULL THEN
        PERFORM 1 FROM public.orders 
        WHERE provider_order_id = v_clean_prov_order_id AND id <> v_order.id;
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'PROVIDER_ORDER_ALREADY_LINKED',
                'message', 'Provider order ID is already assigned to a different order'
            );
        END IF;
    END IF;

    -- Step G: Separate COD and online settlement: Reject COD orders
    IF v_order.payment_method = 'COD' OR (p_payment_method IS NOT NULL AND UPPER(TRIM(p_payment_method)) = 'COD') THEN
        IF v_clean_event_id IS NOT NULL THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, error_message, updated_at
            ) VALUES (
                v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                v_order.id, 'FAILED', p_raw_payload, 'COD orders cannot be settled via online payment settlement RPC', v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = 'COD orders cannot be settled via online payment settlement RPC',
                updated_at = v_now
            WHERE webhook_events.status <> 'PROCESSED'
              AND (webhook_events.order_id IS NULL OR webhook_events.order_id = v_order.id)
              AND (webhook_events.provider_payment_id IS NULL OR webhook_events.provider_payment_id = v_clean_prov_payment_id);
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'INVALID_PAYMENT_METHOD',
            'message', 'COD orders cannot be settled via online payment settlement'
        );
    END IF;

    -- Step H: Require authoritative positive payment amount & explicit unit conversion
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount = 'NaN'::NUMERIC THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'INVALID_PAYMENT_AMOUNT',
            'message', 'Authoritative positive payment amount is required'
        );
    END IF;

    -- Explicit unit handling: no guessing heuristics
    IF v_clean_unit = 'PAISE' THEN
        v_check_amount := ROUND(p_amount / 100.0, 2);
    ELSIF v_clean_unit = 'RUPEES' THEN
        v_check_amount := ROUND(p_amount, 2);
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'INVALID_AMOUNT_UNIT',
            'message', 'Amount unit must be RUPEES or PAISE'
        );
    END IF;

    -- Enforce exact paise equality (zero difference permitted)
    IF v_check_amount <> ROUND(v_order.total_amount, 2) THEN
        IF v_clean_event_id IS NOT NULL THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, error_message, updated_at
            ) VALUES (
                v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                v_order.id, 'FAILED', p_raw_payload, format('Amount mismatch: expected ₹%s, got ₹%s', ROUND(v_order.total_amount, 2), v_check_amount), v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = format('Amount mismatch: expected ₹%s, got ₹%s', ROUND(v_order.total_amount, 2), v_check_amount),
                updated_at = v_now
            WHERE webhook_events.status <> 'PROCESSED'
              AND (webhook_events.order_id IS NULL OR webhook_events.order_id = v_order.id)
              AND (webhook_events.provider_payment_id IS NULL OR webhook_events.provider_payment_id = v_clean_prov_payment_id);
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'AMOUNT_MISMATCH',
            'message', format('Amount mismatch: expected ₹%s, received ₹%s', ROUND(v_order.total_amount, 2), v_check_amount)
        );
    END IF;

    -- Step I: Check if order is already captured or payment recorded (Idempotency)
    SELECT id, provider_payment_id INTO v_existing_payment 
    FROM public.payments 
    WHERE order_id = v_order.id AND status = 'CAPTURED'
    LIMIT 1;

    IF FOUND OR (v_order.payment_status = 'CAPTURED' AND v_order.status <> 'PENDING_PAYMENT') THEN
        -- Prevent overwriting a previously recorded provider_payment_id with a different ID
        IF v_existing_payment.id IS NOT NULL 
           AND v_existing_payment.provider_payment_id IS NOT NULL 
           AND v_clean_prov_payment_id IS NOT NULL 
           AND v_existing_payment.provider_payment_id <> v_clean_prov_payment_id THEN
            IF v_clean_event_id IS NOT NULL THEN
                INSERT INTO public.webhook_events (
                    event_id, event_type, provider, provider_order_id, provider_payment_id,
                    order_id, status, payload, error_message, updated_at
                ) VALUES (
                    v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                    v_order.id, 'FAILED', p_raw_payload, format('Conflict: order already settled with provider payment ID %s', v_existing_payment.provider_payment_id), v_now
                )
                ON CONFLICT (event_id) DO UPDATE SET
                    status = 'FAILED',
                    error_message = format('Conflict: order already settled with provider payment ID %s', v_existing_payment.provider_payment_id),
                    updated_at = v_now
                WHERE webhook_events.status <> 'PROCESSED'
                  AND (webhook_events.order_id IS NULL OR webhook_events.order_id = v_order.id)
                  AND (webhook_events.provider_payment_id IS NULL OR webhook_events.provider_payment_id = v_clean_prov_payment_id);
            END IF;

            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'PAYMENT_ID_MISMATCH',
                'message', format('Order already settled with provider payment ID %s, cannot overwrite with %s', v_existing_payment.provider_payment_id, v_clean_prov_payment_id)
            );
        END IF;

        IF v_clean_event_id IS NOT NULL THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, processed_at, updated_at
            ) VALUES (
                v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                v_order.id, 'PROCESSED', p_raw_payload, v_now, v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'PROCESSED',
                order_id = v_order.id,
                processed_at = v_now,
                updated_at = v_now
            WHERE (webhook_events.order_id IS NULL OR webhook_events.order_id = v_order.id)
              AND (webhook_events.provider_payment_id IS NULL OR webhook_events.provider_payment_id = v_clean_prov_payment_id);
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'payment_id', COALESCE(v_existing_payment.id, v_payment_id),
            'message', 'Order already captured'
        );
    END IF;

    -- Step J: Check duplicate provider_payment_id across different orders
    SELECT id, order_id INTO v_existing_payment_by_prov
    FROM public.payments
    WHERE provider_payment_id = v_clean_prov_payment_id AND status = 'CAPTURED'
    LIMIT 1;

    IF FOUND AND v_existing_payment_by_prov.order_id <> v_order.id THEN
        IF v_clean_event_id IS NOT NULL THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, error_message, updated_at
            ) VALUES (
                v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                v_order.id, 'FAILED', p_raw_payload, 'Duplicate provider payment ID on different order', v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = 'Duplicate provider payment ID on different order',
                updated_at = v_now
            WHERE webhook_events.status <> 'PROCESSED'
              AND (webhook_events.order_id IS NULL OR webhook_events.order_id = v_order.id)
              AND (webhook_events.provider_payment_id IS NULL OR webhook_events.provider_payment_id = v_clean_prov_payment_id);
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'PAYMENT_ID_ALREADY_USED',
            'message', 'This provider payment ID has already been applied to another order'
        );
    END IF;

    -- Step K/L: Atomic Settlement Block (Payment insertion, Order update, Webhook event)
    -- All three statements execute in an atomic subtransaction block.
    -- If ANY operation fails (e.g. payment constraint, check violation, trigger, or forced failure):
    -- The subtransaction rolls back ALL changes made within this block to the savepoint at BEGIN.
    -- The order is GUARANTEED to remain in its previous un-captured state.
    BEGIN
        -- 1. Insert payment record FIRST
        INSERT INTO public.payments (
            id,
            order_id,
            razorpay_order_id,
            razorpay_payment_id,
            provider_order_id,
            provider_payment_id,
            amount,
            status,
            method,
            currency,
            raw_webhook_payload,
            created_at,
            updated_at
        ) VALUES (
            v_payment_id,
            v_order.id,
            NULL,
            NULL,
            v_clean_prov_order_id,
            v_clean_prov_payment_id,
            v_check_amount,
            'CAPTURED',
            'ONLINE',
            'INR',
            p_raw_payload,
            v_now,
            v_now
        );

        -- 2. Update order to PLACED & CAPTURED ONLY AFTER payment record is inserted
        UPDATE public.orders
        SET 
            status = 'PLACED',
            payment_status = 'CAPTURED',
            provider_order_id = COALESCE(provider_order_id, v_clean_prov_order_id),
            paid_at = COALESCE(p_paid_at, v_now),
            confirmed_at = COALESCE(confirmed_at, v_now),
            updated_at = v_now
        WHERE id = v_order.id;

        -- 3. Mark webhook event as PROCESSED
        IF v_clean_event_id IS NOT NULL THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, processed_at, updated_at
            ) VALUES (
                v_clean_event_id, p_event_type, 'CASHFREE', v_clean_prov_order_id, v_clean_prov_payment_id,
                v_order.id, 'PROCESSED', p_raw_payload, v_now, v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'PROCESSED',
                order_id = v_order.id,
                processed_at = v_now,
                updated_at = v_now
            WHERE (webhook_events.order_id IS NULL OR webhook_events.order_id = v_order.id)
              AND (webhook_events.provider_payment_id IS NULL OR webhook_events.provider_payment_id = v_clean_prov_payment_id);
        END IF;

    EXCEPTION 
        WHEN unique_violation THEN
            -- Automatic savepoint rollback restored order and payments to pre-block state!
            -- The order is guaranteed to remain untouched in its original status.
            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'PAYMENT_ID_ALREADY_USED',
                'message', 'Payment already captured or provider payment ID is in use'
            );
        WHEN OTHERS THEN
            -- Any other database failure automatically rolls back the entire settlement.
            -- The order is guaranteed to remain untouched in its original status.
            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'SETTLEMENT_FAILED',
                'message', SQLERRM
            );
    END;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'payment_id', v_payment_id,
        'amount', v_check_amount,
        'paid_at', COALESCE(p_paid_at, v_now)
    );
END;
$$;

-- 5. Revoke execute privileges on confirm_order_payment_atomic from untrusted roles
REVOKE ALL ON FUNCTION public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT
) FROM anon;

REVOKE ALL ON FUNCTION public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT
) FROM authenticated;

-- Grant EXECUTE permission exclusively to service_role (backend server only)
GRANT EXECUTE ON FUNCTION public.confirm_order_payment_atomic(
    TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT
) TO service_role;

COMMIT;
