import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { takeLastAuthMode, useAuthUser } from '../lib/auth'
import { db, isFirebaseConfigured } from '../lib/firebase'

const KEY = 'asset-lookout:interests'
const DEFAULTS = ['AAPL', 'USDJPY', 'SPX', 'GC1!', 'BTCUSD']
const DOC_ID = 'default'

export interface PendingSync {
  cloud: string[]
  local: string[]
}

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

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i])
}

function isDefaults(list: string[]): boolean {
  return sameList(list, DEFAULTS)
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
 * Guests (signed out) use localStorage only.
 * Sign-ins pull the cloud list (overwriting localStorage), except when the
 * device list was customized: then `pendingSync` holds both sides until the
 * user picks load-from-cloud or overwrite-with-local in the AuthModal.
 * The inquiry is evaluated on every sign-in; resolving converges the lists,
 * so an answered choice never re-asks by itself.
 * First-seen UIDs (new signups) push the device list to the cloud.
 * API is backwards compatible with the previous localStorage-only hook.
 */
export function useInterests() {
  const { user, authLoading } = useAuthUser()
  const [symbols, setSymbols] = useState<string[]>(loadLocal)
  const [cloudReady, setCloudReady] = useState(false)
  const [pendingSync, setPendingSync] = useState<PendingSync | null>(null)
  const [syncDismissed, setSyncDismissed] = useState(false)
  const migratedUid = useRef<string | null>(null)
  const handledUid = useRef<string | null>(null)
  const authModeRef = useRef<'login' | 'signup' | null>(null)
  const pendingSyncRef = useRef<PendingSync | null>(null)

  // Fresh guest state after explicit sign-out: no carry-over from previous account.
  // Exception: a sync choice left undecided keeps the current device list instead of resetting to defaults.
  const resetGuest = useCallback(() => {
    if (pendingSyncRef.current) {
      saveLocal(symbols)
    } else {
      saveLocal(DEFAULTS)
      setSymbols(DEFAULTS)
    }
    setCloudReady(false)
    setPendingSync(null)
    setSyncDismissed(false)
    migratedUid.current = null
    handledUid.current = null
    authModeRef.current = null
    pendingSyncRef.current = null
  }, [symbols])

  // Live-subscribe to cloud watchlist once signed in. Guests stay local-only.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) {
      setCloudReady(false)
      return
    }
    // Intent for this uid transition; null on session restore (reload).
    authModeRef.current = takeLastAuthMode()
    setCloudReady(false)
    const ref = doc(db, 'users', user.uid, 'watchlists', DOC_ID)
    return onSnapshot(
      ref,
      (snap) => {
        setCloudReady(true)
        if (!snap.exists()) {
          // First seen per UID: seed cloud from the device list (new signup path).
          if (migratedUid.current !== user.uid) {
            migratedUid.current = user.uid
            const local = loadLocal()
            setSymbols(local)
            saveLocal(local)
            void pushCloud(user.uid, local).catch((e) => console.warn('[interests] migrate failed:', e))
          }
          return
        }
        const data = snap.data() as { symbols?: unknown }
        if (!Array.isArray(data.symbols)) return
        const cloud = data.symbols.filter((s): s is string => typeof s === 'string')
        // Choice outstanding: leave the device list alone until resolved.
        if (pendingSyncRef.current) return
        const local = loadLocal()
        // Inquiry, decided once per uid: sign-in (or restored session) with a
        // customized device list that conflicts with an unresolved cloud list.
        // Signup and untouched-defaults guests keep the silent behavior.
        if (
          handledUid.current !== user.uid &&
          authModeRef.current !== 'signup' &&
          !isDefaults(local) &&
          !sameList(cloud, local)
        ) {
          handledUid.current = user.uid
          migratedUid.current = user.uid
          pendingSyncRef.current = { cloud, local }
          setPendingSync({ cloud, local })
          setSymbols(local)
          saveLocal(local)
          return
        }
        // Silent pull (sign-in path): cloud overwrites localStorage.
        handledUid.current = user.uid
        migratedUid.current = user.uid
        setSymbols(cloud)
        saveLocal(cloud)
      },
      (err) => console.warn('[interests] snapshot failed:', err),
    )
  }, [user])

  const resolveSync = useCallback(
    (choice: 'pull' | 'push') => {
      const pending = pendingSyncRef.current
      const uid = user?.uid
      if (!pending || !uid) return
      if (choice === 'pull') {
        setSymbols(pending.cloud)
        saveLocal(pending.cloud)
      } else {
        setSymbols(pending.local)
        saveLocal(pending.local)
        if (db) void pushCloud(uid, pending.local).catch((e) => console.warn('[interests] sync push failed:', e))
      }
      pendingSyncRef.current = null
      setPendingSync(null)
      setSyncDismissed(false)
    },
    [user],
  )

  /** Dismiss without choosing: keep local, re-offer the choice later. */
  const dismissSync = useCallback(() => {
    setSyncDismissed(true)
  }, [])

  /** Re-offer a dismissed sync choice (account tile re-entry). */
  const reopenSync = useCallback(() => {
    setSyncDismissed(false)
  }, [])

  const add = useCallback(
    (symbol: string) => {
      if (symbols.includes(symbol)) return
      const next = [...symbols, symbol]
      setSymbols(next)
      saveLocal(next)
      // No cloud writes while the sync choice is outstanding.
      if (user && db && !pendingSyncRef.current)
        void pushCloud(user.uid, next).catch((e) => console.warn('[interests] add failed:', e))
    },
    [symbols, user],
  )

  const remove = useCallback(
    (symbol: string) => {
      const next = symbols.filter((s) => s !== symbol)
      setSymbols(next)
      saveLocal(next)
      // No cloud writes while the sync choice is outstanding.
      if (user && db && !pendingSyncRef.current)
        void pushCloud(user.uid, next).catch((e) => console.warn('[interests] remove failed:', e))
    },
    [symbols, user],
  )

  return {
    symbols,
    add,
    remove,
    resetGuest,
    user,
    authLoading,
    cloudReady,
    pendingSync,
    syncDismissed,
    resolveSync,
    dismissSync,
    reopenSync,
  }
}
