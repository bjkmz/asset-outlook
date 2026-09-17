import { AssetRow } from '../components/AssetRow'
import { DateTimeLine } from '../components/DateTimeLine'
import { TitleSpace } from '../components/TitleSpace'
import { MOCK_ASSETS } from '../mocks/market'

export function Home({
  symbols,
  onAdd,
  onRemove,
  onMissing,
}: {
  symbols: string[]
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
  onMissing: (symbol: string) => void
}) {
  const assets = symbols
    .map((s) => MOCK_ASSETS.find((a) => a.symbol === s))
    .filter((a) => a !== undefined)

  return (
    <div>
      <TitleSpace
        title={
          <img
            src="/brand.png"
            alt="Asset Lookout"
            className="h-10 w-auto max-w-full object-contain md:h-12"
          />
        }
        symbols={symbols}
        onAdd={onAdd}
        onRemove={onRemove}
        onMissing={onMissing}
      />
      <main className="space-y-8 p-4 md:p-6">
        <DateTimeLine />
        {assets.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone-500">
            No interests yet. Use the search bar above to view an asset, then
            star it to track it here.
          </p>
        ) : (
          assets.map((a) => (
            <AssetRow
              key={a.symbol}
              asset={a}
              tracked
              onAdd={onAdd}
              onRemove={onRemove}
            />
          ))
        )}
      </main>
    </div>
  )
}
