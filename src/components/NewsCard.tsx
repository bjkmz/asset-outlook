import { useState } from 'react'
import type { NewsArticle } from '../types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function GeometricCover({ label }: { label?: string }) {
  const initial = label ? label.charAt(0).toUpperCase() : 'N'
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-stone-800 via-stone-900 to-black text-white">
      {/* Subtle geometric SVG lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <pattern
          id="geom-pattern"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 24L24 0M0 0h24v24H0z" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#geom-pattern)" />
      </svg>

      {/* Center badge */}
      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/30 bg-amber-400/10 text-xs font-bold tracking-widest text-amber-100 shadow-sm backdrop-blur-xs">
        {initial}
      </div>
    </div>
  )
}

export function NewsCard({ article }: { article: NewsArticle }) {
  const [imgError, setImgError] = useState(false)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="group block min-w-0 bg-white transition hover:bg-beige-light/50"
    >
      <div className="relative h-24 w-full overflow-hidden bg-beige">
        {article.image && !imgError ? (
          <img
            src={article.image}
            alt=""
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <GeometricCover label={article.source || article.title} />
        )}
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-semibold text-ink group-hover:text-coffee">
          {article.title}
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
          <span>{article.source || 'News'}</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
      </div>
    </a>
  )
}
