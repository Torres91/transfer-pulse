'use client'

import Link from 'next/link'
import { cn, calcOdds, formatPool, formatFee, formatDeadline, impliedOdds } from '@/lib/utils'
import type { Market } from '@/lib/types'
import { OddsBar } from './OddsBar'
import { SourceBadges } from './SourceBadges'

interface MarketCardProps {
  market: Market
}

const STATUS_CONFIG = {
  live:      { label: 'LIVE',    color: 'text-accent-green bg-accent-green/10 border-accent-green/30' },
  pending:   { label: 'PENDING', color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/30' },
  closed:    { label: 'CLOSED',  color: 'text-text-muted bg-bg-border/50 border-bg-border' },
  resolved:  { label: 'SETTLED', color: 'text-text-muted bg-bg-border/50 border-bg-border' },
  cancelled: { label: 'VOID',    color: 'text-accent-red bg-accent-red/10 border-accent-red/30' },
}

const TYPE_LABELS = {
  binary:         'YES / NO',
  fee_over_under: 'OVER / UNDER',
  destination:    'DESTINATION',
  deadline:       'DEADLINE',
}

export function MarketCard({ market }: MarketCardProps) {
  const odds      = calcOdds(market)
  const statusCfg = STATUS_CONFIG[market.status]
  const isLive    = market.status === 'live'

  return (
    <Link href={`/market/${market.id}`} className="block group">
      <div className={cn(
        'rounded-xl border border-bg-border bg-bg-card p-4 transition-all duration-200',
        isLive
          ? 'hover:border-accent-green/30 hover:bg-bg-cardHover cursor-pointer'
          : 'opacity-70 cursor-default',
      )}>
        {/* Top row: type badge + status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-text-muted font-mono font-medium">
            {TYPE_LABELS[market.marketType]}
          </span>
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full border',
            statusCfg.color,
          )}>
            {market.status === 'live' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green mr-1 animate-pulse-slow" />
            )}
            {statusCfg.label}
          </span>
        </div>

        {/* Player + clubs */}
        <div className="flex items-start gap-3 mb-3">
          {/* Player avatar placeholder */}
          <div className="w-10 h-10 rounded-full bg-bg-border flex items-center justify-center shrink-0 text-text-muted text-sm font-bold">
            {market.playerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>

          <div className="min-w-0">
            <p className="text-text-secondary text-xs mb-0.5">
              {market.fromClub}
              {market.toClub && (
                <>
                  <span className="mx-1 text-text-muted">→</span>
                  <span className="text-text-primary">{market.toClub}</span>
                </>
              )}
            </p>
            <h3 className="text-text-primary font-semibold text-sm leading-snug group-hover:text-accent-green transition-colors line-clamp-2">
              {market.title}
            </h3>
          </div>
        </div>

        {/* Market-type specific content */}
        {market.marketType === 'destination' && market.destinations ? (
          <DestinationOdds destinations={market.destinations} />
        ) : (
          <OddsBar
            yesPct={odds.yesPct}
            yesLabel={odds.yesLabel}
            noLabel={odds.noLabel}
            size="sm"
          />
        )}

        {/* Fee threshold label */}
        {market.marketType === 'fee_over_under' && market.feeThreshold && (
          <p className="text-text-muted text-xs mt-2">
            Threshold: <span className="text-text-secondary font-medium">{formatFee(market.feeThreshold)}</span>
          </p>
        )}

        {/* Deadline label */}
        {market.marketType === 'deadline' && market.deadline && (
          <p className="text-text-muted text-xs mt-2">
            Deadline: <span className="text-accent-amber font-medium">{formatDeadline(market.deadline)}</span>
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-bg-border">
          <SourceBadges
            sources={market.sources ?? []}
            sourceCount={market.sourceCount}
          />

          {market.status !== 'pending' && market.marketType !== 'destination' && (
            <div className="text-right shrink-0 ml-2">
              <p className="text-xs text-text-muted">Vol.</p>
              <p className="text-xs font-mono text-text-secondary">
                {formatPool(market.yesPool + market.noPool)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function DestinationOdds({ destinations }: { destinations: NonNullable<Market['destinations']> }) {
  const total = destinations.reduce((s, d) => s + d.pool, 0)

  const sorted = [...destinations].sort((a, b) => b.pool - a.pool)

  return (
    <div className="space-y-1.5">
      {sorted.slice(0, 4).map(dest => {
        const pct = total > 0 ? Math.round((dest.pool / total) * 100) : 0
        return (
          <div key={dest.id} className="flex items-center gap-2">
            <span className="text-xs text-text-secondary w-28 truncate">{dest.clubName}</span>
            <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-blue rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-text-muted w-8 text-right">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
