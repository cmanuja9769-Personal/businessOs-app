import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/warehouses
 * Returns a list of warehouses for the current organization
 */
export async function GET() {
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

    // Fetch warehouses
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, code, address, phone, is_default')
      .eq('organization_id', orgData.organization_id)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Failed to fetch warehouses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warehouses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
