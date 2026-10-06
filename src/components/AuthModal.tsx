import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from 'firebase/auth'
import { login, logout, register, setLastAuthMode, takeLastAuthMode } from '../lib/auth'
import { isFirebaseConfigured } from '../lib/firebase'
import type { PendingSync } from '../store/useInterests'

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
    return 'Account already registered. Sign in instead.'
  return 'Could not create account. Check details and try again.'
}

export function AuthModal({
  open,
  onClose,
  user,
  onBeforeLogout,
  pendingSync,
  syncDismissed,
  onResolveSync,
  onDismissSync,
  onReopenSync,
  cloudReady,
}: {
  open: boolean
  onClose: () => void
  user: User | null
  onBeforeLogout?: () => void
  pendingSync: PendingSync | null
  syncDismissed: boolean
  onResolveSync: (choice: 'pull' | 'push') => void
  onDismissSync: () => void
  onReopenSync: () => void
  cloudReady: boolean
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [awaitingSync, setAwaitingSync] = useState(false)
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
    setAwaitingSync(false)
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

  const permanent = !!user
  // Fresh sign-in with a customized device list: ask before touching either side.
  const showInquiry = permanent && pendingSync !== null && !syncDismissed

  // After a fresh login, close once the first snapshot decided the sync:
  // silent pull/push when ready with no inquiry. Auth state alone is not
  // enough, since it resolves before the Firestore snapshot arrives.
  useEffect(() => {
    if (awaitingSync && user && cloudReady && !pendingSync) {
      setAwaitingSync(false)
      handleClose()
    }
    // handleClose identity changes per render; the guard above keeps this effect idle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingSync, user, cloudReady, pendingSync])

  // Snapshot never arrived (offline or listen failure): stop waiting after
  // 10s and keep the device list. A late snapshot still raises the inquiry
  // via the account tile.
  useEffect(() => {
    if (!awaitingSync || pendingSync) return
    const t = window.setTimeout(() => {
      setAwaitingSync(false)
      handleClose()
    }, 10_000)
    return () => window.clearTimeout(t)
    // handleClose identity changes per render; the timer is reset instead of firing stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingSync, pendingSync])

  if (!open) return null

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
      // New signups push the device list to the cloud;
      // sign-ins pull the cloud list, or ask when customized (see useInterests).
      if (mode === 'login') {
        setLastAuthMode('login')
        await login(cleanEmail, password)
        // Stay open: show the sync inquiry if one arrives, else close below.
        setAwaitingSync(true)
      } else {
        setLastAuthMode('signup')
        await register(cleanEmail, password)
        handleClose()
      }
    } catch (err) {
      // Failed attempt changes no uid; discard the recorded intent.
      takeLastAuthMode()
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
      // Clear device list so a fresh guest starts from defaults.
      onBeforeLogout?.()
      handleClose()
    } catch {
      setError('Could not sign out. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
        ) : showInquiry && pendingSync ? (
          <>
            <h2 className="text-base font-bold">Sync your watchlist?</h2>
            <p className="mt-1 text-xs text-stone-500">
              This device tracks {pendingSync.local.length} symbols, but your
              cloud list has {pendingSync.cloud.length}. Choose which list to keep.
            </p>
            <p className="mt-2 rounded-xl bg-beige-light p-3 text-xs text-stone-600">
              <span className="font-semibold text-ink">This device:</span>{' '}
              {pendingSync.local.join(', ')}
              <br />
              <span className="font-semibold text-ink">Cloud:</span>{' '}
              {pendingSync.cloud.join(', ')}
            </p>
            <button
              type="button"
              onClick={() => onResolveSync('pull')}
              className="mt-4 w-full rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Load from cloud
            </button>
            <button
              type="button"
              onClick={() => onResolveSync('push')}
              className="mt-2 w-full rounded-full border border-coffee-dark/40 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-beige-light"
            >
              Keep this device&apos;s list
            </button>
            <button
              type="button"
              onClick={() => {
                onDismissSync()
                handleClose()
              }}
              className="mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-beige-light"
            >
              Decide later
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
            {pendingSync && (
              <button
                type="button"
                onClick={onReopenSync}
                className="mt-2 w-full rounded-xl border border-amber-500/60 bg-amber-50 px-4 py-2 text-left text-xs font-semibold text-ink hover:bg-amber-100"
              >
                Watchlist sync needed — review which list to keep.
              </button>
            )}
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
        ) : awaitingSync ? (
          <>
            <h2 className="text-base font-bold">Signing you in…</h2>
            <p className="mt-2 text-sm text-stone-600">
              Checking your cloud watchlist.
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-beige-light p-1 text-sm font-semibold">
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

            <p className="mt-1 text-xs text-stone-500">
              {mode === 'login'
                ? 'Welcome back! Sign in to sync your watchlist from the cloud. If this device tracks its own list, you will choose which one to keep.'
                : 'Join Asset Outlook! Create an account to save your watchlist to the cloud and access it anywhere — we’ll bring over what you’ve already tracked on this device.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                placeholder="Password"
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
    </div>,
    document.body,
  )
}
