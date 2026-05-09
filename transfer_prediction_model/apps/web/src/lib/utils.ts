import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { Market, OddsData, SourceName } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcOdds(market: Market): OddsData {
  const total = market.yesPool + market.noPool

  if (total === 0) {
    return {
      yesPct: 50,
      noPct:  50,
      yesLabel: market.marketType === 'fee_over_under' ? 'OVER' : 'YES',
      noLabel:  market.marketType === 'fee_over_under' ? 'UNDER' : 'NO',
      totalPool: 0,
    }
  }

  return {
    yesPct:   Math.round((market.yesPool / total) * 100),
    noPct:    Math.round((market.noPool  / total) * 100),
    yesLabel: market.marketType === 'fee_over_under' ? 'OVER' : 'YES',
    noLabel:  market.marketType === 'fee_over_under' ? 'UNDER' : 'NO',
    totalPool: total,
  }
}

export function formatPool(pence: number): string {
  // Treat units as MATIC micro-units for Phase 1 display
  const matic = pence / 1_000_000
  if (matic >= 1_000_000) return `${(matic / 1_000_000).toFixed(1)}M MATIC`
  if (matic >= 1_000)     return `${(matic / 1_000).toFixed(1)}K MATIC`
  return `${matic.toFixed(0)} MATIC`
}

export function formatFee(pence: number): string {
  const millions = pence / 100_000_000 // pence → millions GBP
  return `£${millions.toFixed(0)}m`
}

export function formatTimeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatDeadline(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy')
}

export function sourceLabel(source: SourceName): string {
  const labels: Record<SourceName, string> = {
    sky_sports:       'Sky Sports',
    bbc_sport:        'BBC Sport',
    the_independent:  'The Independent',
    the_athletic:     'The Athletic',
    twitter_x:        'X / Twitter',
    fabrizio_romano:  'Fabrizio Romano',
    other:            'Other',
  }
  return labels[source]
}

export function sourceColor(source: SourceName): string {
  const colors: Record<SourceName, string> = {
    sky_sports:       'bg-blue-500',
    bbc_sport:        'bg-red-600',
    the_independent:  'bg-purple-600',
    the_athletic:     'bg-orange-500',
    twitter_x:        'bg-gray-600',
    fabrizio_romano:  'bg-green-600',
    other:            'bg-gray-500',
  }
  return colors[source]
}

export function impliedOdds(pct: number): string {
  // Convert percentage probability to decimal odds
  if (pct <= 0) return '∞'
  return (100 / pct).toFixed(2)
}
