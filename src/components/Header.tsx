import { Link } from 'react-router'
import { SearchBar } from './SearchBar'

export function Header({
  onAdd,
  onMissing,
}: {
  onAdd: (symbol: string) => void
  onMissing: (symbol: string) => void
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-coffee-dark/40 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="Asset Lookout" className="h-8 w-8" />
          <img src="/brand.png" alt="" className="hidden h-6 sm:block" />
        </Link>
        <SearchBar onAdd={onAdd} onMissing={onMissing} />
      </div>
    </header>
  )
}
