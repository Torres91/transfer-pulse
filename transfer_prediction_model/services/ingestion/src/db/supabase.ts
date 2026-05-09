import { createClient } from '@supabase/supabase-js'
import type { RawRumourItem } from '../sources/types'
import type { VerifiedRumour } from '../verifier'
import { calcCredibility } from '../scorer'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// ─────────────────────────────────────────────
// Upsert raw rumour items (deduplicated by source + url)
// ─────────────────────────────────────────────

export async function upsertRumourItems(items: RawRumourItem[]): Promise<void> {
  if (items.length === 0) return

  const rows = items.map(item => ({
    source:      item.source,
    headline:    item.headline,
    url:         item.url || null,
    player_name: item.playerName || null,
    from_club:   item.fromClub || null,
    to_club:     item.toClub || null,
    fee_mention: item.feeMention || null,
    published_at: item.publishedAt.toISOString(),
    raw_text:    item.rawText || null,
  }))

  const { error } = await supabase
    .from('rumour_items')
    .upsert(rows, { onConflict: 'source,url', ignoreDuplicates: true })

  if (error) console.error('[db] upsertRumourItems error:', error.message)
}

// ─────────────────────────────────────────────
// Upsert rumour groups and promote markets to live
// ─────────────────────────────────────────────

export async function upsertRumourGroups(groups: VerifiedRumour[]): Promise<void> {
  for (const group of groups) {
    const credibility = calcCredibility(group.sources, new Date(), group.items.length)

    // Check if group already exists
    const { data: existing } = await supabase
      .from('rumour_groups')
      .select('id, source_count')
      .eq('player_name', group.playerName)
      .eq('from_club', group.fromClub ?? '')
      .eq('to_club', group.toClub ?? '')
      .maybeSingle()

    let groupId: string

    if (existing) {
      groupId = existing.id
      await supabase
        .from('rumour_groups')
        .update({
          source_count: group.sources.length,
          sources:      group.sources,
          credibility,
          last_updated: new Date().toISOString(),
        })
        .eq('id', groupId)
    } else {
      const { data, error } = await supabase
        .from('rumour_groups')
        .insert({
          player_name:  group.playerName,
          from_club:    group.fromClub ?? null,
          to_club:      group.toClub ?? null,
          source_count: group.sources.length,
          sources:      group.sources,
          credibility,
        })
        .select('id')
        .single()

      if (error || !data) {
        console.error('[db] upsertRumourGroups insert error:', error?.message)
        continue
      }
      groupId = data.id
    }

    // Promote pending markets to live if 3-source rule is now met
    if (group.isLive) {
      await supabase
        .from('markets')
        .update({ status: 'live', source_count: group.sources.length })
        .eq('rumour_group_id', groupId)
        .eq('status', 'pending')
    }
  }
}

// ─────────────────────────────────────────────
// Auto-create draft markets for new verified rumours
// ─────────────────────────────────────────────

export async function createDraftMarketsIfNeeded(groups: VerifiedRumour[]): Promise<void> {
  for (const group of groups) {
    if (!group.playerName || !group.toClub) continue

    // Check if a market already exists for this group
    const { data: existing } = await supabase
      .from('rumour_groups')
      .select('id')
      .eq('player_name', group.playerName)
      .eq('to_club', group.toClub ?? '')
      .maybeSingle()

    if (!existing) continue

    const { data: mkt } = await supabase
      .from('markets')
      .select('id')
      .eq('rumour_group_id', existing.id)
      .eq('market_type', 'binary')
      .maybeSingle()

    if (mkt) continue // market already exists

    // Create binary draft market
    const closesAt = new Date()
    closesAt.setDate(closesAt.getDate() + 60)

    await supabase.from('markets').insert({
      rumour_group_id: existing.id,
      market_type:     'binary',
      title:           `Will ${group.playerName} sign for ${group.toClub}?`,
      description:     `Transfer rumour: ${group.playerName} (${group.fromClub ?? 'unknown'}) → ${group.toClub}`,
      player_name:     group.playerName,
      from_club:       group.fromClub ?? null,
      to_club:         group.toClub,
      status:          group.isLive ? 'live' : 'pending',
      source_count:    group.sources.length,
      closes_at:       closesAt.toISOString(),
    })

    console.log(`[db] Created draft market: ${group.playerName} → ${group.toClub}`)
  }
}
