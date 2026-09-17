import { useState } from 'react'
import { useParams } from 'react-router'
import { PriceChart } from '../components/PriceChart'
import { StarButton } from '../components/StarButton'
import { MOCK_ASSETS, mockNews, mockPrices } from '../mocks/market'
import type { RangeKey } from '../types'

const RANGES: RangeKey[] = ['1d', '1w', '1Mo', '3Mo', '1Y', '5Y']

export function AssetView({
  symbols,
  onAdd,
  onRemove,
}: {
  symbols: string[]
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
}) {
  const { symbol = '' } = useParams()
  const [range, setRange] = useState<RangeKey>('1d')
  const asset = MOCK_ASSETS.find((a) => a.symbol === symbol)
  const prices = mockPrices(symbol, range)
  const news = [...mockNews(symbol)].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  )

  if (!asset) {
    return <p className="text-sm text-stone-500">Unknown asset “{symbol}”.</p>
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-coffee-dark/40 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">
            {asset.name} ({asset.symbol})
          </h1>
          <StarButton
            tracked={symbols.includes(asset.symbol)}
            label={asset.symbol}
            onToggle={() =>
              symbols.includes(asset.symbol)
                ? onRemove(asset.symbol)
                : onAdd(asset.symbol)
            }
          />
        </div>
        <div className="mt-2">
          <PriceChart data={prices} height={280} />
        </div>
        <div className="mt-2 flex justify-end gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2 py-1 text-xs font-bold ${
                r === range
                  ? 'bg-ink text-white'
                  : 'bg-beige-light text-ink hover:bg-coffee/60'
              }`}
            >
              {r === '1Mo' ? '1M' : r}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-coffee-dark/40 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">NEWS</h2>
        <div className="mt-3 space-y-3">
          {news.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 rounded-xl border border-coffee-dark/30 p-3 hover:shadow-md"
            >
              <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-beige text-xs text-stone-500">
                Cover
              </div>
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                  {a.summary}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
