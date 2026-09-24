import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0 text-stone-400"
    >
      <circle cx="9" cy="6" r="1.8" />
      <circle cx="15" cy="6" r="1.8" />
      <circle cx="9" cy="12" r="1.8" />
      <circle cx="15" cy="12" r="1.8" />
      <circle cx="9" cy="18" r="1.8" />
      <circle cx="15" cy="18" r="1.8" />
    </svg>
  )
}

/**
 * Draggable interests list. Indices in onReorder refer to the `symbols`
 * array as passed (callers slicing Top-10 keep identical indices).
 */
export function InterestList({
  symbols,
  onReorder,
  renderActions,
}: {
  symbols: string[]
  onReorder: (from: number, to: number) => void
  renderActions?: (symbol: string) => ReactNode
}) {
  const dragFrom = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  return (
    <ul className="space-y-0.5">
      {symbols.map((symbol, index) => (
        <li key={symbol}>
          <div
            draggable
            onDragStart={(e) => {
              dragFrom.current = index
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(index))
            }}
            onDragEnd={() => {
              dragFrom.current = null
              setOverIndex(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setOverIndex(index)
            }}
            onDragLeave={() => setOverIndex((v) => (v === index ? null : v))}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragFrom.current ?? Number(e.dataTransfer.getData('text/plain'))
              dragFrom.current = null
              setOverIndex(null)
              if (Number.isInteger(from)) onReorder(from, index)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-beige-light ${
              overIndex === index ? 'ring-1 ring-coffee-dark' : ''
            }`}
          >
            <span
              className="cursor-grab touch-none select-none active:cursor-grabbing"
              title="Drag to reorder"
              aria-hidden="true"
            >
              <GripIcon />
            </span>
            <Link
              to={`/asset/${encodeURIComponent(symbol)}`}
              className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-ink hover:underline"
            >
              {symbol}
            </Link>
            {renderActions?.(symbol)}
          </div>
        </li>
      ))}
    </ul>
  )
}
