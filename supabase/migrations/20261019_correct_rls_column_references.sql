-- Migration: Correct RLS column references on public.orders, public.order_items, and public.addresses
-- Vulnerability Reference: SS-VULN-003

-- 1. Fix public.addresses policies (profile_id -> user_id)
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_staff());
CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- 2. Fix public.orders and public.order_items policies (orders.profile_id -> orders.user_id)
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_staff());
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin_or_staff()))
);
