export type AssetKind = 'stock' | 'index' | 'commodity' | 'forex' | 'crypto'

export interface Asset {
  symbol: string
  name: string
  kind: AssetKind
}

export interface PricePoint {
  t: number
  price: number
}

export interface NewsArticle {
  id: string
  symbol: string
  title: string
  summary: string
  image: string
  url: string
  publishedAt: string
}

export type RangeKey = '1d' | '1w' | '1Mo' | '3Mo' | '1Y' | '5Y'
