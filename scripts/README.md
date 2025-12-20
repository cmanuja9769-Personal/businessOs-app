# Database Setup Scripts

These SQL scripts set up the database schema for the Inventory Billing App.

## Execution Order

Run these scripts in the Supabase SQL Editor in the following order:

1. **001_create_tables.sql** - Creates all database tables
2. **002_create_triggers.sql** - Sets up triggers for auto-updating timestamps and stock management
3. **003_seed_dummy_data.sql** - (Optional) Inserts sample data for testing

## How to Run

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of each script file
4. Paste into the SQL Editor
5. Click **Run** to execute

## What Each Script Does

### 001_create_tables.sql
Creates the following tables:
- `customers` - Customer information
- `items` - Product/inventory items
- `suppliers` - Supplier/vendor information
- `invoices` - Sales invoices
- `invoice_items` - Line items for invoices
- `purchases` - Purchase orders/invoices
- `purchase_items` - Line items for purchases
- `payments` - Payment records

Also creates indexes for better query performance.

### 002_create_triggers.sql
Sets up:
- **Auto-update triggers** - Automatically updates `updated_at` timestamp on record changes
- **Stock management triggers** - Automatically updates item stock when:
  - Purchase items are added/updated/deleted
  - Invoice items are added/updated/deleted

### 003_seed_dummy_data.sql
Inserts sample data:
- 3 sample customers
- 2 sample suppliers
- 5 sample items (electronics and grocery)

## Verifying Setup

After running the scripts, verify in Supabase dashboard:
1. Go to **Table Editor**
2. Check that all tables are listed
3. If you ran the seed script, check that sample data appears

## Resetting Database

To start fresh:
1. Drop all tables (in SQL Editor):
   ```sql
   DROP TABLE IF EXISTS public.payments CASCADE;
   DROP TABLE IF EXISTS public.purchase_items CASCADE;
   DROP TABLE IF EXISTS public.purchases CASCADE;
   DROP TABLE IF EXISTS public.invoice_items CASCADE;
   DROP TABLE IF EXISTS public.invoices CASCADE;
   DROP TABLE IF EXISTS public.items CASCADE;
   DROP TABLE IF EXISTS public.suppliers CASCADE;
   DROP TABLE IF EXISTS public.customers CASCADE;
   ```
2. Re-run scripts 001, 002, and optionally 003

