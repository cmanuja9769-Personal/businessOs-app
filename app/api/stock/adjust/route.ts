import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/lib/authorize"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function validateRequestBody(body: Record<string, unknown>) {
  const { itemId, warehouseId, quantity, entryUnit, operationType, reason } = body

  if (!itemId || !warehouseId || !quantity || !entryUnit || !operationType || !reason) {
    return errorResponse("Missing required fields", 400)
  }

  if (!["ADD", "REDUCE"].includes(operationType as string)) {
    return errorResponse("Invalid operation type. Must be ADD or REDUCE", 400)
  }

  if (typeof quantity !== "number" || quantity <= 0) {
    return errorResponse("Quantity must be a positive number", 400)
  }

  return null
}

function resolveTransactionType(operationType: string, reason: string) {
  if (operationType === "ADD") return "IN"
  if (reason === "correction") return "CORRECTION"
  return "ADJUSTMENT"
}

function calculateQtyChange(operationType: string, quantity: number): number {
  if (operationType === "ADD") return Math.round(quantity)
  return -Math.round(quantity)
}

function formatLedgerNotes(reason: string, notes?: string): string {
  if (notes) return `${reason}: ${notes}`
  return reason
}

async function upsertWarehouseStock(
  supabase: Awaited<ReturnType<typeof authorize>>["supabase"],
  existingWs: { id: string; quantity: number } | null,
  operationType: string,
  warehouseQuantityAfter: number,
  organizationId: string,
  itemId: string,
  warehouseId: string,
) {
  if (existingWs?.id) {
    const { error } = await supabase
      .from("item_warehouse_stock")
      .update({
        quantity: warehouseQuantityAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingWs.id)

    if (error) return errorResponse(`Failed to update warehouse stock: ${error.message}`, 500)
    return null
  }

  if (operationType !== "ADD") {
    return errorResponse("Cannot reduce stock from a warehouse with no stock record", 400)
  }

  const { error } = await supabase
    .from("item_warehouse_stock")
    .insert({
      organization_id: organizationId,
      item_id: itemId,
      warehouse_id: warehouseId,
      quantity: warehouseQuantityAfter,
    })

  if (error) return errorResponse(`Failed to create warehouse stock record: ${error.message}`, 500)
  return null
}

async function recomputeTotalStock(
  supabase: Awaited<ReturnType<typeof authorize>>["supabase"],
  organizationId: string,
  itemId: string,
) {
  const { data: allWs, error: sumError } = await supabase
    .from("item_warehouse_stock")
    .select("quantity")
    .eq("organization_id", organizationId)
    .eq("item_id", itemId)

  if (sumError) return { total: 0, error: errorResponse(`Failed to calculate total stock: ${sumError.message}`, 500) }

  const total = (allWs || []).reduce((sum, row) => sum + (row.quantity || 0), 0)
  return { total, error: null }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await authorize("items", "update")

    const body = await request.json()
    const { itemId, warehouseId, quantity, entryUnit, operationType, reason, notes } = body

    const validationError = validateRequestBody(body)
    if (validationError) return validationError

    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("organization_id, current_stock, per_carton_quantity, packaging_unit, unit, name")
      .eq("id", itemId)
      .single()

    if (itemError || !item) {
      return errorResponse(itemError?.message || "Item not found", 404)
    }

    const qtyChange = calculateQtyChange(operationType, quantity)
    const transactionType = resolveTransactionType(operationType, reason)

    const { data: existingWs, error: wsReadError } = await supabase
      .from("item_warehouse_stock")
      .select("id, quantity")
      .eq("organization_id", item.organization_id)
      .eq("item_id", itemId)
      .eq("warehouse_id", warehouseId)
      .maybeSingle()

    if (wsReadError) {
      return errorResponse(wsReadError.message, 500)
    }

    const warehouseQuantityBefore = existingWs?.quantity || 0
    const warehouseQuantityAfter = Math.max(0, warehouseQuantityBefore + qtyChange)

    if (operationType === "REDUCE" && warehouseQuantityBefore < Math.abs(qtyChange)) {
      return errorResponse(
        `Insufficient stock in this warehouse. Available: ${warehouseQuantityBefore}, Requested: ${Math.abs(qtyChange)}`,
        400,
      )
    }

    const wsError = await upsertWarehouseStock(
      supabase, existingWs, operationType, warehouseQuantityAfter,
      item.organization_id, itemId, warehouseId,
    )
    if (wsError) return wsError

    const { total: newTotalStock, error: totalError } = await recomputeTotalStock(
      supabase, item.organization_id, itemId,
    )
    if (totalError) return totalError

    const { error: itemUpdateError } = await supabase
      .from("items")
      .update({
        current_stock: newTotalStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)

    if (itemUpdateError) {
      return errorResponse(`Failed to update item stock: ${itemUpdateError.message}`, 500)
    }

    const { error: ledgerError } = await supabase
      .from("stock_ledger")
      .insert({
        organization_id: item.organization_id,
        item_id: itemId,
        warehouse_id: warehouseId,
        transaction_type: transactionType,
        transaction_date: new Date().toISOString(),
        quantity_before: warehouseQuantityBefore,
        quantity_change: qtyChange,
        quantity_after: warehouseQuantityAfter,
        entry_quantity: Math.abs(qtyChange),
        entry_unit: entryUnit,
        base_quantity: Math.abs(qtyChange),
        reference_type: "manual_adjustment",
        reference_no: `${operationType}-${Date.now()}`,
        notes: formatLedgerNotes(reason, notes),
        created_by: userId,
      })

    if (ledgerError) {
      console.error("[Stock API] Failed to insert ledger entry:", ledgerError)
    }

    return NextResponse.json({
      success: true,
      data: {
        newStock: newTotalStock,
        quantityBefore: warehouseQuantityBefore,
        quantityAfter: warehouseQuantityAfter,
        itemName: item.name,
      },
    })
  } catch (error) {
    console.error("[Stock API] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
