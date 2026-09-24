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
    <section className={hero ? 'bg-white md:flex md:min-h-[25vh] md:items-center' : 'bg-white'}>
      <div className="flex w-full items-start gap-4 px-6 py-8 md:py-12">
        <div className="flex min-w-0 items-center">{title}</div>
        <div className="ml-auto mr-6 w-full max-w-sm shrink-0 md:mr-12">
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
