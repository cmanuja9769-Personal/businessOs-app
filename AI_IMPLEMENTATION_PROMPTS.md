# AI Implementation Prompts - Complete Guide

This document contains detailed, copy-paste ready AI prompts for implementing each pending feature in the inventory-billing-app.

---

## 📋 TABLE OF CONTENTS

### Frontend Features
1. [Authentication & User Management](#1-authentication--user-management)
2. [Advanced Stock Management](#2-advanced-stock-management)
3. [Financial Accounting Module](#3-financial-accounting-module)
4. [Customer/Supplier Enhancements](#4-customersupplier-enhancements)
5. [Multi-Firm/Multi-Tenant](#5-multi-firmmulti-tenant)
6. [Additional Transaction Features](#6-additional-transaction-features)
7. [Document Features](#7-document-features)
8. [Reports Enhancements](#8-reports-enhancements)
9. [Utilities](#9-utilities)

### Backend Features
10. [E-Invoice IRP Integration](#10-e-invoice-irp-integration-backend)
11. [GST Portal Integration](#11-gst-portal-integration-backend)
12. [Communication Services](#12-communication-services-backend)
13. [Scheduled Jobs](#13-scheduled-jobs-backend)

---

## FRONTEND IMPLEMENTATION PROMPTS

---

## 1. Authentication & User Management

### Prompt:

\`\`\`
I need to implement a complete authentication system in my Next.js 16 + Supabase inventory-billing app.

**CONTEXT:**
- Currently using Next.js 16 with App Router (app/)
- Database: Supabase PostgreSQL
- UI: Radix UI components (already in components/ui/)
- Form validation: React Hook Form + Zod
- Current structure has no authentication - the app is completely open

**REQUIREMENTS:**

1. **User Authentication:**
   - Sign up with email/password
   - Login with email/password
   - Logout functionality
   - Password reset/forgot password flow
   - Email verification
   - Session management

2. **Role-Based Access Control (RBAC):**
   - Roles: Admin, Salesperson, Accountant, Viewer
   - Permissions per role:
     - Admin: Full access to everything
     - Salesperson: Create/edit invoices, view customers/items, no financial reports
     - Accountant: Full access to reports, expenses, payments, readonly on invoices
     - Viewer: Readonly access only
   
3. **Database Schema:**
   \`\`\`sql
   CREATE TABLE user_roles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('admin', 'salesperson', 'accountant', 'viewer')),
     permissions JSONB DEFAULT '{
       "invoices": {"create": true, "read": true, "update": true, "delete": false},
       "purchases": {"create": true, "read": true, "update": true, "delete": false},
       "customers": {"create": true, "read": true, "update": true, "delete": false},
       "items": {"create": true, "read": true, "update": true, "delete": false},
       "reports": {"read": true},
       "settings": {"read": false, "update": false}
     }'::jsonb,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, organization_id)
   );

   CREATE TABLE activity_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     organization_id UUID REFERENCES organizations(id),
     action TEXT NOT NULL,
     resource_type TEXT NOT NULL,
     resource_id UUID,
     details JSONB,
     ip_address TEXT,
     user_agent TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   \`\`\`

4. **Files to Create:**
   - `app/auth/login/page.tsx` - Login page
   - `app/auth/signup/page.tsx` - Signup page
   - `app/auth/forgot-password/page.tsx` - Password reset
   - `app/auth/verify-email/page.tsx` - Email verification
   - `components/auth/login-form.tsx` - Login form component
   - `components/auth/signup-form.tsx` - Signup form component
   - `components/auth/protected-route.tsx` - Route protection wrapper
   - `components/auth/user-menu.tsx` - User dropdown in header
   - `lib/auth.ts` - Auth utilities
   - `lib/permissions.ts` - Permission checking utilities
   - `hooks/use-auth.ts` - Auth hook
   - `hooks/use-permissions.ts` - Permissions hook
   - `middleware.ts` - Route protection middleware
   - `app/auth/actions.ts` - Server actions for auth

5. **Existing Files to Modify:**
   - `components/header.tsx` - Add user menu
   - `app/layout.tsx` - Add auth provider
   - All page.tsx files - Add permission checks

6. **UI/UX Requirements:**
   - Login page: Clean, centered form with logo
   - Error messages for invalid credentials
   - Loading states during authentication
   - Remember me checkbox
   - Social login buttons (Google, Microsoft) - optional
   - Redirect to dashboard after login
   - Redirect to login if not authenticated
   - Show user name and avatar in header
   - User dropdown: Profile, Settings, Logout

7. **Supabase Setup:**
   \`\`\`typescript
   // Enable email auth in Supabase dashboard
   // Configure email templates
   // Set up redirect URLs
   \`\`\`

8. **Permission Checking Example:**
   \`\`\`typescript
   // In any component
   const { hasPermission } = usePermissions();
   
   if (hasPermission('invoices', 'create')) {
     // Show create button
   }
   \`\`\`

9. **Activity Logging:**
   - Log all create/update/delete actions
   - Log login/logout events
   - Store user IP and user agent
   - Display activity log in admin panel

10. **Security Requirements:**
    - Hash passwords (handled by Supabase)
    - Secure session tokens
    - HTTP-only cookies
    - CSRF protection
    - Rate limiting on login attempts

**DELIVERABLES:**
1. Complete authentication flow working
2. All files created and integrated
3. Middleware protecting routes
4. Permission system working
5. Activity logs being recorded
6. User management UI (list users, edit roles)

**CONSTRAINTS:**
- Use existing UI components from components/ui/
- Follow existing code patterns in the app
- Use Supabase Auth (don't build custom auth)
- Mobile responsive
- Accessible (ARIA labels)

Please implement this step by step, starting with the database schema, then auth utilities, then UI components, then integration.
\`\`\`

---

## 2. Advanced Stock Management

### Prompt:

\`\`\`
I need to implement advanced stock management features in my Next.js inventory-billing app including batch tracking, serial number tracking, expiry management, and stock adjustments.

**CONTEXT:**
- Existing app: Next.js 16 + Supabase
- Current stock tracking: Basic stock quantity in items table
- Location: app/items/ and components/items/
- Database: items table exists with basic fields

**REQUIREMENTS:**

### A. BATCH TRACKING

**Use Case:** Track items by batch number (e.g., medicines, food products)

**Features:**
1. Enable batch tracking per item (toggle in item form)
2. Create batches when receiving stock (purchase)
3. Select batch when selling (FIFO by default)
4. Track batch-wise stock quantity
5. Batch expiry date tracking
6. Manufacturing date tracking
7. Batch-wise reports

**Database Schema:**
\`\`\`sql
-- Add to items table
ALTER TABLE items ADD COLUMN batch_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN track_expiry BOOLEAN DEFAULT FALSE;

-- Batch table
CREATE TABLE item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  purchase_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL DEFAULT 0,
  purchase_id UUID REFERENCES purchases(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, batch_number, organization_id)
);

CREATE INDEX idx_item_batches_item_id ON item_batches(item_id);
CREATE INDEX idx_item_batches_expiry ON item_batches(expiry_date);
CREATE INDEX idx_item_batches_remaining ON item_batches(remaining_quantity) WHERE remaining_quantity > 0;
\`\`\`

**Files to Create:**
- `app/inventory/batches/page.tsx` - List all batches
- `app/inventory/batches/[id]/page.tsx` - Batch details
- `components/inventory/batch-form.tsx` - Create/edit batch
- `components/inventory/batch-selector.tsx` - Select batch in invoice
- `components/inventory/expiry-alerts.tsx` - Dashboard widget for expiring items
- `app/inventory/actions.ts` - Server actions for batches
- `lib/batch-fifo.ts` - FIFO logic for batch selection

**UI Requirements:**
1. Item form: Add "Enable Batch Tracking" checkbox
2. Purchase form: When batch enabled, show batch fields
3. Invoice form: When batch enabled, show batch selector dropdown
4. Batch list page: Table with batch no, item name, qty, expiry date, status
5. Expiry alerts: Show items expiring in 30/60/90 days
6. Color coding: Red (expired), Orange (expiring < 30 days), Green (fresh)

**Batch Selection Logic (FIFO):**
\`\`\`typescript
// When creating invoice, auto-select batch with earliest expiry date
function selectBatchFIFO(itemId: string, requiredQty: number) {
  // 1. Get all batches for item with qty > 0
  // 2. Sort by expiry_date ASC
  // 3. Take from first batch
  // 4. If not enough, take from next batch
  // 5. Return array of {batchId, quantity}
}
\`\`\`

### B. SERIAL NUMBER TRACKING

**Use Case:** Track individual units by unique serial (e.g., electronics, vehicles)

**Features:**
1. Enable serial tracking per item
2. Enter serial numbers when receiving stock
3. Select serial number when selling
4. Track serial status (in_stock, sold, returned, damaged)
5. Warranty tracking per serial
6. Serial number search

**Database Schema:**
\`\`\`sql
ALTER TABLE items ADD COLUMN serial_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE item_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  batch_id UUID REFERENCES item_batches(id),
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'damaged', 'warranty')),
  purchase_date DATE,
  purchase_id UUID REFERENCES purchases(id),
  sale_date DATE,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  warranty_months INTEGER DEFAULT 0,
  warranty_expiry DATE,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(serial_number, organization_id)
);

CREATE INDEX idx_item_serials_item_id ON item_serials(item_id);
CREATE INDEX idx_item_serials_serial ON item_serials(serial_number);
CREATE INDEX idx_item_serials_status ON item_serials(status);
\`\`\`

**Files to Create:**
- `app/inventory/serials/page.tsx` - List all serials
- `app/inventory/serials/[id]/page.tsx` - Serial details
- `components/inventory/serial-form.tsx` - Enter serial numbers
- `components/inventory/serial-selector.tsx` - Select serial in invoice
- `components/inventory/serial-scanner.tsx` - Barcode scan for serials

**UI Requirements:**
1. Item form: Add "Enable Serial Tracking" checkbox
2. Purchase form: Modal to enter multiple serial numbers
3. Invoice form: Dropdown to select available serials
4. Serial list: Table with serial, item, status, customer (if sold)
5. Serial search: Global search bar
6. Warranty status: Show expiry date, days remaining

### C. EXPIRY DATE MANAGEMENT

**Features:**
1. Track manufacturing and expiry dates (in batches)
2. Dashboard alerts for expiring items
3. Block selling of expired items
4. Expiry report

**Files to Create:**
- `app/inventory/expiring/page.tsx` - Items expiring soon
- `components/dashboard/expiry-alerts-widget.tsx`
- Alert notifications when trying to sell expired batch

**Validation Logic:**
\`\`\`typescript
// When selecting batch in invoice
if (batch.expiry_date < new Date()) {
  throw new Error('Cannot sell expired batch');
}
\`\`\`

### D. STOCK ADJUSTMENTS

**Use Case:** Manually adjust stock for damage, theft, found items

**Features:**
1. Create stock adjustment entries
2. Adjustment types: Increase, Decrease
3. Adjustment reasons: Damage, Theft, Found, Correction, Opening Balance
4. Approval workflow (optional)
5. Adjustment history

**Database Schema:**
\`\`\`sql
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_no TEXT NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('damage', 'theft', 'found', 'correction', 'opening_balance', 'expired', 'other')),
  notes TEXT,
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  organization_id UUID REFERENCES organizations(id)
);
\`\`\`

**Files to Create:**
- `app/inventory/adjustments/page.tsx` - List adjustments
- `app/inventory/adjustments/new/page.tsx` - Create adjustment
- `components/inventory/stock-adjustment-form.tsx`
- `app/inventory/adjustments/actions.ts`

**UI Requirements:**
1. Adjustment form: Item selector, quantity, reason, notes
2. Adjustment list: Table with date, item, qty, reason, status
3. Approval buttons for admins
4. Color coding: Green (increase), Red (decrease)

### E. STOCK MOVEMENT HISTORY (AUDIT TRAIL)

**Features:**
1. Log every stock change automatically
2. Track who, when, why
3. Show before/after quantities
4. Filterable by item, date, user

**Database Schema:**
\`\`\`sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  serial_id UUID REFERENCES item_serials(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return')),
  reference_type TEXT, -- 'invoice', 'purchase', 'adjustment'
  reference_id UUID,
  reference_no TEXT, -- Invoice no, Purchase no, etc.
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  rate DECIMAL(10,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id)
);

CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at DESC);
\`\`\`

**Files to Create:**
- `app/inventory/movements/page.tsx` - Stock movement history
- `components/inventory/movement-log.tsx` - Show movements for an item

**Trigger to Auto-Log Movements:**
\`\`\`sql
-- Create trigger function
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_movements (
    item_id,
    movement_type,
    quantity_before,
    quantity_change,
    quantity_after,
    reference_type,
    reference_id,
    created_by,
    organization_id
  ) VALUES (
    NEW.item_id,
    'adjustment',
    OLD.current_stock,
    NEW.current_stock - OLD.current_stock,
    NEW.current_stock,
    'stock_adjustment',
    NEW.id,
    NEW.adjusted_by,
    NEW.organization_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to items table
CREATE TRIGGER stock_change_trigger
AFTER UPDATE OF current_stock ON items
FOR EACH ROW
WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
EXECUTE FUNCTION log_stock_movement();
\`\`\`

### F. MULTI-WAREHOUSE SUPPORT

**Features:**
1. Create multiple warehouses/locations
2. Track stock per warehouse
3. Stock transfer between warehouses

**Database Schema:**
\`\`\`sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, organization_id)
);

CREATE TABLE warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, warehouse_id, batch_id, organization_id)
);

CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no TEXT NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  batch_id UUID REFERENCES item_batches(id),
  quantity INTEGER NOT NULL,
  received_quantity INTEGER DEFAULT 0
);
\`\`\`

**Files to Create:**
- `app/warehouses/page.tsx` - List warehouses
- `app/warehouses/[id]/page.tsx` - Warehouse details with stock
- `components/warehouses/warehouse-form.tsx`
- `app/inventory/transfers/page.tsx` - Stock transfers
- `app/inventory/transfers/new/page.tsx` - Create transfer
- `components/inventory/stock-transfer-form.tsx`

**INTEGRATION POINTS:**
1. Update invoice creation to deduct from specific warehouse
2. Update purchase creation to add to specific warehouse
3. Show warehouse-wise stock in reports

**DELIVERABLES:**
1. All database migrations
2. All files created
3. Batch tracking working end-to-end
4. Serial tracking working end-to-end
5. Stock adjustments functional
6. Movement history logging automatically
7. Expiry alerts on dashboard
8. Warehouse management (if time permits)

Please implement in this order:
1. Database schema
2. Stock movements logging (foundation)
3. Batch tracking
4. Serial tracking
5. Stock adjustments
6. Expiry alerts
7. Warehouse management

Use existing patterns from app/items/ and app/invoices/.
\`\`\`

---

## 3. Financial Accounting Module

### Prompt:

\`\`\`
I need to implement a complete financial accounting module with double-entry bookkeeping in my Next.js inventory-billing app.

**CONTEXT:**
- Current app: Next.js 16 + Supabase
- Existing: Invoices, Purchases, Payments (basic)
- Missing: General Ledger, Chart of Accounts, Journal Entries, Financial Reports

**REQUIREMENTS:**

### A. CHART OF ACCOUNTS (CoA)

**Features:**
1. Hierarchical account structure
2. Account types: Asset, Liability, Equity, Income, Expense
3. System accounts (non-deletable): Cash, Bank, Sales, Purchase, etc.
4. Custom accounts (user-created)
5. Account codes (e.g., 1000-Assets, 2000-Liabilities)

**Database Schema:**
\`\`\`sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_account_id UUID REFERENCES accounts(id),
  level INTEGER NOT NULL DEFAULT 1,
  is_system_account BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  debit_balance DECIMAL(12,2) DEFAULT 0,
  credit_balance DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_code, organization_id)
);

CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);
\`\`\`

**Seed Default Accounts:**
\`\`\`sql
INSERT INTO accounts (account_code, account_name, account_type, is_system_account) VALUES
-- Assets (1000-1999)
('1000', 'Assets', 'asset', true),
('1100', 'Current Assets', 'asset', true),
('1110', 'Cash in Hand', 'asset', true),
('1120', 'Bank Accounts', 'asset', true),
('1130', 'Accounts Receivable', 'asset', true),
('1140', 'Inventory', 'asset', true),
('1200', 'Fixed Assets', 'asset', true),

-- Liabilities (2000-2999)
('2000', 'Liabilities', 'liability', true),
('2100', 'Current Liabilities', 'liability', true),
('2110', 'Accounts Payable', 'liability', true),
('2120', 'GST Payable', 'liability', true),

-- Equity (3000-3999)
('3000', 'Equity', 'equity', true),
('3100', 'Owner Equity', 'equity', true),
('3200', 'Retained Earnings', 'equity', true),

-- Income (4000-4999)
('4000', 'Income', 'income', true),
('4100', 'Sales Revenue', 'income', true),
('4200', 'Other Income', 'income', true),

-- Expenses (5000-5999)
('5000', 'Expenses', 'expense', true),
('5100', 'Cost of Goods Sold', 'expense', true),
('5200', 'Operating Expenses', 'expense', true),
('5210', 'Rent', 'expense', true),
('5220', 'Salaries', 'expense', true),
('5230', 'Utilities', 'expense', true),
('5240', 'Office Supplies', 'expense', true);
\`\`\`

**Files to Create:**
- `app/accounting/accounts/page.tsx` - List CoA
- `app/accounting/accounts/[id]/page.tsx` - Account details/ledger
- `components/accounting/account-form.tsx`
- `components/accounting/account-tree.tsx` - Hierarchical tree view
- `app/accounting/accounts/actions.ts`

**UI Requirements:**
1. Tree view of accounts with expand/collapse
2. Show balance next to each account
3. Color coding by type (Assets=Blue, Liabilities=Red, etc.)
4. Add child account button
5. Edit/Delete (only non-system accounts)

### B. JOURNAL ENTRIES

**Features:**
1. Manual journal entries
2. Auto-generated entries from invoices/purchases
3. Debit = Credit validation
4. Entry types: Journal, Payment, Receipt, Contra, Sales, Purchase
5. Posting (draft → posted)
6. Reverse entry functionality

**Database Schema:**
\`\`\`sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT CHECK (entry_type IN ('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase')),
  reference_type TEXT, -- 'invoice', 'purchase', 'payment', 'manual'
  reference_id UUID,
  reference_no TEXT,
  description TEXT,
  total_debit DECIMAL(12,2) NOT NULL,
  total_credit DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_debit_credit CHECK (total_debit = total_credit)
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  line_order INTEGER,
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_type ON journal_entries(entry_type);
\`\`\`

**Auto-Generate Journal Entries:**

**Example 1: When Invoice is Created**
\`\`\`
Debit: Accounts Receivable (Customer)  1000
  Credit: Sales Revenue                     800
  Credit: CGST Payable                       90
  Credit: SGST Payable                       90
  Credit: IGST Payable                       20
\`\`\`

**Example 2: When Payment is Received**
\`\`\`
Debit: Bank Account                      1000
  Credit: Accounts Receivable (Customer)     1000
\`\`\`

**Example 3: When Purchase is Created**
\`\`\`
Debit: Inventory                          800
Debit: Input CGST                          90
Debit: Input SGST                          90
  Credit: Accounts Payable (Supplier)        980
\`\`\`

**Files to Create:**
- `app/accounting/journal/page.tsx` - List entries
- `app/accounting/journal/new/page.tsx` - Create manual entry
- `app/accounting/journal/[id]/page.tsx` - View entry
- `components/accounting/journal-entry-form.tsx`
- `components/accounting/journal-entry-lines.tsx`
- `app/accounting/journal/actions.ts`
- `lib/journal-generator.ts` - Auto-generate logic

**Trigger Functions:**
\`\`\`typescript
// In app/invoices/actions.ts - After creating invoice
async function createInvoice(formData) {
  // ... create invoice
  
  // Generate journal entry
  await createJournalEntry({
    entry_type: 'sales',
    reference_type: 'invoice',
    reference_id: invoice.id,
    reference_no: invoice.invoiceNo,
    lines: [
      { account: 'Accounts Receivable', debit: total },
      { account: 'Sales Revenue', credit: subtotal },
      { account: 'CGST Payable', credit: cgst },
      { account: 'SGST Payable', credit: sgst },
    ]
  });
}
\`\`\`

### C. GENERAL LEDGER

**Features:**
1. Show all transactions for an account
2. Running balance
3. Filter by date range
4. Drill-down to source document

**Files to Create:**
- `app/accounting/ledger/page.tsx` - Account selector + ledger
- `app/accounting/ledger/[accountId]/page.tsx` - Specific account ledger
- `components/accounting/ledger-table.tsx`

**Query:**
\`\`\`sql
SELECT 
  je.entry_date,
  je.entry_no,
  je.description,
  jel.debit_amount,
  jel.credit_amount,
  SUM(jel.debit_amount - jel.credit_amount) OVER (ORDER BY je.entry_date, je.id) as running_balance
FROM journal_entry_lines jel
JOIN journal_entries je ON je.id = jel.entry_id
WHERE jel.account_id = $1
  AND je.status = 'posted'
ORDER BY je.entry_date DESC;
\`\`\`

### D. TRIAL BALANCE

**Features:**
1. Show all accounts with debit/credit totals
2. Verify debits = credits
3. Export to Excel

**Files to Create:**
- `app/accounting/trial-balance/page.tsx`

**Query:**
\`\`\`sql
SELECT 
  a.account_code,
  a.account_name,
  a.account_type,
  SUM(jel.debit_amount) as total_debit,
  SUM(jel.credit_amount) as total_credit,
  SUM(jel.debit_amount) - SUM(jel.credit_amount) as balance
FROM accounts a
LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jel.entry_id
WHERE je.status = 'posted'
  AND je.entry_date BETWEEN $1 AND $2
GROUP BY a.id, a.account_code, a.account_name, a.account_type
ORDER BY a.account_code;
\`\`\`

### E. PROFIT & LOSS STATEMENT

**Features:**
1. Income - Expenses = Net Profit
2. Date range selector
3. Breakdown by category
4. Comparison (This month vs last month)

**Files to Create:**
- `app/accounting/profit-loss/page.tsx`

**Calculation:**
\`\`\`
Revenue:
  Sales Revenue                 100,000
  Other Income                    5,000
  Total Revenue                 105,000

Cost of Goods Sold:
  Purchases                      40,000
  Total COGS                     40,000

Gross Profit                     65,000

Operating Expenses:
  Rent                            5,000
  Salaries                       20,000
  Utilities                       2,000
  Total Operating Expenses       27,000

Net Profit Before Tax            38,000
\`\`\`

### F. BALANCE SHEET

**Features:**
1. Assets = Liabilities + Equity
2. As on date selector
3. Current vs Non-current classification

**Files to Create:**
- `app/accounting/balance-sheet/page.tsx`

**Format:**
\`\`\`
ASSETS
Current Assets:
  Cash in Hand                   10,000
  Bank Accounts                  50,000
  Accounts Receivable            30,000
  Inventory                      40,000
  Total Current Assets          130,000

Fixed Assets:
  Furniture                      20,000
  Total Fixed Assets             20,000

TOTAL ASSETS                    150,000

LIABILITIES
Current Liabilities:
  Accounts Payable               25,000
  GST Payable                    15,000
  Total Current Liabilities      40,000

EQUITY
  Owner Equity                   50,000
  Retained Earnings              60,000
  Total Equity                  110,000

TOTAL LIABILITIES + EQUITY      150,000
\`\`\`

### G. CASH FLOW STATEMENT

**Features:**
1. Operating, Investing, Financing activities
2. Net cash flow

**Files to Create:**
- `app/accounting/cash-flow/page.tsx`

### H. DAY BOOK

**Features:**
1. Daily transaction summary
2. All entries for a day

**Files to Create:**
- `app/accounting/daybook/page.tsx`

**INTEGRATION:**
- Modify `app/invoices/actions.ts` to auto-generate journal entries
- Modify `app/purchases/actions.ts` to auto-generate journal entries
- Modify `app/payments/actions.ts` to auto-generate journal entries

**DELIVERABLES:**
1. Complete Chart of Accounts
2. Journal entry system working
3. Auto-generation from invoices/purchases/payments
4. General Ledger functional
5. Trial Balance report
6. P&L Statement
7. Balance Sheet
8. Cash Flow Statement
9. Day Book

Implement in this order:
1. Chart of Accounts + seed data
2. Journal entry tables
3. Manual journal entry form
4. Auto-generate logic
5. General Ledger view
6. Trial Balance
7. Financial reports

Use existing patterns from the app. Follow double-entry accounting principles strictly.
\`\`\`

---

## 4. Customer/Supplier Enhancements

### Prompt:

\`\`\`
I need to enhance the customer and supplier management system with credit limits, customer groups, detailed statements, and aging analysis.

**CONTEXT:**
- Existing: app/customers/ and app/suppliers/ with basic CRUD
- Database: customers and suppliers tables exist
- Need: Advanced features for better CRM/SRM

**REQUIREMENTS:**

### A. CREDIT LIMIT MANAGEMENT

**Features:**
1. Set credit limit per customer
2. Set credit days (payment terms)
3. Warn when creating invoice if limit exceeded
4. Show outstanding vs credit limit

**Database Changes:**
\`\`\`sql
ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_days INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN outstanding_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN total_sales DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN total_purchases DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_transaction_date DATE;
\`\`\`

**Files to Modify:**
- `components/customers/customer-form.tsx` - Add credit limit fields
- `app/invoices/new/page.tsx` - Add credit limit check

**Credit Limit Check:**
\`\`\`typescript
// When creating invoice
const customer = await getCustomer(customerId);
const newOutstanding = customer.outstanding_balance + invoiceTotal;

if (newOutstanding > customer.credit_limit) {
  // Show warning dialog
  return {
    warning: `Credit limit exceeded! Limit: ${customer.credit_limit}, New Outstanding: ${newOutstanding}`
  };
}
\`\`\`

### B. CUSTOMER GROUPS/CATEGORIES

**Features:**
1. Create customer groups (Retailers, Wholesalers, VIP, etc.)
2. Assign discount % to group
3. Auto-apply discount in invoices

**Database Schema:**
\`\`\`sql
CREATE TABLE customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, organization_id)
);

ALTER TABLE customers ADD COLUMN customer_group_id UUID REFERENCES customer_groups(id);
\`\`\`

**Files to Create:**
- `app/customers/groups/page.tsx` - List groups
- `app/customers/groups/new/page.tsx` - Create group
- `components/customers/customer-group-form.tsx`
- `components/customers/group-selector.tsx`

**Auto-Apply Group Discount:**
\`\`\`typescript
// In invoice form, when customer selected
if (customer.customer_group_id) {
  const group = await getCustomerGroup(customer.customer_group_id);
  // Apply group.discount_percentage to invoice
}
\`\`\`

### C. CUSTOMER STATEMENT (LEDGER)

**Features:**
1. Show all transactions for a customer
2. Invoices, payments, returns
3. Running balance
4. Date range filter
5. Export to PDF/Excel

**Database View:**
\`\`\`sql
CREATE VIEW customer_transactions AS
SELECT 
  'invoice' as type,
  i.id,
  i.invoice_no as reference_no,
  i.invoice_date as transaction_date,
  i.customer_id,
  i.total as debit,
  0 as credit,
  i.status
FROM invoices i
UNION ALL
SELECT 
  'payment' as type,
  p.id,
  p.payment_no as reference_no,
  p.payment_date as transaction_date,
  p.customer_id,
  0 as debit,
  p.amount as credit,
  p.status
FROM payments p
WHERE p.party_type = 'customer'
ORDER BY transaction_date DESC;
\`\`\`

**Files to Create:**
- `app/customers/[id]/statement/page.tsx` - Customer statement
- `components/customers/customer-statement.tsx`
- `components/customers/statement-pdf.tsx` - PDF export

**UI:**
\`\`\`
Customer Statement: John Doe
Period: 01/01/2024 - 31/12/2024

Date       | Type    | Ref No   | Debit   | Credit  | Balance
-----------|---------|----------|---------|---------|--------
01/01/2024 | Opening |          |         |         | 5,000
05/01/2024 | Invoice | INV-001  | 10,000  |         | 15,000
10/01/2024 | Payment | PAY-001  |         | 5,000   | 10,000
15/01/2024 | Invoice | INV-002  | 8,000   |         | 18,000
-----------|---------|----------|---------|---------|--------
           | Total   |          | 18,000  | 5,000   | 18,000
\`\`\`

### D. OUTSTANDING AGING ANALYSIS

**Features:**
1. Show outstanding invoices
2. Age buckets: 0-30 days, 31-60 days, 61-90 days, >90 days
3. Color coding: Green (current), Orange (30-60), Red (>60)
4. Total outstanding per customer

**Files to Create:**
- `app/customers/aging-analysis/page.tsx`
- `components/customers/aging-analysis.tsx`

**Query:**
\`\`\`sql
SELECT 
  c.id,
  c.name as customer_name,
  SUM(CASE WHEN DATE_PART('day', CURRENT_DATE - i.due_date) <= 0 THEN i.balance_due ELSE 0 END) as current,
  SUM(CASE WHEN DATE_PART('day', CURRENT_DATE - i.due_date) BETWEEN 1 AND 30 THEN i.balance_due ELSE 0 END) as days_1_30,
  SUM(CASE WHEN DATE_PART('day', CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) as days_31_60,
  SUM(CASE WHEN DATE_PART('day', CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) as days_61_90,
  SUM(CASE WHEN DATE_PART('day', CURRENT_DATE - i.due_date) > 90 THEN i.balance_due ELSE 0 END) as days_over_90,
  SUM(i.balance_due) as total_outstanding
FROM customers c
JOIN invoices i ON i.customer_id = c.id
WHERE i.status IN ('pending', 'overdue')
  AND i.balance_due > 0
GROUP BY c.id, c.name
ORDER BY total_outstanding DESC;
\`\`\`

**UI Table:**
\`\`\`
Customer Name | Current | 1-30 Days | 31-60 Days | 61-90 Days | >90 Days | Total
--------------|---------|-----------|------------|------------|----------|-------
John Doe      | 5,000   | 3,000     | 2,000      | 1,000      | 500      | 11,500
Jane Smith    | 8,000   | 0         | 1,000      | 0          | 0        | 9,000
\`\`\`

### E. MULTIPLE ADDRESSES

**Features:**
1. Multiple addresses per customer/supplier
2. Address types: Billing, Shipping, Warehouse, Other
3. Set default address

**Database Schema:**
\`\`\`sql
CREATE TABLE party_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  party_type TEXT CHECK (party_type IN ('customer', 'supplier')),
  address_type TEXT CHECK (address_type IN ('billing', 'shipping', 'warehouse', 'office', 'other')),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, party_type, address_type, is_default) WHERE is_default = TRUE
);
\`\`\`

**Files to Create:**
- `app/customers/[id]/addresses/page.tsx`
- `components/customers/address-form.tsx`
- `components/customers/address-list.tsx`

**Usage in Invoice:**
\`\`\`typescript
// Invoice form: Select shipping address
<AddressSelector 
  customerId={customerId}
  addressType="shipping"
  onSelect={(address) => setShippingAddress(address)}
/>
\`\`\`

### F. CONTACT PERSONS

**Features:**
1. Multiple contacts per customer/supplier
2. Fields: Name, designation, email, phone
3. Set primary contact

**Database Schema:**
\`\`\`sql
CREATE TABLE party_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  party_type TEXT CHECK (party_type IN ('customer', 'supplier')),
  name TEXT NOT NULL,
  designation TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Files to Create:**
- `app/customers/[id]/contacts/page.tsx`
- `components/customers/contact-form.tsx`

### G. CUSTOMER HISTORY

**Features:**
1. Total orders, total value
2. Last transaction date
3. Payment behavior (on-time, late)
4. Average order value
5. Purchase frequency

**Files to Create:**
- `app/customers/[id]/history/page.tsx`
- `components/customers/customer-metrics.tsx`

**Metrics:**
\`\`\`sql
-- Customer metrics view
CREATE VIEW customer_metrics AS
SELECT 
  c.id,
  c.name,
  COUNT(i.id) as total_invoices,
  SUM(i.total) as total_sales,
  AVG(i.total) as avg_order_value,
  MAX(i.invoice_date) as last_order_date,
  SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(i.id), 0) * 100 as payment_rate,
  AVG(CASE WHEN p.payment_date IS NOT NULL 
    THEN DATE_PART('day', p.payment_date - i.invoice_date) 
    ELSE NULL 
  END) as avg_payment_delay_days
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY c.id, c.name;
\`\`\`

### H. SUPPLIER RATING

**Features:**
1. Rate suppliers (1-5 stars)
2. Notes on supplier performance
3. Preferred supplier flag

**Database Changes:**
\`\`\`sql
ALTER TABLE suppliers ADD COLUMN rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE suppliers ADD COLUMN notes TEXT;
ALTER TABLE suppliers ADD COLUMN is_preferred BOOLEAN DEFAULT FALSE;
ALTER TABLE suppliers ADD COLUMN total_purchases DECIMAL(12,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN last_purchase_date DATE;
\`\`\`

**Files to Modify:**
- `components/suppliers/supplier-form.tsx` - Add rating stars

**DELIVERABLES:**
1. Credit limit management working
2. Customer groups functional
3. Customer statement with PDF export
4. Aging analysis report
5. Multiple addresses support
6. Contact persons management
7. Customer history/metrics
8. Supplier rating

Implement step by step, test each feature independently.
\`\`\`

---

*(Continue with remaining prompts in next message due to length...)*

**Would you like me to continue with the remaining 9 AI prompts (Multi-Tenant, Additional Transactions, Document Features, Reports, Utilities, and all Backend features)?**
