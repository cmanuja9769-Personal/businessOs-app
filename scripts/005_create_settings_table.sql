-- Creating settings table for application configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'My Business',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_gst TEXT,
  business_logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  purchase_prefix TEXT DEFAULT 'PO',
  tax_enabled BOOLEAN DEFAULT true,
  default_tax_rate DECIMAL(5, 2) DEFAULT 18,
  currency_symbol TEXT DEFAULT '₹',
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  financial_year_start INTEGER DEFAULT 4,
  low_stock_alert BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.settings (business_name) VALUES ('My Business')
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_settings_id ON public.settings(id);
