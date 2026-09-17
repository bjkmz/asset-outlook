export function StarButton({
  tracked,
  onToggle,
  label,
}: {
  tracked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={tracked}
      aria-label={tracked ? `Remove ${label} from interests` : `Add ${label} to interests`}
      title={tracked ? 'Remove from interests' : 'Add to interests'}
      className={`shrink-0 rounded-full px-2 py-0.5 text-lg leading-none ${
        tracked ? 'text-amber-500' : 'text-stone-400 hover:text-amber-500'
      }`}
    >
      {tracked ? '★' : '☆'}
    </button>
  )
}
