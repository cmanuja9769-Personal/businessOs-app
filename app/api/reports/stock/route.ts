import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Stock Summary Report API
 * Provides comprehensive stock reporting with multiple filters
 * 
 * Query Parameters:
 * - includeZeroStock: boolean (default: false) - Include items with zero stock
 * - asOfDate: string (ISO date) - Show stock as of specific date
 * - warehouseIds: string (comma-separated UUIDs) - Filter by warehouses
 * - categories: string (comma-separated) - Filter by item categories
 * - stockStatus: 'all' | 'low' | 'surplus' - Filter by stock status
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
    const allItemsData: any[] = []
    let offset = 0
    const pageSize = 1000
    let pageNumber = 1

    console.log(`[Stock Report] Starting pagination for org: ${organizationId}`)

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
          current_stock,
          opening_stock,
          warehouse_id
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)

      const { data: itemsBatch, error: itemsError, count } = await itemsQuery

      if (itemsError) {
        console.error('Items query error:', itemsError)
        throw itemsError
      }

      console.log(`[Stock Report] Page ${pageNumber}: Fetched ${itemsBatch?.length || 0} items (offset: ${offset}, total count: ${count})`)

      if (!itemsBatch || itemsBatch.length === 0) {
        break
      }

      allItemsData.push(...itemsBatch)

      if (itemsBatch.length < pageSize) {
        console.log(`[Stock Report] Last page. Total fetched: ${allItemsData.length}, DB count: ${count}`)
        break // Last page
      }

      offset += pageSize
      pageNumber++
    }

    // Apply filters AFTER fetching all items to avoid pagination issues
    let itemsData = allItemsData
    
    if (categories.length > 0) {
      itemsData = itemsData.filter(item => categories.includes(item.category))
      console.log(`[Stock Report] After category filter: ${itemsData.length} items`)
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      itemsData = itemsData.filter(item => 
        item.name?.toLowerCase().includes(searchLower) || 
        item.item_code?.toLowerCase().includes(searchLower)
      )
      console.log(`[Stock Report] After search filter "${searchTerm}": ${itemsData.length} items`)
    }
    
    // Debug: Log total items and search details
    console.log(`[Stock Report] Total items from database: ${itemsData.length}, Search term: "${searchTerm}"`)
    
    // If searching, show first 10 matching items
    if (searchTerm && itemsData.length > 0) {
      console.log(`[Stock Report] First 10 matching items for "${searchTerm}":`, 
        itemsData.slice(0, 10).map(i => ({
          name: i.name,
          current_stock: i.current_stock,
          opening_stock: i.opening_stock
        }))
      )
    }
    
    // Debug: Log items with "Anil" or "Ground Chakkar" in name
    const anilItems = itemsData.filter(item => 
      item.name?.toLowerCase().includes('anil') || 
      item.name?.toLowerCase().includes('ground chakkar')
    )
    if (anilItems.length > 0) {
      console.log(`[Stock Report] Found Anil/Ground Chakkar items (${anilItems.length} total):`, 
        anilItems.slice(0, 20).map(i => ({
          name: i.name,
          current_stock: i.current_stock,
          opening_stock: i.opening_stock
        }))
      )
    } else {
      console.log(`[Stock Report] No Anil/Ground Chakkar items found in query results`)
    }
    
    // Debug: Log items that have opening_stock > 0 but current_stock = 0
    const itemsWithOpeningStock = itemsData.filter(item => (item.opening_stock || 0) > 0)
    console.log(`[Stock Report] Items with opening_stock > 0: ${itemsWithOpeningStock.length}`)
    if (itemsWithOpeningStock.length > 0 && itemsWithOpeningStock.length <= 20) {
      console.log(`[Stock Report] Items with opening_stock:`, itemsWithOpeningStock.map(i => ({
        name: i.name,
        current_stock: i.current_stock,
        opening_stock: i.opening_stock
      })))
    }
    
    // Debug: Log the most recently created items (might be the missing ones)
    const sortedByCreated = [...itemsData].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )
    console.log(`[Stock Report] Most recent 5 items:`, sortedByCreated.slice(0, 5).map(i => ({
      name: i.name,
      current_stock: i.current_stock,
      opening_stock: i.opening_stock,
      created: i.created_at
    })))

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
          surplusStockItems: 0
        }
      })
    }

    // Fetch all warehouses for this organization (for fallback name lookup)
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
    console.log(`[Stock Report] Fetched ${allWarehouses?.length || 0} warehouses for org`)

    // Fetch warehouse breakdown for all items (with pagination)
    const itemIds = itemsData.map(item => item.id)
    
    // Batch itemIds to avoid Supabase limits on IN clause
    // Using small batch size to prevent HeadersOverflowError
    const allWarehouseStocks: any[] = []
    const batchSize = 50 // Small batch size to prevent header overflow
    
    console.log(`[Stock Report] Fetching warehouse stocks for ${itemIds.length} items in batches of ${batchSize}`)
    
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

      // Filter by specific warehouses if provided
      if (warehouseIds.length > 0) {
        warehouseQuery = warehouseQuery.in('warehouse_id', warehouseIds)
      }

      const { data: warehouseBatch, error: warehouseError } = await warehouseQuery

      if (warehouseError) {
        console.error('Warehouse stocks query error:', warehouseError)
        // Continue without this batch
      } else if (warehouseBatch) {
        allWarehouseStocks.push(...warehouseBatch)
        // Debug: Log first few records to check the data structure
        if (i === 0 && warehouseBatch.length > 0) {
          console.log(`[Stock Report] Sample warehouse stock record:`, JSON.stringify(warehouseBatch[0], null, 2))
        }
      }
    }
    
    const warehouseStocks = allWarehouseStocks

    console.log(`[Stock Report] Total items fetched: ${itemsData.length}, Warehouse stock records: ${warehouseStocks.length}`)

    // Merge data and calculate stock status
    const enrichedData = itemsData.map(item => {
      const itemWarehouses = warehouseStocks?.filter(ws => ws.item_id === item.id) || []
      
      // Calculate stock: Use current_stock as the authoritative stock value
      // current_stock is updated by transactions, opening_stock is just initial value
      const warehouseTotal = itemWarehouses.reduce((sum, ws) => sum + (ws.quantity || 0), 0)
      
      const currentStock = item.current_stock || 0
      
      // Use current_stock directly - it's the actual stock value
      const calculated_stock = currentStock
      
      const stock_value = calculated_stock * (item.purchase_price || 0)
      
      // Determine stock status
      let stock_status_flag: 'low' | 'normal' | 'surplus' = 'normal'
      if (item.min_stock && item.min_stock > 0) {
        if (calculated_stock <= item.min_stock) {
          stock_status_flag = 'low'
        } else if (calculated_stock > item.min_stock * 3) {
          stock_status_flag = 'surplus'
        }
      } else if (calculated_stock === 0) {
        // Items with zero stock and no min_stock set should still be flagged
        stock_status_flag = 'low'
      }

      // Build locations array
      // Priority: Use item_warehouse_stock if available, otherwise fallback to items.warehouse_id
      let locations: Array<{ warehouseId: string; warehouseName: string; quantity: number; location: string }> = []
      
      if (itemWarehouses.length > 0) {
        // Use item_warehouse_stock data
        locations = itemWarehouses.map(ws => ({
          warehouseId: ws.warehouse_id,
          warehouseName: (ws.warehouses as { name?: string })?.name || warehouseNameById.get(ws.warehouse_id) || 'Unknown',
          quantity: ws.quantity || 0,
          location: ws.location || ''
        }))
      } else if (item.warehouse_id) {
        // Fallback: Use the warehouse_id from items table
        const warehouseName = warehouseNameById.get(item.warehouse_id) || 'Default'
        locations = [{
          warehouseId: item.warehouse_id,
          warehouseName: warehouseName,
          quantity: calculated_stock,
          location: ''
        }]
      }

      return {
        ...item,
        calculated_stock,
        stock_value: Math.round(stock_value * 100) / 100,
        stock_status_flag,
        locations
      }
    })

    // Log enriched data stats for debugging
    const itemsWithStock = enrichedData.filter(item => item.calculated_stock > 0).length
    const itemsWithZeroStock = enrichedData.filter(item => item.calculated_stock === 0).length
    const itemsWithLocations = enrichedData.filter(item => item.locations.length > 0).length
    const itemsWithoutLocations = enrichedData.filter(item => item.locations.length === 0).length
    console.log(`[Stock Report] Items with stock (current_stock > 0): ${itemsWithStock}, Items with zero stock: ${itemsWithZeroStock}`)
    console.log(`[Stock Report] Items with locations: ${itemsWithLocations}, Items without locations: ${itemsWithoutLocations}`)

    // Apply stock status filter
    let filteredData = enrichedData

    // Filter by zero stock if needed
    // Only include items where calculated_stock > 0
    if (!includeZeroStock) {
      const beforeFilter = filteredData.length
      filteredData = filteredData.filter(item => item.calculated_stock > 0)
      console.log(`[Stock Report] After zero-stock filter: ${filteredData.length} items (removed ${beforeFilter - filteredData.length})`)
    }

    // Filter by stock status
    if (stockStatus !== 'all') {
      filteredData = filteredData.filter(item => item.stock_status_flag === stockStatus)
      console.log(`[Stock Report] After status filter (${stockStatus}): ${filteredData.length} items`)
    }

    // Calculate summary statistics
    const totalItems = filteredData.length
    const totalStockValue = filteredData.reduce((sum, item) => sum + item.stock_value, 0)
    const lowStockItems = filteredData.filter(item => item.stock_status_flag === 'low').length
    const surplusStockItems = filteredData.filter(item => item.stock_status_flag === 'surplus').length

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
        surplusStockItems
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
