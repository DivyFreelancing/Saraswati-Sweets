-- Migration: 20261014_add_order_confirmation_email_sent_at.sql
-- Description: Add optional explicit column confirmation_email_sent_at to public.orders table
-- Context: Customer order confirmation emails are now sent strictly once upon admin acceptance/confirmation.
-- Note: Code maintains full backward compatibility and also stores the notification marker in slot_snapshot JSONB.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.orders.confirmation_email_sent_at IS 'Timestamp when the customer order confirmation email was dispatched by ZeptoMail';

COMMIT;
