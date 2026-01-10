-- =============================================================================
-- MIGRATE EXISTING STOCK DATA TO MULTI-GODOWN SYSTEM
-- =============================================================================
-- Run this AFTER 007_stock_ledger_multi_godown.sql
-- This populates item_warehouse_stock and creates opening ledger entries
-- =============================================================================

-- Step 1: Migrate existing item stock to item_warehouse_stock
-- =============================================================================
DO $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_item RECORD;
  v_default_warehouse_id UUID;
BEGIN
  RAISE NOTICE 'Starting stock data migration...';
  
  -- Get the first warehouse as default fallback
  SELECT id INTO v_default_warehouse_id
  FROM public.warehouses
  LIMIT 1;
  
  IF v_default_warehouse_id IS NULL THEN
    RAISE NOTICE 'No warehouses found! Please create at least one warehouse first.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Default warehouse ID: %', v_default_warehouse_id;
  
  -- Loop through all items that have stock but no warehouse stock records
  -- Support both 'stock' and 'current_stock' columns
  FOR v_item IN 
    SELECT 
      i.id,
      COALESCE(i.warehouse_id, v_default_warehouse_id) as warehouse_id,
      i.organization_id,
      COALESCE(i.current_stock, i.stock, 0) as current_stock,
      i.item_location,
      i.name
    FROM public.items i
    WHERE i.organization_id IS NOT NULL
      AND (COALESCE(i.current_stock, 0) > 0 OR COALESCE(i.stock, 0) > 0)
      AND NOT EXISTS (
        SELECT 1 FROM public.item_warehouse_stock iws 
        WHERE iws.item_id = i.id
      )
  LOOP
    RAISE NOTICE 'Migrating item: % (stock: %)', v_item.name, v_item.current_stock;
    
    -- Insert into item_warehouse_stock
    INSERT INTO public.item_warehouse_stock (
      item_id,
      warehouse_id,
      organization_id,
      quantity,
      location,
      created_at,
      updated_at
    ) VALUES (
      v_item.id,
      v_item.warehouse_id,
      v_item.organization_id,
      v_item.current_stock,
      v_item.item_location,
      NOW(),
      NOW()
    )
    ON CONFLICT (item_id, warehouse_id) DO UPDATE 
    SET quantity = EXCLUDED.quantity,
        updated_at = NOW();
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Migrated % items to warehouse stock', v_migrated_count;
END $$;

-- Step 2: Create opening stock ledger entries for audit trail
-- =============================================================================
DO $$
DECLARE
  v_ledger_count INTEGER := 0;
  v_stock RECORD;
  v_item RECORD;
BEGIN
  RAISE NOTICE 'Creating opening stock ledger entries...';
  
  -- Loop through all warehouse stock records without ledger entries
  FOR v_stock IN 
    SELECT 
      iws.id,
      iws.item_id,
      iws.warehouse_id,
      iws.organization_id,
      iws.quantity
    FROM public.item_warehouse_stock iws
    WHERE iws.quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_ledger sl 
        WHERE sl.item_id = iws.item_id 
          AND sl.warehouse_id = iws.warehouse_id
          AND sl.transaction_type = 'OPENING'
      )
  LOOP
    -- Get item details for unit conversion
    SELECT 
      packaging_unit,
      per_carton_quantity,
      unit
    INTO v_item
    FROM public.items
    WHERE id = v_stock.item_id;
    
    -- Create opening ledger entry
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
      reference_type,
      reference_no,
      notes,
      created_at
    ) VALUES (
      v_stock.organization_id,
      v_stock.item_id,
      v_stock.warehouse_id,
      'OPENING',
      NOW(),
      0,
      v_stock.quantity,
      v_stock.quantity,
      -- If packaging unit exists, convert to packaging units for display
      CASE 
        WHEN v_item.per_carton_quantity > 0 AND v_item.packaging_unit IS NOT NULL 
        THEN v_stock.quantity::NUMERIC / NULLIF(v_item.per_carton_quantity, 0)
        ELSE v_stock.quantity
      END,
      COALESCE(v_item.packaging_unit, v_item.unit),
      v_stock.quantity,
      'opening',
      'Opening Stock',
      'Opening stock - migrated from existing data',
      NOW()
    );
    
    v_ledger_count := v_ledger_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % opening ledger entries', v_ledger_count;
END $$;

-- Step 3: Verify migration
-- =============================================================================
DO $$
DECLARE
  v_items_with_stock INTEGER;
  v_warehouse_stock_records INTEGER;
  v_ledger_entries INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_items_with_stock
  FROM public.items
  WHERE COALESCE(current_stock, 0) > 0;
  
  SELECT COUNT(*) INTO v_warehouse_stock_records
  FROM public.item_warehouse_stock;
  
  SELECT COUNT(*) INTO v_ledger_entries
  FROM public.stock_ledger
  WHERE transaction_type = 'OPENING';
  
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Items with stock: %', v_items_with_stock;
  RAISE NOTICE 'Warehouse stock records: %', v_warehouse_stock_records;
  RAISE NOTICE 'Opening ledger entries: %', v_ledger_entries;
  RAISE NOTICE '========================';
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Stock data migration completed successfully!';
  RAISE NOTICE 'All existing stock has been migrated to the multi-godown system.';
  RAISE NOTICE 'Stock Distribution and Stock History should now be visible.';
END $$;
