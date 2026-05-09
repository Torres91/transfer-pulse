import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MOCK_MARKETS } from '@/lib/mockData'

export async function GET() {
  if (!supabase) {
    // Phase 1: return mock data
    return NextResponse.json({ markets: MOCK_MARKETS })
  }

  const { data, error } = await supabase
    .from('markets')
    .select(`
      *,
      market_destinations (*),
      rumour_groups (sources)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ markets: data })
}
