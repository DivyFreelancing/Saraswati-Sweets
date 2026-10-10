-- Migration: 20261011_remove_delivery_slots_system.sql
-- Description: Safely remove delivery slot booking system while preserving historical order data.
-- Scope:
--   1. Drop foreign key constraint on orders(delivery_slot_id) to decouple orders from delivery_slots.
--   2. Preserve orders.delivery_slot_id and orders.slot_snapshot columns for historical order auditing.
--   3. Drop RLS policies on public.delivery_slots.
--   4. Drop public.delivery_slots table.

-- Step 1: Drop foreign key constraint from orders to delivery_slots
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_delivery_slot_id_fkey'
          AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_delivery_slot_id_fkey;
    END IF;
END $$;

-- Step 2: Drop Row Level Security policies on delivery_slots
DROP POLICY IF EXISTS "Public active delivery slots viewable by everyone" ON public.delivery_slots;
DROP POLICY IF EXISTS "Staff can manage delivery slots" ON public.delivery_slots;

-- Step 3: Drop the delivery_slots table safely
DROP TABLE IF EXISTS public.delivery_slots;

-- Note: orders.delivery_slot_id and orders.slot_snapshot columns are intentionally preserved
-- so existing historical order records and audit logs are never corrupted or deleted.
