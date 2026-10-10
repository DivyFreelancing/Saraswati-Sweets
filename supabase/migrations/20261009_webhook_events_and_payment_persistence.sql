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
-- 3. Check for unsupported payment_status values in orders:
--    SELECT DISTINCT payment_status
--    FROM public.orders
--    WHERE payment_status NOT IN ('PENDING', 'CAPTURED', 'COMPLETED', 'FAILED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_FAILED');
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

CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON public.payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON public.payments(provider_payment_id);

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
    v_existing_event RECORD;
    v_existing_payment_id UUID;
    v_existing_payment_by_prov RECORD;
    v_check_amount NUMERIC;
BEGIN
    -- Step A: Strict Currency Validation (only INR accepted)
    IF p_currency IS NULL OR TRIM(p_currency) = '' OR UPPER(TRIM(p_currency)) <> 'INR' THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'CURRENCY_MISMATCH',
            'message', 'Invalid or missing payment currency: only INR is accepted'
        );
    END IF;

    -- Step B: Check if webhook event was already successfully processed (Idempotency check)
    IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
        SELECT id, status, order_id INTO v_existing_event 
        FROM public.webhook_events 
        WHERE event_id = p_event_id;

        IF FOUND AND v_existing_event.status = 'PROCESSED' THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'order_id', v_existing_event.order_id,
                'message', 'Webhook event already processed'
            );
        END IF;
    END IF;

    -- Step C: Strict Order / Provider Mapping (No ambiguous or mismatched identifier matching)
    -- Locate order by explicit UUID or order_number first
    IF p_order_id IS NOT NULL AND TRIM(p_order_id) <> '' THEN
        BEGIN
            v_target_order_id := p_order_id::UUID;
            SELECT * INTO v_order FROM public.orders WHERE id = v_target_order_id FOR UPDATE;
        EXCEPTION WHEN OTHERS THEN
            v_target_order_id := NULL;
        END;

        IF v_order.id IS NULL THEN
            SELECT * INTO v_order 
            FROM public.orders 
            WHERE order_number = p_order_id
            FOR UPDATE
            LIMIT 1;
        END IF;
    END IF;

    -- If not found by p_order_id, look up strictly by provider_order_id
    IF v_order.id IS NULL AND p_provider_order_id IS NOT NULL AND TRIM(p_provider_order_id) <> '' THEN
        SELECT * INTO v_order 
        FROM public.orders 
        WHERE provider_order_id = p_provider_order_id
        FOR UPDATE
        LIMIT 1;
    END IF;

    IF v_order.id IS NULL THEN
        -- Record failed webhook event if event_id is present
        IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                status, payload, error_message, updated_at
            ) VALUES (
                p_event_id, p_event_type, 'CASHFREE', p_provider_order_id, p_provider_payment_id,
                'FAILED', p_raw_payload, 'Order not found in database', v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = 'Order not found in database',
                updated_at = v_now;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'ORDER_NOT_FOUND',
            'message', 'Order not found for confirmation'
        );
    END IF;

    -- Conflict check: if order already has a provider_order_id and a different provider_order_id is passed
    IF v_order.provider_order_id IS NOT NULL AND TRIM(v_order.provider_order_id) <> ''
       AND p_provider_order_id IS NOT NULL AND TRIM(p_provider_order_id) <> ''
       AND v_order.provider_order_id <> p_provider_order_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'PROVIDER_ORDER_MISMATCH',
            'message', format('Order provider_order_id mismatch: expected %s, got %s', v_order.provider_order_id, p_provider_order_id)
        );
    END IF;

    -- Conflict check: ensure p_provider_order_id is not already linked to a different order
    IF p_provider_order_id IS NOT NULL AND TRIM(p_provider_order_id) <> '' THEN
        PERFORM 1 FROM public.orders 
        WHERE provider_order_id = p_provider_order_id AND id <> v_order.id;
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'PROVIDER_ORDER_ALREADY_LINKED',
                'message', 'Provider order ID is already assigned to a different order'
            );
        END IF;
    END IF;

    -- Step D: Separate COD and online settlement: Reject COD orders
    IF v_order.payment_method = 'COD' OR (p_payment_method IS NOT NULL AND UPPER(TRIM(p_payment_method)) = 'COD') THEN
        IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, error_message, updated_at
            ) VALUES (
                p_event_id, p_event_type, 'CASHFREE', p_provider_order_id, p_provider_payment_id,
                v_order.id, 'FAILED', p_raw_payload, 'COD orders cannot be settled via online payment settlement RPC', v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = 'COD orders cannot be settled via online payment settlement RPC',
                updated_at = v_now;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'INVALID_PAYMENT_METHOD',
            'message', 'COD orders cannot be settled via online payment settlement'
        );
    END IF;

    -- Step E: Require valid authoritative positive payment amount & explicit unit conversion
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'INVALID_PAYMENT_AMOUNT',
            'message', 'Authoritative positive payment amount is required'
        );
    END IF;

    -- Explicit unit handling: no guessing heuristics
    IF p_amount_unit IS NOT NULL AND UPPER(TRIM(p_amount_unit)) = 'PAISE' THEN
        v_check_amount := ROUND(p_amount / 100.0, 2);
    ELSIF p_amount_unit IS NULL OR UPPER(TRIM(p_amount_unit)) = 'RUPEES' THEN
        v_check_amount := ROUND(p_amount, 2);
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'INVALID_AMOUNT_UNIT',
            'message', 'Amount unit must be RUPEES or PAISE'
        );
    END IF;

    -- Enforce exact 2-decimal comparison and rounding policy
    IF ABS(v_check_amount - ROUND(v_order.total_amount, 2)) > 0.01 THEN
        IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, error_message, updated_at
            ) VALUES (
                p_event_id, p_event_type, 'CASHFREE', p_provider_order_id, p_provider_payment_id,
                v_order.id, 'FAILED', p_raw_payload, format('Amount mismatch: expected ₹%s, got ₹%s', ROUND(v_order.total_amount, 2), v_check_amount), v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'FAILED',
                error_message = format('Amount mismatch: expected ₹%s, got ₹%s', ROUND(v_order.total_amount, 2), v_check_amount),
                updated_at = v_now;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'error', 'AMOUNT_MISMATCH',
            'message', format('Amount mismatch: expected ₹%s, received ₹%s', ROUND(v_order.total_amount, 2), v_check_amount)
        );
    END IF;

    -- Step F: Idempotency check: check if order is already captured or payment recorded
    SELECT id INTO v_existing_payment_id 
    FROM public.payments 
    WHERE order_id = v_order.id AND status = 'CAPTURED'
    LIMIT 1;

    IF FOUND OR (v_order.payment_status = 'CAPTURED' AND v_order.status <> 'PENDING_PAYMENT') THEN
        IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
            INSERT INTO public.webhook_events (
                event_id, event_type, provider, provider_order_id, provider_payment_id,
                order_id, status, payload, processed_at, updated_at
            ) VALUES (
                p_event_id, p_event_type, 'CASHFREE', p_provider_order_id, p_provider_payment_id,
                v_order.id, 'PROCESSED', p_raw_payload, v_now, v_now
            )
            ON CONFLICT (event_id) DO UPDATE SET
                status = 'PROCESSED',
                order_id = v_order.id,
                processed_at = v_now,
                updated_at = v_now;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'payment_id', COALESCE(v_existing_payment_id, v_payment_id),
            'message', 'Order already captured'
        );
    END IF;

    -- Step G: Duplicate check on provider_payment_id across different orders
    IF p_provider_payment_id IS NOT NULL AND TRIM(p_provider_payment_id) <> '' THEN
        SELECT id, order_id INTO v_existing_payment_by_prov
        FROM public.payments
        WHERE provider_payment_id = p_provider_payment_id AND status = 'CAPTURED'
        LIMIT 1;

        IF FOUND AND v_existing_payment_by_prov.order_id <> v_order.id THEN
            IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
                INSERT INTO public.webhook_events (
                    event_id, event_type, provider, provider_order_id, provider_payment_id,
                    order_id, status, payload, error_message, updated_at
                ) VALUES (
                    p_event_id, p_event_type, 'CASHFREE', p_provider_order_id, p_provider_payment_id,
                    v_order.id, 'FAILED', p_raw_payload, 'Duplicate provider payment ID on different order', v_now
                )
                ON CONFLICT (event_id) DO UPDATE SET
                    status = 'FAILED',
                    error_message = 'Duplicate provider payment ID on different order',
                    updated_at = v_now;
            END IF;

            RETURN jsonb_build_object(
                'success', false,
                'already_processed', false,
                'error', 'PAYMENT_ID_ALREADY_USED',
                'message', 'This provider payment ID has already been applied to another order'
            );
        END IF;
    END IF;

    -- Step H: Update order to PLACED & CAPTURED
    UPDATE public.orders
    SET 
        status = 'PLACED',
        payment_status = 'CAPTURED',
        provider_order_id = COALESCE(provider_order_id, p_provider_order_id),
        paid_at = COALESCE(p_paid_at, v_now),
        confirmed_at = COALESCE(confirmed_at, v_now),
        updated_at = v_now
    WHERE id = v_order.id;

    -- Step I: Insert payment record:
    -- - razorpay_* columns set to NULL (do not store Cashfree identifiers in Razorpay columns)
    -- - provider_payment_id set to p_provider_payment_id (never substitute order ID for missing payment ID)
    -- - amount persisted as the verified gateway amount (v_check_amount)
    -- - method strictly stored as 'ONLINE' (never raw gateway string like upi/card)
    -- - raw gateway payload preserved in raw_webhook_payload JSONB
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
        p_provider_order_id,
        p_provider_payment_id,
        v_check_amount,
        'CAPTURED',
        'ONLINE',
        'INR',
        p_raw_payload,
        v_now,
        v_now
    );

    -- Step J: Mark webhook event as PROCESSED
    IF p_event_id IS NOT NULL AND TRIM(p_event_id) <> '' THEN
        INSERT INTO public.webhook_events (
            event_id, event_type, provider, provider_order_id, provider_payment_id,
            order_id, status, payload, processed_at, updated_at
        ) VALUES (
            p_event_id, p_event_type, 'CASHFREE', p_provider_order_id, p_provider_payment_id,
            v_order.id, 'PROCESSED', p_raw_payload, v_now, v_now
        )
        ON CONFLICT (event_id) DO UPDATE SET
            status = 'PROCESSED',
            order_id = v_order.id,
            processed_at = v_now,
            updated_at = v_now;
    END IF;

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
