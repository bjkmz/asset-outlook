import { Elysia } from 'elysia'
import { db } from './db'
import { ensureFresh, KINDS, searchAssets, syncKinds, type AssetKind } from './tv'

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
        `SELECT symbol, exchange, name, kind, market_cap, volume, sort_rank FROM assets
         WHERE symbol IN (${placeholders}) ORDER BY sort_rank ASC`,
      )
      .all(...list)
  })
  .post('/api/assets/refresh', async ({ body }) => {
    const b = (body ?? {}) as { kind?: unknown }
    const kind = b.kind === undefined ? null : parseKind(b.kind)
    if (b.kind !== undefined && kind === null) {
      return { ok: false, error: 'Invalid kind' }
    }
    await syncKinds(kind ? [kind] : [...KINDS])
    return { ok: true }
  })
  .listen(3000)

export type App = typeof app
