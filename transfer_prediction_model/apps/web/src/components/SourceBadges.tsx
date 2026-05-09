import { cn, sourceLabel, sourceColor } from '@/lib/utils'
import type { SourceName } from '@/lib/types'

interface SourceBadgesProps {
  sources: SourceName[]
  sourceCount: number
  showCount?: boolean
}

export function SourceBadges({ sources, sourceCount, showCount = true }: SourceBadgesProps) {
  const isVerified = sourceCount >= 3

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showCount && (
        <span className={cn(
          'flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 border',
          isVerified
            ? 'text-accent-green border-accent-green/30 bg-accent-green/10'
            : 'text-accent-amber border-accent-amber/30 bg-accent-amber/10',
        )}>
          {isVerified ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {sourceCount} sources
            </>
          ) : (
            <>
              {sourceCount}/3 sources
            </>
          )}
        </span>
      )}

      {sources.slice(0, 3).map(source => (
        <span
          key={source}
          className={cn(
            'text-xs text-white rounded px-1.5 py-0.5 font-medium',
            sourceColor(source),
          )}
          title={sourceLabel(source)}
        >
          {abbreviateSource(source)}
        </span>
      ))}

      {sources.length > 3 && (
        <span className="text-xs text-text-muted">+{sources.length - 3}</span>
      )}
    </div>
  )
}

function abbreviateSource(source: SourceName): string {
  const abbrevs: Record<SourceName, string> = {
    sky_sports:       'SKY',
    bbc_sport:        'BBC',
    the_independent:  'IND',
    the_athletic:     'ATH',
    twitter_x:        'X',
    fabrizio_romano:  'FAB',
    other:            'OTH',
  }
  return abbrevs[source]
}
