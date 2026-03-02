-- Phase 2: Data Integrity & Accounting Migration
-- Run this migration against the Supabase database

BEGIN;

-- ============================================================
-- 1. Add organization_id to payments table
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organization_id);

-- ============================================================
-- 2. Add organization_id to settings table
-- ============================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_settings_org_id ON settings(organization_id);

-- ============================================================
-- 3. Add soft delete columns to core tables
-- ============================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted ON suppliers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON purchases(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. Backfill NULL organization_id on existing records
--    Strategy: Find the single org for each user-owned record
-- ============================================================

-- 4a. Backfill payments via invoices
UPDATE payments p
SET organization_id = i.organization_id
FROM invoices i
WHERE p.invoice_id = i.id
  AND p.organization_id IS NULL
  AND i.organization_id IS NOT NULL;

-- 4b. Backfill payments via purchases
UPDATE payments p
SET organization_id = pu.organization_id
FROM purchases pu
WHERE p.purchase_id = pu.id
  AND p.organization_id IS NULL
  AND pu.organization_id IS NOT NULL;

-- 4c. Backfill settings using the first (typically only) organization
UPDATE settings s
SET organization_id = (
  SELECT id FROM app_organizations ORDER BY created_at ASC LIMIT 1
)
WHERE s.organization_id IS NULL;

-- 4d. Backfill customers/suppliers/items/invoices/purchases that still have NULL org_id
-- Use the owner's active organization as the default
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  SELECT id INTO default_org_id FROM app_organizations ORDER BY created_at ASC LIMIT 1;

  IF default_org_id IS NOT NULL THEN
    UPDATE customers SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE suppliers SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE items SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE invoices SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE purchases SET organization_id = default_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- ============================================================
-- 5. Performance indexes for Phase 1 org_id filtering
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(organization_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_org_date ON purchases(organization_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_items_org_name ON items(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_org_name ON customers(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_name ON suppliers(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_payments_org_date ON payments(organization_id, payment_date DESC);

-- ============================================================
-- 6. Overpayment prevention CHECK constraint
--    Ensures paid_amount never exceeds total
-- ============================================================

-- Add CHECK constraints (safe — only fire on UPDATE/INSERT going forward)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_invoice_overpayment'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT check_invoice_overpayment
      CHECK (paid_amount <= total + 0.01);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_purchase_overpayment'
  ) THEN
    ALTER TABLE purchases ADD CONSTRAINT check_purchase_overpayment
      CHECK (paid_amount <= total + 0.01);
  END IF;
END $$;

-- ============================================================
-- 7. Stock reconciliation function
--    Recomputes items.current_stock from item_warehouse_stock
-- ============================================================

CREATE OR REPLACE FUNCTION reconcile_item_stock(p_item_id UUID)
RETURNS TABLE(item_id UUID, old_stock NUMERIC, new_stock NUMERIC, diff NUMERIC) AS $$
DECLARE
  v_old NUMERIC;
  v_new NUMERIC;
BEGIN
  SELECT current_stock INTO v_old FROM items WHERE id = p_item_id;

  SELECT COALESCE(SUM(quantity), 0) INTO v_new
  FROM item_warehouse_stock
  WHERE item_warehouse_stock.item_id = p_item_id;

  IF v_old IS DISTINCT FROM v_new THEN
    UPDATE items SET current_stock = v_new, updated_at = NOW()
    WHERE id = p_item_id;
  END IF;

  RETURN QUERY SELECT p_item_id, v_old, v_new, v_new - COALESCE(v_old, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reconcile ALL items in an organization
CREATE OR REPLACE FUNCTION reconcile_org_stock(p_organization_id UUID)
RETURNS TABLE(item_id UUID, old_stock NUMERIC, new_stock NUMERIC, diff NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT r.item_id, r.old_stock, r.new_stock, r.diff
  FROM items i,
       LATERAL reconcile_item_stock(i.id) r
  WHERE i.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Trigger: auto-reconcile stock after warehouse stock changes
-- ============================================================

CREATE OR REPLACE FUNCTION trg_reconcile_stock_after_warehouse_change()
RETURNS TRIGGER AS $$
DECLARE
  target_item_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_item_id := OLD.item_id;
  ELSE
    target_item_id := NEW.item_id;
  END IF;

  UPDATE items
  SET current_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM item_warehouse_stock
    WHERE item_warehouse_stock.item_id = target_item_id
  ),
  updated_at = NOW()
  WHERE id = target_item_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_warehouse_stock_reconcile ON item_warehouse_stock;

CREATE TRIGGER trg_warehouse_stock_reconcile
  AFTER INSERT OR UPDATE OR DELETE ON item_warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION trg_reconcile_stock_after_warehouse_change();

-- ============================================================
-- 9. Seed Chart of Accounts for existing organizations
--    (only if accounts table is empty for that org)
-- ============================================================

-- Ensure accounting tables exist (idempotent from 005-accounting-schema.sql)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_account_id UUID REFERENCES accounts(id),
  level INTEGER NOT NULL DEFAULT 1,
  is_system_account BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  opening_balance DECIMAL(14,2) DEFAULT 0,
  current_balance DECIMAL(14,2) DEFAULT 0,
  debit_balance DECIMAL(14,2) DEFAULT 0,
  credit_balance DECIMAL(14,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_code, organization_id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  entry_no TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT CHECK (entry_type IN ('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase')),
  reference_type TEXT,
  reference_id UUID,
  reference_no TEXT,
  description TEXT,
  total_debit DECIMAL(14,2) NOT NULL,
  total_credit DECIMAL(14,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_debit_credit CHECK (total_debit = total_credit)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_amount DECIMAL(14,2) DEFAULT 0,
  credit_amount DECIMAL(14,2) DEFAULT 0,
  description TEXT,
  line_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0) OR
    (debit_amount = 0 AND credit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- Drop the unique constraint on entry_no if it exists (allow per-org numbering)
DO $$
BEGIN
  ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_no_key;
  -- Re-add as composite unique
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_org_entry_no_key'
  ) THEN
    ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_org_entry_no_key
      UNIQUE(organization_id, entry_no);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;
