import { useCallback, useState } from 'react'

const KEY = 'asset-lookout:interests'
const DEFAULTS = ['AAPL', 'BTCUSD']

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useInterests() {
  const [symbols, setSymbols] = useState<string[]>(load)

  const save = useCallback((next: string[]) => {
    setSymbols(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }, [])

  const add = useCallback(
    (symbol: string) => {
      if (symbols.includes(symbol)) return
      save([...symbols, symbol])
    },
    [save, symbols],
  )

  const remove = useCallback(
    (symbol: string) => {
      save(symbols.filter((s) => s !== symbol))
    },
    [save, symbols],
  )

  return { symbols, add, remove }
}
