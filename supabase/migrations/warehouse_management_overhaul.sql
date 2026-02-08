-- Migration: Warehouse Management Overhaul
-- Adds soft-delete, contact fields, stock_transfers table, and indexes

-- 1. Add missing columns to warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS capacity_notes TEXT;

-- 2. Backfill: Mark all existing warehouses as active
UPDATE warehouses SET is_active = TRUE WHERE is_active IS NULL;

-- 3. Drop stale tables from prior runs, then create fresh
DROP TABLE IF EXISTS stock_transfer_items;
DROP TABLE IF EXISTS stock_transfers;

CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  transfer_no TEXT NOT NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transfer_no, organization_id),
  CHECK (source_warehouse_id != destination_warehouse_id)
);

CREATE TABLE stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT
);

-- Indexes for stock_transfers
CREATE INDEX IF NOT EXISTS idx_stock_transfers_org ON stock_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_date ON stock_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON stock_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_dest ON stock_transfers(destination_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_item ON stock_transfer_items(item_id);

-- Index for soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(organization_id, is_active);

-- 4. RLS Policies for stock_transfers
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers_org_policy') THEN
    CREATE POLICY stock_transfers_org_policy ON stock_transfers
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM app_user_organizations
          WHERE user_id = auth.uid() AND is_active = TRUE
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfer_items' AND policyname = 'stock_transfer_items_policy') THEN
    CREATE POLICY stock_transfer_items_policy ON stock_transfer_items
      FOR ALL USING (
        transfer_id IN (
          SELECT id FROM stock_transfers
          WHERE organization_id IN (
            SELECT organization_id FROM app_user_organizations
            WHERE user_id = auth.uid() AND is_active = TRUE
          )
        )
      );
  END IF;
END $$;

-- 5. Function to generate next transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  fy_prefix TEXT;
BEGIN
  SELECT CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
      TO_CHAR(CURRENT_DATE, 'YY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY')
    ELSE
      TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CURRENT_DATE, 'YY')
  END INTO fy_prefix;

  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(transfer_no, '/', 2), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM stock_transfers
  WHERE organization_id = org_id
    AND transfer_no LIKE 'ST/' || '%/' || fy_prefix;

  RETURN 'ST/' || LPAD(next_num::TEXT, 4, '0') || '/' || fy_prefix;
END;
$$ LANGUAGE plpgsql;
