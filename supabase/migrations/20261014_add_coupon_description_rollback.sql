-- ==============================================================================
-- MIGRATION ROLLBACK: 20261014_add_coupon_description_rollback.sql
-- DESCRIPTION: Roll back description column from public.coupons table
-- SAFETY: Wrapped in transaction block BEGIN / COMMIT.
-- ==============================================================================

BEGIN;

ALTER TABLE public.coupons
  DROP COLUMN IF EXISTS description;

COMMIT;
