import { getCached, setCached } from './cache'
import { db } from './db'
import { logOutbound } from './log'
import { fetchNewsForSymbol, type NewsArticle } from './news'

export class GeminiKeyMissingError extends Error {
  constructor() {
    super('Gemini API key missing. Configure GEMINI_API_KEY in .env file.')
    this.name = 'GeminiKeyMissingError'
  }
}

export class InsightsRateLimitedError extends Error {
  constructor() {
    super('Too many insights requests. Wait a minute and retry.')
    this.name = 'InsightsRateLimitedError'
  }
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

const INSIGHTS_TTL_MS = 60 * 60 * 1000
const MAX_ARTICLES = 5
const MAX_CHARS_PER_ARTICLE = 800
const DEFAULT_MODEL = 'gemini-flash-latest'
const GENERATION_TIMEOUT_MS = 60_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10

const hits = new Map<string, number[]>()

export function checkInsightsRateLimit(ip: string): void {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) throw new InsightsRateLimitedError()
  recent.push(now)
  hits.set(ip, recent)
}

function getAssetName(symbol: string): string {
  const row = db
    .query<{ name: string }, [string]>(`SELECT name FROM assets WHERE symbol = ? LIMIT 1`)
    .get(symbol)
  return row?.name ?? symbol
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function buildPrompt(symbol: string, name: string, articles: NewsArticle[]): string {
  const items = articles
    .map((a, i) => {
      const date = a.publishedAt.slice(0, 10)
      const body = truncate(`${a.title}. ${a.summary}`.trim(), MAX_CHARS_PER_ARTICLE)
      return `${i + 1}. [${date}] ${a.source ?? 'News'}: ${body} (${a.url})`
    })
    .join('\n')
  return `Summarize these ${articles.length} recent articles about ${name} (${symbol}). Reply with JSON only, no markdown fences, using exactly these keys: overview (string, 3-5 sentences), sentiments (array of {title, label, note} with label one of bullish/bearish/neutral, one entry per article), aggregate (one of bullish/bearish/neutral/mixed), drivers (string array, max 4), risks (string array, max 4), watch (string array, max 4 upcoming catalysts or data points to monitor).\n\nArticles:\n${items}`
}

const SYSTEM_PROMPT =
  'You are a financial news summarizer. Describe what the coverage says, not what the reader should do. ' +
  'Informational purposes only, not financial advice. Never issue buy, sell, or hold directives.'

function isMissing(value: string): boolean {
  return !value || value.includes('your_gemini_api_key')
}

function getConfig(): { key: string; model: string } {
  const key = process.env.GEMINI_API_KEY ?? ''
  if (isMissing(key)) throw new GeminiKeyMissingError()
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  return { key, model }
}

function validateInsights(json: unknown, model: string, articleCount: number): Insights {
  const v = json as Record<string, unknown>
  const str = (x: unknown): string => (typeof x === 'string' ? x : '')
  const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : [])
  const label = (x: unknown): SentimentLabel => (x === 'bullish' || x === 'bearish' ? x : 'neutral')
  if (typeof v !== 'object' || v === null || !str(v.overview)) throw new Error('Unexpected insights shape')
  const sentiments = Array.isArray(v.sentiments)
    ? (v.sentiments as Array<Record<string, unknown>>).map((s) => ({
        title: str(s.title),
        label: label(s.label),
        note: str(s.note),
      }))
    : []
  const agg = v.aggregate
  return {
    overview: str(v.overview),
    sentiments,
    aggregate: agg === 'bullish' || agg === 'bearish' || agg === 'neutral' || agg === 'mixed' ? agg : 'mixed',
    drivers: strArr(v.drivers).slice(0, 4),
    risks: strArr(v.risks).slice(0, 4),
    watch: strArr(v.watch).slice(0, 4),
    model,
    articleCount,
    cached: false,
  }
}

async function callGemini(prompt: string, key: string, model: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  logOutbound('POST', url)
  let lastError: Error | null = null
  const delays = [2000, 8000]
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 4000,
          },
        }),
        signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      })
      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
        if (!text) throw new Error('Empty model response')
        const clean = text
          .replace(/^\s*```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
        return JSON.parse(clean) as unknown
      }
      // Fail loud on key/model errors: no retry, no silent model swap.
      if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Gemini rejected request (status ${res.status}): ${detail.slice(0, 200)}`)
      }
      console.error(`[insights] attempt ${attempt} failed with status ${res.status}`)
      const detail = await res.text().catch(() => '')
      console.error(`[insights] upstream body: ${detail.slice(0, 300)}`)
      lastError = new Error(`Gemini failed with status ${res.status}`)
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Gemini rejected request')) throw err
      console.error(`[insights] attempt ${attempt} error: ${(err as Error).message}`)
      lastError = err as Error
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, delays[attempt - 1]))
  }
  throw lastError ?? new Error('Gemini request failed')
}

export async function fetchInsightsForSymbol(symbol: string, ip: string): Promise<Insights> {
  const normalized = symbol.trim().toUpperCase()
  checkInsightsRateLimit(ip)
  const { key, model } = getConfig()
  const articles = (await fetchNewsForSymbol(normalized)).slice(0, MAX_ARTICLES)
  if (articles.length === 0) throw new Error('No articles available for insights')
  const cacheKey = `insights:v1:${normalized}:${articles.map((a) => a.id).join(',')}`
  const cachedJson = getCached(cacheKey, INSIGHTS_TTL_MS)
  if (cachedJson) {
    const parsed = JSON.parse(cachedJson) as Insights
    return { ...parsed, cached: true }
  }
  const prompt = buildPrompt(normalized, getAssetName(normalized), articles)
  const json = await callGemini(prompt, key, model)
  const insights = validateInsights(json, model, articles.length)
  try {
    setCached(cacheKey, `insights:${normalized}`, JSON.stringify(insights))
  } catch (err) {
    console.error('Failed to cache insights:', err)
  }
  return insights
}
