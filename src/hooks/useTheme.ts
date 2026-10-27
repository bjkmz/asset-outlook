import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'asset-outlook:theme'
const listeners = new Set<() => void>()

function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode: theme still applies for this page.
  }
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light')
  return {
    theme,
    toggleTheme: () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
