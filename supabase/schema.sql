-- ==========================================================
-- SARASWATI SWEETS (BARABANKI, UP) - COMPLETE SUPABASE SCHEMA
-- Production PostgreSQL Migration with RLS and Audit Triggers
-- ==========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to handle auto updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    email VARCHAR(255),
    full_name VARCHAR(150),
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home', -- Home, Office, Other
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    street_address TEXT NOT NULL,
    landmark TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Barabanki',
    state VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    ingredients TEXT,
    shelf_life_days INT DEFAULT 7,
    is_eggless BOOLEAN NOT NULL DEFAULT TRUE,
    is_pure_ghee BOOLEAN NOT NULL DEFAULT TRUE,
    is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    badge_label VARCHAR(50), -- 'Fresh Batch', 'Festive Special', 'Chef Special'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. PRODUCT VARIANTS (Weights like 250g, 500g, 1kg)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL, -- e.g. "250g", "500g", "1 kg"
    weight_grams INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    mrp NUMERIC(10, 2) NOT NULL CHECK (mrp >= price),
    sku VARCHAR(60) UNIQUE,
    stock_status VARCHAR(20) NOT NULL DEFAULT 'IN_STOCK' CHECK (stock_status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')),
    stock_quantity INT NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(200),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CARTS & CART ITEMS
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(100), -- guest session tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, variant_id)
);

-- 8. DELIVERY SLOTS
CREATE TABLE IF NOT EXISTS public.delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 25,
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count <= capacity),
    cutoff_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(slot_date, start_time, end_time)
);

-- 9. ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) NOT NULL UNIQUE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_phone VARCHAR(20),
    guest_email VARCHAR(255),
    address_snapshot JSONB NOT NULL,
    slot_id UUID REFERENCES public.delivery_slots(id) ON DELETE SET NULL,
    slot_snapshot JSONB,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (
        status IN (
            'PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'PREPARING',
            'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED',
            'CANCELLED', 'PAYMENT_FAILED', 'REFUNDED'
        )
    ),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('ONLINE', 'COD')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    special_instructions TEXT,
    packaging_notes TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    placed_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    out_for_delivery_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    variant_label VARCHAR(50) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PAYMENTS (Razorpay & COD audit)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    gateway VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. COUPONS & COUPON USAGE
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FLAT')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_discount_amount NUMERIC(10, 2),
    usage_limit INT,
    usage_count INT NOT NULL DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_applied NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. OFFERS & BANNERS
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    tagline VARCHAR(200),
    description TEXT,
    code VARCHAR(50),
    discount_text VARCHAR(100),
    bg_color VARCHAR(30) DEFAULT '#8A1538',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(255),
    image_url TEXT NOT NULL,
    cta_text VARCHAR(50) DEFAULT 'Order Now',
    cta_link VARCHAR(200) DEFAULT '/catalog',
    badge VARCHAR(50),
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. DELIVERY PARTNERS & ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    vehicle_number VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    notes TEXT
);

-- 14. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_name VARCHAR(120) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. BULK ORDER ENQUIRIES
CREATE TABLE IF NOT EXISTS public.bulk_order_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    event_type VARCHAR(100) NOT NULL, -- Wedding, Corporate, Festival, Family Function
    event_date DATE NOT NULL,
    estimated_guests INT,
    estimated_quantity_kg INT,
    requested_sweets TEXT,
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. GIFT HAMPERS & ITEMS
CREATE TABLE IF NOT EXISTS public.gift_hampers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    mrp NUMERIC(10, 2) NOT NULL,
    image_url TEXT NOT NULL,
    box_type VARCHAR(100) DEFAULT 'Royal Gold Handcrafted Box',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gift_hamper_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hamper_id UUID NOT NULL REFERENCES public.gift_hampers(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    item_quantity VARCHAR(100) NOT NULL, -- e.g. "Kaju Katli (250g)"
    display_order INT NOT NULL DEFAULT 0
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'ORDER_UPDATE',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. STORE SETTINGS (Single row)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_name VARCHAR(150) NOT NULL DEFAULT 'Saraswati Sweets',
    tagline VARCHAR(255) DEFAULT 'Artisanal Mithai & Namkeen Since 1978',
    phone VARCHAR(30) DEFAULT '+91 94500 12345',
    whatsapp VARCHAR(30) DEFAULT '+91 94500 12345',
    email VARCHAR(100) DEFAULT 'order@saraswatisweets.in',
    address TEXT DEFAULT 'Main Market Road, Near Ghantaghar, Barabanki, Uttar Pradesh 225001',
    allowed_pincodes TEXT[] DEFAULT ARRAY['225001', '225002', '225003', '225122'],
    delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    free_delivery_threshold NUMERIC(10, 2) NOT NULL DEFAULT 499.00,
    cod_max_limit NUMERIC(10, 2) NOT NULL DEFAULT 2000.00,
    tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    opening_time TIME DEFAULT '08:00:00',
    closing_time TIME DEFAULT '22:00:00',
    is_store_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(60) NOT NULL,
    entity_id VARCHAR(60),
    changes JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_bulk_enquiries_updated_at BEFORE UPDATE ON public.bulk_order_enquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_gift_hampers_updated_at BEFORE UPDATE ON public.gift_hampers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Default-deny on all tables. Public read only on catalog tables.
-- Sensitive user/order data readable only by owner or staff.
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_order_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_hampers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_hamper_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin/staff role
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public READ on Catalog
CREATE POLICY "Public categories are viewable by everyone" ON public.categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (is_active = TRUE AND deleted_at IS NULL);
CREATE POLICY "Public variants are viewable by everyone" ON public.product_variants FOR SELECT USING (TRUE);
CREATE POLICY "Public product images are viewable by everyone" ON public.product_images FOR SELECT USING (TRUE);
CREATE POLICY "Public offers are viewable by everyone" ON public.offers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public banners are viewable by everyone" ON public.banners FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public gift hampers are viewable by everyone" ON public.gift_hampers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public hamper items are viewable by everyone" ON public.gift_hamper_items FOR SELECT USING (TRUE);
CREATE POLICY "Public published reviews are viewable by everyone" ON public.reviews FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Public store settings are viewable by everyone" ON public.store_settings FOR SELECT USING (TRUE);
CREATE POLICY "Public active delivery slots viewable by everyone" ON public.delivery_slots FOR SELECT USING (is_active = TRUE);

-- Profile policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin_or_staff());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Address policies
CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING (auth.uid() = profile_id OR public.is_admin_or_staff());
CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING (auth.uid() = profile_id);

-- Cart policies
CREATE POLICY "Users can manage their own carts" ON public.carts FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage cart items" ON public.cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.profile_id = auth.uid())
);

-- Order policies: customers see their orders, staff/admins see all
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = profile_id OR public.is_admin_or_staff());
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.profile_id = auth.uid() OR public.is_admin_or_staff()))
);

-- Bulk enquiries: anyone can insert, only admin/staff can read/update
CREATE POLICY "Anyone can submit bulk order enquiry" ON public.bulk_order_enquiries FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Staff can view bulk enquiries" ON public.bulk_order_enquiries FOR SELECT USING (public.is_admin_or_staff());
CREATE POLICY "Staff can update bulk enquiries" ON public.bulk_order_enquiries FOR UPDATE USING (public.is_admin_or_staff());

-- Admin full management policies on catalog & settings
CREATE POLICY "Staff can manage categories" ON public.categories FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage products" ON public.products FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage variants" ON public.product_variants FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage product images" ON public.product_images FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage banners" ON public.banners FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage offers" ON public.offers FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage gift hampers" ON public.gift_hampers FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage hamper items" ON public.gift_hamper_items FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage delivery slots" ON public.delivery_slots FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage delivery partners" ON public.delivery_partners FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage delivery assignments" ON public.delivery_assignments FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage reviews" ON public.reviews FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage store settings" ON public.store_settings FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "Staff can manage audit logs" ON public.audit_logs FOR ALL USING (public.is_admin_or_staff());
