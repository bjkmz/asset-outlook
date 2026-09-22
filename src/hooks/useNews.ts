import { useQuery } from '@tanstack/react-query'
import type { NewsArticle } from '../types'

export function useNews(symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  return useQuery<NewsArticle[], Error>({
    queryKey: ['news', normalized],
    queryFn: async () => {
      if (!normalized) return []
      const res = await fetch(`/api/news/${encodeURIComponent(normalized)}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `News request failed with status ${res.status}`)
      }
      return res.json()
    },
    enabled: Boolean(normalized),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
}
