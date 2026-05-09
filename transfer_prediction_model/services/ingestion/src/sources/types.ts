export type SourceName =
  | 'sky_sports'
  | 'bbc_sport'
  | 'the_independent'
  | 'the_athletic'
  | 'twitter_x'
  | 'fabrizio_romano'
  | 'other'

export interface RawRumourItem {
  source: SourceName
  headline: string
  url: string
  publishedAt: Date
  rawText?: string
  // Extracted by NLP/regex
  playerName?: string
  fromClub?: string
  toClub?: string
  feeMention?: number // in pence
}

export interface ParsedFeedItem {
  title: string
  link: string
  pubDate?: string
  content?: string
  contentSnippet?: string
}
