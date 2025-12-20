-- Add due_date column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Set default due date to 30 days after invoice_date for existing records
UPDATE invoices
SET due_date = invoice_date + INTERVAL '30 days'
WHERE due_date IS NULL;
