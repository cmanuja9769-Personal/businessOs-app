"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { demoItems } from "@/app/demo/data"
import {
  validateStockId,
  fetchItemForStockOp,
  readWarehouseStock,
  upsertWarehouseStock,
  recomputeAndUpdateTotalStock,
  updateItemStock,
  insertStockLedgerEntry,
} from "@/lib/stock-helpers"

const ITEM_NOT_FOUND = "Item not found"

function getModifyTransactionType(operationType: "ADD" | "REDUCE", reason: string): string {
  if (operationType === "ADD") return "IN"
  if (reason === "correction") return "CORRECTION"
  return "ADJUSTMENT"
}

async function applyModifyWarehouseStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  itemId: string,
  warehouseId: string,
  operationType: "ADD" | "REDUCE",
  qtyChange: number
): Promise<
  | { success: true; quantityBefore: number; quantityAfter: number }
  | { success: false; error: string }
> {
  const wsResult = await readWarehouseStock(supabase, orgId, itemId, warehouseId)
  if (!wsResult.success) return { success: false, error: wsResult.error }

  const quantityBefore = wsResult.data.quantity
  const quantityAfter = Math.max(0, quantityBefore + qtyChange)

  if (operationType === "REDUCE" && quantityBefore < Math.abs(qtyChange)) {
    return {
      success: false,
      error: `Insufficient stock in this warehouse. Available: ${quantityBefore}, Requested: ${Math.abs(qtyChange)}`,
    }
  }

  if (!wsResult.data.id && operationType === "REDUCE") {
    return { success: false, error: "Cannot reduce stock from a warehouse with no stock record" }
  }

  const { error } = await upsertWarehouseStock(
    supabase,
    orgId,
    itemId,
    warehouseId,
    quantityAfter,
    wsResult.data.id
  )

  if (error) {
    const message = wsResult.data.id
      ? `Failed to update warehouse stock: ${error}`
      : `Failed to create warehouse stock record: ${error}`
    return { success: false, error: message }
  }

  return { success: true, quantityBefore, quantityAfter }
}

async function processWarehouseReduction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  itemId: string,
  reduction: { warehouseId: string; quantity: number },
  entryUnit: string,
  reason: string,
  notes: string | undefined,
  userId: string
): Promise<{ warehouseId: string; quantity: number; success: boolean; error?: string }> {
  const wsResult = await readWarehouseStock(supabase, orgId, itemId, reduction.warehouseId)
  if (!wsResult.success) {
    return { warehouseId: reduction.warehouseId, quantity: reduction.quantity, success: false, error: wsResult.error }
  }

  const quantityBefore = wsResult.data.quantity
  const reductionQty = Math.round(reduction.quantity)
  if (reductionQty > quantityBefore) {
    return {
      warehouseId: reduction.warehouseId,
      quantity: reduction.quantity,
      success: false,
      error: `Insufficient stock. Available: ${quantityBefore}, Requested: ${reductionQty}`,
    }
  }

  if (!wsResult.data.id) {
    return {
      warehouseId: reduction.warehouseId,
      quantity: reduction.quantity,
      success: false,
      error: "No stock record exists for this warehouse",
    }
  }

  const quantityAfter = quantityBefore - reductionQty
  const { error } = await upsertWarehouseStock(
    supabase,
    orgId,
    itemId,
    reduction.warehouseId,
    quantityAfter,
    wsResult.data.id
  )

  if (error) {
    return { warehouseId: reduction.warehouseId, quantity: reduction.quantity, success: false, error }
  }

  await insertStockLedgerEntry(supabase, {
    organization_id: orgId,
    item_id: itemId,
    warehouse_id: reduction.warehouseId,
    transaction_type: reason === "correction" ? "CORRECTION" : "ADJUSTMENT",
    quantity_before: quantityBefore,
    quantity_change: -reductionQty,
    quantity_after: quantityAfter,
    entry_quantity: reductionQty,
    entry_unit: entryUnit,
    base_quantity: reductionQty,
    reference_type: "manual_adjustment",
    reference_no: `MULTI-REDUCE-${Date.now()}`,
    notes: notes ? `${reason}: ${notes}` : reason,
    created_by: userId,
  })

  return { warehouseId: reduction.warehouseId, quantity: reduction.quantity, success: true }
}

async function processWarehouseAddition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  itemId: string,
  addition: { warehouseId: string; quantity: number },
  entryUnit: string,
  notes: string | undefined,
  userId: string
): Promise<{ warehouseId: string; quantity: number; success: boolean; error?: string }> {
  const wsResult = await readWarehouseStock(supabase, orgId, itemId, addition.warehouseId)
  if (!wsResult.success) {
    return { warehouseId: addition.warehouseId, quantity: addition.quantity, success: false, error: wsResult.error }
  }

  const quantityBefore = wsResult.data.quantity
  const additionQty = Math.round(addition.quantity)
  const quantityAfter = quantityBefore + additionQty

  const { error } = await upsertWarehouseStock(
    supabase,
    orgId,
    itemId,
    addition.warehouseId,
    quantityAfter,
    wsResult.data.id
  )

  if (error) {
    return { warehouseId: addition.warehouseId, quantity: addition.quantity, success: false, error }
  }

  await insertStockLedgerEntry(supabase, {
    organization_id: orgId,
    item_id: itemId,
    warehouse_id: addition.warehouseId,
    transaction_type: "IN",
    quantity_before: quantityBefore,
    quantity_change: additionQty,
    quantity_after: quantityAfter,
    entry_quantity: additionQty,
    entry_unit: entryUnit,
    base_quantity: additionQty,
    reference_type: "manual_adjustment",
    reference_no: `MULTI-ADD-${Date.now()}`,
    notes: notes ? `stock_in: ${notes}` : "stock_in",
    created_by: userId,
  })

  return { warehouseId: addition.warehouseId, quantity: addition.quantity, success: true }
}

export async function updateStock(id: string, quantity: number) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("items", "update")

  const { data: item } = await supabase.from("items").select("current_stock").eq("id", id).or(orgScope(organizationId)).single()

  if (!item) return { success: false, error: ITEM_NOT_FOUND }

  const { error } = await supabase
    .from("items")
    .update({ current_stock: item.current_stock + quantity })
    .eq("id", id)
    .or(orgScope(organizationId))

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true }
}

export async function addStockWithLedger(
  itemId: string,
  warehouseId: string,
  quantity: number,
  entryUnit: string,
  notes?: string
) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, userId } = await authorize("inventory", "update")

  const itemCheck = validateStockId(itemId, "item ID")
  if (!itemCheck.success) return { success: false, error: itemCheck.error }

  const whCheck = validateStockId(warehouseId, "warehouse ID")
  if (!whCheck.success) return { success: false, error: whCheck.error }
  const normalizedWarehouseId = whCheck.data

  const itemResult = await fetchItemForStockOp(supabase, itemId, "organization_id, per_carton_quantity, packaging_unit, unit")
  if (!itemResult.success) return { success: false, error: itemResult.error }
  const orgId = itemResult.data.organization_id

  const qtyToAdd = Math.round(quantity)

  const wsResult = await readWarehouseStock(supabase, orgId, itemId, normalizedWarehouseId)
  if (!wsResult.success) return { success: false, error: wsResult.error }

  const quantityBefore = wsResult.data.quantity
  const quantityAfter = Math.max(0, quantityBefore + qtyToAdd)

  const { error: upsertErr } = await upsertWarehouseStock(
    supabase, orgId, itemId, normalizedWarehouseId,
    wsResult.data.id ? quantityAfter : Math.max(0, qtyToAdd),
    wsResult.data.id
  )
  if (upsertErr) return { success: false, error: upsertErr }

  const totalResult = await recomputeAndUpdateTotalStock(supabase, orgId, itemId)
  if (!totalResult.success) return { success: false, error: totalResult.error }

  if (orgId && userId) {
    await insertStockLedgerEntry(supabase, {
      organization_id: orgId,
      item_id: itemId,
      warehouse_id: normalizedWarehouseId,
      transaction_type: "IN",
      quantity_before: quantityBefore,
      quantity_change: qtyToAdd,
      quantity_after: quantityAfter,
      entry_quantity: qtyToAdd,
      entry_unit: entryUnit,
      base_quantity: qtyToAdd,
      notes: notes || null,
      created_by: userId,
    })
  }

  revalidatePath("/items")
  revalidatePath(`/items/${itemId}`)
  return { success: true }
}

export async function modifyStockWithLedger(
  itemId: string,
  warehouseId: string,
  quantity: number,
  entryUnit: string,
  operationType: "ADD" | "REDUCE",
  reason: string,
  notes?: string
): Promise<{ success: boolean; error?: string; newStock?: number; quantityBefore?: number; quantityAfter?: number }> {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, userId } = await authorize("inventory", "update")

  const itemCheck = validateStockId(itemId, "item ID")
  if (!itemCheck.success) return { success: false, error: itemCheck.error }

  const whCheck = validateStockId(warehouseId, "warehouse ID")
  if (!whCheck.success) return { success: false, error: whCheck.error }
  const normalizedWarehouseId = whCheck.data

  if (quantity <= 0) return { success: false, error: "Quantity must be greater than zero" }

  const itemResult = await fetchItemForStockOp(
    supabase, itemId, "organization_id, current_stock, per_carton_quantity, packaging_unit, unit, name"
  )
  if (!itemResult.success) return { success: false, error: itemResult.error }
  const orgId = itemResult.data.organization_id

  const qtyChange = operationType === "ADD" ? Math.round(quantity) : -Math.round(quantity)
  const transactionType = getModifyTransactionType(operationType, reason)

  const warehouseUpdate = await applyModifyWarehouseStock(
    supabase,
    orgId,
    itemId,
    normalizedWarehouseId,
    operationType,
    qtyChange
  )
  if (!warehouseUpdate.success) return { success: false, error: warehouseUpdate.error }

  const warehouseQuantityBefore = warehouseUpdate.quantityBefore
  const warehouseQuantityAfter = warehouseUpdate.quantityAfter

  const totalResult = await recomputeAndUpdateTotalStock(supabase, orgId, itemId)
  if (!totalResult.success) return { success: false, error: totalResult.error }

  await insertStockLedgerEntry(supabase, {
    organization_id: orgId,
    item_id: itemId,
    warehouse_id: normalizedWarehouseId,
    transaction_type: transactionType,
    quantity_before: warehouseQuantityBefore,
    quantity_change: qtyChange,
    quantity_after: warehouseQuantityAfter,
    entry_quantity: Math.abs(qtyChange),
    entry_unit: entryUnit,
    base_quantity: Math.abs(qtyChange),
    reference_type: "manual_adjustment",
    reference_no: `${operationType}-${Date.now()}`,
    notes: notes ? `${reason}: ${notes}` : reason,
    created_by: userId,
  })

  revalidatePath("/items")
  revalidatePath(`/items/${itemId}`)

  return {
    success: true,
    newStock: totalResult.data,
    quantityBefore: warehouseQuantityBefore,
    quantityAfter: warehouseQuantityAfter
  }
}

export async function getItemWarehouseStocks(
  itemId: string
): Promise<{ 
  success: boolean
  error?: string
  stocks?: Array<{ warehouseId: string; warehouseName: string; quantity: number }>
  totalStock?: number
}> {
  if (await isDemoMode()) {
    const item = demoItems.find(i => i.id === itemId)
    if (!item) return { success: false, error: "Item not found" }
    return { success: true, stocks: item.warehouseStocks?.map(ws => ({ warehouseId: ws.warehouseId, warehouseName: ws.warehouseName || "", quantity: ws.quantity })) ?? [], totalStock: item.stock }
  }
  const { supabase } = await authorize("inventory", "read")

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("organization_id, current_stock")
    .eq("id", itemId)
    .single()

  if (itemError || !item) {
    return { success: false, error: itemError?.message || ITEM_NOT_FOUND }
  }

  const { data: warehouseStocks, error: wsError } = await supabase
    .from("item_warehouse_stock")
    .select("warehouse_id, quantity, warehouses:warehouse_id (id, name)")
    .eq("item_id", itemId)
    .eq("organization_id", item.organization_id)
    .gt("quantity", 0)

  if (wsError) {
    return { success: false, error: wsError.message }
  }

  const stocks = (warehouseStocks || []).map((ws: { 
    warehouse_id: string
    quantity: number
    warehouses: { id: string; name: string } | { id: string; name: string }[] | null
  }) => {
    const warehouseName = Array.isArray(ws.warehouses) 
      ? (ws.warehouses[0]?.name || "Unknown")
      : (ws.warehouses?.name || "Unknown")
    return {
      warehouseId: ws.warehouse_id,
      warehouseName,
      quantity: Number(ws.quantity) || 0
    }
  })

  return { 
    success: true, 
    stocks,
    totalStock: Number(item.current_stock) || 0
  }
}

export async function reduceStockFromMultipleWarehouses(
  itemId: string,
  reductions: Array<{ warehouseId: string; quantity: number }>,
  entryUnit: string,
  reason: string,
  notes?: string
): Promise<{ 
  success: boolean
  error?: string
  newStock?: number
  reductionResults?: Array<{ warehouseId: string; quantity: number; success: boolean; error?: string }>
}> {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, userId } = await authorize("inventory", "update")

  const itemResult = await fetchItemForStockOp(
    supabase, itemId, "organization_id, current_stock, packaging_unit, unit, name"
  )
  if (!itemResult.success) return { success: false, error: itemResult.error }
  const orgId = itemResult.data.organization_id
  const currentStock = Number(itemResult.data.current_stock) || 0

  const totalReduction = reductions.reduce((sum, r) => sum + Math.round(r.quantity), 0)
  if (totalReduction > currentStock) {
    return {
      success: false,
      error: `Total reduction (${totalReduction}) exceeds available stock (${currentStock})`
    }
  }

  const reductionResults: Array<{ warehouseId: string; quantity: number; success: boolean; error?: string }> = []

  for (const reduction of reductions) {
    if (reduction.quantity <= 0) continue
    const result = await processWarehouseReduction(
      supabase,
      orgId,
      itemId,
      reduction,
      entryUnit,
      reason,
      notes,
      userId
    )
    reductionResults.push(result)
  }

  const successfulReductions = reductionResults.filter(r => r.success)
  const totalReduced = successfulReductions.reduce((sum, r) => sum + Math.round(r.quantity), 0)
  const newTotalStock = Math.max(0, currentStock - totalReduced)

  if (totalReduced > 0) {
    await updateItemStock(supabase, itemId, newTotalStock)
  }

  revalidatePath("/items")
  revalidatePath(`/items/${itemId}`)

  const failedReductions = reductionResults.filter(r => !r.success)
  if (failedReductions.length > 0 && successfulReductions.length === 0) {
    return {
      success: false,
      error: `All reductions failed: ${failedReductions.map(r => r.error).join(", ")}`,
      reductionResults
    }
  }

  return { success: true, newStock: newTotalStock, reductionResults }
}

export async function addStockToMultipleWarehouses(
  itemId: string,
  additions: Array<{ warehouseId: string; quantity: number }>,
  entryUnit: string,
  notes?: string
): Promise<{ 
  success: boolean
  error?: string
  newStock?: number
  additionResults?: Array<{ warehouseId: string; quantity: number; success: boolean; error?: string }>
}> {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, userId } = await authorize("inventory", "update")

  const itemResult = await fetchItemForStockOp(
    supabase, itemId, "organization_id, current_stock, packaging_unit, unit, name"
  )
  if (!itemResult.success) return { success: false, error: itemResult.error }
  const orgId = itemResult.data.organization_id

  const totalAddition = additions.reduce((sum, a) => sum + Math.round(a.quantity), 0)
  if (totalAddition <= 0) return { success: false, error: "Total addition must be greater than zero" }

  const additionResults: Array<{ warehouseId: string; quantity: number; success: boolean; error?: string }> = []

  for (const addition of additions) {
    if (addition.quantity <= 0) continue
    const result = await processWarehouseAddition(
      supabase,
      orgId,
      itemId,
      addition,
      entryUnit,
      notes,
      userId
    )
    additionResults.push(result)
  }

  const successfulAdditions = additionResults.filter(r => r.success)
  const totalAdded = successfulAdditions.reduce((sum, r) => sum + Math.round(r.quantity), 0)
  const currentStock = Number(itemResult.data.current_stock) || 0
  const newTotalStock = currentStock + totalAdded

  if (totalAdded > 0) {
    await updateItemStock(supabase, itemId, newTotalStock)
  }

  revalidatePath("/items")
  revalidatePath(`/items/${itemId}`)

  const failedAdditions = additionResults.filter(r => !r.success)
  if (failedAdditions.length > 0 && successfulAdditions.length === 0) {
    return {
      success: false,
      error: `All additions failed: ${failedAdditions.map(r => r.error).join(", ")}`,
      additionResults
    }
  }

  return { success: true, newStock: newTotalStock, additionResults }
}
