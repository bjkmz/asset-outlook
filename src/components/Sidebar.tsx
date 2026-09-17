import { useState } from 'react'

export function Sidebar() {
  const [open, setOpen] = useState(true)
  return (
    <aside
      className={`shrink-0 border-r border-coffee-dark/40 bg-beige transition-all ${
        open ? 'w-48' : 'w-12'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="m-2 rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-coffee/60"
        aria-label="Toggle menu"
      >
        {open ? '‹' : '›'}
      </button>
      {open && (
        <p className="px-4 text-xs text-stone-500">Menu reserved for future.</p>
      )}
    </aside>
  )
}
