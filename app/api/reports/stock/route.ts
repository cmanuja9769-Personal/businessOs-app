import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/authorize'

interface LedgerEntry {
  item_id: string
  warehouse_id: string | null
  quantity_change: number | null
}

interface StockReportItem {
  id: string
  item_code: string | null
  name: string
  category: string | null
  unit: string | null
  packaging_unit: string | null
  per_carton_quantity: number | null
  purchase_price: number | null
  sale_price: number | null
  min_stock: number | null
  current_stock: number | null
  opening_stock: number | null
  warehouse_id: string | null
}

interface WarehouseStockRow {
  item_id: string
  quantity: number | null
  location: string | null
  warehouse_id: string
  warehouses: { id: string; name: string }[] | null
}

interface ParsedParams {
  includeZeroStock: boolean
  asOfDate: string
  warehouseIds: string[]
  categories: string[]
  stockStatus: string
  searchTerm: string
  dateFrom: string
  dateTo: string
}

type DbClient = Awaited<ReturnType<typeof authorize>>['supabase']

const BATCH_SIZE = 50
const PAGE_SIZE = 1000

function parseQueryParams(searchParams: URLSearchParams): ParsedParams {
  return {
    includeZeroStock: searchParams.get('includeZeroStock') === 'true',
    asOfDate: searchParams.get('asOfDate') || new Date().toISOString(),
    warehouseIds: searchParams.get('warehouseIds')?.split(',').filter(Boolean) || [],
    categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    stockStatus: searchParams.get('stockStatus') || 'all',
    searchTerm: searchParams.get('searchTerm') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  }
}

function processLedgerEntries(
  entries: LedgerEntry[],
  postDateItemChanges: Map<string, number>,
  postDateWarehouseChanges: Map<string, Map<string, number>>
) {
  for (const entry of entries) {
    const prev = postDateItemChanges.get(entry.item_id) || 0
    postDateItemChanges.set(entry.item_id, prev + (entry.quantity_change || 0))

    if (!entry.warehouse_id) continue

    if (!postDateWarehouseChanges.has(entry.item_id)) {
      postDateWarehouseChanges.set(entry.item_id, new Map())
    }
    const whMap = postDateWarehouseChanges.get(entry.item_id)!
    const whPrev = whMap.get(entry.warehouse_id) || 0
    whMap.set(entry.warehouse_id, whPrev + (entry.quantity_change || 0))
  }
}

async function fetchAllItems(supabase: DbClient, organizationId: string): Promise<StockReportItem[]> {
  const allItemsData: StockReportItem[] = []
  let offset = 0

  while (true) {
    const { data: itemsBatch, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        item_code,
        name,
        category,
        unit,
        packaging_unit,
        per_carton_quantity,
        purchase_price,
        sale_price,
        min_stock,
        current_stock,
        opening_stock,
        warehouse_id
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (itemsError) throw itemsError
    if (!itemsBatch || itemsBatch.length === 0) break

    allItemsData.push(...itemsBatch)
    if (itemsBatch.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allItemsData
}

function applyItemFilters(items: StockReportItem[], categories: string[], searchTerm: string): StockReportItem[] {
  let filtered = items

  if (categories.length > 0) {
    filtered = filtered.filter(item => item.category !== null && categories.includes(item.category))
  }

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase()
    filtered = filtered.filter(item =>
      item.name?.toLowerCase().includes(searchLower) ||
      item.item_code?.toLowerCase().includes(searchLower)
    )
  }

  return filtered
}

function buildEmptyResponse(params: ParsedParams) {
  return NextResponse.json({
    success: true,
    data: [],
    filters: {
      includeZeroStock: params.includeZeroStock,
      asOfDate: params.asOfDate,
      warehouseIds: params.warehouseIds,
      categories: params.categories,
      stockStatus: params.stockStatus,
      searchTerm: params.searchTerm,
    },
    summary: {
      totalItems: 0,
      totalStockValue: 0,
      lowStockItems: 0,
      overstockItems: 0,
    },
  })
}

async function fetchWarehouseNameMap(supabase: DbClient, organizationId: string): Promise<Map<string, string>> {
  const { data: allWarehouses } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('organization_id', organizationId)

  const map = new Map<string, string>()
  if (allWarehouses) {
    for (const wh of allWarehouses) {
      map.set(wh.id, wh.name)
    }
  }
  return map
}

async function fetchWarehouseStocks(
  supabase: DbClient,
  organizationId: string,
  itemIds: string[],
  warehouseIds: string[]
): Promise<WarehouseStockRow[]> {
  const allWarehouseStocks: WarehouseStockRow[] = []

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batchIds = itemIds.slice(i, i + BATCH_SIZE)

    let warehouseQuery = supabase
      .from('item_warehouse_stock')
      .select(`
        item_id,
        quantity,
        location,
        warehouse_id,
        warehouses:warehouse_id (
          id,
          name
        )
      `)
      .in('item_id', batchIds)
      .eq('organization_id', organizationId)

    if (warehouseIds.length > 0) {
      warehouseQuery = warehouseQuery.in('warehouse_id', warehouseIds)
    }

    const { data: warehouseBatch, error: warehouseError } = await warehouseQuery

    if (!warehouseError && warehouseBatch) {
      allWarehouseStocks.push(...warehouseBatch)
    }
  }

  return allWarehouseStocks
}

async function fetchHistoricalAdjustments(
  supabase: DbClient,
  organizationId: string,
  itemIds: string[],
  asOfDateStr: string
): Promise<{ postDateItemChanges: Map<string, number>; postDateWarehouseChanges: Map<string, Map<string, number>> }> {
  const postDateItemChanges = new Map<string, number>()
  const postDateWarehouseChanges = new Map<string, Map<string, number>>()

  const todayStr = new Date().toISOString().split('T')[0]
  if (asOfDateStr >= todayStr) {
    return { postDateItemChanges, postDateWarehouseChanges }
  }

  const nextDay = new Date(asOfDateStr + 'T00:00:00')
  nextDay.setDate(nextDay.getDate() + 1)
  const nextDayStr = nextDay.toISOString().split('T')[0]

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batchIds = itemIds.slice(i, i + BATCH_SIZE)
    const { data: ledgerBatch } = await supabase
      .from('stock_ledger')
      .select('item_id, warehouse_id, quantity_change')
      .in('item_id', batchIds)
      .eq('organization_id', organizationId)
      .gte('transaction_date', nextDayStr)

    if (ledgerBatch) {
      processLedgerEntries(ledgerBatch, postDateItemChanges, postDateWarehouseChanges)
    }
  }

  return { postDateItemChanges, postDateWarehouseChanges }
}

function calculateItemStock(
  item: StockReportItem,
  itemWarehouses: WarehouseStockRow[],
  warehouseIds: string[],
  postDateItemChanges: Map<string, number>,
  postDateWarehouseChanges: Map<string, Map<string, number>>
): number {
  if (warehouseIds.length > 0) {
    return itemWarehouses.reduce((sum, ws) => {
      const whAdj = postDateWarehouseChanges.get(item.id)?.get(ws.warehouse_id) || 0
      return sum + ((ws.quantity || 0) - whAdj)
    }, 0)
  }
  return (item.current_stock || 0) - (postDateItemChanges.get(item.id) || 0)
}

function calculateStockStatus(calculatedStock: number, minStock: number): 'low' | 'normal' | 'high' {
  if (calculatedStock <= minStock) return 'low'
  const maxStock = minStock > 0 ? minStock * 3 : 0
  if (maxStock > 0 && calculatedStock >= maxStock) return 'high'
  return 'normal'
}

function getUnitPrice(item: StockReportItem): number {
  if ((item.purchase_price || 0) > 0) return item.purchase_price!
  return item.sale_price || 0
}

function buildLocations(
  itemWarehouses: WarehouseStockRow[],
  warehouseNameById: Map<string, string>
): Array<{ warehouseId: string; warehouseName: string; quantity: number; location: string }> {
  return itemWarehouses.map(ws => ({
    warehouseId: ws.warehouse_id,
    warehouseName: (ws.warehouses as { name?: string }[] | null)?.[0]?.name || warehouseNameById.get(ws.warehouse_id) || 'Unknown',
    quantity: ws.quantity || 0,
    location: ws.location || '',
  }))
}

function enrichItems(
  itemsData: StockReportItem[],
  warehouseStocks: WarehouseStockRow[],
  warehouseIds: string[],
  postDateItemChanges: Map<string, number>,
  postDateWarehouseChanges: Map<string, Map<string, number>>,
  warehouseNameById: Map<string, string>
) {
  return itemsData.map(item => {
    const itemWarehouses = warehouseStocks.filter(ws => ws.item_id === item.id)
    const calculated_stock = calculateItemStock(item, itemWarehouses, warehouseIds, postDateItemChanges, postDateWarehouseChanges)
    const stock_value = Math.round(calculated_stock * getUnitPrice(item) * 100) / 100
    const stock_status_flag = calculateStockStatus(calculated_stock, item.min_stock || 0)
    const locations = buildLocations(itemWarehouses, warehouseNameById)

    return {
      ...item,
      itemId: item.id,
      calculated_stock,
      stock_value,
      stock_status_flag,
      locations,
      totalIn: 0,
      totalOut: 0,
    }
  })
}

function accumulateMovements(
  movementMap: Map<string, { totalIn: number; totalOut: number }>,
  entries: Array<{ item_id: string; quantity_change: number | null }>
) {
  for (const entry of entries) {
    const existing = movementMap.get(entry.item_id) || { totalIn: 0, totalOut: 0 }
    const qty = entry.quantity_change || 0
    if (qty > 0) {
      existing.totalIn += qty
    } else {
      existing.totalOut += Math.abs(qty)
    }
    movementMap.set(entry.item_id, existing)
  }
}

async function fetchMovementMap(
  supabase: DbClient,
  organizationId: string,
  itemIds: string[],
  dateFrom: string,
  dateTo: string,
  warehouseIds: string[]
): Promise<Map<string, { totalIn: number; totalOut: number }>> {
  const movementMap = new Map<string, { totalIn: number; totalOut: number }>()

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batchIds = itemIds.slice(i, i + BATCH_SIZE)
    let ledgerQuery = supabase
      .from('stock_ledger')
      .select('item_id, quantity_change')
      .in('item_id', batchIds)
      .eq('organization_id', organizationId)
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo + 'T23:59:59')

    if (warehouseIds.length > 0) {
      ledgerQuery = ledgerQuery.in('warehouse_id', warehouseIds)
    }

    const { data: ledgerBatch } = await ledgerQuery
    if (!ledgerBatch) continue

    accumulateMovements(movementMap, ledgerBatch)
  }

  return movementMap
}

function applyMovementsToItems(
  enrichedData: Array<{ id: string; totalIn: number; totalOut: number }>,
  movementMap: Map<string, { totalIn: number; totalOut: number }>
) {
  for (const item of enrichedData) {
    const movement = movementMap.get(item.id)
    if (!movement) continue
    item.totalIn = movement.totalIn
    item.totalOut = movement.totalOut
  }
}

function applyStockFilters<T extends { calculated_stock: number; stock_status_flag: string }>(
  data: T[],
  includeZeroStock: boolean,
  stockStatus: string
): T[] {
  let filtered = data
  if (!includeZeroStock) {
    filtered = filtered.filter(item => item.calculated_stock > 0)
  }
  if (stockStatus !== 'all') {
    filtered = filtered.filter(item => item.stock_status_flag === stockStatus)
  }
  return filtered
}

function calculateSummary(filteredData: Array<{ stock_value: number; stock_status_flag: string }>) {
  return {
    totalItems: filteredData.length,
    totalStockValue: Math.round(filteredData.reduce((sum, item) => sum + item.stock_value, 0) * 100) / 100,
    lowStockItems: filteredData.filter(item => item.stock_status_flag === 'low').length,
    overstockItems: filteredData.filter(item => item.stock_status_flag === 'high').length,
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, organizationId } = await authorize('items', 'read')
    const params = parseQueryParams(request.nextUrl.searchParams)

    const allItemsData = await fetchAllItems(supabase, organizationId)
    const itemsData = applyItemFilters(allItemsData, params.categories, params.searchTerm)

    if (itemsData.length === 0) {
      return buildEmptyResponse(params)
    }

    const itemIds = itemsData.map(item => item.id)
    const asOfDateStr = (params.asOfDate || '').split('T')[0] || new Date().toISOString().split('T')[0]

    const warehouseNameById = await fetchWarehouseNameMap(supabase, organizationId)
    const warehouseStocks = await fetchWarehouseStocks(supabase, organizationId, itemIds, params.warehouseIds)
    const { postDateItemChanges, postDateWarehouseChanges } = await fetchHistoricalAdjustments(supabase, organizationId, itemIds, asOfDateStr)

    const enrichedData = enrichItems(itemsData, warehouseStocks, params.warehouseIds, postDateItemChanges, postDateWarehouseChanges, warehouseNameById)

    if (params.dateFrom && params.dateTo) {
      const movementMap = await fetchMovementMap(supabase, organizationId, enrichedData.map(i => i.id), params.dateFrom, params.dateTo, params.warehouseIds)
      applyMovementsToItems(enrichedData, movementMap)
    }

    const filteredData = applyStockFilters(enrichedData, params.includeZeroStock, params.stockStatus)

    return NextResponse.json({
      success: true,
      data: filteredData,
      filters: {
        includeZeroStock: params.includeZeroStock,
        asOfDate: params.asOfDate,
        warehouseIds: params.warehouseIds,
        categories: params.categories,
        stockStatus: params.stockStatus,
        searchTerm: params.searchTerm,
      },
      summary: calculateSummary(filteredData),
    })
  } catch (error) {
    const message = extractErrorMessage(error)
    console.error('Stock report API error:', message)
    return NextResponse.json(
      { error: 'Failed to generate stock report', details: message },
      { status: 500 }
    )
  }
}
