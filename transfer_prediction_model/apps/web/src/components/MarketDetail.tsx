'use client'

import Link from 'next/link'
import type { Market } from '@/lib/types'
import { calcOdds, formatPool, formatFee, formatDeadline, formatTimeAgo, sourceLabel } from '@/lib/utils'
import { OddsBar } from './OddsBar'
import { SourceBadges } from './SourceBadges'
import { BetPanel } from './BetPanel'

interface MarketDetailProps {
  market: Market
}

export function MarketDetail({ market }: MarketDetailProps) {
  const odds = calcOdds(market)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1 text-text-muted text-sm hover:text-text-primary mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: market info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card */}
          <div className="rounded-xl border border-bg-border bg-bg-card p-6">
            {/* Player + route */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-bg-border flex items-center justify-center text-text-muted font-bold text-lg shrink-0">
                {market.playerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-text-muted text-sm">
                  {market.fromClub}
                  {market.toClub && (
                    <>
                      <span className="mx-2">→</span>
                      <span className="text-text-primary">{market.toClub}</span>
                    </>
                  )}
                </p>
                <h1 className="text-xl font-bold text-text-primary mt-0.5">
                  {market.title}
                </h1>
                {market.feeThreshold && (
                  <p className="text-accent-amber text-sm mt-1">
                    Fee threshold: {formatFee(market.feeThreshold)}
                  </p>
                )}
                {market.deadline && (
                  <p className="text-accent-amber text-sm mt-1">
                    Deadline: {formatDeadline(market.deadline)}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {market.description && (
              <p className="text-text-secondary text-sm leading-relaxed mb-5">
                {market.description}
              </p>
            )}

            {/* Odds */}
            {market.marketType !== 'destination' && (
              <div className="mb-5">
                <OddsBar
                  yesPct={odds.yesPct}
                  yesLabel={odds.yesLabel}
                  noLabel={odds.noLabel}
                />
                <div className="flex justify-between mt-3 text-xs text-text-muted">
                  <span>
                    {odds.yesLabel} pool: <span className="text-text-secondary font-mono">{formatPool(market.yesPool)}</span>
                  </span>
                  <span>Total: <span className="text-text-secondary font-mono">{formatPool(odds.totalPool)}</span></span>
                  <span>
                    {odds.noLabel} pool: <span className="text-text-secondary font-mono">{formatPool(market.noPool)}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Destination breakdown */}
            {market.marketType === 'destination' && market.destinations && (
              <div className="mb-5 space-y-2.5">
                {market.destinations
                  .sort((a, b) => b.pool - a.pool)
                  .map(dest => {
                    const total = market.destinations!.reduce((s, d) => s + d.pool, 0)
                    const pct   = total > 0 ? Math.round((dest.pool / total) * 100) : 0
                    return (
                      <div key={dest.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">{dest.clubName}</span>
                          <span className="text-text-primary font-mono font-semibold">{pct}%</span>
                        </div>
                        <div className="h-2 bg-bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-blue rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{formatPool(dest.pool)} wagered</p>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Sources */}
            <div className="pt-4 border-t border-bg-border">
              <p className="text-xs text-text-muted mb-2">Sources reporting this rumour</p>
              <SourceBadges
                sources={market.sources ?? []}
                sourceCount={market.sourceCount}
                showCount
              />
              {market.sources && (
                <div className="mt-2 space-y-1">
                  {market.sources.map(s => (
                    <p key={s} className="text-xs text-text-muted">• {sourceLabel(s)}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: bet panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <BetPanel market={market} />

            {/* Market stats */}
            <div className="mt-4 rounded-xl border border-bg-border bg-bg-card p-4 space-y-3 text-sm">
              <h4 className="text-text-muted text-xs font-semibold uppercase tracking-wide">Market info</h4>
              <div className="flex justify-between">
                <span className="text-text-muted">Type</span>
                <span className="text-text-primary">{market.marketType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Sources</span>
                <span className="text-text-primary">{market.sourceCount} / 3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Created</span>
                <span className="text-text-secondary">{formatTimeAgo(market.createdAt)}</span>
              </div>
              {market.closesAt && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Closes</span>
                  <span className="text-accent-amber">{formatDeadline(market.closesAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
