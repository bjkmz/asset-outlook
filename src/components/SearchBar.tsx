import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MOCK_ASSETS, searchMockAssets } from '../mocks/market'
import { StarButton } from './StarButton'

export function SearchBar({
  symbols,
  onAdd,
  onRemove,
  onMissing,
}: {
  symbols: string[]
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
  onMissing: (symbol: string) => void
}) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const results = searchMockAssets(q)

  const openAsset = (symbol: string) => {
    setQ('')
    navigate(`/asset/${symbol}`)
  }

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
          <p className="border-b border-coffee-dark/30 bg-beige-light px-4 py-1.5 text-[11px] text-stone-500">
            Selecting a result opens its page. It is not tracked until you star
            it.
          </p>
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
          {results.map((a) => {
            const tracked = symbols.includes(a.symbol)
            return (
              <div
                key={a.symbol}
                className="flex items-center gap-1 px-2 py-1 hover:bg-beige-light"
              >
                <button
                  type="button"
                  onClick={() => {
                    // Mock Yahoo availability: only local list is available.
                    if (MOCK_ASSETS.some((m) => m.symbol === a.symbol)) {
                      openAsset(a.symbol)
                    } else {
                      onMissing(a.symbol)
                      setQ('')
                    }
                  }}
                  className="min-w-0 flex-1 px-2 py-1 text-left text-sm"
                >
                  <span className="font-semibold">{a.symbol}</span>
                  <span className="ml-2 text-stone-500">{a.name}</span>
                </button>
                <StarButton
                  tracked={tracked}
                  label={a.symbol}
                  onToggle={() =>
                    tracked ? onRemove(a.symbol) : onAdd(a.symbol)
                  }
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
