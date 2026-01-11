# Stock Summary Report - Technical Documentation

## Overview

The Stock Summary Report is a comprehensive inventory reporting module that provides business owners with powerful tools to audit, analyze, and manage their inventory across multiple warehouses (godowns).

## Features Implemented

### 1. Core Functionality

#### Default Behavior
- **Stock Items Only**: By default, the report shows only items with `current_stock > 0`
- This is the most common use case for business operations
- Improves performance by filtering out inactive/zero-stock items

#### Include Zero Stock Toggle
- Checkbox labeled "Include Zero Stock Items"
- When enabled, displays ALL items in the master database
- Useful for:
  - Complete inventory audits
  - Identifying discontinued items
  - Planning restock operations

### 2. Multi-Godown (Warehouse) Support

#### Global Aggregation
- **Default View**: Shows sum of stock across ALL warehouses
- Stock quantity reflects the total available inventory

#### Warehouse-Specific Filtering
- Select specific warehouse from dropdown
- Report shows stock ONLY from selected warehouse
- Useful for:
  - Individual warehouse audits
  - Inter-warehouse stock comparisons
  - Location-specific inventory planning

#### Expandable Location Breakdown
- Click chevron icon on any row to expand
- Shows detailed breakdown by warehouse:
  - Warehouse name
  - Quantity in that warehouse
  - Specific rack/shelf location (if configured)
- Visual representation with badges

### 3. Comprehensive Filters

All filters work together for powerful data slicing:

#### Date Filter ("As of Date")
- Default: Today's date
- Select any past date to view historical stock
- **Note**: Historical calculation requires stock_ledger integration (see Future Enhancements)

#### Warehouse Filter
- Dropdown with all available warehouses
- "All Warehouses" shows global total
- Single warehouse selection for location-specific reports

#### Category Filter
- Dynamically populated from existing item categories
- Filter by specific categories (e.g., "Electronics", "Raw Material")
- "All Categories" option to show everything

#### Stock Status Filter
- **All**: Show all items regardless of stock level
- **Low Stock Only**: Items where `current_stock <= min_stock`
- **Surplus Stock**: Items where `current_stock > min_stock * 3`

#### Brand/Manufacturer Filter
- Dynamically populated from existing item brands
- Case-insensitive matching
- "All Brands" option available

#### Search Term
- Real-time search across:
  - Item Name
  - Item Code/SKU
- Case-insensitive partial matching

### 4. Smart Quantity Display

#### Packaging Unit Logic
The system intelligently displays quantities based on packaging configuration:

**When Item Has Packaging Unit (e.g., CTN, GONI, BAG):**
- Shows dual format: `X CTN (Y PCS)`
- Example: Instead of "3000 PCS", displays "2 CTN (3000 PCS)"
- With remainder: "2 CTN + 500 PCS (3000 PCS)"

**When No Packaging Unit:**
- Shows simple format: `3000 PCS`

**Database Fields Used:**
- `packaging_unit`: Master packaging type (CTN, GONI, BAG, etc.)
- `per_carton_quantity`: Conversion factor (e.g., 1 CTN = 1500 PCS)
- `unit`: Base unit of measurement (PCS, KG, LTR, etc.)

### 5. Data Presentation

#### Main Table Columns
1. **Expandable Icon**: Click to show warehouse breakdown
2. **Item Code**: SKU/Barcode (monospace font)
3. **Item Name**: Primary identifier
4. **Category**: Item classification
5. **Brand**: Manufacturer/brand name
6. **Stock Quantity**: Smart display format (see above)
7. **Stock Value**: Calculated as `quantity * purchase_price`
8. **Status Badge**: Visual indicator (Low Stock, Normal, Surplus)

#### Summary Cards (Top of Page)
- **Total Items**: Count of items in current view
- **Total Stock Value**: Sum of all stock values (₹)
- **Low Stock Items**: Count of items below minimum
- **Surplus Stock**: Count of items above optimal level

### 6. Export & Print Features

#### Excel Export
- Converts current filtered data to CSV format
- Includes all visible columns
- Smart quantity formatting preserved
- Filename: `stock-report-YYYY-MM-DD.csv`

#### Print Report
- Browser-native print functionality
- Optimized layout for paper
- Includes all filters and summary data

## API Structure

### Endpoint: `/api/reports/stock`

#### Request (Query Parameters)
```typescript
{
  includeZeroStock: boolean    // Default: false
  asOfDate: string             // ISO date, Default: today
  warehouseIds: string         // Comma-separated UUIDs
  categories: string           // Comma-separated category names
  stockStatus: 'all' | 'low' | 'surplus'  // Default: 'all'
  brand: string                // Case-insensitive brand name
  searchTerm: string           // Partial match on name/code
}
```

#### Response Structure
```typescript
{
  success: boolean
  data: StockItem[]
  filters: {
    includeZeroStock: boolean
    asOfDate: string
    warehouseIds: string[]
    categories: string[]
    stockStatus: string
    brand: string
    searchTerm: string
  }
  summary: {
    totalItems: number
    totalStockValue: number
    lowStockItems: number
    surplusStockItems: number
  }
}
```

#### StockItem Type
```typescript
interface StockItem {
  id: string
  item_code: string
  name: string
  category: string
  brand?: string
  unit: string
  packaging_unit?: string
  per_carton_quantity?: number
  purchase_price: number
  min_stock: number
  current_stock: number
  calculated_stock: number      // Sum from all warehouses
  stock_value: number           // calculated_stock * purchase_price
  stock_status_flag: 'low' | 'normal' | 'surplus'
  locations: Array<{
    warehouseId: string
    warehouseName: string
    quantity: number
    location?: string           // Rack/shelf location
  }>
}
```

## SQL Query Architecture

### Main Query Components

#### 1. Warehouse Totals CTE
```sql
WITH warehouse_totals AS (
  SELECT 
    iws.item_id,
    iws.warehouse_id,
    w.name as warehouse_name,
    iws.quantity as warehouse_quantity,
    iws.location as warehouse_location
  FROM item_warehouse_stock iws
  INNER JOIN warehouses w ON w.id = iws.warehouse_id
  WHERE iws.organization_id = $1
  AND iws.warehouse_id = ANY($2::uuid[])  -- Optional filter
)
```

#### 2. Item Aggregates CTE
```sql
item_aggregates AS (
  SELECT 
    item_id,
    SUM(warehouse_quantity) as total_stock,
    json_agg(
      json_build_object(
        'warehouseId', warehouse_id,
        'warehouseName', warehouse_name,
        'quantity', warehouse_quantity,
        'location', warehouse_location
      ) ORDER BY warehouse_name
    ) as warehouse_breakdown
  FROM warehouse_totals
  GROUP BY item_id
)
```

#### 3. Main Select with Filters
```sql
SELECT
  i.id,
  i.item_code,
  i.name,
  i.category,
  i.brand,
  i.unit,
  i.packaging_unit,
  i.per_carton_quantity,
  i.purchase_price,
  i.min_stock,
  COALESCE(ia.total_stock, 0) as calculated_stock,
  COALESCE(ia.warehouse_breakdown, '[]'::json) as locations,
  ROUND(COALESCE(ia.total_stock, 0) * i.purchase_price, 2) as stock_value,
  CASE 
    WHEN ia.total_stock <= i.min_stock AND i.min_stock > 0 THEN 'low'
    WHEN ia.total_stock > (i.min_stock * 3) AND i.min_stock > 0 THEN 'surplus'
    ELSE 'normal'
  END as stock_status_flag
FROM items i
LEFT JOIN item_aggregates ia ON ia.item_id = i.id
WHERE i.organization_id = $1
  AND COALESCE(ia.total_stock, 0) > 0  -- Default: exclude zero stock
  AND i.category = ANY($3)              -- Optional
  AND LOWER(i.brand) = LOWER($4)        -- Optional
  AND (LOWER(i.name) LIKE LOWER($5) OR LOWER(i.item_code) LIKE LOWER($5))  -- Optional
ORDER BY i.name ASC
```

### Performance Optimizations

1. **Indexes Used**:
   - `idx_item_warehouse_stock_item` on `item_warehouse_stock(item_id)`
   - `idx_item_warehouse_stock_warehouse` on `item_warehouse_stock(warehouse_id)`
   - `idx_item_warehouse_stock_org` on `item_warehouse_stock(organization_id)`

2. **Query Strategy**:
   - CTEs for better query organization
   - Early filtering in CTEs reduces data volume
   - JSON aggregation for warehouse breakdown (single query)
   - Conditional filters based on presence of parameters

3. **Fallback Mechanism**:
   - If main query fails, falls back to simpler query
   - Separate fetch for warehouse breakdown
   - Client-side aggregation as last resort

## Component Architecture

### React Component: `StockReportComponent`

**Location**: `components/reports/stock-summary-report.tsx`

#### State Management
```typescript
const [stockData, setStockData] = useState<StockItem[]>([])
const [summary, setSummary] = useState<StockReportSummary>({...})
const [warehouses, setWarehouses] = useState<Warehouse[]>([])
const [availableCategories, setAvailableCategories] = useState<string[]>([])
const [availableBrands, setAvailableBrands] = useState<string[]>([])
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
const [filters, setFilters] = useState<StockReportFilters>({...})
```

#### Key Functions

**`fetchStockReport()`**
- Constructs query parameters from filters state
- Calls `/api/reports/stock` endpoint
- Updates stockData and summary states
- Handles loading states

**`formatQuantity(item: StockItem)`**
- Implements smart packaging display logic
- Checks for packaging_unit and per_carton_quantity
- Returns formatted string with dual display
- Falls back to simple format if no packaging

**`formatCurrency(value: number)`**
- Uses Intl.NumberFormat for Indian Rupee
- Consistent formatting across all currency displays

**`getStockStatusBadge(status: string)`**
- Returns styled Badge component
- Color-coded: Red (low), Blue (surplus), Gray (normal)
- Includes trending icons

**`exportToExcel()`**
- Generates CSV from current filtered data
- Preserves smart quantity formatting
- Creates downloadable blob

**`toggleRowExpansion(itemId: string)`**
- Manages expandedRows Set state
- Toggles visibility of warehouse breakdown

## Database Schema Requirements

### Core Tables

#### items
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  item_code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  unit TEXT,
  packaging_unit TEXT,  -- CTN, GONI, BAG, BUNDLE, PKT
  per_carton_quantity INTEGER,  -- Conversion factor
  purchase_price DECIMAL(10, 2),
  min_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  ...
)
```

#### item_warehouse_stock
```sql
CREATE TABLE item_warehouse_stock (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  organization_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT,  -- Rack/Shelf location
  ...
  UNIQUE(item_id, warehouse_id)
)
```

#### warehouses
```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  ...
)
```

#### stock_ledger (for historical tracking)
```sql
CREATE TABLE stock_ledger (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  item_id UUID NOT NULL,
  warehouse_id UUID,
  transaction_type TEXT,  -- IN, OUT, ADJUSTMENT, etc.
  transaction_date TIMESTAMPTZ,
  quantity_before INTEGER,
  quantity_change INTEGER,
  quantity_after INTEGER,
  ...
)
```

## Usage Guide

### For End Users

#### Basic Stock Report (Default)
1. Navigate to Reports → Stock Summary tab
2. Report shows all items with stock > 0
3. View summary cards for quick insights

#### Including Zero Stock Items
1. Check "Include Zero Stock Items" checkbox
2. Click "Apply Filters"
3. All items now visible, including empty stock

#### Warehouse-Specific Report
1. Select warehouse from "Warehouse/Godown" dropdown
2. Click "Apply Filters"
3. Stock quantities now reflect only that warehouse

#### Finding Low Stock Items
1. Set "Stock Status" filter to "Low Stock Only"
2. Click "Apply Filters"
3. Table shows only items below minimum threshold

#### Viewing Warehouse Breakdown
1. Click chevron (▶) icon on any row
2. Expandable section shows stock by warehouse
3. See specific locations within each warehouse

#### Exporting Report
1. Apply desired filters
2. Click "Export Excel" button
3. CSV file downloads with filtered data

#### Searching for Item
1. Type item name or code in "Search Item" field
2. Partial matching supported (case-insensitive)
3. Click "Apply Filters" to search

### For Developers

#### Adding New Filter
1. Add field to `StockReportFilters` interface
2. Update `filters` state initialization
3. Add UI input in Filters section
4. Update `fetchStockReport()` to include in query params
5. Update API route to handle new parameter
6. Add SQL WHERE clause in query

#### Customizing Quantity Display
Edit `formatQuantity()` function in component:
```typescript
const formatQuantity = (item: StockItem) => {
  // Custom logic here
  return formattedString
}
```

#### Changing Stock Status Thresholds
Edit the CASE statement in SQL query:
```sql
CASE 
  WHEN total_stock <= min_stock THEN 'low'
  WHEN total_stock > (min_stock * 5) THEN 'surplus'  -- Changed from * 3
  ELSE 'normal'
END as stock_status_flag
```

## Future Enhancements

### 1. Historical Stock Calculation
Implement reverse stock calculation using `stock_ledger`:
```sql
WITH stock_at_date AS (
  SELECT 
    item_id,
    warehouse_id,
    SUM(
      CASE 
        WHEN transaction_date <= $asOfDate THEN quantity_change
        ELSE 0
      END
    ) as quantity
  FROM stock_ledger
  WHERE organization_id = $orgId
  GROUP BY item_id, warehouse_id
)
```

### 2. Advanced Analytics
- Stock turnover ratio
- Dead stock identification (no movement in X days)
- ABC analysis (items by value contribution)
- Reorder point suggestions

### 3. Scheduled Reports
- Email reports on schedule (daily/weekly/monthly)
- Automated low stock alerts
- PDF generation for formal reporting

### 4. Multi-Warehouse Comparison
- Side-by-side warehouse comparison view
- Stock transfer suggestions
- Optimal stock distribution algorithm

### 5. Integration with Purchase Orders
- Auto-generate PO for low stock items
- Preferred supplier suggestions
- Historical price tracking

## Testing Checklist

### Functional Tests
- [ ] Default view shows only items with stock > 0
- [ ] Toggle "Include Zero Stock" works correctly
- [ ] Warehouse filter correctly filters stock
- [ ] Category filter works
- [ ] Brand filter works
- [ ] Search term filters correctly
- [ ] Stock status filter (low/surplus) works
- [ ] Expandable rows show warehouse breakdown
- [ ] Smart quantity display formats correctly
- [ ] Export to Excel generates valid CSV
- [ ] Print functionality works

### Edge Cases
- [ ] Item with no packaging_unit shows simple format
- [ ] Item with packaging shows dual format
- [ ] Items with 0 stock excluded by default
- [ ] Items with 0 stock included when toggled
- [ ] Warehouse with no stock handled gracefully
- [ ] Items with null category/brand handled
- [ ] Very large quantities display correctly
- [ ] Multiple warehouse breakdown displays well

### Performance Tests
- [ ] Report loads in < 3 seconds for 1000 items
- [ ] Filtering is responsive (< 1 second)
- [ ] Export handles large datasets (5000+ items)
- [ ] Query uses proper indexes (check EXPLAIN)

## Troubleshooting

### Issue: Report shows zero items
**Cause**: All items have zero stock and default filter is on
**Solution**: Enable "Include Zero Stock Items" toggle

### Issue: Stock value is 0
**Cause**: Items don't have purchase_price set
**Solution**: Update items table with purchase prices

### Issue: Warehouse breakdown is empty
**Cause**: Stock not distributed to warehouses
**Solution**: Ensure item_warehouse_stock table is populated

### Issue: Export fails
**Cause**: Too many items or browser restriction
**Solution**: Apply more restrictive filters or implement server-side CSV generation

### Issue: Slow query performance
**Cause**: Missing indexes or large dataset
**Solution**: 
1. Check indexes exist: `idx_item_warehouse_stock_*`
2. Run EXPLAIN ANALYZE on query
3. Consider pagination for very large datasets

## API Endpoints Reference

### `/api/reports/stock` - GET
Main stock report endpoint

### `/api/warehouses` - GET
Returns list of warehouses for organization

### `/api/items/categories` - GET
Returns distinct categories from items

### `/api/items/brands` - GET
Returns distinct brands from items

## Conclusion

This Stock Summary Report provides a comprehensive, production-ready solution for inventory management with:
- Flexible filtering options
- Multi-warehouse support
- Smart display formatting
- Export capabilities
- Scalable architecture
- Comprehensive documentation

The implementation follows best practices for:
- React component design
- SQL query optimization
- API design
- Type safety with TypeScript
- User experience (UX)
- Performance optimization
