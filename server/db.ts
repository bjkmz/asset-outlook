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
  market_cap REAL,
  volume REAL,
  sort_rank INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (symbol, exchange)
);
CREATE INDEX IF NOT EXISTS idx_assets_kind_rank ON assets(kind, sort_rank);
`)
