import { kindUpdatedAt, setCached } from './cache'
import { db } from './db'

export const ASSETS_TTL_MS = 10 * 24 * 3_600_000

export type AssetKind = 'stock' | 'index' | 'commodity' | 'forex' | 'crypto'

export interface StoredAsset {
  symbol: string
  exchange: string
  name: string
  kind: AssetKind
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
  AssetKind,
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
  commodity: {
    base: `${BASE}/futures/scan`,
    body: {
      filter: [
        { left: 'is_primary', operation: 'equal', right: true },
        { left: 'name', operation: 'match', right: '1!' },
      ],
      options: { lang: 'en' },
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 100],
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

const KINDS: AssetKind[] = ['stock', 'index', 'commodity', 'forex', 'crypto']

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function splitTicker(s: string): { exchange: string; symbol: string } {
  const i = s.indexOf(':')
  if (i < 0) return { exchange: '', symbol: s }
  return { exchange: s.slice(0, i), symbol: s.slice(i + 1) }
}

async function fetchScan(kind: AssetKind): Promise<StoredAsset[]> {
  const { base, body } = QUERIES[kind]
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`TradingView scan failed for ${kind}: ${res.status}`)
  const json = (await res.json()) as { data?: ScanRow[] }
  if (!Array.isArray(json.data)) throw new Error(`Unexpected scan shape for ${kind}`)
  setCached(`tv:assets:${kind}`, JSON.stringify(body), JSON.stringify(json.data))
  return json.data.map((row, rank) => {
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
      kind,
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

function storeKind(kind: AssetKind, rows: StoredAsset[]): void {
  const now = Date.now()
  const del = db.prepare(`DELETE FROM assets WHERE kind = ?`)
  const put = db.prepare(
    `INSERT INTO assets (symbol, exchange, name, kind, market_cap, volume, sort_rank, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const tx = db.transaction(() => {
    del.run(kind)
    for (const r of rows) {
      put.run(r.symbol, r.exchange, r.name, r.kind, r.market_cap, r.volume, r.sort_rank, now)
    }
  })
  tx()
}

const inflight = new Map<string, Promise<void>>()

function syncKind(kind: AssetKind): Promise<void> {
  const prior = inflight.get(kind)
  if (prior) return prior
  const p = (async () => {
    const rows = await fetchScan(kind)
    storeKind(kind, rows)
  })()
    .catch((err) => {
      // Serve stale rows on scanner failure when they exist.
      const count = db
        .query<{ c: number }, [string]>(`SELECT COUNT(*) AS c FROM assets WHERE kind = ?`)
        .get(kind)?.c
      if (!count) throw err
    })
    .finally(() => {
      inflight.delete(kind)
    })
  inflight.set(kind, p)
  return p
}

export async function syncKinds(kinds: AssetKind[]): Promise<void> {
  await Promise.all(kinds.map(syncKind))
}

export async function ensureFresh(kinds: AssetKind[]): Promise<void> {
  const stale = kinds.filter((k) => {
    const at = kindUpdatedAt(k)
    return at === null || Date.now() - at > ASSETS_TTL_MS
  })
  await Promise.all(stale.map(syncKind))
}

function escapeLike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export function searchAssets(q: string, kind: AssetKind | null, limit: number): StoredAsset[] {
  const e = escapeLike(q.trim())
  return db
    .query<StoredAsset, [string | null, string, string, string, string, number]>(
      `SELECT symbol, exchange, name, kind, market_cap, volume, sort_rank FROM assets
       WHERE (? IS NULL OR kind = ?)
         AND (symbol LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')
       ORDER BY (symbol LIKE ? ESCAPE '\\') DESC, sort_rank ASC
       LIMIT ?`,
    )
    .all(kind, kind, `%${e}%`, `%${e}%`, `${e}%`, limit)
}

export { KINDS }
