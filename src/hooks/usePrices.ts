import { useQuery } from '@tanstack/react-query'
import type { Candle, RangeKey } from '../types'

interface PricesResponse {
  candles: Candle[]
  yahooSymbol: string | null
}

async function fetchPrices(
  symbol: string,
  range: RangeKey,
  mode: 'preview' | 'detail',
): Promise<PricesResponse> {
  const res = await fetch(
    `/api/prices/${encodeURIComponent(symbol)}?range=${range}&mode=${mode}`,
  )
  if (!res.ok) throw new Error('prices fetch failed')
  return res.json()
}

export function usePrices(symbol: string, range: RangeKey, mode: 'preview' | 'detail' = 'preview') {
  return useQuery({
    queryKey: ['prices', symbol, range, mode],
    queryFn: () => fetchPrices(symbol, range, mode),
    enabled: symbol.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
