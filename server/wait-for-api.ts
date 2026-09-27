// Polls the API until TCP accepts, so Vite never proxies into a dead backend.
const HOST = process.env.API_HOST ?? 'http://localhost:3000'
const TIMEOUT_MS = Number(process.env.WAIT_API_TIMEOUT_MS ?? 30_000)
const INTERVAL_MS = 250

const deadline = Date.now() + TIMEOUT_MS

for (;;) {
  try {
    await fetch(HOST, { signal: AbortSignal.timeout(2000) })
    process.exit(0)
  } catch {
    if (Date.now() > deadline) {
      console.error(`API not ready: ${HOST}`)
      process.exit(1)
    }
    await Bun.sleep(INTERVAL_MS)
  }
}
