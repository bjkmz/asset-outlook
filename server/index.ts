import { Elysia } from 'elysia'
import { db } from './db'
import {
  COMMODITY_SEGMENTS,
  ensureFresh,
  KINDS,
  searchAssets,
  syncCommoditySegment,
  syncKinds,
  type AssetKind,
  type CommoditySegment,
} from './tv'
import { checkAvailable, getPrices, YAHOO_RANGES, type YahooMode, type YahooRange } from './yahoo'

const VALID: AssetKind[] = [...KINDS]

function parseKind(v: unknown): AssetKind | null {
  return typeof v === 'string' && (VALID as string[]).includes(v) ? (v as AssetKind) : null
}

export const app = new Elysia()
  .get('/api/assets', async ({ query, status }) => {
    const q = typeof query.q === 'string' ? query.q.trim() : ''
    if (!q) return []
    const kind = parseKind(query.kind)
    if (query.kind !== undefined && kind === null) {
      return status(400, { error: 'Invalid kind' })
    }
    const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 50)
    try {
      await ensureFresh(kind ? [kind] : [...KINDS])
    } catch (err) {
      return status(502, { error: `Asset sync failed: ${(err as Error).message}` })
    }
    return searchAssets(q, kind, limit)
  })
  .get('/api/assets/resolve', ({ query }) => {
    const list =
      typeof query.symbols === 'string'
        ? query.symbols
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, 100)
        : []
    if (!list.length) return []
    const placeholders = list.map(() => '?').join(',')
    return db
      .query(
        `SELECT symbol, exchange, name, kind, segment, market_cap, volume, sort_rank FROM assets
         WHERE symbol IN (${placeholders}) ORDER BY sort_rank ASC`,
      )
      .all(...list)
  })
  .post('/api/assets/refresh', async ({ body }) => {
    const b = (body ?? {}) as { kind?: unknown; segment?: unknown }
    const kind = b.kind === undefined ? null : parseKind(b.kind)
    if (b.kind !== undefined && kind === null) {
      return { ok: false, error: 'Invalid kind' }
    }
    const segment =
      typeof b.segment === 'string' &&
      (COMMODITY_SEGMENTS as string[]).includes(b.segment)
        ? (b.segment as CommoditySegment)
        : null
    if (b.segment !== undefined && segment === null) {
      return { ok: false, error: 'Invalid segment' }
    }
    if (kind === 'commodity' && segment) {
      await syncCommoditySegment(segment, true)
    } else {
      await syncKinds(kind ? [kind] : [...KINDS], true)
    }
    return { ok: true }
  })
  .get('/api/prices/:symbol', async ({ params, query, status }) => {
    const range = query.range as YahooRange | undefined
    const mode = (query.mode as YahooMode | undefined) ?? 'preview'
    if (!range || !YAHOO_RANGES.includes(range)) {
      return status(400, { error: 'Invalid range' })
    }
    if (mode !== 'preview' && mode !== 'detail') {
      return status(400, { error: 'Invalid mode' })
    }
    return getPrices(params.symbol, range, mode)
  })
  .get('/api/availability/:symbol', async ({ params }) => {
    try {
      return { available: await checkAvailable(params.symbol) }
    } catch {
      return { available: false }
    }
  })
  .listen(3000)

export type App = typeof app
