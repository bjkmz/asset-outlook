const GAP_MS = 1000

export type ThrottleSource = 'yahoo' | 'tradingview' | 'finnhub'

const states = new Map<ThrottleSource, { lastStart: number; chain: Promise<void> }>()

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Serialize outbound calls per source so starts are >=1s apart. Cache hits must bypass. */
export async function throttled<T>(source: ThrottleSource, fn: () => Promise<T>): Promise<T> {
  let state = states.get(source)
  if (!state) {
    state = { lastStart: 0, chain: Promise.resolve() }
    states.set(source, state)
  }
  const task = state.chain.then(async () => {
    const entry = states.get(source)!
    const wait = GAP_MS - (Date.now() - entry.lastStart)
    if (wait > 0) await delay(wait)
    entry.lastStart = Date.now()
    return fn()
  })
  state.chain = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}
