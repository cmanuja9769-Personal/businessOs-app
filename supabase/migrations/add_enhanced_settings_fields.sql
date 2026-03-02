-- Migration: Enhanced settings fields
-- Description: Adds document prefixes for all document types, invoice defaults,
--   payment terms, bank details, stock threshold, and display preferences

-- Additional document number prefixes
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS quotation_prefix TEXT DEFAULT 'QTN',
ADD COLUMN IF NOT EXISTS proforma_prefix TEXT DEFAULT 'PI',
ADD COLUMN IF NOT EXISTS sales_order_prefix TEXT DEFAULT 'SO',
ADD COLUMN IF NOT EXISTS delivery_challan_prefix TEXT DEFAULT 'DC',
ADD COLUMN IF NOT EXISTS credit_note_prefix TEXT DEFAULT 'CN',
ADD COLUMN IF NOT EXISTS debit_note_prefix TEXT DEFAULT 'DN';

-- Invoice behavior defaults
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_billing_mode TEXT DEFAULT 'gst',
ADD COLUMN IF NOT EXISTS default_pricing_mode TEXT DEFAULT 'sale',
ADD COLUMN IF NOT EXISTS default_packing_type TEXT DEFAULT 'loose',
ADD COLUMN IF NOT EXISTS show_amount_in_words BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS round_off_total BOOLEAN DEFAULT true;

-- Default invoice notes
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_notes TEXT;

-- Enhanced bank details
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_branch_name TEXT;

-- Low stock threshold (numeric, not just toggle)
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Add constraints for enum-like columns (drop first to make migration re-runnable)
ALTER TABLE settings DROP CONSTRAINT IF EXISTS chk_default_billing_mode;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS chk_default_pricing_mode;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS chk_default_packing_type;

ALTER TABLE settings ADD CONSTRAINT chk_default_billing_mode CHECK (default_billing_mode IN ('gst', 'non-gst'));
ALTER TABLE settings ADD CONSTRAINT chk_default_pricing_mode CHECK (default_pricing_mode IN ('sale', 'wholesale', 'quantity'));
ALTER TABLE settings ADD CONSTRAINT chk_default_packing_type CHECK (default_packing_type IN ('loose', 'carton'));

COMMENT ON COLUMN settings.default_payment_terms_days IS 'Default payment due days (0 = Due on Receipt)';
COMMENT ON COLUMN settings.default_billing_mode IS 'Default billing mode for new invoices (gst or non-gst)';
COMMENT ON COLUMN settings.default_pricing_mode IS 'Default pricing mode (sale, wholesale, quantity)';
COMMENT ON COLUMN settings.default_packing_type IS 'Default packing type (loose or carton)';
COMMENT ON COLUMN settings.show_amount_in_words IS 'Show invoice total in words on printed invoices';
COMMENT ON COLUMN settings.round_off_total IS 'Automatically round invoice total to nearest rupee';
COMMENT ON COLUMN settings.low_stock_threshold IS 'Stock quantity below which low-stock alert triggers';
COMMENT ON COLUMN settings.default_notes IS 'Default notes pre-filled on new invoices';
COMMENT ON COLUMN settings.bank_account_holder_name IS 'Bank account holder name shown on invoices';
COMMENT ON COLUMN settings.bank_branch_name IS 'Bank branch name shown on invoices';
