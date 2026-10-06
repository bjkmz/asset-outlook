import { formatRecommend, formatSigned, formatMetric } from '../lib/format'

export function HomeMetricsStrip({
  values,
}: {
  values: Record<string, number | null> | undefined
}) {
  const change = values?.['change'] ?? null
  const rsi = values?.['RSI|60'] ?? values?.['RSI'] ?? null
  const rec = values?.['Recommend.All|60'] ?? values?.['Recommend.All'] ?? null
  const ema20 = values?.['EMA20|60'] ?? values?.['EMA20'] ?? null
  const atr = values?.['ATR'] ?? null
  const item = 'whitespace-nowrap text-xs text-stone-500'
  const val = 'ml-1 font-semibold text-ink'
  return (
    <>
      <span className={item}>
        Chg:<span className={val}>{formatSigned(change)}</span>
      </span>
      <span className={item}>
        RSI:<span className={val}>{formatMetric(rsi, 1)}</span>
      </span>
      <span className={item}>
        Rec:<span className={val}>{formatRecommend(rec)}</span>
      </span>
      <span className={item}>
        EMA20:<span className={val}>{formatMetric(ema20)}</span>
      </span>
      <span className={item}>
        ATR:<span className={val}>{formatMetric(atr)}</span>
      </span>
    </>
  )
}
