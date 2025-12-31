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
