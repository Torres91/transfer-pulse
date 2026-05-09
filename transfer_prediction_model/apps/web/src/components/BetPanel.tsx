'use client'

import { useState } from 'react'
import { cn, calcOdds, formatFee } from '@/lib/utils'
import type { Market, BetSide } from '@/lib/types'
import { usePaperBets } from '@/hooks/usePaperBets'

interface BetPanelProps {
  market: Market
}

const QUICK_AMOUNTS = ['10', '25', '50', '100']

export function BetPanel({ market }: BetPanelProps) {
  const odds             = calcOdds(market)
  const { bets, placeBet } = usePaperBets()

  const [side, setSide]         = useState<BetSide>('yes')
  const [amount, setAmount]     = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const myBetsHere = bets.filter(b => b.marketId === market.id)
  const isYesSide  = side === 'yes' || side === 'over'
  const sidePct    = isYesSide ? odds.yesPct : odds.noPct
  const sideLabel  = isYesSide ? odds.yesLabel : odds.noLabel

  const amountNum      = parseFloat(amount) || 0
  const grossPayout    = sidePct > 0 ? amountNum * (100 / sidePct) : 0
  const fee            = grossPayout * 0.015
  const netPayout      = grossPayout - fee

  function handleBet() {
    if (amountNum <= 0) return
    placeBet({
      marketId:       market.id,
      marketTitle:    market.title,
      playerName:     market.playerName,
      side:           sideLabel,
      amount:         amountNum,
      potentialPayout: netPayout,
    })
    setAmount('')
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 3000)
  }

  if (market.status !== 'live') {
    return (
      <div className="rounded-xl border border-bg-border bg-bg-card p-5 text-center">
        <div className="text-accent-amber text-2xl mb-2">⏳</div>
        <p className="text-text-muted text-sm">
          {market.status === 'pending'
            ? `Awaiting sources (${market.sourceCount}/3 confirmed)`
            : 'This market is closed.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Place a Bet</h3>
        <span className="text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-full px-2 py-0.5">
          Paper Trading
        </span>
      </div>

      {/* Side selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {([
          { s: 'yes' as BetSide, label: odds.yesLabel, pct: odds.yesPct, activeColor: 'border-accent-green text-accent-green bg-accent-green/10', dotColor: 'bg-accent-green' },
          { s: 'no'  as BetSide, label: odds.noLabel,  pct: odds.noPct,  activeColor: 'border-accent-red text-accent-red bg-accent-red/10',     dotColor: 'bg-accent-red'   },
        ] as const).map(({ s, label, pct, activeColor, dotColor }) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              'py-3 rounded-lg font-bold text-sm transition-all border',
              side === s ? activeColor : 'bg-bg-input border-bg-border text-text-secondary hover:border-bg-border',
            )}
          >
            <span className="block text-xl font-mono">{pct}%</span>
            <span className="flex items-center justify-center gap-1 text-xs mt-0.5 opacity-80">
              <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <label className="block text-xs text-text-muted mb-1.5">Amount (MATIC)</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="1"
            className="w-full bg-bg-input border border-bg-border rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted font-mono focus:outline-none focus:border-accent-green text-sm transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none">
            MATIC
          </span>
        </div>
        <div className="flex gap-1.5 mt-2">
          {QUICK_AMOUNTS.map(v => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className={cn(
                'flex-1 text-xs py-1 rounded border transition-all',
                amount === v
                  ? 'border-accent-green text-accent-green bg-accent-green/10'
                  : 'border-bg-border text-text-muted hover:text-text-primary hover:border-bg-border bg-bg-input',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Payout breakdown */}
      {amountNum > 0 && (
        <div className="bg-bg-input rounded-lg p-3 mb-4 space-y-2 text-xs border border-bg-border">
          <div className="flex justify-between text-text-secondary">
            <span>Implied odds</span>
            <span className="font-mono">{(100 / sidePct).toFixed(2)}x</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Gross payout</span>
            <span className="font-mono">{grossPayout.toFixed(2)} MATIC</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Platform fee (1.5%)</span>
            <span className="font-mono">−{fee.toFixed(2)} MATIC</span>
          </div>
          <div className="flex justify-between border-t border-bg-border pt-2 font-semibold">
            <span className="text-text-primary">Net profit</span>
            <span className={cn(
              'font-mono',
              netPayout > amountNum ? 'text-accent-green' : 'text-text-primary',
            )}>
              +{(netPayout - amountNum).toFixed(2)} MATIC
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      {confirmed ? (
        <div className="w-full py-3 rounded-lg bg-accent-green/15 border border-accent-green text-accent-green font-bold text-sm text-center">
          ✓ Paper bet placed on {sideLabel}!
        </div>
      ) : (
        <button
          onClick={handleBet}
          disabled={amountNum <= 0}
          className={cn(
            'w-full py-3 rounded-lg font-bold text-sm transition-all',
            amountNum > 0
              ? isYesSide
                ? 'bg-accent-green text-bg-primary hover:brightness-110 active:scale-[0.98]'
                : 'bg-accent-red text-white hover:brightness-110 active:scale-[0.98]'
              : 'bg-bg-input text-text-muted cursor-not-allowed border border-bg-border',
          )}
        >
          {amountNum > 0
            ? `Bet ${amountNum} MATIC on ${sideLabel}`
            : 'Enter an amount to bet'}
        </button>
      )}

      {/* My bets on this market */}
      {myBetsHere.length > 0 && (
        <div className="mt-4 pt-4 border-t border-bg-border">
          <p className="text-xs text-text-muted mb-2">Your bets on this market</p>
          <div className="space-y-1.5">
            {myBetsHere.map(b => (
              <div key={b.id} className="flex justify-between text-xs">
                <span className={cn(
                  'font-medium',
                  b.side === 'YES' || b.side === 'OVER' ? 'text-accent-green' : 'text-accent-red',
                )}>
                  {b.side} — {b.amount} MATIC
                </span>
                <span className="text-text-muted">
                  → {b.potentialPayout.toFixed(1)} MATIC
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
