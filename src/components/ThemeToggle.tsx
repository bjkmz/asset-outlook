import { useTheme } from '../hooks/useTheme'

function SunIcon() {
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
      className="shrink-0 text-ink dark:text-stone-200"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
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
      className="shrink-0 text-ink dark:text-stone-200"
    >
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink hover:bg-beige-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-dark dark:text-stone-100 dark:focus-visible:ring-stone-500 dark:hover:bg-stone-800"
    >
      {dark ? <MoonIcon /> : <SunIcon />}
      <span className="min-w-0 flex-1 text-left">Dark mode</span>
      <span
        aria-hidden="true"
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          dark ? 'bg-coffee' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform dark:bg-stone-900 ${
            dark ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
