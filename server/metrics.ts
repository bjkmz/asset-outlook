import { getCached, setCached } from './cache'
import { db } from './db'
import { logOutbound } from './log'
import { throttled } from './throttle'
import { YAHOO_RANGES, type YahooRange } from './yahoo'

export const METRICS_TTL_MS = 90 * 60_000

const BASE = 'https://scanner.tradingview.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

// Static fundamentals + timeframe-invariant technicals.
export const STATIC_COLUMNS = [
  'close',
  'change',
  'market_cap_basic',
  'market_cap_calc',
  'price_earnings_ttm',
  'earnings_per_share_basic_ttm',
  'price_book_fq',
  'dividend_yield_recent',
  'gross_margin_ttm',
  'operating_margin_ttm',
  'net_margin_ttm',
  'return_on_equity_fq',
  'total_debt_fq',
  'ATR',
  'BB.upper',
  'BB.lower',
  'Stoch.K',
  'Stoch.D',
  'CCI20',
  'ADX',
  'AO',
  'OBV',
  'CMF',
  'Volatility.D',
  'Recommend.All',
  'Recommend.MA',
  'Recommend.Other',
  'RSI',
  'EMA20',
  'VWAP',
] as const

// Chart range -> TV intraday suffix for pipe columns.
const RANGE_SUFFIX: Record<YahooRange, string> = {
  '1d': '60',
  '5d': '60',
  '1Mo': '1D',
  '3Mo': '1D',
  '6mo': '1W',
  '1Y': '1W',
  '5y': '1M',
  ytd: '1D',
  max: '1M',
}

// Chart range -> performance + high/low columns.
function perfColumns(range: YahooRange): string[] {
  switch (range) {
    case '1d':
      return []
    case '5d':
      return ['Perf.W']
    case '1Mo':
      return ['Perf.1M', 'High.1M', 'Low.1M']
    case '3Mo':
      return ['Perf.3M', 'High.3M', 'Low.3M']
    case '6mo':
      return ['Perf.6M', 'High.6M', 'Low.6M']
    case '1Y':
      return ['Perf.Y', 'price_52_week_high', 'price_52_week_low']
    case '5y':
      return ['Perf.5Y', 'High.All', 'Low.All']
    case 'ytd':
      return ['Perf.YTD', 'High.All', 'Low.All']
    case 'max':
      return ['Perf.All', 'High.All', 'Low.All']
  }
}

export function rangeColumns(range: YahooRange): string[] {
  const s = RANGE_SUFFIX[range]
  return [
    `RSI|${s}`,
    `EMA20|${s}`,
    `VWAP|${s}`,
    `Recommend.All|${s}`,
    `close|${s}`,
    ...perfColumns(range),
  ]
}

export function allColumns(range: YahooRange): string[] {
  return [...STATIC_COLUMNS, ...rangeColumns(range)]
}

function baseForKind(kind: string | null): string {
  switch (kind) {
    case 'forex':
      return `${BASE}/forex/scan`
    case 'crypto':
      return `${BASE}/coin/scan`
    case 'commodity':
      return `${BASE}/futures/scan`
    case 'index':
      return `${BASE}/global/scan`
    default:
      return `${BASE}/america/scan`
  }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

interface MetricsRow {
  kind: string | null
  exchange: string | null
}

function lookupAsset(symbol: string): MetricsRow {
  const row = db
    .query<{ kind: string; exchange: string }, [string]>(
      `SELECT kind, exchange FROM assets WHERE symbol = ? ORDER BY sort_rank ASC LIMIT 1`,
    )
    .get(symbol.toUpperCase())
  if (!row) return { kind: null, exchange: null }
  return { kind: row.kind, exchange: row.exchange }
}

export function resolveTicker(symbol: string): { ticker: string; base: string } {
  const upper = symbol.toUpperCase()
  const { kind, exchange } = lookupAsset(upper)
  const base = baseForKind(kind)
  if (exchange) return { ticker: `${exchange}:${upper}`, base }
  return { ticker: upper, base }
}

async function postTickers(
  base: string,
  ticker: string,
  columns: string[],
): Promise<unknown[] | null> {
  return throttled('tradingview', async () => {
    logOutbound('POST', base)
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ symbols: { tickers: [ticker] }, columns }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Metrics scan failed: ${res.status}`)
    const json = (await res.json()) as { data?: Array<{ s: string; d: unknown[] }> }
    if (!Array.isArray(json.data) || json.data.length === 0) return null
    return json.data[0].d
  })
}

export async function getMetrics(
  symbol: string,
  range: YahooRange,
): Promise<{ values: Record<string, number | null>; ticker: string }> {
  if (!YAHOO_RANGES.includes(range)) throw new Error('Invalid range')
  const key = `metrics:v2:${symbol.toUpperCase()}:${range}`
  const cached = getCached(key, METRICS_TTL_MS)
  if (cached) return JSON.parse(cached) as { values: Record<string, number | null>; ticker: string }
  const { ticker, base } = resolveTicker(symbol)
  const columns = allColumns(range)
  const d = await postTickers(base, ticker, columns).catch(() => null)
  const values: Record<string, number | null> = {}
  for (let i = 0; i < columns.length; i++) {
    values[columns[i]] = d ? num(d[i]) : null
  }
  // Home header derives RSI/Recommend from the same payload; fall back to
  // base columns when the range-suffixed variant is null.
  const s = RANGE_SUFFIX[range]
  if (values[`RSI|${s}`] == null && values['RSI'] != null) values[`RSI|${s}`] = values['RSI']
  if (values[`EMA20|${s}`] == null && values['EMA20'] != null) values[`EMA20|${s}`] = values['EMA20']
  if (values[`VWAP|${s}`] == null && values['VWAP'] != null) values[`VWAP|${s}`] = values['VWAP']
  if (values[`close|${s}`] == null && values['close'] != null) values[`close|${s}`] = values['close']
  if (values[`Recommend.All|${s}`] == null && values['Recommend.All'] != null) {
    values[`Recommend.All|${s}`] = values['Recommend.All']
  }
  // Crypto reports market cap under a different column; map it so the panel
  // shows Market Cap for coins without changing the row key.
  if (values['market_cap_basic'] == null && values['market_cap_calc'] != null) {
    values['market_cap_basic'] = values['market_cap_calc']
  }
  const payload = { values, ticker }
  setCached(key, key, JSON.stringify(payload))
  return payload
}
