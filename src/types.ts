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
