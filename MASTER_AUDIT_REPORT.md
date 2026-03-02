# BusinessOS — 360° Master Audit Report

**Date:** February 27, 2026  
**Audited By:** AI Senior Product Strategist, UX Architect & Lead Software Engineer  
**Benchmark:** Vyapar, Tally, Zoho Books / Inventory

---

## Executive Summary

| Area | Grade | Assessment |
|------|-------|------------|
| **Overall** | **C-** | A functional prototype with impressive breadth but critical structural weaknesses in data integrity, security, and accounting that make it **unsuitable for production deployment in its current state**. |
| Inventory & Warehousing | B- | Schema is solid, but stock operations are non-atomic and race-prone |
| Billing & GST | B | Good document-type coverage, but IGST is hardcoded to 0 and totals are client-trusted |
| Party/CRM | D+ | Schema has credit limits, but aging analysis is a stub and ledger is incomplete |
| Accounting | F | P&L and Balance Sheet pages show hardcoded dummy data. Journal posting isn't transactional |
| Reporting | C | Stock reports are well-built; financial reports are non-functional |
| UX/UI (Web) | C+ | Decent design system, but accessibility violations and no virtualization |
| UX/UI (Mobile) | D | Cards for items exist, but invoices/customers are desktop-only tables on mobile |
| Security & Multi-tenancy | D- | 14 of 34 tables have RLS disabled. Server actions lack permission checks |
| Mobile App (Native) | D | Offline storage exists but sync is completely unimplemented |

---

## Database Schema Overview (34 Tables)

```
accounts                 activity_logs            app_organizations
app_user_organizations   barcode_print_logs       business_details
customer_groups          customers                gst_returns
invoice_items            invoices                 item_batches
item_serials             item_warehouse_stock     items
journal_entries          journal_entry_lines      organization_invitations
organizations            payments                 purchase_items
purchases                queue_jobs               settings
stock_adjustments        stock_ledger             stock_movements
stock_transfer_items     stock_transfers          suppliers
user_organizations       user_roles               warehouse_stock
warehouses
```

**View:** `v_item_stock_summary` (aggregated item stock with warehouse distribution)

---

## Section 1: Feature Scanning & Gap Analysis

### 1.1 Inventory Module

| Feature | Status | Evidence |
|---------|--------|----------|
| Multi-Warehouse Support | ✅ **Present** | `item_warehouse_stock`, `warehouses`, `warehouse_stock` tables exist. UI supports warehouse selection. |
| Stock Ledger (Audit Trail) | ⚠️ **Present (Flawed)** | `stock_ledger` table with full before/after tracking. **But**: `logStockMovement` is a 3-step non-atomic write — ledger, current_stock, warehouse_stock. Partial failure corrupts data. |
| Batch & Expiry Tracking | ⚠️ **Schema Only** | `item_batches` table exists with `batch_number`, `expiry_date`, `remaining_quantity`. `selectBatchFIFO` function exists. **But**: no integration with invoice creation — batches are never auto-deducted on sale. |
| Serial Number Tracking | ⚠️ **Schema Only** | `item_serials` table exists. `updateSerialStatus` doesn't validate state transitions (can "sell" an already-sold serial). |
| Multi-Unit Conversion | ❌ **Broken** | `calculateBaseQuantity()` in `stock-management.ts` always returns `Math.round(entryQuantity)` regardless of unit — the conversion rate is never applied. |
| Low Stock Alerts | ✅ **Present** | `min_stock` field on items; dashboard queries low-stock items. No push notifications or email alerts. |
| Atomic Stock Updates | ❌ **Missing** | Read-then-write pattern in `updateWarehouseStock`. No `SET quantity = quantity + $1` or row-level locking. Two concurrent sales will cause lost updates. |
| Stock Adjustments | ❌ **Cosmetic Only** | `createAdjustment` and `approveAdjustment` create records in `stock_adjustments` but **never update actual stock quantities**. |
| Stock Transfers | ❌ **Cosmetic Only** | `transferStock` creates a transfer record and transfer items but **does not move stock** between warehouses. |

### 1.2 Billing Module

| Feature | Status | Evidence |
|---------|--------|----------|
| GST Invoicing (CGST/SGST) | ✅ **Present** | Correct CGST/SGST split. HSN code support on line items. |
| IGST (Inter-state) | ❌ **Broken** | `invoice-calculations.ts` line ~63: `igst` is hardcoded to `0`. Any inter-state sale calculates zero IGST. |
| E-Invoice (IRN) | ✅ **Present** | Full IRN generation flow, QR codes, status cards, cancellation. |
| E-Way Bill | ✅ **Present** | Generation, extension, cancellation, vehicle update dialogs. Portal sync. |
| Proforma → Invoice | ✅ **Present** | `DocumentType` system with conversion flow. `convertedToInvoiceId` field for linking. |
| Credit Note / Debit Note | ✅ **Present** | Supported as `DocumentType` variants with parent document linking. |
| Custom Templates | ✅ **Present (3)** | Classic, Modern, Minimal. All A4 print-ready. Classic lacks `DocumentType` support. |
| Thermal Printing | ❌ **Missing** | No 2-inch/3-inch thermal receipt layout. All templates are A4 only. |
| RCM (Reverse Charge) | ❌ **Missing** | No Reverse Charge Mechanism support anywhere in the schema or calculations. |
| Multi-Payment Modes | ❌ **Missing** | Single `paymentMethod` field per payment. No split-payment support on a single invoice payment entry. |
| Server-Side Total Verification | ❌ **Missing** | `invoiceSchema` accepts `total`, `subtotal` from client. Server trusts these values without recalculation. |

### 1.3 Party (CRM) Module

| Feature | Status | Evidence |
|---------|--------|----------|
| Customer CRUD | ✅ **Present** | Full CRUD with phone, GST, address. Customer groups with discount %. |
| Credit Limits | ⚠️ **Schema Present, Logic Broken** | `credit_limit` and `credit_days` on `customers` and `customer_groups`. `checkCreditLimit` returns `{ withinLimit: true }` when customer is NOT found — silently approves credit. No enforcement at invoice creation. |
| Aging Analysis (30/60/90) | ❌ **Stub Only** | Page exists at `/customers/aging-analysis` but shows **hardcoded ₹0** for all buckets. |
| Party Ledger Statements | ⚠️ **Infrastructure Only** | `getCustomerStatement` function exists but queries only `invoices` and `payments`. No combined debit/credit ledger format with running balance. |
| Outstanding Balance | ❌ **Not Maintained** | `outstanding_balance` field exists on `customers` table but is never updated when invoices or payments are created. Must be computed by aggregating invoice balances at query time. |
| Payment Reminders | ❌ **Missing** | No WhatsApp/SMS/email reminder integration. |
| Supplier Ledger | ❌ **Missing** | No supplier ledger statement function. Suppliers table is minimal (name, email, phone, GST). |

### 1.4 Reporting Module

| Report | Status | Notes |
|--------|--------|-------|
| Stock Summary | ✅ **Fully Implemented** | Multi-warehouse with drill-down, Excel export, print support. Best-built report. |
| Sales Report | ⚠️ **Page Exists** | Route at `/reports/sales`. |
| Purchase Report | ⚠️ **Page Exists** | Route at `/reports/purchases`. |
| GSTR-1 / GSTR-2 / GSTR-3B | ⚠️ **Pages Exist** | Routes exist. `gst_returns` table present. |
| Profit & Loss | ❌ **Dummy Data** | `profit-loss/page.tsx` shows `revenue: 500000`, `netProfit: 150000` hardcoded. Does NOT call `getProfitLossStatement()`. |
| Balance Sheet | ❌ **Dummy Data** | Shows hardcoded `totalAssets: 550000`. The service function fabricates sub-categories using arbitrary 70/30 ratio. |
| Cash Flow | ❌ **Skeletal** | `investingActivities: 0`, `financingActivities: 0`, `openingCash: 0`. |
| Day Book | ⚠️ **Page Exists** | Route at `/reports/day-book`. |
| Expense Management | ⚠️ **Page Exists** | Route at `/reports/expenses`. No dedicated `expenses` table. |

### 1.5 Accounting Module

| Component | Status | Notes |
|-----------|--------|-------|
| Chart of Accounts | ⚠️ **Seeding Only** | 30+ default accounts. Seeding uses sequential `await` calls (not transactional). |
| Journal Entries | ⚠️ **Partial** | Creates and posts journal entries. Validates `totalDebit === totalCredit`. **But**: `postJournalEntry` updates account balances in a non-transactional loop. |
| Account Balance Logic | ❌ **Incorrect** | Single `net = debit - credit` formula doesn't respect natural account sides (liability/income accounts show inverted balances). |
| Financial Reports Service | ❌ **Broken** | P&L uses Supabase subquery pattern that likely returns no data at runtime. Balance Sheet fabricates asset splits using hardcoded 70/30 ratios. |
| Payment → Accounting Bridge | ❌ **Missing** | Payments don't generate journal entries. No double-entry posting (debit Bank, credit AR) when payment is made. |
| Accounting Dashboard | ❌ **Stub** | All four tabs (CoA, Journal, General Ledger, Financial Reports) display placeholder text. Stats show hardcoded `25+`, `0`, `₹0`. |

---

## Section 2: UX/UI & Accessibility Audit

### 2.1 Navigation & Thumb-Zone

- **Sidebar**: Hamburger-triggered on mobile, fixed on desktop. Good pattern.
- **Sub-nav items** (Reports sub-menu) use `py-1.5` padding — **~24px total height, below the 44px minimum** per WCAG/Apple HIG.
- **Icon buttons** (notification bell, close sidebar) use `size-9` (36px) — **below 44px minimum**.
- **OrganizationSwitcher** is `hidden sm:block` — **inaccessible to mobile users** with no alternative entry point.

### 2.2 Performance at Scale (10,000+ Items)

- **No virtualization library** in the entire codebase (no `react-window`, `@tanstack/react-virtual`).
- **Items page**: Server component fetches ALL items → passes full array to client. Client-side filtering/sorting/scoring runs on every render. At 10k items = 5-10MB RSC payload + O(n) filtering on every keystroke without debounce.
- **Invoice form**: `useEffect` → `Promise.all([getCustomers(), getItems(), getInvoices(), getSettings()])` — downloads entire catalog on mount.
- **Pagination**: Client-side only at 50 items/page via `usePagination`. Total dataset always in memory.
- **No Suspense boundaries**: The page either loads fully or shows the `loading.tsx` skeleton. No progressive rendering.

### 2.3 Accessibility Failures

| Issue | Severity | Standard |
|-------|----------|----------|
| `userScalable: false` + `maximumScale: 1` in root layout | **Critical** | WCAG 1.4.4 — blocks pinch-to-zoom |
| `focus-visible:ring-0` on Button component | **High** | WCAG 2.4.7 — focus indicator removed |
| No skip-link to bypass sidebar navigation | **High** | WCAG 2.4.1 |
| No `aria-live` regions for dynamic content (search results, filter counts) | **Medium** | WCAG 4.1.3 |
| No `aria-current="page"` on active nav item | **Low** | Best practice |
| No `aria-label` on sidebar `<aside>` | **Low** | Best practice |

### 2.4 Mobile Responsiveness

| Component | Mobile Support | Notes |
|-----------|---------------|-------|
| Items listing | ✅ Good | `ItemMobileCard` view with `md:hidden` / `hidden md:block` split |
| Sidebar | ✅ Good | Hamburger menu with overlay pattern |
| Invoice form | ❌ Poor | Full-width table with `overflow-x-auto` — unusable on phones |
| Invoice table | ❌ Poor | No mobile card view — horizontal-scrolling table |
| Customers table | ❌ Poor | Single `<Table>` with no mobile variant |
| Reports page | ✅ Decent | `grid-cols-2 lg:grid-cols-5` for stats |
| Header | ⚠️ Partial | OrgSwitcher hidden on mobile with no alternative |

### 2.5 Design Consistency ("Visual Drift")

| Finding | Location |
|---------|----------|
| `px` units in upload/form components (`min-w-[120px]`, `w-[250px]`) | `item-upload-btn.tsx`, `item-form.tsx` |
| `rem` units in table components (`w-[2.75rem]`, `min-w-[11.25rem]`) | `items-content.tsx`, `customers-table.tsx` |
| `text-[0.625rem]` (10px) for report badges — below readable minimum | `reports/page.tsx` |
| `PAGINATION.defaultPageSize: 10` design token ignored — items use hardcoded `50` | `items-content.tsx` vs `design-tokens.ts` |
| Duplicate `formatCurrency` function in dashboard | Local reimplementation instead of using `format-utils.ts` |

### 2.6 Data Fetching Patterns

| Page | Component Type | Fetching Pattern | Issues |
|------|---------------|-----------------|--------|
| `items/page.tsx` | Server Component | `await getItems()` — waterfall: fetches items, godowns, printLogs sequentially | All data loaded at once, no streaming |
| `reports/page.tsx` | Server Component | Static data only, no DB calls | Fine |
| `layout.tsx` | Server Component | `await getCurrentUser()` | Blocks entire shell render |
| `invoice-form.tsx` | Client Component | `useEffect` → `Promise.all(...)` | Fetches ALL invoices + items + customers client-side on mount |
| `customers-table.tsx` | Client Component | Receives data via props from server parent | Good pattern |
| `dashboard/page.tsx` | Client Component | Client-side Supabase queries | No org filter, fetches up to 1000 rows |

### 2.7 Loading, Error & Skeleton States

**Strengths:**
- 7 `loading.tsx` files exist for: items, invoices, customers, customers/[id], purchases, suppliers, payments, reports
- Skeleton components use responsive sizing

**Gaps:**
- **No `error.tsx` error boundaries** — if `getItems()` throws, there's no graceful fallback
- Invoice form loading state is a centered spinner with no skeleton matching the form shape
- `force-dynamic` + `fetchCache: "force-no-store"` + `revalidate: 0` on root layout = **zero caching**

---

## Section 3: Competitive Benchmarking (Vyapar & Zoho Inventory)

### Killer Features You're Missing

| Feature | Vyapar | Zoho Inventory | BusinessOS |
|---------|--------|----------------|------------|
| Back-dated entry support | ✅ (with stock recalculation) | ✅ | ❌ — stock ledger only uses current timestamp |
| Multi-currency support | Basic | ✅ (50+ currencies with real-time rates) | ❌ — single currency (INR) hardcoded |
| Decimal quantity precision (0.5 KG, 2.75 MTR) | ✅ | ✅ | ❌ — `invoice_items.quantity` is `integer`, not `numeric` |
| Auto-apply trade discount / party-specific pricing | ✅ (party-wise price lists) | ✅ (price lists module) | ❌ — party groups have discount % but it's never auto-applied |
| Stock-take / Physical Inventory Counting | ✅ | ✅ (cycle counts) | ❌ — no stock-take workflow |
| Purchase Order → GRN → Bill flow | ✅ | ✅ | ❌ — purchases exist standalone |
| Automated GST return filing (JSON export) | ✅ (GSTR-1, 3B) | ✅ | ⚠️ Pages exist but functionality unverified |
| Recurring invoices | ❌ | ✅ | ❌ |
| Multi-branch (not just multi-warehouse) | Basic | ✅ | ❌ — warehouses only |
| Barcode scan during invoice creation | ✅ (camera) | ✅ | ⚠️ — barcode printing exists but no camera scan-to-add |
| WhatsApp/SMS share invoice | ✅ (deep integration) | Email only | ⚠️ — email only via `send-invoice-email-dialog` |
| Thermal receipt printing | ✅ | ✅ | ❌ — A4 only |
| Invoice rounding off | ✅ (round to nearest rupee) | ✅ | ❌ — exact floating-point values |
| TDS/TCS deduction | ❌ | ✅ | ❌ |

### Edge Cases They Handle That You Don't

1. **Negative stock prevention**: Vyapar blocks sales when stock insufficient. BusinessOS uses `Math.max(0, ...)` which silently clamps to zero — allows overselling.
2. **Invoice number uniqueness**: Vyapar uses DB-level sequence. BusinessOS uses `count()` — race condition under concurrent requests.
3. **Back-dated entries with stock recalculation**: Vyapar recalculates all stock movements after the backdated entry. BusinessOS has no mechanism for this.
4. **TDS/TCS deduction**: Zoho supports Tax Deducted/Collected at Source. No TDS/TCS fields in BusinessOS.
5. **Composite/Mixed items (Bill of Materials)**: Vyapar supports kitting. No BOM concept in BusinessOS.
6. **Multiple GSTIN per business**: Zoho supports businesses with multiple GSTINs across states. BusinessOS has single GSTIN.
7. **Financial year lock-down**: Vyapar locks past financial years. BusinessOS has no concept of year close.
8. **Rounding off in invoice totals**: BusinessOS shows exact floating-point values (e.g., ₹1,234.57 instead of ₹1,235).

---

## Section 4: Technical & Security Audit

### 4.1 Multi-Tenant Data Isolation — CRITICAL

**14 of 34 tables have RLS DISABLED:**

| Table (RLS OFF) | Risk |
|-----------------|------|
| `business_details` | Shared across tenants |
| `customers` | **Cross-tenant data leak** |
| `invoices` | **Cross-tenant data leak** |
| `invoice_items` | **Cross-tenant data leak** |
| `items` | **Cross-tenant data leak** |
| `payments` | **Cross-tenant data leak** |
| `purchases` | **Cross-tenant data leak** |
| `purchase_items` | **Cross-tenant data leak** |
| `gst_returns` | **Cross-tenant data leak** |
| `settings` | Shared single row (not multi-tenant scoped) |
| `suppliers` | **Cross-tenant data leak** |
| `warehouses` | **Cross-tenant data leak** |
| `queue_jobs` | Low risk |

**Tables with RLS ENABLED (20):**
`accounts`, `activity_logs`, `app_organizations`, `app_user_organizations`, `barcode_print_logs`, `customer_groups`, `item_batches`, `item_serials`, `item_warehouse_stock`, `journal_entries`, `journal_entry_lines`, `organization_invitations`, `organizations`, `stock_adjustments`, `stock_ledger`, `stock_movements`, `stock_transfer_items`, `stock_transfers`, `user_organizations`, `user_roles`, `warehouse_stock`

Server actions like `getInvoices()`, `getPurchases()` have **no `organization_id` filter** — any authenticated user sees all data from all organizations.

### 4.2 Server-Side Permission Enforcement — MISSING

- `permissions.ts` defines roles (admin, salesperson, accountant, viewer) with granular CRUD permissions across 8 resource types.
- **Zero server actions check these permissions.** A salesperson can call `deleteAllInvoices()` or `deleteAllPurchases()`.
- The permission system is purely a **client-side UI gate** — trivially bypassed via browser console or crafted request.

### 4.3 Data Integrity Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Non-atomic multi-step writes | **Critical** | Invoice create: INSERT invoice → INSERT items → UPDATE stock. No transaction. Partial failure = orphaned rows. |
| Stock overwrite on concurrent access | **Critical** | Read quantity → compute new → write. No row locking, no `quantity = quantity + delta`. |
| Client-trusted financial totals | **High** | `invoiceSchema` accepts `total`, `subtotal` from client. Server never recalculates — allows financial manipulation. |
| Adjustments don't adjust stock | **High** | `createAdjustment()` and `approveAdjustment()` create paper records but never touch `items.current_stock` or `item_warehouse_stock.quantity`. |
| Transfers don't transfer stock | **High** | `transferStock()` creates transfer records but never updates source/destination warehouse quantities. |
| Invoice delete without stock reversal | **Medium** | `deleteInvoice()` deletes invoice rows but does not reverse stock movements or ledger entries. |
| Orphaned items on failed update | **Medium** | `updateInvoice()` deletes all items then re-inserts. If re-insert fails, invoice exists with zero items. |
| IGST hardcoded to 0 | **High** | `invoice-calculations.ts` returns `igst: 0` — inter-state GST is completely broken. |
| Unit conversion is a no-op | **Medium** | `calculateBaseQuantity` always returns `Math.round(entryQuantity)` regardless of unit type. |
| Silent stock error swallowing | **Medium** | Stock movement failures during invoice creation are caught/logged but don't fail the operation. |

### 4.4 Type Safety Issues

| Issue | Location |
|-------|----------|
| `invoice_items.quantity` is `integer` in DB but business needs `numeric` for fractional units (2.5 KG) | Database schema |
| Mobile API parameters typed as `any` — no type safety on filters | `inventory-billing-mobile/src/services/api.ts` |
| `updateSerialStatus` accepts arbitrary `status` string — no enum validation | `lib/serial-management.ts` |
| `Record<string, unknown>` casts in stock management bypass type checking | `lib/stock-management.ts` |
| `checkCreditLimit` returns `{ withinLimit: true }` for non-existent customers | `lib/customer-management.ts` |

### 4.5 Race Conditions in Number Generation

All document number generators use count-based logic that will produce **duplicate numbers** under concurrent requests:

- `generateInvoiceNumber()` — `app/invoices/actions.ts`
- `generatePurchaseNumber()` — `app/purchases/actions.ts`
- Transfer number — `lib/warehouse-management.ts`
- Adjustment number — `lib/adjustment-management.ts`

**Fix:** Use PostgreSQL `SEQUENCE` or `INSERT ... RETURNING` with a serial/auto-increment column.

---

## Section 5: Invoice Templates Assessment

| Template | File | Style | Document Type Support |
|----------|------|-------|-----------------------|
| Classic | `components/invoices/templates/classic-template.tsx` | Traditional bordered layout, colored header/footer dividers | ❌ Invoice only (hardcoded "INVOICE" heading) |
| Modern | `components/invoices/templates/modern-template.tsx` | Full-color header band, card-style totals | ✅ Multi-document via `DOCUMENT_TYPE_CONFIG` |
| Minimal | `components/invoices/templates/minimal-template.tsx` | Clean whitespace-heavy design | ✅ Multi-document |

**Common features:** Company logo, GSTIN, PAN, customer details, line items with GST, bank details, custom terms, signature image, A4 print layout.

**Gaps:** Classic template missing paid/balance display, validity date, and DocumentType differentiation. No thermal receipt layout.

---

## Section 6: Mobile App Assessment

### React Native (Expo) App

| Component | Status | Notes |
|-----------|--------|-------|
| Auth flow | ✅ Present | AuthContext + AuthNavigator |
| Navigation | ✅ Present | Tab + Stack navigation with typed routes |
| API service | ⚠️ Weak typing | Generic CRUD wrapper with `any` parameters |
| Offline storage | ⚠️ Infrastructure only | SQLite tables + sync queue exist but **no sync executor** |
| Screen coverage | ✅ Good breadth | Dashboard, invoices, customers, items, purchases, suppliers, payments, inventory, settings, reports, users, accounting |
| Background sync | ❌ Missing | No NetInfo listener, no periodic sync, no queue processor |
| Conflict resolution | ❌ Missing | No strategy (last-write-wins, merge, etc.) |

**Verdict:** The mobile app has the right architecture but offline sync — the headline feature for low-connectivity areas — is completely unimplemented. Data saved offline will never reach the server.

---

## Section 7: Deliverables

### 7.1 The "Critical Fix" List — Top 5 Issues That Will Break Production

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| **1** | **Enable RLS on all 14 unprotected tables + add `org_id` filters to all server actions** | Without this, User A from Org 1 sees User B from Org 2's invoices, customers, items, and payments. This is a **data breach on day one** with multiple tenants. | 2-3 days |
| **2** | **Wrap all multi-step writes in database transactions** (invoice create/update/delete, stock movements, journal posting) | If network drops during invoice creation after inserting the invoice but before inserting items, you get an empty invoice with a paid/unpaid status but zero line items. Stock ledger entries can exist without corresponding stock updates. | 3-5 days |
| **3** | **Make stock updates atomic** — replace read-then-write with SQL `SET quantity = quantity + $1` or use `SELECT ... FOR UPDATE` row locking | Two cashiers processing sales of the same item at the same time will both read stock=100, both subtract 5, both write 95. One sale's deduction is lost. Over months, stock drifts from reality. | 2-3 days |
| **4** | **Enforce server-side permissions** — add authorization middleware to all server actions checking `user_roles.permissions` | Any authenticated user (even a "viewer" role) can call `deleteAllInvoices()`, `deleteAllPurchases()`, or any destructive operation. The permission system is decoration-only. | 2-3 days |
| **5** | **Recalculate invoice totals server-side** — never trust `total`, `subtotal`, tax amounts from client input | A crafted request with `total: 0` on a ₹50,000 order will be accepted. The Zod schema validates fields exist but doesn't verify mathematical correctness. | 1-2 days |

### 7.2 "Missing Features" Roadmap

#### Must-Have (P0 — Before Launch)

| # | Feature | Context |
|---|---------|---------|
| 1 | Fix IGST calculation | Inter-state GST is zero for all transactions |
| 2 | Make stock adjustments actually modify stock quantities | `createAdjustment`/`approveAdjustment` are no-ops |
| 3 | Make stock transfers actually move warehouse quantities | `transferStock` is cosmetic |
| 4 | Server-side pagination for items, invoices, customers | Currently fetching all rows into client memory |
| 5 | Invoice number generation using DB sequences | Prevent duplicates under concurrent requests |
| 6 | `invoice_items.quantity` → `numeric(12,3)` | Enable fractional quantities (2.5 KG, 0.75 MTR) |
| 7 | Credit limit enforcement at invoice creation | Currently never checked during create flow |
| 8 | Invoice rounding off (round to nearest rupee) | Vyapar/Tally standard behavior |
| 9 | Negative stock prevention (block sale if insufficient) | Currently silently clamps to 0 |
| 10 | Customer outstanding balance maintenance | Update `customers.outstanding_balance` on invoice/payment CRUD |

#### Should-Have (P1 — Within 30 Days of Launch)

| # | Feature |
|---|---------|
| 1 | Aging analysis with real calculations (not stubs) |
| 2 | P&L and Balance Sheet connected to real ledger data |
| 3 | Journal entry creation from payments (double-entry integration) |
| 4 | Thermal receipt printing (2-inch/3-inch layout support) |
| 5 | Back-dated entry support with stock recalculation |
| 6 | WhatsApp invoice sharing |
| 7 | RCM (Reverse Charge Mechanism) support |
| 8 | Multi-payment splitting on single invoice |
| 9 | Barcode scan-to-add in invoice form |
| 10 | Stock-take / Physical inventory counting workflow |

#### Nice-to-Have (P2)

| # | Feature |
|---|---------|
| 1 | Multi-currency support |
| 2 | Recurring invoices |
| 3 | TDS/TCS deduction |
| 4 | Purchase Order → GRN → Bill workflow |
| 5 | Bill of Materials / Composite items |
| 6 | Multiple GSTIN per business |
| 7 | Financial year close and lock-down |
| 8 | Party-wise price lists with auto-application |
| 9 | Mobile offline sync executor (queue → server push) |
| 10 | Automated GST filing (JSON export for GSTR-1/3B) |

### 7.3 UX Modernization Plan

| Change | Priority | Specific Action |
|--------|----------|-----------------|
| **Remove zoom-lock** | Immediate | Delete `userScalable: false` and `maximumScale: 1` from `app/layout.tsx` |
| **Restore focus rings** | Immediate | Change `focus-visible:ring-0` to `focus-visible:ring-2 focus-visible:ring-ring` in `components/ui/button.tsx` |
| **Add skip-link** | High | Add `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>` before sidebar in `layout.tsx` |
| **Enlarge touch targets** | High | Change all `size="icon"` instances to minimum `h-11 w-11` (44px / 2.75rem) |
| **Add mobile card views** | High | Create `CustomerMobileCard` and `InvoiceMobileCard` with `md:hidden`/`hidden md:table-row` pattern |
| **Convert px → rem** | Medium | Replace all `min-w-[120px]`, `w-[250px]` etc. with rem equivalents |
| **Add virtualization** | Medium | Install `@tanstack/react-virtual` for table bodies when dataset > 500 rows |
| **Server-side search** | Medium | Move items/invoices filtering to Supabase `.ilike()` queries with `LIMIT` pagination |
| **Add `error.tsx` boundaries** | Medium | Create `error.tsx` files alongside existing `loading.tsx` files |
| **Debounce search inputs** | Low | Add 300ms debounce to filter change handlers |
| **Use design tokens** | Low | Replace hardcoded `50` in items-content with `PAGINATION.defaultPageSize` from `design-tokens.ts` |

### 7.4 Edge Case Checklist — 10 Business Scenarios BusinessOS Cannot Handle

| # | Scenario | Why It Fails |
|---|----------|-------------|
| **1** | Two cashiers sell the last 3 units of an item simultaneously | Both read stock=3, both sell 3, both write stock=0. Only 3 units existed but 6 were sold. No locking, no negative-stock check. |
| **2** | Business owner creates an invoice for ₹80,000 to a customer with ₹50,000 credit limit | `checkCreditLimit` isn't called during invoice creation. Credit limit is never enforced. |
| **3** | A customer dispute requires a back-dated credit note from 3 months ago | Stock ledger entries use `now()`. No mechanism to recalculate stock state as-of a historical date. Backdating would create incorrect `quantity_before`/`quantity_after` values. |
| **4** | A sale of 2.5 KG of rice at ₹60/KG | `invoice_items.quantity` is `integer`. The system will round to 2 or 3 KG. Fractional quantities are impossible. |
| **5** | An inter-state sale from Maharashtra to Gujarat | IGST is hardcoded to `0`. The invoice will show zero IGST, incorrect GST compliance, and wrong totals. |
| **6** | Stock adjustment: physical count reveals 50 units but system shows 45 | `createAdjustment()` creates a record but never updates `items.current_stock`. The adjustment is purely paper — stock stays at 45. |
| **7** | Transfer 100 units from Warehouse A to Warehouse B | `transferStock()` creates transfer records but never updates `item_warehouse_stock.quantity` on either warehouse. Both still show original quantities. |
| **8** | 2nd tenant signs up — Org B sees Org A's invoices | `invoices`, `items`, `customers`, `payments` have RLS **disabled**. Server actions have no `organization_id` filter. Full cross-tenant data exposure. |
| **9** | Salesperson role user calls `deleteAllInvoices()` via browser console | No server-side permission check exists. The `"use server"` action executes unconditionally. All organization invoices deleted. |
| **10** | Power outage during invoice save — invoice created but items not inserted | No database transaction wraps the multi-step insert. Invoice exists with `status: "unpaid"` but zero line items. Stock was never decremented, creating phantom inventory. |

---

## Cross-Cutting Findings Summary

| Category | Severity | Finding |
|----------|----------|---------|
| Multi-Tenant Data Isolation | **Critical** | 14/34 tables have RLS disabled. Server actions have no org filter. |
| No Server-Side Auth Enforcement | **Critical** | `permissions.ts` is client-side only. Any authenticated user can call destructive actions. |
| Non-Atomic Multi-Step Writes | **Critical** | Invoice/purchase create and update use separate INSERT/DELETE without transactions. |
| Race Conditions in Stock | **High** | Read-then-write pattern causes lost updates under concurrency. |
| Race Conditions in Number Generation | **High** | All document number generators use count-based logic producing duplicates. |
| Client-Trusted Totals | **High** | Invoice/purchase totals accepted from client without server recalculation. |
| Stock Adjustments Are No-Ops | **High** | Records created but stock quantities never modified. |
| Stock Transfers Are No-Ops | **High** | Transfer records created but warehouse quantities unchanged. |
| IGST Hardcoded to 0 | **High** | Inter-state GST completely broken. |
| Accounting Pages Show Dummy Data | **High** | P&L, Balance Sheet, Aging Analysis display hardcoded numbers. |
| Unit Conversion Is a No-Op | **Medium** | `calculateBaseQuantity` ignores conversion rate. |
| Silent Error Swallowing | **Medium** | Stock failures during invoice creation are caught but operation succeeds. |
| Mobile Offline Sync Unimplemented | **Medium** | Queue infrastructure exists but no executor. |
| Settings Not Multi-Tenant | **Medium** | Single-row `settings` table with no `organization_id`. |

---

## Appendix: Market-Ready Feature Checklist (20 Features)

| # | Feature | Status |
|---|---------|--------|
| 1 | Multi-Warehouse Support | ✅ Present |
| 2 | Stock Ledger (Audit Trail) | ⚠️ Present but non-atomic |
| 3 | Batch & Expiry Management | ⚠️ Schema only, not integrated |
| 4 | Multi-Unit Conversion | ❌ Broken (no-op) |
| 5 | Low Stock Alerts | ✅ Basic (no push notifications) |
| 6 | Professional GST Invoicing | ✅ CGST/SGST; ❌ IGST broken |
| 7 | E-Way Bill Integration | ✅ Present |
| 8 | Proforma & Quotations | ✅ Present with conversion flow |
| 9 | Multi-Payment Modes (split) | ❌ Missing |
| 10 | Thermal & Regular Printing | ❌ A4 only |
| 11 | Party Ledger Statements | ⚠️ Basic query, no running balance |
| 12 | Aging Analysis | ❌ Stub (hardcoded ₹0) |
| 13 | Credit Limits | ❌ Schema present, never enforced |
| 14 | Payment Reminders | ❌ Missing |
| 15 | Profit & Loss | ❌ Dummy data |
| 16 | Balance Sheet | ❌ Dummy data |
| 17 | Expense Management | ⚠️ Page exists, no dedicated table |
| 18 | Day Book | ⚠️ Page exists |
| 19 | User Role Management | ⚠️ Client-side only, not enforced |
| 20 | Offline-First Sync | ❌ Queue exists, no executor |

**Score: 5 of 20 fully implemented, 8 partially implemented, 7 missing or broken.**

---

*End of Audit Report*
