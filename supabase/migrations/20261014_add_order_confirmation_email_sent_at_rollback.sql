-- Rollback: 20261014_add_order_confirmation_email_sent_at_rollback.sql
-- Description: Revert column confirmation_email_sent_at from public.orders table

BEGIN;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS confirmation_email_sent_at;

COMMIT;
