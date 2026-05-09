import 'dotenv/config'
import cron from 'node-cron'
import { pollAllFeeds } from './sources'
import { groupAndVerify } from './verifier'
import { upsertRumourItems, upsertRumourGroups, createDraftMarketsIfNeeded } from './db/supabase'

// Run every 5 minutes
const CRON_SCHEDULE = '*/5 * * * *'

async function ingest() {
  console.log(`[ingestion] Starting poll at ${new Date().toISOString()}`)

  try {
    // 1. Fetch all RSS feeds
    const items = await pollAllFeeds()
    console.log(`[ingestion] Fetched ${items.length} transfer-related items`)

    // 2. Store raw items (dedup by source+url)
    await upsertRumourItems(items)

    // 3. Group by (player, from_club, to_club) and apply 3-source rule
    const groups = groupAndVerify(items)
    console.log(`[ingestion] Found ${groups.length} rumour groups, ${groups.filter(g => g.isLive).length} meet 3-source threshold`)

    // 4. Update rumour group records and promote pending markets
    await upsertRumourGroups(groups)

    // 5. Auto-create draft markets for new verified rumours
    await createDraftMarketsIfNeeded(groups)

    console.log(`[ingestion] Cycle complete`)
  } catch (err) {
    console.error('[ingestion] Fatal error in cycle:', err)
  }
}

// Run immediately on startup, then on schedule
ingest()
cron.schedule(CRON_SCHEDULE, ingest)

console.log(`[ingestion] Service started. Polling every 5 minutes.`)
