-- CUMULATIVE MIGRATION SCRIPT
-- This script combines all recent schema changes for the multi-tenancy refactor.
-- It includes:
-- 1. 002-organizations-schema.sql (New app_organizations tables)
-- 2. 003-einvoice-schema.sql (E-Invoice & Queue)
-- 3. 004-inventory-schema.sql (Inventory, Batches, Serials)
-- 4. 005-accounting-schema.sql (Accounting, Journals)
-- 5. 006-customer-enhancements.sql (Customer Groups, Aging)

-- ==========================================
-- 002-organizations-schema.sql
-- ==========================================

-- Create organizations table for multi-tenant support
CREATE TABLE IF NOT EXISTS app_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  pan_number TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_organizations mapping table
CREATE TABLE IF NOT EXISTS app_user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to existing tables for data isolation
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_organizations_owner_id ON app_organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_organizations_subdomain ON app_organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_app_user_organizations_user_id ON app_user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_organizations_org_id ON app_user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_org_id ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org_id ON purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(organization_id);

-- Enable RLS on organizations and user_organizations
ALTER TABLE app_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_organizations ENABLE ROW LEVEL SECURITY;

-- Helper function to check organization ownership (bypassing RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM app_organizations
    WHERE id = org_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for organizations
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON app_organizations;
CREATE POLICY "Users can view organizations they are members of"
  ON app_organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_user_organizations
      WHERE app_user_organizations.organization_id = app_organizations.id
        AND app_user_organizations.user_id = auth.uid()
        AND app_user_organizations.is_active = true
    )
  );

DROP POLICY IF EXISTS "Organization owners can update their org" ON app_organizations;
CREATE POLICY "Organization owners can update their org"
  ON app_organizations FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create organizations" ON app_organizations;
CREATE POLICY "Users can create organizations"
  ON app_organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for user_organizations
DROP POLICY IF EXISTS "Users can view their organization memberships" ON app_user_organizations;
CREATE POLICY "Users can view their organization memberships"
  ON app_user_organizations FOR SELECT
  USING (
    auth.uid() = user_id OR
    public.is_org_owner(organization_id)
  );

DROP POLICY IF EXISTS "Users can create their memberships" ON app_user_organizations;
CREATE POLICY "Users can create their memberships"
  ON app_user_organizations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    public.is_org_owner(organization_id)
  );

-- RLS for customers (data isolation per organization)
DROP POLICY IF EXISTS "Users can only access customers in their organization" ON customers;
CREATE POLICY "Users can only access customers in their organization"
  ON customers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for items (data isolation per organization)
DROP POLICY IF EXISTS "Users can only access items in their organization" ON items;
CREATE POLICY "Users can only access items in their organization"
  ON items FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for invoices (data isolation per organization)
DROP POLICY IF EXISTS "Users can only access invoices in their organization" ON invoices;
CREATE POLICY "Users can only access invoices in their organization"
  ON invoices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for purchases (data isolation per organization)
DROP POLICY IF EXISTS "Users can only access purchases in their organization" ON purchases;
CREATE POLICY "Users can only access purchases in their organization"
  ON purchases FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for suppliers (data isolation per organization)
DROP POLICY IF EXISTS "Users can only access suppliers in their organization" ON suppliers;
CREATE POLICY "Users can only access suppliers in their organization"
  ON suppliers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ==========================================
-- 003-einvoice-schema.sql
-- ==========================================

-- Add E-Invoice fields to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS irn TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS e_invoice_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS irn_status TEXT DEFAULT 'pending' CHECK (irn_status IN ('pending', 'generated', 'cancelled', 'failed'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS irn_cancel_reason TEXT;

-- Create queue jobs table for tracking async operations
CREATE TABLE IF NOT EXISTS queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('send_email', 'generate_einvoice', 'send_sms', 'file_gst')),
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retries INTEGER DEFAULT 0,
  error TEXT,
  organization_id UUID REFERENCES app_organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create GST returns table for tracking GST filing
CREATE TABLE IF NOT EXISTS gst_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE NOT NULL,
  financial_year TEXT NOT NULL,
  return_month INTEGER NOT NULL CHECK (return_month >= 1 AND return_month <= 12),
  return_type TEXT NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B', 'GSTR9')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'filed', 'rejected', 'cancelled')),
  json_data JSONB,
  filed_on TIMESTAMPTZ,
  arn TEXT, -- Application Reference Number from GSTN
  gstn_status TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, financial_year, return_month, return_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON queue_jobs(status);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_organization ON queue_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_org_id ON gst_returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_filing_period ON gst_returns(financial_year, return_month);
CREATE INDEX IF NOT EXISTS idx_invoices_irn ON invoices(irn);
CREATE INDEX IF NOT EXISTS idx_invoices_irn_status ON invoices(irn_status);

-- ==========================================
-- 004-inventory-schema.sql
-- ==========================================

-- 1. Batch Tracking Tables
ALTER TABLE items ADD COLUMN IF NOT EXISTS batch_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  purchase_price DECIMAL(12,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL DEFAULT 0,
  purchase_id UUID REFERENCES purchases(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, batch_number, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_item_batches_item_id ON item_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_expiry ON item_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_item_batches_remaining ON item_batches(remaining_quantity) WHERE remaining_quantity > 0;

-- 2. Serial Number Tracking
ALTER TABLE items ADD COLUMN IF NOT EXISTS serial_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS item_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  batch_id UUID REFERENCES item_batches(id),
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'damaged', 'warranty')),
  purchase_date DATE,
  purchase_id UUID REFERENCES purchases(id),
  sale_date DATE,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  warranty_months INTEGER DEFAULT 0,
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(serial_number, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_item_serials_item_id ON item_serials(item_id);
CREATE INDEX IF NOT EXISTS idx_item_serials_serial ON item_serials(serial_number);
CREATE INDEX IF NOT EXISTS idx_item_serials_status ON item_serials(status);

-- 3. Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  adjustment_no TEXT NOT NULL UNIQUE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('damage', 'theft', 'found', 'correction', 'opening_balance', 'expired', 'other')),
  notes TEXT,
  adjusted_by UUID NOT NULL REFERENCES auth.users(id),
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(adjustment_no, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item ON stock_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);

-- 4. Stock Movement History (Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  serial_id UUID REFERENCES item_serials(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return', 'stock_in', 'stock_out')),
  reference_type TEXT,
  reference_id UUID,
  reference_no TEXT,
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  rate DECIMAL(12,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- 5. Warehouse/Location Management
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id);

-- Warehouse Stock Table
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, warehouse_id, batch_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_item ON warehouse_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);

-- Stock Transfer Tables
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  transfer_no TEXT NOT NULL UNIQUE,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transfer_no, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  batch_id UUID REFERENCES item_batches(id),
  quantity INTEGER NOT NULL,
  received_quantity INTEGER DEFAULT 0
);

-- RLS Policies for inventory tables
ALTER TABLE item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for item_batches
DROP POLICY IF EXISTS "Organizations can manage their own batches" ON item_batches;
CREATE POLICY "Organizations can manage their own batches"
  ON item_batches FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

-- Similar RLS policies for other tables
DROP POLICY IF EXISTS "Organizations can view their stock movements" ON stock_movements;
CREATE POLICY "Organizations can view their stock movements"
  ON stock_movements FOR SELECT
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

DROP POLICY IF EXISTS "Organizations can manage warehouses" ON warehouses;
CREATE POLICY "Organizations can manage warehouses"
  ON warehouses FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

-- ==========================================
-- 005-accounting-schema.sql
-- ==========================================

-- Chart of Accounts
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

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  entry_no TEXT NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);

-- Journal Entry Line Items
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

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Organizations can manage their accounts" ON accounts;
CREATE POLICY "Organizations can manage their accounts"
  ON accounts FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

DROP POLICY IF EXISTS "Organizations can manage their journal entries" ON journal_entries;
CREATE POLICY "Organizations can manage their journal entries"
  ON journal_entries FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

DROP POLICY IF EXISTS "Organizations can access their journal entry lines" ON journal_entry_lines;
CREATE POLICY "Organizations can access their journal entry lines"
  ON journal_entry_lines FOR SELECT
  USING (entry_id IN (
    SELECT id FROM journal_entries WHERE organization_id IN (
      SELECT id FROM app_organizations
      WHERE owner_id = auth.uid()
         OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
    )
  ));

-- ==========================================
-- 006-customer-enhancements.sql
-- ==========================================

-- Alter customer table for credit management
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app_organizations(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_sales DECIMAL(14,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_transaction_date DATE;

-- Customer Groups/Categories
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_org ON customer_groups(organization_id);

-- Add customer_group_id to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_group_id UUID REFERENCES customer_groups(id);

-- Aging Analysis View
CREATE OR REPLACE VIEW customer_aging_analysis AS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.organization_id,
  COALESCE(SUM(CASE WHEN i.status IN ('unpaid', 'partial', 'overdue') THEN i.balance ELSE 0 END), 0) as outstanding,
  COALESCE(SUM(CASE WHEN CURRENT_DATE - i.invoice_date BETWEEN 0 AND 30 AND i.status IN ('unpaid', 'partial', 'overdue') THEN i.balance ELSE 0 END), 0) as current_0_30,
  COALESCE(SUM(CASE WHEN CURRENT_DATE - i.invoice_date BETWEEN 31 AND 60 AND i.status IN ('unpaid', 'partial', 'overdue') THEN i.balance ELSE 0 END), 0) as overdue_31_60,
  COALESCE(SUM(CASE WHEN CURRENT_DATE - i.invoice_date BETWEEN 61 AND 90 AND i.status IN ('unpaid', 'partial', 'overdue') THEN i.balance ELSE 0 END), 0) as overdue_61_90,
  COALESCE(SUM(CASE WHEN CURRENT_DATE - i.invoice_date > 90 AND i.status IN ('unpaid', 'partial', 'overdue') THEN i.balance ELSE 0 END), 0) as overdue_above_90
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id AND i.organization_id = c.organization_id
GROUP BY c.id, c.name, c.phone, c.organization_id;

-- Enable RLS
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizations can manage customer groups" ON customer_groups;
CREATE POLICY "Organizations can manage customer groups"
  ON customer_groups FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

-- RLS for customers
DROP POLICY IF EXISTS "Organizations can view their customers" ON customers;
CREATE POLICY "Organizations can view their customers"
  ON customers FOR SELECT
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

DROP POLICY IF EXISTS "Organizations can manage their customers" ON customers;
CREATE POLICY "Organizations can manage their customers"
  ON customers FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_credit_limit ON customers(credit_limit);
