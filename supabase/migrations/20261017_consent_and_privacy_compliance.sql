-- ==============================================================================
-- MIGRATION: 20261017_consent_and_privacy_compliance.sql
-- DESCRIPTION: DPDP Act 2023 & Consumer Protection (E-Commerce) Rules Compliance
--   1. Create immutable consent_logs table for audit trail of consent/acknowledgements
--   2. Create privacy_requests table for tracking DPDP statutory customer requests
--   3. Change profiles.notif_promotional_opt_in DEFAULT from TRUE to FALSE (prevent dark patterns)
--   4. Enable RLS with strict user-isolation policies
-- SAFETY: Wrapped in transaction block BEGIN / COMMIT. Non-destructive, additive.
-- NOTE: DO NOT EXECUTE AUTOMATICALLY ON PRODUCTION. AWAIT EXPLICIT OPERATOR APPROVAL.
-- ==============================================================================

BEGIN;

-- 1. Create consent_logs table
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT '2026-v1.0',
  status TEXT NOT NULL DEFAULT 'ACCEPTED',
  source TEXT NOT NULL DEFAULT 'WEB',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON public.consent_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at ON public.consent_logs (created_at DESC);

COMMENT ON TABLE public.consent_logs IS 'Immutable audit ledger for recording consent grants, acknowledgements, and withdrawals per DPDP Act 2023';

-- 2. Create privacy_requests table (Data Principal Rights Desk)
CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  request_type TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON public.privacy_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_ticket_number ON public.privacy_requests (ticket_number);

COMMENT ON TABLE public.privacy_requests IS 'Statutory DPDP Act 2023 customer requests (Access, Correction, Erasure, Grievance)';

-- 3. Update profiles default marketing preference to unselected (FALSE)
-- In accordance with Indian Guidelines for Prevention and Regulation of Dark Patterns, 2023
ALTER TABLE public.profiles
  ALTER COLUMN notif_promotional_opt_in SET DEFAULT FALSE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own consent logs
DROP POLICY IF EXISTS "Customers can view their own consent logs" ON public.consent_logs;
CREATE POLICY "Customers can view their own consent logs"
  ON public.consent_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Customers can view only their own privacy requests
DROP POLICY IF EXISTS "Customers can view their own privacy requests" ON public.privacy_requests;
CREATE POLICY "Customers can view their own privacy requests"
  ON public.privacy_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Customers can insert their own privacy requests
DROP POLICY IF EXISTS "Customers can submit their own privacy requests" ON public.privacy_requests;
CREATE POLICY "Customers can submit their own privacy requests"
  ON public.privacy_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff and Admins can view all privacy requests for statutory redressal
DROP POLICY IF EXISTS "Staff and Admin can view all privacy requests" ON public.privacy_requests;
CREATE POLICY "Staff and Admin can view all privacy requests"
  ON public.privacy_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN', 'STAFF')
    )
  );

COMMIT;
