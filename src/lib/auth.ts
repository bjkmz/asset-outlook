import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, isFirebaseConfigured } from './firebase'

export function register(email: string, password: string) {
  if (!auth) throw new Error('Firebase not configured')
  return createUserWithEmailAndPassword(auth, email, password)
}

export function login(email: string, password: string) {
  if (!auth) throw new Error('Firebase not configured')
  return signInWithEmailAndPassword(auth, email, password)
}

export function logout() {
  if (!auth) return Promise.resolve()
  return signOut(auth)
}

/** Signs in anonymously if no user yet, so Firestore rules (auth != null) pass. */
export async function ensureSignedIn(): Promise<User | null> {
  if (!auth) return null
  if (auth.currentUser) return auth.currentUser
  try {
    const cred = await signInAnonymously(auth)
    return cred.user
  } catch (err) {
    console.warn('[auth] anonymous sign-in failed:', err)
    return auth.currentUser
  }
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null)
  const [loading, setLoading] = useState(() => isFirebaseConfigured && !!auth)

  useEffect(() => {
    if (!auth) return
    // Guarantee a uid for per-user watchlists even before explicit login.
    void ensureSignedIn().finally(() => setLoading(false))
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, authLoading: loading }
}
