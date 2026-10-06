import { useState } from 'react'
import { Link } from 'react-router'
import type { User } from 'firebase/auth'
import { InterestList } from './InterestList'
import { InterestsModal } from './InterestsModal'
import { StarButton } from './StarButton'

function AccountIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-coffee"
    >
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-coffee"
    >
      <path d="M13 17l5-5-5-5" />
      <path d="M6 17l5-5-5-5" />
    </svg>
  )
}

function LoginIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function Sidebar({
  user,
  authLoading,
  symbols,
  onReorder,
  onRemove,
  onAccountClick,
  syncAlert,
}: {
  user: User | null
  authLoading?: boolean
  symbols: string[]
  onReorder: (from: number, to: number) => void
  onRemove: (symbol: string) => void
  onAccountClick: () => void
  syncAlert?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sticky top-2 h-fit shrink-0 self-start rounded-md border border-coffee-dark/40 bg-white p-2 text-ink shadow-sm hover:bg-coffee/40"
        aria-label="Open menu"
      >
        <ChevronRightIcon />
      </button>
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Close menu"
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
      />
      <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-48 shrink-0 flex-col border-r border-coffee-dark/40 bg-white lg:sticky lg:top-0">
      <div className="relative flex items-center gap-2 px-4 py-4">
        <Link to="/" aria-label="Home" className="flex shrink-0 items-center">
          <img
            src="/logo.png"
            alt="Asset Outlook"
            className="h-10 w-auto max-w-full object-contain"
          />
        </Link>
        <p className="shrink-0 text-left font-serif text-lg italic leading-tight">
          Asset
          <br />
          Outlook
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-md border border-r-0 border-coffee-dark/40 bg-white px-1 py-3 text-ink shadow-[1px_0_0_0_white,0_1px_2px_0_rgb(0_0_0/0.05)] hover:bg-coffee/40"
          aria-label="Close menu"
        >
          <ChevronLeftIcon />
        </button>
      </div>
      {/* <p className="min-h-0 flex-1 overflow-y-auto px-4 text-xs text-stone-500">Menu reserved for future.</p> */}
      <nav aria-label="Interests" className="min-h-0 flex-1 overflow-y-auto mt-[10vh] px-2 py-2">
        <p className="px-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-stone-500">
          Interests
        </p>
        <InterestList
          symbols={symbols.slice(0, 10)}
          onReorder={onReorder}
          renderActions={(symbol) => (
            <StarButton tracked label={symbol} onToggle={() => onRemove(symbol)} />
          )}
        />
        {symbols.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-center text-xs font-semibold text-ink hover:bg-beige-light"
          >
            View all ({symbols.length})
          </button>
        )}
      </nav>
      {!authLoading && (
      <div className="mt-auto border-t border-coffee-dark/40 p-2">
        <button
          type="button"
          onClick={onAccountClick}
          aria-label="Account"
          title={user?.email ?? 'Guest'}
          className="relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-beige-light"
        >
          <AccountIcon />
          <span className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-ink">
            {user?.email ?? 'Guest'}
          </span>
          {syncAlert && (
            <span
              aria-hidden="true"
              title="Watchlist sync needed"
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500"
            />
          )}
          {user ? <LogoutIcon /> : <LoginIcon />}
        </button>
      </div>
      )}
      <InterestsModal
        open={showAll}
        symbols={symbols}
        onReorder={onReorder}
        onRemove={onRemove}
        onClose={() => setShowAll(false)}
      />
      </aside>
    </>
  )
}
