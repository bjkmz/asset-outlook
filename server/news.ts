import { getCached, setCached } from './cache'
import { db } from './db'

export interface NewsArticle {
  id: string
  title: string
  summary: string
  publishedAt: string
  url: string
  image?: string
  source?: string
}

interface FinnhubRawArticle {
  id: number
  category: string
  datetime: number
  headline: string
  summary: string
  url: string
  image?: string
  source?: string
}

const NEWS_TTL_MS = 90 * 60 * 1000 // 90 min cache
const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000

function getAssetDetails(symbol: string): { name: string; kind: string } {
  const row = db
    .query<{ name: string; kind: string }, [string]>(
      `SELECT name, kind FROM assets WHERE symbol = ? LIMIT 1`,
    )
    .get(symbol)
  return row ?? { name: symbol, kind: 'stock' }
}

function getFinnhubCategory(kind: string): 'forex' | 'crypto' | 'general' {
  if (kind === 'forex') return 'forex'
  if (kind === 'crypto') return 'crypto'
  return 'general'
}

function formatDateString(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export class FinnhubKeyMissingError extends Error {
  constructor() {
    super('Finnhub API key missing. Configure FINNHUB_API_KEY in .env file.')
    this.name = 'FinnhubKeyMissingError'
  }
}

export async function fetchNewsForSymbol(symbol: string): Promise<NewsArticle[]> {
  const normalized = symbol.trim().toUpperCase()
  const cacheKey = `finnhub:news:${normalized}`

  // 1. Check SQLite cache
  const cachedJson = getCached(cacheKey, NEWS_TTL_MS)
  if (cachedJson) {
    const rawArticles = JSON.parse(cachedJson) as NewsArticle[]
    const now = Date.now()
    return rawArticles.filter((a) => now - +new Date(a.publishedAt) <= THIRTY_DAYS_MS)
  }

  const apiKey = process.env.FINNHUB_API_KEY || ''
  if (!apiKey || apiKey.includes('your_finnhub_api_key')) {
    throw new FinnhubKeyMissingError()
  }

  const { name, kind } = getAssetDetails(normalized)
  const category = getFinnhubCategory(kind)

  let cleanSymbol = normalized
  if (kind === 'crypto') {
    cleanSymbol = cleanSymbol.replace(/(USD|USDT|EUR|BTC)$/u, '') || 'BTC'
  } else if (kind === 'commodity') {
    cleanSymbol = cleanSymbol.replace(/1!$/u, '')
  }

  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - THIRTY_DAYS_MS)
  const toStr = formatDateString(today)
  const fromStr = formatDateString(thirtyDaysAgo)

  // 2. Dual-mechanism fetch tasks
  const fetchTasks: Promise<FinnhubRawArticle[]>[] = []

  // Mechanism A: Ticker-specific fetch (company-news)
  if (kind === 'stock' || kind === 'crypto') {
    const tickerUrl = `https://finnhub.io/api/v1/company-news?symbol=${cleanSymbol}&from=${fromStr}&to=${toStr}&token=${apiKey}`
    fetchTasks.push(
      fetch(tickerUrl)
        .then(async (res) => {
          if (!res.ok) return []
          const data = (await res.json()) as unknown
          return Array.isArray(data) ? (data as FinnhubRawArticle[]) : []
        })
        .catch(() => []),
    )
  }

  // Mechanism B: Category-specific market news
  const categoryUrl = `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`
  fetchTasks.push(
    fetch(categoryUrl)
      .then(async (res) => {
        if (!res.ok) return []
        const data = (await res.json()) as unknown
        return Array.isArray(data) ? (data as FinnhubRawArticle[]) : []
      })
      .catch(() => []),
  )

  const [tickerResults = [], categoryResults = []] = await Promise.all(fetchTasks)

  // 3. Filter Mechanism B results using exclusive name/symbol markers
  const filterKeywords = new Set<string>()
  if (cleanSymbol.length >= 2) filterKeywords.add(cleanSymbol.toLowerCase())
  if (normalized.length >= 2) filterKeywords.add(normalized.toLowerCase())

  const noise = new Set([
    'futures',
    'usd',
    'eur',
    'index',
    'stock',
    'rate',
    'pair',
    'coin',
    'commodity',
  ])

  const nameWords = name
    .toLowerCase()
    .split(/\s+/u)
    .map((w) => w.replace(/[^a-z0-9]/gu, ''))
    .filter((w) => w.length >= 3 && !noise.has(w))

  for (const word of nameWords) {
    filterKeywords.add(word)
  }

  const filteredCategoryResults = categoryResults.filter((art) => {
    if (!art.headline) return false
    const text = `${art.headline} ${art.summary || ''}`.toLowerCase()
    return Array.from(filterKeywords).some((kw) => text.includes(kw))
  })

  // 4. Merge, deduplicate, filter by date (<= 30 days)
  const rawMerged = [...tickerResults, ...filteredCategoryResults]
  const seenIds = new Set<number>()
  const mergedArticles: NewsArticle[] = []
  const now = Date.now()

  for (const art of rawMerged) {
    if (!art.id || seenIds.has(art.id)) continue
    if (!art.headline || !art.url) continue

    const ageMs = now - art.datetime * 1000
    if (ageMs > THIRTY_DAYS_MS) continue

    seenIds.add(art.id)

    mergedArticles.push({
      id: `finnhub-${art.id}`,
      title: art.headline,
      summary: art.summary || '',
      publishedAt: new Date(art.datetime * 1000).toISOString(),
      url: art.url,
      image: art.image || undefined,
      source: art.source || undefined,
    })
  }

  // 5. Sort by recency DESC & cap at 30
  mergedArticles.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
  const slicedArticles = mergedArticles.slice(0, 30)

  // 6. Cache results
  try {
    setCached(cacheKey, `news:${normalized}`, JSON.stringify(slicedArticles))
  } catch (err) {
    console.error('Failed to cache news:', err)
  }

  return slicedArticles
}
