-- Add per_carton_quantity column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS per_carton_quantity INTEGER DEFAULT 1;

COMMENT ON COLUMN public.items.per_carton_quantity IS 'Number of pieces in one carton box';
