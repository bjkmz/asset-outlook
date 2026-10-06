import { getCached, setCached } from './cache'
import { db } from './db'
import { logOutbound } from './log'
import { throttled } from './throttle'

export type YahooRange =
  | '1d'
  | '5d'
  | '1Mo'
  | '3Mo'
  | '6mo'
  | '1Y'
  | '5y'
  | 'ytd'
  | 'max'

export type YahooMode = 'preview' | 'detail'

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number | null
}

export const YAHOO_TTL_MS = 90 * 60_000
export const AVAIL_TTL_MS = 24 * 3_600_000

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// DISTINCT per range; only 1d differs by mode (preview 60m, detail 5m).
// 3h/8h/12h are not Yahoo-native steps, rounded down to 1h.
const TABLE: Record<YahooRange, { range: string; interval: string }> = {
  '1d': { range: '1d', interval: '60m' },
  '5d': { range: '5d', interval: '30m' },
  '1Mo': { range: '1mo', interval: '1h' },
  '3Mo': { range: '3mo', interval: '1h' },
  '6mo': { range: '6mo', interval: '1h' },
  '1Y': { range: '1y', interval: '1d' },
  '5y': { range: '5y', interval: '1wk' },
  ytd: { range: 'ytd', interval: '1d' },
  max: { range: 'max', interval: '1mo' },
}

export const YAHOO_RANGES = Object.keys(TABLE) as YahooRange[]

const EXCHANGE_SUFFIX: Record<string, string> = {
  LSE: '.L',
  EPA: '.PA',
  XPAR: '.PA',
  XETRA: '.DE',
  XFRA: '.DE',
  TSE: '.T',
  TYO: '.T',
  HKEX: '.HK',
  NSE: '.NS',
  ASX: '.AX',
  TSX: '.TO',
  KRX: '.KS',
  BSE: '.BO',
  SSE: '.SS',
  SZSE: '.SZ',
}

const US_EXCHANGES = new Set([
  'NASDAQ',
  'NYSE',
  'AMEX',
  'ARCA',
  'BATS',
  'NMS',
  'NCM',
  'NGM',
  '',
])

const INDEX_MAP: Record<string, string> = {
  SPX: '^GSPC',
  DJI: '^DJI',
  NDX: '^NDX',
  RUT: '^RUT',
  VIX: '^VIX',
  FTSE: '^FTSE',
  GDAXI: '^GDAXI',
  N225: '^N225',
  HSI: '^HSI',
}

// Stored (symbol, kind, exchange) to ordered Yahoo candidate symbols.
export async function mapToYahoo(symbol: string): Promise<string[]> {
  const upper = symbol.toUpperCase()
  if (/[=^.-]/.test(upper) || upper.endsWith('=X') || upper.endsWith('=F')) return [upper]
  const row = db
    .query<{ kind: string; exchange: string }, [string]>(
      `SELECT kind, exchange FROM assets WHERE symbol = ? ORDER BY sort_rank ASC LIMIT 1`,
    )
    .get(upper)
  if (!row) return [upper]
  const { kind, exchange } = row
  if (kind === 'crypto') {
    const base = upper.replace(/USDT?$/u, '').replace(/USD$/u, '')
    return [`${base}-USD`]
  }
  if (kind === 'forex') return [`${upper}=X`]
  if (kind === 'commodity') {
    const root = upper.replace(/1!$/u, '')
    return [`${root}=F`, upper]
  }
  if (kind === 'index') {
    const mapped = INDEX_MAP[upper]
    return mapped ? [mapped] : [`^${upper}`, upper]
  }
  const suffix = EXCHANGE_SUFFIX[exchange] ?? ''
  if (US_EXCHANGES.has(exchange)) return [upper]
  return suffix ? [`${upper}${suffix}`, upper] : [upper]
}

interface ChartResult {
  meta?: { currency?: string; regularMarketPrice?: number }
  timestamp?: number[]
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>
      high?: Array<number | null>
      low?: Array<number | null>
      close?: Array<number | null>
      volume?: Array<number | null>
    }>
  }
}

async function fetchChart(
  ysymbol: string,
  range: string,
  interval: string,
): Promise<ChartResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysymbol)}?range=${range}&interval=${interval}`
  return throttled('yahoo', async () => {
    logOutbound('GET', url)
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { chart?: { result?: ChartResult[] } }
    return json.chart?.result?.[0] ?? null
  })
}

function toCandles(r: ChartResult): Candle[] {
  const ts = r.timestamp ?? []
  const q = r.indicators?.quote?.[0]
  if (!q) return []
  const out: Candle[] = []
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i]
    const o = q.open?.[i]
    const h = q.high?.[i]
    const l = q.low?.[i]
    if (c == null || o == null || h == null || l == null) continue
    out.push({ t: ts[i], o, h, l, c, v: q.volume?.[i] ?? null })
  }
  return out
}

// Full fetched history is returned; the client windows the latest 150.
export async function getPrices(
  symbol: string,
  range: YahooRange,
  mode: YahooMode,
): Promise<{ candles: Candle[]; yahooSymbol: string | null }> {
  const { range: yrange, interval } = TABLE[range]
  // Yahoo has no 10m interval; 5m merges to ~144 bars on 24/7 symbols.
  const yinterval = range === '1d' && mode === 'detail' ? '5m' : interval
  const key = `yahoo:chart:v2:${symbol.toUpperCase()}:${range}:${mode}`
  const cached = getCached(key, YAHOO_TTL_MS)
  if (cached) return JSON.parse(cached) as { candles: Candle[]; yahooSymbol: string }
  const candidates = await mapToYahoo(symbol)
  for (const ysymbol of candidates) {
    const result = await fetchChart(ysymbol, yrange, yinterval).catch(() => null)
    const candles = result ? toCandles(result) : []
    if (candles.length > 0) {
      const payload = { candles, yahooSymbol: ysymbol }
      setCached(key, key, JSON.stringify(payload))
      return payload
    }
  }
  return { candles: [], yahooSymbol: null }
}

export async function checkAvailable(symbol: string): Promise<boolean> {
  const key = `yahoo:avail:${symbol.toUpperCase()}`
  const cached = getCached(key, AVAIL_TTL_MS)
  if (cached) return (JSON.parse(cached) as { available: boolean }).available
  const candidates = await mapToYahoo(symbol)
  // Unmappable symbols short-circuit without network cost.
  if (candidates.length === 0) return false
  for (const ysymbol of candidates) {
    const result = await fetchChart(ysymbol, '1d', '1d').catch(() => null)
    if (result && toCandles(result).length > 0) {
      setCached(key, key, JSON.stringify({ available: true }))
      return true
    }
  }
  setCached(key, key, JSON.stringify({ available: false }))
  return false
}
