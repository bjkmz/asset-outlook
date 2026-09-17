import { Link } from 'react-router'
import { SearchBar } from './SearchBar'

export function Header({
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
  return (
    <header className="border-b border-coffee-dark/40 bg-white">
      <div className="flex w-full items-center gap-4 px-6 py-8 md:py-12">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img src="/logo.png" alt="Asset Lookout" className="h-12 md:h-16" />
          <img src="/brand.png" alt="" className="hidden h-10 md:block md:h-12" />
        </Link>
        <div className="ml-auto mr-6 w-full max-w-sm md:mr-12">
          <SearchBar
            symbols={symbols}
            onAdd={onAdd}
            onRemove={onRemove}
            onMissing={onMissing}
          />
        </div>
      </div>
    </header>
  )
}
