-- Migration: Add custom fields to settings and invoice_items tables
-- Created: 2026-01-03
-- Description: Adds configurable custom fields (1 text field, 1 number field) that can be enabled in settings and used in each invoice line item

-- Add custom field configuration to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS custom_field_1_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_field_1_label TEXT DEFAULT 'Custom Field 1',
ADD COLUMN IF NOT EXISTS custom_field_2_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_field_2_label TEXT DEFAULT 'Custom Field 2';

-- Add custom field values to invoice_items table (for each line item)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS custom_field_1_value TEXT,
ADD COLUMN IF NOT EXISTS custom_field_2_value NUMERIC;

-- Create indexes for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_invoice_items_custom_field_1 ON invoice_items(custom_field_1_value) WHERE custom_field_1_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_custom_field_2 ON invoice_items(custom_field_2_value) WHERE custom_field_2_value IS NOT NULL;

-- Comment the columns for documentation
COMMENT ON COLUMN settings.custom_field_1_enabled IS 'Enable/disable custom text field for invoice line items';
COMMENT ON COLUMN settings.custom_field_1_label IS 'Custom label for text field (e.g., Serial Number, Batch)';
COMMENT ON COLUMN settings.custom_field_2_enabled IS 'Enable/disable custom numeric field for invoice line items';
COMMENT ON COLUMN settings.custom_field_2_label IS 'Custom label for numeric field (e.g., Carton Number, Box Count)';
COMMENT ON COLUMN invoice_items.custom_field_1_value IS 'Value for custom text field per line item';
COMMENT ON COLUMN invoice_items.custom_field_2_value IS 'Value for custom numeric field per line item';
