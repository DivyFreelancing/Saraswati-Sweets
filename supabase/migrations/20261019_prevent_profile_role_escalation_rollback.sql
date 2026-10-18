-- Rollback Migration: Revert prevent_profile_role_escalation
-- Vulnerability Reference: SS-VULN-001 Rollback
--
-- WARNING: HIGH RISK OPERATION / ROLLBACK SCRIPT
-- Reverting this migration will re-open vulnerability SS-VULN-001 (Profiles RLS Role Escalation).
-- Ordinary authenticated users will regain the ability to update their own role to 'ADMIN'
-- and modify their account status via direct Supabase client queries.
-- DO NOT execute this rollback in production unless replacing it immediately with an alternative
-- defense-in-depth authorization control.

DROP TRIGGER IF EXISTS tr_prevent_profile_role_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_role_escalation();

GRANT UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);
