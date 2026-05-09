'use client'

import { useState, useMemo, useEffect } from 'react'
import { MarketCard } from './MarketCard'
import { cn } from '@/lib/utils'
import type { Market, MarketStatus, MarketType } from '@/lib/types'

type FilterId = 'All' | MarketStatus | MarketType

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'All',            label: 'All' },
  { id: 'live',           label: 'Live' },
  { id: 'pending',        label: 'Pending' },
  { id: 'binary',         label: 'Yes / No' },
  { id: 'fee_over_under', label: 'Fee' },
  { id: 'destination',    label: 'Destination' },
  { id: 'deadline',       label: 'Deadline' },
]

export function MarketList() {
  const [filter, setFilter]     = useState<FilterId>('All')
  const [markets, setMarkets]   = useState<Market[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/markets')
      .then(r => r.json())
      .then(d => { setMarkets(d.markets); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'All') return markets
    if (['live', 'pending', 'closed', 'resolved', 'cancelled'].includes(filter)) {
      return markets.filter(m => m.status === filter)
    }
    return markets.filter(m => m.marketType === filter)
  }, [markets, filter])

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

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-bg-border bg-bg-card p-4 animate-pulse">
              <div className="h-4 bg-bg-border rounded w-1/4 mb-3" />
              <div className="h-5 bg-bg-border rounded w-3/4 mb-4" />
              <div className="h-2 bg-bg-border rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">⚽</p>
          <p className="text-sm">No markets match this filter.</p>
        </div>
      )}

      {!loading && (
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
                {live.map(m => <MarketCard key={m.id} market={m} />)}
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
                {pending.map(m => <MarketCard key={m.id} market={m} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
