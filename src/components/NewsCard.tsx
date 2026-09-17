import type { NewsArticle } from '../types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString()
}

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-coffee-dark/40 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-24 items-center justify-center bg-beige text-xs font-medium text-stone-500">
        {article.image ? (
          <img
            src={article.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          'Cover'
        )}
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-semibold text-ink">
          {article.title}
        </p>
        <p className="mt-1 text-[11px] text-stone-500">
          {formatDate(article.publishedAt)}
        </p>
      </div>
    </a>
  )
}
