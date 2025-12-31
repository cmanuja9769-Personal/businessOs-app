-- Add optional Godown/Warehouse reference on items
-- Godown is implemented using existing `warehouses` table

ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

CREATE INDEX IF NOT EXISTS idx_items_warehouse_id ON public.items(warehouse_id);

COMMENT ON COLUMN public.items.warehouse_id IS 'Optional godown/warehouse where this item is stored';
