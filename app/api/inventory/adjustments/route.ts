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

    const { data: orgData } = await supabase
      .from('app_user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

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

    const { data: orgData } = await supabase
      .from('app_user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!orgData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await request.json()
    const { itemId, quantity, adjustmentType, reason, notes } = body

    if (!itemId || !quantity || !adjustmentType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create adjustment
    const result = await createAdjustment(
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

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Auto-approve and update stock immediately
    if (result.adjustment) {
      const approveResult = await approveAdjustment(result.adjustment.id, user.id)
      
      if (!approveResult.success) {
        return NextResponse.json({ error: approveResult.error }, { status: 400 })
      }

      // Update item stock
      const stockChange = adjustmentType === 'increase' ? quantity : -quantity
      const { error: updateError } = await supabase.rpc('update_item_stock', {
        p_item_id: itemId,
        p_quantity_change: stockChange
      })

      if (updateError) {
        // Try direct update as fallback
        const { data: item } = await supabase
          .from('items')
          .select('current_stock')
          .eq('id', itemId)
          .single()

        if (item) {
          await supabase
            .from('items')
            .update({ current_stock: item.current_stock + stockChange })
            .eq('id', itemId)
        }
      }
    }

    return NextResponse.json({ success: true, adjustment: result.adjustment })
  } catch (error) {
    console.error('Create adjustment error:', error)
    return NextResponse.json(
      { error: 'Failed to create adjustment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
