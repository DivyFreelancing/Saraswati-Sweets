-- ==========================================================
-- Migration Rollback: 20261011_delivery_takeaway_operations_rollback.sql
-- Description: Safely rolls back delivery/takeaway operations columns and RPC function.
-- ==========================================================

DROP FUNCTION IF EXISTS public.check_and_reserve_pickup_slot(DATE, TIME, TIME, INT);

DROP INDEX IF EXISTS public.idx_orders_fulfilment_status;
DROP INDEX IF EXISTS public.idx_orders_fulfilment_type;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'orders'
          AND constraint_name = 'orders_fulfilment_type_check'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_fulfilment_type_check;
    END IF;
END $$;

ALTER TABLE public.orders DROP COLUMN IF EXISTS fulfilment_type;

ALTER TABLE public.store_settings
DROP COLUMN IF EXISTS auto_reopen_at,
DROP COLUMN IF EXISTS pickup_advance_days,
DROP COLUMN IF EXISTS pickup_max_orders_per_slot,
DROP COLUMN IF EXISTS pickup_slot_duration_minutes,
DROP COLUMN IF EXISTS pickup_closing_time,
DROP COLUMN IF EXISTS pickup_opening_time,
DROP COLUMN IF EXISTS closure_message,
DROP COLUMN IF EXISTS takeaway_enabled,
DROP COLUMN IF EXISTS delivery_enabled;
