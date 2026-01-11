import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/items/brands
 * Returns a list of distinct brands from items table
 * Note: Brand column may not exist in all schemas - returns empty array if so
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

    // Brand column doesn't exist in items table - return empty array
    // This endpoint is kept for future compatibility if brand is added
    return NextResponse.json([])

  } catch (error) {
    console.error('Failed to fetch brands:', error)
    return NextResponse.json([])
  }
}
