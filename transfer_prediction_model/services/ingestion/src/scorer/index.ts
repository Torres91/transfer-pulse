// ─────────────────────────────────────────────
// Entity extraction
// Simple regex-based NLP for football transfers.
// In production: replace with a proper NLP service.
// ─────────────────────────────────────────────

// Known clubs — expand this list. Used for matching.
const KNOWN_CLUBS: string[] = [
  'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United',
  'Tottenham', 'Newcastle', 'Aston Villa', 'West Ham', 'Brighton',
  'Real Madrid', 'Barcelona', 'Atletico Madrid',
  'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig',
  'Paris Saint-Germain', 'PSG',
  'Juventus', 'AC Milan', 'Inter Milan', 'Napoli',
  'Ajax', 'Benfica', 'Porto', 'Celtic',
  'Al-Nassr', 'Al-Hilal', 'Al-Ittihad',
]

// Common football transfer verbs / prepositions
const FROM_PATTERNS = ['from', 'leaves', 'departing', 'exits', 'released by']
const TO_PATTERNS   = ['to', 'joins', 'signs for', 'completes move to', 'set for', 'heading to', 'linked with']

// Fee extraction: £50m, €80m, $120m
const FEE_REGEX = /[£€$](\d+(?:\.\d+)?)\s*m(?:illion)?/i

interface ExtractedEntities {
  playerName?: string
  fromClub?: string
  toClub?: string
  feeMention?: number
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractEntities(text: string): ExtractedEntities {
  const result: ExtractedEntities = {}

  // Extract fee
  const feeMatch = text.match(FEE_REGEX)
  if (feeMatch) {
    // Convert to pence: £50m → 5_000_000_000 pence
    result.feeMention = Math.round(parseFloat(feeMatch[1]) * 100_000_000)
  }

  // Find which known clubs appear in the text
  const mentionedClubs = KNOWN_CLUBS.filter(club => {
    const re = new RegExp(`\\b${escapeRegex(club)}\\b`, 'i')
    return re.test(text)
  })

  if (mentionedClubs.length === 0) return result

  // Try to determine from/to direction
  for (const club of mentionedClubs) {
    const clubEsc = escapeRegex(club)

    for (const word of TO_PATTERNS) {
      const re = new RegExp(`${escapeRegex(word)}\\s+${clubEsc}`, 'i')
      if (re.test(text)) {
        result.toClub = club
        break
      }
    }

    for (const word of FROM_PATTERNS) {
      const re = new RegExp(`${escapeRegex(word)}\\s+${clubEsc}`, 'i')
      if (re.test(text)) {
        result.fromClub = club
        break
      }
    }
  }

  // Fallback: first club = from, second = to
  if (!result.fromClub && !result.toClub && mentionedClubs.length >= 2) {
    result.fromClub = mentionedClubs[0]
    result.toClub   = mentionedClubs[1]
  } else if (!result.fromClub && mentionedClubs.length === 1) {
    result.toClub = mentionedClubs[0]
  }

  return result
}

// ─────────────────────────────────────────────
// Credibility scoring
// score = sourceWeight × recencyScore × (1 + mentionBonus)
// ─────────────────────────────────────────────

import type { SourceName } from '../sources/types'

const SOURCE_WEIGHT: Record<SourceName, number> = {
  sky_sports:       0.90,
  bbc_sport:        0.85,
  the_independent:  0.80,
  the_athletic:     0.85,
  fabrizio_romano:  0.98,
  twitter_x:        0.55,
  other:            0.40,
}

export function calcCredibility(
  sources: SourceName[],
  firstSeenAt: Date,
  mentionCount: number,
): number {
  if (sources.length === 0) return 0

  const avgWeight = sources.reduce((sum, s) => sum + SOURCE_WEIGHT[s], 0) / sources.length

  const ageHours = (Date.now() - firstSeenAt.getTime()) / 3_600_000
  // Recency score: 1.0 at age 0, decays to ~0.5 at 72 hours
  const recency = Math.max(0.5, 1 - (ageHours / 144))

  const mentionBonus = Math.min(mentionCount / 20, 0.5) // up to +50%

  return Math.min(100, avgWeight * recency * (1 + mentionBonus) * 100)
}
