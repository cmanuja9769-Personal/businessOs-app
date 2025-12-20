-- Insert dummy customers
INSERT INTO public.customers (name, email, phone, address, gst_number) VALUES
  ('Raj Electronics', 'raj@electronics.com', '+91 98765 43210', '123 MG Road, Bangalore, Karnataka 560001', '29ABCDE1234F1Z5'),
  ('Amit Traders', 'amit@traders.com', '+91 98765 43211', '456 Park Street, Mumbai, Maharashtra 400001', '27FGHIJ5678K2L6'),
  ('Priya Stores', 'priya@stores.com', '+91 98765 43212', '789 Anna Salai, Chennai, Tamil Nadu 600002', '33MNOPQ9012R3M7')
ON CONFLICT DO NOTHING;

-- Insert dummy suppliers
INSERT INTO public.suppliers (name, email, phone, address, gst_number) VALUES
  ('Tech Distributors Pvt Ltd', 'sales@techdist.com', '+91 98765 43220', '12 Cyber City, Gurgaon, Haryana 122001', '06STUVW3456X4N8'),
  ('Wholesale Mart', 'info@wholesalemart.com', '+91 98765 43221', '34 Commercial Street, Bangalore, Karnataka 560002', '29YZABC7890Y5O9')
ON CONFLICT DO NOTHING;

-- Insert dummy items
INSERT INTO public.items (
  item_code, name, category, hsn, 
  sale_price, wholesale_price, quantity_price, purchase_price,
  discount_type, sale_discount,
  opening_stock, current_stock, min_stock,
  item_location, tax_rate, inclusive_of_tax
) VALUES
  ('LAPTOP001', 'Dell Inspiron 15 Laptop', 'Electronics', '84713020', 45000.00, 42000.00, 40000.00, 38000.00, 'percentage', 5.00, 10, 10, 2, 'A-101', 18.00, false),
  ('MOUSE001', 'Logitech Wireless Mouse', 'Electronics', '84716060', 800.00, 750.00, 700.00, 650.00, 'percentage', 10.00, 50, 50, 10, 'A-102', 18.00, false),
  ('KB001', 'Mechanical Keyboard RGB', 'Electronics', '84716020', 2500.00, 2300.00, 2200.00, 2000.00, 'flat', 100.00, 25, 25, 5, 'A-103', 18.00, false),
  ('RICE001', 'Basmati Rice 1kg', 'Grocery', '10063020', 120.00, 110.00, 105.00, 95.00, 'percentage', 5.00, 100, 100, 20, 'B-201', 5.00, true),
  ('OIL001', 'Sunflower Oil 1L', 'Grocery', '15121910', 180.00, 170.00, 165.00, 150.00, 'flat', 10.00, 80, 80, 15, 'B-202', 5.00, true)
ON CONFLICT DO NOTHING;
