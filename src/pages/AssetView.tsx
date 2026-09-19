import { useState } from 'react'
import { useParams } from 'react-router'
import { CandleChart } from '../components/CandleChart'
import { DateTimeLine } from '../components/DateTimeLine'
import { StarButton } from '../components/StarButton'
import { TitleSpace } from '../components/TitleSpace'
import { usePrices } from '../hooks/usePrices'
import { useResolvedAssets } from '../hooks/useResolvedAssets'
import { displaySymbol } from '../lib/format'
import { mockNews } from '../mocks/market'
import type { RangeKey } from '../types'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1d', label: '1D' },
  { key: '5d', label: '5D' },
  { key: '1Mo', label: '1M' },
  { key: '3Mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1Y', label: '1Y' },
  { key: '5y', label: '5Y' },
  { key: 'ytd', label: 'YTD' },
  { key: 'max', label: 'MAX' },
]

export function AssetView({
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
  const { symbol = '' } = useParams()
  const [range, setRange] = useState<RangeKey>('1d')
  const [asset] = useResolvedAssets(symbol ? [symbol] : [])
  const { data, isFetching } = usePrices(
    symbol,
    range,
    range === '1d' ? 'detail' : 'preview',
  )
  const candles = data?.candles ?? []
  const news = [...mockNews(symbol)].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  )

  if (!symbol) {
    return <p className="text-sm text-stone-500">Unknown asset.</p>
  }

  return (
    <div>
      <TitleSpace
        title={
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              {asset.name} ({displaySymbol(asset.symbol)})
            </h1>
            <StarButton
              tracked={symbols.includes(asset.symbol)}
              pending={pending.includes(asset.symbol)}
              label={asset.symbol}
              onToggle={() =>
                symbols.includes(asset.symbol)
                  ? onRemove(asset.symbol)
                  : onAdd(asset.symbol)
              }
            />
          </div>
        }
        symbols={symbols}
        pending={pending}
        onAdd={onAdd}
        onRemove={onRemove}
        onMissing={onMissing}
      />
      <main className="space-y-4 p-4 md:p-6">
      <section className="bg-white py-2">
        {candles.length > 0 ? (
          <CandleChart data={candles} height={280} />
        ) : (
          <p className="py-20 text-center text-sm text-stone-400">
            {isFetching ? 'Loading chart…' : 'No price data. Start the backend for live charts.'}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2 py-1 text-xs font-bold ${
                r.key === range
                  ? 'bg-ink text-white'
                  : 'bg-beige-light text-ink hover:bg-coffee/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <DateTimeLine />
      <section className="bg-white py-2">
        <h2 className="text-lg font-bold">NEWS</h2>
        <div className="mt-3 space-y-3">
          {news.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 py-3 hover:bg-beige-light/50"
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
      </main>
    </div>
  )
}
