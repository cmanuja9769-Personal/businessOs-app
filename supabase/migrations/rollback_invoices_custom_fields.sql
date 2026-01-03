-- Rollback: Remove custom fields from invoices table if they were added
-- Created: 2026-01-03
-- Description: Removes custom field columns from invoices table since they should be in invoice_items instead

-- Drop columns from invoices table (if they exist)
ALTER TABLE invoices
DROP COLUMN IF EXISTS custom_field_1_value,
DROP COLUMN IF EXISTS custom_field_2_value;

-- Drop indexes from invoices table (if they exist)
DROP INDEX IF EXISTS idx_invoices_custom_field_1;
DROP INDEX IF EXISTS idx_invoices_custom_field_2;
