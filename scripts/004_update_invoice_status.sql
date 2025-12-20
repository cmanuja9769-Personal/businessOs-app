-- Update invoice status constraint to match application statuses
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE public.invoices 
ADD CONSTRAINT check_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'unpaid', 'partial'));

-- Update any existing 'unpaid' statuses to 'sent' if they were created but not paid
-- (Optional - uncomment if you want to migrate existing data)
-- UPDATE public.invoices SET status = 'sent' WHERE status = 'unpaid' AND paid_amount = 0;

