import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router'
import { AuthModal } from './components/AuthModal'
import { Sidebar } from './components/Sidebar'
import { UnavailableModal } from './components/UnavailableModal'
import { AssetView } from './pages/AssetView'
import { Home } from './pages/Home'
import { useInterests } from './store/useInterests'

async function isAvailable(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/availability/${encodeURIComponent(symbol)}`)
    if (!res.ok) return false
    const json = (await res.json()) as { available: boolean }
    return json.available === true
  } catch {
    return false
  }
}

function App() {
  const {
    symbols,
    add,
    remove,
    resetGuest,
    user,
    pendingSync,
    syncDismissed,
    resolveSync,
    dismissSync,
    reopenSync,
    cloudReady,
  } = useInterests()
  const [missing, setMissing] = useState<string | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [authOpen, setAuthOpen] = useState(false)

  // Yahoo check gates every add. Star shows loading until confirmed.
  const addTracked = useCallback(
    async (symbol: string) => {
      if (symbols.includes(symbol) || pending.includes(symbol)) return
      setPending((p) => [...p, symbol])
      try {
        if (await isAvailable(symbol)) {
          add(symbol)
        } else {
          setMissing(symbol)
        }
      } finally {
        setPending((p) => p.filter((s) => s !== symbol))
      }
    },
    [add, pending, symbols],
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen w-full">
        <Sidebar user={user} onAccountClick={() => setAuthOpen(true)} syncAlert={pendingSync !== null} />
        <div className="w-full min-w-0 flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  symbols={symbols}
                  pending={pending}
                  onAdd={addTracked}
                  onRemove={remove}
                  onMissing={setMissing}
                />
              }
            />
            <Route
              path="/asset/:symbol"
              element={
                <AssetView
                  symbols={symbols}
                  pending={pending}
                  onAdd={addTracked}
                  onRemove={remove}
                  onMissing={setMissing}
                />
              }
            />
          </Routes>
        </div>
      </div>
      <UnavailableModal symbol={missing} onClose={() => setMissing(null)} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        onBeforeLogout={resetGuest}
        pendingSync={pendingSync}
        syncDismissed={syncDismissed}
        onResolveSync={resolveSync}
        onDismissSync={dismissSync}
        onReopenSync={reopenSync}
        cloudReady={cloudReady}
      />
    </div>
  )
}

export default App
