import { useState } from 'react'
import { Route, Routes } from 'react-router'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { UnavailableModal } from './components/UnavailableModal'
import { AssetView } from './pages/AssetView'
import { Home } from './pages/Home'
import { useInterests } from './store/useInterests'

function App() {
  const { symbols, add, remove } = useInterests()
  const [missing, setMissing] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-white">
      <Header
        symbols={symbols}
        onAdd={add}
        onRemove={remove}
        onMissing={setMissing}
      />
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="w-full min-w-0 flex-1 p-4 md:p-6">
          <Routes>
            <Route
              path="/"
              element={
                <Home symbols={symbols} onAdd={add} onRemove={remove} />
              }
            />
            <Route
              path="/asset/:symbol"
              element={
                <AssetView symbols={symbols} onAdd={add} onRemove={remove} />
              }
            />
          </Routes>
        </main>
      </div>
      <UnavailableModal symbol={missing} onClose={() => setMissing(null)} />
    </div>
  )
}

export default App
