-- Migration Rollback: 20261011_remove_delivery_slots_system_rollback.sql
-- Description: Recreates the delivery_slots table and restores foreign key constraint.
-- Limitation Note: Pre-existing individual slot reservations prior to the drop will have been deleted with the table drop,
-- so slots will need to be re-seeded / regenerated.

-- Step 1: Re-create public.delivery_slots table
CREATE TABLE IF NOT EXISTS public.delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 25,
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count <= capacity),
    cutoff_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(slot_date, start_time, end_time)
);

-- Step 2: Enable RLS and restore policies
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public active delivery slots viewable by everyone" ON public.delivery_slots;
CREATE POLICY "Public active delivery slots viewable by everyone" 
ON public.delivery_slots FOR SELECT USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "Staff can manage delivery slots" ON public.delivery_slots;
CREATE POLICY "Staff can manage delivery slots" 
ON public.delivery_slots FOR ALL USING (public.is_admin_or_staff());

-- Step 3: Re-attach foreign key constraint if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_delivery_slot_id_fkey'
          AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_delivery_slot_id_fkey 
        FOREIGN KEY (delivery_slot_id) 
        REFERENCES public.delivery_slots(id) 
        ON DELETE SET NULL
        NOT VALID;
    END IF;
END $$;

-- Optional Step 4: If public.delivery_slots_backup_20261011 exists, restore historical slot definitions
-- Note: Must specify explicit column names rather than SELECT * to guarantee schema alignment
-- INSERT INTO public.delivery_slots (
--     id, slot_date, start_time, end_time, capacity, booked_count, cutoff_at, status, created_at, updated_at
-- )
-- SELECT 
--     id, slot_date, start_time, end_time, capacity, booked_count, cutoff_at, status, created_at, updated_at
-- FROM public.delivery_slots_backup_20261011
-- ON CONFLICT (slot_date, start_time, end_time) DO NOTHING;

