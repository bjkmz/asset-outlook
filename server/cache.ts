import { db } from './db'

export function getCached(requestId: string, maxAgeMs: number): string | null {
  const row = db
    .query<{ timestamp: number; response: string }, [string]>(
      `SELECT timestamp, response FROM responses
       WHERE request_id = ? ORDER BY timestamp DESC LIMIT 1`,
    )
    .get(requestId)
  if (!row) return null
  if (Date.now() - row.timestamp > maxAgeMs) return null
  return row.response
}

export function setCached(requestId: string, request: string, response: string): void {
  const now = Date.now()
  const remove = db.prepare(`DELETE FROM responses WHERE request_id = ?`)
  const putRequest = db.prepare(
    `INSERT INTO requests (request_id, request) VALUES (?, ?)
     ON CONFLICT(request_id) DO UPDATE SET request = excluded.request`,
  )
  const putResponse = db.prepare(
    `INSERT INTO responses (request_id, timestamp, response) VALUES (?, ?, ?)`,
  )
  const tx = db.transaction(() => {
    // Old saves are removed on successful update.
    remove.run(requestId)
    putRequest.run(requestId, request)
    putResponse.run(requestId, now, response)
  })
  tx()
}

export function kindUpdatedAt(kind: string): number | null {
  const row = db
    .query<{ m: number | null }, [string]>(
      `SELECT MAX(updated_at) AS m FROM assets WHERE kind = ?`,
    )
    .get(kind)
  return row?.m ?? null
}
