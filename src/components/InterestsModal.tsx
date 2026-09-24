import { useEffect } from 'react'
import { InterestList } from './InterestList'
import { StarButton } from './StarButton'

export function InterestsModal({
  open,
  symbols,
  onReorder,
  onRemove,
  onClose,
}: {
  open: boolean
  symbols: string[]
  onReorder: (from: number, to: number) => void
  onRemove: (symbol: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="All interests"
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">All interests ({symbols.length})</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close interests"
            className="rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-coffee/60"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <InterestList
            symbols={symbols}
            onReorder={onReorder}
            renderActions={(symbol) => (
              <StarButton tracked label={symbol} onToggle={() => onRemove(symbol)} />
            )}
          />
        </div>
      </div>
    </div>
  )
}
