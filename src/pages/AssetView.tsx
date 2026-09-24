import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CandleChart } from '../components/CandleChart'
import { DateTimeLine } from '../components/DateTimeLine'
import { GeometricCover } from '../components/NewsCard'
import { StarButton } from '../components/StarButton'
import { TitleSpace } from '../components/TitleSpace'
import { useNews } from '../hooks/useNews'
import { usePrices } from '../hooks/usePrices'
import { useResolvedAssets } from '../hooks/useResolvedAssets'
import { displaySymbol } from '../lib/format'
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
  const { data: news = [], error: newsError, isLoading: newsLoading } = useNews(symbol)
  const candles = data?.candles ?? []

  if (!symbol) {
    return <p className="text-sm text-stone-500">Unknown asset.</p>
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <TitleSpace
        title={
          <Link to="/" aria-label="Home" className="flex items-center">
            <img
              src="/brand.png"
              alt="Asset Lookout"
              className="h-[30px] w-auto max-w-full object-contain"
            />
          </Link>
        }
        subTitle={
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
        {newsError ? (
          <div className="mt-3 rounded-lg bg-stone-50 p-6 text-center">
            <p className="text-sm text-stone-500">
              {newsError.message.includes('FINNHUB_API_KEY')
                ? 'Configure FINNHUB_API_KEY in .env file to enable live news feeds.'
                : 'Unable to load news feed.'}
            </p>
          </div>
        ) : newsLoading ? (
          <div className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse gap-3 py-3">
                <div className="h-20 w-28 shrink-0 rounded-lg bg-stone-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-stone-200" />
                  <div className="h-3 w-full bg-stone-200" />
                  <div className="h-3 w-1/2 bg-stone-200" />
                </div>
              </div>
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="mt-3 space-y-3">
            {news.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="group flex gap-3 py-3 transition hover:bg-beige-light/50"
              >
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-beige">
                  {a.image ? (
                    <img
                      src={a.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <GeometricCover label={a.source || a.title} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-ink group-hover:text-coffee">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                    {a.summary}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
                    <span>{a.source || 'News'}</span>
                    <span>{new Date(a.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg bg-stone-50 p-6 text-center">
            <p className="text-sm text-stone-400">No news articles found in the past 30 days.</p>
          </div>
        )}
      </section>
      </main>
    </div>
  )
}
