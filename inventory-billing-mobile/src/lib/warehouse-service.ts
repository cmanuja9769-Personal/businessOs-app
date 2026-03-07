import { supabase } from '@lib/supabase';

export interface WarehouseRecord {
  id: string;
  name: string;
  code?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  created_at?: string;
}

interface FetchWarehouseOptions {
  includeInactive?: boolean;
  select?: string;
}

const DEFAULT_SELECT = 'id, name, code, is_default, is_active, address, city, state, pincode, created_at';

export async function fetchWarehousesForOrganization<T = WarehouseRecord>(
  organizationId: string,
  options: FetchWarehouseOptions = {},
): Promise<T[]> {
  const { includeInactive = false, select = DEFAULT_SELECT } = options;

  let query = supabase
    .from('warehouses')
    .select(select)
    .eq('organization_id', organizationId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.neq('is_active', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
}

export async function fetchWarehouseById<T = WarehouseRecord>(
  organizationId: string,
  warehouseId: string,
  select = DEFAULT_SELECT,
): Promise<T | null> {
  const { data, error } = await supabase
    .from('warehouses')
    .select(select)
    .eq('organization_id', organizationId)
    .eq('id', warehouseId)
    .maybeSingle();

  if (error) throw error;
  return (data as T | null) ?? null;
}