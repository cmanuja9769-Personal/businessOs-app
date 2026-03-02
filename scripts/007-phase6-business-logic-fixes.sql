-- Phase 6: Critical Business Logic Fixes
-- Fixes: IGST, stock adjustments, stock transfers, negative stock prevention,
--        invoice rounding, credit limit enforcement, customer outstanding balance

BEGIN;

-- ============================================================
-- 1. Add round_off column to invoices
-- ============================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS round_off DECIMAL(12,2) DEFAULT 0;

-- ============================================================
-- 2. Add is_inter_state column to invoices for tracking
-- ============================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_inter_state BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 3. Atomic stock update function (prevents race conditions)
-- Uses SELECT ... FOR UPDATE to lock the row during modification
-- ============================================================

CREATE OR REPLACE FUNCTION atomic_stock_update(
  p_item_id UUID,
  p_quantity_change NUMERIC,
  p_allow_negative BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(old_stock NUMERIC, new_stock NUMERIC, success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_old_stock NUMERIC;
  v_new_stock NUMERIC;
BEGIN
  SELECT current_stock INTO v_old_stock
  FROM items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, FALSE, 'Item not found'::TEXT;
    RETURN;
  END IF;

  v_new_stock := COALESCE(v_old_stock, 0) + p_quantity_change;

  IF NOT p_allow_negative AND v_new_stock < 0 THEN
    RETURN QUERY SELECT COALESCE(v_old_stock, 0), COALESCE(v_old_stock, 0), FALSE,
      format('Insufficient stock. Available: %s, Required: %s', COALESCE(v_old_stock, 0), ABS(p_quantity_change))::TEXT;
    RETURN;
  END IF;

  UPDATE items
  SET current_stock = v_new_stock, updated_at = NOW()
  WHERE id = p_item_id;

  RETURN QUERY SELECT COALESCE(v_old_stock, 0), v_new_stock, TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Atomic warehouse stock update function
-- ============================================================

CREATE OR REPLACE FUNCTION atomic_warehouse_stock_update(
  p_item_id UUID,
  p_warehouse_id UUID,
  p_organization_id UUID,
  p_quantity_change NUMERIC,
  p_allow_negative BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(old_stock NUMERIC, new_stock NUMERIC, success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_old_stock NUMERIC;
  v_new_stock NUMERIC;
  v_record_id UUID;
BEGIN
  SELECT id, quantity INTO v_record_id, v_old_stock
  FROM item_warehouse_stock
  WHERE item_id = p_item_id AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_quantity_change < 0 AND NOT p_allow_negative THEN
      RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, FALSE,
        format('No stock in warehouse. Required: %s', ABS(p_quantity_change))::TEXT;
      RETURN;
    END IF;

    IF p_quantity_change > 0 THEN
      INSERT INTO item_warehouse_stock (item_id, warehouse_id, organization_id, quantity)
      VALUES (p_item_id, p_warehouse_id, p_organization_id, p_quantity_change);
    END IF;

    RETURN QUERY SELECT 0::NUMERIC, GREATEST(0, p_quantity_change), TRUE, NULL::TEXT;
    RETURN;
  END IF;

  v_new_stock := COALESCE(v_old_stock, 0) + p_quantity_change;

  IF NOT p_allow_negative AND v_new_stock < 0 THEN
    RETURN QUERY SELECT COALESCE(v_old_stock, 0), COALESCE(v_old_stock, 0), FALSE,
      format('Insufficient warehouse stock. Available: %s, Required: %s', COALESCE(v_old_stock, 0), ABS(p_quantity_change))::TEXT;
    RETURN;
  END IF;

  UPDATE item_warehouse_stock
  SET quantity = v_new_stock, updated_at = NOW()
  WHERE id = v_record_id;

  RETURN QUERY SELECT COALESCE(v_old_stock, 0), v_new_stock, TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Customer outstanding balance update function
-- ============================================================

CREATE OR REPLACE FUNCTION update_customer_outstanding(
  p_customer_id UUID,
  p_amount DECIMAL(14,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET
    outstanding_balance = COALESCE(outstanding_balance, 0) + p_amount,
    last_transaction_date = CURRENT_DATE
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Invoice number sequence (prevents duplicates under concurrency)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_organization_id UUID,
  p_prefix TEXT DEFAULT 'INV'
)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  v_seq := NEXTVAL('invoice_number_seq');
  RETURN p_prefix || '/' || v_year || '/' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Negative stock prevention CHECK constraint
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_non_negative_stock'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT check_non_negative_stock
      CHECK (current_stock >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add non-negative stock constraint (existing data may violate it): %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_non_negative_stock'
  ) THEN
    ALTER TABLE item_warehouse_stock ADD CONSTRAINT check_warehouse_non_negative_stock
      CHECK (quantity >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add warehouse non-negative stock constraint: %', SQLERRM;
END $$;

COMMIT;
