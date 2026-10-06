import { useState } from 'react'
import { formatLarge, formatMetric, formatRecommend, formatSigned } from '../lib/format'
import type { RangeKey } from '../types'

const SUFFIX: Record<RangeKey, string> = {
  '1d': '60',
  '5d': '60',
  '1Mo': '1D',
  '3Mo': '1D',
  '6mo': '1W',
  '1Y': '1W',
  '5y': '1M',
  ytd: '1D',
  max: '1M',
}

interface Row {
  key: string
  label: string
  range: boolean
  format: (v: number | null | undefined) => string
}

const FUNDAMENTALS: Row[] = [
  { key: 'market_cap_basic', label: 'Market Cap', range: false, format: formatLarge },
  { key: 'price_earnings_ttm', label: 'P/E (TTM)', range: false, format: (v) => formatMetric(v) },
  { key: 'earnings_per_share_basic_ttm', label: 'EPS (TTM)', range: false, format: (v) => formatMetric(v) },
  { key: 'price_book_fq', label: 'P/Book (FQ)', range: false, format: (v) => formatMetric(v) },
  { key: 'dividend_yield_recent', label: 'Div Yield', range: false, format: (v) => formatMetric(v) },
  { key: 'gross_margin_ttm', label: 'Gross Margin', range: false, format: (v) => formatMetric(v) },
  { key: 'operating_margin_ttm', label: 'Oper Margin', range: false, format: (v) => formatMetric(v) },
  { key: 'net_margin_ttm', label: 'Net Margin', range: false, format: (v) => formatMetric(v) },
  { key: 'return_on_equity_fq', label: 'ROE (FQ)', range: false, format: (v) => formatMetric(v) },
  { key: 'total_debt_fq', label: 'Total Debt', range: false, format: formatLarge },
]

const TECHNICALS: Row[] = [
  { key: 'RSI', label: 'RSI', range: false, format: (v) => formatMetric(v, 1) },
  { key: 'EMA20', label: 'EMA20', range: false, format: (v) => formatMetric(v) },
  { key: 'VWAP', label: 'VWAP', range: false, format: (v) => formatMetric(v) },
  { key: 'ATR', label: 'ATR', range: false, format: (v) => formatMetric(v) },
  { key: 'BB.upper', label: 'BB Upper', range: false, format: (v) => formatMetric(v) },
  { key: 'BB.lower', label: 'BB Lower', range: false, format: (v) => formatMetric(v) },
  { key: 'Stoch.K', label: 'Stoch K', range: false, format: (v) => formatMetric(v, 1) },
  { key: 'Stoch.D', label: 'Stoch D', range: false, format: (v) => formatMetric(v, 1) },
  { key: 'CCI20', label: 'CCI20', range: false, format: (v) => formatMetric(v, 1) },
  { key: 'ADX', label: 'ADX', range: false, format: (v) => formatMetric(v, 1) },
  { key: 'AO', label: 'AO', range: false, format: (v) => formatMetric(v) },
  { key: 'OBV', label: 'OBV', range: false, format: formatLarge },
  { key: 'CMF', label: 'CMF', range: false, format: (v) => formatMetric(v, 3) },
  { key: 'Volatility.D', label: 'Volatility D', range: false, format: (v) => formatMetric(v) },
  { key: 'Recommend.All', label: 'Recommend', range: false, format: formatRecommend },
  { key: 'Recommend.MA', label: 'Recommend MA', range: false, format: formatRecommend },
  { key: 'Recommend.Other', label: 'Recommend Other', range: false, format: formatRecommend },
]

function rangeRows(range: RangeKey): Row[] {
  const s = SUFFIX[range]
  const rows: Row[] = [
    { key: `RSI|${s}`, label: 'RSI', range: true, format: (v) => formatMetric(v, 1) },
    { key: `EMA20|${s}`, label: 'EMA20', range: true, format: (v) => formatMetric(v) },
    { key: `VWAP|${s}`, label: 'VWAP', range: true, format: (v) => formatMetric(v) },
    { key: `Recommend.All|${s}`, label: 'Recommend', range: true, format: formatRecommend },
    { key: `close|${s}`, label: 'Close', range: true, format: (v) => formatMetric(v) },
  ]
  const perfMap: Record<RangeKey, { key: string; label: string }[]> = {
    '1d': [{ key: 'change', label: 'Change' }],
    '5d': [{ key: 'Perf.W', label: 'Perf W' }],
    '1Mo': [
      { key: 'Perf.1M', label: 'Perf 1M' },
      { key: 'High.1M', label: 'High 1M' },
      { key: 'Low.1M', label: 'Low 1M' },
    ],
    '3Mo': [
      { key: 'Perf.3M', label: 'Perf 3M' },
      { key: 'High.3M', label: 'High 3M' },
      { key: 'Low.3M', label: 'Low 3M' },
    ],
    '6mo': [
      { key: 'Perf.6M', label: 'Perf 6M' },
      { key: 'High.6M', label: 'High 6M' },
      { key: 'Low.6M', label: 'Low 6M' },
    ],
    '1Y': [
      { key: 'Perf.Y', label: 'Perf 1Y' },
      { key: 'price_52_week_high', label: '52W High' },
      { key: 'price_52_week_low', label: '52W Low' },
    ],
    '5y': [
      { key: 'Perf.5Y', label: 'Perf 5Y' },
      { key: 'High.All', label: 'High All' },
      { key: 'Low.All', label: 'Low All' },
    ],
    ytd: [
      { key: 'Perf.YTD', label: 'Perf YTD' },
      { key: 'High.All', label: 'High All' },
      { key: 'Low.All', label: 'Low All' },
    ],
    max: [
      { key: 'Perf.All', label: 'Perf All' },
      { key: 'High.All', label: 'High All' },
      { key: 'Low.All', label: 'Low All' },
    ],
  }
  for (const p of perfMap[range]) {
    const isPrice = p.key.startsWith('High') || p.key.startsWith('Low') || p.key.startsWith('price_')
    rows.push({
      key: p.key,
      label: p.label,
      range: true,
      format: isPrice ? (v) => formatMetric(v) : (v) => formatSigned(v),
    })
  }
  return rows
}

function Category({
  name,
  rows,
  values,
}: {
  name: string
  rows: Row[]
  values: Record<string, number | null> | undefined
}) {
  const [collapsed, setCollapsed] = useState(false)
  // Omit metrics with no value for this asset; unsupported columns stay hidden.
  const visible = rows.filter((r) => values?.[r.key] != null)
  if (visible.length === 0) return null
  return (
    <div className="border-b border-beige-light pb-2 last:border-0">
      <div className="flex items-center justify-between py-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">{name}</h3>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Show' : 'Hide'} ${name}`}
          onClick={() => setCollapsed((c) => !c)}
          className="rounded px-2 py-0.5 text-xs font-bold text-stone-500 hover:bg-beige-light"
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>
      {!collapsed && (
        <dl className="space-y-1">
          {visible.map((r) => (
            <div key={r.key} className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="text-stone-600">
                {r.label}
                {r.range ? '*' : ''}:
              </dt>
              <dd className="font-medium text-ink">{r.format(values?.[r.key])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function MetricsPanel({
  range,
  values,
  kind,
  loading = false,
}: {
  range: RangeKey
  values: Record<string, number | null> | undefined
  kind?: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-label="Loading metrics">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 animate-pulse bg-stone-100" />
        ))}
      </div>
    )
  }
  // Fundamentals apply to stocks only, except Market Cap which is valid
  // for crypto (mapped from market_cap_calc) and shown whenever present.
  const showFundamentals = kind === undefined || kind === 'stock'
  const fundamentalRows = (showFundamentals
    ? FUNDAMENTALS
    : FUNDAMENTALS.filter((r) => r.key === 'market_cap_basic')
  ).filter((r) => values?.[r.key] != null)
  const technicalRows = TECHNICALS.filter((r) => values?.[r.key] != null)
  const perfRows = rangeRows(range).filter((r) => values?.[r.key] != null)
  if (fundamentalRows.length === 0 && technicalRows.length === 0 && perfRows.length === 0) {
    return <p className="text-sm text-stone-400">No metrics available for this asset type.</p>
  }
  return (
    <div>
      {fundamentalRows.length > 0 && <Category name="Fundamentals" rows={FUNDAMENTALS} values={values} />}
      <Category name="Technicals" rows={TECHNICALS} values={values} />
      <Category name="Performance & Range" rows={rangeRows(range)} values={values} />
      <p className="pt-2 text-[11px] text-stone-400">* Values change with the selected period range.</p>
    </div>
  )
}
