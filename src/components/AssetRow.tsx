import { Link } from 'react-router'
import { mockNews, mockPreview } from '../mocks/market'
import type { Asset } from '../types'
import { NewsCard } from './NewsCard'
import { PriceChart } from './PriceChart'

export function AssetRow({
  asset,
  onRemove,
}: {
  asset: Asset
  onRemove: (symbol: string) => void
}) {
  const preview = mockPreview(asset.symbol)
  const news = mockNews(asset.symbol)
  const last = preview[preview.length - 1]?.price ?? 0

  return (
    <section className="rounded-2xl border border-coffee-dark/40 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Link
          to={`/asset/${asset.symbol}`}
          className="text-lg font-bold text-ink hover:underline"
        >
          {asset.name} ({asset.symbol})
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">${last.toFixed(2)}</span>
          <button
            type="button"
            onClick={() => onRemove(asset.symbol)}
            className="rounded-full border border-coffee-dark/50 px-2 py-0.5 text-xs hover:bg-beige-light"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[280px_1fr]">
        <PriceChart data={preview} height={140} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {news.map((a) => (
            <NewsCard key={a.id} article={a} />
          ))}
        </div>
      </div>
    </section>
  )
}
