-- ==========================================================
-- SARASWATI SWEETS (BARABANKI, UP) - SEED DATA
-- Optional sample catalog for initial setup or testing.
-- To delete these later in Admin, either run the cleanup query below or use the Admin panel.
-- ==========================================================

-- Clean existing sample data (safe reset for seeding)
-- DELETE FROM public.gift_hamper_items;
-- DELETE FROM public.gift_hampers;
-- DELETE FROM public.product_images;
-- DELETE FROM public.product_variants;
-- DELETE FROM public.products;
-- DELETE FROM public.categories;
-- DELETE FROM public.banners;
-- DELETE FROM public.offers;

-- 1. STORE SETTINGS
INSERT INTO public.store_settings (
    id, store_name, tagline, phone, whatsapp, email, address,
    allowed_pincodes, delivery_charge, free_delivery_threshold, cod_max_limit, tax_percent,
    opening_time, closing_time, is_store_open
) VALUES (
    1,
    'Saraswati Sweets',
    'Pure Desi Ghee Mithai & Artisanal Namkeen Since 1978',
    '+91 91611 10030',
    '+91 91611 10030',
    'order@saraswatisweets.in',
    'Saraswati Sweets, Indira Market, Begum Gunj, Barabanki, Uttar Pradesh 225001, Uttar Pradesh 225001',
    ARRAY['225001', '225002', '225003', '225122'],
    40.00,
    499.00,
    2000.00,
    5.00,
    '06:30:00',
    '22:00:00',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    tagline = EXCLUDED.tagline,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address;

-- 2. CATEGORIES
INSERT INTO public.categories (id, name, slug, description, image_url, display_order, is_active) VALUES
('11111111-1111-1111-1111-111111111101', 'Desi Ghee Sweets', 'desi-ghee-sweets', 'Handcrafted in 100% pure desi cow ghee with traditional recipes passed down three generations.', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80', 1, TRUE),
('11111111-1111-1111-1111-111111111102', 'Kaju & Dry Fruit Specials', 'kaju-dry-fruits', 'Finest W320 Mangalore cashews, Californian almonds, and Afghani pistachios crafted to perfection.', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80', 2, TRUE),
('11111111-1111-1111-1111-111111111103', 'Chhena & Syrupy Delights', 'chhena-syrupy', 'Fresh buffalo cow milk curd chhena sweets, soft, spongy, and steeped in aromatic saffron syrup.', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80', 3, TRUE),
('11111111-1111-1111-1111-111111111104', 'Khoya & Mawa Specials', 'khoya-mawa', 'Slow-cooked artisanal mawa flavored with green cardamom and pure saffron from Awadh.', 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80', 4, TRUE),
('11111111-1111-1111-1111-111111111105', 'Artisanal Namkeen & Savories', 'namkeen-savories', 'Crispy traditional Awadhi snacks, dalmoth, mathri, and samosas fried fresh every morning in cold-pressed oil.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80', 5, TRUE),
('11111111-1111-1111-1111-111111111106', 'Festive Gift Hampers', 'gift-hampers', 'Curated royal gift boxes with custom greetings for weddings, Diwali, Raksha Bandhan, and corporate gifting.', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80', 6, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. PRODUCTS
INSERT INTO public.products (id, category_id, name, slug, description, ingredients, shelf_life_days, is_eggless, is_pure_ghee, is_bestseller, is_featured, is_active, badge_label) VALUES
(
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111102',
    'Signature Silver Leaf Kaju Katli',
    'kaju-katli',
    'Our crowned jewel since 1978. Melt-in-mouth diamond cut diamond-shaped fudges made from premium cashew nuts and pure organic sugar, embellished with certified edible silver foil (chandi ka varq). Thin, silken, and naturally delicate.',
    'Cashew nuts (Kaju 75%), Cane Sugar, Certified Vegetarian Silver Foil, Cardamom essence',
    15, TRUE, FALSE, TRUE, TRUE, TRUE, 'Shop Pride'
),
(
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111101',
    'Pure Shuddh Ghee Motichoor Ladoo',
    'shuddh-ghee-motichoor-ladoo',
    'Microscopic gram flour pearls (tiny boondi) fried in bubbling pure cow desi ghee, soaked in Kashmiri saffron sugar nectar, and shaped with melon seeds and crushed green cardamom. Incomparably fragrant and tender.',
    'Pure Cow Desi Ghee, Gram flour (Besan), Sugar, Kashmiri Kesar, Magaz (Melon seeds), Cardamom',
    7, TRUE, TRUE, TRUE, TRUE, TRUE, 'Bestseller'
),
(
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Royal Saffron Gulab Jamun',
    'royal-saffron-gulab-jamun',
    'Pillowy khoya dumplings fried gently to an amber mahogany finish in pure ghee, then slowly steeped in warm rosewater and saffron cardamom syrup. Served warm or at room temperature.',
    'Fresh Whole Milk Khoya, Chhena, Cardamom, Rose Water, Saffron, Sugar syrup, Desi Ghee',
    5, TRUE, TRUE, TRUE, TRUE, TRUE, 'Warm Treat'
),
(
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111101',
    'Awadhi Desi Ghee Besan Ladoo',
    'awadhi-besan-ladoo',
    'Coarse slow-roasted chickpea flour (dardara besan) caramelized over low heat with pure ghee for over 90 minutes, blended with boora sugar, toasted almond flakes, and fragrant nutmeg.',
    'Gram Flour (Besan), Pure Cow Desi Ghee, Bura Sugar, Almonds, Pistachios, Cardamom, Nutmeg',
    21, TRUE, TRUE, TRUE, FALSE, TRUE, 'Heritage Recipe'
),
(
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111104',
    'Mathura Style Roasted Peda',
    'mathura-style-peda',
    'Deeply caramelized mawa fudge rolled in fine sugar crystals. Earthy, rich, and full of vintage nostalgia. Prepared in heavy iron kadhais in the classic Barabanki tradition.',
    'Concentrated Milk Khoya, Raw Boora Sugar, Desi Ghee, Green Cardamom powder',
    14, TRUE, TRUE, FALSE, TRUE, TRUE, 'Traditional'
),
(
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111103',
    'Kolkata Style Spongy Rasgulla',
    'spongy-rasgulla',
    'Feather-light globes of fresh farm milk chhena cooked in light, crystal-clear sugar syrup. Juicy, clean, and mildly sweet. Best enjoyed chilled.',
    'Fresh Cow Milk Chhena, Purified Water, Cane Sugar, Rose water splash',
    4, TRUE, FALSE, FALSE, FALSE, TRUE, 'Chilled Special'
),
(
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111105',
    'Awadhi Shahi Dalmoth Mixture',
    'shahi-dalmoth-mixture',
    'Crisp fried whole brown lentils (sabut masoor), tender sev, and crunchy cashew splits tossed in black salt, roasted cumin, and dry mango amchur. The quintessential companion for evening tea.',
    'Masoor lentils, Gram flour, Roasted Cashews, Melon seeds, Spices, Black salt, Amchur',
    45, TRUE, FALSE, TRUE, TRUE, TRUE, 'Snack Hero'
),
(
    '22222222-2222-2222-2222-222222222208',
    '11111111-1111-1111-1111-111111111105',
    'Crispy Ajwain Khasta Mathri',
    'khasta-mathri',
    'Flaky, layered savory crackers spiced with pungent carom seeds (ajwain) and cracked black peppercorns. Crispy, golden, and deeply satisfying.',
    'Refined Wheat Flour, Cold Pressed Groundnut Oil, Ajwain, Black Pepper, Rock Salt',
    60, TRUE, FALSE, FALSE, FALSE, TRUE, 'Tea Companion'
)
ON CONFLICT (id) DO NOTHING;

-- 4. PRODUCT VARIANTS (Weights & Pricing in INR)
INSERT INTO public.product_variants (product_id, label, weight_grams, price, mrp, sku, stock_status, stock_quantity, display_order) VALUES
-- Kaju Katli
('22222222-2222-2222-2222-222222222201', '250g', 250, 260.00, 280.00, 'SKU-KK-250', 'IN_STOCK', 100, 1),
('22222222-2222-2222-2222-222222222201', '500g', 500, 510.00, 550.00, 'SKU-KK-500', 'IN_STOCK', 75, 2),
('22222222-2222-2222-2222-222222222201', '1 kg Box', 1000, 990.00, 1080.00, 'SKU-KK-1KG', 'IN_STOCK', 40, 3),

-- Motichoor Ladoo
('22222222-2222-2222-2222-222222222202', '250g', 250, 175.00, 190.00, 'SKU-ML-250', 'IN_STOCK', 120, 1),
('22222222-2222-2222-2222-222222222202', '500g', 500, 340.00, 370.00, 'SKU-ML-500', 'IN_STOCK', 85, 2),
('22222222-2222-2222-2222-222222222202', '1 kg Box', 1000, 660.00, 720.00, 'SKU-ML-1KG', 'IN_STOCK', 50, 3),

-- Gulab Jamun
('22222222-2222-2222-2222-222222222203', '500g (Approx 8 pcs)', 500, 240.00, 260.00, 'SKU-GJ-500', 'IN_STOCK', 60, 1),
('22222222-2222-2222-2222-222222222203', '1 kg (Approx 16 pcs)', 1000, 460.00, 500.00, 'SKU-GJ-1KG', 'IN_STOCK', 40, 2),

-- Besan Ladoo
('22222222-2222-2222-2222-222222222204', '250g', 250, 180.00, 200.00, 'SKU-BL-250', 'IN_STOCK', 90, 1),
('22222222-2222-2222-2222-222222222204', '500g', 500, 350.00, 390.00, 'SKU-BL-500', 'IN_STOCK', 60, 2),
('22222222-2222-2222-2222-222222222204', '1 kg Box', 1000, 680.00, 750.00, 'SKU-BL-1KG', 'IN_STOCK', 35, 3),

-- Mathura Peda
('22222222-2222-2222-2222-222222222205', '250g', 250, 160.00, 180.00, 'SKU-MP-250', 'IN_STOCK', 80, 1),
('22222222-2222-2222-2222-222222222205', '500g', 500, 310.00, 350.00, 'SKU-MP-500', 'IN_STOCK', 55, 2),

-- Rasgulla
('22222222-2222-2222-2222-222222222206', '500g (Approx 6 pcs)', 500, 190.00, 210.00, 'SKU-RG-500', 'IN_STOCK', 50, 1),
('22222222-2222-2222-2222-222222222206', '1 kg (Approx 12 pcs)', 1000, 360.00, 400.00, 'SKU-RG-1KG', 'IN_STOCK', 30, 2),

-- Dalmoth
('22222222-2222-2222-2222-222222222207', '250g Pouch', 250, 130.00, 145.00, 'SKU-DM-250', 'IN_STOCK', 120, 1),
('22222222-2222-2222-2222-222222222207', '500g Pouch', 500, 250.00, 280.00, 'SKU-DM-500', 'IN_STOCK', 90, 2),

-- Mathri
('22222222-2222-2222-2222-222222222208', '400g Box', 400, 150.00, 170.00, 'SKU-MT-400', 'IN_STOCK', 80, 1)
ON CONFLICT (sku) DO NOTHING;

-- 5. PRODUCT IMAGES (Square 1:1 appetizing photography)
INSERT INTO public.product_images (product_id, image_url, alt_text, is_primary, display_order) VALUES
('22222222-2222-2222-2222-222222222201', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', 'Silver Leaf Kaju Katli Diamond Cuts', TRUE, 1),
('22222222-2222-2222-2222-222222222202', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80', 'Golden Pure Desi Ghee Motichoor Ladoo', TRUE, 1),
('22222222-2222-2222-2222-222222222203', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80', 'Warm Saffron Gulab Jamun Bowl', TRUE, 1),
('22222222-2222-2222-2222-222222222204', 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80', 'Rich Desi Ghee Besan Ladoo with Almonds', TRUE, 1),
('22222222-2222-2222-2222-222222222205', 'https://images.unsplash.com/photo-1601050690113-1ec941ea624b?auto=format&fit=crop&w=800&q=80', 'Caramelized Mathura Style Peda', TRUE, 1),
('22222222-2222-2222-2222-222222222206', 'https://images.unsplash.com/photo-1616031037011-087000171abe?auto=format&fit=crop&w=800&q=80', 'Spongy Milk Chhena Rasgulla', TRUE, 1),
('22222222-2222-2222-2222-222222222207', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', 'Spiced Awadhi Dalmoth Mixture with Cashews', TRUE, 1),
('22222222-2222-2222-2222-222222222208', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 'Flaky Crisp Ajwain Mathri', TRUE, 1)
ON CONFLICT DO NOTHING;

-- 6. GIFT HAMPERS
INSERT INTO public.gift_hampers (id, name, slug, description, price, mrp, image_url, box_type, is_featured, is_active) VALUES
(
    '33333333-3333-3333-3333-333333333301',
    'The Awadh Darbar Royal Hamper',
    'awadh-darbar-royal-hamper',
    'A magnificent celebration trunk wrapped in raw silk and embossed gold foil, containing our finest dry-fruit confectioneries and savory snacks.',
    1450.00,
    1650.00,
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    'Embossed Silk Gold Trunk Box',
    TRUE,
    TRUE
),
(
    '33333333-3333-3333-3333-333333333302',
    'Utsav Mithai & Dry Fruits Casket',
    'utsav-mithai-casket',
    'Four-quadrant royal keepsake box featuring pure cashew katli, roasted peda, salted Californian almonds, and roasted Afghani pistachios.',
    1150.00,
    1300.00,
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    'Maroon & Gold Velvet Box',
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.gift_hamper_items (hamper_id, item_name, item_quantity, display_order) VALUES
('33333333-3333-3333-3333-333333333301', 'Silver Leaf Kaju Katli', '400g Premium Box', 1),
('33333333-3333-3333-3333-333333333301', 'Pure Desi Ghee Motichoor Ladoo', '400g Golden Tin', 2),
('33333333-3333-3333-3333-333333333301', 'Shahi Dalmoth Mixture', '250g Vacuum Jar', 3),
('33333333-3333-3333-3333-333333333301', 'Roasted Salted Cashews & Almonds', '200g Brass Jar', 4),
('33333333-3333-3333-3333-333333333302', 'Kaju Katli Diamond Cuts', '250g Box', 1),
('33333333-3333-3333-3333-333333333302', 'Heritage Mathura Peda', '250g Box', 2),
('33333333-3333-3333-3333-333333333302', 'Californian Almonds', '150g Jar', 3),
('33333333-3333-3333-3333-333333333302', 'Roasted Pistachios', '150g Jar', 4)
ON CONFLICT DO NOTHING;

-- 7. OFFERS & BANNERS
INSERT INTO public.banners (title, subtitle, image_url, cta_text, cta_link, badge, display_order, is_active) VALUES
(
    'Festive Season in Barabanki',
    'Pure Cow Desi Ghee Mithai Crafted Fresh Every Morning',
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=1200&q=80',
    'Explore Sweet Collection',
    '/catalog',
    'Heritage Since 1978',
    1,
    TRUE
)
ON CONFLICT DO NOTHING;

INSERT INTO public.offers (title, tagline, description, code, discount_text, bg_color, is_active, display_order) VALUES
(
    'Welcome to Saraswati Family',
    'Get flat ₹100 off on your first order above ₹599',
    'Valid on all authentic sweets, dry fruits, and festive boxes across Barabanki.',
    'SWAD100',
    '₹100 OFF',
    '#8A1538',
    TRUE,
    1
),
(
    'Free Delivery Across Barabanki',
    'On all orders above ₹499',
    'Delivered fresh in insulated, food-safe boxes within 2 hours of packing.',
    'FREEDEL',
    'FREE DELIVERY',
    '#C9A227',
    TRUE,
    2
)
ON CONFLICT DO NOTHING;

-- 8. COUPONS
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, per_user_limit, start_date, end_date, is_active) VALUES
('SWAD100', 'Flat ₹100 off on first order over ₹599', 'FLAT', 100.00, 599.00, 100.00, 500, 1, NOW(), NOW() + INTERVAL '180 days', TRUE),
('FESTIVE10', '10% off up to ₹150 on orders over ₹799', 'PERCENTAGE', 10.00, 799.00, 150.00, 1000, 2, NOW(), NOW() + INTERVAL '90 days', TRUE)
ON CONFLICT (code) DO NOTHING;
