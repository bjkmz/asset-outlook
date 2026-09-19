import { kindUpdatedAt, setCached } from './cache'
import { db } from './db'

export const ASSETS_TTL_MS = 10 * 24 * 3_600_000

export type AssetKind = 'stock' | 'index' | 'commodity' | 'forex' | 'crypto'

export interface StoredAsset {
  symbol: string
  exchange: string
  name: string
  kind: AssetKind
  segment: string | null
  market_cap: number | null
  volume: number | null
  sort_rank: number
}

interface ScanBody {
  filter: unknown[]
  options: { lang: string }
  sort: { sortBy: string; sortOrder: string }
  range: [number, number]
  columns: string[]
}

interface ScanRow {
  s: string
  d: unknown[]
}

const BASE = 'https://scanner.tradingview.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const QUERIES: Record<
  Exclude<AssetKind, 'commodity'>,
  { base: string; body: ScanBody; metric: 'market_cap' | 'volume' }
> = {
  stock: {
    base: `${BASE}/global/scan`,
    body: {
      filter: [
        { left: 'type', operation: 'equal', right: 'stock' },
        { left: 'is_primary', operation: 'equal', right: true },
        { left: 'market_cap_basic', operation: 'nempty' },
      ],
      options: { lang: 'en' },
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
      range: [0, 500],
      columns: ['name', 'description', 'close', 'market_cap_basic', 'volume', 'change'],
    },
    metric: 'market_cap',
  },
  index: {
    base: `${BASE}/global/scan`,
    body: {
      filter: [
        { left: 'type', operation: 'equal', right: 'index' },
        { left: 'exchange', operation: 'nequal', right: 'CRYPTOCAP' },
      ],
      options: { lang: 'en' },
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 50],
      columns: ['name', 'description', 'close', 'volume', 'change'],
    },
    metric: 'volume',
  },
  forex: {
    base: `${BASE}/forex/scan`,
    body: {
      filter: [{ left: 'name', operation: 'nempty' }],
      options: { lang: 'en' },
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 200],
      columns: ['name', 'description', 'close', 'volume', 'change'],
    },
    metric: 'volume',
  },
  crypto: {
    base: `${BASE}/coin/scan`,
    body: {
      filter: [{ left: 'market_cap_calc', operation: 'nempty' }],
      options: { lang: 'en' },
      sort: { sortBy: 'market_cap_calc', sortOrder: 'desc' },
      range: [0, 200],
      columns: ['name', 'description', 'close', 'market_cap_calc', '24h_vol|60', 'change'],
    },
    metric: 'market_cap',
  },
}

// Commodity futures share one scanner with stock and index futures, so each
// group queries commodity venues and keeps allowlisted continuous roots.
const COMMODITY_EXCHANGES = ['COMEX', 'NYMEX', 'CBOT', 'CME', 'TOCOM', 'LME', 'ICEUS', 'ICEEUR']

export type CommoditySegment = 'metals' | 'energy' | 'agriculture'

export const COMMODITY_SEGMENTS: CommoditySegment[] = ['metals', 'energy', 'agriculture']

const COMMODITY_GROUPS: Record<CommoditySegment, { pairs: string[]; limit: number }> = {
  metals: {
    pairs: [
      'COMEX:GC', 'COMEX:MGC', 'COMEX:SI', 'COMEX:HG',
      'NYMEX:PL', 'NYMEX:PA',
      'TOCOM:TPL',
      'LME:AHD', 'LME:CAD', 'LME:NID', 'LME:PBD', 'LME:SND', 'LME:ZSD',
    ],
    limit: 30,
  },
  energy: {
    pairs: [
      'NYMEX:CL', 'NYMEX:MCL', 'NYMEX:QM', 'NYMEX:NG', 'NYMEX:QG',
      'NYMEX:RB', 'NYMEX:HO', 'ICEEUR:BRN',
    ],
    limit: 35,
  },
  agriculture: {
    pairs: [
      'CBOT:ZC', 'CBOT:ZW', 'CBOT:ZS', 'CBOT:ZM', 'CBOT:ZL', 'CBOT:ZR', 'CBOT:KE',
      'ICEUS:KC', 'ICEUS:SB', 'ICEUS:CC', 'ICEUS:CT', 'ICEUS:OJ',
      'CME:LB', 'CME:LE', 'CME:HE', 'CME:GF',
    ],
    limit: 35,
  },
}

const KINDS: AssetKind[] = ['stock', 'index', 'commodity', 'forex', 'crypto']

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function splitTicker(s: string): { exchange: string; symbol: string } {
  const i = s.indexOf(':')
  if (i < 0) return { exchange: '', symbol: s }
  return { exchange: s.slice(0, i), symbol: s.slice(i + 1) }
}

// Continuous-contract marker stripped for matching (GC1! -> GC).
function rootOf(symbol: string): string {
  return symbol.endsWith('1!') ? symbol.slice(0, -2) : symbol
}

async function postScan(base: string, body: ScanBody): Promise<ScanRow[]> {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`TradingView scan failed: ${res.status}`)
  const json = (await res.json()) as { data?: ScanRow[] }
  if (!Array.isArray(json.data)) throw new Error('Unexpected scan shape')
  return json.data
}

async function fetchScan(kind: keyof typeof QUERIES): Promise<StoredAsset[]> {
  const { base, body } = QUERIES[kind]
  const rows = await postScan(base, body)
  setCached(`tv:assets:${kind}`, JSON.stringify(body), JSON.stringify(rows))
  return rows.map((row, rank) => {
    const { exchange, symbol } = splitTicker(row.s)
    const d = row.d
    const name = typeof d[1] === 'string' ? d[1] : symbol
    // Metric column index depends on the query: stocks/crypto carry
    // market cap at d[3], volume-ranked classes carry volume at d[3].
    const metric = num(d[3])
    return {
      symbol,
      exchange,
      name,
      kind: kind as AssetKind,
      segment: null,
      market_cap: QUERIES[kind].metric === 'market_cap' ? metric : null,
      volume:
        QUERIES[kind].metric === 'volume'
          ? metric
          : kind === 'crypto'
            ? num(d[4])
            : kind === 'stock'
              ? num(d[4])
              : null,
      sort_rank: rank,
    }
  })
}

async function fetchCommodityGroup(group: CommoditySegment): Promise<StoredAsset[]> {
  const { pairs, limit } = COMMODITY_GROUPS[group]
  const allowed = new Set(pairs)
  const collected: StoredAsset[] = []
  for (const exchange of COMMODITY_EXCHANGES) {
    const body: ScanBody = {
      filter: [
        { left: 'exchange', operation: 'equal', right: exchange },
        { left: 'name', operation: 'match', right: '1!' },
      ],
      options: { lang: 'en' },
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 200],
      columns: ['name', 'description', 'close', 'volume', 'change'],
    }
    const rows = await postScan(`${BASE}/futures/scan`, body)
    setCached(`tv:assets:${group}:${exchange}`, JSON.stringify(body), JSON.stringify(rows))
    for (const row of rows) {
      const { exchange: ex, symbol } = splitTicker(row.s)
      if (!allowed.has(`${ex}:${rootOf(symbol)}`)) continue
      const d = row.d
      collected.push({
        symbol,
        exchange: ex,
        name: typeof d[1] === 'string' ? d[1] : symbol,
        kind: 'commodity',
        segment: group,
        market_cap: null,
        volume: num(d[3]),
        sort_rank: 0,
      })
    }
  }
  const seen = new Set<string>()
  return collected
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
    .filter((r) => {
      const key = `${r.exchange}:${r.symbol}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map((r, rank) => ({ ...r, sort_rank: rank }))
}

function storeKind(kind: AssetKind, segment: string | null, rows: StoredAsset[]): void {
  const now = Date.now()
  const del = db.prepare(`DELETE FROM assets WHERE kind = ? AND segment IS ?`)
  const put = db.prepare(
    `INSERT INTO assets (symbol, exchange, name, kind, segment, market_cap, volume, sort_rank, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const tx = db.transaction(() => {
    del.run(kind, segment)
    for (const r of rows) {
      put.run(r.symbol, r.exchange, r.name, r.kind, r.segment, r.market_cap, r.volume, r.sort_rank, now)
    }
  })
  tx()
  if (kind === 'commodity') recomputeCommodityRanks()
}

// Unified volume rank across all commodity segments for display ordering.
function recomputeCommodityRanks(): void {
  db.exec(`
    UPDATE assets SET sort_rank = ranked.rn FROM (
      SELECT rowid AS rid, ROW_NUMBER() OVER (ORDER BY COALESCE(volume, -1) DESC) - 1 AS rn
      FROM assets WHERE kind = 'commodity'
    ) AS ranked WHERE assets.rowid = ranked.rid AND assets.kind = 'commodity'
  `)
}

function segmentUpdatedAt(segment: CommoditySegment): number | null {
  const row = db
    .query<{ m: number | null }, [string]>(
      `SELECT MAX(updated_at) AS m FROM assets WHERE kind = 'commodity' AND segment = ?`,
    )
    .get(segment)
  return row?.m ?? null
}

const inflight = new Map<string, Promise<void>>()

function runExclusive(key: string, task: () => Promise<void>): Promise<void> {
  const prior = inflight.get(key)
  if (prior) return prior
  const p = task().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, p)
  return p
}

export function syncCommoditySegment(segment: CommoditySegment, force = false): Promise<void> {
  return runExclusive(`commodity:${segment}`, async () => {
    if (!force) {
      const at = segmentUpdatedAt(segment)
      if (at !== null && Date.now() - at <= ASSETS_TTL_MS) return
    }
    try {
      const rows = await fetchCommodityGroup(segment)
      storeKind('commodity', segment, rows)
    } catch (err) {
      const count = db
        .query<{ c: number }, [string]>(
          `SELECT COUNT(*) AS c FROM assets WHERE kind = 'commodity' AND segment = ?`,
        )
        .get(segment)?.c
      if (!count) throw err
    }
  })
}

function syncKind(kind: AssetKind, force = false): Promise<void> {
  if (kind === 'commodity') {
    return runExclusive('commodity', async () => {
      await Promise.all(COMMODITY_SEGMENTS.map((s) => syncCommoditySegment(s, force)))
    })
  }
  return runExclusive(kind, async () => {
    try {
      const rows = await fetchScan(kind)
      storeKind(kind, null, rows)
    } catch (err) {
      // Serve stale rows on scanner failure when they exist.
      const count = db
        .query<{ c: number }, [string]>(`SELECT COUNT(*) AS c FROM assets WHERE kind = ?`)
        .get(kind)?.c
      if (!count) throw err
    }
  })
}

export async function syncKinds(kinds: AssetKind[], force = false): Promise<void> {
  await Promise.all(kinds.map((k) => syncKind(k, force)))
}

function isCommodityStale(): boolean {
  return COMMODITY_SEGMENTS.some((s) => {
    const at = segmentUpdatedAt(s)
    return at === null || Date.now() - at > ASSETS_TTL_MS
  })
}

export async function ensureFresh(kinds: AssetKind[]): Promise<void> {
  const stale = kinds.filter((k) => {
    if (k === 'commodity') return isCommodityStale()
    const at = kindUpdatedAt(k)
    return at === null || Date.now() - at > ASSETS_TTL_MS
  })
  await Promise.all(stale.map((k) => syncKind(k, false)))
}

function escapeLike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export function searchAssets(q: string, kind: AssetKind | null, limit: number): StoredAsset[] {
  const e = escapeLike(q.trim())
  return db
    .query<StoredAsset, [string | null, string, string, string, string, number]>(
      `SELECT symbol, exchange, name, kind, segment, market_cap, volume, sort_rank FROM assets
       WHERE (? IS NULL OR kind = ?)
         AND (symbol LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')
       ORDER BY (symbol LIKE ? ESCAPE '\\') DESC, sort_rank ASC
       LIMIT ?`,
    )
    .all(kind, kind, `%${e}%`, `%${e}%`, `${e}%`, limit)
}

export { KINDS }
