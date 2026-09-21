import { useQuery } from '@tanstack/react-query'
import type { NewsArticle } from '../types'

export function useNews(symbol: string) {
  return useQuery<NewsArticle[], Error>({
    queryKey: ['news', symbol],
    queryFn: async () => {
      if (!symbol) return []
      const res = await fetch(`/api/news/${encodeURIComponent(symbol)}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `News request failed with status ${res.status}`)
      }
      return res.json()
    },
    enabled: Boolean(symbol),
    staleTime: 5 * 60 * 1000,
  })
}
