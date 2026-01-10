-- =============================================================================
-- STOCK LEDGER & MULTI-GODOWN INVENTORY SYSTEM
-- =============================================================================
-- This migration implements:
-- 1. Packaging unit support (CTN, GONI, BAG, BUNDLE, PKT)
-- 2. Multi-godown stock tracking (item_warehouse_stock)
-- 3. Stock ledger for complete audit trail (stock_ledger)
-- 4. Computed triggers for real-time stock aggregation
-- =============================================================================

-- Step A: Add packaging_unit column to items table
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'packaging_unit'
  ) THEN
    ALTER TABLE public.items ADD COLUMN packaging_unit TEXT DEFAULT 'CTN';
  END IF;
END $$;

-- Add check constraint for valid packaging units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_packaging_unit'
  ) THEN
    ALTER TABLE public.items ADD CONSTRAINT check_valid_packaging_unit 
    CHECK (
      packaging_unit IS NULL OR packaging_unit = ANY(ARRAY['CTN', 'GONI', 'BAG', 'BUNDLE', 'PKT', 'BOX', 'CASE', 'ROLL', 'DRUM'])
    );
  END IF;
END $$;

-- Update comments on existing columns for clarity
COMMENT ON COLUMN public.items.per_carton_quantity IS 'Conversion factor: 1 packaging_unit = X base units (e.g., 1 CTN = 1500 PCS)';
COMMENT ON COLUMN public.items.packaging_unit IS 'Master packaging type: CTN (Carton), GONI, BAG, BUNDLE, PKT, BOX, CASE, ROLL, DRUM';
COMMENT ON COLUMN public.items.unit IS 'Base unit of measurement: PCS, KG, LTR, MTR, BOX, DOZEN, PKT, BAG';

-- Step B: Create item_warehouse_stock table (Multi-Godown Pivot)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.item_warehouse_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  max_quantity INTEGER DEFAULT 0,
  location TEXT, -- Rack/Shelf location within warehouse
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT item_warehouse_stock_pkey PRIMARY KEY (id),
  CONSTRAINT item_warehouse_stock_item_fkey FOREIGN KEY (item_id) 
    REFERENCES public.items(id) ON DELETE CASCADE,
  CONSTRAINT item_warehouse_stock_warehouse_fkey FOREIGN KEY (warehouse_id) 
    REFERENCES public.warehouses(id) ON DELETE CASCADE,
  CONSTRAINT item_warehouse_stock_org_fkey FOREIGN KEY (organization_id) 
    REFERENCES app_organizations(id) ON DELETE CASCADE,
  CONSTRAINT item_warehouse_stock_unique UNIQUE (item_id, warehouse_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_warehouse_stock_item ON public.item_warehouse_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_item_warehouse_stock_warehouse ON public.item_warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_item_warehouse_stock_org ON public.item_warehouse_stock(organization_id);

-- RLS Policies
ALTER TABLE public.item_warehouse_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item_warehouse_stock_select_policy" ON public.item_warehouse_stock;
CREATE POLICY "item_warehouse_stock_select_policy" ON public.item_warehouse_stock
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "item_warehouse_stock_insert_policy" ON public.item_warehouse_stock;
CREATE POLICY "item_warehouse_stock_insert_policy" ON public.item_warehouse_stock
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "item_warehouse_stock_update_policy" ON public.item_warehouse_stock;
CREATE POLICY "item_warehouse_stock_update_policy" ON public.item_warehouse_stock
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "item_warehouse_stock_delete_policy" ON public.item_warehouse_stock;
CREATE POLICY "item_warehouse_stock_delete_policy" ON public.item_warehouse_stock
  FOR DELETE USING (true);

-- Step C: Create stock_ledger table (Complete Audit Trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  item_id UUID NOT NULL,
  warehouse_id UUID, -- NULL for adjustments not tied to specific warehouse
  
  -- Transaction details
  transaction_type TEXT NOT NULL, -- IN, OUT, ADJUSTMENT, SALE, PURCHASE, RETURN, TRANSFER_IN, TRANSFER_OUT, OPENING
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Quantity tracking (always in base units)
  quantity_before INTEGER NOT NULL DEFAULT 0,
  quantity_change INTEGER NOT NULL, -- Positive for IN, negative for OUT
  quantity_after INTEGER NOT NULL DEFAULT 0,
  
  -- Unit tracking for display purposes
  entry_quantity NUMERIC(12, 4), -- Original quantity entered by user
  entry_unit TEXT, -- Unit selected by user (PCS, CTN, etc.)
  base_quantity INTEGER NOT NULL, -- Converted quantity in base units
  
  -- Pricing info
  rate_per_unit NUMERIC(12, 4), -- Rate at which transaction occurred
  total_value NUMERIC(14, 4), -- total_value = entry_quantity * rate_per_unit
  
  -- Reference linking
  reference_type TEXT, -- invoice, purchase, adjustment, transfer, opening
  reference_id UUID, -- Invoice ID, Purchase ID, etc.
  reference_no TEXT, -- Invoice number, Purchase number for display
  
  -- Additional metadata
  party_id UUID, -- Customer/Supplier ID
  party_name TEXT, -- Customer/Supplier name for quick display
  notes TEXT,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT stock_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT stock_ledger_item_fkey FOREIGN KEY (item_id) 
    REFERENCES public.items(id) ON DELETE CASCADE,
  CONSTRAINT stock_ledger_warehouse_fkey FOREIGN KEY (warehouse_id) 
    REFERENCES public.warehouses(id) ON DELETE SET NULL,
  CONSTRAINT stock_ledger_org_fkey FOREIGN KEY (organization_id) 
    REFERENCES app_organizations(id) ON DELETE CASCADE,
  CONSTRAINT check_transaction_type CHECK (
    transaction_type = ANY(ARRAY[
      'IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'RETURN', 
      'TRANSFER_IN', 'TRANSFER_OUT', 'OPENING', 'CORRECTION'
    ])
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON public.stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse ON public.stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_org ON public.stock_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON public.stock_ledger(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_type ON public.stock_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_reference ON public.stock_ledger(reference_type, reference_id);

-- RLS Policies
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_ledger_select_policy" ON public.stock_ledger;
CREATE POLICY "stock_ledger_select_policy" ON public.stock_ledger
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "stock_ledger_insert_policy" ON public.stock_ledger;
CREATE POLICY "stock_ledger_insert_policy" ON public.stock_ledger
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "stock_ledger_update_policy" ON public.stock_ledger;
CREATE POLICY "stock_ledger_update_policy" ON public.stock_ledger
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "stock_ledger_delete_policy" ON public.stock_ledger;
CREATE POLICY "stock_ledger_delete_policy" ON public.stock_ledger
  FOR DELETE USING (true);

-- Step D: Create function to update item's total stock from warehouse stocks
-- =============================================================================
CREATE OR REPLACE FUNCTION update_item_total_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the items table current_stock with sum from all warehouses
  UPDATE public.items
  SET current_stock = COALESCE((
    SELECT SUM(quantity) 
    FROM public.item_warehouse_stock 
    WHERE item_id = COALESCE(NEW.item_id, OLD.item_id)
  ), 0),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.item_id, OLD.item_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update item stock when warehouse stock changes
DROP TRIGGER IF EXISTS trg_update_item_total_stock ON public.item_warehouse_stock;
CREATE TRIGGER trg_update_item_total_stock
AFTER INSERT OR UPDATE OR DELETE ON public.item_warehouse_stock
FOR EACH ROW EXECUTE FUNCTION update_item_total_stock();

-- Step E: Create function to update warehouse stock and create ledger entry
-- =============================================================================
CREATE OR REPLACE FUNCTION record_stock_movement(
  p_organization_id UUID,
  p_item_id UUID,
  p_warehouse_id UUID,
  p_transaction_type TEXT,
  p_entry_quantity NUMERIC,
  p_entry_unit TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_no TEXT DEFAULT NULL,
  p_party_id UUID DEFAULT NULL,
  p_party_name TEXT DEFAULT NULL,
  p_rate_per_unit NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_item RECORD;
  v_warehouse_stock RECORD;
  v_base_quantity INTEGER;
  v_quantity_before INTEGER;
  v_quantity_after INTEGER;
  v_ledger_id UUID;
  v_quantity_change INTEGER;
BEGIN
  -- Get item details for conversion
  SELECT * INTO v_item FROM public.items WHERE id = p_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', p_item_id;
  END IF;
  
  -- Calculate base quantity based on entry unit
  IF p_entry_unit = v_item.packaging_unit AND v_item.per_carton_quantity IS NOT NULL THEN
    -- User entered in packaging units (e.g., CTN), convert to base units
    v_base_quantity := ROUND(p_entry_quantity * v_item.per_carton_quantity);
  ELSE
    -- User entered in base units (e.g., PCS)
    v_base_quantity := ROUND(p_entry_quantity);
  END IF;
  
  -- Determine if this is an IN or OUT transaction
  IF p_transaction_type IN ('IN', 'PURCHASE', 'RETURN', 'TRANSFER_IN', 'OPENING', 'ADJUSTMENT') THEN
    v_quantity_change := ABS(v_base_quantity);
  ELSE -- OUT, SALE, TRANSFER_OUT
    v_quantity_change := -ABS(v_base_quantity);
  END IF;
  
  -- Get or create warehouse stock record
  SELECT * INTO v_warehouse_stock 
  FROM public.item_warehouse_stock 
  WHERE item_id = p_item_id AND warehouse_id = p_warehouse_id;
  
  IF NOT FOUND THEN
    -- Create new warehouse stock record
    INSERT INTO public.item_warehouse_stock (
      item_id, warehouse_id, organization_id, quantity
    ) VALUES (
      p_item_id, p_warehouse_id, p_organization_id, 0
    ) RETURNING * INTO v_warehouse_stock;
  END IF;
  
  v_quantity_before := v_warehouse_stock.quantity;
  v_quantity_after := GREATEST(0, v_quantity_before + v_quantity_change);
  
  -- Update warehouse stock
  UPDATE public.item_warehouse_stock
  SET quantity = v_quantity_after,
      updated_at = NOW()
  WHERE id = v_warehouse_stock.id;
  
  -- Create ledger entry
  INSERT INTO public.stock_ledger (
    organization_id,
    item_id,
    warehouse_id,
    transaction_type,
    transaction_date,
    quantity_before,
    quantity_change,
    quantity_after,
    entry_quantity,
    entry_unit,
    base_quantity,
    rate_per_unit,
    total_value,
    reference_type,
    reference_id,
    reference_no,
    party_id,
    party_name,
    notes,
    created_by
  ) VALUES (
    p_organization_id,
    p_item_id,
    p_warehouse_id,
    p_transaction_type,
    NOW(),
    v_quantity_before,
    v_quantity_change,
    v_quantity_after,
    p_entry_quantity,
    p_entry_unit,
    v_base_quantity,
    p_rate_per_unit,
    CASE WHEN p_rate_per_unit IS NOT NULL THEN p_entry_quantity * p_rate_per_unit ELSE NULL END,
    p_reference_type,
    p_reference_id,
    p_reference_no,
    p_party_id,
    p_party_name,
    p_notes,
    p_created_by
  ) RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- Step F: Create view for item stock summary across warehouses
-- =============================================================================
CREATE OR REPLACE VIEW public.v_item_stock_summary AS
SELECT 
  i.id AS item_id,
  i.name AS item_name,
  i.item_code,
  i.unit AS base_unit,
  i.packaging_unit,
  i.per_carton_quantity,
  i.organization_id,
  COALESCE(SUM(iws.quantity), i.current_stock) AS total_stock,
  COUNT(DISTINCT iws.warehouse_id) AS warehouse_count,
  json_agg(
    json_build_object(
      'warehouse_id', w.id,
      'warehouse_name', w.name,
      'quantity', COALESCE(iws.quantity, 0),
      'location', iws.location
    )
  ) FILTER (WHERE w.id IS NOT NULL) AS warehouse_distribution
FROM public.items i
LEFT JOIN public.item_warehouse_stock iws ON i.id = iws.item_id
LEFT JOIN public.warehouses w ON iws.warehouse_id = w.id
GROUP BY i.id, i.name, i.item_code, i.unit, i.packaging_unit, i.per_carton_quantity, i.organization_id, i.current_stock;

-- Step G: Create function to get item invoice usage
-- =============================================================================
CREATE OR REPLACE FUNCTION get_item_invoice_usage(p_item_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  invoice_id UUID,
  invoice_no TEXT,
  document_type TEXT,
  invoice_date TIMESTAMP WITH TIME ZONE,
  customer_name TEXT,
  quantity NUMERIC,
  unit TEXT,
  rate NUMERIC,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    inv.id AS invoice_id,
    inv.invoice_no,
    inv.document_type,
    inv.invoice_date,
    inv.customer_name,
    (item_data->>'quantity')::NUMERIC AS quantity,
    (item_data->>'unit')::TEXT AS unit,
    (item_data->>'rate')::NUMERIC AS rate,
    (item_data->>'amount')::NUMERIC AS amount
  FROM public.invoices inv,
  LATERAL jsonb_array_elements(inv.items::jsonb) AS item_data
  WHERE item_data->>'itemId' = p_item_id::TEXT
     OR item_data->>'item_id' = p_item_id::TEXT
  ORDER BY inv.invoice_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Step H: Migrate existing stock data to item_warehouse_stock
-- =============================================================================
-- Only run if there's data to migrate and the warehouse_id exists
INSERT INTO public.item_warehouse_stock (item_id, warehouse_id, organization_id, quantity, location)
SELECT 
  i.id,
  i.warehouse_id,
  i.organization_id,
  COALESCE(i.current_stock, 0),
  i.item_location
FROM public.items i
WHERE i.warehouse_id IS NOT NULL 
  AND i.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.item_warehouse_stock iws 
    WHERE iws.item_id = i.id AND iws.warehouse_id = i.warehouse_id
  );

-- Step I: Update items table timestamp trigger
-- =============================================================================
DROP TRIGGER IF EXISTS update_item_warehouse_stock_updated_at ON public.item_warehouse_stock;
CREATE TRIGGER update_item_warehouse_stock_updated_at
BEFORE UPDATE ON public.item_warehouse_stock
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.item_warehouse_stock IS 'Multi-warehouse stock tracking - stores quantity of each item per warehouse';
COMMENT ON TABLE public.stock_ledger IS 'Complete audit trail of all stock movements with full transaction history';
COMMENT ON FUNCTION record_stock_movement IS 'Records stock movement with automatic unit conversion and ledger entry creation';
COMMENT ON VIEW public.v_item_stock_summary IS 'Aggregated view of item stock across all warehouses';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Stock Ledger & Multi-Godown migration completed successfully!';
END $$;
