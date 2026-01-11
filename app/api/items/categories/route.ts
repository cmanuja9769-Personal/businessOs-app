import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/items/categories
 * Returns a list of distinct categories from items table
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

    // Fetch distinct categories
    const { data, error } = await supabase
      .from('items')
      .select('category')
      .eq('organization_id', orgData.organization_id)
      .not('category', 'is', null)
      .order('category', { ascending: true })

    if (error) {
      throw error
    }

    // Extract unique categories
    const categories = [...new Set(data.map(item => item.category).filter(Boolean))]

    return NextResponse.json(categories)

  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
