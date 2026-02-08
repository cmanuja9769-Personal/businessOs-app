-- Migration: Add organization_id to barcode_print_logs for proper org scoping
-- Description: Adds organization_id column and updates RLS policies

ALTER TABLE public.barcode_print_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.barcode_print_logs
  ADD COLUMN IF NOT EXISTS printed_by UUID;

CREATE INDEX IF NOT EXISTS idx_barcode_print_logs_org_id
  ON public.barcode_print_logs(organization_id);

DROP POLICY IF EXISTS "Allow all access to barcode_print_logs" ON public.barcode_print_logs;

CREATE POLICY "Users can view barcode logs in their organization"
  ON public.barcode_print_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert barcode logs in their organization"
  ON public.barcode_print_logs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete barcode logs in their organization"
  ON public.barcode_print_logs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.app_user_organizations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Backfill existing rows: set organization_id from the item's organization
UPDATE public.barcode_print_logs AS bl
SET organization_id = i.organization_id
FROM public.items AS i
WHERE bl.item_id = i.id AND bl.organization_id IS NULL;
