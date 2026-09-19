import type { NewsArticle } from '../types'

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
