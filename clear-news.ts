import { Database } from 'bun:sqlite'
import { join } from 'node:path'

const dbPath = join(process.cwd(), 'data', 'cache.db')
const db = new Database(dbPath)

const symbols = ['BNBUSD']

const deleteResponses = db.prepare('DELETE FROM responses WHERE request_id = ?')
const deleteRequests = db.prepare('DELETE FROM requests WHERE request_id = ?')

const tx = db.transaction((syms: string[]) => {
  for (const sym of syms) {
    const requestId = `finnhub:news:${sym}`
    deleteResponses.run(requestId)
    deleteRequests.run(requestId)
    console.log(`Cleared cache for: ${requestId}`)
  }
})

tx(symbols)
console.log('Database cleanup complete.')