import { NextResponse } from 'next/server'
import { authorize } from '@/lib/authorize'

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize('items', 'read')

    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, code, address, phone, is_default')
      .eq('organization_id', organizationId)
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
