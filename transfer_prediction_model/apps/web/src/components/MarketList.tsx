'use client'

import { useState, useMemo } from 'react'
import { MOCK_MARKETS } from '@/lib/mockData'
import { MarketCard } from './MarketCard'
import { cn } from '@/lib/utils'
import type { MarketStatus, MarketType } from '@/lib/types'

type FilterId = 'All' | MarketStatus | MarketType

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'All',           label: 'All' },
  { id: 'live',          label: 'Live' },
  { id: 'pending',       label: 'Pending' },
  { id: 'binary',        label: 'Yes / No' },
  { id: 'fee_over_under',label: 'Fee' },
  { id: 'destination',   label: 'Destination' },
  { id: 'deadline',      label: 'Deadline' },
]

export function MarketList() {
  const [filter, setFilter] = useState<FilterId>('All')

  const allMarkets = MOCK_MARKETS

  const filtered = useMemo(() => {
    if (filter === 'All') return allMarkets
    // Status filters
    if (filter === 'live' || filter === 'pending' || filter === 'closed' || filter === 'resolved' || filter === 'cancelled') {
      return allMarkets.filter(m => m.status === filter)
    }
    // Type filters
    return allMarkets.filter(m => m.marketType === filter)
  }, [allMarkets, filter])

  const live    = filtered.filter(m => m.status === 'live')
  const pending = filtered.filter(m => m.status === 'pending')

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              filter === f.id
                ? 'bg-accent-green text-bg-primary border-accent-green'
                : 'bg-bg-card text-text-secondary hover:text-text-primary border-bg-border hover:border-accent-green/40',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">⚽</p>
          <p className="text-sm">No markets match this filter.</p>
        </div>
      )}

      <div className="space-y-6">
        {live.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Live Markets ({live.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {live.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-accent-amber" />
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Awaiting Verification ({pending.length})
              </h2>
            </div>
            <p className="text-xs text-text-muted mb-3">
              Betting opens once 3 independent sources confirm the rumour.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {pending.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
