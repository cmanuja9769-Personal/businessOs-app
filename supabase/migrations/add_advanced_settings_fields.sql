ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS invoice_number_reset_mode TEXT DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS multi_currency_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_currencies TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_on_invoice_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_on_payment_received BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_on_low_stock BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_email TEXT DEFAULT '';

ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS chk_invoice_number_reset_mode;
ALTER TABLE settings
  ADD CONSTRAINT chk_invoice_number_reset_mode
    CHECK (invoice_number_reset_mode IN ('never', 'yearly', 'monthly'));

ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS chk_next_invoice_number_positive;
ALTER TABLE settings
  ADD CONSTRAINT chk_next_invoice_number_positive
    CHECK (next_invoice_number >= 1);
