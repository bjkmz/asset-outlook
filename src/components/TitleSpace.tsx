import type { ReactNode } from 'react'
import { SearchBar } from './SearchBar'

export function TitleSpace({
  title,
  symbols,
  onAdd,
  onRemove,
  onMissing,
}: {
  title: ReactNode
  symbols: string[]
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
  onMissing: (symbol: string) => void
}) {
  return (
    <section className="bg-white">
      <div className="flex w-full items-start gap-4 px-6 py-8 md:py-12">
        <div className="min-w-0">{title}</div>
        <div className="ml-auto mr-6 w-full max-w-sm shrink-0 md:mr-12">
          <SearchBar
            symbols={symbols}
            onAdd={onAdd}
            onRemove={onRemove}
            onMissing={onMissing}
          />
        </div>
      </div>
    </section>
  )
}
