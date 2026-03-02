# COMPREHENSIVE REPORTS SECTION AUDIT

**Audit Date:** 2025  
**Scope:** Every report file in web app (`app/reports/`), components (`components/reports/`), API routes, PDF service, mobile app (`inventory-billing-mobile/src/screens/reports/`), and shared types.  

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [CRITICAL Issues (Data Integrity / Completely Broken)](#2-critical-issues)
3. [HIGH Issues (Non-Functional Features)](#3-high-issues)
4. [MEDIUM Issues (Logic Bugs / Data Accuracy)](#4-medium-issues)
5. [LOW Issues (Missing Features / Polish)](#5-low-issues)
6. [Column Name Mapping Audit](#6-column-name-mapping-audit)
7. [File-by-File Detailed Report](#7-file-by-file-detailed-report)
8. [Export Capability Matrix](#8-export-capability-matrix)
9. [Mobile App Issues](#9-mobile-app-issues)
10. [Interconnection Analysis](#10-interconnection-analysis)
11. [Dead Code](#11-dead-code)

---

## 1. EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Total report pages audited (web) | 18 |
| Total report components audited | 3 |
| Total API routes audited | 1 |
| Total mobile screens audited | 2 |
| **CRITICAL issues** | **5** |
| **HIGH issues** | **9** |
| **MEDIUM issues** | **8** |
| **LOW issues** | **10** |
| Reports with working PDF export | 3 of 18 |
| Reports with working CSV export | 8 of 18 |
| Reports with non-functional Export buttons | 5 |
| Reports using hardcoded/mock data | 3 |
| Dead/legacy files | 2 |

---

## 2. CRITICAL ISSUES

### C1. Expense Report — Completely Stubbed (Never Fetches Data)
- **File:** `app/reports/expenses/page.tsx` line 62
- **Code:** `setExpenses([])`
- **Impact:** The fetch function body only sets expenses to an empty array. This report can NEVER show any data. The entire page is non-functional.

### C2. Profit & Loss — Hardcoded Mock Stock & Fake Expenses
- **File:** `app/reports/profit-loss/page.tsx` lines 88-106
- **Code:**
  ```
  const openingStock = 50000  // line 88
  const closingStock = 45000  // line 89
  // Expenses are percentages of gross profit:
  { category: 'Salaries & Wages', amount: grossProfit * 0.15 }  // line 96
  { category: 'Rent', amount: grossProfit * 0.05 }              // line 97
  const taxesProvision = Math.max(0, operatingProfit * 0.30)     // line 106
  ```
- **Impact:** Opening stock (₹50,000) and closing stock (₹45,000) are hardcoded. All expense line items (Salaries, Rent, Utilities, Marketing, etc.) are fabricated as percentages of gross profit (15%, 5%, 2%, 3%, 1%, 2%, 2%, 1%). Tax is hardcoded at 30%. This means the P&L statement shows completely fictional numbers.

### C3. Cash Flow Statement — Hardcoded Mock Opening Balance & Empty Activities
- **File:** `app/reports/cash-flow/page.tsx` lines 82-110
- **Code:**
  ```
  { description: 'Operating expenses', amount: 0, type: 'outflow' }   // line 83
  { description: 'Salaries & wages', amount: 0, type: 'outflow' }     // line 84
  // Investing Activities - ALL zeros                                   // lines 92-96
  // Financing Activities - ALL zeros                                   // lines 100-106
  const openingBalance = 100000                                         // line 109
  ```
- **Impact:** Opening balance is always ₹100,000. Investing activities, financing activities, operating expenses, and salaries are all hardcoded to 0. Only operating receipts/payments from invoices and purchases are real data.

### C4. Item Profit — Fabricates Cost Data
- **File:** `app/reports/item-profit/page.tsx` line 57
- **Code:** `const costPrice = item.purchasePrice || item.costPrice || (sellingPrice * 0.7)`
- **Impact:** When no purchase price data exists, the cost is fabricated as 70% of selling price, giving a fake 30% margin. This silently produces fictional profit numbers with no indication to the user.

### C5. Item Profit — Uses Non-Existent `item.price` Field
- **File:** `app/reports/item-profit/page.tsx` line 56
- **Code:** `const sellingPrice = item.price || 0`
- **Impact:** The API at `/api/invoices` returns invoice items with `rate` (not `price`). The `ApiInvoiceItemResponse` type has `price?: number` as optional but the actual API route maps it from `item.rate`. This means `item.price` may always be undefined unless the API explicitly sets it, causing `sellingPrice = 0` for all items, which in turn makes ALL revenue $0 and triggers the fallback cost calculation of `0 * 0.7 = 0`.

---

## 3. HIGH ISSUES

### H1. Returns Report — Export Button Has No onClick Handler
- **File:** `app/reports/returns/page.tsx` line 125
- **Code:** `<Button variant="outline" size="sm">` (no onClick)
- **Impact:** Export button renders but does nothing when clicked. No CSV or PDF export exists for this report.

### H2. Outstanding Report — Export Button Has No onClick Handler
- **File:** `app/reports/outstanding/page.tsx` line 296
- **Code:** `<Button variant="outline" size="sm">` (no onClick)
- **Impact:** Same as H1. No export functionality.

### H3. GSTR-3B — Export Button Has No onClick Handler
- **File:** `app/reports/gstr-3b/page.tsx` line 218
- **Code:** `<Button variant="outline" size="sm">` (no onClick)
- **Impact:** Same as H1. No export functionality.

### H4. Profit & Loss — Export Button Has No onClick Handler
- **File:** `app/reports/profit-loss/page.tsx` line 274
- **Code:** `<Button variant="outline" size="sm">` (no onClick)
- **Impact:** Same as H1. No export functionality.

### H5. Cash Flow — Export Button Has No onClick Handler
- **File:** `app/reports/cash-flow/page.tsx` line 198
- **Code:** `<Button variant="outline" size="sm">` (no onClick)
- **Impact:** Same as H1. No export functionality.

### H6. GSTR-1 — "Export for Filing" Button Has No onClick Handler
- **File:** `app/reports/gstr-1/page.tsx` line 279
- **Code:** `<Button variant="default" size="sm">` (no onClick)
- **Impact:** The most important button on a GST filing page does nothing. The regular CSV export works, but the "Export for Filing" button (which should produce a government-compatible format) is dead.

### H7. GSTR-1 & GSTR-2 — Tax Calculation Operator Precedence Bug
- **Files:**
  - `app/reports/gstr-1/page.tsx` line 80: `cgst: isInterState ? 0 : (inv.cgst || (inv.totalTax ?? 0) / 2 || 0)`
  - `app/reports/gstr-2/page.tsx` line 80: `cgst: isInterState ? 0 : (pur.cgst || (pur.totalTax ?? 0) / 2 || 0)`
- **Bug:** The expression `(inv.totalTax ?? 0) / 2 || 0` is evaluated as `((inv.totalTax ?? 0) / 2) || 0`. If `totalTax` is a very small number (e.g., 0.01), then `0.01 / 2 = 0.005` which is truthy, so it works. But the real issue is the outer `||` chain: `inv.cgst || (computed) || 0`. If `inv.cgst` is `0` (which is falsy in JS), it falls through to the computed value even when cgst is legitimately 0. This can cause intra-state invoices with 0% CGST to show incorrect tax values.

### H8. GSTR-2 — `itcEligible` Returns String Instead of Boolean
- **File:** `app/reports/gstr-2/page.tsx` line 87
- **Code:** `itcEligible: pur.supplierGstin && pur.supplierGstin.length === 15`
- **Impact:** The `&&` operator returns the right-hand value if both are truthy, or the falsy left-hand value. So `itcEligible` will be `true`, `false`, `undefined`, or `""` depending on `supplierGstin`. It should use `Boolean()` or `!!` wrapper. This causes type inconsistency when rendering/filtering.

### H9. Purchases Report — No PDF Generation, Missing GST Breakdown
- **File:** `app/reports/purchases/page.tsx`
- **Impact:** Unlike the Sales report which has full PDF export via `CompactReportPDF` with CGST/SGST/IGST columns, the Purchases report only has CSV export and `window.print()`. There are no CGST/SGST/IGST breakdown columns in the table at all, despite this data being available from the API.

---

## 4. MEDIUM ISSUES

### M1. GSTR-1 & GSTR-2 — `placeOfSupply` and `stateCode` May Be Undefined
- **Files:** `app/reports/gstr-1/page.tsx` line 70, `app/reports/gstr-2/page.tsx` line 70
- **Code:** `const isInterState = inv.placeOfSupply !== inv.stateCode`
- **Impact:** Both `placeOfSupply` and `stateCode` are optional in `ApiInvoiceResponse`. If both are `undefined`, then `undefined !== undefined` is `false`, making all invoices intra-state by default. The `/api/invoices` route does NOT map `placeOfSupply` or `stateCode` from the database at all — these fields only exist in the type definition but are never populated.

### M2. GSTR-1 — Uses `customerGstin` but API Returns `customerGst`
- **File:** `app/reports/gstr-1/page.tsx` line 72
- **Code:** `const hasGstin = inv.customerGstin && inv.customerGstin.length === 15`
- **Impact:** The `/api/invoices` route maps `customerGst: invoice.customer_gst` but does NOT map `customerGstin`. The `ApiInvoiceResponse` type has both `customerGst?` and `customerGstin?`, but only `customerGst` is populated. This means `hasGstin` is always falsy, making ALL invoices show as "B2C" type even when they should be "B2B".

### M3. GSTR-2 — Uses `supplierGstin` but API Returns `supplierGst`
- **File:** `app/reports/gstr-2/page.tsx` line 77
- **Same issue as M2** but for purchases. The API maps `supplierGst: purchase.supplier_gst` but the report uses `pur.supplierGstin`. This makes ALL purchases show as having no supplier GST and ITC ineligible.

### M4. Stock Detail — Opening Stock Calculation Is Unreliable
- **File:** `app/reports/stock-detail/page.tsx`
- **Logic:** `opening = currentStock - inward + outward`
- **Impact:** This back-calculates opening stock from current stock minus inward plus outward. This is only correct if `currentStock` is the closing stock for the period being viewed AND inward/outward quantities are complete for that period. If either condition fails, opening stock will be wrong.

### M5. Party Profit — Revenue Calculation May Be Wrong
- **File:** `app/reports/party-profit/page.tsx`
- **Impact:** Uses `inv.subtotal` for revenue but doesn't account for returns (credit notes). A customer who bought ₹100,000 and returned ₹20,000 would still show ₹100,000 revenue. Credit notes are stored as invoices with `documentType: 'credit_note'` and should be subtracted.

### M6. Item Profit — Uses `item.sku` but API Returns It in `ApiInvoiceItemResponse.sku`
- **File:** `app/reports/item-profit/page.tsx` line 47
- **Impact:** The `/api/invoices` route does NOT map `sku` from invoice items. The field exists in the type but the API transform doesn't include it. It will always be undefined, falling back to `'-'`.

### M7. Sales Report — Uses `inv.items` Which May Be Empty
- **File:** `app/reports/sales/page.tsx`
- **Impact:** The "Item-wise" view tab iterates over `inv.items`. The `/api/invoices` does return items from `invoice_items(*)`, but if the join fails or items are deleted, the array could be empty, showing incomplete data.

### M8. Day Book — No Date Range Filter Applied to API Call
- **File:** `app/reports/day-book/page.tsx`
- **Impact:** Fetches ALL invoices, purchases, and payments from the API and then filters client-side. For businesses with thousands of transactions, this is a performance issue — all data is loaded every time the component mounts.

---

## 5. LOW ISSUES

### L1. No True Excel (.xlsx) Export Anywhere
- **Impact:** All reports that have export only generate CSV files. There is no `.xlsx` generation. The CSV files may have encoding issues with ₹ symbol and Indian characters.

### L2. `window.print()` Used Instead of Proper PDF Generation
- **Files:** Multiple reports use `window.print()` for printing
- **Impact:** `window.print()` uses the browser's print dialog which includes browser chrome, doesn't handle page breaks well, and produces inconsistent output across browsers.

### L3. `lib/pdf-service.tsx` — `downloadInvoicePDF()` Is a Stub
- **File:** `lib/pdf-service.tsx` line 183
- **Code:** Returns `{ html, filename }` with a comment "In a real implementation, this would use a library"
- **Impact:** The function generates HTML but never actually creates a PDF. It's only used for invoices (not reports), but it's still non-functional.

### L4. Old/Legacy Pages Still Exist
- **Files:** `app/reports/old-page.tsx` (536 lines), `app/reports/legacy-page.tsx` (538 lines)
- **Impact:** These are server-side rendered versions of the reports page that use `getInvoices()`, `getPurchases()`, `getItems()` server actions. They are dead code — not reachable by any route — but add maintenance confusion. They also use wrong column names like `item.stock` and `item.purchasePrice` (camelCase TS interface properties) which won't match the raw Supabase columns.

### L5. Low Stock Report — Hardcoded Threshold
- **File:** `app/reports/low-stock/page.tsx`
- **Impact:** Uses `min_stock` from the database for threshold comparison, which is correct. However, items without `min_stock` set will never appear as low stock.

### L6. Outstanding Report — No Export or PDF
- **File:** `app/reports/outstanding/page.tsx`
- **Impact:** Despite having aging analysis and detailed receivables/payables data, there's no way to export this data at all.

### L7. Returns Report — Original Invoice Extraction Is Fragile
- **File:** `app/reports/returns/page.tsx` line 62
- **Code:** `originalInvoiceNo: inv.notes?.includes('INV-') ? inv.notes.match(/INV-\d+/)?.[0] : '-'`
- **Impact:** Relies on the `notes` field containing `INV-` pattern to find the original invoice. This is brittle — if the note format changes or no note is entered, the original invoice is never identified. Should use `parentDocumentId` from the invoice instead.

### L8. Reports Index Page — Hardcoded Quick Stats
- **File:** `app/reports/page.tsx`
- **Impact:** The dashboard page shows report categories with icons and links. It does NOT show any quick metrics or KPIs. This is a missed opportunity but not a bug.

### L9. Party Ledger — Multiple Sequential API Calls
- **File:** `app/reports/party-ledger/page.tsx`
- **Impact:** Makes 4 sequential API calls (customers, suppliers, invoices, payments) on mount. These could be parallelized or combined.

### L10. Compact Report PDF — Font Files Must Exist
- **File:** `components/reports/compact-report-pdf.tsx` lines 10-18
- **Code:** Registers NotoSans fonts from `/fonts/NotoSans-Regular.ttf`, etc.
- **Impact:** If these font files don't exist in `/public/fonts/`, PDF generation will fail silently or show garbled text.

---

## 6. COLUMN NAME MAPPING AUDIT

### Database (snake_case) → API Response (camelCase) → Report File Usage

| DB Column | API Maps To | Report Uses | Match? | Affected Reports |
|-----------|-------------|-------------|--------|------------------|
| `customer_gst` | `customerGst` | `customerGstin` | **MISMATCH** | GSTR-1 (line 72,74,76) |
| `supplier_gst` | `supplierGst` | `supplierGstin` | **MISMATCH** | GSTR-2 (line 77,87) |
| `current_stock` | `current_stock` (raw) | `stock` (mobile) | **MISMATCH** | Mobile ReportDetailScreen (lines 144, 151, 287, 288, 296) |
| `current_stock` | `current_stock` (raw) | `current_stock` (web) | OK | Web reports via /api/reports/stock |
| `item_code` | `item_code` (raw) | `sku` (item-profit) | **MISMATCH** | item-profit (line 47) |
| `item_code` | `item_code` (raw) | `sku` (mobile) | **MISMATCH** | Mobile ReportDetailScreen (line 293) |
| `sale_price` | `sale_price` (raw) | `price` (item-profit) | **MISMATCH** | item-profit (line 56) |
| `purchase_price` | `purchase_price` (raw) | `purchase_price` | OK | Stock reports, mobile |
| `tax_rate` / `gst_rate` | `gstRate` (invoices) | `gstRate` | OK | Sales, GSTR reports |
| `hsn` | `hsn` (raw for items API) | `hsn_code` (mobile) | **MISMATCH** | Mobile ReportDetailScreen (line 293) |
| `invoice_number` | `invoiceNo` | `invoiceNo` | OK | All invoice reports |
| `purchase_number` | `purchaseNo` | `purchaseNo` | OK | Purchase reports |
| `place_of_supply` | NOT MAPPED | `placeOfSupply` | **NOT AVAILABLE** | GSTR-1, GSTR-2 |
| `state_code` | NOT MAPPED | `stateCode` | **NOT AVAILABLE** | GSTR-1, GSTR-2 |
| `total_tax` | NOT MAPPED | `totalTax` | **NOT AVAILABLE** | GSTR-1, GSTR-2, GSTR-3B |

### Mobile App Column Issues (querying Supabase directly)

The mobile `ReportDetailScreen.tsx` queries Supabase directly (not via API), so it uses raw snake_case column names. However:

| Column Used by Mobile | Actual DB Column | Match? |
|----------------------|------------------|--------|
| `i.stock` (line 144) | `current_stock` | **WRONG** — will always be `undefined` |
| `item.stock` (lines 287, 288, 296) | `current_stock` | **WRONG** — stock values always 0/undefined |
| `item.sku` (line 293) | `item_code` | **WRONG** — will be undefined |
| `item.hsn_code` (line 293) | `hsn` | **WRONG** — will be undefined |
| `item.purchase_price` (lines 144, 287) | `purchase_price` | OK |

### Summary of Column Mismatches

| Issue | Count |
|-------|-------|
| Fields used that don't exist in API response | 5 |
| Fields used with wrong name | 6 |
| Fields correctly mapped | 8 |

---

## 7. FILE-BY-FILE DETAILED REPORT

### 7.1 `app/reports/page.tsx` (374 lines) — Report Dashboard
- **Status:** FUNCTIONAL
- **Purpose:** Landing page with 5 report group cards linking to 17+ sub-reports
- **Issues:** None. Purely presentational.

### 7.2 `app/reports/sales/page.tsx` (531 lines) — Sales & GST Register
- **Status:** MOSTLY FUNCTIONAL
- **Purpose:** Sales report with summary + item-wise views, date filtering
- **Has:** PDF (CompactReportPDF), CSV export, date range filter
- **Issues:**
  - M7: `inv.items` may be empty if join fails
  - Uses `ReportFilter` component correctly

### 7.3 `app/reports/purchases/page.tsx` (~320 lines) — Purchase Report
- **Status:** PARTIALLY FUNCTIONAL
- **Purpose:** Purchase summary with date filtering
- **Has:** CSV export, `window.print()`
- **Missing:** PDF generation, CGST/SGST/IGST column breakdown (H9)

### 7.4 `app/reports/stock-summary/page.tsx` (36 lines) — Stock Summary Wrapper
- **Status:** FUNCTIONAL
- **Purpose:** Thin wrapper rendering `StockReportComponent`
- **Issues:** None.

### 7.5 `components/reports/stock-summary-report.tsx` (~350 lines) — Stock Summary Component
- **Status:** FUNCTIONAL
- **Purpose:** Comprehensive stock report with warehouse filtering, expandable rows
- **Has:** PDF (CompactReportPDF), CSV export
- **Issues:** None major.

### 7.6 `app/reports/stock-detail/page.tsx` (~310 lines) — Stock Movement
- **Status:** PARTIALLY FUNCTIONAL
- **Purpose:** Opening + Inward - Outward = Closing stock movement
- **Has:** CSV export
- **Missing:** PDF generation
- **Issues:** M4 (unreliable opening stock calculation)

### 7.7 `app/reports/returns/page.tsx` (331 lines) — Returns Report
- **Status:** PARTIALLY BROKEN
- **Has:** `window.print()`
- **Missing:** Export (H1 — button dead), PDF generation
- **Issues:** L7 (fragile invoice extraction from notes)

### 7.8 `app/reports/expenses/page.tsx` (302 lines) — Expense Report
- **Status:** COMPLETELY BROKEN (C1)
- **Impact:** Never fetches data. Always empty. All UI code is dead code.

### 7.9 `app/reports/party-ledger/page.tsx` (~370 lines) — Party Ledger
- **Status:** FUNCTIONAL
- **Purpose:** Statement of account per customer/supplier
- **Has:** PDF (CompactReportPDF), CSV export
- **Issues:** L9 (sequential API calls)

### 7.10 `app/reports/outstanding/page.tsx` (554 lines) — Outstanding Report
- **Status:** PARTIALLY BROKEN
- **Purpose:** Receivables & payables with aging analysis
- **Has:** `window.print()`
- **Missing:** Export (H2 — button dead), PDF generation (L6)

### 7.11 `app/reports/party-profit/page.tsx` (~310 lines) — Party Profit
- **Status:** PARTIALLY FUNCTIONAL
- **Has:** CSV export
- **Missing:** PDF generation
- **Issues:** M5 (doesn't subtract credit notes from revenue)

### 7.12 `app/reports/item-profit/page.tsx` (421 lines) — Item Profit
- **Status:** CRITICALLY BROKEN (C4, C5)
- **Has:** CSV export
- **Missing:** PDF generation
- **Issues:**
  - C4: Fabricates cost as 70% of selling price
  - C5: Uses `item.price` which doesn't exist — selling price always 0
  - M6: Uses `item.sku` which doesn't exist

### 7.13 `app/reports/low-stock/page.tsx` (~340 lines) — Low Stock Alert
- **Status:** FUNCTIONAL
- **Has:** CSV export
- **Missing:** PDF generation
- **Issues:** L5 (items without min_stock never appear)

### 7.14 `app/reports/gstr-1/page.tsx` (456 lines) — GSTR-1
- **Status:** PARTIALLY BROKEN
- **Has:** CSV export, `window.print()`
- **Missing:** "Export for Filing" is dead (H6)
- **Issues:**
  - H7: Tax calculation precedence bug
  - M1: `placeOfSupply`/`stateCode` never populated
  - M2: Uses `customerGstin` but API returns `customerGst` — all invoices show as B2C

### 7.15 `app/reports/gstr-2/page.tsx` (373 lines) — GSTR-2
- **Status:** PARTIALLY BROKEN
- **Has:** CSV export
- **Missing:** PDF generation
- **Issues:**
  - H7: Tax calculation precedence bug
  - H8: `itcEligible` returns string not boolean
  - M1: `placeOfSupply`/`stateCode` never populated
  - M3: Uses `supplierGstin` but API returns `supplierGst`

### 7.16 `app/reports/gstr-3b/page.tsx` (466 lines) — GSTR-3B
- **Status:** PARTIALLY BROKEN
- **Has:** `window.print()`
- **Missing:** Export (H3 — button dead), PDF generation
- **Issues:** Depends on GSTR-1/2 having correct tax data

### 7.17 `app/reports/profit-loss/page.tsx` (517 lines) — Profit & Loss
- **Status:** CRITICALLY BROKEN (C2)
- **Has:** `window.print()`
- **Missing:** Export (H4 — button dead), PDF generation
- **Issues:** Hardcoded stock values, fabricated expenses, hardcoded 30% tax

### 7.18 `app/reports/day-book/page.tsx` (~380 lines) — Day Book
- **Status:** FUNCTIONAL
- **Has:** CSV export, `window.print()`
- **Missing:** PDF generation
- **Issues:** M8 (fetches all data, filters client-side)

### 7.19 `app/reports/cash-flow/page.tsx` (348 lines) — Cash Flow
- **Status:** CRITICALLY BROKEN (C3)
- **Has:** `window.print()`
- **Missing:** Export (H5 — button dead), PDF generation
- **Issues:** Hardcoded ₹100,000 opening balance, investing/financing all zeros

### 7.20 `app/reports/error.tsx` (9 lines) — Error Boundary
- **Status:** FUNCTIONAL
- **Purpose:** Catches rendering errors, shows ErrorBoundaryCard

### 7.21 `components/reports/compact-report-pdf.tsx` (347 lines) — PDF Component
- **Status:** FUNCTIONAL
- **Purpose:** Generic PDF generator using @react-pdf/renderer
- **Issues:** L10 (font files must exist)

### 7.22 `components/reports/report-filter.tsx` (312 lines) — Filter Component
- **Status:** FUNCTIONAL
- **Purpose:** Reusable date/search/select filter bar
- **Issues:** None.

### 7.23 `app/api/reports/stock/route.ts` (~300 lines) — Stock API
- **Status:** FUNCTIONAL
- **Purpose:** Stock report with warehouse filtering, pagination
- **Issues:** None major.

### 7.24 `lib/pdf-service.tsx` (~200 lines) — Invoice PDF Service
- **Status:** STUB
- **Purpose:** Generates invoice HTML for PDF conversion
- **Issues:** L3 (`downloadInvoicePDF` never produces an actual PDF file)

---

## 8. EXPORT CAPABILITY MATRIX

| Report | PDF | CSV | Window.Print | Export Button Works? |
|--------|-----|-----|-------------|---------------------|
| Sales | YES | YES | YES | YES |
| Purchases | NO | YES | YES | YES |
| Stock Summary | YES | YES | NO | YES |
| Stock Detail | NO | YES | NO | YES |
| Returns | NO | NO | YES | **NO (dead button)** |
| Expenses | NO | YES* | NO | YES* (but no data) |
| Party Ledger | YES | YES | NO | YES |
| Outstanding | NO | NO | YES | **NO (dead button)** |
| Party Profit | NO | YES | NO | YES |
| Item Profit | NO | YES | NO | YES (but wrong data) |
| Low Stock | NO | YES | NO | YES |
| GSTR-1 | NO | YES | YES | **"Export for Filing" dead** |
| GSTR-2 | NO | YES | NO | YES |
| GSTR-3B | NO | NO | YES | **NO (dead button)** |
| Profit & Loss | NO | NO | YES | **NO (dead button)** |
| Day Book | NO | YES | YES | YES |
| Cash Flow | NO | NO | YES | **NO (dead button)** |

**Summary:** Only 3/18 reports have PDF export. 5 reports have dead export buttons. No report has true Excel (.xlsx) export.

---

## 9. MOBILE APP ISSUES

### 9.1 `ReportDetailScreen.tsx` (420 lines)

#### Wrong Column Names (queries Supabase directly):
1. **Line 144:** `i.stock` → should be `i.current_stock`
2. **Line 151:** `.lt('stock', 10)` → should be `.lt('current_stock', 10)`  
3. **Lines 287-296:** `item.stock` → should be `item.current_stock`
4. **Line 293:** `item.sku` → should be `item.item_code`
5. **Line 293:** `item.hsn_code` → should be `item.hsn`

#### Missing Reports:
The mobile `ReportDetailScreen` has a switch statement (lines 74-96) handling: sales, purchases, stock-summary, stock-detail, low-stock, outstanding, party-profit, gstr-1/2/3b, profit-loss. **Missing handlers for:**
- `expenses` — falls through to `default: setData([])`
- `party-ledger` — falls through to `default: setData([])`  
- `item-profit` — falls through to `default: setData([])`
- `day-book` — falls through to `default: setData([])`
- `cash-flow` — falls through to `default: setData([])`
- `returns` — falls through to `default: setData([])`

These report types are listed in `REPORT_CONFIG` (lines 28-49) and visible in the UI, but navigating to them shows "No data available."

#### No Export on Mobile:
No mobile report has any export functionality (no PDF, no CSV, no share).

#### Party Profit Missing Cost Data:
Line 170: Party profit only calculates `revenue` (sum of `total`). There is no cost/profit calculation — the report is labeled "Party Profit" but only shows revenue.

#### GST Report Oversimplified:
Lines 176-181: The GST report loads all invoices where `is_gst` is `true`. But:
- `is_gst` column may not exist (the web API uses `gst_enabled`)
- No date filtering — shows all-time data
- No B2B/B2C categorization
- No purchase-side GST (ITC)

#### Profit/Loss Oversimplified:
Lines 185-198: Only shows Revenue - Expenses = Net Profit (where "Expenses" = total purchases). No stock change, no operating expenses, no tax.

### 9.2 `ReportsScreen.tsx` (~300 lines)
- **Status:** FUNCTIONAL for navigation
- **Issues:** Quick stats may have column name mismatches if querying Supabase directly

---

## 10. INTERCONNECTION ANALYSIS

### Data Flow:
```
Supabase DB (snake_case columns)
    ↓
API Routes (/api/invoices, /api/purchases, /api/items, etc.)
    ↓ (transform snake_case → camelCase)
Web Report Pages (fetch from API)

Mobile App queries Supabase DIRECTLY (bypasses API transform)
```

### Key Dependencies:
1. **Sales Report** → `/api/invoices` → `invoices` + `invoice_items` tables
2. **Purchase Report** → `/api/purchases` → `purchases` + `purchase_items` tables
3. **Stock Reports** → `/api/items` + `/api/reports/stock` → `items` + `item_warehouse_stock` + `stock_ledger` tables
4. **Party Ledger** → `/api/customers` + `/api/suppliers` + `/api/invoices` + `/api/payments`
5. **Outstanding** → `/api/invoices` + `/api/purchases`
6. **GST Reports** → `/api/invoices` (GSTR-1) + `/api/purchases` (GSTR-2) + both (GSTR-3B)
7. **CompactReportPDF** → Used by: Sales, Party Ledger, Stock Summary (only 3 reports)
8. **ReportFilter** → Used by: Sales, Purchases, Stock Detail, Low Stock, Item Profit, Day Book

### Critical Disconnects:
1. **`ApiInvoiceResponse` has `customerGst` AND `customerGstin`** — API only populates `customerGst`. Reports use `customerGstin`. This breaks GSTR-1 B2B/B2C classification.
2. **`ApiPurchaseResponse` has `supplierGst` AND `supplierGstin`** — Same issue. Breaks GSTR-2 and ITC eligibility.
3. **`placeOfSupply` and `stateCode`** exist in types but are NEVER populated by ANY API route. Interstate vs intrastate determination is always wrong.
4. **`totalTax`** exists in types but is NEVER populated by API. The `|| 0` fallback chains in GSTR reports silently produce wrong numbers.
5. **Mobile app bypasses API** — Uses Supabase directly with wrong column names, meaning ALL mobile stock/inventory reports show 0 or empty data.

---

## 11. DEAD CODE

| File | Lines | Notes |
|------|-------|-------|
| `app/reports/old-page.tsx` | 536 | Server-rendered reports page, not routable |
| `app/reports/legacy-page.tsx` | 538 | Nearly identical to old-page.tsx |
| `app/reports/expenses/page.tsx` | 302 | UI code exists but data fetch is stubbed |
| `lib/pdf-service.tsx` `downloadInvoicePDF()` | ~20 | Generates HTML but no actual PDF |

---

## PRIORITY FIX ORDER

### Immediate (Critical — producing wrong/fake data):
1. Fix `item-profit/page.tsx` — use `item.rate` instead of `item.price`, remove fake cost fallback
2. Fix `profit-loss/page.tsx` — remove hardcoded stock/expenses, implement real data
3. Fix `cash-flow/page.tsx` — remove hardcoded opening balance, implement real data
4. Fix `expenses/page.tsx` — implement actual expense data fetch
5. Fix GSTR-1/2 `customerGstin`→`customerGst` and `supplierGstin`→`supplierGst`

### High Priority:
6. Populate `placeOfSupply` and `stateCode` in `/api/invoices` and `/api/purchases` routes
7. Wire up all 5 dead Export buttons (returns, outstanding, GSTR-3B, P&L, cash-flow)
8. Fix tax calculation operator precedence in GSTR-1/2
9. Add GST breakdown columns to purchases report

### Medium Priority:
10. Fix mobile column names (`stock`→`current_stock`, `sku`→`item_code`, `hsn_code`→`hsn`)
11. Implement missing mobile report handlers
12. Add PDF export to remaining 15 reports
13. Add Excel (.xlsx) export capability

### Low Priority:
14. Delete `old-page.tsx` and `legacy-page.tsx`
15. Parallelize Party Ledger API calls
16. Add server-side pagination/filtering to Day Book
17. Verify font files exist for CompactReportPDF
