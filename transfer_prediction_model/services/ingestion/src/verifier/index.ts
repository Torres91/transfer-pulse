import type { RawRumourItem, SourceName } from '../sources/types'

const MIN_SOURCES = 3

export interface VerifiedRumour {
  playerName: string
  fromClub: string | undefined
  toClub: string | undefined
  sources: SourceName[]
  items: RawRumourItem[]
  isLive: boolean // true when source count >= MIN_SOURCES
}

// ─────────────────────────────────────────────
// Group raw items by (playerName, fromClub, toClub) tuple
// and apply the 3-source rule.
// ─────────────────────────────────────────────

export function groupAndVerify(items: RawRumourItem[]): VerifiedRumour[] {
  const groups = new Map<string, VerifiedRumour>()

  for (const item of items) {
    if (!item.playerName) continue

    // Normalise key — case-insensitive, ignore undefined clubs
    const key = [
      item.playerName.toLowerCase(),
      (item.fromClub ?? '').toLowerCase(),
      (item.toClub ?? '').toLowerCase(),
    ].join('||')

    if (!groups.has(key)) {
      groups.set(key, {
        playerName: item.playerName,
        fromClub:   item.fromClub,
        toClub:     item.toClub,
        sources:    [],
        items:      [],
        isLive:     false,
      })
    }

    const group = groups.get(key)!
    group.items.push(item)

    // X/Twitter counts as one source regardless of how many accounts tweet it
    if (!group.sources.includes(item.source)) {
      group.sources.push(item.source)
    }
  }

  // Apply 3-source rule and deduplicate by unique editorial sources
  return Array.from(groups.values()).map(g => ({
    ...g,
    isLive: uniqueEditorialSources(g.sources) >= MIN_SOURCES,
  }))
}

// Twitter/X counts as exactly 1 editorial source; all others count individually
function uniqueEditorialSources(sources: SourceName[]): number {
  const hasTwitter = sources.includes('twitter_x')
  const editorial  = sources.filter(s => s !== 'twitter_x').length
  return editorial + (hasTwitter ? 1 : 0)
}
