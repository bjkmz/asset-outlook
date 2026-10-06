// TradingView continuous-contract marker stripped for display (GC1! -> GC).
export function displaySymbol(symbol: string): string {
  return symbol.endsWith('1!') ? symbol.slice(0, -2) : symbol
}

// Null renders as empty string so callers show "Label: " with no value.
export function formatMetric(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return ''
  return value.toFixed(digits)
}

export function formatSigned(value: number | null | undefined, digits = 2, suffix = '%'): string {
  if (value == null || !Number.isFinite(value)) return ''
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}${suffix}`
}

export function formatLarge(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toFixed(2)
}

export function formatRecommend(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  if (value >= 0.5) return 'Strong Buy'
  if (value >= 0.1) return 'Buy'
  if (value > -0.1) return 'Neutral'
  if (value > -0.5) return 'Sell'
  return 'Strong Sell'
}
