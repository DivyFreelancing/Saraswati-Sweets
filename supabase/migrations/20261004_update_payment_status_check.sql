-- Drop existing check constraint and add new one
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_FAILED'));

-- Also update the payments table if needed, wait, payments table has no check constraint on status (VARCHAR(30)).
