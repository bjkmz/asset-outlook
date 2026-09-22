import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
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

/**
 * Records whether the most recent explicit auth attempt was a sign-in
 * or a signup, so useInterests can apply the matching sync rule.
 * Consumed once per uid change via takeLastAuthMode.
 */
let lastAuthMode: 'login' | 'signup' | null = null

export function setLastAuthMode(mode: 'login' | 'signup') {
  lastAuthMode = mode
}

export function takeLastAuthMode(): 'login' | 'signup' | null {
  const mode = lastAuthMode
  lastAuthMode = null
  return mode
}

/** Guests stay signed out and use localStorage only. */
export function useAuthUser() {
  const [user, setUser] = useState(auth?.currentUser ?? null)
  const [loading, setLoading] = useState(() => isFirebaseConfigured && !!auth)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, authLoading: loading }
}
