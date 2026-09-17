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
    <div className="min-h-screen">
      <Header onAdd={add} onMissing={setMissing} />
      <div className="mx-auto flex max-w-6xl">
        <Sidebar />
        <main className="w-full p-4">
          <Routes>
            <Route
              path="/"
              element={<Home symbols={symbols} onRemove={remove} />}
            />
            <Route path="/asset/:symbol" element={<AssetView />} />
          </Routes>
        </main>
      </div>
      <UnavailableModal symbol={missing} onClose={() => setMissing(null)} />
    </div>
  )
}

export default App
