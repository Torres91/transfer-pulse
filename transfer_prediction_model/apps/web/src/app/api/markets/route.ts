import { NextResponse } from 'next/server'
import { getMarkets } from '@/lib/api'

export const revalidate = 30

export async function GET() {
  const markets = await getMarkets()
  return NextResponse.json({ markets })
}
