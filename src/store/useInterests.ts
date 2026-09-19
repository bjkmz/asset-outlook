import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthUser } from '../lib/auth'
import { db, isFirebaseConfigured } from '../lib/firebase'

const KEY = 'asset-lookout:interests'
const DEFAULTS = ['AAPL', 'BTCUSD']
const DOC_ID = 'default'

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function saveLocal(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage full / private mode — cloud remains source of truth
  }
}

async function pushCloud(uid: string, symbols: string[]) {
  if (!db) return
  await setDoc(
    doc(db, 'users', uid, 'watchlists', DOC_ID),
    { name: 'My Interests', symbols, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/**
 * Interests backed by Firestore `users/{uid}/watchlists/default`,
 * with localStorage as offline fallback + one-time migration.
 * API is backwards compatible with the previous localStorage-only hook.
 */
export function useInterests() {
  const { user, authLoading } = useAuthUser()
  const [symbols, setSymbols] = useState<string[]>(loadLocal)
  const [cloudReady, setCloudReady] = useState(false)
  const migrated = useRef(false)

  // Live-subscribe to cloud watchlist once signed in.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return
    const ref = doc(db, 'users', user.uid, 'watchlists', DOC_ID)
    return onSnapshot(
      ref,
      (snap) => {
        setCloudReady(true)
        if (!snap.exists()) {
          // First login: migrate local symbols to cloud (once).
          if (!migrated.current) {
            migrated.current = true
            const local = loadLocal()
            setSymbols(local)
            void pushCloud(user.uid, local).catch((e) => console.warn('[interests] migrate failed:', e))
          }
          return
        }
        const data = snap.data() as { symbols?: unknown }
        if (Array.isArray(data.symbols)) {
          const next = data.symbols.filter((s): s is string => typeof s === 'string')
          setSymbols(next)
          saveLocal(next)
        }
      },
      (err) => console.warn('[interests] snapshot failed:', err),
    )
  }, [user])

  const add = useCallback(
    (symbol: string) => {
      if (symbols.includes(symbol)) return
      const next = [...symbols, symbol]
      setSymbols(next)
      saveLocal(next)
      if (user && db) void pushCloud(user.uid, next).catch((e) => console.warn('[interests] add failed:', e))
    },
    [symbols, user],
  )

  const remove = useCallback(
    (symbol: string) => {
      const next = symbols.filter((s) => s !== symbol)
      setSymbols(next)
      saveLocal(next)
      if (user && db) void pushCloud(user.uid, next).catch((e) => console.warn('[interests] remove failed:', e))
    },
    [symbols, user],
  )

  return { symbols, add, remove, user, authLoading, cloudReady }
}
