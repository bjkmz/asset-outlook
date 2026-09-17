import { useState } from 'react'
import { MOCK_ASSETS, searchMockAssets } from '../mocks/market'

export function SearchBar({
  onAdd,
  onMissing,
}: {
  onAdd: (symbol: string) => void
  onMissing: (symbol: string) => void
}) {
  const [q, setQ] = useState('')
  const results = searchMockAssets(q)

  return (
    <div className="relative w-full max-w-md">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search assets (AAPL, BTC, Gold...)"
        className="w-full rounded-full border border-coffee-dark/50 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-coffee-dark"
      />
      {q.trim() && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-coffee-dark/40 bg-white shadow-lg">
          {results.length === 0 && (
            <button
              type="button"
              onClick={() => {
                onMissing(q.trim().toUpperCase())
                setQ('')
              }}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-beige-light"
            >
              No local match for “{q.trim().toUpperCase()}” — check availability
            </button>
          )}
          {results.map((a) => (
            <button
              key={a.symbol}
              type="button"
              onClick={() => {
                // Mock Yahoo availability: only local list is available.
                if (MOCK_ASSETS.some((m) => m.symbol === a.symbol)) {
                  onAdd(a.symbol)
                } else {
                  onMissing(a.symbol)
                }
                setQ('')
              }}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-beige-light"
            >
              <span className="font-semibold">{a.symbol}</span>
              <span className="ml-2 text-stone-500">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
