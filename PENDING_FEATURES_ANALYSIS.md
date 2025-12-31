# Comprehensive Feature Analysis & Implementation Guide

## 📊 EXECUTIVE SUMMARY

### Current Implementation Status
- **Database**: Supabase PostgreSQL (✅ Implemented)
- **Core Features**: Invoices, Purchases, Payments, Items, Customers (✅ 70% Complete)
- **Missing Features**: 30% (Authentication, Advanced Inventory, Accounting, Integrations)
- **Backend Status**: Currently serverless (Supabase only) - **Backend needed for compliance features**

---

## 1️⃣ PENDING FRONTEND FEATURES

### A. Authentication & User Management ❌ NOT IMPLEMENTED

**Current Status**: No authentication system exists. App is wide open.

**What's Missing**:
- User login/signup/logout
- Role-based access control (Admin, Salesperson, Viewer)
- Multi-user support
- User activity logs
- App lock (PIN/Biometric)
- Password reset
- Session management

**Database Requirements**:
\`\`\`sql
-- Already provided by Supabase Auth
-- Additional tables needed:
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  role TEXT CHECK (role IN ('admin', 'salesperson', 'viewer', 'accountant')),
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Files to Create**:
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `app/auth/forgot-password/page.tsx`
- `components/auth/login-form.tsx`
- `components/auth/signup-form.tsx`
- `components/auth/protected-route.tsx`
- `lib/auth.ts` (Auth utilities)
- `middleware.ts` (Route protection)
- `hooks/use-auth.ts`

**Dependencies to Install**:
\`\`\`bash
pnpm add @supabase/auth-helpers-nextjs
\`\`\`

---

### B. Advanced Stock Management ⚠️ PARTIAL

**Current Status**: Basic stock tracking exists. Advanced features missing.

**What's Missing**:
1. **Batch Tracking** ❌
   - Batch number entry
   - Batch-wise stock reports
   - Batch expiry tracking
   
2. **Serial Number Tracking** ❌
   - Serial number entry per unit
   - Serial number search
   - Warranty tracking by serial
   
3. **Expiry Date Management** ❌
   - Manufacturing date entry
   - Expiry date tracking
   - Alerts for expiring items (30/60/90 days)
   
4. **Stock Adjustment** ❌
   - Manual stock increase/decrease
   - Adjustment reasons (damage, theft, found, correction)
   - Adjustment approval workflow
   
5. **Stock Transfer** ❌
   - Multi-warehouse support
   - Transfer between locations
   - Transfer tracking
   
6. **Stock Valuation Methods** ❌
   - FIFO calculation
   - LIFO calculation
   - Weighted average cost
   
7. **Stock Movement History** ❌
   - Audit trail of all stock changes
   - Who changed, when, why
   - Before/after quantities

**Database Requirements**:
\`\`\`sql
-- Add to items table
ALTER TABLE items ADD COLUMN batch_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN serial_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN track_expiry BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN valuation_method TEXT DEFAULT 'FIFO' 
  CHECK (valuation_method IN ('FIFO', 'LIFO', 'AVERAGE'));

-- Batch tracking
CREATE TABLE item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  purchase_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, batch_number, organization_id)
);

-- Serial number tracking
CREATE TABLE item_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  batch_id UUID REFERENCES item_batches(id),
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'damaged')),
  purchase_date DATE,
  sale_date DATE,
  warranty_expiry DATE,
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(serial_number, organization_id)
);

-- Stock adjustments
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('damage', 'theft', 'found', 'correction', 'return', 'opening_balance')),
  notes TEXT,
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id)
);

-- Stock movements (audit trail)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES item_batches(id),
  serial_id UUID REFERENCES item_serials(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return')),
  reference_type TEXT, -- 'invoice', 'purchase', 'adjustment'
  reference_id UUID, -- ID of the source document
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  rate DECIMAL(10,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id)
);

-- Warehouses/Locations
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, organization_id)
);

-- Stock by location
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

-- Stock transfers
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

-- Indexes for performance
CREATE INDEX idx_item_batches_item_id ON item_batches(item_id);
CREATE INDEX idx_item_batches_expiry ON item_batches(expiry_date);
CREATE INDEX idx_item_serials_item_id ON item_serials(item_id);
CREATE INDEX idx_item_serials_serial ON item_serials(serial_number);
CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
\`\`\`

**Files to Create**:
- `app/inventory/batches/page.tsx`
- `app/inventory/serials/page.tsx`
- `app/inventory/adjustments/page.tsx`
- `app/inventory/transfers/page.tsx`
- `app/inventory/transfers/new/page.tsx`
- `app/inventory/movements/page.tsx`
- `app/warehouses/page.tsx`
- `components/inventory/batch-form.tsx`
- `components/inventory/serial-form.tsx`
- `components/inventory/stock-adjustment-form.tsx`
- `components/inventory/stock-transfer-form.tsx`
- `components/inventory/expiry-alerts.tsx`
- `components/inventory/batch-selector.tsx`
- `components/inventory/serial-selector.tsx`
- `components/warehouses/warehouse-form.tsx`
- `lib/inventory-calculations.ts` (FIFO/LIFO/Average cost logic)

---

### C. Financial Accounting ❌ NOT IMPLEMENTED

**Current Status**: Only invoice/purchase tracking. No double-entry accounting.

**What's Missing**:
1. **Chart of Accounts** - Account hierarchy (Assets, Liabilities, Income, Expenses)
2. **General Ledger** - All financial transactions
3. **Journal Entries** - Manual accounting entries
4. **Trial Balance** - Debit/Credit balance verification
5. **Balance Sheet** - Assets = Liabilities + Equity
6. **Profit & Loss Statement** - Detailed income statement
7. **Cash Flow Statement** - Operating/Investing/Financing activities
8. **Day Book** - Daily transaction log
9. **Cash Book** - Cash receipts & payments
10. **Bank Book** - Bank transaction tracking
11. **Expense Management** - Expense categories, tracking, approval

**Database Requirements**:
\`\`\`sql
-- Chart of Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_account_id UUID REFERENCES accounts(id),
  is_system_account BOOLEAN DEFAULT FALSE,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_code, organization_id)
);

-- Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT CHECK (entry_type IN ('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase')),
  reference_type TEXT, -- 'invoice', 'purchase', 'payment'
  reference_id UUID,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  line_order INTEGER
);

-- Expenses
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_no TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'cheque', 'upi', 'card')),
  paid_to TEXT,
  description TEXT,
  receipt_image TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Accounts
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  branch TEXT,
  ifsc_code TEXT,
  account_type TEXT CHECK (account_type IN ('savings', 'current', 'cash', 'wallet')),
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  ledger_account_id UUID REFERENCES accounts(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cheque Management
CREATE TABLE cheques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_no TEXT NOT NULL,
  cheque_date DATE NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id),
  amount DECIMAL(10,2) NOT NULL,
  cheque_type TEXT CHECK (cheque_type IN ('received', 'issued')),
  party_id UUID, -- customer_id or supplier_id
  party_type TEXT CHECK (party_type IN ('customer', 'supplier')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  cleared_date DATE,
  reference_type TEXT, -- 'invoice', 'purchase', 'payment'
  reference_id UUID,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contra Entries (Bank to Cash, Cash to Bank)
CREATE TABLE contra_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contra_no TEXT NOT NULL,
  contra_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_account_id UUID REFERENCES bank_accounts(id),
  to_account_id UUID REFERENCES bank_accounts(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Files to Create**:
- `app/accounting/page.tsx` (Dashboard)
- `app/accounting/accounts/page.tsx` (Chart of Accounts)
- `app/accounting/ledger/page.tsx` (General Ledger)
- `app/accounting/journal/page.tsx` (Journal Entries)
- `app/accounting/journal/new/page.tsx`
- `app/accounting/trial-balance/page.tsx`
- `app/accounting/balance-sheet/page.tsx`
- `app/accounting/profit-loss/page.tsx`
- `app/accounting/cash-flow/page.tsx`
- `app/accounting/daybook/page.tsx`
- `app/expenses/page.tsx`
- `app/expenses/categories/page.tsx`
- `app/expenses/new/page.tsx`
- `app/banking/accounts/page.tsx`
- `app/banking/cheques/page.tsx`
- `app/banking/contra/page.tsx`
- `components/accounting/account-form.tsx`
- `components/accounting/journal-entry-form.tsx`
- `components/accounting/account-tree.tsx`
- `components/expenses/expense-form.tsx`
- `components/banking/bank-account-form.tsx`
- `components/banking/cheque-form.tsx`
- `components/banking/contra-form.tsx`
- `lib/accounting-calculations.ts` (Double-entry logic)

---

### D. Customer/Supplier Enhancements ⚠️ PARTIAL

**Current Status**: Basic CRUD exists. Advanced features missing.

**What's Missing**:
1. **Credit Limit Management** ❌
2. **Customer Groups/Categories** ❌
3. **Customer Statement (Ledger)** ❌
4. **Outstanding Aging Analysis** ❌ (30/60/90/120 days)
5. **Multiple Addresses** ❌ (Billing, Shipping, Warehouse)
6. **Contact Persons** ❌ (Multiple contacts per party)
7. **Customer History** ❌ (Purchase history, payment behavior)
8. **Supplier Rating** ❌

**Database Requirements**:
\`\`\`sql
-- Add to customers table
ALTER TABLE customers ADD COLUMN customer_group_id UUID REFERENCES customer_groups(id);
ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_days INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN outstanding_balance DECIMAL(10,2) DEFAULT 0;

-- Customer Groups
CREATE TABLE customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional Addresses
CREATE TABLE party_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL, -- customer_id or supplier_id
  party_type TEXT CHECK (party_type IN ('customer', 'supplier')),
  address_type TEXT CHECK (address_type IN ('billing', 'shipping', 'warehouse', 'other')),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Persons
CREATE TABLE party_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  party_type TEXT CHECK (party_type IN ('customer', 'supplier')),
  name TEXT NOT NULL,
  designation TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier Rating
ALTER TABLE suppliers ADD COLUMN rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE suppliers ADD COLUMN notes TEXT;
\`\`\`

**Files to Create**:
- `app/customers/groups/page.tsx`
- `app/customers/[id]/statement/page.tsx`
- `app/customers/[id]/addresses/page.tsx`
- `app/customers/[id]/contacts/page.tsx`
- `components/customers/customer-group-form.tsx`
- `components/customers/customer-statement.tsx`
- `components/customers/aging-analysis.tsx`
- `components/customers/address-form.tsx`
- `components/customers/contact-form.tsx`

---

### E. Communication & Notifications ❌ NOT IMPLEMENTED

**Current Status**: No communication features exist.

**What's Missing**:
1. **Email Invoice** - Send invoice PDF via email
2. **SMS Integration** - Send transaction SMS
3. **WhatsApp Integration** - WhatsApp Business API
4. **Payment Reminders** - Automated reminders for overdue invoices
5. **Low Stock Alerts** - Email/SMS when stock is low
6. **In-app Notifications** - Real-time notifications

**Backend Required**: ✅ YES (Supabase Edge Functions sufficient)

**Files to Create**:
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-sms/index.ts`
- `supabase/functions/send-whatsapp/index.ts`
- `supabase/functions/payment-reminder-job/index.ts`
- `components/notifications/notification-center.tsx`
- `components/notifications/notification-settings.tsx`
- `lib/email-templates.ts`
- `lib/sms-templates.ts`

**Dependencies for Edge Functions**:
\`\`\`typescript
// Resend for Email
import { Resend } from 'resend';

// Twilio for SMS
import twilio from 'twilio';

// WhatsApp Business API
import axios from 'axios';
\`\`\`

---

### F. Multi-Firm/Multi-Tenant ❌ NOT IMPLEMENTED

**Current Status**: Single business in settings. No multi-tenant architecture.

**What's Missing**:
1. **Organization Management** - Create multiple firms
2. **User-Organization Mapping** - Assign users to organizations
3. **Data Isolation** - Row-level security per organization
4. **Org Switching** - Switch between organizations in UI
5. **Subdomain/Domain Routing** - org1.yourapp.com

**Database Requirements**:
\`\`\`sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  pan_number TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Organization mapping
CREATE TABLE user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to all tables
ALTER TABLE customers ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE items ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE invoices ADD COLUMN organization_id UUID REFERENCES organizations(id);
-- ... repeat for all tables

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- RLS Policies
CREATE POLICY "Users can only access their organization's data"
  ON customers
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );
-- ... repeat for all tables
\`\`\`

**Files to Create**:
- `app/organizations/page.tsx`
- `app/organizations/[id]/page.tsx`
- `app/organizations/new/page.tsx`
- `components/organizations/org-switcher.tsx`
- `components/organizations/org-form.tsx`
- `lib/organization-context.tsx`
- `hooks/use-organization.ts`

---

### G. Additional Transaction Features ⚠️ PARTIAL

**Current Status**: Basic invoice/purchase exists. Advanced features missing.

**What's Missing**:
1. **Recurring Invoices** ❌ - Auto-generate invoices monthly/weekly
2. **Sale Returns (Credit Notes)** ⚠️ - Structure exists, stock reversal missing
3. **Purchase Returns (Debit Notes)** ⚠️ - Structure exists, not fully functional
4. **E-Way Bill Generation** ❌ - Government e-way bill integration
5. **Transport Details** ❌ - Transporter name, vehicle no, LR no
6. **Quotation Workflow** ⚠️ - Accept/Reject quotations
7. **Delivery Tracking** ❌ - Track delivery status

**Database Requirements**:
\`\`\`sql
-- Recurring invoices
CREATE TABLE recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_invoice_date DATE,
  invoice_template JSONB NOT NULL, -- Stores invoice items
  is_active BOOLEAN DEFAULT TRUE,
  last_generated_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport details (add to invoices)
ALTER TABLE invoices ADD COLUMN transport_mode TEXT;
ALTER TABLE invoices ADD COLUMN vehicle_number TEXT;
ALTER TABLE invoices ADD COLUMN transporter_name TEXT;
ALTER TABLE invoices ADD COLUMN lr_no TEXT;
ALTER TABLE invoices ADD COLUMN lr_date DATE;
ALTER TABLE invoices ADD COLUMN eway_bill_no TEXT;
ALTER TABLE invoices ADD COLUMN eway_bill_date DATE;
ALTER TABLE invoices ADD COLUMN delivery_status TEXT DEFAULT 'pending' 
  CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'cancelled'));
ALTER TABLE invoices ADD COLUMN delivered_at TIMESTAMPTZ;
\`\`\`

**Files to Create**:
- `app/invoices/recurring/page.tsx`
- `app/invoices/recurring/new/page.tsx`
- `components/invoices/recurring-invoice-form.tsx`
- `components/invoices/transport-details-form.tsx`
- `components/invoices/eway-bill-form.tsx`
- `components/invoices/sale-return-form.tsx`
- `supabase/functions/generate-recurring-invoices/index.ts`

---

### H. Document Features ⚠️ PARTIAL

**Current Status**: Print exists. PDF/Email/Templates need work.

**What's Missing**:
1. **PDF Export** ⚠️ - Convert to PDF (not just print)
2. **Email PDF** ❌ - Email invoice as PDF attachment
3. **Template Customization** ❌ - Drag-drop invoice designer
4. **Thermal Printer** ⚠️ - 2"/3" thermal templates not tested
5. **Custom Fields** ❌ - Add custom fields to invoices
6. **Watermarks** ❌ - Add "PAID", "DRAFT" watermarks

**Files to Create**:
- `lib/pdf-generator.ts` (Use jsPDF or Puppeteer)
- `components/invoices/template-editor.tsx`
- `components/invoices/thermal-print-preview.tsx`

**Dependencies**:
\`\`\`bash
pnpm add jspdf jspdf-autotable html2canvas
# OR for server-side
pnpm add puppeteer
\`\`\`

---

### I. Reports Enhancements ⚠️ PARTIAL

**Current Status**: Basic reports exist in `app/reports/page.tsx`.

**What's Missing**:
1. **GSTR-1/2/3B/9 JSON Export** ❌ - Government format
2. **Tax Reports** ❌ - Input Tax Credit analysis
3. **Profit Margin by Item** ❌ - Item-wise profitability
4. **Sales by Customer** ⚠️ - Exists but limited
5. **Purchase by Supplier** ❌
6. **Slow/Fast Moving Items** ❌
7. **Stock Aging** ❌ - Items in stock > 90/180 days
8. **Discount Analysis** ❌ - Total discounts given
9. **Custom Report Builder** ❌

**Files to Create**:
- `app/reports/gst/page.tsx`
- `app/reports/gst/gstr1/page.tsx`
- `app/reports/gst/gstr3b/page.tsx`
- `app/reports/tax-analysis/page.tsx`
- `app/reports/profit-margin/page.tsx`
- `app/reports/sales-by-customer/page.tsx`
- `app/reports/slow-fast-moving/page.tsx`
- `lib/gst-json-generator.ts`

---

### J. Utilities ❌ NOT IMPLEMENTED

**What's Missing**:
1. **Tally Export** ❌ - XML export to Tally
2. **Data Backup/Restore** ❌ - Export/import full database
3. **Recycle Bin** ❌ - Soft delete and restore
4. **Activity Logs** ❌ - Audit trail
5. **Settings Import/Export** ❌ - Migrate settings
6. **Bulk Operations** ❌ - Bulk delete, bulk edit

**Files to Create**:
- `app/utilities/backup/page.tsx`
- `app/utilities/tally-export/page.tsx`
- `app/utilities/recycle-bin/page.tsx`
- `app/utilities/activity-logs/page.tsx`
- `lib/tally-xml-generator.ts`
- `lib/backup-generator.ts`

---

## 2️⃣ BACKEND REQUIREMENTS ANALYSIS

### Backend Services Needed

#### A. E-Invoice IRP Integration 🔴 MANDATORY

**Why Backend Needed**: 
- Government API requires secure credentials
- GSTN has strict rate limits
- Webhook handling for async responses
- Retry logic for failed requests
- Compliance and audit logging

**Technology**: Node.js + Express + BullMQ

**What It Contains**:
\`\`\`
backend/
├── src/
│   ├── controllers/
│   │   └── einvoice.controller.ts
│   ├── services/
│   │   ├── irp.service.ts (IRP API integration)
│   │   ├── qrcode.service.ts
│   │   └── gst-validation.service.ts
│   ├── jobs/
│   │   └── irn-generation.job.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── config/
│   │   └── irp-providers.ts (ClearTax, Masters India, etc.)
│   └── utils/
│       └── retry-logic.ts
├── .env
└── package.json
\`\`\`

**API Endpoints**:
\`\`\`
POST   /api/einvoice/generate
POST   /api/einvoice/cancel
POST   /api/einvoice/validate-gstin
GET    /api/einvoice/status/:irn
POST   /api/webhooks/irp (Callback from IRP)
\`\`\`

**IRP Provider Options**:
1. **NIC (Government)** - Free but complex setup
2. **ClearTax** - ₹5-10/invoice
3. **Masters India** - ₹3-5/invoice
4. **IRIS GST** - ₹4-6/invoice

---

#### B. GST Portal Integration 🔴 COMPLIANCE CRITICAL

**Why Backend Needed**:
- Secure API keys for GSTN
- Complex JSON generation per GSTN schema
- Auto-file GSTR-1, GSTR-3B

**Technology**: Node.js or Python

**What It Contains**:
\`\`\`
backend/src/services/
├── gst-portal.service.ts
├── gstr1-generator.service.ts
├── gstr3b-generator.service.ts
└── gst-reconciliation.service.ts
\`\`\`

**API Endpoints**:
\`\`\`
POST   /api/gst/generate-gstr1
POST   /api/gst/generate-gstr3b
POST   /api/gst/file-return
GET    /api/gst/return-status
\`\`\`

---

#### C. SMS/WhatsApp/Email 🟡 CAN USE EDGE FUNCTIONS

**Why Backend Needed**: Third-party API integration

**Recommendation**: ✅ **Supabase Edge Functions Sufficient**

**Edge Functions to Create**:
\`\`\`
supabase/functions/
├── send-email/
│   └── index.ts (Resend/SendGrid)
├── send-sms/
│   └── index.ts (Twilio/MSG91)
└── send-whatsapp/
    └── index.ts (WhatsApp Business API)
\`\`\`

**Trigger Methods**:
1. Manual (User clicks "Send Email")
2. Automated (Database trigger when invoice created)
3. Scheduled (Daily payment reminders)

---

#### D. Payment Gateway 🟡 CAN USE EDGE FUNCTIONS

**Why Backend Needed**: Webhook verification

**Recommendation**: ✅ **Supabase Edge Functions Sufficient**

**Edge Functions**:
\`\`\`
supabase/functions/
├── payment-link/
│   └── index.ts (Generate Razorpay/Stripe link)
└── payment-webhook/
    └── index.ts (Verify and update invoice status)
\`\`\`

---

#### E. Scheduled Jobs 🟡 CAN USE EDGE FUNCTIONS

**Jobs Needed**:
1. **Payment Reminders** - Daily at 9 AM
2. **Low Stock Alerts** - Daily at 8 AM
3. **Recurring Invoices** - Daily check
4. **Expiry Alerts** - Daily for items expiring in 30 days
5. **Database Backup** - Daily at 2 AM

**Recommendation**: ✅ **Supabase pg_cron + Edge Functions**

\`\`\`sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule payment reminders
SELECT cron.schedule(
  'payment-reminders',
  '0 9 * * *', -- Every day at 9 AM
  $$ SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/payment-reminder-job',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) $$
);
\`\`\`

---

#### F. File Storage 🟢 SUPABASE STORAGE

**Current**: No file uploads

**Needed For**:
1. Company logo
2. Product images
3. Expense receipts
4. Backup files
5. Invoice PDFs

**Recommendation**: ✅ **Use Supabase Storage**

\`\`\`typescript
// Upload file
const { data, error } = await supabase.storage
  .from('invoices')
  .upload('invoice-001.pdf', pdfBlob);
\`\`\`

---

### Backend Architecture Recommendation

#### **Phase 1: Hybrid (Current → 6 months)**

\`\`\`
┌─────────────────────────────────┐
│   Next.js Frontend (Vercel)     │
│   - All UI                      │
│   - Client-side logic           │
└────────────┬────────────────────┘
             │
             ├──► Supabase (Primary Database)
             │    - PostgreSQL
             │    - Row-Level Security
             │    - Realtime subscriptions
             │
             ├──► Supabase Edge Functions
             │    - Email sending
             │    - SMS/WhatsApp
             │    - Payment webhooks
             │    - Scheduled jobs
             │
             └──► Node.js Backend (Render/Railway)
                  - E-Invoice IRP only
                  - GST Portal integration
                  - BullMQ for job queue
\`\`\`

**Cost**: $7-25/month

---

#### **Phase 2: Microservices (If scaling > 1000 users)**

\`\`\`
┌─────────────────┐
│    Next.js      │
└────────┬────────┘
         │
         ├──► API Gateway (Kong)
         │
         ├──► Auth Service (Supabase Auth)
         ├──► Invoice Service (E-Invoice, GST)
         ├──► Payment Service (Gateway webhooks)
         ├──► Notification Service (Email/SMS)
         ├──► Analytics Service (Reports)
         └──► Database (Supabase PostgreSQL)
\`\`\`

**Cost**: $200+/month

---

## 3️⃣ BACKEND NECESSITY MATRIX

| Feature | Frontend | Supabase Edge | Node.js Backend | Necessity |
|---------|----------|---------------|-----------------|-----------|
| **E-Invoice IRP** | ❌ | ⚠️ Possible | ✅ **Recommended** | 🔴 MANDATORY |
| **GST Portal** | ❌ | ⚠️ Possible | ✅ **Recommended** | 🔴 MANDATORY |
| **Email Sending** | ❌ | ✅ **Best** | ⚠️ Overkill | 🟡 NEEDED |
| **SMS/WhatsApp** | ❌ | ✅ **Best** | ⚠️ Overkill | 🟡 NEEDED |
| **Payment Gateway** | ❌ | ✅ **Sufficient** | ⚠️ Optional | 🟡 NEEDED |
| **Scheduled Jobs** | ❌ | ✅ **pg_cron** | ⚠️ Optional | 🟡 NEEDED |
| **PDF Generation** | ✅ Possible | ✅ **Better** | ❌ Not needed | 🟢 OPTIONAL |
| **Tally Export** | ✅ **Best** | ⚠️ Overkill | ❌ Not needed | 🟢 OPTIONAL |
| **Reports** | ✅ **Best** | ⚠️ For heavy | ❌ Not needed | 🟢 OPTIONAL |
| **Authentication** | ❌ | ✅ **Supabase Auth** | ❌ Not needed | 🔴 MANDATORY |
| **File Storage** | ❌ | ✅ **Supabase Storage** | ❌ Not needed | 🟡 NEEDED |
| **Multi-Tenant** | ❌ | ✅ **RLS** | ❌ Not needed | 🟡 NEEDED |

### Verdict: **DO YOU NEED A BACKEND?**

#### ✅ YES - For These Features Only:
1. **E-Invoice IRP Integration** (Government compliance)
2. **GST Portal Auto-filing** (Government compliance)

#### ❌ NO - These Can Use Supabase:
1. Email/SMS/WhatsApp (Edge Functions)
2. Payment Gateways (Edge Functions)
3. Scheduled Jobs (pg_cron + Edge Functions)
4. Authentication (Supabase Auth)
5. File Storage (Supabase Storage)
6. Multi-Tenancy (Row-Level Security)

### Recommended Tech Stack:

\`\`\`yaml
Frontend: Next.js 16 (Current)
Database: Supabase PostgreSQL (Current)
Authentication: Supabase Auth
File Storage: Supabase Storage
Email: Supabase Edge Function + Resend
SMS: Supabase Edge Function + Twilio
WhatsApp: Supabase Edge Function + WhatsApp Business API
Scheduled Jobs: pg_cron + Supabase Edge Functions

Backend (Only for E-Invoice/GST):
  Language: Node.js 20 LTS
  Framework: Express.js or Fastify
  Queue: BullMQ + Upstash Redis
  Deployment: Render.com or Railway.app
  Cost: $7-15/month
\`\`\`

---

## 4️⃣ IMPLEMENTATION PRIORITY

### 🔴 CRITICAL (Week 1-2)
1. **Authentication** - Supabase Auth
2. **Multi-Tenant RLS** - Row-level security
3. **Security Hardening** - Input validation, CORS

### 🟠 HIGH (Week 3-6)
4. **E-Invoice Backend** - Node.js + IRP integration
5. **Email/SMS** - Edge Functions
6. **Payment Reminders** - Scheduled jobs
7. **Stock Adjustments** - Manual stock changes

### 🟡 MEDIUM (Week 7-12)
8. **Batch/Serial Tracking**
9. **Expense Management**
10. **Customer Ledger**
11. **GST Portal Integration**

### 🟢 LOW (Later)
12. **Financial Accounting** (Ledger, P&L, Balance Sheet)
13. **Recurring Invoices**
14. **Tally Export**
15. **My Online Store**

---

## 5️⃣ ESTIMATED DEVELOPMENT TIME

| Feature Category | Time Estimate |
|------------------|---------------|
| **Authentication & Multi-Tenant** | 1-2 weeks |
| **E-Invoice Backend** | 2-3 weeks |
| **Email/SMS Integration** | 1 week |
| **Advanced Stock Management** | 3-4 weeks |
| **Financial Accounting** | 4-6 weeks |
| **Customer Enhancements** | 2 weeks |
| **Reports Enhancements** | 2 weeks |
| **Communication Features** | 2 weeks |
| **Utilities** | 1-2 weeks |

**Total: 18-26 weeks (4.5 - 6.5 months)**

---

*This analysis is complete. Ready to generate detailed AI prompts for each feature.*
