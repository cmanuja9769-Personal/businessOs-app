# Barcode Management Guide

## Overview

This guide explains how to handle barcode numbers when bulk uploading items to your inventory system.

## Supported Barcode Formats

### 1. **EAN-13** (European Article Number - 13 digits)
- **Format**: 13 digits (e.g., `8901234567890`)
- **Most Common**: Standard for retail products worldwide
- **Usage**: Used for product identification in stores
- **Checksum**: Last digit is a calculated check digit for validation

**Example:**
```
8901234567890
890 = Country code (India)
123456 = Manufacturer code
789 = Product code
0 = Check digit
```

### 2. **EAN-8** (Short Format - 8 digits)
- **Format**: 8 digits (e.g., `12345678`)
- **Usage**: Small products with limited space for barcode labels
- **Checksum**: Last digit is a check digit

### 3. **UPC-A** (Universal Product Code - 12 digits)
- **Format**: 12 digits (e.g., `123456789012`)
- **Usage**: Standard in North America
- **Checksum**: Last digit is a check digit

### 4. **Custom/SKU-based** (Alphanumeric)
- **Format**: Any alphanumeric combination (e.g., `ITEM-2025-001`, `SKU12345`, `BAR000001`)
- **Usage**: Internal inventory management, custom tracking
- **Allowed Characters**: A-Z, 0-9, dash (-), underscore (_)
- **No Checksum**: No automatic validation

## Bulk Upload Methods

### Method 1: Manual Entry in Excel Template

1. Download the Excel template from the Items page
2. Fill in the "Barcode No" column with your barcode numbers
3. Upload the completed Excel file
4. System validates and saves your barcodes

**Example:**
| Item Name      | HSN Code | Barcode No    | Unit | Stock | Sale Price |
|----------------|----------|---------------|------|-------|------------|
| Rice Bag 25kg  | 1006     | 8901234567890 | PCS  | 100   | 1500       |
| Sugar 1kg      | 1701     | 8901234567891 | PCS  | 200   | 45         |
| Tea Powder 500g| 0902     | 8901234567892 | PCS  | 150   | 250        |

**✓ Manual barcodes are preserved exactly as entered**

### Method 2: Auto-Generate Sequential Barcodes (Automatic)

- Leave the "Barcode No" column empty in the Excel file
- System automatically generates sequential barcodes: `BAR000001`, `BAR000002`, etc.
- Starts from the next available number after existing barcodes
- Perfect for quick setup without manual barcode entry

### Method 3: Mixed Approach (Recommended)

**Combine manual entry with automatic generation:**
- Enter barcodes for items that have manufacturer codes (EAN-13, UPC-A)
- Leave empty for items you want system to auto-generate
- Best of both worlds!

**Example Excel:**
```
Item Name          | Barcode No    | Result
-------------------|---------------|------------------
Branded Product    | 8901234567890 | Keeps manual barcode
Custom Item A      |               | Auto: BAR000001
Custom Item B      |               | Auto: BAR000002
```

**Auto-Generation Details:**
- **Prefix:** `BAR` (customizable in code)
- **Format:** Sequential 6-digit padding (BAR000001, BAR000002...)
- **Smart Numbering:** Continues from highest existing barcode number
- **No Conflicts:** System checks existing barcodes before assigning

**To Customize Auto-Generation:**

Edit `app/items/actions.ts` line ~260 to change prefix or strategy:

```typescript
// Change 'BAR' to your preferred prefix (e.g., 'ITEM', 'SKU', 'PRD')
itemsData = autoGenerateBarcodes(itemsData, existingBarcodes, { 
  prefix: 'ITEM',        // Custom prefix
  strategy: 'sequential' // or 'itemcode-based'
})
```

## Barcode Series & Numbering

### Sequential Series
Start from any number and increment:
- `BAR000001`, `BAR000002`, `BAR000003`...
- `ITEM0001`, `ITEM0002`, `ITEM0003`...

### Date-based Series
Include year/month for organization:
- `2025-0001`, `2025-0002`, `2025-0003`...
- `JAN25-001`, `JAN25-002`, `JAN25-003`...

### Category-based Series
Group by product category:
- `FOOD-001`, `FOOD-002` (Food items)
- `ELEC-001`, `ELEC-002` (Electronics)
- `CLOTH-001`, `CLOTH-002` (Clothing)

### Item Code-based
Derive from item codes:
- Item Code: `RICE-25KG` → Barcode: `BCRICE25KG`
- Item Code: `SUGAR-1KG` → Barcode: `BCSUGAR1KG`

## Validation Rules

### During Bulk Upload:

1. **Format Validation**
   - EAN-13: Must be exactly 13 digits with valid checksum
   - EAN-8: Must be exactly 8 digits with valid checksum
   - UPC-A: Must be exactly 12 digits with valid checksum
   - Custom: Only alphanumeric characters, dash, and underscore allowed

2. **Uniqueness Check**
   - No duplicate barcodes within the upload file
   - No barcode can match existing barcodes in the database
   - Each barcode must be unique across the entire system

3. **Optional Field**
   - Barcodes are optional - you can leave them empty
   - Items without barcodes can still be created and managed

### Error Messages:

- `Invalid barcode for "Item Name": Invalid barcode format...`
  - Fix: Use a supported format (EAN-13, EAN-8, UPC-A, or custom alphanumeric)

- `Duplicate barcodes found in upload: 8901234567890`
  - Fix: Ensure each barcode in your Excel file is unique

- `Barcode "8901234567890" already exists for item "Existing Item"`
  - Fix: Use a different barcode that doesn't exist in the system

## Best Practices

### 1. **Choose the Right Format**
- **Retail products**: Use EAN-13 if you have manufacturer barcodes
- **Internal inventory**: Use custom alphanumeric with meaningful prefixes
- **Small labels**: Use EAN-8 or short custom codes

### 2. **Establish a Numbering System**
```
Option A: Simple Sequential
BAR000001, BAR000002, BAR000003...

Option B: Category-based
FOOD-0001, FOOD-0002 (Food items)
ELEC-0001, ELEC-0002 (Electronics)

Option C: Year-based
2025-00001, 2025-00002 (Items added in 2025)
2026-00001, 2026-00002 (Items added in 2026)
```

### 3. **Pre-populate Excel Template**
Create formulas in Excel to auto-generate sequential barcodes:

**Cell C2:** `="BAR"&TEXT(ROW()-1,"000000")`
- Drag down to generate: BAR000001, BAR000002, etc.

**Cell C2:** `="ITEM-"&YEAR(TODAY())&"-"&TEXT(ROW()-1,"0000")`
- Generates: ITEM-2025-0001, ITEM-2025-0002, etc.

### 4. **Verify Before Upload**
- Check for duplicates in your Excel file
- Ensure format consistency
- Test with a small batch first (5-10 items)

### 5. **Print Barcode Labels**
After upload, you can:
- Print barcode labels using a label printer
- Use online barcode generators for EAN-13/UPC-A formats
- Generate custom barcode images for SKU-based codes

## Common Scenarios

### Scenario 1: Importing products with manufacturer barcodes
```excel
Item Name           | Barcode No    | Notes
--------------------|---------------|------------------------
Coca Cola 500ml     | 5449000214911 | Manufacturer EAN-13
Pepsi 500ml         | 5060122034456 | Manufacturer EAN-13
```

### Scenario 2: Creating custom inventory with sequential codes
```excel
Item Name           | Barcode No    | Notes
--------------------|---------------|------------------------
Office Chair Model A| OFF-0001      | Custom sequential
Office Desk Large   | OFF-0002      | Custom sequential
Filing Cabinet      | OFF-0003      | Custom sequential
```

### Scenario 3: Mixed approach (automatic)
```excel
Item Name           | Barcode No    | Result After Upload
--------------------|---------------|------------------------
Branded Laptop      | 0123456789012 | Keeps manufacturer UPC-A
Custom Mouse Pad    | ACC-2025-001  | Keeps custom code
Generic USB Cable   |               | Auto-generated: BAR000001
USB Hub             |               | Auto-generated: BAR000002
```

## Programmatic Barcode Generation

For developers who want to customize barcode generation:

### Generate EAN-13 with checksum:
```typescript
import { generateEAN13 } from '@/lib/barcode-generator'

const barcode = generateEAN13('890123456789') // Returns: 8901234567890
```

### Generate sequential barcodes:
```typescript
import { generateSequentialBarcode } from '@/lib/barcode-generator'

const barcode1 = generateSequentialBarcode(1, 'BAR') // Returns: BAR000001
const barcode2 = generateSequentialBarcode(2, 'ITEM', 8) // Returns: ITEM00000002
```

### Validate barcodes:
```typescript
import { validateBarcode } from '@/lib/barcode-generator'

const result = validateBarcode('8901234567890')
// Returns: { isValid: true, format: 'EAN-13' }
```

### Auto-generate for bulk items:
```typescript
import { autoGenerateBarcodes } from '@/lib/barcode-generator'

const items = [
  { name: 'Item 1', barcodeNo: '' },
  { name: 'Item 2', barcodeNo: '8901234567890' },
  { name: 'Item 3', barcodeNo: '' }
]

const itemsWithBarcodes = autoGenerateBarcodes(items, existingBarcodes, {
  prefix: 'BAR',
  strategy: 'sequential'
})
// Item 1 and 3 will get auto-generated barcodes, Item 2 keeps its existing barcode
```

## Troubleshooting

### Q: Can I change barcodes after upload?
**A:** Yes, edit the item and update the barcode field. The system will validate uniqueness.

### Q: What if I have duplicate items with same barcode?
**A:** Each barcode must be unique. Use variants or SKU suffixes (e.g., `ITEM-001-RED`, `ITEM-001-BLUE`).

### Q: Can I import items without barcodes?
**A:** Yes, barcodes are optional. Leave the column empty and add them later as needed.

### Q: Do I need special software to generate EAN-13?
**A:** For EAN-13, you typically need to register with GS1 to get official prefixes. For internal use, custom alphanumeric codes are easier.

### Q: How do I print barcode labels?
**A:** After import, use barcode label printing software compatible with your label printer. Popular options: BarTender, NiceLabel, or free online generators.

## Database Schema

The `barcode_no` field in the items table:
```sql
barcode_no text null
```

- **Type**: Text (supports any string)
- **Optional**: Can be NULL
- **Indexed**: Yes (for fast lookups)
- **Unique**: Not enforced at database level, but validated in application logic

## API Integration

For future POS or mobile app integration, barcodes can be used for:
- Quick item lookup by scanning
- Fast checkout processing
- Inventory tracking
- Stock auditing with barcode scanners

---

**Need Help?** Check the bulk upload template instructions or refer to the validation errors displayed during upload.
