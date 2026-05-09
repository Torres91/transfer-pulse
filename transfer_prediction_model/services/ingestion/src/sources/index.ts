import Parser from 'rss-parser'
import { RawRumourItem, SourceName } from './types'
import { extractEntities } from '../scorer'

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail'],
  },
})

// ─────────────────────────────────────────────
// RSS Feed definitions
// ─────────────────────────────────────────────

const FEEDS: Array<{ source: SourceName; url: string }> = [
  { source: 'sky_sports',       url: 'https://www.skysports.com/rss/12040' },
  { source: 'bbc_sport',        url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { source: 'the_independent',  url: 'https://www.independent.co.uk/sport/football/rss' },
]

// Keywords that indicate a transfer-related article
const TRANSFER_KEYWORDS = [
  'transfer', 'sign', 'signed', 'signing', 'move', 'deal', 'bid', 'fee',
  'linked', 'target', 'pursuit', 'interest', 'offer', 'here we go',
  'done deal', 'medical', 'personal terms', 'agreement',
]

function isTransferRelated(text: string): boolean {
  const lower = text.toLowerCase()
  return TRANSFER_KEYWORDS.some(kw => lower.includes(kw))
}

// ─────────────────────────────────────────────
// Fetch & parse a single RSS feed
// ─────────────────────────────────────────────

async function fetchFeed(source: SourceName, url: string): Promise<RawRumourItem[]> {
  try {
    const feed  = await parser.parseURL(url)
    const items = feed.items ?? []

    return items
      .filter(item => isTransferRelated((item.title ?? '') + ' ' + (item.contentSnippet ?? '')))
      .map(item => {
        const text = `${item.title ?? ''} ${item.contentSnippet ?? ''}`
        const entities = extractEntities(text)

        return {
          source,
          headline: item.title ?? '',
          url:  item.link ?? '',
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          rawText: item.contentSnippet,
          ...entities,
        } satisfies RawRumourItem
      })
  } catch (err) {
    console.error(`[${source}] Feed fetch failed:`, err)
    return []
  }
}

// ─────────────────────────────────────────────
// Poll all configured feeds
// ─────────────────────────────────────────────

export async function pollAllFeeds(): Promise<RawRumourItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(f => fetchFeed(f.source, f.url))
  )

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
}
