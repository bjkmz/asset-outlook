import { useQuery } from '@tanstack/react-query'
import type { MetricsResponse, RangeKey } from '../types'

async function fetchMetrics(symbol: string, range: RangeKey): Promise<MetricsResponse> {
  const res = await fetch(`/api/metrics/${encodeURIComponent(symbol)}?range=${range}`)
  if (!res.ok) throw new Error('metrics fetch failed')
  return res.json()
}

export function useMetrics(symbol: string, range: RangeKey) {
  return useQuery({
    queryKey: ['metrics', symbol, range],
    queryFn: () => fetchMetrics(symbol, range),
    enabled: symbol.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
