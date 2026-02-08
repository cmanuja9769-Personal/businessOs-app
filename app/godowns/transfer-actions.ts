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

export async function createStockTransfer(input: CreateTransferInput) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  if (input.sourceWarehouseId === input.destinationWarehouseId) {
    return { success: false as const, error: "Source and destination warehouse cannot be the same" }
  }

  if (!input.items || input.items.length === 0) {
    return { success: false as const, error: "At least one item is required for transfer" }
  }

  for (const item of input.items) {
    if (!item.itemId || item.quantity <= 0) {
      return { success: false as const, error: "All items must have valid quantity > 0" }
    }
  }

  const { data: sourceStockRows } = await ctx.supabase
    .from("item_warehouse_stock")
    .select("item_id, quantity")
    .eq("warehouse_id", input.sourceWarehouseId)
    .eq("organization_id", ctx.organizationId)
    .in("item_id", input.items.map(i => i.itemId))

  const sourceStockMap = new Map<string, number>()
  if (sourceStockRows) {
    for (const row of sourceStockRows as Array<Record<string, unknown>>) {
      sourceStockMap.set(row.item_id as string, Number(row.quantity) || 0)
    }
  }

  const insufficientItems: string[] = []
  for (const item of input.items) {
    const available = sourceStockMap.get(item.itemId) || 0
    if (available < item.quantity) {
      insufficientItems.push(item.itemId)
    }
  }

  if (insufficientItems.length > 0) {
    const { data: itemNames } = await ctx.supabase
      .from("items")
      .select("id, name")
      .in("id", insufficientItems)

    const names = (itemNames as Array<Record<string, unknown>> | null)?.map(i => i.name as string).join(", ") || "Some items"
    return { success: false as const, error: `Insufficient stock for: ${names}` }
  }

  const { count } = await ctx.supabase
    .from("stock_transfers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)

  const transferNo = `ST/${String((count ?? 0) + 1).padStart(4, "0")}`

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
    return { success: false as const, error: transferError?.message || "Failed to create transfer" }
  }

  const transferId = (transfer as Record<string, unknown>).id as string
  const transferNumber = (transfer as Record<string, unknown>).transfer_no as string

  const transferItems = input.items.map(item => ({
    transfer_id: transferId,
    item_id: item.itemId,
    quantity: item.quantity,
    notes: item.notes?.trim() || null,
  }))

  const { error: itemsError } = await ctx.supabase
    .from("stock_transfer_items")
    .insert(transferItems)

  if (itemsError) {
    await ctx.supabase.from("stock_transfers").delete().eq("id", transferId)
    return { success: false as const, error: `Failed to save transfer items: ${itemsError.message}` }
  }

  const itemIds = input.items.map(i => i.itemId)
  const { data: itemUnitsData } = await ctx.supabase
    .from("items")
    .select("id, unit")
    .in("id", itemIds)

  const unitMap = new Map<string, string>()
  if (itemUnitsData) {
    for (const row of itemUnitsData as Array<Record<string, unknown>>) {
      unitMap.set(row.id as string, (row.unit as string) || "PCS")
    }
  }

  const errors: string[] = []

  for (const item of input.items) {
    const sourceQty = sourceStockMap.get(item.itemId) || 0
    const newSourceQty = sourceQty - item.quantity
    const itemUnit = unitMap.get(item.itemId) || "PCS"

    const { error: srcError } = await ctx.supabase
      .from("item_warehouse_stock")
      .update({ quantity: newSourceQty })
      .eq("item_id", item.itemId)
      .eq("warehouse_id", input.sourceWarehouseId)
      .eq("organization_id", ctx.organizationId)

    if (srcError) {
      errors.push(`Source deduction failed for item ${item.itemId}: ${srcError.message}`)
      continue
    }

    const { data: destRow } = await ctx.supabase
      .from("item_warehouse_stock")
      .select("id, quantity")
      .eq("item_id", item.itemId)
      .eq("warehouse_id", input.destinationWarehouseId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle()

    if (destRow) {
      const newDestQty = (Number((destRow as Record<string, unknown>).quantity) || 0) + item.quantity
      const { error: destError } = await ctx.supabase
        .from("item_warehouse_stock")
        .update({ quantity: newDestQty })
        .eq("id", (destRow as Record<string, unknown>).id as string)

      if (destError) errors.push(`Destination add failed for item ${item.itemId}: ${destError.message}`)
    } else {
      const { error: destInsertError } = await ctx.supabase
        .from("item_warehouse_stock")
        .insert({
          item_id: item.itemId,
          warehouse_id: input.destinationWarehouseId,
          organization_id: ctx.organizationId,
          quantity: item.quantity,
        })

      if (destInsertError) errors.push(`Destination insert failed for item ${item.itemId}: ${destInsertError.message}`)
    }

    const { error: outError } = await ctx.supabase
      .from("stock_ledger")
      .insert({
        organization_id: ctx.organizationId,
        item_id: item.itemId,
        warehouse_id: input.sourceWarehouseId,
        transaction_type: "TRANSFER_OUT",
        transaction_date: input.transferDate,
        quantity_before: sourceQty,
        quantity_change: -item.quantity,
        quantity_after: newSourceQty,
        entry_quantity: item.quantity,
        entry_unit: itemUnit,
        base_quantity: item.quantity,
        reference_type: "transfer",
        reference_id: transferId,
        reference_no: transferNumber,
        notes: `Transfer to ${input.destinationWarehouseId}`,
        created_by: ctx.userId,
      })

    if (outError) errors.push(`Ledger OUT entry failed: ${outError.message}`)

    const destBefore = Number((destRow as Record<string, unknown> | null)?.quantity) || 0

    const { error: inError } = await ctx.supabase
      .from("stock_ledger")
      .insert({
        organization_id: ctx.organizationId,
        item_id: item.itemId,
        warehouse_id: input.destinationWarehouseId,
        transaction_type: "TRANSFER_IN",
        transaction_date: input.transferDate,
        quantity_before: destBefore,
        quantity_change: item.quantity,
        quantity_after: destBefore + item.quantity,
        entry_quantity: item.quantity,
        entry_unit: itemUnit,
        base_quantity: item.quantity,
        reference_type: "transfer",
        reference_id: transferId,
        reference_no: transferNumber,
        notes: `Transfer from ${input.sourceWarehouseId}`,
        created_by: ctx.userId,
      })

    if (inError) errors.push(`Ledger IN entry failed: ${inError.message}`)
  }

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
