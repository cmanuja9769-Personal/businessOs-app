import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface StockReportItem {
  id: string
  item_code: string | null
  name: string
  category: string | null
  unit: string | null
  packaging_unit: string | null
  per_carton_quantity: number | null
  purchase_price: number | null
  min_stock: number | null
  max_stock: number | null
  current_stock: number | null
  opening_stock: number | null
  warehouse_id: string | null
}

interface WarehouseStockRow {
  item_id: string
  quantity: number | null
  location: string | null
  warehouse_id: string
  warehouses: { id: string; name: string } | null
}

/**
 * Stock Summary Report API
 * Provides comprehensive stock reporting with multiple filters
 * 
 * Query Parameters:
 * - includeZeroStock: boolean (default: false) - Include items with zero stock
 * - asOfDate: string (ISO date) - Show stock as of specific date
 * - warehouseIds: string (comma-separated UUIDs) - Filter by warehouses
 * - categories: string (comma-separated) - Filter by item categories
 * - stockStatus: 'all' | 'low' | 'high' - Filter by stock status
 * - searchTerm: string - Search in item name/code
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgData } = await supabase
      .from('app_user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!orgData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const organizationId = orgData.organization_id

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const includeZeroStock = searchParams.get('includeZeroStock') === 'true'
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString()
    const warehouseIds = searchParams.get('warehouseIds')?.split(',').filter(Boolean) || []
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const stockStatus = searchParams.get('stockStatus') || 'all'
    const searchTerm = searchParams.get('searchTerm') || ''

    // Fetch ALL items using pagination (Supabase has 1000 row limit)
    // NOTE: Do NOT apply filters inside pagination loop as it causes skipped items
    // NOTE: Use stable sort (name + id) to prevent items being skipped during pagination
    const allItemsData: StockReportItem[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const itemsQuery = supabase
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
          min_stock,
          max_stock,
          current_stock,
          opening_stock,
          warehouse_id
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)

      const { data: itemsBatch, error: itemsError } = await itemsQuery

      if (itemsError) {
        throw itemsError
      }

      if (!itemsBatch || itemsBatch.length === 0) {
        break
      }

      allItemsData.push(...itemsBatch)

      if (itemsBatch.length < pageSize) {
        break
      }

      offset += pageSize
    }

    // Apply filters AFTER fetching all items to avoid pagination issues
    let itemsData = allItemsData
    
    if (categories.length > 0) {
      itemsData = itemsData.filter(item => categories.includes(item.category))
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      itemsData = itemsData.filter(item => 
        item.name?.toLowerCase().includes(searchLower) || 
        item.item_code?.toLowerCase().includes(searchLower)
      )
    }

    if (!itemsData || itemsData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        filters: {
          includeZeroStock,
          asOfDate,
          warehouseIds,
          categories,
          stockStatus,
          searchTerm
        },
        summary: {
          totalItems: 0,
          totalStockValue: 0,
          lowStockItems: 0,
          overstockItems: 0
        }
      })
    }

    const { data: allWarehouses } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('organization_id', organizationId)
    
    const warehouseNameById = new Map<string, string>()
    if (allWarehouses) {
      for (const wh of allWarehouses) {
        warehouseNameById.set(wh.id, wh.name)
      }
    }

    const itemIds = itemsData.map(item => item.id)
    const batchSize = 50

    const allWarehouseStocks: WarehouseStockRow[] = []
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batchIds = itemIds.slice(i, i + batchSize)
      
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

      if (warehouseError) {
        // Continue without this batch
      } else if (warehouseBatch) {
        allWarehouseStocks.push(...warehouseBatch)
      }
    }
    
    const warehouseStocks = allWarehouseStocks

    const todayStr = new Date().toISOString().split('T')[0]
    const asOfDateStr = (asOfDate || '').split('T')[0] || todayStr
    const isHistorical = asOfDateStr < todayStr

    const postDateItemChanges = new Map<string, number>()
    const postDateWarehouseChanges = new Map<string, Map<string, number>>()

    if (isHistorical) {
      const nextDay = new Date(asOfDateStr + 'T00:00:00')
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split('T')[0]

      for (let i = 0; i < itemIds.length; i += batchSize) {
        const batchIds = itemIds.slice(i, i + batchSize)
        const { data: ledgerBatch } = await supabase
          .from('stock_ledger')
          .select('item_id, warehouse_id, quantity_change')
          .in('item_id', batchIds)
          .eq('organization_id', organizationId)
          .gte('transaction_date', nextDayStr)

        if (ledgerBatch) {
          for (const entry of ledgerBatch) {
            const prev = postDateItemChanges.get(entry.item_id) || 0
            postDateItemChanges.set(entry.item_id, prev + (entry.quantity_change || 0))

            if (entry.warehouse_id) {
              if (!postDateWarehouseChanges.has(entry.item_id)) {
                postDateWarehouseChanges.set(entry.item_id, new Map())
              }
              const whMap = postDateWarehouseChanges.get(entry.item_id)!
              const whPrev = whMap.get(entry.warehouse_id) || 0
              whMap.set(entry.warehouse_id, whPrev + (entry.quantity_change || 0))
            }
          }
        }
      }
    }

    const enrichedData = itemsData.map(item => {
      const itemWarehouses = warehouseStocks?.filter(ws => ws.item_id === item.id) || []
      const currentStock = item.current_stock || 0
      const postDateAdj = postDateItemChanges.get(item.id) || 0

      let calculated_stock: number

      if (warehouseIds.length > 0) {
        const warehouseTotal = itemWarehouses.reduce((sum, ws) => {
          const whAdj = postDateWarehouseChanges.get(item.id)?.get(ws.warehouse_id) || 0
          return sum + ((ws.quantity || 0) - whAdj)
        }, 0)
        calculated_stock = warehouseTotal
      } else {
        calculated_stock = currentStock - postDateAdj
      }
      
      const stock_value = calculated_stock * (item.purchase_price || 0)
      
      let stock_status_flag: 'low' | 'normal' | 'high' = 'normal'
      const minStock = item.min_stock || 0
      const maxStock = item.max_stock || 0
      if (calculated_stock <= minStock) {
        stock_status_flag = 'low'
      } else if (maxStock > 0 && calculated_stock >= maxStock) {
        stock_status_flag = 'high'
      }

      // Build locations array
      // Priority: Use item_warehouse_stock if available, otherwise fallback to items.warehouse_id
      let locations: Array<{ warehouseId: string; warehouseName: string; quantity: number; location: string }> = []
      
      if (itemWarehouses.length > 0) {
        locations = itemWarehouses.map(ws => ({
          warehouseId: ws.warehouse_id,
          warehouseName: (ws.warehouses as { name?: string })?.name || warehouseNameById.get(ws.warehouse_id) || 'Unknown',
          quantity: ws.quantity || 0,
          location: ws.location || ''
        }))
      }

      return {
        ...item,
        calculated_stock,
        stock_value: Math.round(stock_value * 100) / 100,
        stock_status_flag,
        locations
      }
    })

    // Apply stock status filter
    let filteredData = enrichedData

    // Filter by zero stock if needed
    // Only include items where calculated_stock > 0
    if (!includeZeroStock) {
      filteredData = filteredData.filter(item => item.calculated_stock > 0)
    }

    // Filter by stock status
    if (stockStatus !== 'all') {
      filteredData = filteredData.filter(item => item.stock_status_flag === stockStatus)
    }

    // Calculate summary statistics
    const totalItems = filteredData.length
    const totalStockValue = filteredData.reduce((sum, item) => sum + item.stock_value, 0)
    const lowStockItems = filteredData.filter(item => item.stock_status_flag === 'low').length
    const overstockItems = filteredData.filter(item => item.stock_status_flag === 'high').length

    return NextResponse.json({
      success: true,
      data: filteredData,
      filters: {
        includeZeroStock,
        asOfDate,
        warehouseIds,
        categories,
        stockStatus,
        searchTerm
      },
      summary: {
        totalItems,
        totalStockValue: Math.round(totalStockValue * 100) / 100,
        lowStockItems,
        overstockItems
      }
    })

  } catch (error) {
    console.error('Stock report API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate stock report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
