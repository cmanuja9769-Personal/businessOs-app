"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export interface StockTransfer {
  id: string
  transferNo: string
  transferDate: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  status: "draft" | "completed" | "cancelled"
  notes: string
  createdBy: string
  createdAt: string
  items: StockTransferItem[]
}

export interface StockTransferItem {
  id: string
  itemId: string
  itemName: string
  itemCode: string
  unit: string
  quantity: number
  availableQty?: number
  notes: string
}

interface OrgContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
}

async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: orgData } = await supabase
    .from("app_user_organizations")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!orgData?.organization_id) return null
  return { supabase, userId: user.id, organizationId: orgData.organization_id }
}

interface TransferItemInput {
  itemId: string
  quantity: number
  notes?: string
}

interface CreateTransferInput {
  sourceWarehouseId: string
  destinationWarehouseId: string
  transferDate: string
  items: TransferItemInput[]
  notes?: string
}

export async function getWarehouseItemStock(warehouseId: string) {
  const ctx = await getOrgContext()
  if (!ctx) return []

  const { data } = await ctx.supabase
    .from("item_warehouse_stock")
    .select("item_id, quantity, location, items:item_id (name, item_code, unit, packaging_unit)")
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .gt("quantity", 0)
    .order("quantity", { ascending: false })

  if (!data) return []

  return (data as Array<Record<string, unknown>>).map(row => {
    const item = row.items as Record<string, unknown> | null
    return {
      itemId: row.item_id as string,
      quantity: Number(row.quantity) || 0,
      location: (row.location as string) || "",
      itemName: (item?.name as string) || "",
      itemCode: (item?.item_code as string) || "",
      unit: (item?.unit as string) || "PCS",
      packagingUnit: (item?.packaging_unit as string) || "",
    }
  })
}

function validateTransferInput(input: CreateTransferInput): string | null {
  if (input.sourceWarehouseId === input.destinationWarehouseId) {
    return "Source and destination warehouse cannot be the same"
  }
  if (!input.items || input.items.length === 0) {
    return "At least one item is required for transfer"
  }
  const invalid = input.items.some(item => !item.itemId || item.quantity <= 0)
  if (invalid) return "All items must have valid quantity > 0"
  return null
}

async function fetchSourceStockMap(
  ctx: OrgContext, warehouseId: string, itemIds: string[]
): Promise<Map<string, number>> {
  const { data } = await ctx.supabase
    .from("item_warehouse_stock")
    .select("item_id, quantity")
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .in("item_id", itemIds)

  const map = new Map<string, number>()
  if (data) {
    for (const row of data as Array<Record<string, unknown>>) {
      map.set(row.item_id as string, Number(row.quantity) || 0)
    }
  }
  return map
}

async function findInsufficientStockError(
  ctx: OrgContext, items: TransferItemInput[], sourceStockMap: Map<string, number>
): Promise<string | null> {
  const insufficientIds = items
    .filter(item => (sourceStockMap.get(item.itemId) || 0) < item.quantity)
    .map(item => item.itemId)

  if (insufficientIds.length === 0) return null

  const { data: itemNames } = await ctx.supabase
    .from("items")
    .select("id, name")
    .in("id", insufficientIds)

  const names = (itemNames as Array<Record<string, unknown>> | null)
    ?.map(i => i.name as string).join(", ") || "Some items"
  return `Insufficient stock for: ${names}`
}

async function generateTransferNumber(ctx: OrgContext): Promise<string> {
  const { data: lastTransfer } = await ctx.supabase
    .from("stock_transfers")
    .select("transfer_no")
    .eq("organization_id", ctx.organizationId)
    .like("transfer_no", "ST/%")
    .order("transfer_no", { ascending: false })
    .limit(1)

  let nextNum = 1
  if (lastTransfer && lastTransfer.length > 0) {
    const lastNo = (lastTransfer[0] as Record<string, unknown>).transfer_no as string
    const parsed = parseInt(lastNo.replace("ST/", ""), 10)
    if (!isNaN(parsed)) nextNum = parsed + 1
  }
  return `ST/${String(nextNum).padStart(4, "0")}`
}

async function insertTransferRecord(
  ctx: OrgContext, input: CreateTransferInput, transferNo: string
): Promise<{ id: string; transferNo: string } | { error: string }> {
  const { data: transfer, error: transferError } = await ctx.supabase
    .from("stock_transfers")
    .insert({
      organization_id: ctx.organizationId,
      transfer_no: transferNo,
      transfer_date: input.transferDate,
      source_warehouse_id: input.sourceWarehouseId,
      destination_warehouse_id: input.destinationWarehouseId,
      status: "completed",
      notes: input.notes?.trim() || null,
      created_by: ctx.userId,
    })
    .select("id, transfer_no")
    .single()

  if (transferError || !transfer) {
    return { error: transferError?.message || "Failed to create transfer" }
  }
  return {
    id: (transfer as Record<string, unknown>).id as string,
    transferNo: (transfer as Record<string, unknown>).transfer_no as string,
  }
}

async function saveTransferItems(
  ctx: OrgContext, transferId: string, items: TransferItemInput[]
): Promise<string | null> {
  const rows = items.map(item => ({
    transfer_id: transferId,
    item_id: item.itemId,
    quantity: item.quantity,
    notes: item.notes?.trim() || null,
  }))

  const { error } = await ctx.supabase
    .from("stock_transfer_items")
    .insert(rows)

  if (!error) return null

  await ctx.supabase.from("stock_transfers").delete().eq("id", transferId)
  return `Failed to save transfer items: ${error.message}`
}

async function fetchItemUnitMap(
  ctx: OrgContext, itemIds: string[]
): Promise<Map<string, string>> {
  const { data } = await ctx.supabase
    .from("items")
    .select("id, unit")
    .in("id", itemIds)

  const map = new Map<string, string>()
  if (data) {
    for (const row of data as Array<Record<string, unknown>>) {
      map.set(row.id as string, (row.unit as string) || "PCS")
    }
  }
  return map
}

async function deductSourceStock(
  ctx: OrgContext, itemId: string, warehouseId: string, newQty: number
): Promise<string | null> {
  const { error } = await ctx.supabase
    .from("item_warehouse_stock")
    .update({ quantity: newQty })
    .eq("item_id", itemId)
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", ctx.organizationId)

  return error ? `Source deduction failed for item ${itemId}: ${error.message}` : null
}

async function upsertDestinationStock(
  ctx: OrgContext, itemId: string, warehouseId: string, quantity: number
): Promise<{ destBefore: number; error?: string }> {
  const { data: destRow } = await ctx.supabase
    .from("item_warehouse_stock")
    .select("id, quantity")
    .eq("item_id", itemId)
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()

  if (!destRow) {
    const { error } = await ctx.supabase
      .from("item_warehouse_stock")
      .insert({
        item_id: itemId,
        warehouse_id: warehouseId,
        organization_id: ctx.organizationId,
        quantity,
      })
    return { destBefore: 0, error: error ? `Destination insert failed for item ${itemId}: ${error.message}` : undefined }
  }

  const destBefore = Number((destRow as Record<string, unknown>).quantity) || 0
  const { error } = await ctx.supabase
    .from("item_warehouse_stock")
    .update({ quantity: destBefore + quantity })
    .eq("id", (destRow as Record<string, unknown>).id as string)

  return { destBefore, error: error ? `Destination add failed for item ${itemId}: ${error.message}` : undefined }
}

interface LedgerParams {
  ctx: OrgContext
  itemId: string
  warehouseId: string
  transactionType: string
  transferDate: string
  qtyBefore: number
  qtyChange: number
  entryQuantity: number
  entryUnit: string
  referenceId: string
  referenceNo: string
  notes: string
}

async function createLedgerEntry(params: LedgerParams): Promise<string | null> {
  const { error } = await params.ctx.supabase
    .from("stock_ledger")
    .insert({
      organization_id: params.ctx.organizationId,
      item_id: params.itemId,
      warehouse_id: params.warehouseId,
      transaction_type: params.transactionType,
      transaction_date: params.transferDate,
      quantity_before: params.qtyBefore,
      quantity_change: params.qtyChange,
      quantity_after: params.qtyBefore + params.qtyChange,
      entry_quantity: params.entryQuantity,
      entry_unit: params.entryUnit,
      base_quantity: params.entryQuantity,
      reference_type: "transfer",
      reference_id: params.referenceId,
      reference_no: params.referenceNo,
      notes: params.notes,
      created_by: params.ctx.userId,
    })

  return error ? `Ledger ${params.transactionType} entry failed: ${error.message}` : null
}

async function processTransferItem(
  ctx: OrgContext,
  item: TransferItemInput,
  input: CreateTransferInput,
  transferId: string,
  transferNumber: string,
  sourceStockMap: Map<string, number>,
  unitMap: Map<string, string>,
): Promise<string[]> {
  const errors: string[] = []
  const sourceQty = sourceStockMap.get(item.itemId) || 0
  const newSourceQty = sourceQty - item.quantity
  const itemUnit = unitMap.get(item.itemId) || "PCS"

  const srcError = await deductSourceStock(ctx, item.itemId, input.sourceWarehouseId, newSourceQty)
  if (srcError) return [srcError]

  const destResult = await upsertDestinationStock(ctx, item.itemId, input.destinationWarehouseId, item.quantity)
  if (destResult.error) errors.push(destResult.error)

  const outError = await createLedgerEntry({
    ctx, itemId: item.itemId, warehouseId: input.sourceWarehouseId,
    transactionType: "TRANSFER_OUT", transferDate: input.transferDate,
    qtyBefore: sourceQty, qtyChange: -item.quantity,
    entryQuantity: item.quantity, entryUnit: itemUnit,
    referenceId: transferId, referenceNo: transferNumber,
    notes: `Transfer to ${input.destinationWarehouseId}`,
  })
  if (outError) errors.push(outError)

  const inError = await createLedgerEntry({
    ctx, itemId: item.itemId, warehouseId: input.destinationWarehouseId,
    transactionType: "TRANSFER_IN", transferDate: input.transferDate,
    qtyBefore: destResult.destBefore, qtyChange: item.quantity,
    entryQuantity: item.quantity, entryUnit: itemUnit,
    referenceId: transferId, referenceNo: transferNumber,
    notes: `Transfer from ${input.sourceWarehouseId}`,
  })
  if (inError) errors.push(inError)

  return errors
}

async function processAllItemTransfers(
  ctx: OrgContext,
  input: CreateTransferInput,
  transferId: string,
  transferNumber: string,
  sourceStockMap: Map<string, number>,
  unitMap: Map<string, string>,
): Promise<string[]> {
  const errors: string[] = []
  for (const item of input.items) {
    const itemErrors = await processTransferItem(ctx, item, input, transferId, transferNumber, sourceStockMap, unitMap)
    errors.push(...itemErrors)
  }
  return errors
}

export async function createStockTransfer(input: CreateTransferInput) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  const validationError = validateTransferInput(input)
  if (validationError) return { success: false as const, error: validationError }

  const itemIds = input.items.map(i => i.itemId)
  const sourceStockMap = await fetchSourceStockMap(ctx, input.sourceWarehouseId, itemIds)

  const insufficientError = await findInsufficientStockError(ctx, input.items, sourceStockMap)
  if (insufficientError) return { success: false as const, error: insufficientError }

  const transferNo = await generateTransferNumber(ctx)
  const recordResult = await insertTransferRecord(ctx, input, transferNo)
  if ("error" in recordResult) return { success: false as const, error: recordResult.error }

  const { id: transferId, transferNo: transferNumber } = recordResult

  const itemsError = await saveTransferItems(ctx, transferId, input.items)
  if (itemsError) return { success: false as const, error: itemsError }

  const unitMap = await fetchItemUnitMap(ctx, itemIds)

  const errors = await processAllItemTransfers(ctx, input, transferId, transferNumber, sourceStockMap, unitMap)
  if (errors.length > 0) {
    console.error("[StockTransfer] Partial errors:", errors)
    return { success: true as const, transferNo: transferNumber, transferId, warnings: errors }
  }

  revalidatePath("/inventory")
  revalidatePath("/godowns")
  return { success: true as const, transferNo: transferNumber, transferId }
}

export async function getStockTransfers(limit = 50, offset = 0): Promise<{ transfers: StockTransfer[]; total: number }> {
  const ctx = await getOrgContext()
  if (!ctx) return { transfers: [], total: 0 }

  const { data, error, count } = await ctx.supabase
    .from("stock_transfers")
    .select(`
      id, transfer_no, transfer_date, status, notes, created_by, created_at,
      source_warehouse_id,
      destination_warehouse_id,
      source:source_warehouse_id (name),
      destination:destination_warehouse_id (name),
      stock_transfer_items (
        id, item_id, quantity, notes,
        items:item_id (name, item_code, unit)
      )
    `, { count: "exact" })
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) return { transfers: [], total: 0 }

  const transfers: StockTransfer[] = (data as Array<Record<string, unknown>>).map(row => {
    const src = row.source as Record<string, unknown> | null
    const dest = row.destination as Record<string, unknown> | null
    const items = (row.stock_transfer_items as Array<Record<string, unknown>> | null) || []

    return {
      id: row.id as string,
      transferNo: row.transfer_no as string,
      transferDate: row.transfer_date as string,
      sourceWarehouseId: row.source_warehouse_id as string,
      sourceWarehouseName: (src?.name as string) || "",
      destinationWarehouseId: row.destination_warehouse_id as string,
      destinationWarehouseName: (dest?.name as string) || "",
      status: row.status as StockTransfer["status"],
      notes: (row.notes as string) || "",
      createdBy: (row.created_by as string) || "",
      createdAt: row.created_at as string,
      items: items.map(ti => {
        const item = ti.items as Record<string, unknown> | null
        return {
          id: ti.id as string,
          itemId: ti.item_id as string,
          itemName: (item?.name as string) || "",
          itemCode: (item?.item_code as string) || "",
          unit: (item?.unit as string) || "PCS",
          quantity: Number(ti.quantity) || 0,
          notes: (ti.notes as string) || "",
        }
      }),
    }
  })

  return { transfers, total: count || 0 }
}
