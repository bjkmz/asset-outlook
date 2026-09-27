import { useMutation } from '@tanstack/react-query'
import type { Insights } from '../types'

export function useInsights(symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  return useMutation<Insights, Error>({
    mutationKey: ['insights', normalized],
    mutationFn: async () => {
      const res = await fetch(`/api/insights/${encodeURIComponent(normalized)}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `Insights request failed with status ${res.status}`)
      }
      return res.json()
    },
    retry: false,
  })
}
