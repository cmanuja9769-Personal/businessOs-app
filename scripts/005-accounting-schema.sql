-- Phase 4: Financial Accounting Module

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
CREATE POLICY "Organizations can manage their accounts"
  ON accounts FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

CREATE POLICY "Organizations can manage their journal entries"
  ON journal_entries FOR ALL
  USING (organization_id IN (
    SELECT id FROM app_organizations
    WHERE owner_id = auth.uid()
       OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
  ));

CREATE POLICY "Organizations can access their journal entry lines"
  ON journal_entry_lines FOR SELECT
  USING (entry_id IN (
    SELECT id FROM journal_entries WHERE organization_id IN (
      SELECT id FROM app_organizations
      WHERE owner_id = auth.uid()
         OR id IN (SELECT organization_id FROM app_user_organizations WHERE user_id = auth.uid() AND is_active = true)
    )
  ));
