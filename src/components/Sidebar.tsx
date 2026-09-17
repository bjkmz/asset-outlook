import { useState } from 'react'
import { Link } from 'react-router'

export function Sidebar() {
  const [open, setOpen] = useState(true)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-fit shrink-0 rounded-md border border-coffee-dark/40 bg-white px-2 py-1 text-sm font-semibold text-ink hover:bg-coffee/40"
        aria-label="Open menu"
      >
        ›
      </button>
    )
  }
  return (
    <aside className="w-48 shrink-0 border-r border-coffee-dark/40 bg-white">
      <div className="flex items-center justify-between p-2">
        <Link to="/" aria-label="Home">
          <img
            src="/logo.png"
            alt="Asset Lookout"
            className="h-10 w-auto object-contain"
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-coffee/60"
          aria-label="Close menu"
        >
          ‹
        </button>
      </div>
      <p className="px-4 text-xs text-stone-500">Menu reserved for future.</p>
    </aside>
  )
}
