// TradingView continuous-contract marker stripped for display (GC1! -> GC).
export function displaySymbol(symbol: string): string {
  return symbol.endsWith('1!') ? symbol.slice(0, -2) : symbol
}
