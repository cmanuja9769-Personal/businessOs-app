-- ================================================================
-- UPDATE ITEMS WITH PER_CARTON_QUANTITY VALUES
-- This script extracts carton/package quantities from item names
-- and updates the per_carton_quantity field
-- ================================================================

-- First, let's see what patterns exist in item names
-- Common patterns: "/10 pkt per bdl", "/5 Pcs", "/ 10 Pcs", "/10pkts per box"

-- ================================================================
-- STEP 0: FIX UNIT FIELD BASED ON ITEM NAMES
-- PKT, BOX, PCS are all individual units (same concept, different names)
-- ================================================================

-- Items with "pkt" in name should have unit = 'PKT'
UPDATE items 
SET unit = 'PKT'
WHERE (name ~* 'pkt' OR name ~* 'packet')
  AND unit != 'PKT';

-- Items with "box" in name should have unit = 'BOX'  
UPDATE items 
SET unit = 'BOX'
WHERE name ~* 'per\s*box'
  AND unit != 'BOX';

-- Set default unit to PKT for items without specific unit patterns
-- (assuming most crackers are sold in packets)
UPDATE items 
SET unit = 'PKT'
WHERE unit = 'PCS' OR unit IS NULL;

-- ================================================================
-- STEP 1: Update items with clear quantity patterns in their names
-- ================================================================
-- Pattern: "/X pkt per bdl" or "/X Pkt per Bdl"
UPDATE items 
SET per_carton_quantity = 
  CAST(
    REGEXP_REPLACE(
      SUBSTRING(name FROM '/\s*(\d+)\s*[Pp]kt\s*[Pp]er\s*[Bb]dl'),
      '[^0-9]', '', 'g'
    ) AS INTEGER
  )
WHERE name ~* '/\d+\s*pkt\s*per\s*bdl'
  AND per_carton_quantity <= 1;

-- Pattern: "/X pkts per box" or "/X Pkts per Box"
UPDATE items 
SET per_carton_quantity = 
  CAST(
    REGEXP_REPLACE(
      SUBSTRING(name FROM '/\s*(\d+)\s*[Pp]kts?\s*[Pp]er\s*[Bb]ox'),
      '[^0-9]', '', 'g'
    ) AS INTEGER
  )
WHERE name ~* '/\d+\s*pkts?\s*per\s*box'
  AND per_carton_quantity <= 1;

-- Pattern: "/X Pcs" or "/ X Pcs" or "/X PCS"
UPDATE items 
SET per_carton_quantity = 
  CAST(
    REGEXP_REPLACE(
      SUBSTRING(name FROM '/\s*(\d+)\s*[Pp][Cc][Ss]'),
      '[^0-9]', '', 'g'
    ) AS INTEGER
  )
WHERE name ~* '/\s*\d+\s*pcs'
  AND per_carton_quantity <= 1;

-- Pattern: "/X Pc/Ctn" or "/X Pic/Ctn"
UPDATE items 
SET per_carton_quantity = 
  CAST(
    REGEXP_REPLACE(
      SUBSTRING(name FROM '/\s*(\d+)\s*[Pp]i?c/[Cc]tn'),
      '[^0-9]', '', 'g'
    ) AS INTEGER
  )
WHERE name ~* '/\s*\d+\s*pi?c/ctn'
  AND per_carton_quantity <= 1;

-- Pattern: "X pkt Per ctn" or "X Pkt Per Ctn"
UPDATE items 
SET per_carton_quantity = 
  CAST(
    REGEXP_REPLACE(
      SUBSTRING(name FROM '/\s*(\d+)\s*[Pp]kt\s*[Pp]er\s*[Cc]tn'),
      '[^0-9]', '', 'g'
    ) AS INTEGER
  )
WHERE name ~* '/\d+\s*pkt\s*per\s*ctn'
  AND per_carton_quantity <= 1;

-- ================================================================
-- MANUAL UPDATES FOR SPECIFIC CATEGORIES
-- Adjust these based on your actual business knowledge
-- ================================================================

-- Multi Shots typically come in cartons of 6
UPDATE items 
SET per_carton_quantity = 6
WHERE category = 'Multi Shots' 
  AND per_carton_quantity <= 1;

-- Garland items (like 10000 Wala, 2000 Wala) - typically 5 per carton
UPDATE items 
SET per_carton_quantity = 5
WHERE category = 'Garland' 
  AND per_carton_quantity <= 1;

-- Flower Pots - typically 10 per box
UPDATE items 
SET per_carton_quantity = 10
WHERE category = 'Flower Pots' 
  AND per_carton_quantity <= 1;

-- Chit Put items - typically 10 per box
UPDATE items 
SET per_carton_quantity = 10
WHERE category = 'Chit Put' 
  AND per_carton_quantity <= 1;

-- Rockets - typically 10 per box
UPDATE items 
SET per_carton_quantity = 10
WHERE category = 'Rockets' 
  AND per_carton_quantity <= 1;

-- Confetti/Shots - typically 12 per carton
UPDATE items 
SET per_carton_quantity = 12
WHERE category = 'Confetti' 
  AND per_carton_quantity <= 1;

-- ================================================================
-- VERIFY THE UPDATES
-- ================================================================

-- Check items that still have per_carton_quantity = 1
SELECT 
  item_code,
  name,
  category,
  unit,
  packaging_unit,
  per_carton_quantity,
  current_stock
FROM items 
WHERE per_carton_quantity <= 1 
  AND current_stock > 0
ORDER BY category, name;

-- Check items with updated per_carton_quantity
SELECT 
  item_code,
  name,
  category,
  unit,
  packaging_unit,
  per_carton_quantity,
  current_stock,
  CASE 
    WHEN per_carton_quantity > 1 THEN
      CONCAT(
        FLOOR(current_stock / per_carton_quantity), ' ', packaging_unit,
        CASE 
          WHEN current_stock % per_carton_quantity > 0 
          THEN CONCAT(' + ', current_stock % per_carton_quantity, ' ', unit)
          ELSE ''
        END,
        ' (', current_stock, ' ', unit, ')'
      )
    ELSE CONCAT(current_stock, ' ', unit)
  END AS formatted_quantity
FROM items 
WHERE current_stock > 0
ORDER BY category, name;

-- ================================================================
-- SPECIFIC UPDATES FOR YOUR ITEMS (based on screenshot data)
-- Uncomment and modify as needed
-- ================================================================

-- Example: Update specific items by item_code
-- UPDATE items SET per_carton_quantity = 5 WHERE item_code = 'REGUL10000WALA';
-- UPDATE items SET per_carton_quantity = 6 WHERE item_code = 'REGUL120SHOTSIVAK';
-- UPDATE items SET per_carton_quantity = 12 WHERE item_code = 'SEASO21SHOT3PCCT';
-- UPDATE items SET per_carton_quantity = 12 WHERE item_code = 'SEASOPAPE7SHOT';
-- UPDATE items SET per_carton_quantity = 12 WHERE item_code = 'SEASOPAPE8SHOT';

-- ================================================================
-- BULK UPDATE HELPER
-- Use this to update items that don't match patterns
-- ================================================================

-- Set default per_carton_quantity for items that still have 1
-- This assumes most items come in boxes of 10
-- UPDATE items 
-- SET per_carton_quantity = 10
-- WHERE per_carton_quantity <= 1 
--   AND packaging_unit = 'CTN';
