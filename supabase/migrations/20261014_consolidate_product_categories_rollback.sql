-- Rollback Migration: Consolidate Product Categories
-- Date: 2026-10-14

BEGIN;

-- 1. Restore previous category names, slugs, and ordering
UPDATE public.categories
SET
  name = 'Dry Fruit Sweets',
  slug = 'dry-fruit-sweets',
  description = 'Rich cashew, almond and pistachio artisanal confections.',
  display_order = 2,
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000002';

UPDATE public.categories
SET
  name = 'Specialty Sweets',
  slug = 'specialty-sweets',
  description = 'Category for Specialty Sweets',
  display_order = 0,
  is_active = true,
  updated_at = NOW()
WHERE id = '883ae551-dee9-47e0-84e3-651883073ccb';

UPDATE public.categories
SET
  name = 'Traditional Sweets',
  slug = 'traditional-sweets',
  description = 'Timeless classics prepared with pure desi ghee and traditional recipes.',
  display_order = 1,
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000001';

UPDATE public.categories
SET
  name = 'Khoya & Mawa Specials',
  slug = 'khoya-mawa',
  description = 'Category for Khoya & Mawa Specials',
  display_order = 0,
  is_active = true,
  updated_at = NOW()
WHERE id = '284272ed-691e-4720-ba2b-11a711478638';

UPDATE public.categories
SET
  name = 'Snacks & Namkeen',
  slug = 'savory-namkeen',
  description = 'Crisp snacks and traditional savory bites.',
  display_order = 5,
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000005';

-- Re-activate Festival Hampers if needed
UPDATE public.categories
SET
  is_active = true,
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000004';

COMMIT;
