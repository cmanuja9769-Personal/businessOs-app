-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  hsn TEXT,
  sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(10, 2) DEFAULT 0,
  quantity_price DECIMAL(10, 2) DEFAULT 0,
  purchase_price DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  sale_discount DECIMAL(10, 2) DEFAULT 0,
  opening_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  item_location TEXT,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  inclusive_of_tax BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_discount_type CHECK (discount_type IN ('percentage', 'flat'))
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  customer_gst TEXT,
  invoice_date DATE NOT NULL,
  pricing_mode TEXT DEFAULT 'sale',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  cgst DECIMAL(10, 2) DEFAULT 0,
  sgst DECIMAL(10, 2) DEFAULT 0,
  igst DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  gst_enabled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_pricing_mode CHECK (pricing_mode IN ('sale', 'wholesale', 'quantity')),
  CONSTRAINT check_discount_type CHECK (discount_type IN ('percentage', 'flat')),
  CONSTRAINT check_status CHECK (status IN ('paid', 'unpaid', 'partial'))
);

-- Create invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  hsn TEXT,
  quantity INTEGER NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_discount_type CHECK (discount_type IN ('percentage', 'flat'))
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_address TEXT,
  supplier_gst TEXT,
  purchase_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  cgst DECIMAL(10, 2) DEFAULT 0,
  sgst DECIMAL(10, 2) DEFAULT 0,
  igst DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  gst_enabled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_discount_type CHECK (discount_type IN ('percentage', 'flat')),
  CONSTRAINT check_status CHECK (status IN ('paid', 'unpaid', 'partial'))
);

-- Create purchase items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  hsn TEXT,
  quantity INTEGER NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_discount_type CHECK (discount_type IN ('percentage', 'flat'))
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_payment_method CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);
CREATE INDEX IF NOT EXISTS idx_items_item_code ON public.items(item_code);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_number ON public.purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_id ON public.payments(purchase_id);
