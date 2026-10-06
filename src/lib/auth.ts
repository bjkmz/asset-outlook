import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
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

export function updateDisplayName(name: string) {
  if (!auth?.currentUser) throw new Error('Not signed in')
  return updateProfile(auth.currentUser, { displayName: name })
}

export function sendVerificationEmail() {
  if (!auth?.currentUser) throw new Error('Not signed in')
  return sendEmailVerification(auth.currentUser)
}

export async function reloadUser() {
  if (!auth?.currentUser) return null
  await auth.currentUser.reload()
  return auth.currentUser
}

export function sendResetEmail(email: string) {
  if (!auth) throw new Error('Firebase not configured')
  return sendPasswordResetEmail(auth, email)
}

export async function reauthWithPassword(password: string) {
  const user = auth?.currentUser
  if (!user) throw new Error('Not signed in')
  if (!password) throw new Error('Enter your password to confirm.')
  if (!user.email) throw new Error('Not signed in')
  const cred = EmailAuthProvider.credential(user.email, password)
  await reauthenticateWithCredential(user, cred)
}

export async function deleteAccount(password: string) {
  const user = auth?.currentUser
  if (!user) throw new Error('Not signed in')
  if (!password) throw new Error('Enter your password to confirm.')
  // Always re-authenticate first so a wrong password never deletes anything.
  await reauthWithPassword(password)
  await deleteUser(user)
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
  const [, setTick] = useState(0)

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

  async function refresh() {
    if (!auth?.currentUser) return null
    await auth.currentUser.reload()
    // Same object reference mutates; bump to force re-render with fresh emailVerified/displayName.
    setUser(auth.currentUser)
    setTick((t) => t + 1)
    return auth.currentUser
  }

  return { user, authLoading: loading, refreshUser: refresh }
}
