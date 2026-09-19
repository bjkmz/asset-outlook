import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DB_PATH = join(process.cwd(), 'data', 'cache.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH, { create: true })

db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  request_id TEXT PRIMARY KEY,
  request TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS responses (
  request_id TEXT NOT NULL REFERENCES requests(request_id),
  timestamp INTEGER NOT NULL,
  response TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_responses_timestamp ON responses(timestamp);
CREATE TABLE IF NOT EXISTS assets (
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  segment TEXT,
  market_cap REAL,
  volume REAL,
  sort_rank INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (symbol, exchange)
);
CREATE INDEX IF NOT EXISTS idx_assets_kind_rank ON assets(kind, sort_rank);
`)

// One-time migration: metals/energy/agriculture rows merge back to commodity,
// preserving their group as segment for ranks and cache freshness.
{
  const cols = db.query(`PRAGMA table_info(assets)`).all() as Array<{ name: string }>
  if (!cols.some((c) => c.name === 'segment')) {
    db.exec(`ALTER TABLE assets ADD COLUMN segment TEXT`)
  }
  const legacy = db.query(`SELECT COUNT(*) AS c FROM assets WHERE kind IN ('metals', 'energy', 'agriculture')`).get() as {
    c: number
  }
  if (legacy.c > 0) {
    db.exec(
      `UPDATE assets SET kind = 'commodity', segment = kind WHERE kind IN ('metals', 'energy', 'agriculture')`,
    )
    db.exec(`
      UPDATE assets SET sort_rank = ranked.rn FROM (
        SELECT rowid AS rid, ROW_NUMBER() OVER (ORDER BY COALESCE(volume, -1) DESC) - 1 AS rn
        FROM assets WHERE kind = 'commodity'
      ) AS ranked WHERE assets.rowid = ranked.rid AND assets.kind = 'commodity'
    `)
  }
}
