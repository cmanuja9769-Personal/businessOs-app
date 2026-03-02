import { NextResponse } from 'next/server'
import { authorize } from '@/lib/authorize'

export async function GET() {
  try {
    await authorize('items', 'read')

    return NextResponse.json([])

  } catch (error) {
    console.error('Failed to fetch brands:', error)
    return NextResponse.json([])
  }
}
