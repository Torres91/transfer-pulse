'use client'

import { cn } from '@/lib/utils'

interface OddsBarProps {
  yesPct: number
  yesLabel?: string
  noLabel?: string
  size?: 'sm' | 'md'
}

export function OddsBar({ yesPct, yesLabel = 'YES', noLabel = 'NO', size = 'md' }: OddsBarProps) {
  const noPct = 100 - yesPct

  return (
    <div className="w-full">
      {/* Labels */}
      <div className="flex justify-between items-center mb-1.5">
        <span className={cn(
          'font-bold text-accent-green',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}>
          {yesLabel} {yesPct}%
        </span>
        <span className={cn(
          'font-bold text-accent-red',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}>
          {noPct}% {noLabel}
        </span>
      </div>

      {/* Bar */}
      <div className={cn(
        'w-full rounded-full overflow-hidden bg-bg-border flex',
        size === 'sm' ? 'h-1.5' : 'h-2',
      )}>
        <div
          className="bg-accent-green rounded-l-full transition-all duration-700 ease-out"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-accent-red flex-1 rounded-r-full"
        />
      </div>
    </div>
  )
}
