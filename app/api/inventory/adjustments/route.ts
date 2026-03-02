import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/authorize'
import { createAdjustment, getAdjustments } from '@/lib/adjustment-management'

export async function GET(_request: NextRequest) {
  try {
    const { organizationId } = await authorize('items', 'read')

    const adjustments = await getAdjustments(organizationId)
    return NextResponse.json({ success: true, data: adjustments })
  } catch (error) {
    console.error('Get adjustments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch adjustments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, organizationId, userId } = await authorize('items', 'update')

    const body = await request.json()
    const { itemId, quantity, adjustmentType, reason, notes, warehouseId } = body

    if (!itemId || !quantity || !adjustmentType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let targetWarehouseId = warehouseId
    if (!targetWarehouseId) {
      const { data: item } = await supabase
        .from('items')
        .select('warehouse_id, packaging_unit')
        .eq('id', itemId)
        .single()
      
      if (!item?.warehouse_id) {
        return NextResponse.json(
          { error: 'No warehouse specified and item has no default warehouse' },
          { status: 400 }
        )
      }
      
      targetWarehouseId = item.warehouse_id
    }

    const { modifyStockWithLedger } = await import('@/app/items/stock-actions')

    const { data: itemDetails } = await supabase
      .from('items')
      .select('unit, packaging_unit')
      .eq('id', itemId)
      .single()
    const entryUnit = itemDetails?.packaging_unit || itemDetails?.unit || 'PCS'
    
    const result = await modifyStockWithLedger(
      itemId,
      targetWarehouseId,
      Number(quantity),
      entryUnit,
      adjustmentType === 'increase' ? 'ADD' : 'REDUCE',
      reason,
      notes
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Create adjustment record with "approved" status since stock is already modified
    const adjustmentResult = await createAdjustment(
      organizationId,
      {
        itemId,
        quantity: Number(quantity),
        adjustmentType,
        reason,
        notes,
      },
      userId
    )

    return NextResponse.json({ 
      success: true, 
      adjustment: adjustmentResult.adjustment,
      newStock: result.newStock,
      quantityBefore: result.quantityBefore,
      quantityAfter: result.quantityAfter
    })
  } catch (error) {
    console.error('Create adjustment error:', error)
    return NextResponse.json(
      { error: 'Failed to create adjustment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
