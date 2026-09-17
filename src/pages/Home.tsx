import { AssetRow } from '../components/AssetRow'
import { MOCK_ASSETS } from '../mocks/market'

export function Home({
  symbols,
  onRemove,
}: {
  symbols: string[]
  onRemove: (symbol: string) => void
}) {
  const assets = symbols
    .map((s) => MOCK_ASSETS.find((a) => a.symbol === s))
    .filter((a) => a !== undefined)

  if (assets.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-coffee-dark/60 bg-white/60 p-8 text-center text-sm text-stone-500">
        No interests yet. Use the search bar above to add an asset.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {assets.map((a) => (
        <AssetRow key={a.symbol} asset={a} onRemove={onRemove} />
      ))}
    </div>
  )
}
