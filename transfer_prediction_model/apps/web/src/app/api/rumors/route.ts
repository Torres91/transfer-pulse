import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MOCK_RUMOURS } from '@/lib/mockData'

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ rumours: MOCK_RUMOURS })
  }

  const { data, error } = await supabase
    .from('rumour_items')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rumours: data })
}
