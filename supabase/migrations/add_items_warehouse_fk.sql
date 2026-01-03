-- Adds missing FK relationship so Supabase can join items -> godowns via warehouse_id
DO $$
BEGIN
  -- Ensure the column exists before attempting to add constraints
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'items'
      AND column_name = 'warehouse_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'godowns'
  ) THEN
    -- Add FK only if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'items_warehouse_id_fkey'
    ) THEN
      ALTER TABLE public.items
        ADD CONSTRAINT items_warehouse_id_fkey
        FOREIGN KEY (warehouse_id)
        REFERENCES public.godowns(id)
        ON DELETE SET NULL;
    END IF;

    -- Helpful index for join/filter performance
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'items'
        AND indexname = 'idx_items_warehouse_id'
    ) THEN
      CREATE INDEX idx_items_warehouse_id ON public.items (warehouse_id);
    END IF;
  END IF;
END $$;
