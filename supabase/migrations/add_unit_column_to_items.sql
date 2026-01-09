-- Migration: Add unit column to items table
-- Created: 2026-01-06
-- Description: Adds a unit column to store the measurement unit for items (PCS, KG, LTR, etc.)

-- Add unit column with default value 'PCS'
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'PCS';

-- Add constraint to ensure valid unit values
ALTER TABLE public.items
ADD CONSTRAINT check_unit CHECK (unit IN ('PCS', 'KG', 'LTR', 'MTR', 'BOX', 'DOZEN', 'PKT', 'BAG'));

-- Update existing items to have 'PCS' as default unit
UPDATE public.items
SET unit = 'PCS'
WHERE unit IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_unit ON public.items(unit);
