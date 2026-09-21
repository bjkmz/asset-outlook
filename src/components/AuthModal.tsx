import { useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { ensureSignedIn, login, logout, register } from '../lib/auth'
import { isFirebaseConfigured } from '../lib/firebase'

/** Discreet messages: no raw Firebase text, no user-enumeration via distinct errors. */
function friendlyAuthError(err: unknown, mode: 'login' | 'signup'): string {
  const code = (err as { code?: unknown })?.code
  const c = typeof code === 'string' ? code : ''
  if (c === 'auth/invalid-email') return 'Enter a valid email address.'
  if (c === 'auth/weak-password') return 'Password must be at least 6 characters.'
  if (c === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.'
  if (c === 'auth/network-request-failed') return 'Network issue. Check connection and try again.'
  if (mode === 'login') {
    if (
      c === 'auth/invalid-credential' ||
      c === 'auth/user-not-found' ||
      c === 'auth/wrong-password' ||
      c === 'auth/user-disabled'
    )
      return 'Incorrect email or password. Please try again.'
    return 'Could not sign in. Check details and try again.'
  }
  if (c === 'auth/email-already-in-use')
    return 'Unable to create account with this email. Try signing in instead.'
  return 'Could not create account. Check details and try again.'
}

export function AuthModal({
  open,
  onClose,
  user,
  onBeforeLogout,
}: {
  open: boolean
  onClose: () => void
  user: User | null
  onBeforeLogout?: () => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const cooldownEnds = useRef(0)
  const cooldownTimer = useRef<number | null>(null)

  function clearCooldown() {
    if (cooldownTimer.current !== null) {
      window.clearInterval(cooldownTimer.current)
      cooldownTimer.current = null
    }
    cooldownEnds.current = 0
    setCooldownLeft(0)
  }

  function startCooldown(seconds = 30) {
    cooldownEnds.current = Date.now() + seconds * 1000
    setCooldownLeft(seconds)
    if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current)
    cooldownTimer.current = window.setInterval(() => {
      const left = Math.ceil((cooldownEnds.current - Date.now()) / 1000)
      if (left <= 0) {
        if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current)
        cooldownTimer.current = null
        setCooldownLeft(0)
      } else {
        setCooldownLeft(left)
      }
    }, 500)
  }

  function handleClose() {
    clearCooldown()
    setError(null)
    setBusy(false)
    setEmail('')
    setPassword('')
    onClose()
  }

  function handleModeChange(next: 'login' | 'signup') {
    if (next === mode) return
    clearCooldown()
    setMode(next)
    setPassword('')
    setError(null)
    setBusy(false)
  }

  if (!open) return null

  const permanent = !!user && !user.isAnonymous

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      // Local list stays in localStorage; useInterests seeds it to the new UID.
      if (mode === 'login') await login(cleanEmail, password)
      else await register(cleanEmail, password)
      handleClose()
    } catch (err) {
      setError(friendlyAuthError(err, mode))
      const code = (err as { code?: unknown })?.code
      if (code === 'auth/too-many-requests') startCooldown(30)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    setError(null)
    setBusy(true)
    try {
      await logout()
      // Clear device list after session ends so fresh guest starts blank.
      // Guest -> account upgrade path still seeds from local on sign-in.
      onBeforeLogout?.()
      // Re-anonymize so Firestore rules (auth != null) still pass.
      await ensureSignedIn()
      handleClose()
    } catch {
      setError('Could not sign out. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Account"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!isFirebaseConfigured ? (
          <>
            <h2 className="text-base font-bold">Account unavailable</h2>
            <p className="mt-2 text-sm text-stone-600">
              Missing VITE_FIREBASE_* env vars. Cloud sync disabled, using localStorage only.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 w-full rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Got it
            </button>
          </>
        ) : permanent ? (
          <>
            <h2 className="text-base font-bold">Account</h2>
            <p className="mt-2 text-sm text-stone-600">
              Signed in as <span className="font-semibold text-ink">{user?.email}</span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Watchlist syncs to this account on Home page.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="mt-4 w-full rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-beige-light"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {mode === 'login'
                ? 'Welcome back! Sign in to sync your watchlist and pick up right where you left off.'
                : 'Join Asset Lookout! Create an account to save your watchlist to the cloud and access it anywhere — we’ll bring over what you’ve already tracked on this device.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-beige-light p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`rounded-full px-3 py-1.5 ${mode === 'login' ? 'bg-white shadow' : 'text-stone-500'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`rounded-full px-3 py-1.5 ${mode === 'signup' ? 'bg-white shadow' : 'text-stone-500'}`}
              >
                Sign up
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-3 space-y-2">
              <input
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-coffee-dark/50 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-coffee-dark"
              />
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-coffee-dark/50 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-coffee-dark"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || cooldownLeft > 0}
                className="w-full rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy
                  ? 'Please wait…'
                  : cooldownLeft > 0
                    ? `Locked — try again in ${cooldownLeft}s`
                    : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
              </button>
            </form>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-beige-light"
            >
              Continue as guest
            </button>
          </>
        )}
      </div>
    </div>
  )
}
