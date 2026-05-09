import { NextResponse } from 'next/server'
import { getRumours } from '@/lib/api'

export const revalidate = 30

export async function GET() {
  const rumours = await getRumours()
  return NextResponse.json({ rumours })
}
