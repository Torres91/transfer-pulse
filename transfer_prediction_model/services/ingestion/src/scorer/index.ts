// ─────────────────────────────────────────────
// Entity extraction
// ─────────────────────────────────────────────

const KNOWN_CLUBS: string[] = [
  'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United',
  'Tottenham', 'Newcastle', 'Aston Villa', 'West Ham', 'Brighton', 'Fulham',
  'Real Madrid', 'Barcelona', 'Atletico Madrid',
  'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig',
  'Paris Saint-Germain', 'PSG',
  'Juventus', 'AC Milan', 'Inter Milan', 'Napoli', 'Roma',
  'Ajax', 'Benfica', 'Porto', 'Celtic', 'Rangers',
  'Al-Nassr', 'Al-Hilal', 'Al-Ittihad', 'Al-Qadsiah',
]

// Well-known transfer targets — expand as needed
const KNOWN_PLAYERS: string[] = [
  // Currently linked / hot rumours
  'Victor Osimhen', 'Alexander Isak', 'Marcus Rashford', 'Bernardo Silva',
  'Anthony Gordon', 'Lamine Yamal', 'Erling Haaland', 'Kylian Mbappé',
  'Virgil van Dijk', 'Van Dijk', 'Luke Shaw', 'Shaw',
  'Trent Alexander-Arnold', 'Alexander-Arnold',
  'Mohamed Salah', 'Salah', 'Rodri',
  'Jadon Sancho', 'Sancho', 'Bukayo Saka', 'Saka',
  'Harry Kane', 'Kane', 'Declan Rice', 'Phil Foden', 'Foden',
  'Bruno Fernandes', 'Rasmus Højlund', 'Højlund', 'Kobbie Mainoo',
  'Ivan Toney', 'Toney', 'Jhon Durán', 'Durán',
  'Florian Wirtz', 'Wirtz', 'Xavi Simons',
  'Benjamin Šeško', 'Sesko', 'Viktor Gyökeres', 'Gyokeres',
  'Riccardo Calafiori', 'Martin Zubimendi', 'Zubimendi',
  'Nico Williams', 'Ollie Watkins', 'Watkins',
  'Evan Ferguson', 'Matheus Cunha', 'Cunha',
  'Omar Marmoush', 'Bryan Mbeumo', 'Mbeumo',
  'Leroy Sané', 'Sane', 'Jonathan David',
  'Jude Bellingham', 'Bellingham', 'Mbappé',
  'Michael Olise', 'Olise', 'Donyell Malen', 'Malen',
  'Neymar', 'Vinicius', 'Vinicius Jr',
]

const FROM_PATTERNS = ['from', 'leaves', 'departing', 'exits', 'released by', 'departs']
const TO_PATTERNS   = ['to', 'joins', 'signs for', 'completes move to', 'set for', 'heading to', 'linked with', 'close to joining', 'in talks with']

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
    result.feeMention = Math.round(parseFloat(feeMatch[1]) * 100_000_000)
  }

  // Extract player name (longest match wins to avoid "Kane" matching "Mainoo")
  const sortedPlayers = [...KNOWN_PLAYERS].sort((a, b) => b.length - a.length)
  for (const player of sortedPlayers) {
    const re = new RegExp(`\\b${escapeRegex(player)}\\b`, 'i')
    if (re.test(text)) {
      // Normalise to full name where we have an alias
      result.playerName = normalisePlayer(player)
      break
    }
  }

  // Extract clubs
  const mentionedClubs = KNOWN_CLUBS.filter(club => {
    const re = new RegExp(`\\b${escapeRegex(club)}\\b`, 'i')
    return re.test(text)
  })

  for (const club of mentionedClubs) {
    const clubEsc = escapeRegex(club)
    for (const word of TO_PATTERNS) {
      if (new RegExp(`${escapeRegex(word)}\\s+${clubEsc}`, 'i').test(text)) {
        result.toClub = club; break
      }
    }
    for (const word of FROM_PATTERNS) {
      if (new RegExp(`${escapeRegex(word)}\\s+${clubEsc}`, 'i').test(text)) {
        result.fromClub = club; break
      }
    }
  }

  // Fallback: first club = from, second = to
  if (!result.fromClub && !result.toClub && mentionedClubs.length >= 2) {
    result.fromClub = mentionedClubs[0]
    result.toClub   = mentionedClubs[1]
  } else if (!result.toClub && mentionedClubs.length === 1) {
    result.toClub = mentionedClubs[0]
  }

  return result
}

function normalisePlayer(name: string): string {
  const aliases: Record<string, string> = {
    'Mbappé':              'Kylian Mbappé',
    'Bellingham':          'Jude Bellingham',
    'Salah':               'Mohamed Salah',
    'Sancho':              'Jadon Sancho',
    'Saka':                'Bukayo Saka',
    'Kane':                'Harry Kane',
    'Foden':               'Phil Foden',
    'Højlund':             'Rasmus Højlund',
    'Toney':               'Ivan Toney',
    'Durán':               'Jhon Durán',
    'Wirtz':               'Florian Wirtz',
    'Sesko':               'Benjamin Šeško',
    'Gyokeres':            'Viktor Gyökeres',
    'Sane':                'Leroy Sané',
    'Watkins':             'Ollie Watkins',
    'Cunha':               'Matheus Cunha',
    'Mbeumo':              'Bryan Mbeumo',
    'Van Dijk':            'Virgil van Dijk',
    'Shaw':                'Luke Shaw',
    'Alexander-Arnold':    'Trent Alexander-Arnold',
    'Olise':               'Michael Olise',
    'Malen':               'Donyell Malen',
    'Vinicius Jr':         'Vinicius Jr',
  }
  return aliases[name] ?? name
}

// ─────────────────────────────────────────────
// Credibility scoring
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
  const avgWeight   = sources.reduce((sum, s) => sum + SOURCE_WEIGHT[s], 0) / sources.length
  const ageHours    = (Date.now() - firstSeenAt.getTime()) / 3_600_000
  const recency     = Math.max(0.5, 1 - (ageHours / 144))
  const mentionBonus = Math.min(mentionCount / 20, 0.5)
  return Math.min(100, avgWeight * recency * (1 + mentionBonus) * 100)
}
