-- Rollback Migration: Revert correct_rls_column_references
-- Vulnerability Reference: SS-VULN-003 Rollback
--
-- WARNING: FUNCTIONALITY BREAKAGE OPERATION / ROLLBACK SCRIPT
-- Reverting this migration will re-introduce broken column references (orders.profile_id, addresses.profile_id).
-- Because the live schema tables use `user_id`, queries by authenticated customers will fail with
-- PostgreSQL error 42703 ("column profile_id does not exist"), blocking legitimate customer access
-- to their addresses and order history.
-- DO NOT execute this rollback unless table schema is being intentionally altered to rename user_id back to profile_id.

DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING (auth.uid() = profile_id OR public.is_admin_or_staff());
CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = profile_id OR public.is_admin_or_staff());
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.profile_id = auth.uid() OR public.is_admin_or_staff()))
);
