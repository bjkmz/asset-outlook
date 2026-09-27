import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CandleChart } from '../components/CandleChart'
import { DateTimeLine } from '../components/DateTimeLine'
import { GeometricCover } from '../components/NewsCard'
import { StarButton } from '../components/StarButton'
import { TitleSpace } from '../components/TitleSpace'
import { useNews } from '../hooks/useNews'
import { useInsights } from '../hooks/useInsights'
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
  const insights = useInsights(symbol)
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">NEWS</h2>
          <button
            type="button"
            onClick={() => insights.mutate()}
            disabled={news.length === 0 || !!newsError || insights.isPending}
            className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {insights.isPending
              ? 'Analyzing…'
              : insights.data
                ? 'Refresh Insights'
                : 'Get Insights'}
          </button>
        </div>
        {insights.isError && (
          <div className="mt-3 rounded-lg bg-stone-50 p-4 text-center">
            <p className="text-sm text-stone-500">
              {insights.error.message.includes('GEMINI_API_KEY')
                ? 'Configure GEMINI_API_KEY in .env file to enable AI insights.'
                : insights.error.message}
            </p>
          </div>
        )}
        {insights.data && (
          <div className="mt-3 rounded-lg bg-beige-light/60 p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-ink">
                AI Insights · {insights.data.aggregate.toUpperCase()}
              </p>
              {insights.data.cached && (
                <span className="rounded bg-coffee/30 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  CACHED
                </span>
              )}
              <span className="text-[11px] text-stone-400">
                {insights.data.articleCount} articles · {insights.data.model}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-700">{insights.data.overview}</p>
            <div className="mt-3 space-y-1.5">
              {insights.data.sentiments.map((s) => (
                <div key={s.title} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      s.label === 'bullish'
                        ? 'bg-green-600'
                        : s.label === 'bearish'
                          ? 'bg-red-600'
                          : 'bg-stone-400'
                    }`}
                  />
                  <p className="text-stone-700">
                    <span className="font-semibold">{s.title}</span>
                    {s.note ? ` — ${s.note}` : ''}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {(
                [
                  ['Drivers', insights.data.drivers],
                  ['Risks', insights.data.risks],
                  ['Watch', insights.data.watch],
                ] as const
              ).map(([label, items]) => (
                <div key={label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                    {label}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-stone-700">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-stone-400">
              Informational summary of recent coverage, not financial advice.
            </p>
          </div>
        )}
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
