import { Link } from 'react-router'
import { displaySymbol } from '../lib/format'
import { useMetrics } from '../hooks/useMetrics'
import { useNews } from '../hooks/useNews'
import { usePrices } from '../hooks/usePrices'
import type { Asset } from '../types'
import { CandleChart } from './CandleChart'
import { NewsCard } from './NewsCard'
import { StarButton } from './StarButton'
import { HomeMetricsStrip } from './HomeMetricsStrip'

export function AssetRow({
  asset,
  tracked,
  pending,
  onAdd,
  onRemove,
}: {
  asset: Asset
  tracked: boolean
  pending: boolean
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
}) {
  const { data: priceData } = usePrices(asset.symbol, '1d', 'preview')
  const { data: metrics } = useMetrics(asset.symbol, '1d')
  const { data: news = [], error: newsError, isLoading: newsLoading } = useNews(asset.symbol)
  const candles = priceData?.candles ?? []
  const last = candles.length > 0 ? candles[candles.length - 1].c : null
  const displayArticles = news.slice(0, 4)

  return (
    <section className="bg-white px-1 py-6">
      <div className="flex items-center justify-between">
        <Link
          to={`/asset/${asset.symbol}`}
          className="text-lg font-bold text-ink hover:underline"
        >
          {asset.name} ({displaySymbol(asset.symbol)})
        </Link>
        <div className="flex items-center gap-2">
          {last !== null && (
            <span className="text-sm font-semibold">${last.toFixed(2)}</span>
          )}
          <span className="hidden items-center gap-3 md:flex">
            <HomeMetricsStrip values={metrics?.values} />
          </span>
          <StarButton
            tracked={tracked}
            pending={pending}
            label={asset.symbol}
            onToggle={() =>
              tracked ? onRemove(asset.symbol) : onAdd(asset.symbol)
            }
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 md:hidden">
        <HomeMetricsStrip values={metrics?.values} />
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[280px_1fr]">
        {candles.length > 0 ? (
          <CandleChart data={candles} height={140} compact />
        ) : (
          <p className="py-10 text-center text-xs text-stone-400">
            No price data. Start the backend for live charts.
          </p>
        )}
        <div>
          {newsError ? (
            <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg bg-stone-50 p-4 text-center">
              <p className="text-xs text-stone-500">
                {newsError.message.includes('FINNHUB_API_KEY')
                  ? 'Configure FINNHUB_API_KEY in .env file for live news feeds.'
                  : 'Unable to load news feed.'}
              </p>
            </div>
          ) : newsLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-stone-100 p-2">
                  <div className="h-24 bg-stone-200" />
                  <div className="mt-2 h-3 w-3/4 bg-stone-200" />
                  <div className="mt-1 h-2 w-1/2 bg-stone-200" />
                </div>
              ))}
            </div>
          ) : displayArticles.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {displayArticles.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg bg-stone-50 p-4 text-center">
              <p className="text-xs text-stone-400">No recent news available.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
