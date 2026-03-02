import { NextResponse } from 'next/server'
import { authorize } from '@/lib/authorize'

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize('items', 'read')

    const { data, error } = await supabase
      .from('items')
      .select('category')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
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
