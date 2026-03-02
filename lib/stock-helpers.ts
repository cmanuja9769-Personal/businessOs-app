import type { SupabaseClient } from "@supabase/supabase-js"

type StockOk<T> = { success: true; data: T }
type StockErr = { success: false; error: string }
type StockResult<T> = StockOk<T> | StockErr

export function validateStockId(
  value: string | null | undefined,
  label: string
): StockResult<string> {
  const normalized = (value || "").trim()
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return { success: false, error: `Valid ${label} is required` }
  }
  return { success: true, data: normalized }
}

export async function fetchItemForStockOp(
  supabase: SupabaseClient,
  itemId: string,
  fields: string
): Promise<StockResult<Record<string, unknown> & { organization_id: string }>> {
  const { data, error } = await supabase
    .from("items")
    .select(fields)
    .eq("id", itemId)
    .single()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: "Item not found" }

  const item = data as unknown as Record<string, unknown> & { organization_id: string }
  if (!item.organization_id || item.organization_id === "null") {
    return { success: false, error: "Item has no valid organization" }
  }
  return { success: true, data: item }
}

export async function readWarehouseStock(
  supabase: SupabaseClient,
  orgId: string,
  itemId: string,
  warehouseId: string
): Promise<StockResult<{ id?: string; quantity: number }>> {
  const { data, error } = await supabase
    .from("item_warehouse_stock")
    .select("id, quantity")
    .eq("organization_id", orgId)
    .eq("item_id", itemId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: data?.id, quantity: Number(data?.quantity) || 0 } }
}

export async function upsertWarehouseStock(
  supabase: SupabaseClient,
  orgId: string,
  itemId: string,
  warehouseId: string,
  newQuantity: number,
  existingId?: string
): Promise<{ error: string | null }> {
  if (existingId) {
    const { error } = await supabase
      .from("item_warehouse_stock")
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq("id", existingId)
    return { error: error?.message || null }
  }
  const { error } = await supabase
    .from("item_warehouse_stock")
    .insert({
      organization_id: orgId,
      item_id: itemId,
      warehouse_id: warehouseId,
      quantity: newQuantity,
    })
  return { error: error?.message || null }
}

export async function recomputeAndUpdateTotalStock(
  supabase: SupabaseClient,
  orgId: string,
  itemId: string
): Promise<StockResult<number>> {
  const { data, error: sumError } = await supabase
    .from("item_warehouse_stock")
    .select("quantity")
    .eq("organization_id", orgId)
    .eq("item_id", itemId)

  if (sumError) {
    return { success: false, error: `Failed to calculate total stock: ${sumError.message}` }
  }

  const total = (data || []).reduce(
    (sum: number, row: { quantity: number }) => sum + (row.quantity || 0),
    0
  )

  const { error: updateError } = await supabase
    .from("items")
    .update({ current_stock: total, updated_at: new Date().toISOString() })
    .eq("id", itemId)

  if (updateError) {
    return { success: false, error: `Failed to update item stock: ${updateError.message}` }
  }
  return { success: true, data: total }
}

export async function updateItemStock(
  supabase: SupabaseClient,
  itemId: string,
  newStock: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("items")
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", itemId)
  return { error: error?.message || null }
}

export interface StockLedgerParams {
  organization_id: string
  item_id: string
  warehouse_id: string
  transaction_type: string
  quantity_before: number
  quantity_change: number
  quantity_after: number
  entry_quantity: number
  entry_unit: string
  base_quantity: number
  reference_type?: string
  reference_no?: string
  notes?: string | null
  created_by: string
}

export async function insertStockLedgerEntry(
  supabase: SupabaseClient,
  params: StockLedgerParams
): Promise<void> {
  const { error } = await supabase
    .from("stock_ledger")
    .insert({ ...params, transaction_date: new Date().toISOString() })

  if (error) {
    console.error("[Stock Management] Ledger insert failed:", error.message)
  }
}
