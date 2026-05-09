import { supabase } from './supabase'
import { MOCK_MARKETS, MOCK_RUMOURS } from './mockData'
import type { Market, RumourItem } from './types'

export async function getMarkets(): Promise<Market[]> {
  if (!supabase) return MOCK_MARKETS

  const { data, error } = await supabase
    .from('markets')
    .select('*, market_destinations(*), rumour_groups(sources)')
    .order('created_at', { ascending: false })

  if (error || !data) return MOCK_MARKETS

  return data.map(normaliseMarket)
}

export async function getMarket(id: string): Promise<Market | null> {
  if (!supabase) return MOCK_MARKETS.find(m => m.id === id) ?? null

  const { data, error } = await supabase
    .from('markets')
    .select('*, market_destinations(*), rumour_groups(sources)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return normaliseMarket(data)
}

export async function getRumours(): Promise<RumourItem[]> {
  if (!supabase) return MOCK_RUMOURS

  const { data, error } = await supabase
    .from('rumour_items')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(30)

  if (error || !data) return MOCK_RUMOURS

  return data.map(r => ({
    id:          r.id,
    source:      r.source,
    headline:    r.headline,
    url:         r.url,
    playerName:  r.player_name,
    fromClub:    r.from_club,
    toClub:      r.to_club,
    publishedAt: r.published_at,
  }))
}

// Supabase uses snake_case — normalise to camelCase for the frontend
function normaliseMarket(r: Record<string, any>): Market {
  return {
    id:             r.id,
    rumourGroupId:  r.rumour_group_id,
    marketType:     r.market_type,
    title:          r.title,
    description:    r.description,
    playerName:     r.player_name,
    fromClub:       r.from_club,
    toClub:         r.to_club,
    feeThreshold:   r.fee_threshold,
    deadline:       r.deadline,
    status:         r.status,
    sourceCount:    r.source_count,
    yesPool:        r.yes_pool,
    noPool:         r.no_pool,
    resolution:     r.resolution,
    resolvedAt:     r.resolved_at,
    closesAt:       r.closes_at,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
    destinations:   r.market_destinations?.map((d: any) => ({
      id:        d.id,
      marketId:  d.market_id,
      clubName:  d.club_name,
      pool:      d.pool,
      isWinner:  d.is_winner,
    })),
    sources: r.rumour_groups?.sources ?? [],
  }
}
