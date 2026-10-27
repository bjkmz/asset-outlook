import { formatRecommend, formatSigned, formatMetric } from '../lib/format'

interface Indicator {
  label: string
  value: string
  tone?: string
}

export function HomeMetricsStrip({
  values,
  loading = false,
}: {
  values: Record<string, number | null> | undefined
  loading?: boolean
}) {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading indicators"
        className="flex min-w-0 flex-wrap items-center gap-3"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-5 w-14 animate-pulse rounded-full bg-beige-light dark:bg-stone-800" />
        ))}
      </div>
    )
  }

  const change = values?.['change'] ?? null
  const rsi = values?.['RSI|60'] ?? values?.['RSI'] ?? null
  const rec = values?.['Recommend.All|60'] ?? values?.['Recommend.All'] ?? null
  const ema20 = values?.['EMA20|60'] ?? values?.['EMA20'] ?? null
  const atr = values?.['ATR'] ?? null
  const recommendation = formatRecommend(rec)

  const items: Indicator[] = [
    {
      label: 'Chg',
      value: formatSigned(change),
      tone:
        change == null
          ? undefined
          : change > 0
            ? 'text-green-800 dark:text-green-400'
            : change < 0
              ? 'text-red-700 dark:text-red-400'
              : 'text-stone-600 dark:text-stone-400',
    },
    { label: 'RSI', value: formatMetric(rsi, 1) },
    {
      label: 'Rec',
      value: recommendation,
      tone: recommendation.includes('Buy')
        ? 'text-green-800 dark:text-green-400'
        : recommendation.includes('Sell')
          ? 'text-red-700 dark:text-red-400'
          : 'text-stone-600 dark:text-stone-400',
    },
    { label: 'EMA20', value: formatMetric(ema20) },
    { label: 'ATR', value: formatMetric(atr) },
  ]
  const visible = items.filter((item) => item.value !== '')
  if (visible.length === 0) return null

  return (
    <dl
      aria-label="Technical indicators"
      className="flex min-w-0 flex-wrap items-center gap-3"
    >
      {visible.map((item) => (
        <div
          key={item.label}
          className="inline-flex whitespace-nowrap rounded-full border border-beige-light bg-beige-light/40 px-1.5 py-0.5 text-xs dark:border-stone-700 dark:bg-stone-800/60"
        >
          <dt className="font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {item.label}
          </dt>
          <dd className={`ml-1 font-semibold ${item.tone ?? 'text-ink dark:text-stone-100'}`}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
