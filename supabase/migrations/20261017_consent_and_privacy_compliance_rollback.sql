-- ==============================================================================
-- ROLLBACK MIGRATION: 20261017_consent_and_privacy_compliance_rollback.sql
-- DESCRIPTION: Reverts 20261017_consent_and_privacy_compliance.sql
-- SAFETY: Wrapped in transaction block BEGIN / COMMIT.
-- NOTE: DO NOT EXECUTE AUTOMATICALLY. AWAIT OPERATOR APPROVAL.
-- ==============================================================================

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS "Customers can view their own consent logs" ON public.consent_logs;
DROP POLICY IF EXISTS "Customers can view their own privacy requests" ON public.privacy_requests;
DROP POLICY IF EXISTS "Customers can submit their own privacy requests" ON public.privacy_requests;
DROP POLICY IF EXISTS "Staff and Admin can view all privacy requests" ON public.privacy_requests;

-- Drop tables
DROP TABLE IF EXISTS public.privacy_requests CASCADE;
DROP TABLE IF EXISTS public.consent_logs CASCADE;

-- Revert profiles notif_promotional_opt_in default back to true if required
ALTER TABLE public.profiles
  ALTER COLUMN notif_promotional_opt_in SET DEFAULT TRUE;

COMMIT;
