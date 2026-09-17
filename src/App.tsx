import { useState } from 'react'
import { Route, Routes } from 'react-router'
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
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="w-full min-w-0 flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  symbols={symbols}
                  onAdd={add}
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
                  onAdd={add}
                  onRemove={remove}
                  onMissing={setMissing}
                />
              }
            />
          </Routes>
        </div>
      </div>
      <UnavailableModal symbol={missing} onClose={() => setMissing(null)} />
    </div>
  )
}

export default App
