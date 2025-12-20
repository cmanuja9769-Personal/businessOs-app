-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update item stock on purchase
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.items
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.items
    SET current_stock = current_stock - OLD.quantity + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.items
    SET current_stock = current_stock - OLD.quantity
    WHERE id = OLD.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update item stock on sale (invoice)
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.items
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.items
    SET current_stock = current_stock + OLD.quantity - NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.items
    SET current_stock = current_stock + OLD.quantity
    WHERE id = OLD.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for stock management
CREATE TRIGGER update_stock_after_purchase_item
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_purchase();

CREATE TRIGGER update_stock_after_invoice_item
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();
