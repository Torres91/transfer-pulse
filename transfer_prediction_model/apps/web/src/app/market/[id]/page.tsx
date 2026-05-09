import { MOCK_MARKETS } from '@/lib/mockData'
import { MarketDetail } from '@/components/MarketDetail'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return MOCK_MARKETS.map(m => ({ id: m.id }))
}

export default function MarketPage({ params }: Props) {
  const market = MOCK_MARKETS.find(m => m.id === params.id)
  if (!market) notFound()

  return <MarketDetail market={market} />
}
