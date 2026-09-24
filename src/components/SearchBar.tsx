import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { displaySymbol } from '../lib/format'
import type { Asset } from '../types'
import { StarButton } from './StarButton'

interface ApiAsset extends Asset {
  exchange: string
}

async function fetchAssets(q: string): Promise<ApiAsset[]> {
  const res = await fetch(`/api/assets?q=${encodeURIComponent(q)}&limit=8`)
  if (!res.ok) throw new Error('asset search failed')
  return res.json()
}

export function SearchBar({
  symbols,
  pending,
  onAdd,
  onRemove,
  onMissing,
}: {
  symbols: string[]
  pending: string[]
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
  onMissing: (symbol: string) => void
}) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setQ('')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQ('')
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const { data, isError, isFetching } = useQuery({
    queryKey: ['assets', debounced],
    queryFn: () => fetchAssets(debounced),
    enabled: debounced.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const results: ApiAsset[] = data ?? []

  const openAsset = (symbol: string) => {
    setQ('')
    navigate(`/asset/${symbol}`)
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
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
          {isFetching && (
            <p className="px-4 py-2 text-xs text-stone-400">Searching…</p>
          )}
          {isError && (
            <p className="px-4 py-2 text-xs text-stone-500">
              Search is unavailable. Error encountered.
            </p>
          )}
          {!isFetching && !isError && results.length === 0 && (
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
                key={`${a.exchange}:${a.symbol}`}
                className="flex items-center gap-1 px-2 py-1 hover:bg-beige-light"
              >
                <button
                  type="button"
                  onClick={() => openAsset(a.symbol)}
                  className="min-w-0 flex-1 px-2 py-1 text-left text-sm"
                >
                  <span className="font-semibold">{displaySymbol(a.symbol)}</span>
                  <span className="ml-2 text-stone-500">{a.name}</span>
                  {a.exchange && (
                    <span className="ml-2 text-[11px] text-stone-400">{a.exchange}</span>
                  )}
                </button>
                <StarButton
                  tracked={tracked}
                  pending={pending.includes(a.symbol)}
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
