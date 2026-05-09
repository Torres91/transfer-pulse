import { getMarket, getMarkets } from '@/lib/api'
import { MarketDetail } from '@/components/MarketDetail'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

// Re-validate every 60 seconds so new markets appear without a full redeploy
export const revalidate = 60

export async function generateStaticParams() {
  const markets = await getMarkets()
  return markets.map(m => ({ id: m.id }))
}

export default async function MarketPage({ params }: Props) {
  const market = await getMarket(params.id)
  if (!market) notFound()

  return <MarketDetail market={market} />
}
