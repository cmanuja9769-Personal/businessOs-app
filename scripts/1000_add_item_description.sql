-- Add description column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.items.description IS 'Detailed description of the item/product';
