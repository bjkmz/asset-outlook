export function UnavailableModal({
  symbol,
  onClose,
}: {
  symbol: string | null
  onClose: () => void
}) {
  if (!symbol) return null
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold">Asset unavailable</h2>
        <p className="mt-2 text-sm text-stone-600">
          No Yahoo market data found for “{symbol}”. The symbol was not added
          to interests.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
