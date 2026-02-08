import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdjustment, approveAdjustment, getAdjustments } from '@/lib/adjustment-management'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgRows } = await supabase
      .from('app_user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const orgData = orgRows?.[0]

    if (!orgData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const adjustments = await getAdjustments(orgData.organization_id)
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
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgRows } = await supabase
      .from('app_user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const orgData = orgRows?.[0]

    if (!orgData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await request.json()
    const { itemId, quantity, adjustmentType, reason, notes, warehouseId } = body

    if (!itemId || !quantity || !adjustmentType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get item details to determine warehouse if not provided
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

    // Use the new modifyStockWithLedger function for atomic operations
    const { modifyStockWithLedger } = await import('@/app/items/actions')

    // Look up the item's actual unit
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
      orgData.organization_id,
      {
        itemId,
        quantity: Number(quantity),
        adjustmentType,
        reason,
        notes,
      },
      user.id
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
