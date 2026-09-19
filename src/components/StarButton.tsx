export function StarButton({
  tracked,
  pending = false,
  onToggle,
  label,
}: {
  tracked: boolean
  pending?: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={tracked}
      aria-busy={pending}
      aria-label={tracked ? `Remove ${label} from interests` : `Add ${label} to interests`}
      title={tracked ? 'Remove from interests' : 'Add to interests'}
      className={`shrink-0 rounded-full px-2 py-0.5 text-lg leading-none disabled:opacity-50 ${
        tracked ? 'text-amber-500' : 'text-stone-400 hover:text-amber-500'
      }`}
    >
      {pending ? '…' : tracked ? '★' : '☆'}
    </button>
  )
}
