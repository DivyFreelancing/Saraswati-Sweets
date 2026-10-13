-- ==============================================================================
-- MIGRATION: 20261013_add_order_needs_review.sql
-- DESCRIPTION: Add manual review markers to public.orders table for stuck orders
-- SAFETY: Wrapped in transaction block BEGIN / COMMIT. DO NOT RUN AUTOMATICALLY.
-- ==============================================================================

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN public.orders.needs_review IS 'Flag set by background order cleanup job when an order requires manual staff review';
COMMENT ON COLUMN public.orders.review_reason IS 'Context or failure reason why the order was marked for manual review';

COMMIT;
