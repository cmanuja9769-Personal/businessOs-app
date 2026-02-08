"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export interface Warehouse {
  id: string
  name: string
  code: string
  address: string
  phone: string
  contactPerson: string
  email: string
  capacityNotes: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  stockCount?: number
  stockValue?: number
  itemCount?: number
}

export interface WarehouseStockSummary {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  isActive: boolean
  isDefault: boolean
  totalItems: number
  totalQuantity: number
  totalValue: number
  lowStockItems: number
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

function mapWarehouseRow(row: Record<string, unknown>): Warehouse {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    code: (row.code as string) || "",
    address: (row.address as string) || "",
    phone: (row.phone as string) || "",
    contactPerson: (row.contact_person as string) || "",
    email: (row.email as string) || "",
    capacityNotes: (row.capacity_notes as string) || "",
    isDefault: Boolean(row.is_default),
    isActive: row.is_active !== false,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  }
}

export async function getWarehouses(includeInactive = false): Promise<Warehouse[]> {
  const ctx = await getOrgContext()
  if (!ctx) return []

  let query = ctx.supabase
    .from("warehouses")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (!includeInactive) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(mapWarehouseRow)
}

export async function getWarehouseById(warehouseId: string): Promise<Warehouse | null> {
  const ctx = await getOrgContext()
  if (!ctx) return null

  const { data, error } = await ctx.supabase
    .from("warehouses")
    .select("*")
    .eq("id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()

  if (error || !data) return null
  return mapWarehouseRow(data as Record<string, unknown>)
}

export async function getWarehouseStockSummaries(): Promise<WarehouseStockSummary[]> {
  const ctx = await getOrgContext()
  if (!ctx) return []

  const { data: warehouses } = await ctx.supabase
    .from("warehouses")
    .select("id, name, code, is_active, is_default")
    .eq("organization_id", ctx.organizationId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (!warehouses || warehouses.length === 0) return []

  const warehouseIds = warehouses.map((w: Record<string, unknown>) => w.id as string)

  const allStockRows: Array<Record<string, unknown>> = []
  const PAGE_SIZE = 1000
  let offset = 0
  while (true) {
    const { data: page, error: pageErr } = await ctx.supabase
      .from("item_warehouse_stock")
      .select("warehouse_id, quantity, item_id")
      .in("warehouse_id", warehouseIds)
      .eq("organization_id", ctx.organizationId)
      .range(offset, offset + PAGE_SIZE - 1)

    if (pageErr || !page || page.length === 0) break
    allStockRows.push(...(page as Array<Record<string, unknown>>))
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const stockMap = new Map<string, { totalQty: number; totalValue: number; items: Set<string>; lowStock: number }>()
  for (const wid of warehouseIds) {
    stockMap.set(wid, { totalQty: 0, totalValue: 0, items: new Set(), lowStock: 0 })
  }

  if (allStockRows.length > 0) {
    const itemIds = [...new Set(allStockRows.map(r => r.item_id as string))]

    const priceMap = new Map<string, { purchasePrice: number; salePrice: number; minStock: number }>()
    const BATCH = 50
    for (let i = 0; i < itemIds.length; i += BATCH) {
      const batch = itemIds.slice(i, i + BATCH)
      const { data: itemsData } = await ctx.supabase
        .from("items")
        .select("id, purchase_price, sale_price, min_stock")
        .in("id", batch)

      if (!itemsData) continue
      for (const item of itemsData as Array<Record<string, unknown>>) {
        priceMap.set(item.id as string, {
          purchasePrice: Number(item.purchase_price) || 0,
          salePrice: Number(item.sale_price) || 0,
          minStock: Number(item.min_stock) || 0,
        })
      }
    }

    for (const row of allStockRows) {
      const wid = row.warehouse_id as string
      const qty = Number(row.quantity) || 0
      const itemPrices = priceMap.get(row.item_id as string)
      const purchasePrice = itemPrices?.purchasePrice ?? 0
      const salePrice = itemPrices?.salePrice ?? 0
      const price = purchasePrice > 0 ? purchasePrice : salePrice
      const minStock = itemPrices?.minStock ?? 0
      const entry = stockMap.get(wid)
      if (!entry) continue
      entry.totalQty += qty
      entry.totalValue += qty * price
      entry.items.add(row.item_id as string)
      if (minStock > 0 && qty <= minStock) entry.lowStock++
    }
  }

  return warehouses.map((w: Record<string, unknown>) => {
    const entry = stockMap.get(w.id as string)
    return {
      warehouseId: w.id as string,
      warehouseName: w.name as string,
      warehouseCode: w.code as string,
      isActive: (w.is_active as boolean) !== false,
      isDefault: Boolean(w.is_default),
      totalItems: entry?.items.size || 0,
      totalQuantity: entry?.totalQty || 0,
      totalValue: Math.round((entry?.totalValue || 0) * 100) / 100,
      lowStockItems: entry?.lowStock || 0,
    }
  })
}

interface CreateWarehouseInput {
  name: string
  address?: string
  phone?: string
  contactPerson?: string
  email?: string
  capacityNotes?: string
  isDefault?: boolean
}

export async function createWarehouse(input: CreateWarehouseInput) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  const trimmedName = (input.name || "").trim()
  if (!trimmedName) return { success: false as const, error: "Warehouse name is required" }

  const { count } = await ctx.supabase
    .from("warehouses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)

  const code = `GDN${String((count ?? 0) + 1).padStart(4, "0")}`

  if (input.isDefault) {
    await ctx.supabase
      .from("warehouses")
      .update({ is_default: false })
      .eq("organization_id", ctx.organizationId)
      .eq("is_default", true)
  }

  const { data, error } = await ctx.supabase
    .from("warehouses")
    .insert({
      organization_id: ctx.organizationId,
      name: trimmedName,
      code,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      contact_person: input.contactPerson?.trim() || null,
      email: input.email?.trim() || null,
      capacity_notes: input.capacityNotes?.trim() || null,
      is_default: input.isDefault || false,
      is_active: true,
    })
    .select("*")
    .single()

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/inventory")
  revalidatePath("/godowns")
  return { success: true as const, warehouse: mapWarehouseRow(data as Record<string, unknown>) }
}

interface UpdateWarehouseInput {
  id: string
  name?: string
  address?: string
  phone?: string
  contactPerson?: string
  email?: string
  capacityNotes?: string
  isDefault?: boolean
}

export async function updateWarehouse(input: UpdateWarehouseInput) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  if (input.name !== undefined && !input.name.trim()) {
    return { success: false as const, error: "Warehouse name cannot be empty" }
  }

  if (input.isDefault) {
    await ctx.supabase
      .from("warehouses")
      .update({ is_default: false })
      .eq("organization_id", ctx.organizationId)
      .eq("is_default", true)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.address !== undefined) updates.address = input.address.trim() || null
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null
  if (input.contactPerson !== undefined) updates.contact_person = input.contactPerson.trim() || null
  if (input.email !== undefined) updates.email = input.email.trim() || null
  if (input.capacityNotes !== undefined) updates.capacity_notes = input.capacityNotes.trim() || null
  if (input.isDefault !== undefined) updates.is_default = input.isDefault

  const { data, error } = await ctx.supabase
    .from("warehouses")
    .update(updates)
    .eq("id", input.id)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single()

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/inventory")
  revalidatePath("/godowns")
  return { success: true as const, warehouse: mapWarehouseRow(data as Record<string, unknown>) }
}

export async function getWarehouseStockCount(warehouseId: string): Promise<{ totalItems: number; totalQuantity: number }> {
  const ctx = await getOrgContext()
  if (!ctx) return { totalItems: 0, totalQuantity: 0 }

  const { data } = await ctx.supabase
    .from("item_warehouse_stock")
    .select("quantity")
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .gt("quantity", 0)

  if (!data || data.length === 0) return { totalItems: 0, totalQuantity: 0 }

  const totalQuantity = (data as Array<{ quantity: number }>).reduce((sum, r) => sum + (r.quantity || 0), 0)
  return { totalItems: data.length, totalQuantity }
}

export async function softDeleteWarehouse(warehouseId: string) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  const { data: warehouse } = await ctx.supabase
    .from("warehouses")
    .select("id, name, is_default")
    .eq("id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()

  if (!warehouse) return { success: false as const, error: "Warehouse not found" }

  if ((warehouse as Record<string, unknown>).is_default) {
    return { success: false as const, error: "Cannot deactivate the default warehouse. Set another warehouse as default first." }
  }

  const stockInfo = await getWarehouseStockCount(warehouseId)
  if (stockInfo.totalQuantity > 0) {
    return {
      success: false as const,
      error: `Cannot deactivate warehouse: ${stockInfo.totalItems} items with ${stockInfo.totalQuantity} total quantity remaining. Transfer stock to another warehouse first.`,
      requiresTransfer: true,
      stockInfo,
    }
  }

  const { error } = await ctx.supabase
    .from("warehouses")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", warehouseId)
    .eq("organization_id", ctx.organizationId)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/inventory")
  revalidatePath("/godowns")
  return { success: true as const }
}

export async function reactivateWarehouse(warehouseId: string) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  const { error } = await ctx.supabase
    .from("warehouses")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", warehouseId)
    .eq("organization_id", ctx.organizationId)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/inventory")
  revalidatePath("/godowns")
  return { success: true as const }
}

export async function setDefaultWarehouse(warehouseId: string) {
  const ctx = await getOrgContext()
  if (!ctx) return { success: false as const, error: "No active organization found" }

  const { error } = await ctx.supabase
    .from("warehouses")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", warehouseId)
    .eq("organization_id", ctx.organizationId)
    .eq("is_active", true)

  if (error) return { success: false as const, error: error.message }

  const { error: resetError } = await ctx.supabase
    .from("warehouses")
    .update({ is_default: false })
    .eq("organization_id", ctx.organizationId)
    .eq("is_default", true)
    .neq("id", warehouseId)

  if (resetError) return { success: false as const, error: resetError.message }

  revalidatePath("/inventory")
  revalidatePath("/godowns")
  return { success: true as const }
}

export async function getWarehouseLowStockAlerts(warehouseId?: string) {
  const ctx = await getOrgContext()
  if (!ctx) return []

  let query = ctx.supabase
    .from("item_warehouse_stock")
    .select("item_id, warehouse_id, quantity, min_quantity, items:item_id (name, item_code, min_stock, unit), warehouses:warehouse_id (name)")
    .eq("organization_id", ctx.organizationId)

  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId)
  }

  const { data } = await query
  if (!data) return []

  const alerts: Array<{
    itemId: string
    itemName: string
    itemCode: string
    unit: string
    warehouseId: string
    warehouseName: string
    currentQty: number
    minQty: number
  }> = []

  for (const row of data as Array<Record<string, unknown>>) {
    const qty = Number(row.quantity) || 0
    const itemData = row.items as Record<string, unknown> | null
    const warehouseData = row.warehouses as Record<string, unknown> | null
    const minQty = Number(row.min_quantity) || Number(itemData?.min_stock) || 0
    if (minQty > 0 && qty <= minQty) {
      alerts.push({
        itemId: row.item_id as string,
        itemName: (itemData?.name as string) || "",
        itemCode: (itemData?.item_code as string) || "",
        unit: (itemData?.unit as string) || "PCS",
        warehouseId: row.warehouse_id as string,
        warehouseName: (warehouseData?.name as string) || "",
        currentQty: qty,
        minQty,
      })
    }
  }

  return alerts.sort((a, b) => (a.currentQty / a.minQty) - (b.currentQty / b.minQty))
}

export async function getDeadStockByWarehouse(warehouseId?: string, daysSinceMovement = 90) {
  const ctx = await getOrgContext()
  if (!ctx) return []

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceMovement)

  let stockQuery = ctx.supabase
    .from("item_warehouse_stock")
    .select("item_id, warehouse_id, quantity, items:item_id (name, item_code, purchase_price, sale_price, unit), warehouses:warehouse_id (name)")
    .eq("organization_id", ctx.organizationId)
    .gt("quantity", 0)

  if (warehouseId) {
    stockQuery = stockQuery.eq("warehouse_id", warehouseId)
  }

  const { data: stockRows } = await stockQuery
  if (!stockRows || stockRows.length === 0) return []

  const itemIds = [...new Set((stockRows as Array<Record<string, unknown>>).map(r => r.item_id as string))]

  const batchSize = 50
  const recentMovementItems = new Set<string>()

  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    const { data: ledgerRows } = await ctx.supabase
      .from("stock_ledger")
      .select("item_id")
      .in("item_id", batch)
      .eq("organization_id", ctx.organizationId)
      .gte("transaction_date", cutoffDate.toISOString())

    if (ledgerRows) {
      for (const r of ledgerRows as Array<Record<string, unknown>>) {
        recentMovementItems.add(r.item_id as string)
      }
    }
  }

  const deadStock: Array<{
    itemId: string
    itemName: string
    itemCode: string
    unit: string
    warehouseId: string
    warehouseName: string
    quantity: number
    value: number
  }> = []

  for (const row of stockRows as Array<Record<string, unknown>>) {
    if (recentMovementItems.has(row.item_id as string)) continue
    const itemData = row.items as Record<string, unknown> | null
    const warehouseData = row.warehouses as Record<string, unknown> | null
    const qty = Number(row.quantity) || 0
    const purchasePrice = Number(itemData?.purchase_price) || 0
    const salePrice = Number(itemData?.sale_price) || 0
    const price = purchasePrice > 0 ? purchasePrice : salePrice
    deadStock.push({
      itemId: row.item_id as string,
      itemName: (itemData?.name as string) || "",
      itemCode: (itemData?.item_code as string) || "",
      unit: (itemData?.unit as string) || "PCS",
      warehouseId: row.warehouse_id as string,
      warehouseName: (warehouseData?.name as string) || "",
      quantity: qty,
      value: Math.round(qty * price * 100) / 100,
    })
  }

  return deadStock.sort((a, b) => b.value - a.value)
}
