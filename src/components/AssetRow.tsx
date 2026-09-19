import { Link } from 'react-router'
import { displaySymbol } from '../lib/format'
import { mockNews } from '../mocks/market'
import type { Asset } from '../types'
import { CandleChart } from './CandleChart'
import { NewsCard } from './NewsCard'
import { StarButton } from './StarButton'
import { usePrices } from '../hooks/usePrices'

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
  const { data } = usePrices(asset.symbol, '1d', 'preview')
  const candles = data?.candles ?? []
  const news = mockNews(asset.symbol)
  const last = candles.length > 0 ? candles[candles.length - 1].c : null

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
      <div className="mt-3 grid gap-4 md:grid-cols-[280px_1fr]">
        {candles.length > 0 ? (
          <CandleChart data={candles} height={140} compact />
        ) : (
          <p className="py-10 text-center text-xs text-stone-400">
            No price data. Start the backend for live charts.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {news.map((a) => (
            <NewsCard key={a.id} article={a} />
          ))}
        </div>
      </div>
    </section>
  )
}
