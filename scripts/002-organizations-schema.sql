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

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
  ON app_organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_user_organizations
      WHERE app_user_organizations.organization_id = app_organizations.id
        AND app_user_organizations.user_id = auth.uid()
        AND app_user_organizations.is_active = true
    )
  );

CREATE POLICY "Organization owners can update their org"
  ON app_organizations FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create organizations"
  ON app_organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for user_organizations
CREATE POLICY "Users can view their organization memberships"
  ON app_user_organizations FOR SELECT
  USING (auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM app_organizations
      WHERE app_organizations.id = app_user_organizations.organization_id
        AND app_organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their memberships"
  ON app_user_organizations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM app_organizations
      WHERE app_organizations.id = app_user_organizations.organization_id
        AND app_organizations.owner_id = auth.uid()
    )
  );

-- RLS for customers (data isolation per organization)
CREATE POLICY "Users can only access customers in their organization"
  ON customers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for items (data isolation per organization)
CREATE POLICY "Users can only access items in their organization"
  ON items FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for invoices (data isolation per organization)
CREATE POLICY "Users can only access invoices in their organization"
  ON invoices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for purchases (data isolation per organization)
CREATE POLICY "Users can only access purchases in their organization"
  ON purchases FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS for suppliers (data isolation per organization)
CREATE POLICY "Users can only access suppliers in their organization"
  ON suppliers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
