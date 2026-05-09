export type MarketType = 'binary' | 'fee_over_under' | 'destination' | 'deadline'

export type MarketStatus = 'pending' | 'live' | 'closed' | 'resolved' | 'cancelled'

export type MarketResolution = 'yes' | 'no' | 'over' | 'under' | 'cancelled'

export type BetSide = 'yes' | 'no' | 'over' | 'under'

export type SourceName =
  | 'sky_sports'
  | 'bbc_sport'
  | 'the_independent'
  | 'the_athletic'
  | 'twitter_x'
  | 'fabrizio_romano'
  | 'other'

export interface MarketDestination {
  id: string
  marketId: string
  clubName: string
  pool: number
  isWinner: boolean | null
}

export interface Market {
  id: string
  rumourGroupId: string | null
  marketType: MarketType
  title: string
  description: string | null
  playerName: string
  fromClub: string | null
  toClub: string | null
  feeThreshold: number | null   // in pence
  deadline: string | null
  status: MarketStatus
  sourceCount: number
  yesPool: number
  noPool: number
  resolution: MarketResolution | null
  resolvedAt: string | null
  closesAt: string | null
  createdAt: string
  updatedAt: string
  // Joined
  destinations?: MarketDestination[]
  sources?: SourceName[]
}

export interface RumourItem {
  id: string
  source: SourceName
  headline: string
  url: string | null
  playerName: string | null
  fromClub: string | null
  toClub: string | null
  publishedAt: string
}

export interface Bet {
  id: string
  marketId: string
  walletAddress: string
  side: BetSide
  amount: number
  isPaper: boolean
  claimed: boolean
  payout: number | null
  txHash: string | null
  createdAt: string
}

// UI helpers
export interface OddsData {
  yesPct: number
  noPct: number
  yesLabel: string
  noLabel: string
  totalPool: number
}
