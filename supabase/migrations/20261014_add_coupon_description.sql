-- ==============================================================================
-- MIGRATION: 20261014_add_coupon_description.sql
-- DESCRIPTION: Add optional description column to public.coupons table
-- SAFETY: Wrapped in transaction block BEGIN / COMMIT. Additive change, non-breaking.
-- NOTE: DO NOT EXECUTE AUTOMATICALLY. AWAIT OPERATOR APPROVAL.
-- ==============================================================================

BEGIN;

-- Add description column if not already present
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN public.coupons.description IS 'Customer-facing or internal promotional description of the coupon discount';

COMMIT;
