-- Migration: Consolidate Product Categories to 5 Canonical Categories
-- Categories: Meva, Bengali, Ghee, Khoya, Namkeen
-- Date: 2026-10-14

BEGIN;

-- 1. Update the 5 canonical categories with clean names, slugs, and ordering
UPDATE public.categories
SET
  name = 'Meva',
  slug = 'meva',
  description = 'Rich cashew, almond, pistachio and artisanal dry fruit confections.',
  display_order = 1,
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000002';

UPDATE public.categories
SET
  name = 'Bengali',
  slug = 'bengali',
  description = 'Authentic delicate chhena sweets, spongy rasgullas, and misti delicacies.',
  display_order = 2,
  is_active = true,
  updated_at = NOW()
WHERE id = '883ae551-dee9-47e0-84e3-651883073ccb';

UPDATE public.categories
SET
  name = 'Ghee',
  slug = 'ghee',
  description = 'Timeless classics prepared with 100% pure desi cow ghee.',
  display_order = 3,
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000001';

UPDATE public.categories
SET
  name = 'Khoya',
  slug = 'khoya',
  description = 'Traditional slow-reduced milk khoya and rich mawa sweets.',
  display_order = 4,
  is_active = true,
  updated_at = NOW()
WHERE id = '284272ed-691e-4720-ba2b-11a711478638';

UPDATE public.categories
SET
  name = 'Namkeen',
  slug = 'namkeen',
  description = 'Crisp savory mathris, dalmoth, and authentic Awadhi snacks.',
  display_order = 5,
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000005';

-- 2. Deactivate any non-canonical categories (e.g. Festival Hampers)
UPDATE public.categories
SET
  is_active = false,
  updated_at = NOW()
WHERE id NOT IN (
  'c1000000-0000-0000-0000-000000000002',
  '883ae551-dee9-47e0-84e3-651883073ccb',
  'c1000000-0000-0000-0000-000000000001',
  '284272ed-691e-4720-ba2b-11a711478638',
  'c1000000-0000-0000-0000-000000000005'
);

-- 3. Remap products to their appropriate canonical categories

-- Khoya products
UPDATE public.products
SET category_id = '284272ed-691e-4720-ba2b-11a711478638', updated_at = NOW()
WHERE name IN (
  'Gulab Jamun',
  'Kala Jam',
  'Lal Peda',
  'Kesariya Peda',
  'Milk Barfi',
  'Milk Cake',
  'Doda Barfi',
  'Chandrakala',
  'Nariyal Barfi (Coconut Barfi)',
  'Khoya Katli',
  'Khoya Kalakand',
  'Khoya Gilori',
  'Khoya Barfi',
  'Safed Peda',
  'Mathura Peda',
  'Milk Peda'
);

-- Meva products
UPDATE public.products
SET category_id = 'c1000000-0000-0000-0000-000000000002', updated_at = NOW()
WHERE name IN (
  'Meva Laddu',
  'Baklava',
  'Choco Bite',
  'Orange Bite',
  'Choco White',
  'Orange White',
  'Kaju Katli',
  'Kaju Kalash',
  'Kaju Kesar',
  'Pista Roll',
  'Dry Fruit Laddoo',
  'Badam Sugarfree',
  'Anjeer Sugarfree',
  'Anjeer King',
  'Meva Bite',
  'Kaju Gujiya',
  'Kaju Peda',
  'Kaju Barfi (without Silver Leaf)',
  'Anjeer Laddu',
  'Kaju Basket',
  'Heera Bite',
  'Khajoor Laddu'
);

-- Ghee products
UPDATE public.products
SET category_id = 'c1000000-0000-0000-0000-000000000001', updated_at = NOW()
WHERE name IN (
  'Pure Shuddh Ghee Motichoor Ladoo',
  'Awadhi Desi Ghee Besan Ladoo',
  'Karachi Halwa',
  'Sohan Papdi',
  'Alsi Laddu',
  'Churma Laddu',
  'Magdal',
  'Soonth Laddu',
  'Batisa Laddu',
  'Mewa Motichur Laddu',
  'Batisa Barfi',
  'Gol Batisa',
  'Mini Balushahi',
  'Chocolate Biscuit',
  'Pinni'
);

-- Bengali products
UPDATE public.products
SET category_id = '883ae551-dee9-47e0-84e3-651883073ccb', updated_at = NOW()
WHERE name IN (
  'Kolkata Style Spongy Rasgulla',
  'Rasgulla',
  'Rasmalai',
  'Rajbhog',
  'Chena Malai Chhap',
  'Chena Chowchaan',
  'Chena Sandwich',
  'Sweet Paradise',
  'Malai Roll',
  'Heera Pudding',
  'Chandra Murki',
  'Rabri',
  'Raj Kamal',
  'Saffani',
  'Kesar Halwa'
);

COMMIT;
