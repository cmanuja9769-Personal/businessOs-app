// Stock Management & Movement Tracking

import { createClient } from "@/lib/supabase/server"

export interface StockMovementData {
  itemId: string
  organizationId: string
  movementType: "purchase" | "sale" | "adjustment" | "transfer" | "return" | "stock_in" | "stock_out"
  quantity: number
  referenceType?: string
  referenceId?: string
  referenceNo?: string
  rate?: number
  notes?: string
  batchId?: string
  serialId?: string
}

export async function logStockMovement(data: StockMovementData, userId: string) {
  const supabase = await createClient()

  // Get current item stock
  const { data: item } = await supabase.from("items").select("current_stock").eq("id", data.itemId).single()

  if (!item) {
    return { success: false, error: "Item not found" }
  }

  const quantityBefore = item.current_stock
  const quantityAfter = quantityBefore + data.quantity

  // Create movement record
  const { data: movement, error } = await supabase
    .from("stock_movements")
    .insert({
      organization_id: data.organizationId,
      item_id: data.itemId,
      batch_id: data.batchId || null,
      serial_id: data.serialId || null,
      movement_type: data.movementType,
      reference_type: data.referenceType || null,
      reference_id: data.referenceId || null,
      reference_no: data.referenceNo || null,
      quantity_before: quantityBefore,
      quantity_change: data.quantity,
      quantity_after: quantityAfter,
      rate: data.rate || null,
      notes: data.notes || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error logging stock movement:", error)
    return { success: false, error: error.message }
  }

  // Update item stock
  const { error: updateError } = await supabase
    .from("items")
    .update({ current_stock: Math.max(0, quantityAfter) })
    .eq("id", data.itemId)

  if (updateError) {
    console.error("[v0] Error updating item stock:", updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true, movement }
}

export async function getStockMovements(itemId: string, limit = 50) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[v0] Error fetching stock movements:", error)
    return []
  }

  return data || []
}

export async function getLowStockItems(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("organization_id", organizationId)
    .filter("current_stock", "lt", "min_stock")

  if (error) {
    console.error("[v0] Error fetching low stock items:", error)
    return []
  }

  return data || []
}
