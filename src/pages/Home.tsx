import { AssetRow } from '../components/AssetRow'
import { DateTimeLine } from '../components/DateTimeLine'
import { TitleSpace } from '../components/TitleSpace'
import { useResolvedAssets } from '../hooks/useResolvedAssets'

export function Home({
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
  const assets = useResolvedAssets(symbols)

  return (
    <div>
      <TitleSpace
        hero
        title={
          <img
            src="/brand.png"
            alt="Asset Lookout"
            className="h-[12.5vh] w-auto max-w-full object-contain md:h-[25vh]"
          />
        }
        symbols={symbols}
        pending={pending}
        onAdd={onAdd}
        onRemove={onRemove}
        onMissing={onMissing}
      />
      <div aria-hidden="true" className="hidden md:block md:h-[25vh]" />
      <main className="space-y-8 p-4 md:p-6">
        <DateTimeLine />
        {symbols.length === 0 ? (
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
              pending={pending.includes(a.symbol)}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          ))
        )}
      </main>
    </div>
  )
}
