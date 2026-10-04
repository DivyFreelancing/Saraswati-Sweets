CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    refund_id VARCHAR(100) NOT NULL UNIQUE,
    cf_refund_id VARCHAR(100),
    refund_amount NUMERIC(10, 2) NOT NULL,
    refund_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    refund_note TEXT,
    refund_arn VARCHAR(100),
    raw_response JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Refunds viewable by admins and staff" ON public.refunds FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
  )
);

CREATE POLICY "Refunds manageable by admins" ON public.refunds FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  )
);
