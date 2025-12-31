-- Phase 5: Customer & Supplier Enhancements

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
-- Fixed column reference from contact_no to phone
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

CREATE POLICY "Organizations can manage customer groups"
  ON customer_groups FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

-- RLS for customers
CREATE POLICY "Organizations can view their customers"
  ON customers FOR SELECT
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

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
