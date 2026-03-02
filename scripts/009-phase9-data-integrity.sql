-- Phase 9: Data Integrity Fixes
-- Run this migration against your Supabase database

-- 1. Change quantity columns from integer to numeric(12,3) to support fractional quantities

-- First, drop the view that depends on items.current_stock
DROP VIEW IF EXISTS public.v_item_stock_summary;

ALTER TABLE invoice_items
  ALTER COLUMN quantity TYPE numeric(12,3) USING quantity::numeric(12,3);

ALTER TABLE purchase_items
  ALTER COLUMN quantity TYPE numeric(12,3) USING quantity::numeric(12,3);

ALTER TABLE stock_ledger
  ALTER COLUMN entry_quantity TYPE numeric(12,3) USING entry_quantity::numeric(12,3),
  ALTER COLUMN base_quantity TYPE numeric(12,3) USING base_quantity::numeric(12,3),
  ALTER COLUMN quantity_before TYPE numeric(12,3) USING quantity_before::numeric(12,3),
  ALTER COLUMN quantity_change TYPE numeric(12,3) USING quantity_change::numeric(12,3),
  ALTER COLUMN quantity_after TYPE numeric(12,3) USING quantity_after::numeric(12,3);

ALTER TABLE stock_adjustments
  ALTER COLUMN quantity TYPE numeric(12,3) USING quantity::numeric(12,3);

ALTER TABLE stock_transfer_items
  ALTER COLUMN quantity TYPE numeric(12,3) USING quantity::numeric(12,3);

ALTER TABLE items
  ALTER COLUMN current_stock TYPE numeric(12,3) USING current_stock::numeric(12,3),
  ALTER COLUMN min_stock TYPE numeric(12,3) USING min_stock::numeric(12,3);

ALTER TABLE item_warehouse_stock
  ALTER COLUMN quantity TYPE numeric(12,3) USING quantity::numeric(12,3);

-- Recreate the view after column type changes
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

COMMENT ON VIEW public.v_item_stock_summary IS 'Aggregated view of item stock across all warehouses';

-- 2. Add unique constraints on document numbers (per organization) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_number
  ON invoices (organization_id, invoice_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_org_number
  ON purchases (organization_id, purchase_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_org_number
  ON stock_transfers (organization_id, transfer_no);

CREATE UNIQUE INDEX IF NOT EXISTS idx_adjustments_org_number
  ON stock_adjustments (organization_id, adjustment_no);
