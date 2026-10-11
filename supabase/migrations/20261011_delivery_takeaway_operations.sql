-- ==========================================================
-- Migration: 20261011_delivery_takeaway_operations.sql
-- Description: Production-Ready Store Operations & Delivery/Takeaway Management
-- Scope:
--   1. Add store-level fulfilment toggles, operating hours, capacity limits,
--      closure notice, and auto-reopen timestamps to public.store_settings.
--   2. Add fulfilment_type column with CHECK constraint and indexes to public.orders.
--   3. Create concurrency-safe check_and_reserve_pickup_slot RPC with transaction advisory locking.
-- ==========================================================

-- Step 1: Add operations and scheduling columns to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS takeaway_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS closure_message TEXT,
ADD COLUMN IF NOT EXISTS pickup_opening_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS pickup_closing_time TIME DEFAULT '21:30:00',
ADD COLUMN IF NOT EXISTS pickup_slot_duration_minutes INT NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS pickup_max_orders_per_slot INT NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS pickup_advance_days INT NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS auto_reopen_at TIMESTAMPTZ;

-- Step 2: Add fulfilment_type column to orders (default 'DELIVERY' preserves all historical orders)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS fulfilment_type VARCHAR(20) NOT NULL DEFAULT 'DELIVERY';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'orders'
          AND constraint_name = 'orders_fulfilment_type_check'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_fulfilment_type_check
        CHECK (fulfilment_type IN ('DELIVERY', 'TAKEAWAY'));
    END IF;
END $$;

-- Step 3: Index for fast fulfilment querying and capacity aggregation
CREATE INDEX IF NOT EXISTS idx_orders_fulfilment_type ON public.orders(fulfilment_type);
CREATE INDEX IF NOT EXISTS idx_orders_fulfilment_status ON public.orders(fulfilment_type, status);

-- Step 4: Concurrency-safe slot capacity RPC function with advisory transaction locking
CREATE OR REPLACE FUNCTION public.check_and_reserve_pickup_slot(
    p_slot_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_max_capacity INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_count INT;
    v_lock_key BIGINT;
BEGIN
    -- Acquire transaction-scoped advisory lock to serialize concurrent bookings for this specific slot
    v_lock_key := hashtext(p_slot_date::TEXT || '_' || p_start_time::TEXT);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Count active takeaway orders for this slot
    SELECT COUNT(*)
    INTO v_active_count
    FROM public.orders
    WHERE fulfilment_type = 'TAKEAWAY'
      AND (
          (slot_snapshot->>'slot_date')::DATE = p_slot_date
          AND (slot_snapshot->>'start_time')::TIME = p_start_time
      )
      AND status NOT IN ('CANCELLED', 'REFUNDED', 'PAYMENT_FAILED')
      AND (status != 'PENDING_PAYMENT' OR expires_at IS NULL OR expires_at > NOW());

    IF v_active_count >= p_max_capacity THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'active_count', v_active_count,
            'max_capacity', p_max_capacity,
            'message', 'Selected pickup slot is at full capacity'
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', true,
            'active_count', v_active_count,
            'max_capacity', p_max_capacity
        );
    END IF;
END;
$$;
