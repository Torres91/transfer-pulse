'use client'

import { useEffect, useState } from 'react'
import type { RumourItem } from '@/lib/types'
import { cn, sourceColor, sourceLabel, formatTimeAgo } from '@/lib/utils'

export function RumourFeed() {
  const [rumours, setRumours] = useState<RumourItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rumors')
      .then(r => r.json())
      .then(d => { setRumours(d.rumours); setLoading(false) })
      .catch(() => setLoading(false))

    // Refresh every 2 minutes
    const interval = setInterval(() => {
      fetch('/api/rumors')
        .then(r => r.json())
        .then(d => setRumours(d.rumours))
        .catch(() => {})
    }, 120_000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
        <h2 className="text-sm font-semibold text-text-primary">Transfer Rumours</h2>
        <span className="ml-auto text-xs text-text-muted">Auto-refreshes</span>
      </div>

      <div className="divide-y divide-bg-border max-h-[70vh] overflow-y-auto">
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-3 bg-bg-border rounded w-1/3" />
                <div className="h-3 bg-bg-border rounded w-full" />
                <div className="h-3 bg-bg-border rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && rumours.map(rumour => (
          <div key={rumour.id} className="px-4 py-3 hover:bg-bg-cardHover transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'text-xs text-white rounded px-1.5 py-0.5 font-bold',
                sourceColor(rumour.source),
              )}>
                {sourceLabel(rumour.source).split(' ')[0].toUpperCase()}
              </span>
              <span className="text-text-muted text-xs ml-auto">
                {formatTimeAgo(rumour.publishedAt)}
              </span>
            </div>

            <p className="text-text-secondary text-xs leading-relaxed">
              {rumour.headline}
            </p>

            {(rumour.playerName || rumour.fromClub || rumour.toClub) && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {rumour.playerName && (
                  <span className="text-xs bg-bg-input rounded px-1.5 py-0.5 text-text-primary font-medium">
                    {rumour.playerName}
                  </span>
                )}
                {rumour.fromClub && (
                  <span className="text-xs text-text-muted">{rumour.fromClub}</span>
                )}
                {rumour.fromClub && rumour.toClub && (
                  <span className="text-text-muted text-xs">→</span>
                )}
                {rumour.toClub && (
                  <span className="text-xs text-text-muted">{rumour.toClub}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
