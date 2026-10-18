-- Migration: Prevent unauthorized role escalation and account tampering on public.profiles
-- Vulnerability Reference: SS-VULN-001

-- 1. Ensure RLS UPDATE policy includes WITH CHECK constraint
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Prevent role or is_active escalation via authenticated trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.id IS DISTINCT FROM OLD.id) THEN
        IF pg_catalog.current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
            RAISE EXCEPTION 'Modifying user role, account status, or ID is not permitted.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Secure execution permissions
REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 3. Restrict column-level UPDATE privileges for authenticated users
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, phone, fcm_token, notif_promotional_opt_in, updated_at) ON public.profiles TO authenticated;
