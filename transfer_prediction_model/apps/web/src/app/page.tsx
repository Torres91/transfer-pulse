import { MarketList } from '@/components/MarketList'
import { RumourFeed } from '@/components/RumourFeed'

export default function Home() {
  return (
    <div className="flex gap-6">
      {/* Main markets column */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            Transfer Markets
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            3-source verified rumours only. Bet on who signs where.
          </p>
        </div>

        <MarketList />
      </div>

      {/* Rumour feed sidebar */}
      <aside className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-6">
          <RumourFeed />
        </div>
      </aside>
    </div>
  )
}
