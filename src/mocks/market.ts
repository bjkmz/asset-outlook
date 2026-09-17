import type { Asset, NewsArticle, PricePoint, RangeKey } from '../types'

export const MOCK_ASSETS: Asset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', kind: 'stock' },
  { symbol: 'SPX', name: 'S&P 500 Index', kind: 'index' },
  { symbol: 'XAUUSD', name: 'Gold Spot', kind: 'commodity' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', kind: 'forex' },
  { symbol: 'BTCUSD', name: 'Bitcoin', kind: 'crypto' },
  { symbol: 'TSLA', name: 'Tesla Inc.', kind: 'stock' },
]

function seedFrom(symbol: string, range: RangeKey): number {
  const s = `${symbol}:${range}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 10007
  return h
}

// Deterministic 150-point series per symbol+range.
export function mockPrices(symbol: string, range: RangeKey): PricePoint[] {
  const seed = seedFrom(symbol, range)
  const base = 100 + (seed % 120)
  const now = Date.now()
  const stepMs: Record<RangeKey, number> = {
    '1d': 24 * 3_600_000 / 150,
    '1w': 7 * 24 * 3_600_000 / 150,
    '1Mo': 30 * 24 * 3_600_000 / 150,
    '3Mo': 90 * 24 * 3_600_000 / 150,
    '1Y': 365 * 24 * 3_600_000 / 150,
    '5Y': 5 * 365 * 24 * 3_600_000 / 150,
  }
  const step = stepMs[range]
  return Array.from({ length: 150 }, (_, i) => ({
    t: now - (149 - i) * step,
    price: base + i * 0.35 + Math.sin(i / 6 + seed) * 8 + Math.sin(i / 2.3) * 2,
  }))
}

export function mockPreview(symbol: string): PricePoint[] {
  return mockPrices(symbol, '1d').slice(-24)
}

export function mockNews(symbol: string): NewsArticle[] {
  const now = Date.now()
  return [0, 1, 2, 3].map((i) => ({
    id: `${symbol}-news-${i}`,
    symbol,
    title: `${symbol} market update ${i + 1}: price action and what to watch`,
    summary:
      'Summary placeholder for the asset news feed. Real summary arrives with the Finnhub integration.',
    image: '',
    url: 'https://example.com/article',
    publishedAt: new Date(now - i * 3_600_000 * 5).toISOString(),
  }))
}

export function searchMockAssets(query: string): Asset[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return MOCK_ASSETS.filter(
    (a) =>
      a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
  ).slice(0, 8)
}
