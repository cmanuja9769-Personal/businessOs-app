-- Migration: Add barcode_print_logs table
-- Created: 2026-01-07
-- Description: Tracks barcode label printing history for audit trail

CREATE TABLE IF NOT EXISTS public.barcode_print_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  barcode_no TEXT,
  stock_at_print INTEGER NOT NULL DEFAULT 0,
  labels_printed INTEGER NOT NULL DEFAULT 1,
  print_type TEXT NOT NULL DEFAULT 'individual' CHECK (print_type IN ('individual', 'batch')),
  layout_id TEXT NOT NULL DEFAULT 'xl',
  printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barcode_print_logs_item_id ON public.barcode_print_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_barcode_print_logs_printed_at ON public.barcode_print_logs(printed_at DESC);

ALTER TABLE public.barcode_print_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to barcode_print_logs"
  ON public.barcode_print_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
