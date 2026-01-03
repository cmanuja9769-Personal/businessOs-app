# Database Migration Instructions

## Step 1: Rollback the Old Migration (if you ran it)

If you previously ran the migration that added `custom_field_1_value` and `custom_field_2_value` to the **invoices** table, run this first:

```sql
-- Remove custom fields from invoices table
ALTER TABLE invoices
DROP COLUMN IF EXISTS custom_field_1_value,
DROP COLUMN IF EXISTS custom_field_2_value;

-- Drop indexes
DROP INDEX IF EXISTS idx_invoices_custom_field_1;
DROP INDEX IF EXISTS idx_invoices_custom_field_2;
```

## Step 2: Run the New Migration

Now run the correct migration to add custom fields to **invoice_items** table:

```sql
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_custom_field_1 ON invoice_items(custom_field_1_value) WHERE custom_field_1_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_custom_field_2 ON invoice_items(custom_field_2_value) WHERE custom_field_2_value IS NOT NULL;

-- Add comments
COMMENT ON COLUMN settings.custom_field_1_enabled IS 'Enable/disable custom text field for invoice line items';
COMMENT ON COLUMN settings.custom_field_1_label IS 'Custom label for text field (e.g., Serial Number, Batch)';
COMMENT ON COLUMN settings.custom_field_2_enabled IS 'Enable/disable custom numeric field for invoice line items';
COMMENT ON COLUMN settings.custom_field_2_label IS 'Custom label for numeric field (e.g., Carton Number, Box Count)';
COMMENT ON COLUMN invoice_items.custom_field_1_value IS 'Value for custom text field per line item';
COMMENT ON COLUMN invoice_items.custom_field_2_value IS 'Value for custom numeric field per line item';
```

## How to Run

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Paste the SQL commands above
4. Run them in order (Step 1 first if needed, then Step 2)

## After Migration

1. Go to Settings → Preferences in your app
2. Enable Custom Field 1 and/or Custom Field 2
3. Set custom labels (e.g., "Serial Number", "Carton Number")
4. Save settings
5. Create/edit invoices - custom fields will appear in each row of the line items table
