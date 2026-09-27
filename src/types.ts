export type AssetKind = 'stock' | 'index' | 'commodity' | 'forex' | 'crypto'

export interface Asset {
  symbol: string
  name: string
  kind: AssetKind
}

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number | null
}

export interface NewsArticle {
  id: string
  symbol?: string
  title: string
  summary: string
  image?: string
  url: string
  publishedAt: string
  source?: string
}

export type SentimentLabel = 'bullish' | 'bearish' | 'neutral'

export interface InsightSentiment {
  title: string
  label: SentimentLabel
  note: string
}

export interface Insights {
  overview: string
  sentiments: InsightSentiment[]
  aggregate: SentimentLabel | 'mixed'
  drivers: string[]
  risks: string[]
  watch: string[]
  model: string
  articleCount: number
  cached: boolean
}

export type RangeKey =
  | '1d'
  | '5d'
  | '1Mo'
  | '3Mo'
  | '6mo'
  | '1Y'
  | '5y'
  | 'ytd'
  | 'max'
