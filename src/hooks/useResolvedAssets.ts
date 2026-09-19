import { useQuery } from '@tanstack/react-query'
import { MOCK_ASSETS } from '../mocks/market'
import type { Asset } from '../types'

export interface ResolvedAsset extends Asset {
  exchange: string
}

async function resolveSymbols(symbols: string[]): Promise<ResolvedAsset[]> {
  const res = await fetch(
    `/api/assets/resolve?symbols=${encodeURIComponent(symbols.join(','))}`,
  )
  if (!res.ok) throw new Error('asset resolve failed')
  return res.json()
}

// Backend row first, mock entry second, plain placeholder last.
export function useResolvedAssets(symbols: string[]): ResolvedAsset[] {
  const { data } = useQuery({
    queryKey: ['assets-resolve', ...symbols],
    queryFn: () => resolveSymbols(symbols),
    enabled: symbols.length > 0,
    staleTime: 10 * 60_000,
    retry: false,
  })
  return symbols.map((s) => {
    const hit = data?.find((r) => r.symbol === s)
    if (hit) return hit
    const mock = MOCK_ASSETS.find((a) => a.symbol === s)
    if (mock) return { ...mock, exchange: '' }
    return { symbol: s, name: s, kind: 'stock' as const, exchange: '' }
  })
}
