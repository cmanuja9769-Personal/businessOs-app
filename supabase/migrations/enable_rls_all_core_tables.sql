-- Enable Row Level Security on all core tables
-- This ensures data isolation at the database level

-- Invoices
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access invoices in their organization"
  ON invoices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Customers
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access customers in their organization"
  ON customers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Suppliers
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access suppliers in their organization"
  ON suppliers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Items
ALTER TABLE IF EXISTS items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access items in their organization"
  ON items FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Purchases
ALTER TABLE IF EXISTS purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access purchases in their organization"
  ON purchases FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Payments
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access payments in their organization"
  ON payments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Settings
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access settings in their organization"
  ON settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Accounts (Chart of Accounts)
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access accounts in their organization"
  ON accounts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Journal Entries
ALTER TABLE IF EXISTS journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access journal entries in their organization"
  ON journal_entries FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Journal Entry Lines
ALTER TABLE IF EXISTS journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access journal entry lines via journal entries"
  ON journal_entry_lines FOR ALL
  USING (
    entry_id IN (
      SELECT id FROM journal_entries
      WHERE organization_id IN (
        SELECT organization_id FROM app_user_organizations
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Warehouses
ALTER TABLE IF EXISTS warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access warehouses in their organization"
  ON warehouses FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Item Warehouse Stock
ALTER TABLE IF EXISTS item_warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access item warehouse stock in their organization"
  ON item_warehouse_stock FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Stock Ledger
ALTER TABLE IF EXISTS stock_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access stock ledger in their organization"
  ON stock_ledger FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Invoice Items
ALTER TABLE IF EXISTS invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access invoice items via invoices"
  ON invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (
        SELECT organization_id FROM app_user_organizations
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Purchase Items
ALTER TABLE IF EXISTS purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access purchase items via purchases"
  ON purchase_items FOR ALL
  USING (
    purchase_id IN (
      SELECT id FROM purchases
      WHERE organization_id IN (
        SELECT organization_id FROM app_user_organizations
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Queue Jobs
ALTER TABLE IF EXISTS queue_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access queue jobs in their organization"
  ON queue_jobs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- GST Returns
ALTER TABLE IF EXISTS gst_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access gst returns in their organization"
  ON gst_returns FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- App Organizations (users can only see orgs they belong to)
ALTER TABLE IF EXISTS app_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own organizations"
  ON app_organizations FOR ALL
  USING (
    id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- App User Organizations (users can only see their own memberships)
ALTER TABLE IF EXISTS app_user_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own org memberships"
  ON app_user_organizations FOR ALL
  USING (user_id = auth.uid());

-- User Roles (users can read their own role)
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles in their organization"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
