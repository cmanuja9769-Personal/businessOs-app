-- Phase 7: Row-Level Security for 14 unprotected tables
-- Enables RLS and creates org-scoped policies for all tables that were missing them.

-- Helper: a reusable function returning the user's active organization IDs
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM app_user_organizations
  WHERE user_id = auth.uid()
    AND is_active = TRUE;
$$;

-- ============================================================
-- Add org_id column if missing on tables that need it (BEFORE policy creation)
-- ============================================================
ALTER TABLE business_details ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id);
ALTER TABLE queue_jobs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id);

-- ============================================================
-- 1. business_details
-- ============================================================
ALTER TABLE business_details ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_details' AND policyname = 'business_details_org_policy') THEN
    CREATE POLICY business_details_org_policy ON business_details
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
      );
  END IF;
END $$;

-- ============================================================
-- 2. customers
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_org_policy') THEN
    CREATE POLICY customers_org_policy ON customers
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 3. invoices
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_org_policy') THEN
    CREATE POLICY invoices_org_policy ON invoices
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 4. invoice_items
-- ============================================================
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_items' AND policyname = 'invoice_items_org_policy') THEN
    CREATE POLICY invoice_items_org_policy ON invoice_items
      FOR ALL USING (
        invoice_id IN (
          SELECT id FROM invoices
          WHERE organization_id IN (SELECT user_org_ids())
            OR organization_id IS NULL
        )
      );
  END IF;
END $$;

-- ============================================================
-- 5. items
-- ============================================================
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'items' AND policyname = 'items_org_policy') THEN
    CREATE POLICY items_org_policy ON items
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 6. payments
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_org_policy') THEN
    CREATE POLICY payments_org_policy ON payments
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 7. purchases
-- ============================================================
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'purchases_org_policy') THEN
    CREATE POLICY purchases_org_policy ON purchases
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 8. purchase_items
-- ============================================================
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_items' AND policyname = 'purchase_items_org_policy') THEN
    CREATE POLICY purchase_items_org_policy ON purchase_items
      FOR ALL USING (
        purchase_id IN (
          SELECT id FROM purchases
          WHERE organization_id IN (SELECT user_org_ids())
            OR organization_id IS NULL
        )
      );
  END IF;
END $$;

-- ============================================================
-- 9. suppliers
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_org_policy') THEN
    CREATE POLICY suppliers_org_policy ON suppliers
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 10. warehouses
-- ============================================================
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'warehouses_org_policy') THEN
    CREATE POLICY warehouses_org_policy ON warehouses
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
      );
  END IF;
END $$;

-- ============================================================
-- 11. gst_returns
-- ============================================================
ALTER TABLE gst_returns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gst_returns' AND policyname = 'gst_returns_org_policy') THEN
    CREATE POLICY gst_returns_org_policy ON gst_returns
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
      );
  END IF;
END $$;

-- ============================================================
-- 12. settings (make multi-tenant)
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'settings_org_policy') THEN
    CREATE POLICY settings_org_policy ON settings
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 13. queue_jobs
-- ============================================================
ALTER TABLE queue_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'queue_jobs' AND policyname = 'queue_jobs_org_policy') THEN
    CREATE POLICY queue_jobs_org_policy ON queue_jobs
      FOR ALL USING (
        organization_id IN (SELECT user_org_ids())
        OR organization_id IS NULL
      );
  END IF;
END $$;

-- ============================================================
-- 14. warehouse_stock (legacy table if separate from item_warehouse_stock)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_stock' AND table_schema = 'public') THEN
    ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_stock' AND policyname = 'warehouse_stock_org_policy') THEN
      CREATE POLICY warehouse_stock_org_policy ON warehouse_stock
        FOR ALL USING (
          organization_id IN (SELECT user_org_ids())
          OR organization_id IS NULL
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- Indexes for RLS performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_org_id ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org_id ON purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_org_id ON gst_returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_org_id ON settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- ============================================================
-- Grant access to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION user_org_ids() TO authenticated;
