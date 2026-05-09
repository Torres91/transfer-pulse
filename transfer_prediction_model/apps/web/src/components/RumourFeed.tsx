'use client'

import { MOCK_RUMOURS } from '@/lib/mockData'
import { cn, sourceColor, sourceLabel, formatTimeAgo } from '@/lib/utils'

export function RumourFeed() {
  const rumours = MOCK_RUMOURS

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
        <h2 className="text-sm font-semibold text-text-primary">Transfer Rumours</h2>
        <span className="ml-auto text-xs text-text-muted">Live feed</span>
      </div>

      {/* Feed items */}
      <div className="divide-y divide-bg-border max-h-[70vh] overflow-y-auto">
        {rumours.map(rumour => (
          <div key={rumour.id} className="px-4 py-3 hover:bg-bg-cardHover transition-colors">
            {/* Source badge + time */}
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

            {/* Headline */}
            <p className="text-text-secondary text-xs leading-relaxed">
              {rumour.headline}
            </p>

            {/* Transfer chips */}
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
