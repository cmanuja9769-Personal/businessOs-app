// Warehouse & Location Management

import { createClient } from "@/lib/supabase/server"

export interface WarehouseData {
  name: string
  code: string
  address?: string
  phone?: string
  isDefault?: boolean
}

export async function createWarehouse(organizationId: string, data: WarehouseData) {
  const supabase = await createClient()

  const { data: warehouse, error } = await supabase
    .from("warehouses")
    .insert({
      organization_id: organizationId,
      name: data.name,
      code: data.code,
      address: data.address || null,
      phone: data.phone || null,
      is_default: data.isDefault || false,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating warehouse:", error)
    return { success: false, error: error.message }
  }

  return { success: true, warehouse }
}

export async function getWarehouses(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching warehouses:", error)
    return []
  }

  return data || []
}

export async function getWarehouseStock(warehouseId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("warehouse_stock")
    .select("*, items(name, item_code)")
    .eq("warehouse_id", warehouseId)
    .gt("quantity", 0)

  if (error) {
    console.error("[v0] Error fetching warehouse stock:", error)
    return []
  }

  return data || []
}

export async function transferStock(
  organizationId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  items: Array<{ itemId: string; batchId?: string; quantity: number }>,
  userId: string,
  notes?: string,
) {
  const supabase = await createClient()

  // Generate transfer number
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from("stock_transfers")
    .select("*", { count: "exact", head: true })
    .like("transfer_no", `ST/${year}/%`)

  const transferNo = `ST/${year}/${((count || 0) + 1).toString().padStart(4, "0")}`

  // Create stock transfer
  const { data: transfer, error: transferError } = await supabase
    .from("stock_transfers")
    .insert({
      organization_id: organizationId,
      transfer_no: transferNo,
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      notes: notes || null,
      created_by: userId,
    })
    .select()
    .single()

  if (transferError || !transfer) {
    console.error("[v0] Error creating stock transfer:", transferError)
    return { success: false, error: transferError?.message }
  }

  // Add transfer items
  const transferItems = items.map((item) => ({
    transfer_id: transfer.id,
    item_id: item.itemId,
    batch_id: item.batchId || null,
    quantity: item.quantity,
    received_quantity: 0,
  }))

  const { error: itemsError } = await supabase.from("stock_transfer_items").insert(transferItems)

  if (itemsError) {
    console.error("[v0] Error creating transfer items:", itemsError)
    return { success: false, error: itemsError.message }
  }

  return { success: true, transfer }
}
