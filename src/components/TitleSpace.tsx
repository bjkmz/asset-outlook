import type { ReactNode } from 'react'
import { SearchBar } from './SearchBar'

export function TitleSpace({
  title,
  subTitle,
  symbols,
  pending,
  onAdd,
  onRemove,
  onMissing,
  hero = false,
}: {
  title: ReactNode
  subTitle?: ReactNode
  symbols: string[]
  pending: string[]
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
  onMissing: (symbol: string) => void
  hero?: boolean
}) {
  return (
    <section className={hero ? 'bg-white md:flex md:min-h-[20vh] md:items-center' : 'bg-white'}>
      <div className="flex w-full flex-row items-center gap-3 px-4 py-5 md:gap-4 md:px-6 md:py-6">
        <div className="min-w-0 shrink-0">{title}</div>
        <div className="ml-auto w-full min-w-0 max-w-56 flex-1 md:mr-12 md:max-w-sm md:flex-none">
          <SearchBar
            symbols={symbols}
            pending={pending}
            onAdd={onAdd}
            onRemove={onRemove}
            onMissing={onMissing}
          />
        </div>
      </div>
      {subTitle && <div className="w-full px-6 pb-6 md:pb-8">{subTitle}</div>}
    </section>
  )
}
