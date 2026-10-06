import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from 'firebase/auth'
import { deleteDoc, doc } from 'firebase/firestore'
import {
  deleteAccount,
  login,
  logout,
  reauthWithPassword,
  register,
  sendResetEmail,
  sendVerificationEmail,
  setLastAuthMode,
  takeLastAuthMode,
  updateDisplayName,
} from '../lib/auth'
import { db, isFirebaseConfigured } from '../lib/firebase'
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

function friendlyProfileError(err: unknown): string {
  const c = (err as { code?: unknown })?.code
  const code = typeof c === 'string' ? c : ''
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.'
  if (code === 'auth/network-request-failed') return 'Network issue. Check connection and try again.'
  if (code === 'auth/requires-recent-login') return 'Session expired. Enter your password to confirm.'
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password')
    return 'Incorrect password. Please try again.'
  if (err instanceof Error && err.message === 'Enter your password to confirm.') return err.message
  return 'Something went wrong. Try again.'
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
  onRefreshUser,
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
  onRefreshUser?: () => Promise<User | null>
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [awaitingSync, setAwaitingSync] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotBusy, setForgotBusy] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const cooldownEnds = useRef(0)
  const cooldownTimer = useRef<number | null>(null)

  // Profile states (signed-in view)
  const [nameField, setNameField] = useState('')
  const [nameBusy, setNameBusy] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifySent, setVerifySent] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null)
  const [checkingVerify, setCheckingVerify] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    setSignupName('')
    setForgotSent(false)
    setNameMsg(null)
    setVerifyMsg(null)
    setVerifySent(false)
    setResetSent(false)
    setDeleteConfirm(false)
    setDeletePassword('')
    setDeleteError(null)
    onClose()
  }

  function handleModeChange(next: 'login' | 'signup') {
    if (next === mode) return
    clearCooldown()
    setMode(next)
    setPassword('')
    setError(null)
    setBusy(false)
    setForgotSent(false)
  }

  const permanent = !!user
  const verified = !!user?.emailVerified
  // Fresh sign-in with a customized device list: ask before touching either side.
  const showInquiry = permanent && pendingSync !== null && !syncDismissed

  // Keep the name field in sync with the account (modal open or displayName change).
  useEffect(() => {
    if (open && user) setNameField(user.displayName ?? '')
  }, [open, user, user?.displayName])

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

  // Soft gate: unverified users never become cloudReady. Stop waiting and
  // show the account view with the verification banner instead.
  useEffect(() => {
    if (awaitingSync && user && !user.emailVerified) {
      setAwaitingSync(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingSync, user, user?.emailVerified])

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
    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    } else if (!password) {
      setError('Enter your password.')
      return
    }
    setBusy(true)
    try {
      // New signups push the device list to the cloud once verified;
      // sign-ins pull the cloud list, or ask when customized (see useInterests).
      if (mode === 'login') {
        setLastAuthMode('login')
        await login(cleanEmail, password)
        // Stay open: show the sync inquiry if one arrives, else close below.
        setAwaitingSync(true)
      } else {
        setLastAuthMode('signup')
        const cred = await register(cleanEmail, password)
        const cleanName = signupName.trim().slice(0, 40)
        if (cleanName && cred.user) {
          try {
            await updateDisplayName(cleanName)
          } catch {
            // Name is optional; account already created.
          }
        }
        try {
          await sendVerificationEmail()
        } catch {
          // Verification send failure should not block signup.
        }
        await onRefreshUser?.()
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

  async function handleForgotPassword() {
    setError(null)
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter your email above first.')
      return
    }
    setForgotBusy(true)
    try {
      await sendResetEmail(cleanEmail)
      setForgotSent(true)
    } catch {
      // Avoid user enumeration: show the same confirmation either way.
      setForgotSent(true)
    } finally {
      setForgotBusy(false)
    }
  }

  async function handleSaveName() {
    setNameMsg(null)
    const clean = nameField.trim()
    if (!clean) {
      setNameMsg('Enter a name.')
      return
    }
    if (clean.length > 20) {
      setNameMsg('Keep the name under 20 characters.')
      return
    }
    setNameBusy(true)
    try {
      await updateDisplayName(clean)
      await onRefreshUser?.()
      setNameMsg('Name saved.')
    } catch (err) {
      setNameMsg(friendlyProfileError(err))
    } finally {
      setNameBusy(false)
    }
  }

  async function handleResendVerification() {
    if (cooldownLeft > 0) return
    setVerifyMsg(null)
    setVerifyBusy(true)
    try {
      await sendVerificationEmail()
      setVerifySent(true)
      startCooldown(30)
    } catch (err) {
      const code = (err as { code?: unknown })?.code
      if (code === 'auth/too-many-requests') startCooldown(30)
      setVerifyMsg(friendlyProfileError(err))
    } finally {
      setVerifyBusy(false)
    }
  }

  async function handleCheckVerification() {
    setVerifyMsg(null)
    setCheckingVerify(true)
    try {
      const refreshed = await onRefreshUser?.()
      if (refreshed && !refreshed.emailVerified) {
        setVerifyMsg('Account not yet verified. Click the link in your email, then try again.')
      }
    } catch {
      setVerifyMsg('Could not refresh status. Try again.')
    } finally {
      setCheckingVerify(false)
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return
    setResetBusy(true)
    try {
      await sendResetEmail(user.email)
      setResetSent(true)
    } catch {
      // Same confirmation either way to avoid enumeration.
      setResetSent(true)
    } finally {
      setResetBusy(false)
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

  async function handleDelete() {
    if (!user) return
    setDeleteError(null)
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.')
      return
    }
    setDeleteBusy(true)
    try {
      // Verify password first so nothing is removed on a wrong password.
      await reauthWithPassword(deletePassword)
      if (db) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'watchlists', 'default'))
        } catch {
          // Missing doc or offline; still delete the account.
        }
      }
      await deleteAccount(deletePassword)
      onBeforeLogout?.()
      handleClose()
    } catch (err) {
      setDeleteError(friendlyProfileError(err))
    } finally {
      setDeleteBusy(false)
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
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
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
              Signed in as <span className="font-semibold text-ink">{user?.email}</span>{' '}
              {verified ? (
                <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  Verified
                </span>
              ) : (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Unverified
                </span>
              )}
            </p>

            {!verified && (
              <div className="mt-3 rounded-xl border border-amber-500/60 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-ink">Verify your email to enable cloud sync.</p>
                <p className="mt-1 text-xs text-stone-600">
                  Check your inbox for the verification link. The watchlist stays on this device until verified.
                </p>
                {verifyMsg && <p className="mt-1 text-xs text-red-600">{verifyMsg}</p>}
                {verifySent && !verifyMsg && (
                  <p className="mt-1 text-xs text-green-700">Verification email sent. Check your inbox.</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={verifyBusy || cooldownLeft > 0}
                    className="flex-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {verifyBusy
                      ? 'Sending…'
                      : cooldownLeft > 0
                        ? `Resend in ${cooldownLeft}s`
                        : 'Resend email'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={checkingVerify}
                    className="flex-1 rounded-full border border-coffee-dark/40 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-beige-light disabled:opacity-50"
                  >
                    {checkingVerify ? 'Checking…' : "I've verified"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="profile-name" className="text-xs font-semibold text-ink">
                Name
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  maxLength={40}
                  value={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-coffee-dark/50 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-coffee-dark"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={nameBusy}
                  className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {nameBusy ? 'Saving…' : 'Save'}
                </button>
              </div>
              {nameMsg && <p className="mt-1 text-xs text-stone-600">{nameMsg}</p>}
            </div>

            <div className="mt-3">
              <p className="text-xs text-stone-500">
                Watchlist {verified ? 'syncs to this account.' : 'sync is paused until email is verified.'}
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetBusy}
                className="mt-2 w-full rounded-full border border-coffee-dark/40 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-beige-light disabled:opacity-50"
              >
                {resetBusy ? 'Sending…' : 'Reset password'}
              </button>
              {resetSent && (
                <p className="mt-1 text-xs text-stone-600">
                  If the account exists, a reset email is on its way.
                </p>
              )}
            </div>

            {pendingSync && verified && (
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

            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null)
                  setDeleteConfirm(true)
                }}
                className="mt-2 w-full rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete account
              </button>
            ) : (
              <div
                className="mt-3 rounded-xl border border-red-500/60 bg-red-50 p-3"
                role="alertdialog"
                aria-modal="true"
                aria-label="Delete account confirmation"
              >
                <p className="text-sm font-bold text-red-700">Delete account? This cannot be undone.</p>
                <p className="mt-1 text-xs text-stone-600">
                  This permanently removes your account and cloud watchlist. This device resets to defaults.
                </p>
                <label htmlFor="delete-password" className="mt-2 block text-xs font-semibold text-ink">
                  Password (required)
                </label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter password to confirm"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-red-500/40 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-red-500"
                />
                {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirm(false)
                      setDeletePassword('')
                      setDeleteError(null)
                    }}
                    disabled={deleteBusy}
                    className="flex-1 rounded-full border border-coffee-dark/40 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-beige-light disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteBusy || !deletePassword}
                    className="flex-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteBusy ? 'Deleting…' : 'Permanently delete'}
                  </button>
                </div>
              </div>
            )}
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
              {mode === 'signup' && (
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Name (optional)"
                  maxLength={40}
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full rounded-xl border border-coffee-dark/50 bg-white px-4 py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-coffee-dark"
                />
              )}
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
              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={forgotBusy}
                    className="text-xs font-semibold text-ink underline hover:opacity-80 disabled:opacity-50"
                  >
                    {forgotBusy ? 'Sending…' : 'Forgot password?'}
                  </button>
                  {forgotSent && (
                    <span className="text-xs text-stone-500">Reset email sent if account exists.</span>
                  )}
                </div>
              )}
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
