import { Link } from 'react-router'
import { mockNews, mockPreview } from '../mocks/market'
import type { Asset } from '../types'
import { NewsCard } from './NewsCard'
import { PriceChart } from './PriceChart'
import { StarButton } from './StarButton'

export function AssetRow({
  asset,
  tracked,
  onAdd,
  onRemove,
}: {
  asset: Asset
  tracked: boolean
  onAdd: (symbol: string) => void
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">${last.toFixed(2)}</span>
          <StarButton
            tracked={tracked}
            label={asset.symbol}
            onToggle={() =>
              tracked ? onRemove(asset.symbol) : onAdd(asset.symbol)
            }
          />
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
